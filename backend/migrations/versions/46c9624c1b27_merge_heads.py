"""merge heads

Revision ID: 46c9624c1b27
Revises: 4a9fc07f72d3, add_promotions_001
Create Date: 2025-12-14 04:28:06.011781

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '46c9624c1b27'
down_revision = ('4a9fc07f72d3', 'add_promotions_001')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
