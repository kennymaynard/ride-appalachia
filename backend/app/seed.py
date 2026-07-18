from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Business, EventSource, TrailReview

OFFICIAL_EVENT_SOURCES = [
    {"name": "Leatherwood Off-Road Park Events", "base_url": "https://leatherwoodoffroad.com/", "state": "KY", "organizer_name": "Leatherwood Off-Road Park"},
    {"name": "Rush Off-Road Events", "base_url": "https://rushoffroad.com/", "state": "KY", "organizer_name": "Rush Off-Road"},
    {"name": "Windrock Park Events", "base_url": "https://windrockpark.com/", "state": "TN", "organizer_name": "Windrock Park"},
    {"name": "Hatfield-McCoy Area Events", "base_url": "https://www.devilsbackbonewv.com/thingstodo", "state": "WV", "organizer_name": "Devil's Backbone Adventure Resort"},
]

DEMO_BUSINESS_SLUGS = [
    "rush-ridge-lodging-partner",
    "hatfield-rider-meal-partner",
    "inez-atv-rental-partner",
    "harlan-trail-repair-partner",
    "matewan-fuel-supply-partner",
    "kenny-maynard-mphr3z4k",
    "wingos-grill",
    "trailside-ridge-cabin",
    "appalachian-atv-rentals",
    "harlan-trail-repair",
    "mountain-wrench-garage",
    "ridge-stop-fuel-supply",
]

DEMO_BUSINESS_NAMES = [
    "Codex Test Recovery",
    "Black Bear Cabin",
    "Trailside Ridge Cabin",
    "Appalachian ATV Rentals",
    "Mountain Wrench Garage",
    "Ridge Stop Fuel & Supply",
]

DEMO_REVIEW_NAMES = [
    "Weekend group lead",
    "Family ride planner",
    "Cabin crew",
    "First-time visitor",
    "Day ride crew",
    "Mountain weekend rider",
    "Large group organizer",
    "Experienced rider",
]


def remove_demo_data(db: Session) -> None:
    changed = False
    demo_businesses = (
        db.query(Business)
        .filter(
            or_(
                Business.slug.in_(DEMO_BUSINESS_SLUGS),
                Business.name.in_(DEMO_BUSINESS_NAMES),
                Business.description == "test test test",
                Business.phone.like("%555%"),
                Business.website_url.like("https://example.com%"),
            )
        )
        .all()
    )
    for business in demo_businesses:
        db.delete(business)
        changed = True

    deleted_reviews = (
        db.query(TrailReview)
        .filter(TrailReview.rider_name.in_(DEMO_REVIEW_NAMES))
        .delete(synchronize_session=False)
    )
    changed = changed or bool(deleted_reviews)

    if changed:
        db.commit()


def seed_database(db: Session) -> None:
    remove_demo_data(db)
    changed = False
    for source in OFFICIAL_EVENT_SOURCES:
        if db.query(EventSource).filter(EventSource.base_url == source["base_url"]).first():
            continue
        db.add(EventSource(**source, source_type="official_event_calendar", feed_url="", is_active=True, is_trusted=True, scan_frequency="twice_daily", notes="Official organizer-owned event schedule verified July 2026."))
        changed = True
    if changed:
        db.commit()
