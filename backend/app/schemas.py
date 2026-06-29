from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


BUSINESS_CATEGORIES = {"lodging", "food", "rentals", "repairs", "fuel"}
SUBSCRIPTION_TIERS = {
    "local_business",
    "lodging_partner",
    "veteran_owned",
}
LISTING_STATUSES = {"pending", "approved", "needs_changes", "rejected", "unpublished"}
LEAD_TYPES = {"launch_access", "business_availability"}
LEAD_STATUSES = {"new", "contacted", "converted", "closed"}
RIDER_ACTIVITIES = {"ohv", "hiking", "run", "walk"}
RIDER_PROGRESS_STATUSES = {"saved", "completed"}
VETERAN_VERIFICATION_STATUSES = {"unverified", "pending", "verified", "rejected"}
TRAIL_TALK_CATEGORIES = {
    "group_ride",
    "trail_conditions",
    "events",
    "buy_sell_trade",
    "help_repairs",
    "lodging_food",
    "heroes_rides",
}
BOOKABLE_LISTING_TYPES = {"lodging", "camping", "rental", "guide", "event", "service"}
BOOKING_STATUSES = {"requested", "approved", "checkout_sent", "paid", "declined", "canceled"}
PAYOUT_TIMINGS = {"after_check_in", "on_payment"}
PAYMENT_TIMINGS = {"at_booking", "after_cancellation_period"}


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
    campaign_type: str = "visibility_campaign"
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


class ListingCalendarBase(BaseModel):
    provider: str = "iCal"
    ical_url: str
    is_active: bool = True


class ListingCalendarCreate(ListingCalendarBase):
    pass


