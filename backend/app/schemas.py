from typing import Optional

from pydantic import BaseModel, ConfigDict


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
    name: str
    slug: str
    category: str
    description: str
    phone: str
    location: str
    photo_url: str
    website_url: str = ""
    subscription_tier: str = "local_business"


class BusinessCreate(BusinessBase):
    owner_email: str = ""


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    website_url: Optional[str] = None
    subscription_tier: Optional[str] = None
    owner_email: Optional[str] = None


class BusinessRead(BusinessBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_email: str = ""
    owner_access_token: str = ""
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
    service_requests: list[LodgingServiceRequestRead] = []


class BusinessModerationUpdate(BaseModel):
    listing_status: str
    admin_notes: str = ""


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
