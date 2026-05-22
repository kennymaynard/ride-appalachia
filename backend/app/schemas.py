from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


BUSINESS_CATEGORIES = {"lodging", "food", "rentals", "repairs", "fuel"}
SUBSCRIPTION_TIERS = {
    "local_business",
    "lodging_partner",
    "featured_partner",
    "monthly_sponsor",
    "cleaner_partner",
}
LISTING_STATUSES = {"pending", "approved", "needs_changes", "rejected", "unpublished"}
LEAD_TYPES = {"launch_access", "business_availability"}
LEAD_STATUSES = {"new", "contacted", "converted", "closed"}


class DealBase(BaseModel):
    title: str
    code: str = ""
    description: str
    is_active: bool = True


class DealCreate(DealBase):
    business_id: int


class DealUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DealRead(DealBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    claim_clicks: int


class CampaignBase(BaseModel):
    campaign_type: str = "monthly_sponsor"
    title: str
    description: str = ""
    target_area: str = ""
    monthly_budget: int = 149


class CampaignCreate(CampaignBase):
    business_id: int


class CampaignRead(CampaignBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_id: int
    status: str
    impressions: int
    clicks: int


class LodgingServiceRequestBase(BaseModel):
    business_id: int
    service_type: str
    property_name: str = ""
    property_location: str = ""
    contact_name: str = ""
    contact_phone: str = ""
    contact_email: str = ""
    date_needed: str = ""
    notes: str = ""


class LodgingServiceRequestCreate(LodgingServiceRequestBase):
    pass


class LodgingServiceRequestRead(LodgingServiceRequestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str = "new"


class LodgingServiceRequestStatusUpdate(BaseModel):
    status: str


class TrailReviewBase(BaseModel):
    area_slug: str
    rider_name: str
    rating: int
    ride_date: str = ""
    machine: str = ""
    difficulty: str = "Moderate"
    trail_condition: str = ""
    comment: str


class TrailReviewCreate(TrailReviewBase):
    pass


class TrailReviewRead(TrailReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str = "pending"


class TrailReviewModerationUpdate(BaseModel):
    status: str


class BusinessBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=180)
    category: str
    description: str
    phone: str = Field(min_length=7, max_length=40)
    location: str = Field(min_length=2, max_length=180)
    photo_url: str
    website_url: str = ""
    subscription_tier: str = "local_business"

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in BUSINESS_CATEGORIES:
            raise ValueError("Unknown business category")
        return value

    @field_validator("subscription_tier")
    @classmethod
    def validate_subscription_tier(cls, value: str) -> str:
        if value not in SUBSCRIPTION_TIERS:
            raise ValueError("Unknown subscription tier")
        return value


class BusinessCreate(BusinessBase):
    owner_email: str = ""


class BusinessUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    category: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = Field(default=None, min_length=7, max_length=40)
    location: Optional[str] = Field(default=None, min_length=2, max_length=180)
    photo_url: Optional[str] = None
    website_url: Optional[str] = None
    subscription_tier: Optional[str] = None
    owner_email: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_optional_category(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in BUSINESS_CATEGORIES:
            raise ValueError("Unknown business category")
        return value

    @field_validator("subscription_tier")
    @classmethod
    def validate_optional_subscription_tier(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in SUBSCRIPTION_TIERS:
            raise ValueError("Unknown subscription tier")
        return value


class BusinessRead(BusinessBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    listing_status: str = "pending"
    admin_notes: str = ""
    is_approved: bool
    is_featured: bool
    subscription_status: str = "incomplete"
    stripe_customer_id: str = ""
    stripe_subscription_id: str = ""
    view_clicks: int
    action_clicks: int
    deals: list[DealRead] = []
    campaigns: list[CampaignRead] = []


class BusinessDashboardRead(BusinessRead):
    owner_email: str = ""
    owner_access_token: str = ""
    service_requests: list[LodgingServiceRequestRead] = []


class BusinessModerationUpdate(BaseModel):
    listing_status: str
    admin_notes: str = ""

    @field_validator("listing_status")
    @classmethod
    def validate_listing_status(cls, value: str) -> str:
        if value not in LISTING_STATUSES:
            raise ValueError("Unknown listing status")
        return value


class BusinessClaimRequest(BaseModel):
    owner_email: str
    phone_last4: str = Field(min_length=4, max_length=4)
    subscription_tier: str

    @field_validator("subscription_tier")
    @classmethod
    def validate_claim_subscription_tier(cls, value: str) -> str:
        if value not in SUBSCRIPTION_TIERS:
            raise ValueError("Unknown subscription tier")
        return value


class SubscriptionRequest(BaseModel):
    business_id: Optional[int] = None
    tier: str


class StripeWebhookPayload(BaseModel):
    business_id: int
    subscription_status: str = "active"
    stripe_customer_id: str = ""
    stripe_subscription_id: str = ""


class BusinessLoginRequest(BaseModel):
    owner_email: str


class BusinessLoginRead(BaseModel):
    access_url: str = ""
    email_sent: bool = False
    message: str


class CheckoutSessionRead(BaseModel):
    checkout_url: str


class MarketingLeadCreate(BaseModel):
    lead_type: str = "launch_access"
    email: str = Field(min_length=5, max_length=180)
    business_name: str = ""
    category: str = ""
    area: str = ""
    phone: str = ""
    website: str = ""
    source: str = ""
    notes: str = ""

    @field_validator("lead_type")
    @classmethod
    def validate_lead_type(cls, value: str) -> str:
        if value not in LEAD_TYPES:
            raise ValueError("Unknown lead type")
        return value


class MarketingLeadRead(MarketingLeadCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str = "new"


class MarketingLeadStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in LEAD_STATUSES:
            raise ValueError("Unknown lead status")
        return value