class ListingCalendarRead(ListingCalendarBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    listing_id: int
    last_synced_at: Optional[datetime] = None
    last_sync_status: str = "Not synced yet"


class BookableListingBase(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    listing_type: str = "lodging"
    description: str = ""
    location: str = ""
    photo_url: str = ""
    nightly_rate_cents: int = 0
    cleaning_fee_cents: int = 0
    max_guests: int = 1
    cancellation_window_hours: int = 72
    cancellation_policy: str = (
        "Guests may request cancellation before check-in. The business reviews each request under its posted policy."
    )
    refund_policy: str = (
        "Approved cancellations may receive a full or partial refund based on timing, property rules, and any non-refundable fees."
    )
    payout_timing: str = "after_check_in"
    payment_timing: str = "at_booking"
    is_active: bool = True

    @field_validator("listing_type")
    @classmethod
    def validate_listing_type(cls, value: str) -> str:
        if value not in BOOKABLE_LISTING_TYPES:
            raise ValueError("Unknown bookable listing type")
        return value

    @field_validator("payout_timing")
    @classmethod
    def validate_payout_timing(cls, value: str) -> str:
        if value not in PAYOUT_TIMINGS:
            raise ValueError("Unknown payout timing")
        return value

    @field_validator("payment_timing")
    @classmethod
    def validate_payment_timing(cls, value: str) -> str:
        if value not in PAYMENT_TIMINGS:
            raise ValueError("Unknown payment timing")
        return value


class BookableListingCreate(BookableListingBase):
    pass


class BookableListingUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=180)
    listing_type: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    nightly_rate_cents: Optional[int] = None
    cleaning_fee_cents: Optional[int] = None
    max_guests: Optional[int] = None
    cancellation_window_hours: Optional[int] = None
    cancellation_policy: Optional[str] = None
    refund_policy: Optional[str] = None
    payout_timing: Optional[str] = None
    payment_timing: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("listing_type")
    @classmethod
    def validate_optional_listing_type(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in BOOKABLE_LISTING_TYPES:
            raise ValueError("Unknown bookable listing type")
        return value

    @field_validator("payout_timing")
    @classmethod
    def validate_optional_payout_timing(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in PAYOUT_TIMINGS:
            raise ValueError("Unknown payout timing")
        return value

    @field_validator("payment_timing")
    @classmethod
    def validate_optional_payment_timing(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in PAYMENT_TIMINGS:
            raise ValueError("Unknown payment timing")
        return value


class BookableListingRead(BookableListingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_id: int
    calendars: list[ListingCalendarRead] = []


class BookingRequestCreate(BaseModel):
    listing_id: int
    customer_name: str = Field(min_length=2, max_length=120)
    customer_email: str = Field(min_length=5, max_length=180)
    customer_phone: str = ""
    start_date: str
    end_date: str
    guests: int = 1
    message: str = ""


class BookingRead(BookingRequestCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_id: int
    rider_id: Optional[int] = None
    status: str = "requested"
    subtotal_cents: int = 0
    platform_fee_cents: int = 0
    total_cents: int = 0
    stripe_checkout_session_id: str = ""
    cancellation_requested_at: Optional[datetime] = None
    cancellation_reason: str = ""
    cancellation_decision_at: Optional[datetime] = None
    cancellation_decision_note: str = ""
    refund_status: str = "not_requested"
    refunded_cents: int = 0
    stripe_refund_id: str = ""
    refund_failure_reason: str = ""
    payout_release_date: str = ""


class BookingDetailRead(BookingRead):
    business_name: str = ""
    listing_title: str = ""
    cancellation_window_hours: int = 72
    cancellation_policy: str = ""
    refund_policy: str = ""
    payment_timing: str = "at_booking"


class BookingLookupRequest(BaseModel):
    booking_id: int
    customer_email: str = Field(min_length=5, max_length=180)


class BookingCancellationRequest(BaseModel):
    customer_email: str = Field(min_length=5, max_length=180)
    reason: str = ""


class BookingCancellationDecision(BaseModel):
    approved: bool
    note: str = ""


class BookingCheckoutRequest(BaseModel):
    booking_ids: list[int]


class StripeConnectOnboardingRead(BaseModel):
    onboarding_url: str
    stripe_connect_account_id: str


class BookingTransferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    business_id: int
    stripe_transfer_id: str = ""
    amount_cents: int = 0
    status: str = "pending"
    release_date: str = ""


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


class TrailTalkPostBase(BaseModel):
    rider_name: str = Field(min_length=2, max_length=120)
    category: str
    area_slug: str = ""
    ride_date: str = ""
    title: str = Field(min_length=4, max_length=180)
    message: str = Field(min_length=10)

    @field_validator("category")
    @classmethod
    def validate_trail_talk_category(cls, value: str) -> str:
        if value not in TRAIL_TALK_CATEGORIES:
            raise ValueError("Unknown Trail Talk category")
        return value


class TrailTalkPostCreate(TrailTalkPostBase):
    email: str = ""


class TrailTalkPostRead(TrailTalkPostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str = "pending"


class TrailTalkPostAdminRead(TrailTalkPostRead):
    email: str = ""


class TrailTalkModerationUpdate(BaseModel):
    status: str


class BusinessBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=180)
    category: str
    description: str
    phone: str = Field(min_length=7, max_length=40)
    location: str = Field(min_length=2, max_length=180)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
    stripe_connect_account_id: str = ""
    stripe_connect_onboarding_complete: bool = False
    view_clicks: int
    action_clicks: int
    deals: list[DealRead] = []
    campaigns: list[CampaignRead] = []


class BusinessDashboardRead(BusinessRead):
    owner_email: str = ""
    owner_access_token: str = ""
    service_requests: list[LodgingServiceRequestRead] = []
    bookable_listings: list[BookableListingRead] = []
    bookings: list[BookingRead] = []


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
    tier: str = ""


class BusinessLoginRequest(BaseModel):
    owner_email: str


class BusinessLoginRead(BaseModel):
    access_url: str = ""
    email_sent: bool = False
    message: str


class RiderLoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=180)
    display_name: str = ""
    phone: str = ""


class RiderLoginRead(BaseModel):
    access_url: str = ""
    access_token: str = ""
    message: str


class RiderBadgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    badge_key: str
    label: str
    category: str
    earned_at: datetime


class RiderTrailProgressCreate(BaseModel):
    area_slug: str = Field(min_length=2, max_length=120)
    trail_name: str = Field(min_length=2, max_length=180)
    activity: str = "ohv"
    status: str = "completed"
    source: str = "manual"
    is_group_ride: bool = False
    distance_miles: Optional[float] = None

    @field_validator("activity")
    @classmethod
    def validate_rider_activity(cls, value: str) -> str:
        if value not in RIDER_ACTIVITIES:
            raise ValueError("Unknown rider activity")
        return value

    @field_validator("status")
    @classmethod
    def validate_rider_progress_status(cls, value: str) -> str:
        if value not in RIDER_PROGRESS_STATUSES:
            raise ValueError("Unknown rider progress status")
        return value


class RiderTrailProgressRead(RiderTrailProgressCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rider_id: int
    completed_at: Optional[datetime] = None


class PartnerVisitCreate(BaseModel):
    business_id: int
    discount_code: str = ""
    source: str = "manual"


class PartnerVisitRead(PartnerVisitCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rider_id: int
    checked_in_at: datetime


class VeteranVerificationRequest(BaseModel):
    document_name: str = ""
    notes: str = ""


class RiderAlertPreferencesUpdate(BaseModel):
    phone: Optional[str] = None
    alert_phone_opt_in: Optional[bool] = None
    alert_email_opt_in: Optional[bool] = None
    storm_alerts_enabled: Optional[bool] = None
    trail_alerts_enabled: Optional[bool] = None


class RiderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    email: str
    phone: str = ""
    veteran_verification_status: str = "unverified"
    veteran_verification_notes: str = ""
    veteran_document_name: str = ""
    alert_phone_opt_in: bool = False
    alert_email_opt_in: bool = True
    storm_alerts_enabled: bool = True
    trail_alerts_enabled: bool = True
    access_token: str = ""
    badges: list[RiderBadgeRead] = []
    progress: list[RiderTrailProgressRead] = []


class RiderRideCardRead(BaseModel):
    rider: RiderRead
    completed_trails: int
    completed_hikes: int
    completed_runs: int
    completed_walks: int
    partner_visits: int
    badges: list[RiderBadgeRead]


class BusinessReviewCreate(BaseModel):
    business_id: int
    rider_name: str = Field(min_length=2, max_length=120)
    rating: int
    comment: str = Field(min_length=4)


class BusinessReviewRead(BusinessReviewCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rider_id: Optional[int] = None
    status: str = "pending"


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
