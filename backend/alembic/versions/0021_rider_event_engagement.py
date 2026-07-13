"""Add rider event engagement, plans, reminders and analytics."""
from alembic import op
import sqlalchemy as sa

revision = "0021_rider_event_engagement"
down_revision = "0020_security_email_idempotency"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("events", sa.Column("last_checked_at", sa.DateTime(), nullable=True))
    op.add_column("events", sa.Column("reverify_after", sa.DateTime(), nullable=True))
    op.create_index("ix_events_reverify_after", "events", ["reverify_after"])
    op.create_table("rider_saved_events", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()), sa.UniqueConstraint("rider_id", "event_id", name="uq_rider_saved_event"))
    op.create_index("ix_rider_saved_events_rider_id", "rider_saved_events", ["rider_id"]); op.create_index("ix_rider_saved_events_event_id", "rider_saved_events", ["event_id"])
    op.create_table("event_attendees", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("status", sa.String(20), nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()), sa.UniqueConstraint("rider_id", "event_id", name="uq_event_attendee"))
    op.create_index("ix_event_attendees_rider_id", "event_attendees", ["rider_id"]); op.create_index("ix_event_attendees_event_id", "event_attendees", ["event_id"]); op.create_index("ix_event_attendees_status", "event_attendees", ["status"])
    op.create_table("event_ride_plans", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("arrival_date", sa.Date(), nullable=False), sa.Column("departure_date", sa.Date(), nullable=False), sa.Column("items", sa.JSON(), nullable=False, server_default="[]"), sa.Column("notes", sa.Text(), nullable=False, server_default=""), sa.Column("share_token", sa.String(80), nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()), sa.UniqueConstraint("share_token"))
    op.create_index("ix_event_ride_plans_rider_id", "event_ride_plans", ["rider_id"]); op.create_index("ix_event_ride_plans_event_id", "event_ride_plans", ["event_id"]); op.create_index("ix_event_ride_plans_share_token", "event_ride_plans", ["share_token"], unique=True)
    op.create_table("event_reminders", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("days_before", sa.Integer(), nullable=False), sa.Column("sent_at", sa.DateTime(), nullable=True), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()), sa.UniqueConstraint("rider_id", "event_id", "days_before", name="uq_event_reminder"))
    op.create_index("ix_event_reminders_rider_id", "event_reminders", ["rider_id"]); op.create_index("ix_event_reminders_event_id", "event_reminders", ["event_id"])
    op.create_table("event_metrics", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id"), nullable=True), sa.Column("action", sa.String(60), nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()))
    op.create_index("ix_event_metrics_event_id", "event_metrics", ["event_id"]); op.create_index("ix_event_metrics_business_id", "event_metrics", ["business_id"]); op.create_index("ix_event_metrics_action", "event_metrics", ["action"])

def downgrade() -> None:
    for table in ("event_metrics", "event_reminders", "event_ride_plans", "event_attendees", "rider_saved_events"): op.drop_table(table)
    op.drop_index("ix_events_reverify_after", table_name="events"); op.drop_column("events", "reverify_after"); op.drop_column("events", "last_checked_at")
