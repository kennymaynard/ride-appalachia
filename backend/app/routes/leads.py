from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MarketingLead
from app.schemas import MarketingLeadCreate, MarketingLeadRead
from app.services.email_service import send_lead_notification

router = APIRouter(tags=["marketing leads"])


@router.post("/leads", response_model=MarketingLeadRead)
def create_lead(payload: MarketingLeadCreate, db: Session = Depends(get_db)) -> MarketingLead:
    data = payload.model_dump()
    data["email"] = data["email"].strip().lower()
    lead = MarketingLead(**data)
    db.add(lead)
    db.commit()
    db.refresh(lead)

    send_lead_notification(
        lead.lead_type,
        lead.email,
        {
            "business_name": lead.business_name,
            "category": lead.category,
            "area": lead.area,
            "phone": lead.phone,
            "website": lead.website,
            "source": lead.source,
            "notes": lead.notes,
        },
    )
    return lead
