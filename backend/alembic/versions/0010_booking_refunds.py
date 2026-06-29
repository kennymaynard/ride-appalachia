"""Add Stripe refund tracking to bookings."""

from alembic import op
import sqlalchemy as sa


revision = "0010_booking_refunds"
down_revision = "0009_booking_cancellation_policies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("refunded_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("stripe_refund_id", sa.String(length=180), nullable=False, server_default=""))
    op.add_column("bookings", sa.Column("refund_failure_reason", sa.Text(), nullable=False, server_default=""))
    op.create_index(op.f("ix_bookings_stripe_refund_id"), "bookings", ["stripe_refund_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_bookings_stripe_refund_id"), table_name="bookings")
    op.drop_column("bookings", "refund_failure_reason")
    op.drop_column("bookings", "stripe_refund_id")
    op.drop_column("bookings", "refunded_cents")
