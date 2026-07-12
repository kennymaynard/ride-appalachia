"""Add verified events and ride planning.

Revision ID: 0019_events
Revises: 0018_marketplace_merchant_of_record
"""

from alembic import op
import sqlalchemy as sa


revision = "0019_events"
down_revision = "0018_marketplace_merchant_of_record"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("organizer", sa.String(180), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("state", sa.String(2), nullable=False),
        sa.Column("city", sa.String(120), nullable=False),
        sa.Column("venue", sa.String(180), nullable=False, server_default=""),
        sa.Column("address", sa.String(240), nullable=False, server_default=""),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("vehicle_types", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("official_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("registration_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("facebook_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("image_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("verification_source", sa.Text(), nullable=False, server_default=""),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("submitted_by_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("submitted_by_email", sa.String(180), nullable=False, server_default=""),
        sa.Column("admin_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("state IN ('KY','WV','VA','TN','NC')", name="ck_events_state"),
        sa.CheckConstraint("status IN ('pending','approved','rejected','expired','unpublished')", name="ck_events_status"),
        sa.CheckConstraint("end_date >= start_date", name="ck_events_date_range"),
        sa.UniqueConstraint("slug", name="uq_events_slug"),
    )
    op.create_index("ix_events_title", "events", ["title"])
    op.create_index("ix_events_slug", "events", ["slug"], unique=True)
    op.create_index("ix_events_state", "events", ["state"])
    op.create_index("ix_events_city", "events", ["city"])
    op.create_index("ix_events_start_date", "events", ["start_date"])
    op.create_index("ix_events_end_date", "events", ["end_date"])
    op.create_index("ix_events_category", "events", ["category"])
    op.create_index("ix_events_status", "events", ["status"])
    op.create_index("ix_events_is_verified", "events", ["is_verified"])
    op.create_index("ix_events_is_featured", "events", ["is_featured"])
    op.create_index("ix_events_state_start_date", "events", ["state", "start_date"])
    op.create_index("ix_events_status_end_date", "events", ["status", "end_date"])
    op.create_index("ix_events_verified_featured", "events", ["is_verified", "is_featured"])


def downgrade() -> None:
    op.drop_table("events")
