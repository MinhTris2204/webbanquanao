"""add store info table

Revision ID: add_store_info_001
Revises: 5989ad64fa6b
Create Date: 2024-12-14

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = 'add_store_info_001'
down_revision = '5989ad64fa6b'
branch_labels = None
depends_on = None


def upgrade():
    # Create store_info table
    op.create_table('store_info',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('content_embedding', Vector(384), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    
    # Insert default store info
    op.execute("""
        INSERT INTO store_info (key, title, content, is_active, created_at, updated_at) VALUES
        ('about_us', 'Giới thiệu về cửa hàng', 'Chúng tôi là cửa hàng thời trang uy tín, chuyên cung cấp các sản phẩm quần áo chất lượng cao với giá cả hợp lý.', true, NOW(), NOW()),
        ('privacy_policy', 'Chính sách bảo mật', 'Chúng tôi cam kết bảo mật thông tin cá nhân của khách hàng theo quy định pháp luật.', true, NOW(), NOW()),
        ('terms_conditions', 'Điều khoản và điều kiện', 'Khi sử dụng dịch vụ của chúng tôi, bạn đồng ý với các điều khoản và điều kiện sau.', true, NOW(), NOW()),
        ('shipping_policy', 'Chính sách vận chuyển', 'Chúng tôi hỗ trợ giao hàng toàn quốc với thời gian từ 2-5 ngày làm việc.', true, NOW(), NOW()),
        ('return_policy', 'Chính sách đổi trả', 'Sản phẩm có thể đổi trả trong vòng 7 ngày kể từ ngày nhận hàng.', true, NOW(), NOW()),
        ('contact_info', 'Thông tin liên hệ', 'Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM\nĐiện thoại: 0123456789\nEmail: contact@store.com', true, NOW(), NOW())
    """)


def downgrade():
    op.drop_table('store_info')
