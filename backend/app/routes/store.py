from fastapi import APIRouter, Depends, HTTPException

from app.database import Settings, get_settings
from app.schemas import CheckoutSessionRead, StoreProductRead, StoreCheckoutRequest
from app.services.printify_service import list_curated_store_products
from app.services.stripe_service import create_store_checkout_session

router = APIRouter(tags=["store"])


@router.get("/store/products", response_model=list[StoreProductRead])
def list_store_products(settings: Settings = Depends(get_settings)) -> list[StoreProductRead]:
    try:
        return list_curated_store_products(settings)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to load Printify products: {exc}") from exc


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
