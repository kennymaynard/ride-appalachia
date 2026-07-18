from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

EXPLORE_CATEGORIES = {
    "local_food", "lodging", "waterfalls", "scenic_overlooks", "elk_viewing", "fishing", "hiking", "swimming",
    "historic_sites", "museums", "local_shops", "country_stores", "ice_cream_desserts", "family_activities",
    "campgrounds", "parks", "events", "fuel", "repairs_recovery", "hospitals_urgent_care",
}


class ExploreDestinationInput(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    category: str
    short_description: str = Field(min_length=10, max_length=360)
    full_description: str = Field(default="", max_length=10000)
    address: str = Field(default="", max_length=240)
    city: str = Field(default="", max_length=120)
    county: str = Field(default="", max_length=120)
    state: str = Field(default="", max_length=2)
    postal_code: str = Field(default="", max_length=20)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    phone: str = Field(default="", max_length=40)
    website: str = Field(default="", max_length=1000)
    email: str = Field(default="", max_length=180)
    hours_json: dict[str, Any] = {}
    admission_cost: str = Field(default="", max_length=120)
    parking_info: str = Field(default="", max_length=4000)
    accessibility_info: str = Field(default="", max_length=4000)
    pet_policy: str = Field(default="", max_length=4000)
    seasonal_info: str = Field(default="", max_length=4000)
    family_friendly: bool = False
    veteran_owned: bool = False
    free_admission: bool = False
    indoor: bool = False
    outdoor: bool = False
    image_url: str = Field(default="", max_length=1000)
    nearby_trail_slugs: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("category")
    @classmethod
    def valid_category(cls, value: str) -> str:
        if value not in EXPLORE_CATEGORIES: raise ValueError("Unknown Explore category")
        return value

    @field_validator("state")
    @classmethod
    def normalize_state(cls, value: str) -> str: return value.strip().upper()

    @field_validator("website", "image_url")
    @classmethod
    def valid_optional_url(cls, value: str) -> str:
        value = value.strip()
        if value: HttpUrl(value)
        return value


class ExploreDestinationRead(ExploreDestinationInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    featured: bool
    verified: bool
    status: str
    image_urls: list[str] = []
    created_at: datetime
    updated_at: datetime
    distance_miles: float | None = None
    claimed_by_business_id: int | None = None


class ExploreReportCreate(BaseModel):
    reason: str = Field(default="incorrect_information", max_length=80)
    details: str = Field(min_length=10, max_length=4000)
    reporter_email: str = Field(default="", max_length=180)


class ExplorePhotoCreate(BaseModel):
    image_url: str = Field(min_length=10, max_length=1000)
    submitter_name: str = Field(default="", max_length=160)
    submitter_email: str = Field(default="", max_length=180)

    @field_validator("image_url")
    @classmethod
    def valid_url(cls, value: str) -> str:
        HttpUrl(value); return value


class ExplorePlanRequest(BaseModel):
    days: int = Field(default=2, ge=1, le=7)
    family_trip: bool = True
    lodging_needed: bool = True
    food_needed: bool = True
    indoor: bool = False
    outdoor: bool = True
    destination_ids: list[int] = Field(default_factory=list, max_length=60)


class ExplorePlanStop(BaseModel):
    destination_id: int
    day: int = Field(ge=1, le=7)
    notes: str = Field(default="", max_length=240)


class ExplorePlanRead(BaseModel):
    source: str
    stops: list[ExplorePlanStop]
    message: str = ""
