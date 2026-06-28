"""Add rider accounts, progress, badges, and business reviews."""

from alembic import op
import sqlalchemy as sa


revision = "0006_rider_accounts"
down_revision = "0005_business_coordinates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "riders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=180), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("access_token", sa.String(length=80), nullable=False),
        sa.Column("veteran_verification_status", sa.String(length=40), nullable=False),
        sa.Column("veteran_verification_notes", sa.Text(), nullable=False),
        sa.Column("veteran_document_name", sa.String(length=220), nullable=False),
        sa.Column("alert_phone_opt_in", sa.Boolean(), nullable=False),
        sa.Column("alert_email_opt_in", sa.Boolean(), nullable=False),
        sa.Column("storm_alerts_enabled", sa.Boolean(), nullable=False),
        sa.Column("trail_alerts_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("access_token"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_riders_access_token"), "riders", ["access_token"], unique=False)
    op.create_index(op.f("ix_riders_email"), "riders", ["email"], unique=False)
    op.create_index(
        op.f("ix_riders_veteran_verification_status"),
        "riders",
        ["veteran_verification_status"],
        unique=False,
    )

    op.create_table(
        "business_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("rider_id", sa.Integer(), nullable=True),
        sa.Column("rider_name", sa.String(length=120), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["rider_id"], ["riders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_business_reviews_business_id"), "business_reviews", ["business_id"], unique=False)
    op.create_index(op.f("ix_business_reviews_rider_id"), "business_reviews", ["rider_id"], unique=False)
    op.create_index(op.f("ix_business_reviews_status"), "business_reviews", ["status"], unique=False)

    op.create_table(
        "partner_visits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rider_id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("discount_code", sa.String(length=80), nullable=False),
        sa.Column("source", sa.String(length=60), nullable=False),
        sa.Column("checked_in_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["rider_id"], ["riders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_partner_visits_business_id"), "partner_visits", ["business_id"], unique=False)
    op.create_index(op.f("ix_partner_visits_rider_id"), "partner_visits", ["rider_id"], unique=False)

    op.create_table(
        "rider_badges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rider_id", sa.Integer(), nullable=False),
        sa.Column("badge_key", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("earned_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["rider_id"], ["riders.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rider_id", "badge_key", name="uq_rider_badge"),
    )
    op.create_index(op.f("ix_rider_badges_badge_key"), "rider_badges", ["badge_key"], unique=False)
    op.create_index(op.f("ix_rider_badges_rider_id"), "rider_badges", ["rider_id"], unique=False)

    op.create_table(
        "rider_trail_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rider_id", sa.Integer(), nullable=False),
        sa.Column("area_slug", sa.String(length=120), nullable=False),
        sa.Column("trail_name", sa.String(length=180), nullable=False),
        sa.Column("activity", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("is_group_ride", sa.Boolean(), nullable=False),
        sa.Column("distance_miles", sa.Float(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["rider_id"], ["riders.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rider_id", "area_slug", "trail_name", name="uq_rider_trail_progress"),
    )
    op.create_index(op.f("ix_rider_trail_progress_activity"), "rider_trail_progress", ["activity"], unique=False)
    op.create_index(op.f("ix_rider_trail_progress_area_slug"), "rider_trail_progress", ["area_slug"], unique=False)
    op.create_index(op.f("ix_rider_trail_progress_rider_id"), "rider_trail_progress", ["rider_id"], unique=False)
    op.create_index(op.f("ix_rider_trail_progress_status"), "rider_trail_progress", ["status"], unique=False)
    op.create_index(op.f("ix_rider_trail_progress_trail_name"), "rider_trail_progress", ["trail_name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_rider_trail_progress_trail_name"), table_name="rider_trail_progress")
    op.drop_index(op.f("ix_rider_trail_progress_status"), table_name="rider_trail_progress")
    op.drop_index(op.f("ix_rider_trail_progress_rider_id"), table_name="rider_trail_progress")
    op.drop_index(op.f("ix_rider_trail_progress_area_slug"), table_name="rider_trail_progress")
    op.drop_index(op.f("ix_rider_trail_progress_activity"), table_name="rider_trail_progress")
    op.drop_table("rider_trail_progress")
    op.drop_index(op.f("ix_rider_badges_rider_id"), table_name="rider_badges")
    op.drop_index(op.f("ix_rider_badges_badge_key"), table_name="rider_badges")
    op.drop_table("rider_badges")
    op.drop_index(op.f("ix_partner_visits_rider_id"), table_name="partner_visits")
    op.drop_index(op.f("ix_partner_visits_business_id"), table_name="partner_visits")
    op.drop_table("partner_visits")
    op.drop_index(op.f("ix_business_reviews_status"), table_name="business_reviews")
    op.drop_index(op.f("ix_business_reviews_rider_id"), table_name="business_reviews")
    op.drop_index(op.f("ix_business_reviews_business_id"), table_name="business_reviews")
    op.drop_table("business_reviews")
    op.drop_index(op.f("ix_riders_veteran_verification_status"), table_name="riders")
    op.drop_index(op.f("ix_riders_email"), table_name="riders")
    op.drop_index(op.f("ix_riders_access_token"), table_name="riders")
    op.drop_table("riders")
