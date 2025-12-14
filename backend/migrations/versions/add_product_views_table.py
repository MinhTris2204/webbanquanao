"""add product views table

Revision ID: add_product_views
Revises: 
Create Date: 2024-12-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_product_views'
down_revision = '88045939527c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('product_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('last_viewed_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['product_id'], ['products.products_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_product_views_user', 'product_views', ['user_id'])
    op.create_index('idx_product_views_session', 'product_views', ['session_id'])
    op.create_index('idx_product_views_product', 'product_views', ['product_id'])
    op.create_index('idx_product_views_last_viewed', 'product_views', ['last_viewed_at'])


def downgrade():
    op.drop_index('idx_product_views_last_viewed', table_name='product_views')
    op.drop_index('idx_product_views_product', table_name='product_views')
    op.drop_index('idx_product_views_session', table_name='product_views')
    op.drop_index('idx_product_views_user', table_name='product_views')
    op.drop_table('product_views')
