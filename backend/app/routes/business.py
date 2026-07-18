import secrets
import re
import hashlib
from datetime import datetime, timedelta
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db, get_settings
from app.models import BookableListing, Business, BusinessClaim, Campaign, Deal, LodgingServiceRequest
from app.schemas import (
    BusinessClaimRequest,
    BusinessClaimRead,
    BusinessClaimEmailVerify,
    BusinessLoginRead,
    BusinessLoginRequest,
    BusinessCreate,
    BusinessDashboardRead,
    BusinessRead,
    BusinessUpdate,
    CampaignCreate,
    CampaignRead,
    DealCreate,
    DealRead,
    DealUpdate,
    LodgingServiceRequestCreate,
    LodgingServiceRequestRead,
)
from app.services.email_service import send_business_approval_notification, send_business_claim_code_email, send_business_login_email
from app.services.passcodes import hash_passcode, verify_passcode
from app.services.photos import fallback_photo_for_category, is_oversized_embedded_photo, normalize_photo_url
from app.services.business_claims import link_approved_explore_destination
from app.routes.riders import require_rider_access
from app.services.sms_service import send_sms

router = APIRouter(tags=["business dashboard"])


def digits_only(value: str) -> str:
    return re.sub(r"\D+", "", value)


def send_business_access_email(business: Business) -> None:
    if not business.owner_email or not business.owner_access_token:
        return

    settings = get_settings()
    access_url = f"{settings.frontend_url}/business/access/{business.owner_access_token}"
    send_business_login_email(business.owner_email, business.name, access_url)


def send_business_pending_approval_email(business: Business) -> None:
    settings = get_settings()
    send_business_approval_notification(
        business.name,
        business.owner_email,
        business.category,
        business.subscription_tier,
        business.location,
        f"{settings.frontend_url}/admin",
    )


def send_business_pending_approval_sms(business: Business) -> None:
    send_sms(
        business.phone,
        "Appalachia Offroad: your business listing was received and is pending approval. Reply STOP to opt out.",
    )


def replace_oversized_business_photo(db: Session, business: Business) -> None:
    if is_oversized_embedded_photo(business.photo_url):
        business.photo_url = fallback_photo_for_category(business.category)
        db.commit()


def require_business_access(
    business_id: int,
    x_business_token: str = Header(default=""),
    db: Session = Depends(get_db),
) -> Business:
    business = db.get(Business, business_id)
    if not business or business.is_deleted:
        raise HTTPException(status_code=404, detail="Business not found")
    if not business.owner_access_token or x_business_token != business.owner_access_token:
        raise HTTPException(status_code=401, detail="Business access token required")
    return business


@router.post("/businesses/login", response_model=BusinessLoginRead)
def login_business(
    payload: BusinessLoginRequest,
    db: Session = Depends(get_db),
) -> BusinessLoginRead:
    owner_email = payload.owner_email.strip().lower()
    owner_passcode = payload.owner_passcode.strip()
    business = (
        db.query(Business)
        .filter(Business.owner_email == owner_email)
        .order_by(Business.created_at.desc())
        .first()
    )
    if not business:
        raise HTTPException(status_code=404, detail="No business found for that email")

    if business.owner_passcode_hash:
        if not verify_passcode(owner_passcode, business.owner_passcode_hash):
            raise HTTPException(status_code=401, detail="Invalid business password")
    elif digits_only(business.phone)[-4:] == owner_passcode:
        business.owner_passcode_hash = hash_passcode(owner_passcode)
    else:
        raise HTTPException(
            status_code=401,
            detail="Invalid business password. Existing listings can use the last 4 digits of the business phone number once to set it.",
        )

    if not business.owner_access_token:
        business.owner_access_token = secrets.token_urlsafe(24)
        db.commit()
        db.refresh(business)
    elif business.owner_passcode_hash:
        db.commit()

    settings = get_settings()
    access_path = f"/business/access/{business.owner_access_token}"
    full_access_url = f"{settings.frontend_url}{access_path}"
    email_result = send_business_login_email(
        business.owner_email,
        business.name,
        full_access_url,
    )
    send_sms(
        business.phone,
        "Appalachia Offroad: your business dashboard login was requested. Check your email for the secure link.",
    )

    if email_result.sent:
        return BusinessLoginRead(
            email_sent=True,
            message=email_result.message,
        )

    return BusinessLoginRead(
        access_url=access_path,
        email_sent=False,
        message=email_result.message,
    )


