"""add note to orders

Revision ID: add_note_to_orders
Revises: 
Create Date: 2025-12-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_note_to_orders'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add ghichu column to orders table
    op.add_column('orders', sa.Column('ghichu', sa.Text(), nullable=True))


def downgrade():
    # Remove ghichu column from orders table
    op.drop_column('orders', 'ghichu')
