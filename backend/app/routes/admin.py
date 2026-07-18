from datetime import datetime
import secrets
import re

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db, get_settings
from app.models import Booking, BookingPayment, BookingTransfer, Business, BusinessClaim, Campaign, LodgingServiceRequest, MarketingLead, PageVisit, Rider, StoreOrder
from app.schemas import (
    AdminAnalyticsLocation,
    AdminAnalyticsPath,
    AdminAnalyticsRead,
    AdminRiderAccountRead,
    AdminSmsTestRequest,
    BusinessModerationUpdate,
    BusinessDashboardRead,
    BusinessRead,
    BUSINESS_CATEGORIES,
    BusinessImportRequest,
    BusinessImportResult,
    BusinessImportScanRequest,
    BusinessImportCandidate,
    BusinessClaimRead,
    BusinessClaimReview,
    BusinessUpdate,
    BookingTransferRead,
    LodgingServiceRequestRead,
    LodgingServiceRequestStatusUpdate,
    MarketingLeadRead,
    MarketingLeadStatusUpdate,
    PrintifyProductSyncRead,
    LISTING_STATUSES,
    SUBSCRIPTION_TIERS,
    StoreOrderRead,
    validate_embedded_photo_size,
)
from app.services.email_service import (
    build_business_approval_notification_payload,
    clean_email_setting,
    get_resend_key_diagnostic,
    send_business_approval_notification,
    send_business_login_email,
    send_marketing_lead_status_email,
    send_resend_direct_test_email,
)
from app.services.booking_payouts import process_due_booking_transfers
from app.services.calendar_sync import sync_active_calendars
from app.services.passcodes import hash_passcode
from app.services.photos import normalize_photo_url
from app.services.printify_service import list_curated_store_products
from app.services.sms_service import send_marketing_lead_status_sms, send_sms
from app.services.business_import import find_duplicate, scan_openstreetmap
from app.services.business_visibility import imported_business_is_search_only
from app.services.photos import fallback_photo_for_category

router = APIRouter(tags=["admin"])


def require_admin(x_admin_password: str = Header(default="")) -> None:
    expected_password = get_settings().admin_password.strip()
    submitted_password = x_admin_password.strip()
    if not expected_password or not secrets.compare_digest(submitted_password, expected_password):
        raise HTTPException(status_code=401, detail="Admin password required")


def admin_text(value: object, default: str = "", min_length: int = 0, max_length: int | None = None) -> str:
    text = str(value or "").strip()
    if len(text) < min_length:
        text = default
    if max_length is not None:
        text = text[:max_length]
    return text


def admin_choice(value: object, choices: set[str], default: str) -> str:
    text = str(value or "").strip()
    return text if text in choices else default


def admin_photo_url(value: object) -> str:
    photo_url = admin_text(value, "", 0)
    try:
        return validate_embedded_photo_size(photo_url) or ""
    except ValueError:
        # Legacy rows can predate the current embedded-image upload limit.
        return ""


