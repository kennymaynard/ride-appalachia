from datetime import date, timedelta
import unittest

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Business, Campaign, Event
from app.routes.events import apply_verification, haversine_miles, list_events, plan_event_ride
from app.schemas import EventSubmission


class EventSystemTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.today = date.today()

    def tearDown(self) -> None:
        self.db.close()

    def payload(self, **overrides):
        data = {
            "title": "Verified Ride", "organizer": "Ride Club", "description": "A real ride.",
            "state": "KY", "city": "Pikeville", "start_date": self.today + timedelta(days=10),
            "end_date": self.today + timedelta(days=11), "category": "group_ride",
            "submitted_by_name": "Rider", "submitted_by_email": "rider@example.com",
        }
        data.update(overrides)
        return data

    def add_event(self, status="approved", **overrides):
        data = self.payload(**overrides)
        data.pop("submitted_by_name", None); data.pop("submitted_by_email", None)
        event = Event(**data, slug=f"event-{len(self.db.query(Event).all())}", status=status)
        self.db.add(event); self.db.commit(); self.db.refresh(event)
        return event

    def public_events(self, **overrides):
        args = dict(state="", month="", category="", vehicle="", featured=None, verified=None, search="", weekend=False, db=self.db)
        args.update(overrides)
        return list_events(**args)

    def test_state_validation(self):
        with self.assertRaises(ValidationError):
            EventSubmission(**self.payload(state="OH"))

    def test_invalid_date_range(self):
        with self.assertRaises(ValidationError):
            EventSubmission(**self.payload(start_date=self.today + timedelta(days=5), end_date=self.today))

    def test_pending_submission_not_public(self):
        self.add_event(status="pending")
        self.assertEqual(self.public_events(), [])

    def test_approved_future_event_public(self):
        event = self.add_event(status="approved")
        self.assertEqual([item.id for item in self.public_events()], [event.id])

    def test_expired_event_omitted_and_marked_expired(self):
        event = self.add_event(status="approved", start_date=self.today - timedelta(days=3), end_date=self.today - timedelta(days=1))
        self.assertEqual(self.public_events(), [])
        self.db.refresh(event)
        self.assertEqual(event.status, "expired")

    def test_verification_source_required(self):
        event = self.add_event(status="pending")
        with self.assertRaises(Exception):
            apply_verification(event, True, "")

    def test_filters(self):
        expected = self.add_event(state="WV", category="festival", vehicle_types=["UTV"], title="Mountain Festival")
        self.add_event(state="KY", category="group_ride", vehicle_types=["ATV"], title="Other Ride")
        results = self.public_events(state="WV", category="festival", vehicle="UTV", search="Mountain")
        self.assertEqual([item.id for item in results], [expected.id])

    def test_haversine_and_planner_sponsored_sort(self):
        event = self.add_event(latitude=37.5, longitude=-82.5, is_verified=True, verification_source="https://example.com")
        standard = Business(name="Near Standard", slug="near-standard", category="food", description="Food", phone="6065550100", location="Town", latitude=37.51, longitude=-82.5, photo_url="", listing_status="approved", is_approved=True)
        featured = Business(name="Featured", slug="featured", category="lodging", description="Stay", phone="6065550101", location="Town", latitude=37.52, longitude=-82.5, photo_url="", listing_status="approved", is_approved=True, is_featured=True)
        self.db.add_all([standard, featured]); self.db.commit()
        result = plan_event_ride(event.slug, radius=25, db=self.db)
        self.assertGreater(haversine_miles(37.5, -82.5, 37.6, -82.5), 0)
        self.assertEqual(result.businesses[0].name, "Featured")
        self.assertLess(result.businesses[1].distance_miles, result.businesses[0].distance_miles)


if __name__ == "__main__":
    unittest.main()
