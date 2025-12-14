"""update_review_replies_remove_admin_id

Revision ID: 88045939527c
Revises: 9ac1f3f25a63
Create Date: 2025-12-14 12:26:25.197501

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '88045939527c'
down_revision = '9ac1f3f25a63'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the foreign key constraint first
    op.drop_constraint('review_replies_admin_id_fkey', 'review_replies', type_='foreignkey')
    
    # Drop the admin_id column
    op.drop_column('review_replies', 'admin_id')
    
    # Add unique constraint to review_id
    op.create_unique_constraint('uq_review_replies_review_id', 'review_replies', ['review_id'])


def downgrade():
    # Remove unique constraint
    op.drop_constraint('uq_review_replies_review_id', 'review_replies', type_='unique')
    
    # Add back admin_id column
    op.add_column('review_replies', sa.Column('admin_id', sa.Integer(), nullable=True))
    
    # Add back foreign key constraint
    op.create_foreign_key('review_replies_admin_id_fkey', 'review_replies', 'users', ['admin_id'], ['user_id'])
