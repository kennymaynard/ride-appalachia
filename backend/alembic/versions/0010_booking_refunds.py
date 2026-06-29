"""Add Stripe refund tracking to bookings."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0010_booking_refunds"
down_revision = "0009_booking_cancellation_policies"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def index_exists(table_name: str, index_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if not column_exists(table_name, column.name):
        op.add_column(table_name, column)


def upgrade() -> None:
    add_column_if_missing("bookings", sa.Column("refunded_cents", sa.Integer(), nullable=False, server_default="0"))
    add_column_if_missing(
        "bookings",
        sa.Column("stripe_refund_id", sa.String(length=180), nullable=False, server_default=""),
    )
    add_column_if_missing("bookings", sa.Column("refund_failure_reason", sa.Text(), nullable=False, server_default=""))
    index_name = op.f("ix_bookings_stripe_refund_id")
    if not index_exists("bookings", index_name):
        op.create_index(index_name, "bookings", ["stripe_refund_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_bookings_stripe_refund_id"), table_name="bookings")
    op.drop_column("bookings", "refund_failure_reason")
    op.drop_column("bookings", "stripe_refund_id")
    op.drop_column("bookings", "refunded_cents")
