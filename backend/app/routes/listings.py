from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Business, Deal
from app.schemas import BusinessRead

router = APIRouter(tags=["marketplace"])


@router.get("/listings", response_model=list[BusinessRead])
def list_marketplace(
    category: str | None = None,
    featured: bool | None = None,
    location: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
) -> list[Business]:
    query = (
        db.query(Business)
        .options(selectinload(Business.deals), selectinload(Business.campaigns))
        .filter(Business.is_approved.is_(True), Business.listing_status == "approved")
    )

    if category and category != "all":
        if category == "deals":
            query = query.join(Deal).filter(Deal.is_active.is_(True))
        else:
            query = query.filter(Business.category == category)

    if featured is not None:
        query = query.filter(Business.is_featured.is_(featured))

    if location:
        location_term = f"%{location}%"
        query = query.filter(Business.location.ilike(location_term))

    if q:
        term = f"%{q}%"
        query = query.filter(
            Business.name.ilike(term)
            | Business.description.ilike(term)
            | Business.location.ilike(term)
        )

    businesses = query.order_by(Business.created_at.desc()).all()
    return sorted(
        businesses,
        key=lambda business: (
            any(campaign.status == "active" for campaign in business.campaigns),
            business.is_featured,
            business.created_at,
        ),
        reverse=True,
    )


@router.get("/listings/{slug}", response_model=BusinessRead)
def get_listing(slug: str, db: Session = Depends(get_db)) -> Business:
    business = (
        db.query(Business)
        .options(selectinload(Business.deals), selectinload(Business.campaigns))
        .filter(Business.slug == slug, Business.is_approved.is_(True))
        .first()
    )
    if not business:
        raise HTTPException(status_code=404, detail="Listing not found")

    business.view_clicks += 1
    db.commit()
    db.refresh(business)
    return business


@router.post("/listings/{business_id}/action-click")
def track_action_click(business_id: int, db: Session = Depends(get_db)) -> dict[str, int]:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    business.action_clicks += 1
    db.commit()
    return {"action_clicks": business.action_clicks}


@router.post("/deals/{deal_id}/claim-click")
def track_deal_claim_click(deal_id: int, db: Session = Depends(get_db)) -> dict[str, int]:
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal.claim_clicks += 1
    db.commit()
    return {"claim_clicks": deal.claim_clicks}
