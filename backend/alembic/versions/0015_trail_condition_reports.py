"""add trail condition reports"""

from alembic import op
import sqlalchemy as sa


revision = "0015_trail_condition_reports"
down_revision = "0014_trail_review_photos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trail_condition_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("area_slug", sa.String(length=120), nullable=False),
        sa.Column("trail_name", sa.String(length=180), nullable=False),
        sa.Column("rider_name", sa.String(length=120), nullable=False),
        sa.Column("report_type", sa.String(length=60), nullable=False),
        sa.Column("severity", sa.String(length=40), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trail_condition_reports_area_slug", "trail_condition_reports", ["area_slug"])
    op.create_index("ix_trail_condition_reports_report_type", "trail_condition_reports", ["report_type"])
    op.create_index("ix_trail_condition_reports_status", "trail_condition_reports", ["status"])


def downgrade() -> None:
    op.drop_index("ix_trail_condition_reports_status", table_name="trail_condition_reports")
    op.drop_index("ix_trail_condition_reports_report_type", table_name="trail_condition_reports")
    op.drop_index("ix_trail_condition_reports_area_slug", table_name="trail_condition_reports")
    op.drop_table("trail_condition_reports")
