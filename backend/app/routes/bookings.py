from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.database import Settings, get_db, get_settings
from app.models import (
    BookableListing,
    Booking,
    BookingPayment,
    Business,
    ListingCalendar,
    ListingCalendarBlock,
    BookingTransfer,
    Rider,
)
from app.routes.business import require_business_access
from app.schemas import (
    BookableListingCreate,
    BookableListingRead,
    BookableListingUpdate,
    BookingCheckoutRequest,
    BookingCancellationDecision,
    BookingCancellationRequest,
    BookingDetailRead,
    BookingLookupRequest,
    BookingRead,
    BookingRequestCreate,
    CheckoutSessionRead,
    ListingCalendarCreate,
    ListingCalendarRead,
    PartnerTaxAgreementRead,
    StripeConnectOnboardingRead,
)
from app.services.stripe_service import (
    create_booking_checkout_session,
    create_booking_refund,
    create_connect_onboarding_link,
    retrieve_connect_account,
)
from app.services.calendar_sync import sync_calendar_blocks
from app.services.email_service import (
    send_booking_cancellation_decision_email,
    send_booking_cancellation_request_notification,
)

router = APIRouter(tags=["booking marketplace"])

def business_accepts_online_reservations(business: Business | None) -> bool:
    return bool(
        business
        and business.stripe_connect_account_id
        and business.stripe_connect_charges_enabled
        and business.stripe_connect_payouts_enabled
        and business.stripe_connect_onboarding_complete
        and business.partner_tax_agreement_accepted
    )


def calculate_nights(start_date: str, end_date: str) -> int:
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Dates must use YYYY-MM-DD format") from exc

    nights = (end - start).days
    if nights < 1:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    return nights


def listing_has_booking_conflict(db: Session, listing_id: int, start_date: str, end_date: str) -> bool:
    return (
        db.query(Booking)
        .filter(
            Booking.listing_id == listing_id,
            Booking.status.in_(["approved", "checkout_sent", "paid"]),
            Booking.start_date < end_date,
            Booking.end_date > start_date,
        )
        .first()
        is not None
    )


def listing_has_calendar_conflict(db: Session, listing_id: int, start_date: str, end_date: str) -> bool:
    return (
        db.query(ListingCalendarBlock)
        .filter(
            ListingCalendarBlock.listing_id == listing_id,
            ListingCalendarBlock.start_date < end_date,
            ListingCalendarBlock.end_date > start_date,
        )
        .first()
        is not None
    )


def listing_is_available(db: Session, listing_id: int, start_date: str, end_date: str) -> bool:
    calculate_nights(start_date, end_date)
    return not listing_has_booking_conflict(db, listing_id, start_date, end_date) and not listing_has_calendar_conflict(
        db,
        listing_id,
        start_date,
        end_date,
    )


def calculate_booking_totals(
    listing: BookableListing,
    start_date: str,
    end_date: str,
) -> tuple[int, int, int, int, int]:
    nights = calculate_nights(start_date, end_date)
    nightly_subtotal = listing.nightly_rate_cents * nights
    taxable_subtotal = nightly_subtotal + listing.cleaning_fee_cents
    taxes = round(taxable_subtotal * listing.tax_rate_basis_points / 10000)
    subtotal = taxable_subtotal
    platform_fee = 0
    return subtotal, listing.cleaning_fee_cents, taxes, platform_fee, subtotal + taxes + platform_fee


def calculate_cancellation_refund_cents(booking: Booking, mode: str, custom_refund_cents: int) -> int:
    listing = booking.listing
    if mode == "none":
        return 0
    if mode == "half":
        return round(booking.total_cents * 0.5)
    if mode == "minus_cleaning_fee":
        cleaning_fee = listing.cleaning_fee_cents if listing else 0
        return max(booking.total_cents - cleaning_fee, 0)
    if mode == "custom":
        return min(max(custom_refund_cents, 0), booking.total_cents)
    return booking.total_cents


