import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.explore_schemas import ExploreDestinationInput
from app.models import ExploreDestination
from app.routes.explore import create_explore_plan, get_destination, list_destinations, suggest_destination
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


if __name__ == "__main__": unittest.main()
