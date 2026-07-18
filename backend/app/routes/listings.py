from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Business, Deal
from app.schemas import BusinessRead

router = APIRouter(tags=["marketplace"])


def public_photo_url(photo_url: str) -> str:
    if photo_url.startswith("data:") or len(photo_url) > 1000:
        return ""
    return photo_url


def compact_listing(business: Business) -> dict:
    return {
        "id": business.id,
        "name": business.name,
        "slug": business.slug,
        "category": business.category,
        "description": business.description[:360],
        "phone": business.phone,
        "location": business.location,
        "latitude": business.latitude,
        "longitude": business.longitude,
        "photo_url": public_photo_url(business.photo_url),
        "website_url": business.website_url,
        "subscription_tier": business.subscription_tier,
        "listing_status": business.listing_status,
        "admin_notes": "",
        "is_approved": business.is_approved,
        "is_featured": business.is_featured,
        "is_deleted": business.is_deleted,
        "deleted_at": business.deleted_at,
        "subscription_status": business.subscription_status,
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
        "stripe_connect_account_id": "",
        "stripe_connect_onboarding_complete": business.stripe_connect_onboarding_complete,
        "view_clicks": business.view_clicks,
        "action_clicks": business.action_clicks,
        "deals": [
            {
                "id": deal.id,
                "title": deal.title,
                "code": deal.code,
                "description": deal.description[:180],
                "is_active": deal.is_active,
                "claim_clicks": deal.claim_clicks,
            }
            for deal in business.deals
            if deal.is_active
        ],
        "campaigns": [
            {
                "id": campaign.id,
                "business_id": campaign.business_id,
                "campaign_type": campaign.campaign_type,
                "title": campaign.title,
                "description": campaign.description[:180],
                "target_area": campaign.target_area,
                "monthly_budget": campaign.monthly_budget,
                "status": campaign.status,
                "impressions": campaign.impressions,
                "clicks": campaign.clicks,
            }
            for campaign in business.campaigns
            if campaign.status == "active"
        ],
    }


@router.get("/listings", response_model=list[BusinessRead])
def list_marketplace(
    category: str | None = None,
    featured: bool | None = None,
    location: str | None = None,
    q: str | None = None,
    min_latitude: float | None = None,
    max_latitude: float | None = None,
    min_longitude: float | None = None,
    max_longitude: float | None = None,
    limit: int | None = Query(default=None, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Business]:
    query = (
        db.query(Business)
        .options(selectinload(Business.deals), selectinload(Business.campaigns))
        .filter(Business.is_approved.is_(True), Business.listing_status == "approved", Business.is_deleted.is_(False))
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

    if min_latitude is not None:
        query = query.filter(Business.latitude >= min_latitude)
    if max_latitude is not None:
        query = query.filter(Business.latitude <= max_latitude)
    if min_longitude is not None:
        query = query.filter(Business.longitude >= min_longitude)
    if max_longitude is not None:
        query = query.filter(Business.longitude <= max_longitude)

    ordered_query = query.order_by(Business.is_featured.desc(), Business.created_at.desc())
    businesses = ordered_query.limit(limit).all() if limit else ordered_query.all()
    sorted_businesses = sorted(
        businesses,
        key=lambda business: (
            any(campaign.status == "active" for campaign in business.campaigns),
            business.is_featured,
            business.created_at,
        ),
        reverse=True,
    )
    return [compact_listing(business) for business in sorted_businesses]


@router.get("/listings/{slug}", response_model=BusinessRead)
def get_listing(slug: str, db: Session = Depends(get_db)) -> Business:
    business = (
        db.query(Business)
        .options(selectinload(Business.deals), selectinload(Business.campaigns))
        .filter(Business.slug == slug, Business.is_approved.is_(True), Business.is_deleted.is_(False))
        .first()
    )
    if not business:
        raise HTTPException(status_code=404, detail="Listing not found")

    business.view_clicks += 1
    db.commit()
    db.refresh(business)
    return compact_listing(business)


@router.post("/listings/{business_id}/action-click")
def track_action_click(business_id: int, db: Session = Depends(get_db)) -> dict[str, int]:
    business = db.get(Business, business_id)
    if not business or business.is_deleted:
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
