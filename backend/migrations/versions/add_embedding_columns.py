"""Add embedding columns for AI chatbot RAG

Revision ID: add_embedding_columns
Revises: aead2789f30e_merge_chat_and_views
Create Date: 2024-12-16
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_embedding_columns'
down_revision = 'aead2789f30e_merge_chat_and_views'
branch_labels = None
depends_on = None


def upgrade():
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Add embedding column to products table
    op.execute('ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(384)')
    
    # Add content_embedding column to store_info table
    op.execute('ALTER TABLE store_info ADD COLUMN IF NOT EXISTS content_embedding vector(384)')


def downgrade():
    # Remove embedding columns
    op.execute('ALTER TABLE products DROP COLUMN IF EXISTS embedding')
    op.execute('ALTER TABLE store_info DROP COLUMN IF EXISTS content_embedding')
