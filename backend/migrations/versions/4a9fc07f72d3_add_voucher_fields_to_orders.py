"""add voucher fields to orders

Revision ID: 4a9fc07f72d3
Revises: 5989ad64fa6b
Create Date: 2025-12-13 14:30:11.854034

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4a9fc07f72d3'
down_revision = '5989ad64fa6b'
branch_labels = None
depends_on = None


def upgrade():
    # Add voucher_id and discount_amount columns to orders table
    op.add_column('orders', sa.Column('voucher_id', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=True))
    op.create_foreign_key('fk_orders_voucher_id', 'orders', 'vouchers', ['voucher_id'], ['id'])


def downgrade():
    # Remove foreign key and columns
    op.drop_constraint('fk_orders_voucher_id', 'orders', type_='foreignkey')
    op.drop_column('orders', 'discount_amount')
    op.drop_column('orders', 'voucher_id')
