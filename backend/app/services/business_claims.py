from sqlalchemy.orm import Session

from app.models import Business, ExploreDestination


def link_approved_explore_destination(db: Session, business: Business) -> None:
    if business.source_provider != "explore" or not business.source_id: return
    try: destination_id = int(business.source_id)
    except ValueError: return
    destination = db.get(ExploreDestination, destination_id)
    if destination and destination.claimed_by_business_id is None:
        destination.claimed_by_business_id = business.id
