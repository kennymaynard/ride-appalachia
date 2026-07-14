"""Add consent-based rider safety tracking."""
from alembic import op
import sqlalchemy as sa

revision = "0027_rider_safety_tracking"
down_revision = "0026_business_claim_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("tracking_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False),
        sa.Column("title", sa.String(180), nullable=False, server_default="Off-road ride"),
        sa.Column("expected_return_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("share_token_hash", sa.String(64), nullable=False),
        sa.Column("consent_version", sa.String(20), nullable=False, server_default="2026-07"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    for column in ("rider_id", "expected_return_at", "expires_at", "status", "share_token_hash"):
        op.create_index(f"ix_tracking_sessions_{column}", "tracking_sessions", [column], unique=column == "share_token_hash")
    op.create_table("tracking_location_updates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("tracking_sessions.id"), nullable=False),
        sa.Column("sequence", sa.String(80), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False), sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("accuracy_meters", sa.Float()), sa.Column("heading", sa.Float()), sa.Column("speed_mps", sa.Float()),
        sa.Column("battery_percent", sa.Integer()), sa.Column("device_recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("server_received_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("session_id", "sequence", name="uq_tracking_location_sequence"),
    )
    op.create_index("ix_tracking_location_updates_session_id", "tracking_location_updates", ["session_id"])
    op.create_index("ix_tracking_location_updates_server_received_at", "tracking_location_updates", ["server_received_at"])
    op.create_table("tracking_messages",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("session_id", sa.Integer(), sa.ForeignKey("tracking_sessions.id"), nullable=False),
        sa.Column("message_type", sa.String(30), nullable=False), sa.Column("text", sa.String(240), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_tracking_messages_session_id", "tracking_messages", ["session_id"])
    op.create_index("ix_tracking_messages_message_type", "tracking_messages", ["message_type"])
    op.create_index("ix_tracking_messages_created_at", "tracking_messages", ["created_at"])
    op.create_table("tracking_view_audit", sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("tracking_sessions.id"), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_tracking_view_audit_session_id", "tracking_view_audit", ["session_id"])
    op.create_index("ix_tracking_view_audit_viewed_at", "tracking_view_audit", ["viewed_at"])


def downgrade() -> None:
    op.drop_table("tracking_view_audit")
    op.drop_table("tracking_messages")
    op.drop_table("tracking_location_updates")
    op.drop_table("tracking_sessions")
