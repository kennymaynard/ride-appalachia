"""Add moderated proof-based business ownership claims."""
from alembic import op
import sqlalchemy as sa

revision = "0026_business_claim_verification"
down_revision = "0025_business_source_imports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "business_claims",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("claimant_name", sa.String(160), nullable=False),
        sa.Column("claimant_email", sa.String(180), nullable=False),
        sa.Column("claimant_phone", sa.String(40), nullable=False, server_default=""),
        sa.Column("claimant_role", sa.String(80), nullable=False),
        sa.Column("proof_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("proof_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("subscription_tier", sa.String(40), nullable=False, server_default="local_business"),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("admin_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    for column in ("business_id", "claimant_email", "status"):
        op.create_index(f"ix_business_claims_{column}", "business_claims", [column])


def downgrade() -> None:
    op.drop_table("business_claims")
