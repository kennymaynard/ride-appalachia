from datetime import date

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
    Rider,
)
from app.routes.business import require_business_access
from app.schemas import (
    BookableListingCreate,
    BookableListingRead,
    BookableListingUpdate,
    BookingCheckoutRequest,
    BookingRead,
    BookingRequestCreate,
    CheckoutSessionRead,
    ListingCalendarCreate,
    ListingCalendarRead,
    StripeConnectOnboardingRead,
)
from app.services.stripe_service import create_booking_checkout_session, create_connect_onboarding_link
from app.services.calendar_sync import sync_calendar_blocks

router = APIRouter(tags=["booking marketplace"])

PLATFORM_FEE_BASIS_POINTS = 300


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


def calculate_booking_totals(listing: BookableListing, start_date: str, end_date: str) -> tuple[int, int, int]:
    nights = calculate_nights(start_date, end_date)
    subtotal = (listing.nightly_rate_cents * nights) + listing.cleaning_fee_cents
    platform_fee = round(subtotal * PLATFORM_FEE_BASIS_POINTS / 10000)
    return subtotal, platform_fee, subtotal + platform_fee


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
    listing = BookableListing(business_id=business.id, **payload.model_dump())
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
    listing = db.get(BookableListing, payload.listing_id)
    if not listing or not listing.is_active:
        raise HTTPException(status_code=404, detail="Bookable listing not found")
    if not listing_is_available(db, listing.id, payload.start_date, payload.end_date):
        raise HTTPException(status_code=409, detail="Those dates are not available")

    rider = db.query(Rider).filter(Rider.access_token == x_rider_token).first() if x_rider_token else None
    subtotal, platform_fee, total = calculate_booking_totals(listing, payload.start_date, payload.end_date)
    booking = Booking(
        **payload.model_dump(),
        business_id=listing.business_id,
        rider_id=rider.id if rider else None,
        customer_email=payload.customer_email.strip().lower(),
        status="requested",
        subtotal_cents=subtotal,
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


@router.post("/businesses/{business_id}/bookings/{booking_id}/approve", response_model=BookingRead)
def approve_booking_request(
    booking_id: int,
    business: Business = Depends(require_business_access),
    db: Session = Depends(get_db),
) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.business_id == business.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not listing_is_available(db, booking.listing_id, booking.start_date, booking.end_date):
        raise HTTPException(status_code=409, detail="Those dates are no longer available")
    booking.status = "approved"
    db.commit()
    db.refresh(booking)
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
        business.stripe_connect_onboarding_complete = True
    db.commit()
    return StripeConnectOnboardingRead(
        onboarding_url=onboarding_url,
        stripe_connect_account_id=account_id,
    )


@router.post("/booking-checkout", response_model=CheckoutSessionRead)
def create_booking_checkout(
    payload: BookingCheckoutRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> CheckoutSessionRead:
    if not payload.booking_ids:
        raise HTTPException(status_code=400, detail="Add at least one booking")

    bookings = db.query(Booking).filter(Booking.id.in_(payload.booking_ids)).all()
    if len(bookings) != len(set(payload.booking_ids)):
        raise HTTPException(status_code=404, detail="One or more bookings were not found")

    customer_emails = {booking.customer_email for booking in bookings}
    if len(customer_emails) > 1:
        raise HTTPException(status_code=400, detail="Bundled checkout must use one customer email")

    for booking in bookings:
        if booking.status not in {"approved", "checkout_sent"}:
            raise HTTPException(status_code=400, detail="All bookings must be approved before checkout")

    business_ids = {booking.business_id for booking in bookings}
    connected_account_id = ""
    if len(business_ids) == 1:
        business = db.get(Business, next(iter(business_ids)))
        connected_account_id = business.stripe_connect_account_id if business else ""

    total_cents = sum(booking.total_cents for booking in bookings)
    platform_fee_cents = sum(booking.platform_fee_cents for booking in bookings)
    try:
        checkout_url = create_booking_checkout_session(
            settings,
            [booking.id for booking in bookings],
            next(iter(customer_emails)),
            total_cents,
            platform_fee_cents,
            connected_account_id,
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
