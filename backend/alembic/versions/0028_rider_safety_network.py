"""Add trusted circles, contacts, checkpoints, alerts, and deliveries."""
from alembic import op
import sqlalchemy as sa

revision = "0028_rider_safety_network"
down_revision = "0027_rider_safety_tracking"
branch_labels = None
depends_on = None


def indexes(table: str, columns: list[str]) -> None:
    for column in columns:
        op.create_index(f"ix_{table}_{column}", table, [column])


def upgrade() -> None:
    op.create_table("rider_circles", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("name", sa.String(120), nullable=False, server_default="Trusted riders"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    indexes("rider_circles", ["rider_id"])
    op.create_table("rider_circle_members", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("circle_id", sa.Integer(), sa.ForeignKey("rider_circles.id"), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("email", sa.String(180), nullable=False, server_default=""), sa.Column("phone", sa.String(40), nullable=False, server_default=""), sa.Column("status", sa.String(30), nullable=False, server_default="invited"), sa.Column("invite_token_hash", sa.String(64), unique=True), sa.Column("invite_expires_at", sa.DateTime(timezone=True)), sa.Column("accepted_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    indexes("rider_circle_members", ["circle_id", "status", "invite_token_hash"])
    op.create_table("tracking_emergency_contacts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("email", sa.String(180), nullable=False, server_default=""), sa.Column("phone", sa.String(40), nullable=False, server_default=""), sa.Column("sms_opt_in", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("email_opt_in", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    indexes("tracking_emergency_contacts", ["rider_id"])
    op.create_table("tracking_checkpoints", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("session_id", sa.Integer(), sa.ForeignKey("tracking_sessions.id"), nullable=False), sa.Column("name", sa.String(160), nullable=False), sa.Column("due_at", sa.DateTime(timezone=True), nullable=False), sa.Column("grace_minutes", sa.Integer(), nullable=False, server_default="15"), sa.Column("arrived_at", sa.DateTime(timezone=True)), sa.Column("alert_status", sa.String(30), nullable=False, server_default="scheduled"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    indexes("tracking_checkpoints", ["session_id", "due_at", "alert_status"])
    op.create_table("tracking_alerts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("session_id", sa.Integer(), sa.ForeignKey("tracking_sessions.id"), nullable=False), sa.Column("checkpoint_id", sa.Integer(), sa.ForeignKey("tracking_checkpoints.id")), sa.Column("alert_type", sa.String(40), nullable=False), sa.Column("status", sa.String(30), nullable=False, server_default="pending"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.UniqueConstraint("checkpoint_id", "alert_type", name="uq_tracking_checkpoint_alert"))
    indexes("tracking_alerts", ["session_id", "checkpoint_id", "alert_type", "status"])
    op.create_table("tracking_notification_deliveries", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("alert_id", sa.Integer(), sa.ForeignKey("tracking_alerts.id"), nullable=False), sa.Column("contact_id", sa.Integer(), sa.ForeignKey("tracking_emergency_contacts.id")), sa.Column("channel", sa.String(20), nullable=False), sa.Column("destination", sa.String(180), nullable=False, server_default=""), sa.Column("status", sa.String(30), nullable=False), sa.Column("provider_message", sa.Text(), nullable=False, server_default=""), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    indexes("tracking_notification_deliveries", ["alert_id", "status"])


def downgrade() -> None:
    for table in ("tracking_notification_deliveries", "tracking_alerts", "tracking_checkpoints", "tracking_emergency_contacts", "rider_circle_members", "rider_circles"):
        op.drop_table(table)
