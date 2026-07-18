import math
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.explore_schemas import ExploreDestinationInput, ExploreDestinationRead, ExplorePhotoCreate, ExplorePlanRead, ExplorePlanRequest, ExploreReportCreate
from app.models import Business, ExploreDestination, ExploreDestinationReport, ExploreDestinationTrail, ExplorePhotoSubmission
from app.services.explore_ai import build_ai_plan
from app.routes.riders import require_rider_access

router = APIRouter(tags=["explore"])
CLAIMABLE_CATEGORIES = {"local_food", "lodging", "historic_sites", "museums", "local_shops", "country_stores", "ice_cream_desserts", "family_activities", "campgrounds", "events", "fuel", "repairs_recovery", "hospitals_urgent_care"}
BUSINESS_CATEGORY_MAP = {"local_food":"food", "ice_cream_desserts":"food", "lodging":"lodging", "campgrounds":"lodging", "fuel":"fuel", "repairs_recovery":"repairs"}
EXPLORE_BUSINESS_CATEGORY_MAP = {"food":"local_food", "lodging":"lodging", "fuel":"fuel", "repairs":"repairs_recovery", "rentals":"family_activities", "services":"family_activities"}


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


def business_location_parts(location: str) -> tuple[str, str, str, str]:
    parts = [part.strip() for part in (location or "").split(",") if part.strip()]
    state_match = re.search(r"\b([A-Z]{2})\b(?:\s+(\d{5}(?:-\d{4})?))?$", parts[-1] if parts else "")
    state = state_match.group(1) if state_match else ""
    postal_code = state_match.group(2) if state_match and state_match.group(2) else ""
    city = parts[-2] if state and len(parts) >= 2 else ""
    address = ", ".join(parts[:-2]) if city else location
    return address, city, state, postal_code


def business_explore_payload(row: Business, distance_miles: float | None = None) -> dict:
    address, city, state, postal_code = business_location_parts(row.location)
    now = row.created_at
    return {"id": -row.id, "name": row.name, "slug": f"business-{row.slug}", "category": EXPLORE_BUSINESS_CATEGORY_MAP.get(row.category, "family_activities"), "short_description": row.description[:360] or "Approved local business serving Appalachian riders.", "full_description": row.description, "address": address, "city": city, "county": "", "state": state, "postal_code": postal_code, "latitude": row.latitude, "longitude": row.longitude, "phone": row.phone, "website": row.website_url, "email": "", "hours_json": {}, "admission_cost": "", "parking_info": "", "accessibility_info": "", "pet_policy": "", "seasonal_info": "", "family_friendly": False, "veteran_owned": row.subscription_tier == "veteran_owned", "free_admission": False, "indoor": row.category in {"food", "lodging", "rentals", "services"}, "outdoor": row.category in {"fuel", "repairs", "rentals", "services"}, "featured": row.is_featured, "verified": True, "status": "approved", "image_url": row.photo_url, "image_urls": [row.photo_url] if row.photo_url else [], "amenities_json": [], "specials_json": [deal.title for deal in row.deals if deal.is_active], "events_json": [], "submitted_by_rider_id": None, "claimed_by_business_id": row.id, "created_at": now, "updated_at": now, "nearby_trail_slugs": [], "distance_miles": distance_miles}


def eligible_explore_businesses(db: Session) -> list[Business]:
    linked_ids = db.query(ExploreDestination.claimed_by_business_id).filter(ExploreDestination.claimed_by_business_id.is_not(None))
    return db.query(Business).options(selectinload(Business.deals)).filter(Business.is_approved.is_(True), Business.listing_status == "approved", Business.is_deleted.is_(False), Business.is_search_only.is_(False), or_(Business.source_provider.is_(None), Business.source_provider != "explore"), Business.category.in_(EXPLORE_BUSINESS_CATEGORY_MAP), ~Business.id.in_(linked_ids)).order_by(Business.is_featured.desc(), Business.name).limit(500).all()


