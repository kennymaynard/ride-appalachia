from __future__ import annotations

from datetime import date, datetime, timedelta
from html import escape
import json
import secrets
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, BookingPayment, Business, BusinessReview, Event, EventAttendee, EventBusinessPlacement, EventDiscussion, EventInvite, EventMedia, EventMetric, EventRidePlan, EventSource, Rider, RiderSavedEvent, TrailConditionReport
from app.routes.admin import require_admin
from app.routes.events import PLANNER_CATEGORIES, get_public_event_or_404, haversine_miles, rider_from_token
from app.services.photos import normalize_photo_url

router = APIRouter(tags=["event destinations"])
DESTINATION_GROUPS = {"lodging": ("lodging",), "food": ("food",), "fuel": ("fuel",), "repairs": ("repairs", "services"), "recovery": ("tow", "recovery", "winch", "mobile repair"), "wash": ("wash", "clean"), "supplies": ("walmart", "auto parts", "tractor supply", "hardware", "supply")}
_weather_cache: dict[str, tuple[datetime, dict]] = {}

def nearby_businesses(event: Event, db: Session, radius: int = 50) -> list[dict]:
    if event.latitude is None or event.longitude is None: return []
    now = datetime.utcnow(); placements = {(row.business_id, row.placement): row for row in db.query(EventBusinessPlacement).filter(EventBusinessPlacement.event_id == event.id, EventBusinessPlacement.status == "approved", EventBusinessPlacement.starts_at <= now, EventBusinessPlacement.ends_at >= now).all()}
    rows = db.query(Business).filter(Business.is_approved.is_(True), Business.is_deleted.is_(False), Business.latitude.is_not(None), Business.longitude.is_not(None)).all(); results = []
    for business in rows:
        distance = haversine_miles(event.latitude, event.longitude, business.latitude, business.longitude)
        if distance > radius: continue
        rating, reviews = db.query(func.avg(BusinessReview.rating), func.count(BusinessReview.id)).filter(BusinessReview.business_id == business.id, BusinessReview.status == "approved").one()
        text = f"{business.name} {business.category} {business.description}".lower(); group = business.category if business.category in {"lodging", "food", "fuel", "repairs"} else "services"
        for label, terms in DESTINATION_GROUPS.items():
            if label in {"lodging", "food", "fuel", "repairs"} and business.category in terms: group = label
            elif any(term in text for term in terms): group = label
        placement = next((place for (business_id, place) in placements if business_id == business.id), "")
        partner = business.subscription_status in {"active", "trialing"}
        results.append({"id": business.id, "name": business.name, "slug": business.slug, "category": business.category, "group": group, "description": business.description, "phone": business.phone, "website_url": business.website_url, "photo_url": business.photo_url, "distance_miles": round(distance, 1), "rating": round(float(rating), 1) if rating else None, "review_count": reviews, "is_partner": partner, "is_sponsored": bool(placement), "placement": placement, "disclosure": placements.get((business.id, placement)).disclosure_label if placement else "", "has_booking": bool(business.bookable_listings)})
    results.sort(key=lambda row: (not row["is_sponsored"], not row["is_partner"], row["distance_miles"], -(row["rating"] or 0)))
    return results

def build_itinerary(event: Event, businesses: list[dict]) -> list[dict]:
    def pick(group: str, fallback: str):
        match = next((business for business in businesses if business["group"] == group), None)
        return {"label": match["name"], "business_slug": match["slug"]} if match else {"label": fallback, "business_slug": None}
    return [{"day": "Friday", "items": [{"label": "Check in", "business_slug": None}, pick("food", "Dinner near the event"), pick("fuel", "Fuel machines and tow vehicle")]}, {"day": "Saturday", "items": [{"label": event.title, "business_slug": None}, pick("food", "Trail lunch"), pick("food", "Dinner with the crew")]}, {"day": "Sunday", "items": [pick("food", "Breakfast"), {"label": "Scenic stop or short ride", "business_slug": None}, {"label": "Ride home", "business_slug": None}]}]

def weather(event: Event) -> dict:
    if event.latitude is None or event.longitude is None: return {"available": False, "message": "Event coordinates are required for weather."}
    key = f"{event.latitude:.3f},{event.longitude:.3f}"; cached = _weather_cache.get(key)
    if cached and cached[0] > datetime.utcnow() - timedelta(minutes=30): return cached[1]
    params = urlencode({"latitude": event.latitude, "longitude": event.longitude, "current": "temperature_2m,weather_code", "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max", "temperature_unit": "fahrenheit", "forecast_days": 7, "timezone": "auto"})
    try:
        with urlopen(Request(f"https://api.open-meteo.com/v1/forecast?{params}", headers={"User-Agent": "AppalachiaOffroad/1.0"}), timeout=5) as response: data = json.loads(response.read())
        result = {"available": True, "current": data.get("current", {}), "daily": data.get("daily", {})}; _weather_cache[key] = (datetime.utcnow(), result); return result
    except Exception: return {"available": False, "message": "Weather is temporarily unavailable."}

