from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Category(str, Enum):
    lodging = "lodging"
    food = "food"
    rentals = "rentals"
    repairs = "repairs"
    fuel = "fuel"
    deals = "deals"


class SubscriptionTier(str, Enum):
    local_business = "local_business"
    lodging_partner = "lodging_partner"
    featured_partner = "featured_partner"
    monthly_sponsor = "monthly_sponsor"
    cleaner_partner = "cleaner_partner"


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


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    description: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(String(40))
    location: Mapped[str] = mapped_column(String(180), index=True)
    photo_url: Mapped[str] = mapped_column(Text)
    website_url: Mapped[str] = mapped_column(Text, default="")
    owner_email: Mapped[str] = mapped_column(String(180), default="", index=True)
    owner_access_token: Mapped[str] = mapped_column(String(80), default="", index=True)
    listing_status: Mapped[str] = mapped_column(String(40), default=ListingStatus.pending.value, index=True)
    admin_notes: Mapped[str] = mapped_column(Text, default="")
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    subscription_tier: Mapped[str] = mapped_column(String(40), default=SubscriptionTier.local_business.value)
    subscription_status: Mapped[str] = mapped_column(String(40), default=SubscriptionStatus.incomplete.value)
    stripe_customer_id: Mapped[str] = mapped_column(String(180), default="")
    stripe_subscription_id: Mapped[str] = mapped_column(String(180), default="")
    view_clicks: Mapped[int] = mapped_column(Integer, default=0)
    action_clicks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    deals: Mapped[list["Deal"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    service_requests: Mapped[list["LodgingServiceRequest"]] = relationship(back_populates="business", cascade="all, delete-orphan")


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
    campaign_type: Mapped[str] = mapped_column(String(60), default="monthly_sponsor")
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
    status: Mapped[str] = mapped_column(String(40), default=ReviewStatus.pending.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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
