from datetime import datetime
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db, get_settings
from app.models import Booking, BookingPayment, BookingTransfer, Business, Campaign, LodgingServiceRequest, MarketingLead, PageVisit, Rider, StoreOrder
from app.schemas import (
    AdminAnalyticsLocation,
    AdminAnalyticsPath,
    AdminAnalyticsRead,
    AdminRiderAccountRead,
    AdminSmsTestRequest,
    BusinessModerationUpdate,
    BusinessDashboardRead,
    BusinessRead,
    BusinessUpdate,
    BookingTransferRead,
    LodgingServiceRequestRead,
    LodgingServiceRequestStatusUpdate,
    MarketingLeadRead,
    MarketingLeadStatusUpdate,
    PrintifyProductSyncRead,
    StoreOrderRead,
)
from app.services.email_service import (
    build_business_approval_notification_payload,
    clean_email_setting,
    get_resend_key_diagnostic,
    send_business_approval_notification,
    send_marketing_lead_status_email,
    send_resend_direct_test_email,
)
from app.services.booking_payouts import process_due_booking_transfers
from app.services.calendar_sync import sync_active_calendars
from app.services.passcodes import hash_passcode
from app.services.photos import normalize_photo_url
from app.services.printify_service import list_curated_store_products
from app.services.sms_service import send_marketing_lead_status_sms, send_sms

router = APIRouter(tags=["admin"])


def require_admin(x_admin_password: str = Header(default="")) -> None:
    expected_password = get_settings().admin_password.strip()
    submitted_password = x_admin_password.strip()
    if not expected_password or not secrets.compare_digest(submitted_password, expected_password):
        raise HTTPException(status_code=401, detail="Admin password required")


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
) -> list[Business]:
    query = (
        db.query(Business)
        .options(
            selectinload(Business.deals),
            selectinload(Business.campaigns),
            selectinload(Business.service_requests),
        )
    )
    if not include_deleted:
        query = query.filter(Business.is_deleted.is_(False))

    return query.order_by(
        Business.is_deleted.asc(),
        (Business.listing_status == "pending").desc(),
        (Business.listing_status == "needs_changes").desc(),
        Business.created_at.desc(),
    ).all()


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
