import json
import math
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_settings
from app.models import Business
from app.schemas import BusinessImportCandidate, BusinessImportScanRequest


EARTH_RADIUS_MILES = 3958.8
FOOD_AMENITIES = {"restaurant", "fast_food", "cafe", "bar", "pub", "food_court", "ice_cream"}
FUEL_AMENITIES = {"fuel", "charging_station"}
LODGING_TOURISM = {"hotel", "motel", "guest_house", "camp_site", "caravan_site", "chalet", "hostel", "resort", "alpine_hut"}
REPAIR_SHOPS = {"car_repair", "tyres", "motorcycle_repair", "car_parts", "truck_repair"}
SERVICE_SHOPS = {"supermarket", "convenience", "hardware", "doityourself", "department_store", "mall", "outdoor", "farm", "trade"}
RENTAL_KEYS = {"rental", "car_rental", "motorcycle_rental", "outdoor"}


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    return EARTH_RADIUS_MILES * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def category_for(tags: dict[str, str]) -> str | None:
    amenity = tags.get("amenity", "")
    tourism = tags.get("tourism", "")
    shop = tags.get("shop", "")
    craft = tags.get("craft", "")
    if amenity in FOOD_AMENITIES: return "food"
    if amenity in FUEL_AMENITIES: return "fuel"
    if tourism in LODGING_TOURISM: return "lodging"
    if shop in REPAIR_SHOPS or craft in {"mechanic", "metal_construction", "welder"}: return "repairs"
    if amenity in RENTAL_KEYS or tags.get("rental") in {"atv", "motorcycle", "car", "boat"}: return "rentals"
    if shop in SERVICE_SHOPS or amenity in {"car_wash", "vehicle_inspection", "marketplace"}: return "services"
    return None


def build_location(tags: dict[str, str], fallback_area: str) -> str:
    full_address = str(tags.get("addr:full") or "").strip()
    if full_address:
        return full_address
    street = " ".join(filter(None, [tags.get("addr:housenumber", ""), tags.get("addr:street", "")])).strip()
    city = tags.get("addr:city") or tags.get("addr:place") or ""
    state = tags.get("addr:state", "")
    if not street:
        return f"Address unavailable — near {fallback_area}"
    return ", ".join(filter(None, [street, city, state]))


def find_duplicate(db: Session, source_id: str, name: str, latitude: float, longitude: float) -> tuple[int | None, str]:
    sourced = db.query(Business).filter(Business.source_provider == "openstreetmap", Business.source_id == source_id).first()
    if sourced: return sourced.id, "Already imported from this OpenStreetMap object"
    normalized = normalize_name(name)
    nearby = db.query(Business).filter(
        Business.latitude.between(latitude - 0.01, latitude + 0.01),
        Business.longitude.between(longitude - 0.015, longitude + 0.015),
    ).all()
    for business in nearby:
        if normalize_name(business.name) == normalized:
            return business.id, "Same normalized name near these coordinates"
    return None, ""


def scan_openstreetmap(db: Session, payload: BusinessImportScanRequest) -> list[BusinessImportCandidate]:
    radius_meters = int(payload.radius_miles * 1609.344)
    tag_filter = '["name"][~"^(amenity|tourism|shop|craft|rental)$"~"."]'
    query = f'[out:json][timeout:40];nwr(around:{radius_meters},{payload.latitude},{payload.longitude}){tag_filter};out center tags qt;'
    request = Request(
        f"{get_settings().overpass_url}?{urlencode({'data': query})}",
        headers={"User-Agent": "AppalachiaOffroadBusinessImporter/1.0 (support@appalachiaoffroadapp.com)"},
    )
    with urlopen(request, timeout=55) as response:
        data = json.load(response)
    candidates: list[BusinessImportCandidate] = []
    seen: set[str] = set()
    for element in data.get("elements", []):
        tags = element.get("tags") or {}
        category = category_for(tags)
        name = str(tags.get("name") or "").strip()
        location = build_location(tags, payload.area_name)
        coordinates = element.get("center") or element
        latitude, longitude = coordinates.get("lat"), coordinates.get("lon")
        if not category or not name or latitude is None or longitude is None: continue
        source_id = f'{element.get("type", "node")}/{element.get("id")}'
        if source_id in seen: continue
        seen.add(source_id)
        duplicate_id, duplicate_reason = find_duplicate(db, source_id, name, float(latitude), float(longitude))
        candidates.append(BusinessImportCandidate(
            source_id=source_id,
            source_url=f"https://www.openstreetmap.org/{source_id}",
            area_slug=payload.area_slug,
            area_name=payload.area_name,
            name=name,
            category=category,
            description=f"Imported from OpenStreetMap near {payload.area_name}. Unclaimed listing; details require owner or admin verification.",
            phone=tags.get("contact:phone") or tags.get("phone") or "",
            location=location,
            latitude=float(latitude), longitude=float(longitude),
            website_url=tags.get("contact:website") or tags.get("website") or "",
            distance_miles=round(haversine_miles(payload.latitude, payload.longitude, float(latitude), float(longitude)), 1),
            duplicate_business_id=duplicate_id, duplicate_reason=duplicate_reason,
        ))
    return sorted(candidates, key=lambda item: (item.duplicate_business_id is not None, item.distance_miles, item.name))[:500]
