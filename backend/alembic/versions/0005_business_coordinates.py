"""Add business coordinates for map pins."""

from alembic import op
import sqlalchemy as sa


revision = "0005_business_coordinates"
down_revision = "0004_trail_talk_posts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("businesses", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("businesses", "longitude")
    op.drop_column("businesses", "latitude")
