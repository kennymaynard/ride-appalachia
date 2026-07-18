import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.explore_schemas import ExploreDestinationInput, ExploreOwnerUpdateCreate, ExploreOwnerUpdateReview
from app.models import Business, ExploreDestination, ExploreDestinationUpdateRequest
from app.routes.admin import review_explore_update_request
from app.routes.business import submit_owner_explore_update
from app.routes.explore import create_explore_claim_target, create_explore_plan, get_destination, list_destinations, suggest_destination
from app.services.business_claims import link_approved_explore_destination
from app.explore_schemas import ExplorePlanRequest


class ExploreTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine); self.db = sessionmaker(bind=engine)()

    def tearDown(self): self.db.close()

    def test_pending_suggestion_is_not_public(self):
        result = suggest_destination(ExploreDestinationInput(name="Hidden Falls", category="waterfalls", short_description="A family waterfall near the trail.", city="Inez", state="ky", outdoor=True), self.db)
        self.assertEqual(result["status"], "pending")
        self.assertEqual(list_destinations(limit=100, db=self.db), [])

    def test_approved_destination_filters_and_detail(self):
        self.db.add(ExploreDestination(name="Heritage Museum", slug="heritage-museum", category="museums", short_description="Local history and exhibits.", city="Inez", county="Martin", state="KY", family_friendly=True, indoor=True, status="approved"))
        self.db.commit()
        rows = list_destinations(state="KY", category="museums", family_friendly=True, limit=100, db=self.db)
        self.assertEqual([row["slug"] for row in rows], ["heritage-museum"])
        self.assertEqual(get_destination("heritage-museum", self.db)["name"], "Heritage Museum")

    def test_ai_plan_falls_back_and_stays_grounded(self):
        row = ExploreDestination(name="Trail Cafe", slug="trail-cafe", category="local_food", short_description="Local food near the trail.", city="Inez", state="KY", status="approved")
        self.db.add(row); self.db.commit()
        result = create_explore_plan(ExplorePlanRequest(days=2, destination_ids=[row.id, 999999]), self.db)
        self.assertEqual(result["source"], "standard")
        self.assertEqual([stop["destination_id"] for stop in result["stops"]], [row.id])

    def test_nearby_destinations_use_real_distance_and_featured_priority(self):
        near = ExploreDestination(name="Nearby Museum", slug="nearby-museum", category="museums", short_description="A nearby destination for riders.", latitude=37.87, longitude=-82.54, status="approved")
        featured = ExploreDestination(name="Featured Lodge", slug="featured-lodge", category="lodging", short_description="A featured destination for riders.", latitude=37.95, longitude=-82.54, featured=True, status="approved")
        far = ExploreDestination(name="Faraway Park", slug="faraway-park", category="parks", short_description="A destination outside the radius.", latitude=39.0, longitude=-82.54, status="approved")
        self.db.add_all([near, featured, far]); self.db.commit()
        rows = list_destinations(latitude=37.8662, longitude=-82.5388, distance=25, limit=100, db=self.db)
        self.assertEqual([row["slug"] for row in rows], ["featured-lodge", "nearby-museum"])
        self.assertTrue(all(row["distance_miles"] <= 25 for row in rows))

    def test_claimable_destination_reuses_hidden_business_and_links_only_after_approval(self):
        destination = ExploreDestination(name="Heritage Cafe", slug="heritage-cafe", category="local_food", short_description="A local cafe for trail visitors.", city="Inez", state="KY", status="approved")
        self.db.add(destination); self.db.commit()
        first = create_explore_claim_target(destination.slug, self.db)
        second = create_explore_claim_target(destination.slug, self.db)
        self.assertEqual(first["business_id"], second["business_id"])
        business = self.db.get(Business, first["business_id"])
        self.assertTrue(business.is_search_only); self.assertFalse(bool(destination.claimed_by_business_id))
        link_approved_explore_destination(self.db, business); self.db.commit(); self.db.refresh(destination)
        self.assertEqual(destination.claimed_by_business_id, business.id)

    def test_claimed_owner_updates_publish_only_admin_selected_fields(self):
        business = Business(
            name="Heritage Lodge", slug="heritage-lodge", category="lodging",
            description="Original business description", phone="606-555-0100",
            location="Inez, KY", photo_url="https://example.com/original.jpg",
            website_url="https://example.com", owner_access_token="owner-token",
            source_provider="explore", is_approved=True, listing_status="approved",
        )
        self.db.add(business); self.db.flush()
        destination = ExploreDestination(
            name="Heritage Lodge", slug="heritage-lodge-explore", category="lodging",
            short_description="A local lodge for trail visitors.", full_description="Original destination description",
            phone="606-555-0100", website="https://example.com", city="Inez", state="KY",
            status="approved", claimed_by_business_id=business.id,
        )
        self.db.add(destination); self.db.commit()

        request = submit_owner_explore_update(
            business.id,
            ExploreOwnerUpdateCreate(
                description="Verified new description", phone="606-555-0199",
                website="https://heritagelodge.example", amenities=["Trailer parking", "Breakfast"],
                specials=["Rider discount"], events=["Fall trail weekend"],
            ),
            business=business,
            db=self.db,
        )
        self.db.refresh(destination)
        self.assertEqual(destination.full_description, "Original destination description")
        self.assertEqual(request.status, "pending")

        review_explore_update_request(
            request.id,
            ExploreOwnerUpdateReview(action="approve", approved_fields=["description", "amenities", "specials"], admin_notes="Verified by admin."),
            None,
            self.db,
        )
        self.db.refresh(destination); self.db.refresh(business)
        self.assertEqual(destination.full_description, "Verified new description")
        self.assertEqual(business.description, "Verified new description")
        self.assertEqual(destination.amenities_json, ["Trailer parking", "Breakfast"])
        self.assertEqual(destination.specials_json, ["Rider discount"])
        self.assertEqual(destination.phone, "606-555-0100")
        self.assertEqual(destination.events_json, [])
        self.assertEqual(self.db.get(ExploreDestinationUpdateRequest, request.id).approved_fields_json, ["description", "amenities", "specials"])


if __name__ == "__main__": unittest.main()
