"""add review replies table

Revision ID: add_review_replies
Revises: add_reviews_table
Create Date: 2024-12-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_review_replies'
down_revision = 'add_reviews_table'
branch_labels = None
depends_on = None


def upgrade():
    # Create review_replies table
    op.create_table('review_replies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('reply', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('review_id')
    )
    op.create_index(op.f('ix_review_replies_review_id'), 'review_replies', ['review_id'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_review_replies_review_id'), table_name='review_replies')
    op.drop_table('review_replies')
