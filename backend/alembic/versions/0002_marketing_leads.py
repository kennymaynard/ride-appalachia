"""marketing leads

Revision ID: 0002_marketing_leads
Revises: 0001_launch_readiness
Create Date: 2026-05-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0002_marketing_leads"
down_revision = "0001_launch_readiness"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "marketing_leads" in inspect(op.get_bind()).get_table_names():
        return

    op.create_table(
        "marketing_leads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lead_type", sa.String(length=40), server_default="launch_access", nullable=False),
        sa.Column("email", sa.String(length=180), nullable=False),
        sa.Column("business_name", sa.String(length=160), server_default="", nullable=False),
        sa.Column("category", sa.String(length=80), server_default="", nullable=False),
        sa.Column("area", sa.String(length=160), server_default="", nullable=False),
        sa.Column("phone", sa.String(length=40), server_default="", nullable=False),
        sa.Column("website", sa.Text(), server_default="", nullable=False),
        sa.Column("source", sa.String(length=120), server_default="", nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("lead_type IN ('launch_access','business_availability')", name="ck_marketing_lead_type"),
        sa.CheckConstraint("status IN ('new','contacted','converted','closed')", name="ck_marketing_lead_status"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_marketing_leads_area", "marketing_leads", ["area"])
    op.create_index("ix_marketing_leads_email", "marketing_leads", ["email"])
    op.create_index("ix_marketing_leads_lead_type", "marketing_leads", ["lead_type"])
    op.create_index("ix_marketing_leads_status", "marketing_leads", ["status"])


def downgrade() -> None:
    op.drop_table("marketing_leads")
