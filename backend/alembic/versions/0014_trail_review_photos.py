"""Add trail review rider photos."""

from alembic import op
import sqlalchemy as sa


revision = "0014_trail_review_photos"
down_revision = "0013_admin_analytics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trail_reviews", sa.Column("photo_url", sa.Text(), server_default="", nullable=False))
    op.add_column("trail_reviews", sa.Column("photo_caption", sa.String(length=180), server_default="", nullable=False))


def downgrade() -> None:
    op.drop_column("trail_reviews", "photo_caption")
    op.drop_column("trail_reviews", "photo_url")
