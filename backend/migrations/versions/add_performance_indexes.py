"""add performance indexes

Revision ID: add_performance_indexes
Revises: 
Create Date: 2024-01-01 00:00:00.000000

Thêm các indexes để tối ưu performance cho queries thường dùng
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = None  # Cập nhật với revision ID hiện tại
branch_labels = None
depends_on = None


def upgrade():
    """Thêm indexes để tối ưu queries"""
    
    # Products table indexes
    op.create_index(
        'idx_products_category_gender',
        'products',
        ['loai', 'gioi_tinh'],
        unique=False
    )
    
    op.create_index(
        'idx_products_price_status',
        'products',
        ['gia_ban', 'trang_thai'],
        unique=False
    )
    
    op.create_index(
        'idx_products_status',
        'products',
        ['trang_thai'],
        unique=False
    )
    
    op.create_index(
        'idx_products_created',
        'products',
        ['created_at'],
        unique=False
    )
    
    # Orders table indexes
    op.create_index(
        'idx_orders_user_status',
        'orders',
        ['user_id', 'trangthai'],
        unique=False
    )
    
    op.create_index(
        'idx_orders_status_created',
        'orders',
        ['trangthai', 'created_at'],
        unique=False
    )
    
    # Order Details table indexes
    op.create_index(
        'idx_order_details_product',
        'order_details',
        ['product_id', 'order_id'],
        unique=False
    )
    
    # Product Views table indexes
    op.create_index(
        'idx_product_views_user_time',
        'product_views',
        ['user_id', 'last_viewed_at'],
        unique=False
    )
    
    op.create_index(
        'idx_product_views_session_time',
        'product_views',
        ['session_id', 'last_viewed_at'],
        unique=False
    )
    
    op.create_index(
        'idx_product_views_product',
        'product_views',
        ['product_id'],
        unique=False
    )
    
    # Reviews table indexes
    op.create_index(
        'idx_reviews_product_rating',
        'reviews',
        ['product_id', 'rating'],
        unique=False
    )
    
    op.create_index(
        'idx_reviews_user',
        'reviews',
        ['user_id'],
        unique=False
    )
    
    op.create_index(
        'idx_reviews_created',
        'reviews',
        ['created_at'],
        unique=False
    )
    
    # Promotions table indexes
    op.create_index(
        'idx_promotions_product_active',
        'promotions',
        ['product_id', 'is_active'],
        unique=False
    )
    
    op.create_index(
        'idx_promotions_dates',
        'promotions',
        ['start_date', 'end_date'],
        unique=False
    )
    
    # Full-text search index cho products (PostgreSQL)
    # Uncomment nếu sử dụng PostgreSQL
    # op.execute("""
    #     CREATE INDEX idx_products_name_fts 
    #     ON products 
    #     USING gin(to_tsvector('simple', ten_san_pham))
    # """)


def downgrade():
    """Xóa indexes"""
    
    # Products
    op.drop_index('idx_products_category_gender', table_name='products')
    op.drop_index('idx_products_price_status', table_name='products')
    op.drop_index('idx_products_status', table_name='products')
    op.drop_index('idx_products_created', table_name='products')
    
    # Orders
    op.drop_index('idx_orders_user_status', table_name='orders')
    op.drop_index('idx_orders_status_created', table_name='orders')
    
    # Order Details
    op.drop_index('idx_order_details_product', table_name='order_details')
    
    # Product Views
    op.drop_index('idx_product_views_user_time', table_name='product_views')
    op.drop_index('idx_product_views_session_time', table_name='product_views')
    op.drop_index('idx_product_views_product', table_name='product_views')
    
    # Reviews
    op.drop_index('idx_reviews_product_rating', table_name='reviews')
    op.drop_index('idx_reviews_user', table_name='reviews')
    op.drop_index('idx_reviews_created', table_name='reviews')
    
    # Promotions
    op.drop_index('idx_promotions_product_active', table_name='promotions')
    op.drop_index('idx_promotions_dates', table_name='promotions')
    
    # Full-text search
    # op.drop_index('idx_products_name_fts', table_name='products')
