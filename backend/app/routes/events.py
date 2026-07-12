from __future__ import annotations

from datetime import date, datetime, timedelta
from math import asin, cos, radians, sin, sqrt
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Business, Campaign, Event
from app.routes.admin import require_admin
from app.schemas import (
    AdminEventCreate,
    AdminEventRead,
    AdminEventUpdate,
    EventModerationUpdate,
    EventPlannerBusiness,
    EventPlannerResult,
    EventRead,
    EventSubmission,
)

router = APIRouter(tags=["events"])
RADIUS_OPTIONS = {10, 25, 50, 100}
PLANNER_CATEGORIES = {"lodging", "food", "fuel", "rentals", "repairs", "services"}


def slugify(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower().strip())) or "event"


def unique_event_slug(db: Session, title: str, start_date: date, exclude_id: int | None = None) -> str:
    base = slugify(f"{title}-{start_date.isoformat()}")
    candidate = base
    suffix = 2
    while True:
        query = db.query(Event).filter(Event.slug == candidate)
        if exclude_id is not None:
            query = query.filter(Event.id != exclude_id)
        if not query.first():
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


def expire_past_events(db: Session, today: date | None = None) -> int:
    today = today or date.today()
    expired = (
        db.query(Event)
        .filter(Event.status == "approved", Event.end_date < today)
        .update({Event.status: "expired"}, synchronize_session=False)
    )
    if expired:
        db.commit()
    return expired


def haversine_miles(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    earth_radius_miles = 3958.8
    lat_delta = radians(latitude_b - latitude_a)
    lon_delta = radians(longitude_b - longitude_a)
    a = sin(lat_delta / 2) ** 2 + cos(radians(latitude_a)) * cos(radians(latitude_b)) * sin(lon_delta / 2) ** 2
    return earth_radius_miles * 2 * asin(sqrt(a))


def apply_verification(event: Event, is_verified: bool, verification_source: str) -> None:
    source = verification_source.strip()
    if is_verified and not source:
        raise HTTPException(status_code=400, detail="A verification source is required for verified events")
    event.verification_source = source
    event.is_verified = is_verified
    event.verified_at = datetime.utcnow() if is_verified else None


@router.get("/events", response_model=list[EventRead])
def list_events(
    state: str = "",
    month: str = "",
    category: str = "",
    vehicle: str = "",
    featured: bool | None = None,
    verified: bool | None = None,
    search: str = "",
    weekend: bool = False,
    db: Session = Depends(get_db),
) -> list[Event]:
    expire_past_events(db)
    query = db.query(Event).filter(Event.status == "approved", Event.end_date >= date.today())
    if state:
        query = query.filter(Event.state == state.strip().upper())
    if month:
        try:
            month_start = datetime.strptime(f"{month}-01", "%Y-%m-%d").date()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Month must use YYYY-MM format") from exc
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        query = query.filter(Event.start_date < next_month, Event.end_date >= month_start)
    if category:
        query = query.filter(Event.category == category.strip())
    if vehicle:
        query = query.filter(Event.vehicle_types.contains([vehicle.strip()]))
    if featured is not None:
        query = query.filter(Event.is_featured.is_(featured))
    if verified is not None:
        query = query.filter(Event.is_verified.is_(verified))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(Event.title.ilike(term), Event.organizer.ilike(term), Event.city.ilike(term), Event.venue.ilike(term), Event.description.ilike(term)))
    events = query.order_by(Event.is_featured.desc(), Event.start_date.asc()).all()
    if weekend:
        events = [event for event in events if event.start_date.weekday() >= 4 or event.end_date.weekday() >= 5]
    return events


