"""merge review replies

Revision ID: 9ac1f3f25a63
Revises: 5d9f0b465513, add_review_replies
Create Date: 2025-12-14 09:57:00.364194

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9ac1f3f25a63'
down_revision = ('5d9f0b465513', 'add_review_replies')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
