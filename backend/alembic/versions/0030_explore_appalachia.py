"""Add Explore Appalachia destinations and moderation records."""
from alembic import op
import sqlalchemy as sa

revision = "0030_explore_appalachia"
down_revision = "0029_search_only_chain_businesses"
branch_labels = None
depends_on = None


def indexes(table: str, columns: tuple[str, ...]) -> None:
    for column in columns:
        op.create_index(f"ix_{table}_{column}", table, [column])


def upgrade() -> None:
    op.create_table(
        "explore_destinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(180), nullable=False), sa.Column("slug", sa.String(200), nullable=False, unique=True),
        sa.Column("category", sa.String(60), nullable=False), sa.Column("short_description", sa.String(360), nullable=False, server_default=""),
        sa.Column("full_description", sa.Text(), nullable=False, server_default=""), sa.Column("address", sa.String(240), nullable=False, server_default=""),
        sa.Column("city", sa.String(120), nullable=False, server_default=""), sa.Column("county", sa.String(120), nullable=False, server_default=""),
        sa.Column("state", sa.String(2), nullable=False, server_default=""), sa.Column("postal_code", sa.String(20), nullable=False, server_default=""),
        sa.Column("latitude", sa.Float()), sa.Column("longitude", sa.Float()), sa.Column("phone", sa.String(40), nullable=False, server_default=""),
        sa.Column("website", sa.Text(), nullable=False, server_default=""), sa.Column("email", sa.String(180), nullable=False, server_default=""),
        sa.Column("hours_json", sa.JSON(), nullable=False, server_default="{}"), sa.Column("admission_cost", sa.String(120), nullable=False, server_default=""),
        sa.Column("parking_info", sa.Text(), nullable=False, server_default=""), sa.Column("accessibility_info", sa.Text(), nullable=False, server_default=""),
        sa.Column("pet_policy", sa.Text(), nullable=False, server_default=""), sa.Column("seasonal_info", sa.Text(), nullable=False, server_default=""),
        sa.Column("family_friendly", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("veteran_owned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("free_admission", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("indoor", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("outdoor", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("image_url", sa.Text(), nullable=False, server_default=""), sa.Column("image_urls", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("submitted_by_rider_id", sa.Integer(), sa.ForeignKey("riders.id")), sa.Column("claimed_by_business_id", sa.Integer(), sa.ForeignKey("businesses.id")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    indexes("explore_destinations", ("name", "slug", "category", "city", "county", "state", "latitude", "longitude", "family_friendly", "veteran_owned", "free_admission", "indoor", "outdoor", "featured", "verified", "status", "submitted_by_rider_id", "claimed_by_business_id", "created_at"))
    op.create_table("explore_destination_trails", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("destination_id", sa.Integer(), sa.ForeignKey("explore_destinations.id"), nullable=False), sa.Column("trail_slug", sa.String(180), nullable=False), sa.UniqueConstraint("destination_id", "trail_slug", name="uq_explore_destination_trail"))
    indexes("explore_destination_trails", ("destination_id", "trail_slug"))
    op.create_table("explore_photo_submissions", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("destination_id", sa.Integer(), sa.ForeignKey("explore_destinations.id"), nullable=False), sa.Column("image_url", sa.Text(), nullable=False), sa.Column("submitter_name", sa.String(160), nullable=False, server_default=""), sa.Column("submitter_email", sa.String(180), nullable=False, server_default=""), sa.Column("status", sa.String(30), nullable=False, server_default="pending"), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()))
    indexes("explore_photo_submissions", ("destination_id", "status", "created_at"))
    op.create_table("explore_destination_reports", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("destination_id", sa.Integer(), sa.ForeignKey("explore_destinations.id"), nullable=False), sa.Column("reason", sa.String(80), nullable=False, server_default="incorrect_information"), sa.Column("details", sa.Text(), nullable=False), sa.Column("reporter_email", sa.String(180), nullable=False, server_default=""), sa.Column("status", sa.String(30), nullable=False, server_default="pending"), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()))
    indexes("explore_destination_reports", ("destination_id", "reason", "status", "created_at"))


def downgrade() -> None:
    for table in ("explore_destination_reports", "explore_photo_submissions", "explore_destination_trails", "explore_destinations"):
        op.drop_table(table)
