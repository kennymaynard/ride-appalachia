from sqlalchemy.orm import Session

from app.models import Business, TrailReview

DEMO_BUSINESS_SLUGS = [
    "rush-ridge-lodging-partner",
    "hatfield-rider-meal-partner",
    "inez-atv-rental-partner",
    "harlan-trail-repair-partner",
    "matewan-fuel-supply-partner",
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
    for business in db.query(Business).filter(Business.slug.in_(DEMO_BUSINESS_SLUGS)).all():
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
