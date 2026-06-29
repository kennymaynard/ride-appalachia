"""Add booking cancellation policies and scheduled payouts."""

from alembic import op
import sqlalchemy as sa


revision = "0009_booking_cancellation_policies"
down_revision = "0008_booking_calendar_sync"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bookable_listings", sa.Column("cancellation_window_hours", sa.Integer(), nullable=False, server_default="72"))
    op.add_column(
        "bookable_listings",
        sa.Column(
            "cancellation_policy",
            sa.Text(),
            nullable=False,
            server_default="Guests may request cancellation before check-in. The business reviews each request under its posted policy.",
        ),
    )
    op.add_column(
        "bookable_listings",
        sa.Column(
            "refund_policy",
            sa.Text(),
            nullable=False,
            server_default="Approved cancellations may receive a full or partial refund based on timing, property rules, and any non-refundable fees.",
        ),
    )
    op.add_column("bookable_listings", sa.Column("payout_timing", sa.String(length=60), nullable=False, server_default="after_check_in"))
    op.add_column("bookable_listings", sa.Column("payment_timing", sa.String(length=60), nullable=False, server_default="at_booking"))

    op.add_column("bookings", sa.Column("cancellation_requested_at", sa.DateTime(), nullable=True))
    op.add_column("bookings", sa.Column("cancellation_reason", sa.Text(), nullable=False, server_default=""))
    op.add_column("bookings", sa.Column("cancellation_decision_at", sa.DateTime(), nullable=True))
    op.add_column("bookings", sa.Column("cancellation_decision_note", sa.Text(), nullable=False, server_default=""))
    op.add_column("bookings", sa.Column("refund_status", sa.String(length=60), nullable=False, server_default="not_requested"))
    op.add_column("bookings", sa.Column("payout_release_date", sa.String(length=40), nullable=False, server_default=""))
    op.create_index(op.f("ix_bookings_refund_status"), "bookings", ["refund_status"], unique=False)
    op.create_index(op.f("ix_bookings_payout_release_date"), "bookings", ["payout_release_date"], unique=False)

    op.add_column("booking_transfers", sa.Column("release_date", sa.String(length=40), nullable=False, server_default=""))
    op.create_index(op.f("ix_booking_transfers_release_date"), "booking_transfers", ["release_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_booking_transfers_release_date"), table_name="booking_transfers")
    op.drop_column("booking_transfers", "release_date")

    op.drop_index(op.f("ix_bookings_payout_release_date"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_refund_status"), table_name="bookings")
    op.drop_column("bookings", "payout_release_date")
    op.drop_column("bookings", "refund_status")
    op.drop_column("bookings", "cancellation_decision_note")
    op.drop_column("bookings", "cancellation_decision_at")
    op.drop_column("bookings", "cancellation_reason")
    op.drop_column("bookings", "cancellation_requested_at")

    op.drop_column("bookable_listings", "payment_timing")
    op.drop_column("bookable_listings", "payout_timing")
    op.drop_column("bookable_listings", "refund_policy")
    op.drop_column("bookable_listings", "cancellation_policy")
    op.drop_column("bookable_listings", "cancellation_window_hours")
