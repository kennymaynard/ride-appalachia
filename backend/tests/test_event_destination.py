from datetime import date, datetime, timedelta
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Business, Event, EventBusinessPlacement, EventDiscussion, EventMedia, Rider, TrailConditionReport
from app.routes.event_destination import add_discussion, add_media, build_itinerary, destination, flyer, moderate_content, nearby_businesses

class EventDestinationTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool); Base.metadata.create_all(engine); self.db = sessionmaker(bind=engine)()
        self.event = Event(title="Destination Ride", slug="destination-ride", organizer="Club", description="Ride", state="KY", city="Harlan", venue="Trail", latitude=36.8, longitude=-83.3, start_date=date.today()+timedelta(days=10), end_date=date.today()+timedelta(days=11), category="group_ride", status="approved", is_verified=True, verification_source="https://example.com", trail_area_slug="harlan")
        self.rider = Rider(display_name="Rider", email="rider@example.com", access_token="token", password_hash="x")
        self.db.add_all([self.event, self.rider]); self.db.commit(); self.db.refresh(self.event)
    def tearDown(self): self.db.close()

    def business(self, name, category, distance=.01, **values):
        row = Business(name=name, slug=name.lower().replace(" ", "-"), category=category, description=values.pop("description", category), phone="6065550100", location="Harlan", latitude=36.8+distance, longitude=-83.3, photo_url="", listing_status="approved", is_approved=True, **values); self.db.add(row); self.db.commit(); self.db.refresh(row); return row

    def test_nearby_groups_and_sponsored_sort(self):
        standard = self.business("Nearby Food", "food", .005); sponsor = self.business("Partner Cabin", "lodging", .02, subscription_status="active")
        self.db.add(EventBusinessPlacement(event_id=self.event.id, business_id=sponsor.id, placement="top", starts_at=datetime.utcnow()-timedelta(days=1), ends_at=datetime.utcnow()+timedelta(days=1), status="approved")); self.db.commit()
        rows = nearby_businesses(self.event, self.db); self.assertEqual(rows[0]["id"], sponsor.id); self.assertTrue(rows[0]["is_sponsored"]); self.assertEqual(rows[1]["group"], "food")

    def test_dynamic_itinerary_uses_businesses(self):
        rows = [{"group":"food","name":"Mountain BBQ","slug":"mountain-bbq"},{"group":"fuel","name":"Trail Fuel","slug":"trail-fuel"}]
        itinerary = build_itinerary(self.event, rows); self.assertEqual(itinerary[0]["items"][1]["label"], "Mountain BBQ"); self.assertEqual(itinerary[0]["items"][2]["label"], "Trail Fuel")

    @patch("app.routes.event_destination.weather", return_value={"available": False, "message": "test"})
    def test_destination_includes_conditions_and_tracks_view(self, _weather):
        self.db.add(TrailConditionReport(area_slug="harlan", trail_name="Trail 1", report_type="flooding", severity="high", note="Creek high", status="approved")); self.db.commit()
        result = destination(self.event.slug, 50, self.db); self.assertEqual(result["conditions"][0]["type"], "flooding"); self.assertIn("itinerary", result)

    def test_engagement_is_moderated(self):
        result = add_discussion(self.event.id, {"kind":"question","message":"Is the trail open?"}, "token", self.db); self.assertEqual(result["status"], "pending")
        moderate_content("discussion", result["id"], {"status":"approved"}, None, self.db); self.assertEqual(self.db.get(EventDiscussion, result["id"]).status, "approved")
        media = add_media(self.event.id, {"media_type":"video","media_url":"https://example.com/video","caption":"Ride"}, "token", self.db); self.assertEqual(self.db.get(EventMedia, media["id"]).status, "pending")

    def test_unverified_event_cannot_generate_flyer(self):
        self.event.is_verified = False; self.db.commit()
        with self.assertRaises(HTTPException): flyer(self.event.id, "pdf", None, self.db)

    def test_verified_flyer_formats(self):
        pdf = flyer(self.event.id, "pdf", None, self.db); svg = flyer(self.event.id, "instagram", None, self.db)
        self.assertTrue(pdf.body.startswith(b"%PDF")); self.assertIn(b"<svg", svg.body)

if __name__ == "__main__": unittest.main()
