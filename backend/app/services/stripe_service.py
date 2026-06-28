from typing import Optional

import stripe

from app.database import Settings


TIER_LABELS = {
    "local_business": "$29 Local Business",
    "lodging_partner": "$59 Lodging Partner",
    "veteran_owned": "$0 Veteran Owned",
}


def get_price_id(settings: Settings, tier: str) -> str:
    price_ids = {
        "local_business": settings.stripe_price_local_business,
        "lodging_partner": settings.stripe_price_lodging_partner,
    }
    return price_ids.get(tier, "")


def create_checkout_session(
    settings: Settings,
    tier: str,
    business_id: Optional[int] = None,
    owner_access_token: str = "",
    customer_email: str = "",
) -> str:
    price_id = get_price_id(settings, tier)
    business_query = f"&business_id={business_id}" if business_id else ""
    access_query = f"&access_token={owner_access_token}" if owner_access_token else ""
    success_url = (
        f"{settings.frontend_url}/business/success"
        f"?checkout=success&session_id={{CHECKOUT_SESSION_ID}}&tier={tier}{business_query}{access_query}"
    )
    cancel_url = f"{settings.frontend_url}/business/join?checkout=cancelled&tier={tier}{business_query}"

    if not settings.stripe_secret_key or not price_id:
        if settings.frontend_url.startswith("http://localhost"):
            return success_url.replace("checkout=success", "checkout=stub")
        raise RuntimeError("Stripe is not configured for this subscription tier")

    stripe.api_key = settings.stripe_secret_key
    session_params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {
            "tier": tier,
            "business_id": str(business_id or ""),
            "tier_label": TIER_LABELS.get(tier, tier),
        },
        "subscription_data": {
            "metadata": {
                "tier": tier,
                "business_id": str(business_id or ""),
                "tier_label": TIER_LABELS.get(tier, tier),
            },
        },
    }
    if customer_email:
        session_params["customer_email"] = customer_email

    session = stripe.checkout.Session.create(
        **session_params,
    )
    return session.url


def create_connect_onboarding_link(
    settings: Settings,
    business_id: int,
    business_email: str,
    existing_account_id: str = "",
) -> tuple[str, str]:
    refresh_url = f"{settings.frontend_url}/business/success?connect=refresh&business_id={business_id}"
    return_url = f"{settings.frontend_url}/business/success?connect=complete&business_id={business_id}"

    if not settings.stripe_secret_key:
        if settings.frontend_url.startswith("http://localhost"):
            account_id = existing_account_id or f"acct_stub_{business_id}"
            return (f"{settings.frontend_url}/business/success?connect=stub&business_id={business_id}", account_id)
        raise RuntimeError("Stripe is not configured for Connect onboarding")

    stripe.api_key = settings.stripe_secret_key
    account_id = existing_account_id
    if not account_id:
        account_params = {
            "type": "express",
            "country": "US",
            "capabilities": {
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            "metadata": {"business_id": str(business_id)},
        }
        if business_email:
            account_params["email"] = business_email
        account = stripe.Account.create(**account_params)
        account_id = account.id

    account_link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=refresh_url,
        return_url=return_url,
        type="account_onboarding",
    )
    return (account_link.url, account_id)


def create_booking_checkout_session(
    settings: Settings,
    booking_ids: list[int],
    customer_email: str,
    total_cents: int,
    platform_fee_cents: int,
    connected_account_id: str = "",
) -> str:
    joined_booking_ids = ",".join(str(booking_id) for booking_id in booking_ids)
    success_url = f"{settings.frontend_url}/business/success?booking=success&booking_ids={joined_booking_ids}"
    cancel_url = f"{settings.frontend_url}/marketplace?booking=cancelled"

    if not settings.stripe_secret_key:
        if settings.frontend_url.startswith("http://localhost"):
            return success_url.replace("booking=success", "booking=stub")
        raise RuntimeError("Stripe is not configured for booking checkout")

    stripe.api_key = settings.stripe_secret_key
    payment_intent_data = {
        "metadata": {
            "booking_ids": joined_booking_ids,
            "platform_fee_cents": str(platform_fee_cents),
        },
    }
    if connected_account_id:
        payment_intent_data["application_fee_amount"] = platform_fee_cents
        payment_intent_data["transfer_data"] = {"destination": connected_account_id}

    session_params = {
        "mode": "payment",
        "line_items": [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "Appalachia Offroad trip booking",
                    },
                    "unit_amount": total_cents,
                },
                "quantity": 1,
            }
        ],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {
            "booking_ids": joined_booking_ids,
            "platform_fee_cents": str(platform_fee_cents),
            "connected_account_id": connected_account_id,
        },
        "payment_intent_data": payment_intent_data,
    }
    if customer_email:
        session_params["customer_email"] = customer_email
    session = stripe.checkout.Session.create(**session_params)
    return session.url


def construct_webhook_event(settings: Settings, payload: bytes, signature: str) -> stripe.Event:
    if not settings.stripe_webhook_secret:
        raise ValueError("Stripe webhook secret is not configured")

    return stripe.Webhook.construct_event(
        payload=payload,
        sig_header=signature,
        secret=settings.stripe_webhook_secret,
    )
