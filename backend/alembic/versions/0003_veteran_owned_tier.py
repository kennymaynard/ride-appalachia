"""add veteran owned subscription tier

Revision ID: 0003_veteran_owned_tier
Revises: 0002_marketing_leads
Create Date: 2026-06-27
"""
from alembic import op
from sqlalchemy import inspect


revision = "0003_veteran_owned_tier"
down_revision = "0002_marketing_leads"
branch_labels = None
depends_on = None


OLD_TIER_VALUES = "'local_business','lodging_partner','featured_partner','monthly_sponsor','cleaner_partner'"
NEW_TIER_VALUES = "'local_business','lodging_partner','veteran_owned'"


def upgrade() -> None:
    if op.get_context().dialect.name != "postgresql":
        return

    inspector = inspect(op.get_bind())
    table_names = inspector.get_table_names()
    constraint_names = {
        constraint["name"]
        for constraint in inspector.get_check_constraints("businesses")
    }
    op.execute(
        """
        UPDATE businesses
        SET subscription_tier = 'local_business'
        WHERE subscription_tier IN ('featured_partner', 'monthly_sponsor', 'cleaner_partner')
        """
    )
    if "campaigns" in table_names:
        op.execute(
            """
            UPDATE campaigns
            SET campaign_type = 'visibility_campaign'
            WHERE campaign_type = 'monthly_sponsor'
            """
        )
    if "ck_business_subscription_tier" in constraint_names:
        op.drop_constraint("ck_business_subscription_tier", "businesses", type_="check")
    op.create_check_constraint(
        "ck_business_subscription_tier",
        "businesses",
        f"subscription_tier IN ({NEW_TIER_VALUES})",
    )


def downgrade() -> None:
    if op.get_context().dialect.name != "postgresql":
        return

    inspector = inspect(op.get_bind())
    table_names = inspector.get_table_names()
    constraint_names = {
        constraint["name"]
        for constraint in inspector.get_check_constraints("businesses")
    }
    op.execute(
        """
        UPDATE businesses
        SET subscription_tier = 'local_business'
        WHERE subscription_tier = 'veteran_owned'
        """
    )
    if "campaigns" in table_names:
        op.execute(
            """
            UPDATE campaigns
            SET campaign_type = 'monthly_sponsor'
            WHERE campaign_type = 'visibility_campaign'
            """
        )
    if "ck_business_subscription_tier" in constraint_names:
        op.drop_constraint("ck_business_subscription_tier", "businesses", type_="check")
    op.create_check_constraint(
        "ck_business_subscription_tier",
        "businesses",
        f"subscription_tier IN ({OLD_TIER_VALUES})",
    )
