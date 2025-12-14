"""add promotion fields to order details

Revision ID: add_promotion_fields_001
Revises: add_promotions_001
Create Date: 2025-12-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_promotion_fields_001'
down_revision = 'add_promotions_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns to store promotion info at time of purchase
    op.add_column('order_details', sa.Column('original_price', sa.Numeric(12, 2), nullable=True))
    op.add_column('order_details', sa.Column('discount_percent', sa.Numeric(5, 2), nullable=True))
    op.add_column('order_details', sa.Column('was_on_promotion', sa.Boolean(), default=False))


def downgrade():
    op.drop_column('order_details', 'was_on_promotion')
    op.drop_column('order_details', 'discount_percent')
    op.drop_column('order_details', 'original_price')
