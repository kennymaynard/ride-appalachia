from typing import Optional

import stripe

from app.database import Settings


TIER_LABELS = {
    "local_business": "$29 Local Business",
    "lodging_partner": "$59 Lodging Partner",
    "featured_partner": "$99 Featured Partner",
    "monthly_sponsor": "$149 Monthly Sponsorship",
    "cleaner_partner": "$29.99 Cleaner Partner",
}


def get_price_id(settings: Settings, tier: str) -> str:
    price_ids = {
        "local_business": settings.stripe_price_local_business,
        "lodging_partner": settings.stripe_price_lodging_partner,
        "featured_partner": settings.stripe_price_featured_partner,
        "monthly_sponsor": settings.stripe_price_monthly_sponsor,
        "cleaner_partner": settings.stripe_price_cleaner_partner,
    }
    return price_ids.get(tier, "")


def create_checkout_session(
    settings: Settings,
    tier: str,
    business_id: Optional[int] = None,
    owner_access_token: str = "",
) -> str:
    price_id = get_price_id(settings, tier)
    business_query = f"&business_id={business_id}" if business_id else ""
    access_query = f"&access_token={owner_access_token}" if owner_access_token else ""
    success_url = f"{settings.frontend_url}/business/success?checkout=success&tier={tier}{business_query}{access_query}"
    cancel_url = f"{settings.frontend_url}/business/join?checkout=cancelled&tier={tier}{business_query}"

    if not settings.stripe_secret_key or not price_id:
        if settings.frontend_url.startswith("http://localhost"):
            return success_url.replace("checkout=success", "checkout=stub")
        raise RuntimeError("Stripe is not configured for this subscription tier")

    stripe.api_key = settings.stripe_secret_key
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "tier": tier,
            "business_id": str(business_id or ""),
            "tier_label": TIER_LABELS.get(tier, tier),
        },
        subscription_data={
            "metadata": {
                "tier": tier,
                "business_id": str(business_id or ""),
                "tier_label": TIER_LABELS.get(tier, tier),
            },
        },
    )
    return session.url


def construct_webhook_event(settings: Settings, payload: bytes, signature: str) -> stripe.Event:
    if not settings.stripe_webhook_secret:
        raise ValueError("Stripe webhook secret is not configured")

    return stripe.Webhook.construct_event(
        payload=payload,
        sig_header=signature,
        secret=settings.stripe_webhook_secret,
    )
