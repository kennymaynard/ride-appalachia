"""Add the event metrics timestamp index expected by the model."""

from alembic import op


revision = "0022_event_metrics_created_at_index"
down_revision = "0021_rider_event_engagement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Some early databases were initialized from SQLAlchemy metadata, which
    # already created this model-declared index before Alembic reached 0022.
    op.execute("CREATE INDEX IF NOT EXISTS ix_event_metrics_created_at ON event_metrics (created_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_event_metrics_created_at")
