from datetime import date, timedelta
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Event, EventAttendee, EventReminder, Rider, RiderSavedEvent
from app.routes.events import create_ride_plan, event_calendar, event_engagement, process_reminders, save_event, set_attendance, set_reminders, shared_plan


class Phase2EventTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine); self.db = sessionmaker(bind=engine)()
        self.event = Event(title="Future Ride", slug="future-ride", organizer="Club", description="Ride", state="KY", city="Harlan", start_date=date.today() + timedelta(days=7), end_date=date.today() + timedelta(days=8), category="group_ride", status="approved", is_verified=True, verification_source="https://example.com")
        self.rider = Rider(display_name="Rider", email="rider@example.com", access_token="rider-token", password_hash="x", alert_email_opt_in=True)
        self.db.add_all([self.event, self.rider]); self.db.commit(); self.db.refresh(self.event); self.db.refresh(self.rider)

    def tearDown(self): self.db.close()

    def test_save_requires_auth_and_is_idempotent(self):
        with self.assertRaises(HTTPException): save_event(self.event.id, "", self.db)
        save_event(self.event.id, "rider-token", self.db); save_event(self.event.id, "rider-token", self.db)
        self.assertEqual(self.db.query(RiderSavedEvent).count(), 1)

    def test_attendance_counts_do_not_expose_profiles(self):
        set_attendance(self.event.id, {"status": "going"}, "rider-token", self.db)
        result = event_engagement(self.event.slug, "", self.db)
        self.assertEqual(result["going"], 1); self.assertNotIn("email", result); self.assertNotIn("phone", result)

    def test_ics_is_valid_and_stable(self):
        response = event_calendar(self.event.slug, self.db); text = response.body.decode()
        self.assertIn("BEGIN:VCALENDAR", text); self.assertIn(f"UID:event-{self.event.id}@appalachiaoffroadapp.com", text); self.assertIn("END:VCALENDAR", text)

    def test_plan_share_excludes_rider_private_data(self):
        result = create_ride_plan(self.event.id, {"arrival_date": self.event.start_date.isoformat(), "departure_date": self.event.end_date.isoformat(), "items": [{"day": 1, "label": "Check-in"}]}, "rider-token", self.db)
        public = shared_plan(result["share_token"], self.db)
        self.assertNotIn("rider_id", public); self.assertNotIn("email", public)

    @patch("app.routes.events.send_trip_plan_email")
    def test_reminders_are_idempotent(self, send_email):
        send_email.return_value.sent = True
        set_reminders(self.event.id, {"days": [7]}, "rider-token", self.db)
        self.assertEqual(process_reminders(None, self.db)["sent"], 1)
        self.assertEqual(process_reminders(None, self.db)["sent"], 0)
        self.assertIsNotNone(self.db.query(EventReminder).one().sent_at)

    def test_pending_event_cannot_be_saved(self):
        self.event.status = "pending"; self.db.commit()
        with self.assertRaises(HTTPException): save_event(self.event.id, "rider-token", self.db)


if __name__ == "__main__": unittest.main()
