"""Add chat tables

Revision ID: add_chat_tables
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_chat_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create conversation_status_enum
    conversation_status_enum = sa.Enum('active', 'closed', name='conversation_status_enum')
    conversation_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Create sender_type_enum
    sender_type_enum = sa.Enum('customer', 'admin', name='sender_type_enum')
    sender_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Create chat_conversations table
    op.create_table('chat_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('active', 'closed', name='conversation_status_enum'), nullable=True, server_default='active'),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create chat_messages table
    op.create_table('chat_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('sender_type', sa.Enum('customer', 'admin', name='sender_type_enum'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['chat_conversations.id'], ),
        sa.ForeignKeyConstraint(['sender_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_chat_conversations_customer_id', 'chat_conversations', ['customer_id'])
    op.create_index('ix_chat_conversations_status', 'chat_conversations', ['status'])
    op.create_index('ix_chat_messages_conversation_id', 'chat_messages', ['conversation_id'])
    op.create_index('ix_chat_messages_is_read', 'chat_messages', ['is_read'])


def downgrade():
    op.drop_index('ix_chat_messages_is_read', table_name='chat_messages')
    op.drop_index('ix_chat_messages_conversation_id', table_name='chat_messages')
    op.drop_index('ix_chat_conversations_status', table_name='chat_conversations')
    op.drop_index('ix_chat_conversations_customer_id', table_name='chat_conversations')
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')
    
    # Drop enums
    sa.Enum(name='sender_type_enum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='conversation_status_enum').drop(op.get_bind(), checkfirst=True)
