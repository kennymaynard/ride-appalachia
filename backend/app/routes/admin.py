from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db, get_settings
from app.models import Business, Campaign, LodgingServiceRequest, MarketingLead
from app.schemas import (
    BusinessModerationUpdate,
    BusinessDashboardRead,
    BusinessRead,
    BusinessUpdate,
    LodgingServiceRequestRead,
    LodgingServiceRequestStatusUpdate,
    MarketingLeadRead,
    MarketingLeadStatusUpdate,
)
from app.services.photos import normalize_photo_url

router = APIRouter(tags=["admin"])


def require_admin(x_admin_password: str = Header(default="")) -> None:
    if x_admin_password != get_settings().admin_password:
        raise HTTPException(status_code=401, detail="Admin password required")


@router.get("/businesses", response_model=list[BusinessDashboardRead])
def list_businesses(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Business]:
    return (
        db.query(Business)
        .options(
            selectinload(Business.deals),
            selectinload(Business.campaigns),
            selectinload(Business.service_requests),
        )
        .order_by(
            (Business.listing_status == "pending").desc(),
            (Business.listing_status == "needs_changes").desc(),
            Business.created_at.desc(),
        )
        .all()
    )


@router.patch("/businesses/{business_id}", response_model=BusinessRead)
def edit_business(
    business_id: int,
    payload: BusinessUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    data = payload.model_dump(exclude_unset=True)
    next_category = data.get("category", business.category)
    if "photo_url" in data:
        data["photo_url"] = normalize_photo_url(data["photo_url"], next_category)

    for key, value in data.items():
        if key == "owner_email" and value:
            value = value.strip().lower()
        setattr(business, key, value)

    db.commit()
    db.refresh(business)
    return business


@router.post("/businesses/{business_id}/approve", response_model=BusinessRead)
def approve_business(
    business_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    business.is_approved = True
    business.listing_status = "approved"
    db.commit()
    db.refresh(business)
    return business


@router.get("/service-requests", response_model=list[LodgingServiceRequestRead])
def list_service_requests(
    _: None = Depends(require_admin),
    status: str = "new",
    db: Session = Depends(get_db),
) -> list[LodgingServiceRequest]:
    query = db.query(LodgingServiceRequest)
    if status != "all":
        query = query.filter(LodgingServiceRequest.status == status)
    return query.order_by(LodgingServiceRequest.created_at.desc()).all()


@router.post("/service-requests/{request_id}/status", response_model=LodgingServiceRequestRead)
def set_service_request_status(
    request_id: int,
    payload: LodgingServiceRequestStatusUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LodgingServiceRequest:
    allowed_statuses = {"new", "contacted", "matched", "closed"}
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Unknown service request status")

    service_request = db.get(LodgingServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Service request not found")

    service_request.status = payload.status
    db.commit()
    db.refresh(service_request)
    return service_request


@router.get("/leads", response_model=list[MarketingLeadRead])
def list_marketing_leads(
    _: None = Depends(require_admin),
    status: str = "new",
    db: Session = Depends(get_db),
) -> list[MarketingLead]:
    query = db.query(MarketingLead)
    if status != "all":
        query = query.filter(MarketingLead.status == status)
    return query.order_by(MarketingLead.created_at.desc()).all()


@router.post("/leads/{lead_id}/status", response_model=MarketingLeadRead)
def set_marketing_lead_status(
    lead_id: int,
    payload: MarketingLeadStatusUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MarketingLead:
    lead = db.get(MarketingLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = payload.status
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/campaigns/{campaign_id}/status")
def set_campaign_status(
    campaign_id: int,
    status: str,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    allowed_statuses = {"pending", "active", "paused", "expired"}
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Unknown campaign status")

    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = status
    db.commit()
    return {"id": campaign.id, "status": campaign.status}


@router.post("/businesses/{business_id}/featured", response_model=BusinessRead)
def set_featured(
    business_id: int,
    featured: bool = True,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    business.is_featured = featured
    db.commit()
    db.refresh(business)
    return business


@router.post("/businesses/{business_id}/moderate", response_model=BusinessRead)
def moderate_business(
    business_id: int,
    payload: BusinessModerationUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Business:
    allowed_statuses = {"pending", "approved", "needs_changes", "rejected", "unpublished"}
    if payload.listing_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Unknown listing status")

    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    business.listing_status = payload.listing_status
    business.admin_notes = payload.admin_notes
    business.is_approved = payload.listing_status == "approved"
    if payload.listing_status in {"rejected", "unpublished"}:
        business.is_featured = False

    db.commit()
    db.refresh(business)
    return business