@router.post("/businesses", response_model=BusinessDashboardRead)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db)) -> Business:
    data = payload.model_dump()
    owner_passcode = data.pop("owner_passcode")
    data["owner_email"] = data["owner_email"].strip().lower()
    data["photo_url"] = normalize_photo_url(data["photo_url"], data["category"])
    data["owner_access_token"] = secrets.token_urlsafe(24)
    data["owner_passcode_hash"] = hash_passcode(owner_passcode.strip())
    if data.get("partner_tax_agreement_accepted"):
        data["partner_tax_agreement_accepted_at"] = datetime.utcnow()
    business = Business(
        **data,
        is_approved=False,
        listing_status="pending",
        subscription_status="incomplete",
    )
    db.add(business)
    db.commit()
    db.refresh(business)
    send_business_access_email(business)
    send_business_pending_approval_email(business)
    send_business_pending_approval_sms(business)
    return business


@router.get("/businesses/access/{owner_access_token}", response_model=BusinessDashboardRead)
def get_business_by_access_token(
    owner_access_token: str,
    db: Session = Depends(get_db),
) -> Business:
    business = (
        db.query(Business)
        .options(
            selectinload(Business.deals),
            selectinload(Business.campaigns),
            selectinload(Business.service_requests),
            selectinload(Business.bookable_listings).selectinload(BookableListing.calendars),
            selectinload(Business.bookings),
        )
        .filter(Business.owner_access_token == owner_access_token, Business.is_deleted.is_(False))
        .first()
    )
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    replace_oversized_business_photo(db, business)
    return business


