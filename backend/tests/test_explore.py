import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.explore_schemas import ExploreDestinationInput
from app.models import ExploreDestination
from app.routes.explore import get_destination, list_destinations, suggest_destination


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


if __name__ == "__main__": unittest.main()
