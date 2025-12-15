"""Add image fields to chat_messages

Revision ID: add_image_chat
Revises: aead2789f30e
Create Date: 2025-12-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_image_chat'
down_revision = 'aead2789f30e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('chat_messages', sa.Column('message_type', sa.String(20), server_default='text'))
    op.add_column('chat_messages', sa.Column('image_url', sa.Text(), nullable=True))
    # Make content nullable for image messages
    op.alter_column('chat_messages', 'content', existing_type=sa.Text(), nullable=True)


def downgrade():
    op.drop_column('chat_messages', 'image_url')
    op.drop_column('chat_messages', 'message_type')
    op.alter_column('chat_messages', 'content', existing_type=sa.Text(), nullable=False)
