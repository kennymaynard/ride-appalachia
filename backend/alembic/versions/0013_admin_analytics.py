"""Add admin analytics tracking."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0013_admin_analytics"
down_revision = "0012_services_category_rider_passwords"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def table_exists(table_name: str) -> bool:
    return table_name in inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if not column_exists("riders", "home_location"):
        op.add_column("riders", sa.Column("home_location", sa.String(length=180), nullable=False, server_default=""))
        op.create_index(op.f("ix_riders_home_location"), "riders", ["home_location"], unique=False)
    if not column_exists("riders", "home_latitude"):
        op.add_column("riders", sa.Column("home_latitude", sa.Float(), nullable=True))
    if not column_exists("riders", "home_longitude"):
        op.add_column("riders", sa.Column("home_longitude", sa.Float(), nullable=True))

    if not table_exists("page_visits"):
        op.create_table(
            "page_visits",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("path", sa.String(length=240), nullable=False),
            sa.Column("referrer", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_page_visits_created_at"), "page_visits", ["created_at"], unique=False)
        op.create_index(op.f("ix_page_visits_path"), "page_visits", ["path"], unique=False)


def downgrade() -> None:
    if table_exists("page_visits"):
        op.drop_index(op.f("ix_page_visits_path"), table_name="page_visits")
        op.drop_index(op.f("ix_page_visits_created_at"), table_name="page_visits")
        op.drop_table("page_visits")
    if column_exists("riders", "home_longitude"):
        op.drop_column("riders", "home_longitude")
    if column_exists("riders", "home_latitude"):
        op.drop_column("riders", "home_latitude")
    if column_exists("riders", "home_location"):
        op.drop_index(op.f("ix_riders_home_location"), table_name="riders")
        op.drop_column("riders", "home_location")
