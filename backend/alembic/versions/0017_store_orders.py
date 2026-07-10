"""Add store order tracking."""

from alembic import op
import sqlalchemy as sa


revision = "0017_store_orders"
down_revision = "0016_soft_deleted_businesses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "store_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stripe_checkout_session_id", sa.String(length=180), nullable=False),
        sa.Column("stripe_payment_intent_id", sa.String(length=180), nullable=False, server_default=""),
        sa.Column("customer_name", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("customer_email", sa.String(length=180), nullable=False, server_default=""),
        sa.Column("customer_phone", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("total_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="usd"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="paid"),
        sa.Column("items", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("shipping_name", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("shipping_address", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("printify_submitted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("printify_order_id", sa.String(length=180), nullable=False, server_default=""),
        sa.Column("printify_message", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_checkout_session_id", name="uq_store_orders_stripe_checkout_session_id"),
    )
    op.create_index(op.f("ix_store_orders_created_at"), "store_orders", ["created_at"], unique=False)
    op.create_index(op.f("ix_store_orders_customer_email"), "store_orders", ["customer_email"], unique=False)
    op.create_index(op.f("ix_store_orders_printify_order_id"), "store_orders", ["printify_order_id"], unique=False)
    op.create_index(op.f("ix_store_orders_printify_submitted"), "store_orders", ["printify_submitted"], unique=False)
    op.create_index(op.f("ix_store_orders_status"), "store_orders", ["status"], unique=False)
    op.create_index(op.f("ix_store_orders_stripe_checkout_session_id"), "store_orders", ["stripe_checkout_session_id"], unique=True)
    op.create_index(op.f("ix_store_orders_stripe_payment_intent_id"), "store_orders", ["stripe_payment_intent_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_store_orders_stripe_payment_intent_id"), table_name="store_orders")
    op.drop_index(op.f("ix_store_orders_stripe_checkout_session_id"), table_name="store_orders")
    op.drop_index(op.f("ix_store_orders_status"), table_name="store_orders")
    op.drop_index(op.f("ix_store_orders_printify_submitted"), table_name="store_orders")
    op.drop_index(op.f("ix_store_orders_printify_order_id"), table_name="store_orders")
    op.drop_index(op.f("ix_store_orders_customer_email"), table_name="store_orders")
    op.drop_index(op.f("ix_store_orders_created_at"), table_name="store_orders")
    op.drop_table("store_orders")
