"""Keep imported chain restaurants available only through explicit search."""
from alembic import op
import sqlalchemy as sa

from app.services.business_visibility import CHAIN_RESTAURANT_NAMES


revision = "0029_search_only_chain_businesses"
down_revision = "0028_rider_safety_network"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("is_search_only", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_businesses_is_search_only", "businesses", ["is_search_only"])
    businesses = sa.table(
        "businesses",
        sa.column("name", sa.String()),
        sa.column("category", sa.String()),
        sa.column("source_provider", sa.String()),
        sa.column("is_featured", sa.Boolean()),
        sa.column("subscription_status", sa.String()),
        sa.column("is_search_only", sa.Boolean()),
    )
    op.execute(
        businesses.update()
        .where(sa.func.lower(sa.func.trim(businesses.c.name)).in_(sorted(CHAIN_RESTAURANT_NAMES)))
        .where(businesses.c.category == "food")
        .where(businesses.c.source_provider == "openstreetmap")
        .where(businesses.c.is_featured.is_(False))
        .where(businesses.c.subscription_status.notin_(["active", "trialing"]))
        .values(is_search_only=True)
    )


def downgrade() -> None:
    op.drop_index("ix_businesses_is_search_only", table_name="businesses")
    op.drop_column("businesses", "is_search_only")
