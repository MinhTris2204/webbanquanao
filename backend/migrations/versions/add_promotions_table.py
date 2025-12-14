"""add promotions table

Revision ID: add_promotions_001
Revises: add_store_info_001
Create Date: 2024-12-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_promotions_001'
down_revision = 'add_store_info_001'
branch_labels = None
depends_on = None


def upgrade():
    # Create promotions table (enum will be created automatically by SQLAlchemy)
    op.create_table('promotions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('discount_type', postgresql.ENUM('percent', 'fixed', name='promotion_discount_type_enum'), nullable=False),
        sa.Column('discount_value', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('start_date', sa.TIMESTAMP(), nullable=False),
        sa.Column('end_date', sa.TIMESTAMP(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, default=sa.func.now()),
        sa.ForeignKeyConstraint(['product_id'], ['products.products_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_promotions_product_id', 'promotions', ['product_id'])
    op.create_index('idx_promotions_dates', 'promotions', ['start_date', 'end_date'])
    op.create_index('idx_promotions_active', 'promotions', ['is_active'])


def downgrade():
    op.drop_index('idx_promotions_active', table_name='promotions')
    op.drop_index('idx_promotions_dates', table_name='promotions')
    op.drop_index('idx_promotions_product_id', table_name='promotions')
    op.drop_table('promotions')
    op.execute('DROP TYPE promotion_discount_type_enum')
