"""merge_chat_and_views

Revision ID: aead2789f30e
Revises: add_chat_tables, add_product_views
Create Date: 2025-12-15 15:48:48.341269

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'aead2789f30e'
down_revision = ('add_chat_tables', 'add_product_views')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
