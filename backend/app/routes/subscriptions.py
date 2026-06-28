from fastapi import APIRouter, Depends, Header, HTTPException, Request
import stripe

from sqlalchemy.orm import Session

from app.database import Settings, get_db, get_settings
from app.models import Booking, BookingPayment, BookingTransfer, Business, Campaign
from app.schemas import CheckoutSessionRead, StripeWebhookPayload, SubscriptionRequest
from app.services.stripe_service import construct_webhook_event, create_checkout_session, create_connected_account_transfer

router = APIRouter(tags=["subscriptions"])

SUBSCRIPTION_STATUS_MAP = {
    "active": "active",
    "trialing": "trialing",
    "past_due": "past_due",
    "canceled": "canceled",
    "cancelled": "canceled",
    "unpaid": "past_due",
    "paused": "past_due",
    "incomplete": "incomplete",
    "incomplete_expired": "incomplete",
}


def normalize_subscription_status(status: str) -> str:
    return SUBSCRIPTION_STATUS_MAP.get(status, "incomplete")


def apply_subscription_update(
    db: Session,
    business_id: int,
    subscription_status: str = "active",
    stripe_customer_id: str = "",
    stripe_subscription_id: str = "",
    tier: str = "",
) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    subscription_status = normalize_subscription_status(subscription_status)
    business.subscription_status = subscription_status
    if stripe_customer_id:
        business.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id:
        business.stripe_subscription_id = stripe_subscription_id
    if tier:
        business.subscription_tier = tier

    if subscription_status in {"canceled", "past_due", "incomplete"}:
        active_campaigns = (
            db.query(Campaign)
            .filter(Campaign.business_id == business.id, Campaign.status == "active")
            .all()
        )
        for campaign in active_campaigns:
            campaign.status = "paused"

    db.commit()
    db.refresh(business)
    return business


