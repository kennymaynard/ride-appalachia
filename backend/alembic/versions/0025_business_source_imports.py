"""Track imported business sources for safe deduplication."""
from alembic import op
import sqlalchemy as sa

revision = "0025_business_source_imports"
down_revision = "0024_event_destination_platform"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("source_provider", sa.String(40), nullable=True))
    op.add_column("businesses", sa.Column("source_id", sa.String(100), nullable=True))
    op.add_column("businesses", sa.Column("source_url", sa.Text(), nullable=False, server_default=""))
    op.add_column("businesses", sa.Column("imported_at", sa.DateTime(), nullable=True))
    op.create_index("ix_businesses_source_provider", "businesses", ["source_provider"])
    op.create_index("ix_businesses_source_id", "businesses", ["source_id"])
    op.create_unique_constraint("uq_business_source", "businesses", ["source_provider", "source_id"])


def downgrade() -> None:
    op.drop_constraint("uq_business_source", "businesses", type_="unique")
    op.drop_index("ix_businesses_source_id", table_name="businesses")
    op.drop_index("ix_businesses_source_provider", table_name="businesses")
    for column in ("imported_at", "source_url", "source_id", "source_provider"):
        op.drop_column("businesses", column)
