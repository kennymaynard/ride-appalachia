"""Add the event metrics timestamp index expected by the model."""

from alembic import op


revision = "0022_event_metrics_created_at_index"
down_revision = "0021_rider_event_engagement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_event_metrics_created_at", "event_metrics", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_event_metrics_created_at", table_name="event_metrics")
