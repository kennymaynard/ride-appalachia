"""Add merchant of record booking marketplace fields."""

from alembic import op
import sqlalchemy as sa


revision = "0018_marketplace_merchant_of_record"
down_revision = "0017_store_orders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("stripe_connect_charges_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("businesses", sa.Column("stripe_connect_payouts_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("businesses", sa.Column("stripe_connect_business_name", sa.String(length=180), nullable=False, server_default=""))
    op.add_column("businesses", sa.Column("stripe_connect_business_email", sa.String(length=180), nullable=False, server_default=""))
    op.add_column("businesses", sa.Column("partner_tax_agreement_accepted", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("businesses", sa.Column("partner_tax_agreement_accepted_at", sa.DateTime(), nullable=True))
    op.create_index(op.f("ix_businesses_stripe_connect_charges_enabled"), "businesses", ["stripe_connect_charges_enabled"], unique=False)
    op.create_index(op.f("ix_businesses_stripe_connect_payouts_enabled"), "businesses", ["stripe_connect_payouts_enabled"], unique=False)
    op.create_index(op.f("ix_businesses_partner_tax_agreement_accepted"), "businesses", ["partner_tax_agreement_accepted"], unique=False)

    op.add_column("bookable_listings", sa.Column("tax_rate_basis_points", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("cleaning_fee_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("taxes_cents", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("bookings", "taxes_cents")
    op.drop_column("bookings", "cleaning_fee_cents")
    op.drop_column("bookable_listings", "tax_rate_basis_points")
    op.drop_index(op.f("ix_businesses_partner_tax_agreement_accepted"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_stripe_connect_payouts_enabled"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_stripe_connect_charges_enabled"), table_name="businesses")
    op.drop_column("businesses", "partner_tax_agreement_accepted_at")
    op.drop_column("businesses", "partner_tax_agreement_accepted")
    op.drop_column("businesses", "stripe_connect_business_email")
    op.drop_column("businesses", "stripe_connect_business_name")
    op.drop_column("businesses", "stripe_connect_payouts_enabled")
    op.drop_column("businesses", "stripe_connect_charges_enabled")
