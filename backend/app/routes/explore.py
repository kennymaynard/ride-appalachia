import math
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.explore_schemas import ExploreDestinationInput, ExploreDestinationRead, ExplorePhotoCreate, ExplorePlanRead, ExplorePlanRequest, ExploreReportCreate
from app.models import ExploreDestination, ExploreDestinationReport, ExploreDestinationTrail, ExplorePhotoSubmission
from app.services.explore_ai import build_ai_plan
from app.routes.riders import require_rider_access

router = APIRouter(tags=["explore"])


@router.post("/explore/plan", response_model=ExplorePlanRead)
def create_explore_plan(payload: ExplorePlanRequest, db: Session = Depends(get_db)) -> dict:
    rows = db.query(ExploreDestination).filter(ExploreDestination.id.in_(payload.destination_ids), ExploreDestination.status == "approved").limit(60).all()
    if not rows: raise HTTPException(400, "No approved destinations were supplied")
    preferences = {"family_trip": payload.family_trip, "lodging_needed": payload.lodging_needed, "food_needed": payload.food_needed, "indoor": payload.indoor, "outdoor": payload.outdoor}
    try:
        stops = build_ai_plan(rows, payload.days, preferences)
    except Exception:
        stops = [{"destination_id": row.id, "day": min(payload.days, index // 3 + 1), "notes": "Suggested from approved Explore destinations."} for index, row in enumerate(rows[: payload.days * 3])]
        return {"source": "standard", "stops": stops, "message": "AI was unavailable, so the standard planner built this trip."}
    return {"source": "ai", "stops": stops, "message": "AI plan created from approved Explore destinations."}


def destination_payload(row: ExploreDestination, distance_miles: float | None = None) -> dict:
    data = {column.name: getattr(row, column.name) for column in row.__table__.columns}
    data["nearby_trail_slugs"] = [trail.trail_slug for trail in row.trails]
    data["distance_miles"] = distance_miles
    return data


def haversine_miles(latitude: float, longitude: float, other_latitude: float, other_longitude: float) -> float:
    radius = 3958.8
    lat1, lat2 = math.radians(latitude), math.radians(other_latitude)
    delta_lat = math.radians(other_latitude - latitude)
    delta_lon = math.radians(other_longitude - longitude)
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:170] or "destination"


@router.get("/explore", response_model=list[ExploreDestinationRead])
def list_destinations(state: str = "", county: str = "", city: str = "", category: str = "", trail: str = "", q: str = "", family_friendly: bool | None = None, veteran_owned: bool | None = None, free_admission: bool | None = None, indoor: bool | None = None, outdoor: bool | None = None, latitude: float | None = None, longitude: float | None = None, distance: float = 50, limit: int = Query(100, ge=1, le=250), db: Session = Depends(get_db)) -> list[dict]:
    query = db.query(ExploreDestination).options(selectinload(ExploreDestination.trails)).filter(ExploreDestination.status == "approved")
    for field, value in ((ExploreDestination.state, state.upper()), (ExploreDestination.county, county), (ExploreDestination.city, city), (ExploreDestination.category, category)):
        if value: query = query.filter(field.ilike(value))
    if q:
        term = f"%{q.strip()}%"; query = query.filter(or_(ExploreDestination.name.ilike(term), ExploreDestination.short_description.ilike(term), ExploreDestination.city.ilike(term)))
    if trail: query = query.join(ExploreDestinationTrail).filter(ExploreDestinationTrail.trail_slug == trail)
    for field, value in ((ExploreDestination.family_friendly, family_friendly), (ExploreDestination.veteran_owned, veteran_owned), (ExploreDestination.free_admission, free_admission), (ExploreDestination.indoor, indoor), (ExploreDestination.outdoor, outdoor)):
        if value is not None: query = query.filter(field.is_(value))
    location_search = latitude is not None and longitude is not None
    if location_search:
        if not 1 <= distance <= 100: raise HTTPException(400, "Distance must be between 1 and 100 miles")
        latitude_span = distance / 69
        longitude_span = distance / max(1, 69 * math.cos(math.radians(latitude)))
        query = query.filter(
            ExploreDestination.latitude.is_not(None), ExploreDestination.longitude.is_not(None),
            ExploreDestination.latitude.between(latitude - latitude_span, latitude + latitude_span),
            ExploreDestination.longitude.between(longitude - longitude_span, longitude + longitude_span),
        )
    rows = query.order_by(ExploreDestination.featured.desc(), ExploreDestination.verified.desc(), ExploreDestination.name).limit(250 if location_search else limit).all()
    if not location_search: return [destination_payload(row) for row in rows]
    nearby = [(row, haversine_miles(latitude, longitude, row.latitude, row.longitude)) for row in rows]
    nearby = [(row, miles) for row, miles in nearby if miles <= distance]
    nearby.sort(key=lambda item: (not item[0].featured, item[1], not item[0].verified, item[0].name))
    return [destination_payload(row, round(miles, 1)) for row, miles in nearby[:limit]]


@router.get("/explore/{slug}", response_model=ExploreDestinationRead)
def get_destination(slug: str, db: Session = Depends(get_db)) -> dict:
    row = db.query(ExploreDestination).options(selectinload(ExploreDestination.trails)).filter(ExploreDestination.slug == slug, ExploreDestination.status == "approved").first()
    if not row: raise HTTPException(404, "Destination not found")
    return destination_payload(row)


@router.post("/explore/suggestions", status_code=202)
def suggest_destination(payload: ExploreDestinationInput, db: Session = Depends(get_db), _rider=Depends(require_rider_access)) -> dict:
    base = slugify(payload.name); slug = base; suffix = 2
    while db.query(ExploreDestination.id).filter(ExploreDestination.slug == slug).first(): slug, suffix = f"{base}-{suffix}", suffix + 1
    data = payload.model_dump(exclude={"nearby_trail_slugs"}); row = ExploreDestination(**data, slug=slug, status="pending")
    db.add(row); db.flush()
    for trail_slug in payload.nearby_trail_slugs: db.add(ExploreDestinationTrail(destination_id=row.id, trail_slug=slugify(trail_slug)))
    db.commit(); return {"id": row.id, "status": "pending", "message": "Submitted for admin review."}


@router.post("/explore/{slug}/reports", status_code=202)
def report_destination(slug: str, payload: ExploreReportCreate, db: Session = Depends(get_db), _rider=Depends(require_rider_access)) -> dict:
    row = db.query(ExploreDestination).filter(ExploreDestination.slug == slug).first()
    if not row: raise HTTPException(404, "Destination not found")
    db.add(ExploreDestinationReport(destination_id=row.id, **payload.model_dump())); db.commit(); return {"status": "pending"}


@router.post("/explore/{slug}/photos", status_code=202)
def add_destination_photo(slug: str, payload: ExplorePhotoCreate, db: Session = Depends(get_db), _rider=Depends(require_rider_access)) -> dict:
    row = db.query(ExploreDestination).filter(ExploreDestination.slug == slug).first()
    if not row: raise HTTPException(404, "Destination not found")
    db.add(ExplorePhotoSubmission(destination_id=row.id, **payload.model_dump())); db.commit(); return {"status": "pending"}