def admin_business_payload(business: Business) -> dict[str, object]:
    return {
        "id": business.id,
        "name": admin_text(business.name, "Unnamed business", 2, 160),
        "slug": admin_text(business.slug, f"business-{business.id}", 2, 180),
        "category": admin_choice(business.category, BUSINESS_CATEGORIES, "services"),
        "description": admin_text(business.description, "Imported business listing.", 0),
        "phone": admin_text(business.phone, "Not listed", 7, 40),
        "location": admin_text(business.location, "Address unavailable", 2, 180),
        "latitude": business.latitude,
        "longitude": business.longitude,
        "photo_url": admin_photo_url(business.photo_url),
        "website_url": admin_text(business.website_url, "", 0),
        "owner_email": admin_text(business.owner_email, "", 0),
        "owner_access_token": admin_text(business.owner_access_token, "", 0),
        "listing_status": admin_choice(business.listing_status, LISTING_STATUSES, "pending"),
        "admin_notes": admin_text(business.admin_notes, "", 0),
        "is_approved": bool(business.is_approved),
        "is_featured": bool(business.is_featured),
        "is_search_only": bool(business.is_search_only),
        "is_deleted": bool(business.is_deleted),
        "deleted_at": business.deleted_at,
        "subscription_tier": admin_choice(business.subscription_tier, SUBSCRIPTION_TIERS, "local_business"),
        "subscription_status": admin_text(business.subscription_status, "incomplete", 0, 40),
        "stripe_customer_id": admin_text(business.stripe_customer_id, "", 0),
        "stripe_subscription_id": admin_text(business.stripe_subscription_id, "", 0),
        "stripe_connect_account_id": admin_text(business.stripe_connect_account_id, "", 0),
        "stripe_connect_charges_enabled": bool(business.stripe_connect_charges_enabled),
        "stripe_connect_payouts_enabled": bool(business.stripe_connect_payouts_enabled),
        "stripe_connect_business_name": admin_text(business.stripe_connect_business_name, "", 0),
        "stripe_connect_business_email": admin_text(business.stripe_connect_business_email, "", 0),
        "stripe_connect_onboarding_complete": bool(business.stripe_connect_onboarding_complete),
        "partner_tax_agreement_accepted": bool(business.partner_tax_agreement_accepted),
        "partner_tax_agreement_accepted_at": business.partner_tax_agreement_accepted_at,
        "view_clicks": int(business.view_clicks or 0),
        "action_clicks": int(business.action_clicks or 0),
        "source_provider": business.source_provider,
        "source_id": business.source_id,
        "source_url": admin_text(business.source_url, "", 0),
        "imported_at": business.imported_at,
        "deals": list(business.deals or []),
        "campaigns": list(business.campaigns or []),
        "service_requests": list(business.service_requests or []),
        "bookable_listings": list(business.bookable_listings or []),
        "bookings": list(business.bookings or []),
    }


@router.post("/test-email")
def send_test_email(_: None = Depends(require_admin)) -> dict[str, object]:
    settings = get_settings()
    email_from = clean_email_setting(settings.email_from)
    lead_notify_email = clean_email_setting(settings.lead_notify_email)
    admin_url = f"{settings.frontend_url}/admin"
    payload = build_business_approval_notification_payload(
        email_from,
        lead_notify_email,
        "Test Business Approval Email",
        lead_notify_email,
        "test",
        "test",
        "Admin email verification",
        admin_url,
    )
    result = send_business_approval_notification(
        "Test Business Approval Email",
        lead_notify_email,
        "test",
        "test",
        "Admin email verification",
        admin_url,
    )

    return {
        "sent": result.sent,
        "message": result.message,
        "to": lead_notify_email or "Not configured",
        "from": email_from or "Not configured",
        "payload": payload,
        "resend_key": get_resend_key_diagnostic(settings.resend_api_key),
    }


@router.post("/test-email/direct")
def send_direct_test_email(_: None = Depends(require_admin)) -> dict[str, object]:
    settings = get_settings()
    result = send_resend_direct_test_email()
    payload_to = result.payload.get("to", [])
    to_label = ", ".join(payload_to) if isinstance(payload_to, list) else str(payload_to)

    return {
        "sent": result.sent,
        "message": result.message,
        "to": to_label or "Not configured",
        "from": str(result.payload.get("from") or "Not configured"),
        "payload": result.payload,
        "response_status": result.response_status,
        "response_body": result.response_body,
        "resend_key": get_resend_key_diagnostic(settings.resend_api_key),
    }


@router.post("/test-sms")
def send_test_sms(
    payload: AdminSmsTestRequest,
    _: None = Depends(require_admin),
) -> dict[str, bool | str]:
    result = send_sms(
        payload.phone,
        f"Appalachia Offroad test SMS for {payload.audience}. Reply STOP to opt out.",
    )
    return {
        "sent": result.sent,
        "message": result.message,
        "to": payload.phone,
    }