@router.get("/businesses/{business_id}", response_model=BusinessDashboardRead)
def get_business(
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> Business:
    business = (
        db.query(Business)
        .options(
            selectinload(Business.deals),
            selectinload(Business.campaigns),
            selectinload(Business.service_requests),
            selectinload(Business.bookable_listings).selectinload(BookableListing.calendars),
            selectinload(Business.bookings),
        )
        .filter(Business.id == business.id, Business.is_deleted.is_(False))
        .first()
    )
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    replace_oversized_business_photo(db, business)
    return business


@router.patch("/businesses/{business_id}", response_model=BusinessRead)
def update_business(
    payload: BusinessUpdate,
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> Business:
    data = payload.model_dump(exclude_unset=True)
    owner_passcode = data.pop("owner_passcode", None)
    if "owner_email" in data and data["owner_email"]:
        data["owner_email"] = data["owner_email"].strip().lower()
    next_category = data.get("category", business.category)
    if "photo_url" in data:
        data["photo_url"] = normalize_photo_url(data["photo_url"], next_category)

    for key, value in data.items():
        setattr(business, key, value)
    if owner_passcode:
        business.owner_passcode_hash = hash_passcode(owner_passcode.strip())

    db.commit()
    db.refresh(business)
    return business


@router.post("/businesses/{business_id}/claim", response_model=BusinessClaimRead)
def claim_business(
    business_id: int,
    payload: BusinessClaimRequest,
    db: Session = Depends(get_db),
    _rider=Depends(require_rider_access),
) -> BusinessClaim:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    if business.owner_email:
        raise HTTPException(status_code=409, detail="This listing is already claimed")
    email = payload.claimant_email.strip().lower()
    existing = db.query(BusinessClaim).filter(
        BusinessClaim.business_id == business_id,
        BusinessClaim.claimant_email == email,
        BusinessClaim.status == "pending",
    ).first()
    if existing:
        return existing
    website_domain = urlparse(business.website_url if "://" in business.website_url else f"https://{business.website_url}").hostname or ""
    website_domain = website_domain.lower().removeprefix("www.")
    email_domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    domain_match = bool(website_domain and (email_domain == website_domain or email_domain.endswith(f".{website_domain}")))
    clean_phone = re.sub(r"\D", "", payload.claimant_phone)
    listed_phone = re.sub(r"\D", "", business.phone)
    phone_match = bool(len(clean_phone) >= 7 and clean_phone == listed_phone)
    conflict = db.query(BusinessClaim).filter(BusinessClaim.business_id == business_id, BusinessClaim.status == "pending", BusinessClaim.claimant_email != email).first() is not None
    if conflict:
        level, reason = "escalated", "Another person has an active claim for this listing."
    elif domain_match:
        level, reason = "automatic", f"Claim email matches the published business website domain ({website_domain})."
    elif phone_match:
        level, reason = "manual", "Claimant phone matches the published listing phone; admin confirmation is required."
    else:
        level, reason = "escalated", "No business-domain email or published-phone match; documentation and manual investigation are required."
    claim = BusinessClaim(**payload.model_dump(exclude={"claimant_email"}), claimant_email=email, business_id=business_id, verification_level=level, verification_reason=reason, email_domain_match=domain_match, public_phone_match=phone_match)
    db.add(claim)
    db.flush()
    if level == "automatic":
        code = f"{secrets.randbelow(1_000_000):06d}"
        claim.email_code_hash = hashlib.sha256(f"{claim.id}:{code}".encode()).hexdigest()
        claim.email_code_expires_at = datetime.utcnow() + timedelta(minutes=15)
        delivery = send_business_claim_code_email(email, business.name, code)
        if not delivery.sent:
            claim.verification_level = "manual"
            claim.verification_reason = "Business-domain email matched, but the verification code could not be delivered; admin review is required."
            claim.email_code_hash = ""; claim.email_code_expires_at = None
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/business-claims/{claim_id}/verify-email", response_model=BusinessClaimRead)
def verify_business_claim_email(claim_id: int, payload: BusinessClaimEmailVerify, db: Session = Depends(get_db)) -> BusinessClaim:
    claim = db.get(BusinessClaim, claim_id)
    if not claim or claim.status != "pending" or claim.verification_level != "automatic": raise HTTPException(404, "Automatic claim verification not found")
    if claim.claimant_email != payload.claimant_email.strip().lower(): raise HTTPException(400, "Email does not match this claim")
    if claim.email_verification_attempts >= 5: raise HTTPException(429, "Too many verification attempts; admin review is required")
    if not claim.email_code_expires_at or claim.email_code_expires_at < datetime.utcnow(): raise HTTPException(400, "Verification code expired")
    claim.email_verification_attempts += 1
    expected = hashlib.sha256(f"{claim.id}:{payload.code}".encode()).hexdigest()
    if not secrets.compare_digest(expected, claim.email_code_hash):
        if claim.email_verification_attempts >= 5:
            claim.verification_level = "escalated"; claim.verification_reason = "Email verification failed five times; manual investigation required."
        db.commit(); raise HTTPException(400, "Verification code is incorrect")
    business = db.get(Business, claim.business_id)
    if not business or business.owner_email: raise HTTPException(409, "This listing is already claimed")
    claim.email_verified_at = datetime.utcnow(); claim.status = "approved"; claim.reviewed_at = datetime.utcnow(); claim.email_code_hash = ""
    business.owner_email = claim.claimant_email; business.subscription_tier = claim.subscription_tier; business.owner_access_token = secrets.token_urlsafe(24); business.owner_passcode_hash = ""
    link_approved_explore_destination(db, business)
    db.commit(); db.refresh(claim)
    access_url = f"{get_settings().frontend_url}/business/access/{business.owner_access_token}"
    send_business_login_email(business.owner_email, business.name, access_url)
    return claim


@router.post("/businesses/{business_id}/deals", response_model=DealRead)
def add_deal(
    business_id: int,
    payload: DealCreate,
    _: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> Deal:
    if business_id != payload.business_id:
        raise HTTPException(status_code=400, detail="Business id mismatch")

    deal = Deal(**payload.model_dump())
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return deal


@router.patch("/businesses/{business_id}/deals/{deal_id}", response_model=DealRead)
def update_deal(
    business_id: int,
    deal_id: int,
    payload: DealUpdate,
    _: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.business_id == business_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(deal, key, value)

    db.commit()
    db.refresh(deal)
    return deal


@router.delete("/businesses/{business_id}/deals/{deal_id}")
def delete_deal(
    business_id: int,
    deal_id: int,
    _: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.business_id == business_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    db.delete(deal)
    db.commit()
    return {"deleted": True}


@router.post("/businesses/{business_id}/campaigns", response_model=CampaignRead)
def create_campaign(
    business_id: int,
    payload: CampaignCreate,
    _: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> Campaign:
    if business_id != payload.business_id:
        raise HTTPException(status_code=400, detail="Business id mismatch")

    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    campaign = Campaign(**payload.model_dump(), status="pending")
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/businesses/{business_id}/service-requests", response_model=LodgingServiceRequestRead)
def create_lodging_service_request(
    business_id: int,
    payload: LodgingServiceRequestCreate,
    _: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> LodgingServiceRequest:
    if business_id != payload.business_id:
        raise HTTPException(status_code=400, detail="Business id mismatch")

    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.category != "lodging":
        raise HTTPException(status_code=400, detail="Service requests are for lodging partners")

    request = LodgingServiceRequest(**payload.model_dump(), status="new")
    db.add(request)
    db.commit()
    db.refresh(request)
    return request
