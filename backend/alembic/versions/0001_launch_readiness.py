"""launch readiness schema

Revision ID: 0001_launch_readiness
Revises:
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0001_launch_readiness"
down_revision = None
branch_labels = None
depends_on = None


category_values = "'lodging','food','rentals','repairs','fuel','deals'"
tier_values = "'local_business','lodging_partner','veteran_owned'"
listing_status_values = "'pending','approved','needs_changes','rejected','unpublished'"
subscription_status_values = "'trialing','active','past_due','canceled','incomplete'"


def upgrade() -> None:
    if "businesses" in inspect(op.get_bind()).get_table_names():
        # Existing MVP installs were created with SQLAlchemy create_all before
        # Alembic was introduced. Treat that schema as the baseline revision so
        # startup can stamp it and future migrations can be incremental.
        return

    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("location", sa.String(length=180), nullable=False),
        sa.Column("photo_url", sa.Text(), nullable=False),
        sa.Column("website_url", sa.Text(), server_default="", nullable=False),
        sa.Column("owner_email", sa.String(length=180), server_default="", nullable=False),
        sa.Column("owner_access_token", sa.String(length=80), server_default="", nullable=False),
        sa.Column("listing_status", sa.String(length=40), server_default="pending", nullable=False),
        sa.Column("admin_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("is_approved", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("subscription_tier", sa.String(length=40), server_default="local_business", nullable=False),
        sa.Column("subscription_status", sa.String(length=40), server_default="incomplete", nullable=False),
        sa.Column("stripe_customer_id", sa.String(length=180), server_default="", nullable=False),
        sa.Column("stripe_subscription_id", sa.String(length=180), server_default="", nullable=False),
        sa.Column("view_clicks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("action_clicks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint(f"category IN ({category_values})", name="ck_business_category"),
        sa.CheckConstraint(f"subscription_tier IN ({tier_values})", name="ck_business_subscription_tier"),
        sa.CheckConstraint(f"listing_status IN ({listing_status_values})", name="ck_business_listing_status"),
        sa.CheckConstraint(
            f"subscription_status IN ({subscription_status_values})",
            name="ck_business_subscription_status",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_business_slug"),
    )
    op.create_index("ix_businesses_category", "businesses", ["category"])
    op.create_index("ix_businesses_created_at", "businesses", ["created_at"])
    op.create_index("ix_businesses_is_approved", "businesses", ["is_approved"])
    op.create_index("ix_businesses_is_featured", "businesses", ["is_featured"])
    op.create_index("ix_businesses_listing_status", "businesses", ["listing_status"])
    op.create_index("ix_businesses_location", "businesses", ["location"])
    op.create_index("ix_businesses_name", "businesses", ["name"])
    op.create_index("ix_businesses_owner_access_token", "businesses", ["owner_access_token"])
    op.create_index("ix_businesses_owner_email", "businesses", ["owner_email"])
    op.create_index("ix_businesses_slug", "businesses", ["slug"], unique=True)

    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("code", sa.String(length=60), server_default="", nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("claim_clicks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("campaign_type", sa.String(length=60), server_default="visibility_campaign", nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("target_area", sa.String(length=120), server_default="", nullable=False),
        sa.Column("monthly_budget", sa.Integer(), server_default="149", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="pending", nullable=False),
        sa.Column("impressions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("clicks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("status IN ('pending','active','paused','expired')", name="ck_campaign_status"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaigns_status", "campaigns", ["status"])

    op.create_table(
        "trail_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("area_slug", sa.String(length=120), nullable=False),
        sa.Column("rider_name", sa.String(length=120), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("ride_date", sa.String(length=80), server_default="", nullable=False),
        sa.Column("machine", sa.String(length=120), server_default="", nullable=False),
        sa.Column("difficulty", sa.String(length=40), server_default="Moderate", nullable=False),
        sa.Column("trail_condition", sa.String(length=220), server_default="", nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_trail_review_rating"),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="ck_trail_review_status"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trail_reviews_area_slug", "trail_reviews", ["area_slug"])
    op.create_index("ix_trail_reviews_status", "trail_reviews", ["status"])

    op.create_table(
        "lodging_service_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("service_type", sa.String(length=80), nullable=False),
        sa.Column("property_name", sa.String(length=160), server_default="", nullable=False),
        sa.Column("property_location", sa.String(length=180), server_default="", nullable=False),
        sa.Column("contact_name", sa.String(length=120), server_default="", nullable=False),
        sa.Column("contact_phone", sa.String(length=40), server_default="", nullable=False),
        sa.Column("contact_email", sa.String(length=180), server_default="", nullable=False),
        sa.Column("date_needed", sa.String(length=80), server_default="", nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("status IN ('new','contacted','matched','closed')", name="ck_lodging_request_status"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lodging_service_requests_business_id", "lodging_service_requests", ["business_id"])
    op.create_index("ix_lodging_service_requests_status", "lodging_service_requests", ["status"])


def downgrade() -> None:
    op.drop_table("lodging_service_requests")
    op.drop_table("trail_reviews")
    op.drop_table("campaigns")
    op.drop_table("deals")
    op.drop_table("businesses")
