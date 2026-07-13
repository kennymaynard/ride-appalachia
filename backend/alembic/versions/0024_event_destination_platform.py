"""Add event destination metadata, placements, engagement, media, and booking links."""
from alembic import op
import sqlalchemy as sa

revision = "0024_event_destination_platform"
down_revision = "0023_event_discovery"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("events", sa.Column("instagram_url", sa.Text(), nullable=False, server_default="")); op.add_column("events", sa.Column("difficulty", sa.String(40), nullable=False, server_default="not_listed")); op.add_column("events", sa.Column("family_friendly", sa.Boolean())); op.add_column("events", sa.Column("estimated_attendance", sa.Integer())); op.add_column("events", sa.Column("trail_area_slug", sa.String(120), nullable=False, server_default="")); op.create_index("ix_events_trail_area_slug", "events", ["trail_area_slug"])
    op.add_column("bookings", sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"))); op.create_index("ix_bookings_event_id", "bookings", ["event_id"])
    op.create_table("event_business_placements", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id"), nullable=False), sa.Column("placement", sa.String(40), nullable=False), sa.Column("starts_at", sa.DateTime(), nullable=False), sa.Column("ends_at", sa.DateTime(), nullable=False), sa.Column("status", sa.String(30), nullable=False, server_default="pending"), sa.Column("disclosure_label", sa.String(80), nullable=False, server_default="Sponsored partner"), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()), sa.UniqueConstraint("event_id", "business_id", "placement", name="uq_event_business_placement"))
    for column in ("event_id", "business_id", "placement", "status"): op.create_index(f"ix_event_business_placements_{column}", "event_business_placements", [column])
    op.create_table("event_discussions", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("kind", sa.String(20), nullable=False, server_default="comment"), sa.Column("message", sa.Text(), nullable=False), sa.Column("status", sa.String(30), nullable=False, server_default="pending"), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()))
    for column in ("event_id", "rider_id", "kind", "status"): op.create_index(f"ix_event_discussions_{column}", "event_discussions", [column])
    op.create_table("event_media", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("media_type", sa.String(20), nullable=False), sa.Column("media_url", sa.Text(), nullable=False), sa.Column("caption", sa.String(240), nullable=False, server_default=""), sa.Column("status", sa.String(30), nullable=False, server_default="pending"), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()))
    for column in ("event_id", "rider_id", "media_type", "status"): op.create_index(f"ix_event_media_{column}", "event_media", [column])
    op.create_table("event_invites", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False), sa.Column("rider_id", sa.Integer(), sa.ForeignKey("riders.id"), nullable=False), sa.Column("invite_token", sa.String(80), nullable=False), sa.Column("recipient_email", sa.String(180), nullable=False, server_default=""), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()), sa.UniqueConstraint("invite_token")); op.create_index("ix_event_invites_event_id", "event_invites", ["event_id"]); op.create_index("ix_event_invites_rider_id", "event_invites", ["rider_id"]); op.create_index("ix_event_invites_invite_token", "event_invites", ["invite_token"], unique=True)

def downgrade() -> None:
    for table in ("event_invites", "event_media", "event_discussions", "event_business_placements"): op.drop_table(table)
    op.drop_index("ix_bookings_event_id", table_name="bookings"); op.drop_column("bookings", "event_id"); op.drop_index("ix_events_trail_area_slug", table_name="events")
    for column in ("trail_area_slug", "estimated_attendance", "family_friendly", "difficulty", "instagram_url"): op.drop_column("events", column)
