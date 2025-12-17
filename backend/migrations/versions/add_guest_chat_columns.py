"""Add guest chat columns

Revision ID: add_guest_chat
Revises: 
Create Date: 2024-12-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_guest_chat'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Them cot guest_session_id va guest_name vao chat_conversations
    op.add_column('chat_conversations', sa.Column('guest_session_id', sa.String(100), nullable=True))
    op.add_column('chat_conversations', sa.Column('guest_name', sa.String(100), nullable=True))
    
    # Cho phep customer_id nullable
    op.alter_column('chat_conversations', 'customer_id',
                    existing_type=sa.Integer(),
                    nullable=True)
    
    # Cho phep sender_id nullable trong chat_messages
    op.alter_column('chat_messages', 'sender_id',
                    existing_type=sa.Integer(),
                    nullable=True)


def downgrade():
    op.drop_column('chat_conversations', 'guest_session_id')
    op.drop_column('chat_conversations', 'guest_name')
    op.alter_column('chat_conversations', 'customer_id',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('chat_messages', 'sender_id',
                    existing_type=sa.Integer(),
                    nullable=False)
