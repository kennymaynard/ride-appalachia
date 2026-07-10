from datetime import date, datetime, timedelta
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
import stripe

from sqlalchemy.orm import Session, selectinload

from app.database import Settings, get_db, get_settings
from app.models import Booking, BookingPayment, Business, Campaign, StoreOrder
from app.schemas import CheckoutSessionRead, StripeWebhookPayload, SubscriptionRequest
from app.services.email_service import send_booking_confirmation_emails
from app.services.printify_service import submit_store_order_from_stripe_session
from app.services.stripe_service import construct_webhook_event, create_checkout_session

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


@router.post("/subscriptions/checkout-session/{session_id}/sync", response_model=CheckoutSessionRead)
def sync_subscription_checkout_session(
    session_id: str,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> CheckoutSessionRead:
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    if not session_id.startswith("cs_"):
        raise HTTPException(status_code=400, detail="Invalid checkout session")

    stripe.api_key = settings.stripe_secret_key
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail="Unable to verify Stripe checkout session") from exc

    if session.get("mode") != "subscription":
        raise HTTPException(status_code=400, detail="Checkout session is not a subscription")
    if session.get("payment_status") not in {"paid", "no_payment_required"}:
        raise HTTPException(status_code=409, detail="Checkout session is not paid yet")

    metadata = session.get("metadata") or {}
    business_id = int(metadata.get("business_id") or 0)
    if not business_id:
        raise HTTPException(status_code=400, detail="Checkout session is missing business metadata")

    business = apply_subscription_update(
        db,
        business_id=business_id,
        subscription_status="active",
        stripe_customer_id=session.get("customer") or "",
        stripe_subscription_id=session.get("subscription") or "",
        tier=metadata.get("tier") or "",
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
        metadata = data_object.get("metadata") or {}
        print(
            "Checkout session inspected:",
            {
                "session_id": data_object.get("id") or "",
                "payment_status": data_object.get("payment_status") or "",
                "mode": data_object.get("mode") or "",
                "order_type": metadata.get("order_type") or "",
                "fulfillment": metadata.get("fulfillment") or "",
                "metadata_items_present": bool(metadata.get("items")),
            },
            flush=True,
        )
        booking_ids = [
            int(value)
            for value in (metadata.get("booking_ids") or "").split(",")
            if value.strip().isdigit()
        ]
        if booking_ids:
            bookings = (
                db.query(Booking)
                .options(selectinload(Booking.business), selectinload(Booking.listing))
                .filter(Booking.id.in_(booking_ids))
                .all()
            )
            for booking in bookings:
                booking.status = "paid"
                booking.stripe_checkout_session_id = data_object.get("id") or ""
                try:
                    booking.payout_release_date = (date.fromisoformat(booking.start_date) + timedelta(days=1)).isoformat()
                except ValueError:
                    booking.payout_release_date = date.today().isoformat()
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
            db.commit()
            for booking in bookings:
                business = booking.business
                listing = booking.listing
                send_booking_confirmation_emails(
                    booking.customer_email,
                    business.owner_email if business else "",
                    settings.lead_notify_email,
                    business.name if business else "Lodging provider",
                    booking.customer_name,
                    booking.id,
                    listing.title if listing else "Trip booking",
                    booking.start_date,
                    booking.end_date,
                    booking.subtotal_cents,
                    booking.cleaning_fee_cents,
                    booking.taxes_cents,
                    booking.platform_fee_cents,
                    booking.total_cents,
                    f"{settings.frontend_url}/bookings?booking_id={booking.id}",
                )
            return {"received": True}

        print(
            "Checkout routing decision:",
            {
                "session_id": data_object.get("id") or "",
                "is_merch": metadata.get("order_type") == "merch",
                "is_print_on_demand": metadata.get("fulfillment") == "print_on_demand",
            },
            flush=True,
        )
        if metadata.get("order_type") == "merch":
            stripe.api_key = settings.stripe_secret_key
            print(
                "Merch branch entered:",
                {"session_id": data_object.get("id") or ""},
                flush=True,
            )
            stripe_line_items = stripe.checkout.Session.list_line_items(
                data_object.get("id") or "",
                expand=["data.price.product"],
                limit=100,
            )
            line_items = list(stripe_line_items.get("data") or [])
            print(
                "Stripe line items loaded:",
                {
                    "session_id": data_object.get("id") or "",
                    "line_item_count": len(line_items),
                },
                flush=True,
            )
            print(
                "Printify fulfillment call starting:",
                {
                    "session_id": data_object.get("id") or "",
                    "line_item_count": len(line_items),
                },
                flush=True,
            )
            printify_result = submit_store_order_from_stripe_session(
                data_object,
                settings,
                line_items,
            )
            print(
                "Printify fulfillment call completed:",
                {
                    "session_id": data_object.get("id") or "",
                    "submitted": printify_result.submitted,
                    "order_id": printify_result.order_id,
                    "message": printify_result.message,
                },
                flush=True,
            )
            customer_details = data_object.get("customer_details") or {}
            collected_information = data_object.get("collected_information") or {}
            shipping_details = (
                data_object.get("shipping_details")
                or collected_information.get("shipping_details")
                or {}
            )
            shipping_address = shipping_details.get("address") or {}
            print(
                "Merch checkout received:",
                {
                    "session_id": data_object.get("id") or "",
                    "payment_status": data_object.get("payment_status") or "",
                    "shipping_name_present": bool(shipping_details.get("name")),
                    "shipping_address_present": bool(shipping_address),
                    "line_item_count": len(line_items),
                },
                flush=True,
            )
            order_items = []
            for line_item in line_items:
                price = line_item.get("price") or {}
                product = price.get("product") or {}
                product_metadata = product.get("metadata") if isinstance(product, dict) else {}
                product_name = product.get("name") if isinstance(product, dict) else ""
                order_items.append(
                    {
                        "name": line_item.get("description") or product_name or "Store item",
                        "quantity": int(line_item.get("quantity") or 1),
                        "amount_subtotal": int(line_item.get("amount_subtotal") or 0),
                        "amount_total": int(line_item.get("amount_total") or 0),
                        "product_id": (product_metadata or {}).get("product_id") or "",
                        "variant": (product_metadata or {}).get("variant") or "",
                        "dropship_sku": (product_metadata or {}).get("dropship_sku") or "",
                    }
                )
            session_id = data_object.get("id") or ""
            store_order = (
                db.query(StoreOrder)
                .filter(StoreOrder.stripe_checkout_session_id == session_id)
                .first()
            )
            if not store_order:
                store_order = StoreOrder(stripe_checkout_session_id=session_id, created_at=datetime.utcnow())
                db.add(store_order)
            store_order.stripe_payment_intent_id = data_object.get("payment_intent") or ""
            store_order.customer_name = customer_details.get("name") or shipping_details.get("name") or ""
            store_order.customer_email = customer_details.get("email") or data_object.get("customer_email") or ""
            store_order.customer_phone = customer_details.get("phone") or ""
            store_order.total_cents = int(data_object.get("amount_total") or 0)
            store_order.currency = data_object.get("currency") or "usd"
            store_order.status = data_object.get("payment_status") or "paid"
            store_order.items = json.dumps(order_items)
            store_order.shipping_name = shipping_details.get("name") or ""
            store_order.shipping_address = json.dumps(shipping_address)
            store_order.printify_submitted = printify_result.submitted
            store_order.printify_order_id = printify_result.order_id
            store_order.printify_message = printify_result.message
            db.commit()
            print(
                "Store order Printify status:",
                {
                    "session_id": session_id,
                    "submitted": printify_result.submitted,
                    "order_id": printify_result.order_id,
                    "message": printify_result.message,
                },
                flush=True,
            )
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

    if event_type == "checkout.session.async_payment_failed":
        metadata = data_object.get("metadata", {})
        booking_ids = [
            int(value)
            for value in (metadata.get("booking_ids") or "").split(",")
            if value.strip().isdigit()
        ]
        if booking_ids:
            payments = db.query(BookingPayment).filter(BookingPayment.booking_id.in_(booking_ids)).all()
            for payment in payments:
                payment.status = "payment_failed"
            db.commit()

    if event_type == "account.updated":
        account_id = data_object.get("id") or ""
        if account_id:
            business = (
                db.query(Business)
                .filter(Business.stripe_connect_account_id == account_id)
                .first()
            )
            if business:
                capabilities = data_object.get("capabilities", {})
                business.stripe_connect_charges_enabled = bool(data_object.get("charges_enabled"))
                business.stripe_connect_payouts_enabled = bool(data_object.get("payouts_enabled"))
                business.stripe_connect_business_name = (data_object.get("business_profile") or {}).get("name") or business.name
                business.stripe_connect_business_email = data_object.get("email") or business.owner_email
                business.stripe_connect_onboarding_complete = bool(
                    data_object.get("details_submitted")
                    and data_object.get("charges_enabled")
                    and data_object.get("payouts_enabled")
                    and capabilities.get("card_payments") == "active"
                    and capabilities.get("transfers") == "active"
                )
                db.commit()

    return {"received": True}