def to_booking_detail(booking: Booking) -> BookingDetailRead:
    listing = booking.listing
    business = booking.business
    return BookingDetailRead(
        listing_id=booking.listing_id,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        start_date=booking.start_date,
        end_date=booking.end_date,
        guests=booking.guests,
        message=booking.message,
        id=booking.id,
        business_id=booking.business_id,
        rider_id=booking.rider_id,
        status=booking.status,
        subtotal_cents=booking.subtotal_cents,
        cleaning_fee_cents=booking.cleaning_fee_cents,
        taxes_cents=booking.taxes_cents,
        platform_fee_cents=booking.platform_fee_cents,
        total_cents=booking.total_cents,
        stripe_checkout_session_id=booking.stripe_checkout_session_id,
        cancellation_requested_at=booking.cancellation_requested_at,
        cancellation_reason=booking.cancellation_reason,
        cancellation_decision_at=booking.cancellation_decision_at,
        cancellation_decision_note=booking.cancellation_decision_note,
        refund_status=booking.refund_status,
        refunded_cents=booking.refunded_cents,
        stripe_refund_id=booking.stripe_refund_id,
        refund_failure_reason=booking.refund_failure_reason,
        payout_release_date=booking.payout_release_date,
        business_name=business.name if business else "",
        business_address=business.location if business else "",
        listing_title=listing.title if listing else "",
        cancellation_window_hours=listing.cancellation_window_hours if listing else 72,
        cancellation_policy=listing.cancellation_policy if listing else "",
        refund_policy=listing.refund_policy if listing else "",
        payment_timing=listing.payment_timing if listing else "at_booking",
    )


