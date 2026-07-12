"""Secure rider resets and booking confirmation delivery.

Revision ID: 0020_security_email_idempotency
Revises: 0019_events
"""

from alembic import op
import sqlalchemy as sa


revision = "0020_security_email_idempotency"
down_revision = "0019_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("riders", sa.Column("password_reset_token_hash", sa.String(64), nullable=True))
    op.add_column("riders", sa.Column("password_reset_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_riders_password_reset_token_hash", "riders", ["password_reset_token_hash"])
    op.add_column("bookings", sa.Column("confirmation_email_sent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "confirmation_email_sent_at")
    op.drop_index("ix_riders_password_reset_token_hash", table_name="riders")
    op.drop_column("riders", "password_reset_expires_at")
    op.drop_column("riders", "password_reset_token_hash")