@router.post("/calendar-sync")
def sync_all_booking_calendars(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return sync_active_calendars(db)


@router.get("/store/printify-products", response_model=PrintifyProductSyncRead)
def preview_printify_products(
    _: None = Depends(require_admin),
) -> PrintifyProductSyncRead:
    settings = get_settings()
    if not settings.printify_api_token or not settings.printify_shop_id:
        return PrintifyProductSyncRead(
            configured=False,
            count=0,
            products=[],
            message="Printify API token or shop ID is not configured.",
        )
    try:
        products = list_curated_store_products(settings)
    except Exception as exc:
        return PrintifyProductSyncRead(
            configured=True,
            count=0,
            products=[],
            message=f"Unable to load Printify products: {exc}",
        )

    return PrintifyProductSyncRead(
        configured=True,
        count=len(products),
        products=products,
        message=f"Loaded {len(products)} curated store product{'' if len(products) == 1 else 's'}.",
    )


@router.get("/store/orders", response_model=list[StoreOrderRead])
def list_store_orders(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[StoreOrder]:
    return db.query(StoreOrder).order_by(StoreOrder.created_at.desc()).limit(100).all()


@router.get("/riders", response_model=list[AdminRiderAccountRead])
def list_admin_riders(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[dict[str, object]]:
    riders = (
        db.query(Rider)
        .options(
            selectinload(Rider.badges),
            selectinload(Rider.progress),
            selectinload(Rider.partner_visits),
        )
        .order_by(Rider.created_at.desc())
        .limit(250)
        .all()
    )
    return [
        {
            **rider.__dict__,
            "completed_trails": len([item for item in rider.progress if item.status == "completed"]),
            "saved_trails": len([item for item in rider.progress if item.status == "saved"]),
            "badge_count": len(rider.badges),
            "partner_visits": len(rider.partner_visits),
        }
        for rider in riders
    ]


@router.post("/booking-transfers/process")
def process_booking_transfers(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return process_due_booking_transfers(db, get_settings())


@router.get("/booking-transfers", response_model=list[BookingTransferRead])
def list_booking_transfers(
    _: None = Depends(require_admin),
    status: str = "needs_attention",
    db: Session = Depends(get_db),
) -> list[BookingTransfer]:
    query = db.query(BookingTransfer)
    if status == "needs_attention":
        query = query.filter(BookingTransfer.status.in_(["failed", "missing_connect_account", "scheduled_after_checkin"]))
    elif status != "all":
        query = query.filter(BookingTransfer.status == status)
    return query.order_by(BookingTransfer.created_at.desc()).limit(100).all()


@router.get("/businesses", response_model=list[BusinessDashboardRead])
def list_businesses(
    _: None = Depends(require_admin),
    include_deleted: bool = False,
    db: Session = Depends(get_db),
) -> list[dict[str, object]]:
    query = (
        db.query(Business)
        .options(
            selectinload(Business.deals),
            selectinload(Business.campaigns),
            selectinload(Business.service_requests),
            selectinload(Business.bookable_listings),
            selectinload(Business.bookings),
        )
    )
    if not include_deleted:
        query = query.filter(Business.is_deleted.is_(False))

    businesses = query.order_by(
        Business.is_deleted.asc(),
        (Business.listing_status == "pending").desc(),
        (Business.listing_status == "needs_changes").desc(),
        Business.created_at.desc(),
    ).all()
    return [admin_business_payload(business) for business in businesses]


@router.post("/business-import/scan", response_model=list[BusinessImportCandidate])
def scan_businesses(
    payload: BusinessImportScanRequest,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[BusinessImportCandidate]:
    try:
        return scan_openstreetmap(db, payload)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"OpenStreetMap scan failed: {error}") from error


def imported_slug(name: str, source_id: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:145] or "business"
    suffix = re.sub(r"[^a-z0-9]+", "-", source_id.lower()).strip("-")
    return f"{base}-{suffix}"[:180]


@router.post("/business-import/import", response_model=BusinessImportResult)
def import_businesses(
    payload: BusinessImportRequest,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> BusinessImportResult:
    imported_ids: list[int] = []
    skipped = 0
    for candidate in payload.candidates:
        duplicate_id, _ = find_duplicate(
            db, candidate.source_id, candidate.name, candidate.latitude, candidate.longitude,
        )
        if duplicate_id:
            skipped += 1
            continue
        business = Business(
            name=candidate.name,
            slug=imported_slug(candidate.name, candidate.source_id),
            category=candidate.category,
            description=candidate.description,
            phone=candidate.phone or "Not listed",
            location=candidate.location,
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            photo_url=fallback_photo_for_category(candidate.category),
            website_url=candidate.website_url,
            source_provider="openstreetmap",
            source_id=candidate.source_id,
            source_url=candidate.source_url,
            imported_at=datetime.utcnow(),
            listing_status="approved",
            admin_notes=f"Approved unclaimed OpenStreetMap import for {candidate.area_name}.",
            is_approved=True,
            is_search_only=imported_business_is_search_only(
                candidate.name, candidate.category, "openstreetmap",
            ),
            subscription_status="incomplete",
        )
        db.add(business)
        db.flush()
        imported_ids.append(business.id)
    db.commit()
    return BusinessImportResult(imported=len(imported_ids), skipped=skipped, business_ids=imported_ids)


@router.post("/business-import/activate-existing")
def activate_existing_imports(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    rows = db.query(Business).filter(
        Business.source_provider == "openstreetmap",
        Business.is_deleted.is_(False),
        Business.is_approved.is_(False),
    ).all()
    for business in rows:
        business.is_approved = True
        business.listing_status = "approved"
        business.admin_notes = "Approved unclaimed OpenStreetMap import. Ownership claim requires proof review."
    db.commit()
    return {"activated": len(rows)}


@router.get("/business-claims", response_model=list[BusinessClaimRead])
def list_business_claims(
    _: None = Depends(require_admin),
    status: str = "pending",
    db: Session = Depends(get_db),
) -> list[BusinessClaim]:
    query = db.query(BusinessClaim)
    if status != "all":
        query = query.filter(BusinessClaim.status == status)
    return query.order_by(BusinessClaim.created_at.desc()).all()


@router.post("/business-claims/{claim_id}/review", response_model=BusinessClaimRead)
def review_business_claim(
    claim_id: int,
    payload: BusinessClaimReview,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> BusinessClaim:
    claim = db.get(BusinessClaim, claim_id)
    if not claim or claim.status != "pending":
        raise HTTPException(status_code=404, detail="Pending claim not found")
    business = db.get(Business, claim.business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    claim.admin_notes = payload.admin_notes
    claim.reviewed_at = datetime.utcnow()
    if payload.action == "approve":
        if business.owner_email:
            raise HTTPException(status_code=409, detail="Business is already claimed")
        claim.status = "approved"
        business.owner_email = claim.claimant_email
        business.subscription_tier = claim.subscription_tier
        business.owner_access_token = secrets.token_urlsafe(24)
        business.owner_passcode_hash = ""
        access_url = f"{get_settings().frontend_url}/business/access/{business.owner_access_token}"
        send_business_login_email(business.owner_email, business.name, access_url)
    else:
        claim.status = "rejected"
    db.commit()
    db.refresh(claim)
    return claim


@router.get("/analytics", response_model=AdminAnalyticsRead)
def get_admin_analytics(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminAnalyticsRead:
    location_rows = (
        db.query(
            Rider.home_location,
            Rider.home_latitude,
            Rider.home_longitude,
            func.count(Rider.id),
        )
        .filter(Rider.home_latitude.isnot(None), Rider.home_longitude.isnot(None))
        .group_by(Rider.home_location, Rider.home_latitude, Rider.home_longitude)
        .order_by(func.count(Rider.id).desc())
        .limit(50)
        .all()
    )
    path_rows = (
        db.query(PageVisit.path, func.count(PageVisit.id))
        .group_by(PageVisit.path)
        .order_by(func.count(PageVisit.id).desc())
        .limit(8)
        .all()
    )

    return AdminAnalyticsRead(
        rider_count=db.query(Rider).count(),
        business_count=db.query(Business).filter(Business.is_deleted.is_(False)).count(),
        page_visits=db.query(PageVisit).count(),
        connected_stripe_accounts=(
            db.query(Business)
            .filter(
                Business.is_deleted.is_(False),
                Business.stripe_connect_account_id.isnot(None),
                Business.stripe_connect_account_id != "",
                Business.stripe_connect_charges_enabled.is_(True),
                Business.stripe_connect_payouts_enabled.is_(True),
            )
            .count()
        ),
        not_connected_stripe_accounts=(
            db.query(Business)
            .filter(
                Business.is_deleted.is_(False),
                or_(Business.stripe_connect_account_id.is_(None), Business.stripe_connect_account_id == ""),
            )
            .count()
        ),
        pending_verification_stripe_accounts=(
            db.query(Business)
            .filter(
                Business.is_deleted.is_(False),
                Business.stripe_connect_account_id.isnot(None),
                Business.stripe_connect_account_id != "",
                (
                    (Business.stripe_connect_charges_enabled.is_(False))
                    | (Business.stripe_connect_payouts_enabled.is_(False))
                ),
            )
            .count()
        ),
        platform_revenue_cents=db.query(func.coalesce(func.sum(BookingPayment.platform_fee_cents), 0))
        .filter(BookingPayment.status == "paid")
        .scalar()
        or 0,
        gross_booking_volume_cents=db.query(func.coalesce(func.sum(BookingPayment.amount_cents), 0))
        .filter(BookingPayment.status == "paid")
        .scalar()
        or 0,
        platform_fee_collected_cents=db.query(func.coalesce(func.sum(BookingPayment.platform_fee_cents), 0))
        .filter(BookingPayment.status == "paid")
        .scalar()
        or 0,
        bookings_count=db.query(Booking).count(),
        failed_payments_count=db.query(BookingPayment).filter(BookingPayment.status.in_(["failed", "payment_failed"])).count(),
        rider_locations=[
            AdminAnalyticsLocation(
                label=location or "Unknown",
                latitude=float(latitude),
                longitude=float(longitude),
                riders=count,
            )
            for location, latitude, longitude, count in location_rows
        ],
        top_paths=[
            AdminAnalyticsPath(path=path, visits=count)
            for path, count in path_rows
        ],
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
    owner_passcode = data.pop("owner_passcode", None)
    next_category = data.get("category", business.category)
    if "photo_url" in data:
        data["photo_url"] = normalize_photo_url(data["photo_url"], next_category)

    for key, value in data.items():
        if key == "owner_email" and value:
            value = value.strip().lower()
        setattr(business, key, value)
    if owner_passcode:
        business.owner_passcode_hash = hash_passcode(owner_passcode.strip())

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
    email_result = send_marketing_lead_status_email(
        lead.email,
        lead.status,
        lead.lead_type,
        lead.business_name,
    )
    sms_result = send_marketing_lead_status_sms(lead.phone, lead.status, lead.lead_type)
    setattr(lead, "email_sent", email_result.sent)
    setattr(lead, "email_message", email_result.message)
    setattr(lead, "sms_sent", sms_result.sent)
    setattr(lead, "sms_message", sms_result.message)
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


@router.delete("/businesses/{business_id}", response_model=BusinessRead)
def delete_business(
    business_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.is_approved or business.listing_status not in {"rejected", "unpublished"}:
        raise HTTPException(
            status_code=400,
            detail="Only rejected or unpublished businesses can be deleted.",
        )

    business.is_deleted = True
    business.deleted_at = datetime.utcnow()
    business.is_approved = False
    business.is_featured = False
    business.listing_status = "unpublished"
    business.admin_notes = "Deleted by admin."
    db.commit()
    db.refresh(business)
    return business


@router.post("/businesses/{business_id}/restore", response_model=BusinessRead)
def restore_business(
    business_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    business.is_deleted = False
    business.deleted_at = None
    business.is_approved = False
    business.is_featured = False
    business.listing_status = "pending"
    business.admin_notes = "Restored by admin. Review before approval."
    db.commit()
    db.refresh(business)
    return business
