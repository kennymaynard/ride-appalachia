"""Add soft delete fields to businesses."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0016_soft_deleted_businesses"
down_revision = "0015_trail_condition_reports"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def index_exists(table_name: str, index_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    if not column_exists("businesses", "is_deleted"):
        op.add_column("businesses", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()))
    if not column_exists("businesses", "deleted_at"):
        op.add_column("businesses", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    index_name = op.f("ix_businesses_is_deleted")
    if not index_exists("businesses", index_name):
        op.create_index(index_name, "businesses", ["is_deleted"], unique=False)


def downgrade() -> None:
    index_name = op.f("ix_businesses_is_deleted")
    if index_exists("businesses", index_name):
        op.drop_index(index_name, table_name="businesses")
    if column_exists("businesses", "deleted_at"):
        op.drop_column("businesses", "deleted_at")
    if column_exists("businesses", "is_deleted"):
        op.drop_column("businesses", "is_deleted")
