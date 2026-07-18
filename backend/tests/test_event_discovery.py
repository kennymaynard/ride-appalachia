from datetime import date, timedelta
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Event, EventCandidate, EventSource
from app.routes.event_discovery import create_source, review_candidate, run_discovery, update_source
from app.services.event_discovery import candidate_status, event_changes, find_duplicate, jsonld_items, official_html_items, scan_source, score_candidate

class EventDiscoveryTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine); self.db = sessionmaker(bind=engine)()

    def tearDown(self): self.db.close()

    def source(self, **values):
        data = dict(name="Official Trail Calendar", source_type="official_event_calendar", base_url="https://example.gov/events", state="KY", is_active=True, is_trusted=True)
        data.update(values); row = EventSource(**data); self.db.add(row); self.db.commit(); self.db.refresh(row); return row

    def item(self, **values):
        data = dict(title="Harlan UTV Trail Ride", state="KY", city="Harlan", venue="Trailhead", start_date=date.today() + timedelta(days=20), end_date=date.today() + timedelta(days=20), registration_url="https://example.gov/register", structured=True)
        data.update(values); return data

    def test_source_validation_and_unsupported_type(self):
        with self.assertRaises(HTTPException): create_source({"name": "Bad", "source_type": "crawler", "base_url": "https://example.com", "state": "KY"}, None, self.db)
        with self.assertRaises(HTTPException): create_source({"name": "Bad", "source_type": "rss", "base_url": "file:///etc/passwd", "state": "KY"}, None, self.db)
        created = create_source({"name": "Tourism", "source_type": "rss", "base_url": "https://tourism.example/feed?utm_source=x", "state": "WV"}, None, self.db)
        self.assertFalse(created["is_active"]); self.assertNotIn("utm_source", created["base_url"])

    def test_source_must_be_trusted_before_activation(self):
        source = self.source(is_active=False, is_trusted=False)
        with self.assertRaises(HTTPException): update_source(source.id, {"is_active": True}, None, self.db)
        update_source(source.id, {"is_trusted": True, "is_active": True}, None, self.db)
        self.db.refresh(source); self.assertTrue(source.is_active)
        update_source(source.id, {"is_trusted": False}, None, self.db)
        self.db.refresh(source); self.assertFalse(source.is_active)

    @patch("app.routes.event_discovery.scan_source")
    def test_scheduled_discovery_scans_only_trusted_active_sources(self, scan):
        trusted = self.source(name="Trusted", is_active=True, is_trusted=True)
        self.source(name="Untrusted", base_url="https://other.example/events", is_active=True, is_trusted=False)
        scan.return_value = type("Scan", (), {"status": "success", "candidates_created": 1, "candidates_updated": 0})()
        result = run_discovery(None, "", 20, None, self.db)
        self.assertEqual(result["sources_scanned"], 1)
        self.assertEqual(scan.call_args.args[1].id, trusted.id)

    def test_confidence_is_transparent(self):
        score, reasons = score_candidate(self.item(), self.source())
        self.assertGreaterEqual(score, 75); self.assertIn("structured Event metadata", reasons); self.assertIn("exact date", reasons)

    def test_territory_past_and_ambiguous_filters(self):
        self.assertEqual(candidate_status(self.item(state="OH")), "ignored")
        self.assertEqual(candidate_status(self.item(start_date=date.today() - timedelta(days=2), end_date=date.today() - timedelta(days=1))), "ignored")
        self.assertEqual(candidate_status(self.item(start_date=None, end_date=None)), "needs_review")

    def test_hatfield_mccoy_national_trailfest_schedule(self):
        source = self.source(base_url="https://www.nationaltrailfest.com/", state="WV", organizer_name="National TrailFest")
        items = official_html_items("<h2>October 8-10, 2026</h2>", source)
        self.assertEqual([(item["title"], item["start_date"], item["end_date"], item["city"]) for item in items], [("National TrailFest", date(2026, 10, 8), date(2026, 10, 10), "Gilbert")])
        self.assertEqual((items[0]["latitude"], items[0]["longitude"]), (37.6108224, -81.8614230))
        self.assertEqual(candidate_status(items[0]), "new")

    def test_nrra_official_event_pages(self):
        source = self.source(base_url="https://nationalrockracing.com/pages/pretty-place", state="TN", organizer_name="National Rock Racing Association")
        html = '<h2 class="h1 hero__title"><div>Tennessee Topple<br>NRRA 6</div></h2><div class="hero__subtitle"><div>July 31-August 1, 2026</div></div></div>'
        items = official_html_items(html, source)
        self.assertEqual((items[0]["title"], items[0]["start_date"], items[0]["end_date"], items[0]["city"]), ("Tennessee Topple Off-Road Race", date(2026, 7, 31), date(2026, 8, 1), "Belvidere"))
        self.assertEqual((items[0]["latitude"], items[0]["longitude"]), (35.1292509, -86.1866532))
        self.assertEqual(candidate_status(items[0]), "new")

    def test_doe_mountain_jsonld_decodes_night_ride(self):
        source = self.source(base_url="https://dmra.gov/events/", state="TN", organizer_name="Doe Mountain Recreation Area")
        html = '<script type="application/ld+json">[{"@type":"Event","name":"Spooktacular &#038; Night Ride","url":"https://dmra.gov/event/night-ride/","startDate":"2026-10-31","location":{"@type":"Place","name":"DMRA Adventure Center","address":{"addressLocality":"Mountain City","streetAddress":"1203 Harbin Hill Rd"}}}]</script>'
        item = jsonld_items(html, source)[0]
        self.assertEqual(item["title"], "Spooktacular & Night Ride")
        self.assertEqual(candidate_status(item), "new")

    def test_duplicate_detection(self):
        event = Event(title="Harlan UTV Trail Ride", slug="harlan-ride", organizer="Club", description="Ride", state="KY", city="Harlan", start_date=self.item()["start_date"], end_date=self.item()["end_date"], category="group_ride", status="approved")
        self.db.add(event); self.db.commit(); duplicate, reasons = find_duplicate(self.db, self.item())
        self.assertEqual(duplicate.id, event.id); self.assertTrue(reasons["date_overlap"])

    def test_change_and_cancellation_detection(self):
        item = self.item(); event = Event(title=item["title"], slug="change", organizer="Club", description="Ride", state="KY", city="Harlan", venue="Old Venue", start_date=item["start_date"], end_date=item["end_date"], category="group_ride", status="approved")
        changes = event_changes(event, self.item(venue="New Venue", description="This ride has been canceled."))
        self.assertEqual(changes["venue"]["new"], "New Venue"); self.assertEqual(changes["event_status"]["new"], "canceled_or_postponed")

    @patch("app.services.event_discovery.fetch_source")
    def test_same_source_item_is_idempotent(self, fetch):
        source = self.source(); discovered = self.item(external_id="official-1", source_url="https://example.gov/event/1", official_url="https://example.gov/event/1", raw_metadata={})
        fetch.return_value = ([discovered], 200)
        first = scan_source(self.db, source); second = scan_source(self.db, source)
        self.assertEqual(first.candidates_created, 1); self.assertEqual(second.candidates_updated, 1); self.assertEqual(self.db.query(EventCandidate).count(), 1)

    @patch("app.services.event_discovery.fetch_source")
    def test_source_failures_backoff_and_unlock(self, fetch):
        source = self.source(); fetch.side_effect = TimeoutError("timed out")
        for _ in range(5): scan_source(self.db, source)
        self.assertFalse(source.is_active); self.assertEqual(source.consecutive_failures, 5); self.assertIsNone(source.scan_locked_at)

    def test_scan_lock(self):
        source = self.source(); from datetime import datetime
        source.scan_locked_at = datetime.utcnow(); self.db.commit()
        with self.assertRaises(ValueError): scan_source(self.db, source)

    def test_candidate_is_never_public_and_approval_is_explicit(self):
        source = self.source(); item = self.item(); score, reasons = score_candidate(item, source)
        candidate = EventCandidate(source_id=source.id, external_id="candidate", source_url="https://example.gov/event", title=item["title"], state="KY", city="Harlan", start_date=item["start_date"], end_date=item["end_date"], confidence_score=score, confidence_reasons=reasons)
        self.db.add(candidate); self.db.commit()
        self.assertEqual(self.db.query(Event).count(), 0)
        result = review_candidate(candidate.id, {"action": "approve", "is_verified": False}, None, self.db)
        self.assertEqual(self.db.query(Event).count(), 1); self.assertFalse(result["is_verified"])

    def test_merge_updates_existing_event(self):
        source = self.source(); event = Event(title="Old Title", slug="old", organizer="Club", description="Old", state="KY", city="Harlan", start_date=date.today()+timedelta(days=10), end_date=date.today()+timedelta(days=10), category="group_ride", status="approved")
        self.db.add(event); self.db.flush(); candidate = EventCandidate(source_id=source.id, external_id="update", source_url="https://example.gov/update", title="Updated UTV Ride", description="New", state="KY", city="Harlan", start_date=date.today()+timedelta(days=11), end_date=date.today()+timedelta(days=11), duplicate_event_id=event.id, status="possible_update")
        self.db.add(candidate); self.db.commit(); review_candidate(candidate.id, {"action": "merge", "event_id": event.id, "fields": ["title", "start_date", "end_date"]}, None, self.db)
        self.db.refresh(event); self.assertEqual(event.title, "Updated UTV Ride"); self.assertFalse(event.is_verified)

    def test_cron_endpoint_requires_admin_dependency(self):
        from app.routes.admin import require_admin
        with self.assertRaises(HTTPException) as error: require_admin("wrong-password")
        self.assertEqual(error.exception.status_code, 401)

if __name__ == "__main__": unittest.main()
