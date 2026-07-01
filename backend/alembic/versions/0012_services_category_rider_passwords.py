"""Add services category and rider passwords."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0012_services_category_rider_passwords"
down_revision = "0011_business_login_passcodes"
branch_labels = None
depends_on = None


OLD_CATEGORY_VALUES = "'lodging','food','rentals','repairs','fuel','deals'"
NEW_CATEGORY_VALUES = "'lodging','food','rentals','repairs','fuel','services','deals'"


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not column_exists("riders", "password_hash"):
        op.add_column("riders", sa.Column("password_hash", sa.Text(), nullable=False, server_default=""))

    if op.get_context().dialect.name != "postgresql":
        return

    inspector = inspect(op.get_bind())
    constraint_names = {
        constraint["name"]
        for constraint in inspector.get_check_constraints("businesses")
    }
    if "ck_business_category" in constraint_names:
        op.drop_constraint("ck_business_category", "businesses", type_="check")
    op.create_check_constraint(
        "ck_business_category",
        "businesses",
        f"category IN ({NEW_CATEGORY_VALUES})",
    )


def downgrade() -> None:
    if op.get_context().dialect.name == "postgresql":
        inspector = inspect(op.get_bind())
        constraint_names = {
            constraint["name"]
            for constraint in inspector.get_check_constraints("businesses")
        }
        op.execute("UPDATE businesses SET category = 'repairs' WHERE category = 'services'")
        if "ck_business_category" in constraint_names:
            op.drop_constraint("ck_business_category", "businesses", type_="check")
        op.create_check_constraint(
            "ck_business_category",
            "businesses",
            f"category IN ({OLD_CATEGORY_VALUES})",
        )

    if column_exists("riders", "password_hash"):
        op.drop_column("riders", "password_hash")
