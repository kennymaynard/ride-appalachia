from datetime import date, datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Category(str, Enum):
    lodging = "lodging"
    food = "food"
    rentals = "rentals"
    repairs = "repairs"
    fuel = "fuel"
    services = "services"
    deals = "deals"


class SubscriptionTier(str, Enum):
    local_business = "local_business"
    lodging_partner = "lodging_partner"
    veteran_owned = "veteran_owned"


class ListingStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    needs_changes = "needs_changes"
    rejected = "rejected"
    unpublished = "unpublished"


class SubscriptionStatus(str, Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    incomplete = "incomplete"


class CampaignStatus(str, Enum):
    pending = "pending"
    active = "active"
    paused = "paused"
    expired = "expired"


class ReviewStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TrailTalkStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class EventStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"
    unpublished = "unpublished"


class LeadStatus(str, Enum):
    new = "new"
    contacted = "contacted"
    converted = "converted"
    closed = "closed"


class VeteranVerificationStatus(str, Enum):
    unverified = "unverified"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    description: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(String(40))
    location: Mapped[str] = mapped_column(String(180), index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    photo_url: Mapped[str] = mapped_column(Text)
    website_url: Mapped[str] = mapped_column(Text, default="")
    source_provider: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    source_url: Mapped[str] = mapped_column(Text, default="")
    imported_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    owner_email: Mapped[str] = mapped_column(String(180), default="", index=True)
    owner_access_token: Mapped[str] = mapped_column(String(80), default="", index=True)
    owner_passcode_hash: Mapped[str] = mapped_column(Text, default="")
    listing_status: Mapped[str] = mapped_column(String(40), default=ListingStatus.pending.value, index=True)
    admin_notes: Mapped[str] = mapped_column(Text, default="")
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    subscription_tier: Mapped[str] = mapped_column(String(40), default=SubscriptionTier.local_business.value)
    subscription_status: Mapped[str] = mapped_column(String(40), default=SubscriptionStatus.incomplete.value)
    stripe_customer_id: Mapped[str] = mapped_column(String(180), default="")
    stripe_subscription_id: Mapped[str] = mapped_column(String(180), default="")
    stripe_connect_account_id: Mapped[str] = mapped_column(String(180), default="", index=True)
    stripe_connect_charges_enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    stripe_connect_payouts_enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    stripe_connect_business_name: Mapped[str] = mapped_column(String(180), default="")
    stripe_connect_business_email: Mapped[str] = mapped_column(String(180), default="")
    stripe_connect_onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    partner_tax_agreement_accepted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    partner_tax_agreement_accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    view_clicks: Mapped[int] = mapped_column(Integer, default=0)
    action_clicks: Mapped[int] = mapped_column(Integer, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("source_provider", "source_id", name="uq_business_source"),
    )

    deals: Mapped[list["Deal"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    service_requests: Mapped[list["LodgingServiceRequest"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    reviews: Mapped[list["BusinessReview"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    bookable_listings: Mapped[list["BookableListing"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="business", cascade="all, delete-orphan")


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    title: Mapped[str] = mapped_column(String(160))
    code: Mapped[str] = mapped_column(String(60), default="")
    description: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    claim_clicks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    business: Mapped[Business] = relationship(back_populates="deals")


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    campaign_type: Mapped[str] = mapped_column(String(60), default="visibility_campaign")
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    target_area: Mapped[str] = mapped_column(String(120), default="")
    monthly_budget: Mapped[int] = mapped_column(Integer, default=149)
    status: Mapped[str] = mapped_column(String(40), default=CampaignStatus.pending.value, index=True)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    business: Mapped[Business] = relationship(back_populates="campaigns")


class TrailReview(Base):
    __tablename__ = "trail_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    area_slug: Mapped[str] = mapped_column(String(120), index=True)
    rider_name: Mapped[str] = mapped_column(String(120))
    rating: Mapped[int] = mapped_column(Integer)
    ride_date: Mapped[str] = mapped_column(String(80), default="")
    machine: Mapped[str] = mapped_column(String(120), default="")
    difficulty: Mapped[str] = mapped_column(String(40), default="Moderate")
    trail_condition: Mapped[str] = mapped_column(String(220), default="")
    comment: Mapped[str] = mapped_column(Text)
    photo_url: Mapped[str] = mapped_column(Text, default="")
    photo_caption: Mapped[str] = mapped_column(String(180), default="")
    status: Mapped[str] = mapped_column(String(40), default=ReviewStatus.pending.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TrailConditionReport(Base):
    __tablename__ = "trail_condition_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    area_slug: Mapped[str] = mapped_column(String(120), index=True)
    trail_name: Mapped[str] = mapped_column(String(180), default="")
    rider_name: Mapped[str] = mapped_column(String(120), default="")
    report_type: Mapped[str] = mapped_column(String(60), index=True)
    severity: Mapped[str] = mapped_column(String(40), default="moderate")
    note: Mapped[str] = mapped_column(Text, default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default=ReviewStatus.pending.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TrailTalkPost(Base):
    __tablename__ = "trail_talk_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    rider_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(180), default="")
    category: Mapped[str] = mapped_column(String(60), index=True)
    area_slug: Mapped[str] = mapped_column(String(120), default="", index=True)
    ride_date: Mapped[str] = mapped_column(String(80), default="")
    title: Mapped[str] = mapped_column(String(180))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default=TrailTalkStatus.pending.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_state_start_date", "state", "start_date"),
        Index("ix_events_status_end_date", "status", "end_date"),
        Index("ix_events_verified_featured", "is_verified", "is_featured"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180), index=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    organizer: Mapped[str] = mapped_column(String(180), default="")
    description: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(2), index=True)
    city: Mapped[str] = mapped_column(String(120), index=True)
    venue: Mapped[str] = mapped_column(String(180), default="")
    address: Mapped[str] = mapped_column(String(240), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    vehicle_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    official_url: Mapped[str] = mapped_column(Text, default="")
    registration_url: Mapped[str] = mapped_column(Text, default="")
    facebook_url: Mapped[str] = mapped_column(Text, default="")
    instagram_url: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[str] = mapped_column(String(40), default="not_listed")
    family_friendly: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    estimated_attendance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trail_area_slug: Mapped[str] = mapped_column(String(120), default="", index=True)
    verification_source: Mapped[str] = mapped_column(Text, default="")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default=EventStatus.pending.value, index=True)
    submitted_by_name: Mapped[str] = mapped_column(String(120), default="")
    submitted_by_email: Mapped[str] = mapped_column(String(180), default="", index=True)
    admin_notes: Mapped[str] = mapped_column(Text, default="")
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reverify_after: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RiderSavedEvent(Base):
    __tablename__ = "rider_saved_events"
    __table_args__ = (UniqueConstraint("rider_id", "event_id", name="uq_rider_saved_event"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EventAttendee(Base):
    __tablename__ = "event_attendees"
    __table_args__ = (UniqueConstraint("rider_id", "event_id", name="uq_event_attendee"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EventRidePlan(Base):
    __tablename__ = "event_ride_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    arrival_date: Mapped[date] = mapped_column(Date)
    departure_date: Mapped[date] = mapped_column(Date)
    items: Mapped[list[dict]] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    share_token: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EventReminder(Base):
    __tablename__ = "event_reminders"
    __table_args__ = (UniqueConstraint("rider_id", "event_id", "days_before", name="uq_event_reminder"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    days_before: Mapped[int] = mapped_column(Integer)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EventMetric(Base):
    __tablename__ = "event_metrics"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    business_id: Mapped[int | None] = mapped_column(ForeignKey("businesses.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class EventBusinessPlacement(Base):
    __tablename__ = "event_business_placements"
    __table_args__ = (UniqueConstraint("event_id", "business_id", "placement", name="uq_event_business_placement"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    placement: Mapped[str] = mapped_column(String(40), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    disclosure_label: Mapped[str] = mapped_column(String(80), default="Sponsored partner")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EventDiscussion(Base):
    __tablename__ = "event_discussions"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="comment", index=True)
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EventMedia(Base):
    __tablename__ = "event_media"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    media_type: Mapped[str] = mapped_column(String(20), index=True)
    media_url: Mapped[str] = mapped_column(Text)
    caption: Mapped[str] = mapped_column(String(240), default="")
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EventInvite(Base):
    __tablename__ = "event_invites"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    invite_token: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    recipient_email: Mapped[str] = mapped_column(String(180), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EventSource(Base):
    __tablename__ = "event_sources"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    source_type: Mapped[str] = mapped_column(String(40), index=True)
    base_url: Mapped[str] = mapped_column(Text)
    feed_url: Mapped[str] = mapped_column(Text, default="")
    state: Mapped[str] = mapped_column(String(2), index=True)
    organizer_name: Mapped[str] = mapped_column(String(180), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_trusted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    scan_frequency: Mapped[str] = mapped_column(String(30), default="daily")
    last_scanned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str] = mapped_column(Text, default="")
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    scan_locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EventCandidate(Base):
    __tablename__ = "event_candidates"
    __table_args__ = (UniqueConstraint("source_id", "external_id", name="uq_event_candidate_source_external"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("event_sources.id"), index=True)
    external_id: Mapped[str] = mapped_column(String(240))
    source_url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String(180), index=True)
    organizer: Mapped[str] = mapped_column(String(180), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    state: Mapped[str] = mapped_column(String(2), index=True)
    city: Mapped[str] = mapped_column(String(120), default="")
    venue: Mapped[str] = mapped_column(String(180), default="")
    address: Mapped[str] = mapped_column(String(240), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    category: Mapped[str] = mapped_column(String(80), default="group_ride")
    vehicle_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    official_url: Mapped[str] = mapped_column(Text, default="")
    registration_url: Mapped[str] = mapped_column(Text, default="")
    facebook_url: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(Text, default="")
    raw_text: Mapped[str] = mapped_column(Text, default="")
    raw_metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    confidence_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    confidence_reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    duplicate_event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), nullable=True, index=True)
    change_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    change_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(30), default="new", index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[str] = mapped_column(String(120), default="")
    admin_notes: Mapped[str] = mapped_column(Text, default="")


class EventSourceScan(Base):
    __tablename__ = "event_source_scans"
    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("event_sources.id"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="running", index=True)
    items_seen: Mapped[int] = mapped_column(Integer, default=0)
    candidates_created: Mapped[int] = mapped_column(Integer, default=0)
    candidates_updated: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[list[str]] = mapped_column(JSON, default=list)
    response_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)


class EventVerificationHistory(Base):
    __tablename__ = "event_verification_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    candidate_id: Mapped[int | None] = mapped_column(ForeignKey("event_candidates.id"), nullable=True, index=True)
    source_url: Mapped[str] = mapped_column(Text)
    admin_name: Mapped[str] = mapped_column(String(120), default="admin")
    action: Mapped[str] = mapped_column(String(40), index=True)
    previous_values: Mapped[dict] = mapped_column(JSON, default=dict)
    new_values: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class LodgingServiceRequest(Base):
    __tablename__ = "lodging_service_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    service_type: Mapped[str] = mapped_column(String(80))
    property_name: Mapped[str] = mapped_column(String(160), default="")
    property_location: Mapped[str] = mapped_column(String(180), default="")
    contact_name: Mapped[str] = mapped_column(String(120), default="")
    contact_phone: Mapped[str] = mapped_column(String(40), default="")
    contact_email: Mapped[str] = mapped_column(String(180), default="")
    date_needed: Mapped[str] = mapped_column(String(80), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="new", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    business: Mapped[Business] = relationship(back_populates="service_requests")


class MarketingLead(Base):
    __tablename__ = "marketing_leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_type: Mapped[str] = mapped_column(String(40), default="launch_access", index=True)
    email: Mapped[str] = mapped_column(String(180), index=True)
    business_name: Mapped[str] = mapped_column(String(160), default="")
    category: Mapped[str] = mapped_column(String(80), default="")
    area: Mapped[str] = mapped_column(String(160), default="", index=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    website: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default=LeadStatus.new.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Rider(Base):
    __tablename__ = "riders"

    id: Mapped[int] = mapped_column(primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    password_hash: Mapped[str] = mapped_column(Text, default="")
    home_location: Mapped[str] = mapped_column(String(180), default="", index=True)
    home_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    home_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    access_token: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password_reset_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    veteran_verification_status: Mapped[str] = mapped_column(
        String(40),
        default=VeteranVerificationStatus.unverified.value,
        index=True,
    )
    veteran_verification_notes: Mapped[str] = mapped_column(Text, default="")
    veteran_document_name: Mapped[str] = mapped_column(String(220), default="")
    alert_phone_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    alert_email_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    storm_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    trail_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    badges: Mapped[list["RiderBadge"]] = relationship(back_populates="rider", cascade="all, delete-orphan")
    progress: Mapped[list["RiderTrailProgress"]] = relationship(back_populates="rider", cascade="all, delete-orphan")
    partner_visits: Mapped[list["PartnerVisit"]] = relationship(back_populates="rider", cascade="all, delete-orphan")
    business_reviews: Mapped[list["BusinessReview"]] = relationship(back_populates="rider", cascade="all, delete-orphan")


class RiderTrailProgress(Base):
    __tablename__ = "rider_trail_progress"
    __table_args__ = (
        UniqueConstraint("rider_id", "area_slug", "trail_name", name="uq_rider_trail_progress"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    area_slug: Mapped[str] = mapped_column(String(120), index=True)
    trail_name: Mapped[str] = mapped_column(String(180), index=True)
    activity: Mapped[str] = mapped_column(String(40), default="ohv", index=True)
    status: Mapped[str] = mapped_column(String(40), default="saved", index=True)
    source: Mapped[str] = mapped_column(String(40), default="manual")
    is_group_ride: Mapped[bool] = mapped_column(Boolean, default=False)
    distance_miles: Mapped[float | None] = mapped_column(Float, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    rider: Mapped[Rider] = relationship(back_populates="progress")


class RiderBadge(Base):
    __tablename__ = "rider_badges"
    __table_args__ = (
        UniqueConstraint("rider_id", "badge_key", name="uq_rider_badge"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    badge_key: Mapped[str] = mapped_column(String(80), index=True)
    label: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(60), default="trail")
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    rider: Mapped[Rider] = relationship(back_populates="badges")


class PartnerVisit(Base):
    __tablename__ = "partner_visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    discount_code: Mapped[str] = mapped_column(String(80), default="")
    source: Mapped[str] = mapped_column(String(60), default="manual")
    checked_in_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    rider: Mapped[Rider] = relationship(back_populates="partner_visits")
    business: Mapped[Business] = relationship()


class BusinessReview(Base):
    __tablename__ = "business_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    rider_id: Mapped[int | None] = mapped_column(ForeignKey("riders.id"), nullable=True, index=True)
    rider_name: Mapped[str] = mapped_column(String(120))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default=ReviewStatus.pending.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    business: Mapped[Business] = relationship(back_populates="reviews")
    rider: Mapped[Rider | None] = relationship(back_populates="business_reviews")


class BookableListing(Base):
    __tablename__ = "bookable_listings"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), index=True)
    listing_type: Mapped[str] = mapped_column(String(60), default="lodging", index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(180), default="", index=True)
    photo_url: Mapped[str] = mapped_column(Text, default="")
    nightly_rate_cents: Mapped[int] = mapped_column(Integer, default=0)
    cleaning_fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    tax_rate_basis_points: Mapped[int] = mapped_column(Integer, default=0)
    max_guests: Mapped[int] = mapped_column(Integer, default=1)
    cancellation_window_hours: Mapped[int] = mapped_column(Integer, default=72)
    cancellation_policy: Mapped[str] = mapped_column(
        Text,
        default="Guests may request cancellation before check-in. The business reviews each request under its posted policy.",
    )
    refund_policy: Mapped[str] = mapped_column(
        Text,
        default="Approved cancellations may receive a full or partial refund based on timing, property rules, and any non-refundable fees.",
    )
    payout_timing: Mapped[str] = mapped_column(String(60), default="after_check_in")
    payment_timing: Mapped[str] = mapped_column(String(60), default="at_booking")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    business: Mapped[Business] = relationship(back_populates="bookable_listings")
    calendars: Mapped[list["ListingCalendar"]] = relationship(back_populates="listing", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="listing", cascade="all, delete-orphan")


class ListingCalendar(Base):
    __tablename__ = "listing_calendars"

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("bookable_listings.id"), index=True)
    provider: Mapped[str] = mapped_column(String(80), default="iCal")
    ical_url: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_sync_status: Mapped[str] = mapped_column(String(120), default="Not synced yet")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    listing: Mapped[BookableListing] = relationship(back_populates="calendars")
    blocked_ranges: Mapped[list["ListingCalendarBlock"]] = relationship(back_populates="calendar", cascade="all, delete-orphan")


class ListingCalendarBlock(Base):
    __tablename__ = "listing_calendar_blocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    calendar_id: Mapped[int] = mapped_column(ForeignKey("listing_calendars.id"), index=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("bookable_listings.id"), index=True)
    source_uid: Mapped[str] = mapped_column(String(220), default="", index=True)
    start_date: Mapped[str] = mapped_column(String(40), index=True)
    end_date: Mapped[str] = mapped_column(String(40), index=True)
    summary: Mapped[str] = mapped_column(String(220), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    calendar: Mapped[ListingCalendar] = relationship(back_populates="blocked_ranges")
    listing: Mapped[BookableListing] = relationship()


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("bookable_listings.id"), index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    rider_id: Mapped[int | None] = mapped_column(ForeignKey("riders.id"), nullable=True, index=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str] = mapped_column(String(180), index=True)
    customer_phone: Mapped[str] = mapped_column(String(40), default="")
    start_date: Mapped[str] = mapped_column(String(40), index=True)
    end_date: Mapped[str] = mapped_column(String(40), index=True)
    guests: Mapped[int] = mapped_column(Integer, default=1)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="requested", index=True)
    subtotal_cents: Mapped[int] = mapped_column(Integer, default=0)
    cleaning_fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    taxes_cents: Mapped[int] = mapped_column(Integer, default=0)
    platform_fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_cents: Mapped[int] = mapped_column(Integer, default=0)
    stripe_checkout_session_id: Mapped[str] = mapped_column(String(180), default="", index=True)
    confirmation_email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_requested_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancellation_reason: Mapped[str] = mapped_column(Text, default="")
    cancellation_decision_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancellation_decision_note: Mapped[str] = mapped_column(Text, default="")
    refund_status: Mapped[str] = mapped_column(String(60), default="not_requested", index=True)
    refunded_cents: Mapped[int] = mapped_column(Integer, default=0)
    stripe_refund_id: Mapped[str] = mapped_column(String(180), default="", index=True)
    refund_failure_reason: Mapped[str] = mapped_column(Text, default="")
    payout_release_date: Mapped[str] = mapped_column(String(40), default="", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    business: Mapped[Business] = relationship(back_populates="bookings")
    listing: Mapped[BookableListing] = relationship(back_populates="bookings")
    rider: Mapped[Rider | None] = relationship()
    payment: Mapped["BookingPayment | None"] = relationship(back_populates="booking", cascade="all, delete-orphan", uselist=False)


class BookingPayment(Base):
    __tablename__ = "booking_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), index=True)
    stripe_checkout_session_id: Mapped[str] = mapped_column(String(180), default="", index=True)
    stripe_payment_intent_id: Mapped[str] = mapped_column(String(180), default="")
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    platform_fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    booking: Mapped[Booking] = relationship(back_populates="payment")


class BookingTransfer(Base):
    __tablename__ = "booking_transfers"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    stripe_transfer_id: Mapped[str] = mapped_column(String(180), default="", index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    release_date: Mapped[str] = mapped_column(String(40), default="", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    booking: Mapped[Booking] = relationship()
    business: Mapped[Business] = relationship()


class StoreOrder(Base):
    __tablename__ = "store_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    stripe_checkout_session_id: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    stripe_payment_intent_id: Mapped[str] = mapped_column(String(180), default="", index=True)
    customer_name: Mapped[str] = mapped_column(String(160), default="")
    customer_email: Mapped[str] = mapped_column(String(180), default="", index=True)
    customer_phone: Mapped[str] = mapped_column(String(40), default="")
    total_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(10), default="usd")
    status: Mapped[str] = mapped_column(String(40), default="paid", index=True)
    items: Mapped[str] = mapped_column(Text, default="[]")
    shipping_name: Mapped[str] = mapped_column(String(160), default="")
    shipping_address: Mapped[str] = mapped_column(Text, default="{}")
    printify_submitted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    printify_order_id: Mapped[str] = mapped_column(String(180), default="", index=True)
    printify_message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class PageVisit(Base):
    __tablename__ = "page_visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    path: Mapped[str] = mapped_column(String(240), index=True)
    referrer: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
