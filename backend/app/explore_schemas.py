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
    amenities_json: list[str] = []
    specials_json: list[str] = []
    events_json: list[str] = []


class ExploreOwnerUpdateCreate(BaseModel):
    description: str = Field(default="", max_length=10000)
    phone: str = Field(default="", max_length=40)
    website: str = Field(default="", max_length=1000)
    hours_json: dict[str, Any] = {}
    amenities: list[str] = Field(default_factory=list, max_length=50)
    photo_urls: list[str] = Field(default_factory=list, max_length=20)
    specials: list[str] = Field(default_factory=list, max_length=20)
    events: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("website")
    @classmethod
    def valid_website(cls, value: str) -> str:
        value = value.strip()
        if value: HttpUrl(value)
        return value

    @field_validator("photo_urls")
    @classmethod
    def valid_photo_urls(cls, values: list[str]) -> list[str]:
        for value in values: HttpUrl(value)
        return values


class ExploreOwnerUpdateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; destination_id: int; business_id: int; proposed_json: dict[str, Any]; status: str
    approved_fields_json: list[str] = []; admin_notes: str = ""; created_at: datetime; reviewed_at: datetime | None = None
    destination_name: str = ""; business_name: str = ""; current_json: dict[str, Any] = {}


class ExploreOwnerUpdateReview(BaseModel):
    action: str
    approved_fields: list[str] = Field(default_factory=list)
    admin_notes: str = Field(default="", max_length=2000)

    @field_validator("action")
    @classmethod
    def valid_action(cls,value:str)->str:
        if value not in {"approve","reject"}: raise ValueError("Action must be approve or reject")
        return value


class ExploreAdminUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    category: str | None = None
    short_description: str | None = Field(default=None, min_length=10, max_length=360)
    full_description: str | None = Field(default=None, max_length=10000)
    address: str | None = Field(default=None, max_length=240)
    city: str | None = Field(default=None, max_length=120)
    county: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=2)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    phone: str | None = Field(default=None, max_length=40)
    website: str | None = Field(default=None, max_length=1000)
    status: str | None = None
    verified: bool | None = None
    featured: bool | None = None
    nearby_trail_slugs: list[str] | None = None

    @field_validator("category")
    @classmethod
    def admin_category(cls, value: str | None) -> str | None:
        if value is not None and value not in EXPLORE_CATEGORIES: raise ValueError("Unknown Explore category")
        return value

    @field_validator("status")
    @classmethod
    def admin_status(cls, value: str | None) -> str | None:
        if value is not None and value not in {"pending", "approved", "archived", "rejected"}: raise ValueError("Unknown status")
        return value


class ExploreModerationReview(BaseModel):
    action: str

    @field_validator("action")
    @classmethod
    def moderation_action(cls, value: str) -> str:
        if value not in {"approve", "reject", "resolve"}: raise ValueError("Unknown moderation action")
        return value


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
