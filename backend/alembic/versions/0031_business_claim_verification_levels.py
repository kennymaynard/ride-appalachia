"""add business claim verification levels

Revision ID: 0031_claim_verification
Revises: 0030_explore_appalachia
"""
from alembic import op
import sqlalchemy as sa

revision = "0031_claim_verification"
down_revision = "0030_explore_appalachia"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("business_claims", sa.Column("verification_level", sa.String(30), nullable=False, server_default="manual"))
    op.add_column("business_claims", sa.Column("verification_reason", sa.Text(), nullable=False, server_default=""))
    op.add_column("business_claims", sa.Column("email_domain_match", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("business_claims", sa.Column("public_phone_match", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("business_claims", sa.Column("email_code_hash", sa.String(64), nullable=False, server_default=""))
    op.add_column("business_claims", sa.Column("email_code_expires_at", sa.DateTime(), nullable=True))
    op.add_column("business_claims", sa.Column("email_verification_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("business_claims", sa.Column("email_verified_at", sa.DateTime(), nullable=True))
    op.create_index("ix_business_claims_verification_level", "business_claims", ["verification_level"])

def downgrade():
    op.drop_index("ix_business_claims_verification_level", table_name="business_claims")
    for column in ["email_verified_at", "email_verification_attempts", "email_code_expires_at", "email_code_hash", "public_phone_match", "email_domain_match", "verification_reason", "verification_level"]:
        op.drop_column("business_claims", column)
