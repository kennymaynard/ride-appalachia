from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


BUSINESS_CATEGORIES = {"lodging", "food", "rentals", "repairs", "fuel", "services"}
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
EVENT_STATES = {"KY", "WV", "VA", "TN", "NC"}
EVENT_STATUSES = {"pending", "approved", "rejected", "expired", "unpublished"}
EVENT_BUSINESS_CATEGORIES = {"lodging", "food", "fuel", "rentals", "repairs", "services"}
BOOKABLE_LISTING_TYPES = {"lodging", "camping", "rental", "guide", "event", "service"}
BOOKING_STATUSES = {"requested", "approved", "checkout_sent", "paid", "declined", "canceled"}
PAYOUT_TIMINGS = {"after_check_in", "on_payment"}
PAYMENT_TIMINGS = {"at_booking", "after_cancellation_period"}
REFUND_MODES = {"full", "minus_cleaning_fee", "half", "none", "custom"}
STORE_PRODUCT_IDS = {
    "trail-shirt",
    "appalachia-ride-hard-shirt",
    "ride-hard-plan-less-shirt",
    "hero-verified-shirt",
    "appalachia-offroad-tank-top",
    "appalachia-offroad-phone-case",
    "appalachia-offroad-tumbler",
    "trail-hat",
    "appalachia-offroad-garden-flag",
}
MAX_EMBEDDED_PHOTO_CHARS = 3_000_000


def validate_embedded_photo_size(value: Optional[str]) -> Optional[str]:
    if value and value.startswith("data:image/") and len(value) > MAX_EMBEDDED_PHOTO_CHARS:
        raise ValueError("Uploaded image is too large. Use an image under 2 MB or paste a hosted image URL.")
    return value


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
    tax_rate_basis_points: int = 0
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
    tax_rate_basis_points: Optional[int] = None
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
    cleaning_fee_cents: int = 0
    taxes_cents: int = 0
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
    business_address: str = ""
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
    refund_mode: str = "full"
    custom_refund_cents: int = 0

    @field_validator("refund_mode")
    @classmethod
    def validate_refund_mode(cls, value: str) -> str:
        if value not in REFUND_MODES:
            raise ValueError("Unknown refund mode")
        return value


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
    photo_url: str = ""
    photo_caption: str = ""


class TrailReviewCreate(TrailReviewBase):
    pass


