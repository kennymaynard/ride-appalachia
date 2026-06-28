"""Add calendar blocks and booking transfer records."""

from alembic import op
import sqlalchemy as sa


revision = "0008_booking_calendar_sync"
down_revision = "0007_booking_marketplace"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listing_calendar_blocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("calendar_id", sa.Integer(), nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("source_uid", sa.String(length=220), nullable=False),
        sa.Column("start_date", sa.String(length=40), nullable=False),
        sa.Column("end_date", sa.String(length=40), nullable=False),
        sa.Column("summary", sa.String(length=220), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["calendar_id"], ["listing_calendars.id"]),
        sa.ForeignKeyConstraint(["listing_id"], ["bookable_listings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_listing_calendar_blocks_calendar_id"), "listing_calendar_blocks", ["calendar_id"], unique=False)
    op.create_index(op.f("ix_listing_calendar_blocks_end_date"), "listing_calendar_blocks", ["end_date"], unique=False)
    op.create_index(op.f("ix_listing_calendar_blocks_listing_id"), "listing_calendar_blocks", ["listing_id"], unique=False)
    op.create_index(op.f("ix_listing_calendar_blocks_source_uid"), "listing_calendar_blocks", ["source_uid"], unique=False)
    op.create_index(op.f("ix_listing_calendar_blocks_start_date"), "listing_calendar_blocks", ["start_date"], unique=False)

    op.create_table(
        "booking_transfers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("stripe_transfer_id", sa.String(length=180), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_booking_transfers_booking_id"), "booking_transfers", ["booking_id"], unique=False)
    op.create_index(op.f("ix_booking_transfers_business_id"), "booking_transfers", ["business_id"], unique=False)
    op.create_index(op.f("ix_booking_transfers_status"), "booking_transfers", ["status"], unique=False)
    op.create_index(op.f("ix_booking_transfers_stripe_transfer_id"), "booking_transfers", ["stripe_transfer_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_booking_transfers_stripe_transfer_id"), table_name="booking_transfers")
    op.drop_index(op.f("ix_booking_transfers_status"), table_name="booking_transfers")
    op.drop_index(op.f("ix_booking_transfers_business_id"), table_name="booking_transfers")
    op.drop_index(op.f("ix_booking_transfers_booking_id"), table_name="booking_transfers")
    op.drop_table("booking_transfers")
    op.drop_index(op.f("ix_listing_calendar_blocks_start_date"), table_name="listing_calendar_blocks")
    op.drop_index(op.f("ix_listing_calendar_blocks_source_uid"), table_name="listing_calendar_blocks")
    op.drop_index(op.f("ix_listing_calendar_blocks_listing_id"), table_name="listing_calendar_blocks")
    op.drop_index(op.f("ix_listing_calendar_blocks_end_date"), table_name="listing_calendar_blocks")
    op.drop_index(op.f("ix_listing_calendar_blocks_calendar_id"), table_name="listing_calendar_blocks")
    op.drop_table("listing_calendar_blocks")