def require_listing_owner(
    business_id: int,
    listing_id: int,
    business: Business,
    db: Session,
) -> BookableListing:
    listing = (
        db.query(BookableListing)
        .options(selectinload(BookableListing.calendars))
        .filter(BookableListing.id == listing_id, BookableListing.business_id == business_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Bookable listing not found")
    if listing.business_id != business.id:
        raise HTTPException(status_code=403, detail="Listing belongs to another business")
    return listing


@router.get("/bookable-listings", response_model=list[BookableListingRead])
def list_public_bookable_listings(
    listing_type: str = Query(default=""),
    start_date: str = Query(default=""),
    end_date: str = Query(default=""),
    db: Session = Depends(get_db),
) -> list[BookableListing]:
    query = (
        db.query(BookableListing)
        .options(selectinload(BookableListing.calendars))
        .filter(BookableListing.is_active == True)  # noqa: E712
    )
    if listing_type:
        query = query.filter(BookableListing.listing_type == listing_type)
    if start_date and end_date:
        calculate_nights(start_date, end_date)
    listings = query.order_by(BookableListing.created_at.desc()).all()
    if start_date and end_date:
        listings = [
            listing
            for listing in listings
            if listing_is_available(db, listing.id, start_date, end_date)
        ]
    return listings


@router.get("/businesses/{business_id}/bookable-listings", response_model=list[BookableListingRead])
def list_business_bookable_listings(
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> list[BookableListing]:
    return (
        db.query(BookableListing)
        .options(selectinload(BookableListing.calendars))
        .filter(BookableListing.business_id == business.id)
        .order_by(BookableListing.created_at.desc())
        .all()
    )


@router.post("/businesses/{business_id}/bookable-listings", response_model=BookableListingRead)
def create_business_bookable_listing(
    payload: BookableListingCreate,
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> BookableListing:
    data = payload.model_dump()
    if data.get("is_active", True) and not business.partner_tax_agreement_accepted:
        raise HTTPException(status_code=400, detail="Accept the partner tax agreement before activating listings.")
    listing = BookableListing(business_id=business.id, **data)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.patch("/businesses/{business_id}/bookable-listings/{listing_id}", response_model=BookableListingRead)
def update_business_bookable_listing(
    listing_id: int,
    payload: BookableListingUpdate,
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> BookableListing:
    listing = require_listing_owner(business.id, listing_id, business, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "is_active" and value and not business.partner_tax_agreement_accepted:
            raise HTTPException(status_code=400, detail="Accept the partner tax agreement before activating listings.")
        setattr(listing, key, value)
    db.commit()
    db.refresh(listing)
    return listing


@router.post(
    "/businesses/{business_id}/bookable-listings/{listing_id}/calendars",
    response_model=ListingCalendarRead,
)
def add_listing_calendar(
    listing_id: int,
    payload: ListingCalendarCreate,
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> ListingCalendar:
    require_listing_owner(business.id, listing_id, business, db)
    calendar = ListingCalendar(listing_id=listing_id, **payload.model_dump())
    db.add(calendar)
    db.commit()
    db.refresh(calendar)
    return calendar


@router.post(
    "/businesses/{business_id}/bookable-listings/{listing_id}/calendars/{calendar_id}/sync",
    response_model=ListingCalendarRead,
)
def sync_listing_calendar(
    listing_id: int,
    calendar_id: int,
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> ListingCalendar:
    require_listing_owner(business.id, listing_id, business, db)
    calendar = (
        db.query(ListingCalendar)
        .filter(ListingCalendar.id == calendar_id, ListingCalendar.listing_id == listing_id)
        .first()
    )
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar link not found")

    sync_calendar_blocks(db, calendar)
    db.commit()
    db.refresh(calendar)
    return calendar


@router.post("/booking-requests", response_model=BookingRead)
def create_booking_request(
    payload: BookingRequestCreate,
    x_rider_token: str = Header(default=""),
    db: Session = Depends(get_db),
) -> Booking:
    listing = (
        db.query(BookableListing)
        .options(selectinload(BookableListing.business))
        .filter(BookableListing.id == payload.listing_id)
        .first()
    )
    if not listing or not listing.is_active:
        raise HTTPException(status_code=404, detail="Bookable listing not found")
    if not business_accepts_online_reservations(listing.business):
        raise HTTPException(
            status_code=409,
            detail="This lodging partner is not yet accepting online reservations.",
        )
    if not listing_is_available(db, listing.id, payload.start_date, payload.end_date):
        raise HTTPException(status_code=409, detail="Those dates are not available")

    rider = db.query(Rider).filter(Rider.access_token == x_rider_token).first() if x_rider_token else None
    subtotal, cleaning_fee, taxes, platform_fee, total = calculate_booking_totals(
        listing,
        payload.start_date,
        payload.end_date,
    )
    booking = Booking(
        **payload.model_dump(),
        business_id=listing.business_id,
        rider_id=rider.id if rider else None,
        customer_email=payload.customer_email.strip().lower(),
        status="requested",
        subtotal_cents=subtotal,
        cleaning_fee_cents=cleaning_fee,
        taxes_cents=taxes,
        platform_fee_cents=platform_fee,
        total_cents=total,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/businesses/{business_id}/bookings", response_model=list[BookingRead])
def list_business_bookings(
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> list[Booking]:
    return (
        db.query(Booking)
        .filter(Booking.business_id == business.id)
        .order_by(Booking.created_at.desc())
        .all()
    )


@router.post("/bookings/lookup", response_model=BookingDetailRead)
def lookup_booking(
    payload: BookingLookupRequest,
    db: Session = Depends(get_db),
) -> BookingDetailRead:
    booking = (
        db.query(Booking)
        .options(selectinload(Booking.business), selectinload(Booking.listing))
        .filter(Booking.id == payload.booking_id)
        .first()
    )
    if not booking or booking.customer_email.strip().lower() != payload.customer_email.strip().lower():
        raise HTTPException(status_code=404, detail="Booking not found for that email")
    return to_booking_detail(booking)


@router.post("/businesses/{business_id}/bookings/{booking_id}/approve", response_model=BookingRead)
def approve_booking_request(
    booking_id: int,
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> Booking:
    booking = (
        db.query(Booking)
        .options(selectinload(Booking.listing))
        .filter(Booking.id == booking_id, Booking.business_id == business.id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not listing_is_available(db, booking.listing_id, booking.start_date, booking.end_date):
        raise HTTPException(status_code=409, detail="Those dates are no longer available")
    booking.status = "approved"
    db.commit()
    db.refresh(booking)
    return booking


@router.post("/bookings/{booking_id}/cancel-request", response_model=BookingRead)
def request_booking_cancellation(
    booking_id: int,
    payload: BookingCancellationRequest,
    x_rider_token: str = Header(default=""),
    db: Session = Depends(get_db),
) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    email_matches = payload.customer_email.strip().lower() == booking.customer_email.strip().lower()
    rider_matches = False
    if x_rider_token and booking.rider_id:
        rider_matches = (
            db.query(Rider)
            .filter(Rider.id == booking.rider_id, Rider.access_token == x_rider_token)
            .first()
            is not None
        )
    if not email_matches and not rider_matches:
        raise HTTPException(status_code=403, detail="Booking email or rider login is required")

    if booking.status in {"canceled", "declined"}:
        raise HTTPException(status_code=400, detail="This booking is already closed")

    booking.cancellation_requested_at = datetime.utcnow()
    booking.cancellation_reason = payload.reason
    booking.refund_status = "requested"
    db.commit()
    db.refresh(booking)
    business = db.get(Business, booking.business_id)
    if business and business.owner_email:
        dashboard_url = (
            f"{get_settings().frontend_url}/business/access/{business.owner_access_token}"
            if business.owner_access_token
            else f"{get_settings().frontend_url}/business"
        )
        send_booking_cancellation_request_notification(
            business.owner_email,
            business.name,
            booking.customer_name,
            booking.id,
            payload.reason,
            dashboard_url,
        )
    return booking


@router.post("/businesses/{business_id}/bookings/{booking_id}/cancel-decision", response_model=BookingRead)
def decide_booking_cancellation(
    booking_id: int,
    payload: BookingCancellationDecision,
    business: Business = Depends(require_business_access),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.business_id == business.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.refund_status != "requested":
        raise HTTPException(status_code=400, detail="No cancellation request is waiting for review")

    booking.cancellation_decision_at = datetime.utcnow()
    booking.cancellation_decision_note = payload.note
    if payload.approved:
        was_paid = booking.status == "paid"
        booking.status = "canceled"
        booking.refund_status = "approved"
        booking.refund_failure_reason = ""
        transfer = (
            db.query(BookingTransfer)
            .filter(
                BookingTransfer.booking_id == booking.id,
                BookingTransfer.status == "scheduled_after_checkin",
            )
            .first()
        )
        if transfer:
            transfer.status = "canceled"
        refund_cents = calculate_cancellation_refund_cents(
            booking,
            payload.refund_mode,
            payload.custom_refund_cents,
        )
        if refund_cents <= 0:
            booking.refund_status = "approved"
            booking.refunded_cents = 0
        elif booking.refunded_cents <= 0:
            payment = (
                db.query(BookingPayment)
                .filter(BookingPayment.booking_id == booking.id)
                .order_by(BookingPayment.created_at.desc())
                .first()
            )
            if payment and payment.stripe_payment_intent_id:
                try:
                    booking.stripe_refund_id = create_booking_refund(
                        settings,
                        payment.stripe_payment_intent_id,
                        refund_cents,
                        booking.id,
                    )
                    booking.refunded_cents = refund_cents
                    booking.refund_status = "processed"
                    payment.status = "refunded" if refund_cents >= booking.total_cents else "partially_refunded"
                except RuntimeError as exc:
                    booking.refund_status = "refund_failed"
                    booking.refund_failure_reason = str(exc)
            elif was_paid:
                booking.refund_status = "refund_failed"
                booking.refund_failure_reason = "Paid booking is missing a Stripe payment intent."
    else:
        booking.refund_status = "declined"
    db.commit()
    db.refresh(booking)
    send_booking_cancellation_decision_email(
        booking.customer_email,
        booking.customer_name,
        booking.id,
        payload.approved,
        payload.note,
        f"{get_settings().frontend_url}/bookings?booking_id={booking.id}",
    )
    return booking


@router.post("/businesses/{business_id}/stripe-connect/onboarding", response_model=StripeConnectOnboardingRead)
def create_stripe_connect_onboarding(
    business: Business = Depends(require_business_access),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> StripeConnectOnboardingRead:
    try:
        onboarding_url, account_id = create_connect_onboarding_link(
            settings,
            business.id,
            business.owner_email,
            business.stripe_connect_account_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    business.stripe_connect_account_id = account_id
    if onboarding_url.find("connect=stub") >= 0:
        business.stripe_connect_charges_enabled = True
        business.stripe_connect_payouts_enabled = True
        business.stripe_connect_onboarding_complete = True
        business.stripe_connect_business_name = business.name
        business.stripe_connect_business_email = business.owner_email
    db.commit()
    return StripeConnectOnboardingRead(
        onboarding_url=onboarding_url,
        stripe_connect_account_id=account_id,
    )


@router.post("/businesses/{business_id}/partner-tax-agreement", response_model=PartnerTaxAgreementRead)
def accept_partner_tax_agreement(
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> PartnerTaxAgreementRead:
    business.partner_tax_agreement_accepted = True
    business.partner_tax_agreement_accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(business)
    return PartnerTaxAgreementRead(
        accepted=business.partner_tax_agreement_accepted,
        accepted_at=business.partner_tax_agreement_accepted_at,
    )


@router.post("/businesses/{business_id}/stripe-connect/status")
def sync_stripe_connect_status(
    business: Business = Depends(require_business_access),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> dict[str, bool | str]:
    if not business.stripe_connect_account_id:
        return {
            "stripe_connect_account_id": "",
            "charges_enabled": False,
            "payouts_enabled": False,
            "onboarding_complete": False,
        }
    try:
        account = retrieve_connect_account(settings, business.stripe_connect_account_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    business.stripe_connect_charges_enabled = bool(account.get("charges_enabled"))
    business.stripe_connect_payouts_enabled = bool(account.get("payouts_enabled"))
    business.stripe_connect_onboarding_complete = bool(account.get("details_submitted")) and business.stripe_connect_charges_enabled
    business.stripe_connect_business_name = (account.get("business_profile") or {}).get("name") or business.name
    business.stripe_connect_business_email = account.get("email") or business.owner_email
    db.commit()
    return {
        "stripe_connect_account_id": business.stripe_connect_account_id,
        "charges_enabled": business.stripe_connect_charges_enabled,
        "payouts_enabled": business.stripe_connect_payouts_enabled,
        "onboarding_complete": business.stripe_connect_onboarding_complete,
        "business_name": business.stripe_connect_business_name,
        "business_email": business.stripe_connect_business_email,
    }


@router.post("/booking-checkout", response_model=CheckoutSessionRead)
def create_booking_checkout(
    payload: BookingCheckoutRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> CheckoutSessionRead:
    if not payload.booking_ids:
        raise HTTPException(status_code=400, detail="Add at least one booking")
    if len(payload.booking_ids) != 1:
        raise HTTPException(status_code=400, detail="Marketplace checkout is processed one business booking at a time")

    bookings = db.query(Booking).filter(Booking.id.in_(payload.booking_ids)).all()
    if len(bookings) != len(set(payload.booking_ids)):
        raise HTTPException(status_code=404, detail="One or more bookings were not found")

    customer_emails = {booking.customer_email for booking in bookings}
    if len(customer_emails) > 1:
        raise HTTPException(status_code=400, detail="Bundled checkout must use one customer email")

    for booking in bookings:
        if booking.status not in {"approved", "checkout_sent"}:
            raise HTTPException(status_code=400, detail="All bookings must be approved before checkout")
        if booking.platform_fee_cents:
            booking.platform_fee_cents = 0
            booking.total_cents = booking.subtotal_cents + booking.taxes_cents
        listing = db.get(BookableListing, booking.listing_id)
        if listing and listing.payment_timing == "after_cancellation_period":
            try:
                charge_after = datetime.fromisoformat(booking.start_date) - timedelta(
                    hours=listing.cancellation_window_hours,
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Booking start date is invalid") from exc
            if datetime.utcnow() < charge_after:
                raise HTTPException(
                    status_code=400,
                    detail="Checkout opens after this listing's cancellation period.",
                )

    total_cents = sum(booking.total_cents for booking in bookings)
    platform_fee_cents = sum(booking.platform_fee_cents for booking in bookings)
    booking = bookings[0]
    business = db.get(Business, booking.business_id)
    if not business_accepts_online_reservations(business):
        raise HTTPException(
            status_code=409,
            detail="This lodging partner is not yet accepting online reservations.",
        )
    try:
        checkout_url = create_booking_checkout_session(
            settings,
            booking.id,
            next(iter(customer_emails)),
            total_cents,
            platform_fee_cents,
            business.stripe_connect_account_id if business else "",
            business.name if business else "Lodging provider",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    checkout_session_id = checkout_url.rsplit("session_id=", 1)[-1] if "session_id=" in checkout_url else ""
    for booking in bookings:
        booking.status = "checkout_sent"
        booking.stripe_checkout_session_id = checkout_session_id
        payment = BookingPayment(
            booking_id=booking.id,
            stripe_checkout_session_id=checkout_session_id,
            amount_cents=booking.total_cents,
            platform_fee_cents=booking.platform_fee_cents,
            status="pending",
        )
        db.add(payment)
    db.commit()
    return CheckoutSessionRead(checkout_url=checkout_url)
