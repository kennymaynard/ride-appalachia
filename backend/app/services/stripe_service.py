from typing import Optional

import stripe

from app.database import Settings


TIER_LABELS = {
    "local_business": "$29 first month, then $9.99/month Local Business",
    "lodging_partner": "$59 one-time, then $9/month Founding Lodging Partner",
    "veteran_owned": "$0 Veteran Owned",
}

INTRODUCTORY_FEES = {
    # Recurring prices are $9.99 and $9.00; these one-time amounts bring the
    # first checkout totals to $29 and $59 respectively.
    "local_business": 1901,
    "lodging_partner": 5000,
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
        "allow_promotion_codes": True,
        "line_items": [
            {"price": price_id, "quantity": 1},
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": f"{TIER_LABELS.get(tier, tier)} introductory fee"},
                    "unit_amount": INTRODUCTORY_FEES[tier],
                },
                "quantity": 1,
            },
        ],
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


def retrieve_connect_account(settings: Settings, account_id: str) -> dict:
    if not account_id:
        return {}
    if not settings.stripe_secret_key:
        if settings.frontend_url.startswith("http://localhost"):
            return {
                "id": account_id,
                "charges_enabled": True,
                "payouts_enabled": True,
                "details_submitted": True,
                "business_profile": {"name": ""},
                "email": "",
            }
        raise RuntimeError("Stripe is not configured for Connect account status")

    stripe.api_key = settings.stripe_secret_key
    return stripe.Account.retrieve(account_id)


def create_booking_checkout_session(
    settings: Settings,
    booking_id: int,
    customer_email: str,
    total_cents: int,
    platform_fee_cents: int,
    destination_account_id: str,
    business_name: str,
) -> str:
    success_url = f"{settings.frontend_url}/business/success?booking=success&booking_ids={booking_id}"
    cancel_url = f"{settings.frontend_url}/marketplace?booking=cancelled"

    if not settings.stripe_secret_key:
        if settings.frontend_url.startswith("http://localhost"):
            return success_url.replace("booking=success", "booking=stub")
        raise RuntimeError("Stripe is not configured for booking checkout")
    if not destination_account_id:
        raise RuntimeError("This lodging partner is not connected to Stripe")

    stripe.api_key = settings.stripe_secret_key
    payment_intent_data = {
        "transfer_data": {
            "destination": destination_account_id,
        },
        "metadata": {
            "booking_ids": str(booking_id),
            "booking_id": str(booking_id),
            "platform_fee_cents": str(platform_fee_cents),
            "provider_business": business_name,
        },
    }
    if platform_fee_cents > 0:
        payment_intent_data["application_fee_amount"] = platform_fee_cents

    session_params = {
        "mode": "payment",
        "allow_promotion_codes": True,
        "line_items": [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"{business_name} reservation",
                    },
                    "unit_amount": total_cents,
                },
                "quantity": 1,
            }
        ],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {
            "booking_ids": str(booking_id),
            "booking_id": str(booking_id),
            "platform_fee_cents": str(platform_fee_cents),
            "provider_business": business_name,
        },
        "payment_intent_data": payment_intent_data,
    }
    if customer_email:
        session_params["customer_email"] = customer_email
    session = stripe.checkout.Session.create(**session_params)
    return session.url


def create_store_checkout_session(
    settings: Settings,
    items: list[dict],
    customer_email: str = "",
) -> str:
    success_url = f"{settings.frontend_url}/store?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.frontend_url}/store?checkout=cancelled"
    order_summary = "; ".join(
        [
            (
                f"{item.get('product_id', '')}:"
                f"{item.get('variant', '')}:"
                f"{item.get('quantity', 1)}:"
                f"{item.get('dropship_sku', '')}"
            )
            for item in items
        ]
    )[:500]

    if not settings.stripe_secret_key:
        if settings.frontend_url.startswith("http://localhost"):
            return success_url.replace("checkout=success", "checkout=stub")
        raise RuntimeError("Stripe is not configured for store checkout")

    stripe.api_key = settings.stripe_secret_key
    line_items = []
    for item in items:
        line_items.append(
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": item["name"],
                        "metadata": {
                            "product_id": item["product_id"],
                            "variant": item.get("variant", ""),
                            "dropship_sku": item.get("dropship_sku", ""),
                            "fulfillment": "print_on_demand",
                        },
                    },
                    "unit_amount": item["unit_amount_cents"],
                },
                "quantity": item["quantity"],
            }
        )

    session_params = {
        "mode": "payment",
        "allow_promotion_codes": True,
        "line_items": line_items,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "shipping_address_collection": {"allowed_countries": ["US"]},
        "shipping_options": [
            {
                "shipping_rate_data": {
                    "type": "fixed_amount",
                    "fixed_amount": {"amount": 500, "currency": "usd"},
                    "display_name": "Standard merch shipping",
                    "delivery_estimate": {
                        "minimum": {"unit": "business_day", "value": 5},
                        "maximum": {"unit": "business_day", "value": 10},
                    },
                }
            }
        ],
        "phone_number_collection": {"enabled": True},
        "metadata": {
            "order_type": "merch",
            "fulfillment": "print_on_demand",
            "items": order_summary,
        },
    }
    if customer_email:
        session_params["customer_email"] = customer_email

    session = stripe.checkout.Session.create(**session_params)
    return session.url


def create_connected_account_transfer(
    settings: Settings,
    amount_cents: int,
    destination_account_id: str,
    booking_id: int,
) -> str:
    if not settings.stripe_secret_key:
        if settings.frontend_url.startswith("http://localhost"):
            return f"tr_stub_{booking_id}"
        raise RuntimeError("Stripe is not configured for booking transfers")

    stripe.api_key = settings.stripe_secret_key
    transfer = stripe.Transfer.create(
        amount=amount_cents,
        currency="usd",
        destination=destination_account_id,
        metadata={"booking_id": str(booking_id)},
    )
    return transfer.id


def create_booking_refund(
    settings: Settings,
    payment_intent_id: str,
    amount_cents: int,
    booking_id: int,
) -> str:
    if amount_cents <= 0:
        raise RuntimeError("Refund amount must be greater than zero")
    if not payment_intent_id:
        raise RuntimeError("Booking payment intent is missing")
    if not settings.stripe_secret_key:
        if settings.frontend_url.startswith("http://localhost"):
            return f"re_stub_{booking_id}"
        raise RuntimeError("Stripe is not configured for booking refunds")

    stripe.api_key = settings.stripe_secret_key
    try:
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
            amount=amount_cents,
            metadata={"booking_id": str(booking_id)},
        )
    except Exception as exc:
        raise RuntimeError(f"Stripe refund failed: {exc}") from exc
    return refund.id


def construct_webhook_event(settings: Settings, payload: bytes, signature: str) -> stripe.Event:
    if not settings.stripe_webhook_secret:
        raise ValueError("Stripe webhook secret is not configured")

    return stripe.Webhook.construct_event(
        payload=payload,
        sig_header=signature,
        secret=settings.stripe_webhook_secret,
    )
