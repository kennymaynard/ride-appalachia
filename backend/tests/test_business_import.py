import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Business, BusinessClaim
from app.routes.admin import import_businesses, list_businesses, review_business_claim
from app.routes.business import claim_business
from app.schemas import MAX_EMBEDDED_PHOTO_CHARS, BusinessClaimRequest, BusinessClaimReview, BusinessDashboardRead, BusinessImportRequest, BusinessImportScanRequest
from app.services.business_import import category_for, find_duplicate, scan_openstreetmap


class FakeResponse:
    def __enter__(self): return self
    def __exit__(self, *_): return False
    def read(self):
        return b'{"elements":[{"type":"node","id":101,"lat":37.1,"lon":-82.1,"tags":{"name":"Trail Fuel","amenity":"fuel","phone":"6065550101","addr:housenumber":"100","addr:street":"Main Street","addr:city":"Pikeville","addr:state":"KY"}},{"type":"way","id":202,"center":{"lat":37.2,"lon":-82.2},"tags":{"name":"Rider Motel","tourism":"motel","addr:full":"25 Trail Road, Test Area, KY"}},{"type":"node","id":303,"lat":37.3,"lon":-82.3,"tags":{"name":"No Address Cafe","amenity":"cafe"}}]}'


class BusinessImportTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self): self.db.close()

    def test_category_mapping(self):
        self.assertEqual(category_for({"amenity": "restaurant"}), "food")
        self.assertEqual(category_for({"tourism": "camp_site"}), "lodging")
        self.assertEqual(category_for({"shop": "car_repair"}), "repairs")
        self.assertIsNone(category_for({"shop": "clothes"}))

    @patch("app.services.business_import.urlopen", return_value=FakeResponse())
    def test_scan_uses_source_coordinates_and_categories(self, _urlopen):
        rows = scan_openstreetmap(self.db, BusinessImportScanRequest(area_slug="test", area_name="Test Area", latitude=37.0, longitude=-82.0, radius_miles=25))
        self.assertEqual({row.category for row in rows}, {"food", "fuel", "lodging"})
        self.assertEqual(rows[0].source_provider, "openstreetmap")
        self.assertTrue(all(row.latitude and row.longitude for row in rows))
        missing_address = next(row for row in rows if row.name == "No Address Cafe")
        self.assertEqual(missing_address.location, "Address unavailable — near Test Area")

    def test_import_is_approved_unclaimed_and_idempotent(self):
        candidate = {
            "source_provider": "openstreetmap", "source_id": "node/101", "source_url": "https://www.openstreetmap.org/node/101",
            "area_slug": "test", "area_name": "Test Area", "name": "Trail Fuel", "category": "fuel", "description": "Imported",
            "phone": "6065550101", "location": "Pikeville, KY", "latitude": 37.1, "longitude": -82.1, "website_url": "", "distance_miles": 2.0,
        }
        first = import_businesses(BusinessImportRequest(candidates=[candidate]), None, self.db)
        second = import_businesses(BusinessImportRequest(candidates=[candidate]), None, self.db)
        business = self.db.query(Business).one()
        self.assertEqual(first.imported, 1); self.assertEqual(second.skipped, 1)
        self.assertTrue(business.is_approved); self.assertEqual(business.listing_status, "approved")
        self.assertEqual(business.owner_email, ""); self.assertEqual(business.source_id, "node/101")

    def test_admin_businesses_survive_incomplete_imported_rows(self):
        self.db.add(Business(name="", slug="", category="unexpected", description="", phone="", location="", latitude=37.1, longitude=-82.1, photo_url="", subscription_tier="legacy"))
        self.db.add(Business(name="Deal Marker", slug="deal-marker", category="deals", description="Deal", phone="Not listed", location="Town", latitude=37.2, longitude=-82.2, photo_url=""))
        self.db.commit()
        rows = list_businesses(None, False, self.db)
        validated = [BusinessDashboardRead.model_validate(row) for row in rows]
        self.assertEqual(len(validated), 2)
        by_name = {row.name: row for row in validated}
        self.assertEqual(by_name["Deal Marker"].category, "deals")
        self.assertEqual(by_name["Unnamed business"].category, "services")
        self.assertEqual(by_name["Unnamed business"].phone, "Not listed")
        self.assertEqual(by_name["Unnamed business"].location, "Address unavailable")

    def test_admin_businesses_survive_oversized_legacy_photo(self):
        self.db.add(Business(name="Legacy Photo", slug="legacy-photo", category="services", description="Legacy listing", phone="6065550100", location="Town", photo_url="data:image/jpeg;base64," + ("a" * MAX_EMBEDDED_PHOTO_CHARS)))
        self.db.commit()

        rows = list_businesses(None, False, self.db)
        row = next(item for item in rows if item["slug"] == "legacy-photo")

        self.assertEqual(row["photo_url"], "")
        BusinessDashboardRead.model_validate(row)

    @patch("app.routes.admin.send_business_login_email")
    def test_claim_requires_admin_proof_review_before_access(self, send_email):
        business = Business(name="Unclaimed", slug="unclaimed", category="services", description="Imported", phone="Not listed", location="Town", latitude=37.1, longitude=-82.1, photo_url="", is_approved=True, listing_status="approved")
        self.db.add(business); self.db.commit()
        claim = claim_business(business.id, BusinessClaimRequest(claimant_name="Taylor Owner", claimant_email="owner@example.com", claimant_phone="6065550101", claimant_role="Owner", proof_url="https://example.com/proof", proof_notes="State registration matches my identity.", subscription_tier="local_business"), self.db)
        self.db.refresh(business)
        self.assertEqual(claim.status, "pending"); self.assertEqual(business.owner_email, ""); self.assertEqual(business.owner_access_token, "")
        reviewed = review_business_claim(claim.id, BusinessClaimReview(action="approve", admin_notes="Registration verified"), None, self.db)
        self.db.refresh(business)
        self.assertEqual(reviewed.status, "approved"); self.assertEqual(business.owner_email, "owner@example.com"); self.assertTrue(business.owner_access_token); send_email.assert_called_once()

    def test_duplicate_by_nearby_normalized_name(self):
        existing = Business(name="Trail Fuel!", slug="trail-fuel", category="fuel", description="Fuel", phone="6065550101", location="Town", latitude=37.1, longitude=-82.1, photo_url="")
        self.db.add(existing); self.db.commit()
        duplicate_id, reason = find_duplicate(self.db, "node/999", "Trail Fuel", 37.1001, -82.1001)
        self.assertEqual(duplicate_id, existing.id); self.assertIn("normalized name", reason)


if __name__ == "__main__": unittest.main()
