from __future__ import annotations

from datetime import date, datetime, timedelta
from math import asin, cos, radians, sin, sqrt
import re
import secrets

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Business, Campaign, Event, EventAttendee, EventMetric, EventReminder, EventRidePlan, Rider, RiderSavedEvent
from app.routes.admin import require_admin
from app.services.email_service import send_trip_plan_email
from app.services.sms_service import send_sms
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
ATTENDANCE_STATUSES = {"going", "interested", "not_going"}
REMINDER_DAYS = {1, 3, 7}


def rider_from_token(token: str, db: Session) -> Rider:
    rider = db.query(Rider).filter(Rider.access_token == token.strip()).first() if token else None
    if not rider:
        raise HTTPException(status_code=401, detail="Rider login required")
    return rider


def public_event_id(event_id: int, db: Session) -> Event:
    event = db.get(Event, event_id)
    if not event or event.status != "approved" or event.end_date < date.today():
        raise HTTPException(status_code=404, detail="Event not found")
    return event


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
        active_subscription = business.subscription_status in {"active", "trialing"}
        relevant = business.category in PLANNER_CATEGORIES
        sponsored = relevant and active_subscription and (business.is_featured or any(campaign.status == "active" for campaign in business.campaigns))
        if business.name.lower().startswith("rock ridge resort") and event.state != "TN":
            sponsored = False
        results.append(EventPlannerBusiness(
            id=business.id, name=business.name, slug=business.slug, category=business.category,
            description=business.description, location=business.location,
            latitude=business.latitude, longitude=business.longitude, website_url=business.website_url,
            distance_miles=round(distance, 1), is_featured=business.is_featured,
            is_sponsored=sponsored, has_active_deal=any(deal.is_active for deal in business.deals),
        ))
        db.add(EventMetric(event_id=event.id, business_id=business.id, action="planner_impression"))
    if results:
        db.commit()
    results.sort(key=lambda item: (not item.is_sponsored, item.distance_miles, item.name.lower()))
    return EventPlannerResult(event=event, radius_miles=radius, businesses=results)


