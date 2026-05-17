"""launch readiness fields

Revision ID: 0001_launch_readiness
Revises:
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_launch_readiness"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("owner_email", sa.String(length=180), server_default="", nullable=False))
    op.add_column("businesses", sa.Column("owner_access_token", sa.String(length=80), server_default="", nullable=False))
    op.add_column("businesses", sa.Column("listing_status", sa.String(length=40), server_default="pending", nullable=False))
    op.add_column("businesses", sa.Column("admin_notes", sa.Text(), server_default="", nullable=False))
    op.add_column("businesses", sa.Column("subscription_status", sa.String(length=40), server_default="incomplete", nullable=False))
    op.add_column("businesses", sa.Column("stripe_customer_id", sa.String(length=180), server_default="", nullable=False))
    op.add_column("businesses", sa.Column("stripe_subscription_id", sa.String(length=180), server_default="", nullable=False))
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("campaign_type", sa.String(length=60), server_default="monthly_sponsor", nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("target_area", sa.String(length=120), server_default="", nullable=False),
        sa.Column("monthly_budget", sa.Integer(), server_default="149", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="pending", nullable=False),
        sa.Column("impressions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("clicks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("campaigns")
    op.drop_column("businesses", "stripe_subscription_id")
    op.drop_column("businesses", "stripe_customer_id")
    op.drop_column("businesses", "subscription_status")
    op.drop_column("businesses", "admin_notes")
    op.drop_column("businesses", "listing_status")
    op.drop_column("businesses", "owner_access_token")
    op.drop_column("businesses", "owner_email")