@router.get("/events/{slug}/destination")
def destination(slug: str, radius: int = Query(50, ge=5, le=100), db: Session = Depends(get_db)) -> dict:
    event = get_public_event_or_404(slug, db); businesses = nearby_businesses(event, db, radius)
    conditions = db.query(TrailConditionReport).filter(TrailConditionReport.area_slug == event.trail_area_slug, TrailConditionReport.status == "approved").order_by(TrailConditionReport.created_at.desc()).limit(20).all() if event.trail_area_slug else []
    discussions = db.query(EventDiscussion).filter_by(event_id=event.id, status="approved").order_by(EventDiscussion.created_at.desc()).limit(50).all(); media = db.query(EventMedia).filter_by(event_id=event.id, status="approved").order_by(EventMedia.created_at.desc()).limit(50).all()
    db.add(EventMetric(event_id=event.id, action="event_view")); db.commit()
    return {"event": event, "businesses": businesses, "itinerary": build_itinerary(event, businesses), "weather": weather(event), "conditions": [{"id": row.id, "type": row.report_type, "severity": row.severity, "trail": row.trail_name, "note": row.note, "created_at": row.created_at} for row in conditions], "discussions": [{"id": row.id, "kind": row.kind, "message": row.message, "created_at": row.created_at} for row in discussions], "media": [{"id": row.id, "type": row.media_type, "url": row.media_url, "caption": row.caption} for row in media]}