@router.get("/riders/me/saved-events", response_model=list[EventRead])
def saved_events(x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> list[Event]:
    rider = rider_from_token(x_rider_token, db)
    return (db.query(Event).join(RiderSavedEvent, RiderSavedEvent.event_id == Event.id)
            .filter(RiderSavedEvent.rider_id == rider.id, Event.status == "approved", Event.end_date >= date.today())
            .order_by(Event.start_date).all())


@router.post("/events/{event_id}/save")
def save_event(event_id: int, x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    event = public_event_id(event_id, db); rider = rider_from_token(x_rider_token, db)
    saved = db.query(RiderSavedEvent).filter_by(event_id=event.id, rider_id=rider.id).first()
    if not saved: db.add(RiderSavedEvent(event_id=event.id, rider_id=rider.id)); db.add(EventMetric(event_id=event.id, action="save")); db.commit()
    return {"saved": True}


@router.delete("/events/{event_id}/save")
def unsave_event(event_id: int, x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    rider = rider_from_token(x_rider_token, db)
    db.query(RiderSavedEvent).filter_by(event_id=event_id, rider_id=rider.id).delete(); db.commit()
    return {"saved": False}


@router.post("/events/{event_id}/attendance")
def set_attendance(event_id: int, payload: dict = Body(...), x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    event = public_event_id(event_id, db); rider = rider_from_token(x_rider_token, db); value = str(payload.get("status", ""))
    if value not in ATTENDANCE_STATUSES: raise HTTPException(status_code=400, detail="Attendance must be going, interested, or not_going")
    row = db.query(EventAttendee).filter_by(event_id=event.id, rider_id=rider.id).first()
    if row: row.status = value
    else: db.add(EventAttendee(event_id=event.id, rider_id=rider.id, status=value))
    db.add(EventMetric(event_id=event.id, action="attendance")); db.commit()
    return event_engagement(event.slug, x_rider_token, db)


@router.delete("/events/{event_id}/attendance")
def clear_attendance(event_id: int, x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    rider = rider_from_token(x_rider_token, db); db.query(EventAttendee).filter_by(event_id=event_id, rider_id=rider.id).delete(); db.commit()
    event = public_event_id(event_id, db); return event_engagement(event.slug, x_rider_token, db)


@router.get("/events/{slug}/engagement")
def event_engagement(slug: str, x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    event = get_public_event_or_404(slug, db)
    counts = dict(db.query(EventAttendee.status, func.count(EventAttendee.id)).filter(EventAttendee.event_id == event.id).group_by(EventAttendee.status).all())
    rider = db.query(Rider).filter(Rider.access_token == x_rider_token).first() if x_rider_token else None
    saved = bool(rider and db.query(RiderSavedEvent).filter_by(event_id=event.id, rider_id=rider.id).first())
    attendance = db.query(EventAttendee).filter_by(event_id=event.id, rider_id=rider.id).first() if rider else None
    return {"saved": saved, "attendance": attendance.status if attendance else "", "going": counts.get("going", 0), "interested": counts.get("interested", 0)}


@router.get("/events/{slug}/calendar.ics")
def event_calendar(slug: str, db: Session = Depends(get_db)) -> Response:
    event = get_public_event_or_404(slug, db); db.add(EventMetric(event_id=event.id, action="calendar_download")); db.commit()
    start = event.start_date.strftime("%Y%m%d"); end = (event.end_date + timedelta(days=1)).strftime("%Y%m%d")
    location = ", ".join(filter(None, [event.venue, event.address, f"{event.city}, {event.state}"]))
    body = "\r\n".join(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Appalachia Offroad//Events//EN", "BEGIN:VEVENT", f"UID:event-{event.id}@appalachiaoffroadapp.com", f"DTSTART;VALUE=DATE:{start}", f"DTEND;VALUE=DATE:{end}", f"SUMMARY:{event.title}", f"LOCATION:{location}", f"DESCRIPTION:{event.description}", f"URL:{event.official_url or event.verification_source}", "END:VEVENT", "END:VCALENDAR", ""])
    return Response(body, media_type="text/calendar", headers={"Content-Disposition": f'attachment; filename="{event.slug}.ics"'})


@router.post("/events/{event_id}/plans")
def create_ride_plan(event_id: int, payload: dict = Body(...), x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    event = public_event_id(event_id, db); rider = rider_from_token(x_rider_token, db)
    try: arrival = date.fromisoformat(payload["arrival_date"]); departure = date.fromisoformat(payload["departure_date"])
    except (KeyError, ValueError): raise HTTPException(status_code=400, detail="Valid arrival and departure dates are required")
    if departure < arrival: raise HTTPException(status_code=400, detail="Departure cannot precede arrival")
    plan = EventRidePlan(rider_id=rider.id, event_id=event.id, title=str(payload.get("title") or f"{event.title} plan"), arrival_date=arrival, departure_date=departure, items=payload.get("items") or [], notes=str(payload.get("notes") or ""), share_token=secrets.token_urlsafe(24))
    db.add(plan); db.add(EventMetric(event_id=event.id, action="ride_plan_created")); db.commit(); db.refresh(plan)
    return {"id": plan.id, "share_token": plan.share_token, "share_url": f"/trail-talk/plans/{plan.share_token}"}


@router.get("/riders/me/event-plans")
def rider_plans(x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> list[dict]:
    rider = rider_from_token(x_rider_token, db); rows = db.query(EventRidePlan).filter_by(rider_id=rider.id).all()
    return [{"id": p.id, "event_id": p.event_id, "title": p.title, "arrival_date": p.arrival_date, "departure_date": p.departure_date, "items": p.items, "notes": p.notes, "share_token": p.share_token} for p in rows]


@router.get("/event-plans/shared/{share_token}")
def shared_plan(share_token: str, db: Session = Depends(get_db)) -> dict:
    plan = db.query(EventRidePlan).filter_by(share_token=share_token).first()
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    event = db.get(Event, plan.event_id)
    return {"title": plan.title, "event": event.title if event else "Event", "arrival_date": plan.arrival_date, "departure_date": plan.departure_date, "items": plan.items, "notes": plan.notes}


@router.post("/events/{event_id}/reminders")
def set_reminders(event_id: int, payload: dict = Body(...), x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    event = public_event_id(event_id, db); rider = rider_from_token(x_rider_token, db); days = {int(x) for x in payload.get("days", [])}
    if not days.issubset(REMINDER_DAYS): raise HTTPException(status_code=400, detail="Reminder days must be 1, 3, or 7")
    db.query(EventReminder).filter_by(event_id=event.id, rider_id=rider.id).delete()
    db.add_all([EventReminder(event_id=event.id, rider_id=rider.id, days_before=d) for d in days]); db.commit()
    return {"days": sorted(days)}


@router.post("/admin/event-reminders/run")
def process_reminders(_: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    today = date.today(); sent = 0
    rows = db.query(EventReminder).join(Event).join(Rider).filter(EventReminder.sent_at.is_(None), Event.status == "approved", Event.end_date >= today).all()
    for reminder in rows:
        event = db.get(Event, reminder.event_id); rider = db.get(Rider, reminder.rider_id)
        if event and rider and rider.alert_email_opt_in and event.start_date == today + timedelta(days=reminder.days_before):
            text = f"{event.title} starts in {reminder.days_before} day(s), on {event.start_date}. Confirm details with the organizer: {event.official_url or event.verification_source}"
            deliveries = []
            if rider.alert_email_opt_in: deliveries.append(send_trip_plan_email(rider.email, event.title, text).sent)
            if rider.alert_phone_opt_in and rider.phone: deliveries.append(send_sms(rider.phone, text).sent)
            if deliveries and all(deliveries): reminder.sent_at = datetime.utcnow(); sent += 1
    db.commit(); return {"sent": sent}


@router.post("/events/{event_id}/metrics")
def track_event_metric(event_id: int, payload: dict = Body(...), db: Session = Depends(get_db)) -> dict:
    public_event_id(event_id, db); action = str(payload.get("action", "")); allowed = {"event_view", "registration_click", "official_source_click", "directions", "share", "planner_opened", "business_clicked", "deal_click", "add_to_plan"}
    if action not in allowed: raise HTTPException(status_code=400, detail="Unknown event action")
    business_id = payload.get("business_id"); db.add(EventMetric(event_id=event_id, business_id=int(business_id) if business_id else None, action=action)); db.commit(); return {"tracked": True}


@router.get("/businesses/{business_id}/event-metrics")
def business_event_metrics(business_id: int, x_business_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    business = db.get(Business, business_id)
    if not business or not business.owner_access_token or not secrets.compare_digest(business.owner_access_token, x_business_token): raise HTTPException(status_code=401, detail="Business access required")
    rows = db.query(EventMetric.action, func.count(EventMetric.id)).filter(EventMetric.business_id == business.id).group_by(EventMetric.action).all()
    return {"business_id": business.id, "metrics": dict(rows)}


@router.post("/admin/events/{event_id}/needs-reverification")
def needs_reverification(event_id: int, _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    event = admin_event_or_404(event_id, db); event.reverify_after = datetime.utcnow(); db.commit()
    return {"id": event.id, "needs_reverification": True, "status": event.status}


@router.get("/admin/events-operations")
def event_operations(_: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    today = date.today(); upcoming = db.query(Event).filter(Event.status == "approved", Event.end_date >= today)
    return {"upcoming_verified": upcoming.filter(Event.is_verified.is_(True)).count(), "missing_coordinates": upcoming.filter(or_(Event.latitude.is_(None), Event.longitude.is_(None))).count(), "missing_source": upcoming.filter(Event.verification_source == "").count(), "needs_reverification": upcoming.filter(Event.reverify_after.is_not(None), Event.reverify_after <= datetime.utcnow()).count(), "starting_within_30_days": upcoming.filter(Event.start_date <= today + timedelta(days=30)).count()}


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
