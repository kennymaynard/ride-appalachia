"""Add booking cancellation policies and scheduled payouts."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0009_booking_cancellation_policies"
down_revision = "0008_booking_calendar_sync"
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


def create_index_if_missing(table_name: str, index_name: str, columns: list[str]) -> None:
    if not index_exists(table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=False)


def widen_alembic_version_column() -> None:
    op.alter_column(
        "alembic_version",
        "version_num",
        existing_type=sa.String(length=32),
        type_=sa.String(length=128),
        existing_nullable=False,
    )


def upgrade() -> None:
    widen_alembic_version_column()
    add_column_if_missing(
        "bookable_listings",
        sa.Column("cancellation_window_hours", sa.Integer(), nullable=False, server_default="72"),
    )
    add_column_if_missing(
        "bookable_listings",
        sa.Column(
            "cancellation_policy",
            sa.Text(),
            nullable=False,
            server_default="Guests may request cancellation before check-in. The business reviews each request under its posted policy.",
        ),
    )
    add_column_if_missing(
        "bookable_listings",
        sa.Column(
            "refund_policy",
            sa.Text(),
            nullable=False,
            server_default="Approved cancellations may receive a full or partial refund based on timing, property rules, and any non-refundable fees.",
        ),
    )
    add_column_if_missing(
        "bookable_listings",
        sa.Column("payout_timing", sa.String(length=60), nullable=False, server_default="after_check_in"),
    )
    add_column_if_missing(
        "bookable_listings",
        sa.Column("payment_timing", sa.String(length=60), nullable=False, server_default="at_booking"),
    )

    add_column_if_missing("bookings", sa.Column("cancellation_requested_at", sa.DateTime(), nullable=True))
    add_column_if_missing("bookings", sa.Column("cancellation_reason", sa.Text(), nullable=False, server_default=""))
    add_column_if_missing("bookings", sa.Column("cancellation_decision_at", sa.DateTime(), nullable=True))
    add_column_if_missing("bookings", sa.Column("cancellation_decision_note", sa.Text(), nullable=False, server_default=""))
    add_column_if_missing(
        "bookings",
        sa.Column("refund_status", sa.String(length=60), nullable=False, server_default="not_requested"),
    )
    add_column_if_missing(
        "bookings",
        sa.Column("payout_release_date", sa.String(length=40), nullable=False, server_default=""),
    )
    create_index_if_missing("bookings", op.f("ix_bookings_refund_status"), ["refund_status"])
    create_index_if_missing("bookings", op.f("ix_bookings_payout_release_date"), ["payout_release_date"])

    add_column_if_missing(
        "booking_transfers",
        sa.Column("release_date", sa.String(length=40), nullable=False, server_default=""),
    )
    create_index_if_missing("booking_transfers", op.f("ix_booking_transfers_release_date"), ["release_date"])


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
