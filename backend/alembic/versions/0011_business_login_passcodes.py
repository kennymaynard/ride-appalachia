"""Add business login passcodes."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0011_business_login_passcodes"
down_revision = "0010_booking_refunds"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not column_exists("businesses", "owner_passcode_hash"):
        op.add_column(
            "businesses",
            sa.Column("owner_passcode_hash", sa.Text(), nullable=False, server_default=""),
        )


def downgrade() -> None:
    op.drop_column("businesses", "owner_passcode_hash")
