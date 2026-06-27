"""add trail talk posts

Revision ID: 0004_trail_talk_posts
Revises: 0003_veteran_owned_tier
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_trail_talk_posts"
down_revision = "0003_veteran_owned_tier"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trail_talk_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rider_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=180), server_default="", nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("area_slug", sa.String(length=120), server_default="", nullable=False),
        sa.Column("ride_date", sa.String(length=80), server_default="", nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_trail_talk_posts_category", "trail_talk_posts", ["category"])
    op.create_index("ix_trail_talk_posts_area_slug", "trail_talk_posts", ["area_slug"])
    op.create_index("ix_trail_talk_posts_status", "trail_talk_posts", ["status"])


def downgrade() -> None:
    op.drop_index("ix_trail_talk_posts_status", table_name="trail_talk_posts")
    op.drop_index("ix_trail_talk_posts_area_slug", table_name="trail_talk_posts")
    op.drop_index("ix_trail_talk_posts_category", table_name="trail_talk_posts")
    op.drop_table("trail_talk_posts")
