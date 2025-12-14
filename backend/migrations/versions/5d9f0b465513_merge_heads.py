"""merge heads

Revision ID: 5d9f0b465513
Revises: 9f8b78023606, add_note_to_orders
Create Date: 2025-12-14 08:06:36.204960

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5d9f0b465513'
down_revision = ('9f8b78023606', 'add_note_to_orders')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
