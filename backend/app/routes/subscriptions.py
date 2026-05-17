from fastapi import APIRouter, Depends, Header, HTTPException, Request
import stripe

from sqlalchemy.orm import Session

from app.database import Settings, get_db, get_settings
from app.models import Business, Campaign
from app.schemas import CheckoutSessionRead, StripeWebhookPayload, SubscriptionRequest
from app.services.stripe_service import construct_webhook_event, create_checkout_session

router = APIRouter(tags=["subscriptions"])


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

    business.subscription_status = subscription_status
    if stripe_customer_id:
        business.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id:
        business.stripe_subscription_id = stripe_subscription_id
    if tier:
        business.subscription_tier = tier
        if tier == "featured_partner":
            business.is_featured = True

    if business.subscription_tier == "monthly_sponsor" and subscription_status in {"active", "trialing"}:
        pending_campaigns = (
            db.query(Campaign)
            .filter(Campaign.business_id == business.id, Campaign.status == "pending")
            .all()
        )
        for campaign in pending_campaigns:
            campaign.status = "active"

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
    settings: Settings = Depends(get_settings),
) -> CheckoutSessionRead:
    allowed_tiers = {
        "local_business",
        "lodging_partner",
        "featured_partner",
        "monthly_sponsor",
        "cleaner_partner",
    }
    if payload.tier not in allowed_tiers:
        raise HTTPException(status_code=400, detail="Unknown subscription tier")

    checkout_url = create_checkout_session(settings, payload.tier, payload.business_id)
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

    if event_type == "checkout.session.completed":
        metadata = data_object.get("metadata", {})
        business_id = int(metadata.get("business_id") or 0)
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
        business_id = int(metadata.get("business_id") or 0)
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