def filtered_business_payloads(db: Session, state: str, county: str, city: str, category: str, trail: str, q: str, family_friendly: bool | None, veteran_owned: bool | None, free_admission: bool | None, indoor: bool | None, outdoor: bool | None, latitude: float | None, longitude: float | None, distance: float) -> list[dict]:
    if trail or family_friendly is True or free_admission is True: return []
    results = []
    for business in eligible_explore_businesses(db):
        payload = business_explore_payload(business)
        text = f"{payload['name']} {business.location} {payload['short_description']}".lower()
        if state and payload["state"].upper() != state.upper(): continue
        if county: continue
        if city and payload["city"].lower() != city.lower(): continue
        if category and payload["category"] != category: continue
        if q and q.strip().lower() not in text: continue
        if veteran_owned is not None and payload["veteran_owned"] != veteran_owned: continue
        if indoor is not None and payload["indoor"] != indoor: continue
        if outdoor is not None and payload["outdoor"] != outdoor: continue
        if latitude is not None and longitude is not None:
            if business.latitude is None or business.longitude is None: continue
            miles = haversine_miles(latitude, longitude, business.latitude, business.longitude)
            if miles > distance: continue
            payload["distance_miles"] = round(miles, 1)
        results.append(payload)
    return results


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
    if not location_search:
        results = [destination_payload(row) for row in rows]
        results.extend(filtered_business_payloads(db,state,county,city,category,trail,q,family_friendly,veteran_owned,free_admission,indoor,outdoor,latitude,longitude,distance))
        results.sort(key=lambda row: (not row["featured"], not row["verified"], row["name"]))
        return results[:limit]
    nearby = [(row, haversine_miles(latitude, longitude, row.latitude, row.longitude)) for row in rows]
    nearby = [(row, miles) for row, miles in nearby if miles <= distance]
    nearby.sort(key=lambda item: (not item[0].featured, item[1], not item[0].verified, item[0].name))
    results = [destination_payload(row, round(miles, 1)) for row, miles in nearby]
    results.extend(filtered_business_payloads(db,state,county,city,category,trail,q,family_friendly,veteran_owned,free_admission,indoor,outdoor,latitude,longitude,distance))
    results.sort(key=lambda row: (not row["featured"], row["distance_miles"] if row["distance_miles"] is not None else 999, not row["verified"], row["name"]))
    return results[:limit]


@router.get("/explore/{slug}", response_model=ExploreDestinationRead)
def get_destination(slug: str, db: Session = Depends(get_db)) -> dict:
    if slug.startswith("business-"):
        business = db.query(Business).options(selectinload(Business.deals)).filter(Business.slug == slug.removeprefix("business-"), Business.is_approved.is_(True), Business.listing_status == "approved", Business.is_deleted.is_(False), Business.is_search_only.is_(False)).first()
        if business and business.category in EXPLORE_BUSINESS_CATEGORY_MAP: return business_explore_payload(business)
    row = db.query(ExploreDestination).options(selectinload(ExploreDestination.trails)).filter(ExploreDestination.slug == slug, ExploreDestination.status == "approved").first()
    if not row: raise HTTPException(404, "Destination not found")
    return destination_payload(row)


@router.post("/explore/{slug}/claim-target")
def create_explore_claim_target(slug: str, db: Session = Depends(get_db), _rider=Depends(require_rider_access)) -> dict:
    destination = db.query(ExploreDestination).filter(ExploreDestination.slug == slug, ExploreDestination.status == "approved").first()
    if not destination: raise HTTPException(404, "Destination not found")
    if destination.category not in CLAIMABLE_CATEGORIES: raise HTTPException(400, "This public or natural destination is not eligible for an ownership claim")
    if destination.claimed_by_business_id:
        business = db.get(Business, destination.claimed_by_business_id)
        if business and business.owner_email: raise HTTPException(409, "This destination is already claimed")
    business = db.query(Business).filter(Business.source_provider == "explore", Business.source_id == str(destination.id)).first()
    if not business:
        business_slug = destination.slug; suffix = 2
        while db.query(Business.id).filter(Business.slug == business_slug).first(): business_slug, suffix = f"{destination.slug}-{suffix}", suffix + 1
        location = ", ".join(value for value in [destination.address, destination.city, destination.state] if value)[:180] or "Address being verified"
        business = Business(name=destination.name, slug=business_slug, category=BUSINESS_CATEGORY_MAP.get(destination.category, "services"), description=destination.full_description or destination.short_description, phone=destination.phone or "Not listed", location=location, latitude=destination.latitude, longitude=destination.longitude, photo_url=destination.image_url, website_url=destination.website, source_provider="explore", source_id=str(destination.id), source_url=f"/explore/{destination.slug}", listing_status="approved", is_approved=True, is_search_only=True, admin_notes="Claim target created from approved Explore destination; keep search-only to avoid duplicate map markers.")
        db.add(business); db.commit(); db.refresh(business)
    return {"business_id": business.id, "business_slug": business.slug, "claim_url": f"/business/claim?slug={business.slug}"}


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
