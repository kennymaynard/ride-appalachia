import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Business
from app.routes.listings import list_marketplace
from app.services.business_visibility import imported_business_is_search_only


class BusinessVisibilityClassifierTests(unittest.TestCase):
    def test_imported_chain_restaurants_are_search_only(self) -> None:
        self.assertTrue(imported_business_is_search_only("McDonald's", "food", "openstreetmap"))
        self.assertTrue(imported_business_is_search_only("  TACO BELL  ", "food", "openstreetmap"))

    def test_local_and_protected_categories_remain_normally_visible(self) -> None:
        self.assertFalse(imported_business_is_search_only("Mountain Mama's Kitchen", "food", "openstreetmap"))
        self.assertFalse(imported_business_is_search_only("McDonald's", "food", None))
        self.assertFalse(imported_business_is_search_only("McDonald's", "services", "openstreetmap"))


class BusinessSearchVisibilityTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        common = {
            "description": "Business listing",
            "phone": "6065550100",
            "location": "Pikeville, KY",
            "latitude": 37.5,
            "longitude": -82.5,
            "photo_url": "",
            "is_approved": True,
            "listing_status": "approved",
        }
        self.db.add(Business(name="McDonald's", slug="mcdonalds", category="food", is_search_only=True, **common))
        self.db.add(Business(name="Mountain Cafe", slug="mountain-cafe", category="food", **common))
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()

    def listings(self, query: str | None = None) -> list[dict]:
        return list_marketplace(category="all", q=query, limit=500, db=self.db)

    def test_search_only_chain_is_hidden_from_normal_loads(self) -> None:
        self.assertEqual([row["name"] for row in self.listings()], ["Mountain Cafe"])

    def test_search_only_chain_requires_a_name_match(self) -> None:
        self.assertEqual([row["name"] for row in self.listings("McDonald's")], ["McDonald's"])
        self.assertEqual([row["name"] for row in self.listings("Pikeville")], ["Mountain Cafe"])
