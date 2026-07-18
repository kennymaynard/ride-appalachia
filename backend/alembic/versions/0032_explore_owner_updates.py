"""add moderated explore owner updates

Revision ID: 0032_explore_updates
Revises: 0031_claim_verification
"""
from alembic import op
import sqlalchemy as sa

revision="0032_explore_updates"
down_revision="0031_claim_verification"
branch_labels=None
depends_on=None

def upgrade():
    op.add_column("explore_destinations",sa.Column("amenities_json",sa.JSON(),nullable=False,server_default=sa.text("'[]'")))
    op.add_column("explore_destinations",sa.Column("specials_json",sa.JSON(),nullable=False,server_default=sa.text("'[]'")))
    op.add_column("explore_destinations",sa.Column("events_json",sa.JSON(),nullable=False,server_default=sa.text("'[]'")))
    op.create_table("explore_destination_update_requests",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("destination_id",sa.Integer(),sa.ForeignKey("explore_destinations.id"),nullable=False),sa.Column("business_id",sa.Integer(),sa.ForeignKey("businesses.id"),nullable=False),sa.Column("proposed_json",sa.JSON(),nullable=False),sa.Column("status",sa.String(30),nullable=False,server_default="pending"),sa.Column("approved_fields_json",sa.JSON(),nullable=False,server_default=sa.text("'[]'")),sa.Column("admin_notes",sa.Text(),nullable=False,server_default=""),sa.Column("created_at",sa.DateTime(),nullable=False),sa.Column("reviewed_at",sa.DateTime(),nullable=True))
    op.create_index("ix_explore_update_destination","explore_destination_update_requests",["destination_id"])
    op.create_index("ix_explore_update_business","explore_destination_update_requests",["business_id"])
    op.create_index("ix_explore_update_status","explore_destination_update_requests",["status"])

def downgrade():
    op.drop_table("explore_destination_update_requests")
    for column in ["events_json","specials_json","amenities_json"]:op.drop_column("explore_destinations",column)