class TrailReviewRead(TrailReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str = "pending"


class TrailReviewModerationUpdate(BaseModel):
    status: str


class TrailConditionReportBase(BaseModel):
    area_slug: str
    trail_name: str = ""
    rider_name: str = ""
    report_type: str
    severity: str = "moderate"
    note: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TrailConditionReportCreate(TrailConditionReportBase):
    pass


class TrailConditionReportRead(TrailConditionReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str = "pending"


class TrailConditionReportModerationUpdate(BaseModel):
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


def normalize_event_url(value: str) -> str:
    value = value.strip()
    if value and not value.startswith(("http://", "https://")):
        return f"https://{value}"
    return value


class EventBase(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    organizer: str = Field(default="", max_length=180)
    description: str = Field(min_length=2)
    state: str
    city: str = Field(min_length=2, max_length=120)
    venue: str = Field(default="", max_length=180)
    address: str = Field(default="", max_length=240)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: date
    end_date: date
    category: str = Field(min_length=2, max_length=80)
    vehicle_types: list[str] = []
    official_url: str = ""
    registration_url: str = ""
    facebook_url: str = ""
    instagram_url: str = ""
    image_url: str = ""
    difficulty: str = "not_listed"
    family_friendly: Optional[bool] = None
    estimated_attendance: Optional[int] = Field(default=None, ge=0)
    trail_area_slug: str = ""

    @field_validator("state")
    @classmethod
    def validate_event_state(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in EVENT_STATES:
            raise ValueError("State must be KY, WV, VA, TN, or NC")
        return normalized

    @field_validator("title", "organizer", "description", "city", "venue", "address", "category")
    @classmethod
    def trim_event_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("vehicle_types")
    @classmethod
    def normalize_vehicle_types(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(item.strip() for item in value if item.strip()))

    @field_validator("official_url", "registration_url", "facebook_url", "instagram_url", "image_url")
    @classmethod
    def normalize_event_urls(cls, value: str) -> str:
        return normalize_event_url(value)

    @model_validator(mode="after")
    def validate_event_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("Event end date cannot precede start date")
        return self


class EventSubmission(EventBase):
    submitted_by_name: str = Field(min_length=2, max_length=120)
    submitted_by_email: str = Field(min_length=5, max_length=180)

    @field_validator("submitted_by_name", "submitted_by_email")
    @classmethod
    def trim_submitter(cls, value: str) -> str:
        return value.strip()


class AdminEventCreate(EventBase):
    verification_source: str = ""
    is_verified: bool = False
    is_featured: bool = False
    status: str = "pending"
    submitted_by_name: str = ""
    submitted_by_email: str = ""
    admin_notes: str = ""

    @field_validator("verification_source")
    @classmethod
    def normalize_verification_source(cls, value: str) -> str:
        return normalize_event_url(value)

    @model_validator(mode="after")
    def validate_verification(self):
        if self.is_verified and not self.verification_source:
            raise ValueError("A verification source is required for verified events")
        if self.status not in EVENT_STATUSES:
            raise ValueError("Unknown event status")
        return self


class AdminEventUpdate(BaseModel):
    title: Optional[str] = None
    organizer: Optional[str] = None
    description: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    venue: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category: Optional[str] = None
    vehicle_types: Optional[list[str]] = None
    official_url: Optional[str] = None
    registration_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    image_url: Optional[str] = None
    difficulty: Optional[str] = None
    family_friendly: Optional[bool] = None
    estimated_attendance: Optional[int] = Field(default=None, ge=0)
    trail_area_slug: Optional[str] = None
    verification_source: Optional[str] = None
    is_verified: Optional[bool] = None
    is_featured: Optional[bool] = None
    status: Optional[str] = None
    submitted_by_name: Optional[str] = None
    submitted_by_email: Optional[str] = None
    admin_notes: Optional[str] = None

    @field_validator("state")
    @classmethod
    def validate_optional_state(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().upper()
        if normalized not in EVENT_STATES:
            raise ValueError("State must be KY, WV, VA, TN, or NC")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_optional_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in EVENT_STATUSES:
            raise ValueError("Unknown event status")
        return value

    @field_validator("official_url", "registration_url", "facebook_url", "instagram_url", "image_url", "verification_source")
    @classmethod
    def normalize_optional_urls(cls, value: Optional[str]) -> Optional[str]:
        return normalize_event_url(value) if value is not None else None


class EventModerationUpdate(BaseModel):
    status: str
    admin_notes: str = ""
    is_verified: Optional[bool] = None
    is_featured: Optional[bool] = None
    verification_source: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_moderation_status(cls, value: str) -> str:
        if value not in EVENT_STATUSES:
            raise ValueError("Unknown event status")
        return value


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    verification_source: str = ""
    verified_at: Optional[datetime] = None
    is_verified: bool = False
    is_featured: bool = False
    status: str
    created_at: datetime
    updated_at: datetime
    last_checked_at: Optional[datetime] = None
    reverify_after: Optional[datetime] = None


class AdminEventRead(EventRead):
    submitted_by_name: str = ""
    submitted_by_email: str = ""
    admin_notes: str = ""


class EventPlannerBusiness(BaseModel):
    id: int
    name: str
    slug: str
    category: str
    description: str
    location: str
    latitude: float
    longitude: float
    website_url: str = ""
    distance_miles: float
    is_featured: bool
    is_sponsored: bool
    has_active_deal: bool


class EventPlannerResult(BaseModel):
    event: EventRead
    radius_miles: int
    businesses: list[EventPlannerBusiness]


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

    @field_validator("photo_url")
    @classmethod
    def validate_photo_url_size(cls, value: str) -> str:
        return validate_embedded_photo_size(value) or ""


class BusinessCreate(BusinessBase):
    owner_email: str = ""
    owner_passcode: str = Field(min_length=4, max_length=32)
    partner_tax_agreement_accepted: bool = False

    @field_validator("owner_passcode")
    @classmethod
    def validate_owner_passcode(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 4:
            raise ValueError("Business password must be at least 4 characters")
        return stripped


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
    owner_passcode: Optional[str] = Field(default=None, min_length=4, max_length=32)

    @field_validator("owner_passcode")
    @classmethod
    def validate_optional_owner_passcode(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if len(stripped) < 4:
            raise ValueError("Business password must be at least 4 characters")
        return stripped

    @field_validator("photo_url")
    @classmethod
    def validate_optional_photo_url_size(cls, value: Optional[str]) -> Optional[str]:
        return validate_embedded_photo_size(value)

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
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    subscription_status: str = "incomplete"
    stripe_customer_id: str = ""
    stripe_subscription_id: str = ""
    stripe_connect_account_id: str = ""
    stripe_connect_charges_enabled: bool = False
    stripe_connect_payouts_enabled: bool = False
    stripe_connect_business_name: str = ""
    stripe_connect_business_email: str = ""
    stripe_connect_onboarding_complete: bool = False
    partner_tax_agreement_accepted: bool = False
    partner_tax_agreement_accepted_at: Optional[datetime] = None
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


class PartnerTaxAgreementRead(BaseModel):
    accepted: bool
    accepted_at: Optional[datetime] = None


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
    owner_passcode: str = Field(min_length=4, max_length=32)

    @field_validator("owner_passcode")
    @classmethod
    def validate_login_passcode(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 4:
            raise ValueError("Business password must be at least 4 characters")
        return stripped


class BusinessLoginRead(BaseModel):
    access_url: str = ""
    email_sent: bool = False
    message: str


class RiderLoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=180)
    password: str = Field(min_length=4, max_length=64)
    display_name: str = ""
    phone: str = ""
    home_location: str = ""
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None

    @field_validator("password")
    @classmethod
    def validate_rider_password(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 4:
            raise ValueError("Rider password must be at least 4 characters")
        return stripped


class RiderLoginRead(BaseModel):
    access_url: str = ""
    access_token: str = ""
    message: str


class RiderPasswordResetRequest(BaseModel):
    email: str = Field(min_length=5, max_length=180)


class RiderPasswordResetConfirm(BaseModel):
    reset_token: str = Field(min_length=12, max_length=120)
    password: str = Field(min_length=4, max_length=64)

    @field_validator("password")
    @classmethod
    def validate_reset_password(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 4:
            raise ValueError("Rider password must be at least 4 characters")
        return stripped


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
    home_location: str = ""
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None
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
    created_at: Optional[datetime] = None


class AdminRiderAccountRead(RiderRead):
    completed_trails: int = 0
    saved_trails: int = 0
    badge_count: int = 0
    partner_visits: int = 0


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


class StoreCheckoutItem(BaseModel):
    product_id: str = Field(min_length=2, max_length=180)
    name: str = Field(min_length=2, max_length=120)
    variant: str = Field(default="", max_length=120)
    dropship_sku: str = Field(default="", max_length=80)
    unit_amount_cents: int = Field(ge=100, le=20000)
    quantity: int = Field(ge=1, le=10)

    @field_validator("product_id")
    @classmethod
    def validate_product_id(cls, value: str) -> str:
        if value not in STORE_PRODUCT_IDS and not value.startswith("printify-"):
            raise ValueError("Unknown store product")
        return value


class StoreCheckoutRequest(BaseModel):
    items: list[StoreCheckoutItem] = Field(min_length=1, max_length=20)
    customer_email: str = Field(default="", max_length=180)


class StoreProductRead(BaseModel):
    id: str
    name: str
    category: str = "Gear"
    description: str = ""
    priceCents: int = 0
    dropshipSku: str = ""
    fulfillment: str = "Printify fulfillment"
    variants: list[str] = []
    variantSkus: dict[str, str] = {}
    badge: str = "Printify"
    visual: str = "shirt"
    imageUrl: str = ""
    imageUrls: list[str] = []
    source: str = "printify"


class PrintifyProductSyncRead(BaseModel):
    configured: bool
    count: int
    products: list[StoreProductRead]
    message: str = ""


class StoreOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stripe_checkout_session_id: str
    stripe_payment_intent_id: str = ""
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    total_cents: int = 0
    currency: str = "usd"
    status: str = "paid"
    items: str = "[]"
    shipping_name: str = ""
    shipping_address: str = "{}"
    printify_submitted: bool = False
    printify_order_id: str = ""
    printify_message: str = ""
    created_at: datetime


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
    email_sent: bool = False
    email_message: str = ""
    sms_sent: bool = False
    sms_message: str = ""


class MarketingLeadStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in LEAD_STATUSES:
            raise ValueError("Unknown lead status")
        return value


class PlannerShareRequest(BaseModel):
    destination: str = "Any area"
    plan: str = Field(min_length=10, max_length=12000)
    email: str = Field(default="", max_length=180)
    phone: str = Field(default="", max_length=40)


class PlannerShareResponse(BaseModel):
    email_sent: bool = False
    email_message: str = ""
    sms_sent: bool = False
    sms_message: str = ""


class AdminSmsTestRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=40)
    audience: str = "rider"


class PageVisitCreate(BaseModel):
    path: str = Field(min_length=1, max_length=240)
    referrer: str = ""


class AdminAnalyticsLocation(BaseModel):
    label: str
    latitude: float
    longitude: float
    riders: int


class AdminAnalyticsPath(BaseModel):
    path: str
    visits: int


class AdminAnalyticsRead(BaseModel):
    rider_count: int
    business_count: int
    page_visits: int
    connected_stripe_accounts: int = 0
    not_connected_stripe_accounts: int = 0
    pending_verification_stripe_accounts: int = 0
    platform_revenue_cents: int = 0
    gross_booking_volume_cents: int = 0
    platform_fee_collected_cents: int = 0
    bookings_count: int = 0
    failed_payments_count: int = 0
    rider_locations: list[AdminAnalyticsLocation]
    top_paths: list[AdminAnalyticsPath]
