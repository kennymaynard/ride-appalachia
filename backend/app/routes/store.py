from fastapi import APIRouter, Depends, HTTPException

from app.database import Settings, get_settings
from app.schemas import CheckoutSessionRead, StoreCheckoutRequest
from app.services.stripe_service import create_store_checkout_session

router = APIRouter(tags=["store"])


@router.post("/store/checkout", response_model=CheckoutSessionRead)
def create_store_checkout(
    payload: StoreCheckoutRequest,
    settings: Settings = Depends(get_settings),
) -> CheckoutSessionRead:
    try:
        checkout_url = create_store_checkout_session(
            settings,
            [item.model_dump() for item in payload.items],
            payload.customer_email,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return CheckoutSessionRead(checkout_url=checkout_url)
