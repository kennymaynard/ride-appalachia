"""Add booking marketplace tables and Stripe Connect fields."""

from alembic import op
import sqlalchemy as sa


revision = "0007_booking_marketplace"
down_revision = "0006_rider_accounts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("stripe_connect_account_id", sa.String(length=180), nullable=False, server_default=""))
    op.add_column("businesses", sa.Column("stripe_connect_onboarding_complete", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index(op.f("ix_businesses_stripe_connect_account_id"), "businesses", ["stripe_connect_account_id"], unique=False)
    op.create_index(
        op.f("ix_businesses_stripe_connect_onboarding_complete"),
        "businesses",
        ["stripe_connect_onboarding_complete"],
        unique=False,
    )

    op.create_table(
        "bookable_listings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("listing_type", sa.String(length=60), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(length=180), nullable=False),
        sa.Column("photo_url", sa.Text(), nullable=False),
        sa.Column("nightly_rate_cents", sa.Integer(), nullable=False),
        sa.Column("cleaning_fee_cents", sa.Integer(), nullable=False),
        sa.Column("max_guests", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bookable_listings_business_id"), "bookable_listings", ["business_id"], unique=False)
    op.create_index(op.f("ix_bookable_listings_is_active"), "bookable_listings", ["is_active"], unique=False)
    op.create_index(op.f("ix_bookable_listings_listing_type"), "bookable_listings", ["listing_type"], unique=False)
    op.create_index(op.f("ix_bookable_listings_location"), "bookable_listings", ["location"], unique=False)
    op.create_index(op.f("ix_bookable_listings_title"), "bookable_listings", ["title"], unique=False)

    op.create_table(
        "listing_calendars",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("ical_url", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.Column("last_sync_status", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["bookable_listings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_listing_calendars_is_active"), "listing_calendars", ["is_active"], unique=False)
    op.create_index(op.f("ix_listing_calendars_listing_id"), "listing_calendars", ["listing_id"], unique=False)

    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("rider_id", sa.Integer(), nullable=True),
        sa.Column("customer_name", sa.String(length=120), nullable=False),
        sa.Column("customer_email", sa.String(length=180), nullable=False),
        sa.Column("customer_phone", sa.String(length=40), nullable=False),
        sa.Column("start_date", sa.String(length=40), nullable=False),
        sa.Column("end_date", sa.String(length=40), nullable=False),
        sa.Column("guests", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False),
        sa.Column("platform_fee_cents", sa.Integer(), nullable=False),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("stripe_checkout_session_id", sa.String(length=180), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["listing_id"], ["bookable_listings.id"]),
        sa.ForeignKeyConstraint(["rider_id"], ["riders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bookings_business_id"), "bookings", ["business_id"], unique=False)
    op.create_index(op.f("ix_bookings_customer_email"), "bookings", ["customer_email"], unique=False)
    op.create_index(op.f("ix_bookings_end_date"), "bookings", ["end_date"], unique=False)
    op.create_index(op.f("ix_bookings_listing_id"), "bookings", ["listing_id"], unique=False)
    op.create_index(op.f("ix_bookings_rider_id"), "bookings", ["rider_id"], unique=False)
    op.create_index(op.f("ix_bookings_start_date"), "bookings", ["start_date"], unique=False)
    op.create_index(op.f("ix_bookings_status"), "bookings", ["status"], unique=False)
    op.create_index(op.f("ix_bookings_stripe_checkout_session_id"), "bookings", ["stripe_checkout_session_id"], unique=False)

    op.create_table(
        "booking_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("stripe_checkout_session_id", sa.String(length=180), nullable=False),
        sa.Column("stripe_payment_intent_id", sa.String(length=180), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("platform_fee_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_booking_payments_booking_id"), "booking_payments", ["booking_id"], unique=False)
    op.create_index(op.f("ix_booking_payments_status"), "booking_payments", ["status"], unique=False)
    op.create_index(
        op.f("ix_booking_payments_stripe_checkout_session_id"),
        "booking_payments",
        ["stripe_checkout_session_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_booking_payments_stripe_checkout_session_id"), table_name="booking_payments")
    op.drop_index(op.f("ix_booking_payments_status"), table_name="booking_payments")
    op.drop_index(op.f("ix_booking_payments_booking_id"), table_name="booking_payments")
    op.drop_table("booking_payments")
    op.drop_index(op.f("ix_bookings_stripe_checkout_session_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_status"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_start_date"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_rider_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_listing_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_end_date"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_customer_email"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_business_id"), table_name="bookings")
    op.drop_table("bookings")
    op.drop_index(op.f("ix_listing_calendars_listing_id"), table_name="listing_calendars")
    op.drop_index(op.f("ix_listing_calendars_is_active"), table_name="listing_calendars")
    op.drop_table("listing_calendars")
    op.drop_index(op.f("ix_bookable_listings_title"), table_name="bookable_listings")
    op.drop_index(op.f("ix_bookable_listings_location"), table_name="bookable_listings")
    op.drop_index(op.f("ix_bookable_listings_listing_type"), table_name="bookable_listings")
    op.drop_index(op.f("ix_bookable_listings_is_active"), table_name="bookable_listings")
    op.drop_index(op.f("ix_bookable_listings_business_id"), table_name="bookable_listings")
    op.drop_table("bookable_listings")
    op.drop_index(op.f("ix_businesses_stripe_connect_onboarding_complete"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_stripe_connect_account_id"), table_name="businesses")
    op.drop_column("businesses", "stripe_connect_onboarding_complete")
    op.drop_column("businesses", "stripe_connect_account_id")