@router.post("/events/submit", response_model=AdminEventRead, status_code=status.HTTP_201_CREATED)
def submit_event(payload: EventSubmission, db: Session = Depends(get_db)) -> Event:
    data = payload.model_dump()
    event = Event(
        **data,
        slug=unique_event_slug(db, payload.title, payload.start_date),
        submitted_by_email=payload.submitted_by_email.lower(),
        status="pending",
        is_verified=False,
        is_featured=False,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_public_event_or_404(slug: str, db: Session) -> Event:
    expire_past_events(db)
    event = db.query(Event).filter(Event.slug == slug, Event.status == "approved", Event.end_date >= date.today()).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/events/{slug}/planner", response_model=EventPlannerResult)
def plan_event_ride(slug: str, radius: int = Query(default=25), db: Session = Depends(get_db)) -> EventPlannerResult:
    if radius not in RADIUS_OPTIONS:
        raise HTTPException(status_code=400, detail="Radius must be 10, 25, 50, or 100 miles")
    event = get_public_event_or_404(slug, db)
    if event.latitude is None or event.longitude is None:
        return EventPlannerResult(event=event, radius_miles=radius, businesses=[])
    businesses = (
        db.query(Business)
        .options(selectinload(Business.deals), selectinload(Business.campaigns))
        .filter(
            Business.is_approved.is_(True),
            Business.is_deleted.is_(False),
            Business.listing_status == "approved",
            Business.category.in_(PLANNER_CATEGORIES),
            Business.latitude.is_not(None),
            Business.longitude.is_not(None),
        )
        .all()
    )
    results: list[EventPlannerBusiness] = []
    for business in businesses:
        distance = haversine_miles(event.latitude, event.longitude, business.latitude, business.longitude)
        if distance > radius:
            continue
        sponsored = business.is_featured or any(campaign.status == "active" for campaign in business.campaigns)
        results.append(EventPlannerBusiness(
            id=business.id, name=business.name, slug=business.slug, category=business.category,
            description=business.description, location=business.location,
            latitude=business.latitude, longitude=business.longitude, website_url=business.website_url,
            distance_miles=round(distance, 1), is_featured=business.is_featured,
            is_sponsored=sponsored, has_active_deal=any(deal.is_active for deal in business.deals),
        ))
    results.sort(key=lambda item: (not item.is_sponsored, item.distance_miles, item.name.lower()))
    return EventPlannerResult(event=event, radius_miles=radius, businesses=results)


@router.get("/events/{slug}", response_model=EventRead)
def get_event(slug: str, db: Session = Depends(get_db)) -> Event:
    return get_public_event_or_404(slug, db)


@router.get("/admin/events", response_model=list[AdminEventRead])
def list_admin_events(
    event_status: str = Query(default="all", alias="status"),
    _: None = Depends(require_admin), db: Session = Depends(get_db),
) -> list[Event]:
    expire_past_events(db)
    query = db.query(Event)
    if event_status != "all":
        query = query.filter(Event.status == event_status)
    return query.order_by(Event.created_at.desc()).all()


@router.post("/admin/events", response_model=AdminEventRead, status_code=status.HTTP_201_CREATED)
def create_admin_event(payload: AdminEventCreate, _: None = Depends(require_admin), db: Session = Depends(get_db)) -> Event:
    data = payload.model_dump()
    is_verified = data.pop("is_verified")
    verification_source = data.pop("verification_source")
    event = Event(**data, slug=unique_event_slug(db, payload.title, payload.start_date))
    apply_verification(event, is_verified, verification_source)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def admin_event_or_404(event_id: int, db: Session) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/admin/events/{event_id}", response_model=AdminEventRead)
def update_admin_event(event_id: int, payload: AdminEventUpdate, _: None = Depends(require_admin), db: Session = Depends(get_db)) -> Event:
    event = admin_event_or_404(event_id, db)
    data = payload.model_dump(exclude_unset=True)
    new_start = data.get("start_date", event.start_date)
    new_end = data.get("end_date", event.end_date)
    if new_end < new_start:
        raise HTTPException(status_code=400, detail="Event end date cannot precede start date")
    is_verified = data.pop("is_verified", event.is_verified)
    verification_source = data.pop("verification_source", event.verification_source)
    title_or_date_changed = "title" in data or "start_date" in data
    for key, value in data.items():
        setattr(event, key, value.strip() if isinstance(value, str) else value)
    if title_or_date_changed:
        event.slug = unique_event_slug(db, event.title, event.start_date, event.id)
    apply_verification(event, is_verified, verification_source)
    if event.status == "approved" and not event.is_verified:
        raise HTTPException(status_code=400, detail="Verify the event from an official source before publishing")
    db.commit()
    db.refresh(event)
    return event


@router.post("/admin/events/{event_id}/moderate", response_model=AdminEventRead)
def moderate_event(event_id: int, payload: EventModerationUpdate, _: None = Depends(require_admin), db: Session = Depends(get_db)) -> Event:
    event = admin_event_or_404(event_id, db)
    verification_source = payload.verification_source if payload.verification_source is not None else event.verification_source
    is_verified = payload.is_verified if payload.is_verified is not None else event.is_verified
    if payload.status == "approved" and not is_verified:
        raise HTTPException(status_code=400, detail="Verify the event from an official source before publishing")
    apply_verification(event, is_verified, verification_source)
    event.status = payload.status
    event.admin_notes = payload.admin_notes.strip()
    if payload.is_featured is not None:
        event.is_featured = payload.is_featured
    db.commit()
    db.refresh(event)
    return event


@router.delete("/admin/events/{event_id}", response_model=AdminEventRead)
def unpublish_event(event_id: int, _: None = Depends(require_admin), db: Session = Depends(get_db)) -> Event:
    event = admin_event_or_404(event_id, db)
    event.status = "unpublished"
    event.is_featured = False
    db.commit()
    db.refresh(event)
    return event