@router.post("/subscriptions/checkout", response_model=CheckoutSessionRead)
def create_subscription_checkout(
    payload: SubscriptionRequest,
    x_business_token: str = Header(default=""),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> CheckoutSessionRead:
    allowed_tiers = {
        "local_business",
        "lodging_partner",
        "veteran_owned",
    }
    if payload.tier not in allowed_tiers:
        raise HTTPException(status_code=400, detail="Unknown subscription tier")

    owner_access_token = ""
    customer_email = ""
    if payload.business_id:
        business = db.get(Business, payload.business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        if not business.owner_access_token or x_business_token != business.owner_access_token:
            raise HTTPException(status_code=401, detail="Business access token required")
        owner_access_token = business.owner_access_token
        customer_email = business.owner_email

    if payload.tier == "veteran_owned":
        if not payload.business_id:
            return CheckoutSessionRead(
                checkout_url=f"{settings.frontend_url}/business/join?tier=veteran_owned",
            )
        business = apply_subscription_update(
            db,
            business_id=payload.business_id,
            subscription_status="active",
            tier=payload.tier,
        )
        return CheckoutSessionRead(
            checkout_url=(
                f"{settings.frontend_url}/business/success"
                f"?checkout=free&tier={payload.tier}&business_id={business.id}"
                f"&access_token={owner_access_token}"
            ),
        )

    try:
        checkout_url = create_checkout_session(
            settings,
            payload.tier,
            payload.business_id,
            owner_access_token,
            customer_email,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return CheckoutSessionRead(checkout_url=checkout_url)


@router.post("/subscriptions/webhook-test", response_model=CheckoutSessionRead)
def mark_subscription_status(
    payload: StripeWebhookPayload,
    db: Session = Depends(get_db),
) -> CheckoutSessionRead:
    business = apply_subscription_update(
        db,
        business_id=payload.business_id,
        subscription_status=payload.subscription_status,
        stripe_customer_id=payload.stripe_customer_id,
        stripe_subscription_id=payload.stripe_subscription_id,
        tier=payload.tier,
    )
    return CheckoutSessionRead(checkout_url=f"/business/success?business_id={business.id}")


@router.post("/subscriptions/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(default="", alias="Stripe-Signature"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    payload = await request.body()
    try:
        event = construct_webhook_event(settings, payload, stripe_signature)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature") from exc

    event_type = event["type"]
    data_object = event["data"]["object"]

    def resolve_business_id(metadata: dict, stripe_customer_id: str = "", stripe_subscription_id: str = "") -> int:
        business_id = int(metadata.get("business_id") or 0)
        if business_id:
            return business_id

        query = db.query(Business)
        if stripe_subscription_id:
            business = query.filter(Business.stripe_subscription_id == stripe_subscription_id).first()
            if business:
                return business.id
        if stripe_customer_id:
            business = query.filter(Business.stripe_customer_id == stripe_customer_id).first()
            if business:
                return business.id
        return 0

    if event_type == "checkout.session.completed":
        metadata = data_object.get("metadata", {})
        booking_ids = [
            int(value)
            for value in (metadata.get("booking_ids") or "").split(",")
            if value.strip().isdigit()
        ]
        if booking_ids:
            bookings = db.query(Booking).filter(Booking.id.in_(booking_ids)).all()
            business_ids = {booking.business_id for booking in bookings}
            connected_account_id = metadata.get("connected_account_id") or ""
            for booking in bookings:
                booking.status = "paid"
                booking.stripe_checkout_session_id = data_object.get("id") or ""
                payment = (
                    db.query(BookingPayment)
                    .filter(BookingPayment.booking_id == booking.id)
                    .order_by(BookingPayment.created_at.desc())
                    .first()
                )
                if payment:
                    payment.status = "paid"
                    payment.stripe_checkout_session_id = data_object.get("id") or ""
                    payment.stripe_payment_intent_id = data_object.get("payment_intent") or ""
                existing_transfer = (
                    db.query(BookingTransfer)
                    .filter(BookingTransfer.booking_id == booking.id)
                    .first()
                )
                if not existing_transfer and (len(business_ids) > 1 or not connected_account_id):
                    business = db.get(Business, booking.business_id)
                    transfer = BookingTransfer(
                        booking_id=booking.id,
                        business_id=booking.business_id,
                        amount_cents=booking.subtotal_cents,
                        status="pending",
                    )
                    if business and business.stripe_connect_account_id:
                        try:
                            transfer.stripe_transfer_id = create_connected_account_transfer(
                                settings,
                                booking.subtotal_cents,
                                business.stripe_connect_account_id,
                                booking.id,
                            )
                            transfer.status = "paid"
                        except RuntimeError:
                            transfer.status = "failed"
                    else:
                        transfer.status = "missing_connect_account"
                    db.add(transfer)
            db.commit()
            return {"received": True}

        business_id = resolve_business_id(
            metadata,
            stripe_customer_id=data_object.get("customer") or "",
            stripe_subscription_id=data_object.get("subscription") or "",
        )
        if business_id:
            apply_subscription_update(
                db,
                business_id=business_id,
                subscription_status="active",
                stripe_customer_id=data_object.get("customer") or "",
                stripe_subscription_id=data_object.get("subscription") or "",
                tier=metadata.get("tier") or "",
            )

    if event_type in {"customer.subscription.updated", "customer.subscription.deleted"}:
        metadata = data_object.get("metadata", {})
        business_id = resolve_business_id(
            metadata,
            stripe_customer_id=data_object.get("customer") or "",
            stripe_subscription_id=data_object.get("id") or "",
        )
        if business_id:
            status = "canceled" if event_type == "customer.subscription.deleted" else data_object.get("status", "active")
            apply_subscription_update(
                db,
                business_id=business_id,
                subscription_status=status,
                stripe_customer_id=data_object.get("customer") or "",
                stripe_subscription_id=data_object.get("id") or "",
                tier=metadata.get("tier") or "",
            )

    return {"received": True}