@router.post("/events/{event_id}/discussions", status_code=201)
def add_discussion(event_id: int, payload: dict = Body(...), x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    rider = rider_from_token(x_rider_token, db); event = db.get(Event, event_id); kind = str(payload.get("kind", "comment")); message = str(payload.get("message", "")).strip()
    if not event or event.status != "approved": raise HTTPException(404, "Event not found")
    if kind not in {"comment", "question"} or not 2 <= len(message) <= 2000: raise HTTPException(400, "A valid comment or question is required")
    row = EventDiscussion(event_id=event.id, rider_id=rider.id, kind=kind, message=message); db.add(row); db.commit(); return {"id": row.id, "status": row.status}

@router.post("/events/{event_id}/media", status_code=201)
def add_media(event_id: int, payload: dict = Body(...), x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    rider = rider_from_token(x_rider_token, db); event = db.get(Event, event_id); media_type = str(payload.get("media_type", "photo")); url = str(payload.get("media_url", ""))
    if not event or event.status != "approved": raise HTTPException(404, "Event not found")
    if media_type not in {"photo", "video"}: raise HTTPException(400, "Media must be photo or video")
    if media_type == "photo": url = normalize_photo_url(url)
    elif not url.startswith("https://"): raise HTTPException(400, "Video must use a public HTTPS URL")
    row = EventMedia(event_id=event.id, rider_id=rider.id, media_type=media_type, media_url=url, caption=str(payload.get("caption", ""))[:240]); db.add(row); db.commit(); return {"id": row.id, "status": row.status}

@router.post("/events/{event_id}/invites", status_code=201)
def invite(event_id: int, payload: dict = Body(...), x_rider_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    rider = rider_from_token(x_rider_token, db); event = db.get(Event, event_id)
    if not event or event.status != "approved": raise HTTPException(404, "Event not found")
    row = EventInvite(event_id=event.id, rider_id=rider.id, invite_token=secrets.token_urlsafe(24), recipient_email=str(payload.get("email", ""))[:180]); db.add(row); db.add(EventMetric(event_id=event.id, action="invite")); db.commit(); return {"invite_url": f"/trail-talk/rides/{event.slug}?invite={row.invite_token}"}

@router.get("/admin/events/{event_id}/destination-analytics")
def event_analytics(event_id: int, _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    metrics = dict(db.query(EventMetric.action, func.count(EventMetric.id)).filter(EventMetric.event_id == event_id).group_by(EventMetric.action).all()); bookings, revenue = db.query(func.count(Booking.id), func.coalesce(func.sum(BookingPayment.amount_cents), 0)).outerjoin(BookingPayment, BookingPayment.booking_id == Booking.id).filter(Booking.event_id == event_id).one()
    metrics.update({"saves": db.query(RiderSavedEvent).filter_by(event_id=event_id).count(), "attendance": db.query(EventAttendee).filter_by(event_id=event_id, status="going").count(), "trip_plans": db.query(EventRidePlan).filter_by(event_id=event_id).count(), "bookings": bookings, "partner_revenue_cents": int(revenue)}); return metrics

@router.post("/admin/events/{event_id}/placements", status_code=201)
def create_placement(event_id: int, payload: dict = Body(...), _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    event, business = db.get(Event, event_id), db.get(Business, int(payload.get("business_id", 0))); placement = str(payload.get("placement", ""))
    if not event or not business or not business.is_approved: raise HTTPException(404, "Approved event and business are required")
    if placement not in {"top", "sidebar", "planner", "search"}: raise HTTPException(400, "Unknown placement")
    try: starts = datetime.fromisoformat(str(payload["starts_at"])); ends = datetime.fromisoformat(str(payload["ends_at"]))
    except (KeyError, ValueError) as exc: raise HTTPException(400, "Valid placement dates are required") from exc
    if ends <= starts: raise HTTPException(400, "Placement end must follow its start")
    row = db.query(EventBusinessPlacement).filter_by(event_id=event.id, business_id=business.id, placement=placement).first()
    if row: row.starts_at = starts; row.ends_at = ends; row.status = str(payload.get("status", "pending"))
    else: row = EventBusinessPlacement(event_id=event.id, business_id=business.id, placement=placement, starts_at=starts, ends_at=ends, status=str(payload.get("status", "pending"))); db.add(row)
    db.commit(); return {"id": row.id, "status": row.status, "disclosure": row.disclosure_label}

@router.get("/admin/event-content")
def list_pending_content(_: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    discussions = db.query(EventDiscussion).filter_by(status="pending").order_by(EventDiscussion.created_at).limit(200).all(); media = db.query(EventMedia).filter_by(status="pending").order_by(EventMedia.created_at).limit(200).all()
    return {"discussions": [{"id": row.id, "event_id": row.event_id, "kind": row.kind, "message": row.message} for row in discussions], "media": [{"id": row.id, "event_id": row.event_id, "type": row.media_type, "url": row.media_url, "caption": row.caption} for row in media]}

@router.post("/admin/event-content/{content_type}/{content_id}/moderate")
def moderate_content(content_type: str, content_id: int, payload: dict = Body(...), _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    model = EventDiscussion if content_type == "discussion" else EventMedia if content_type == "media" else None; status = str(payload.get("status", ""))
    if not model or status not in {"approved", "rejected"}: raise HTTPException(400, "Unknown moderation action")
    row = db.get(model, content_id)
    if not row: raise HTTPException(404, "Content not found")
    row.status = status; db.commit(); return {"id": row.id, "status": row.status}

def simple_pdf(lines: list[str]) -> bytes:
    escaped = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
    stream = "BT /F1 22 Tf 72 720 Td " + " Tj 0 -34 Td ".join(f"({line})" for line in escaped) + " Tj ET"
    objects = ["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj", "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj", "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj", f"5 0 obj << /Length {len(stream)} >> stream\n{stream}\nendstream endobj"]
    body = "%PDF-1.4\n"; offsets = [0]
    for obj in objects: offsets.append(len(body.encode())); body += obj + "\n"
    xref = len(body.encode()); body += f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n" + "".join(f"{offset:010d} 00000 n \n" for offset in offsets[1:]) + f"trailer << /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    return body.encode()

@router.get("/admin/events/{event_id}/flyer.{format}")
def flyer(event_id: int, format: str, _: None = Depends(require_admin), db: Session = Depends(get_db)) -> Response:
    event = db.get(Event, event_id)
    if not event or not event.is_verified: raise HTTPException(400, "Only verified events can generate flyers")
    lines = [event.title, f"{event.start_date} - {event.end_date}", f"{event.venue or event.city}, {event.state}", event.official_url or event.verification_source]
    if format == "pdf": return Response(simple_pdf(lines), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{event.slug}.pdf"'})
    sizes = {"facebook": (1200, 630), "instagram": (1080, 1080), "story": (1080, 1920), "poster": (1200, 1600)}
    if format not in sizes: raise HTTPException(400, "Format must be facebook, instagram, story, poster, or pdf")
    width, height = sizes[format]; text = "".join(f'<text x="60" y="{140+i*90}" fill="white" font-size="{54 if i else 72}" font-family="Arial" font-weight="bold">{escape(line)}</text>' for i, line in enumerate(lines)); svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><rect width="100%" height="100%" fill="#17251b"/><rect x="35" y="35" width="{width-70}" height="{height-70}" rx="30" fill="none" stroke="#d89a3d" stroke-width="10"/>{text}<text x="60" y="{height-80}" fill="#d89a3d" font-size="38" font-family="Arial">Appalachia Offroad · Verify details before travel</text></svg>'
    return Response(svg, media_type="image/svg+xml", headers={"Content-Disposition": f'attachment; filename="{event.slug}-{format}.svg"'})
