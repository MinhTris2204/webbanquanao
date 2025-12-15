from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import bcrypt
from pgvector.sqlalchemy import Vector

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    taikhoan = db.Column(db.String(50), unique=True, nullable=False)
    matkhau = db.Column(db.String(225), nullable=False)
    hoten = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    sdt = db.Column(db.String(20))
    diachi = db.Column(db.String(225))
    role = db.Column(db.Enum('admin', 'customer', name='role_enum'), default='customer')
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    carts = db.relationship('Cart', backref='user', lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='user', lazy=True)
    
    def set_password(self, password):
        self.matkhau = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.matkhau.encode('utf-8'))
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'taikhoan': self.taikhoan,
            'hoten': self.hoten,
            'email': self.email,
            'sdt': self.sdt,
            'diachi': self.diachi,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Product(db.Model):
    __tablename__ = 'products'
    
    products_id = db.Column(db.Integer, primary_key=True)
    ten_san_pham = db.Column(db.String(200), nullable=False)
    gia_ban = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    loai = db.Column(db.String(100), nullable=False)  # Loại sản phẩm (quần, áo, ...)
    mo_ta = db.Column(db.Text)
    size = db.Column(db.String(50))
    chat_lieu = db.Column(db.String(100))
    gioi_tinh = db.Column(db.Enum('Nam', 'Nữ', 'Unisex', name='gioi_tinh_enum'), default='Unisex')
    hinh_anh = db.Column(db.Text)  # Changed to Text to support base64 images
    trang_thai = db.Column(db.Enum('Con_hang', 'Het_hang', 'Ngung_ban', name='trang_thai_enum'), default='Con_hang')
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    embedding = db.Column(Vector(384))  # pgvector for product search
    
    cart_items = db.relationship('CartItem', backref='product', lazy=True)
    order_details = db.relationship('OrderDetail', backref='product', lazy=True)
    
    def to_dict(self, include_promotion=True, include_rating=True):
        result = {
            'products_id': self.products_id,
            'ten_san_pham': self.ten_san_pham,
            'gia_ban': float(self.gia_ban) if self.gia_ban else None,
            'loai': self.loai,
            'mo_ta': self.mo_ta,
            'size': self.size,
            'chat_lieu': self.chat_lieu,
            'gioi_tinh': self.gioi_tinh,
            'hinh_anh': self.hinh_anh,
            'trang_thai': self.trang_thai,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_promotion:
            active_promotion = self.get_active_promotion()
            if active_promotion:
                result['promotion'] = {
                    'id': active_promotion.id,
                    'discount_type': active_promotion.discount_type,
                    'discount_value': float(active_promotion.discount_value),
                    'promotional_price': active_promotion.calculate_promotional_price(self.gia_ban),
                    'start_date': active_promotion.start_date.isoformat() if active_promotion.start_date else None,
                    'end_date': active_promotion.end_date.isoformat() if active_promotion.end_date else None
                }
            else:
                result['promotion'] = None
        
        if include_rating:
            rating_info = self.get_rating_info()
            if rating_info:
                result['rating'] = rating_info
        
        return result
    
    def get_rating_info(self):
        """Get average rating and review count for this product"""
        from sqlalchemy import func
        # Check if Review model exists to avoid circular import
        try:
            # Query reviews for this product
            result = db.session.execute(
                db.text("""
                    SELECT 
                        AVG(rating) as average_rating,
                        COUNT(id) as review_count
                    FROM reviews
                    WHERE product_id = :product_id
                """),
                {'product_id': self.products_id}
            ).first()
            
            if result and result.review_count > 0:
                return {
                    'average_rating': round(float(result.average_rating), 1),
                    'review_count': result.review_count
                }
        except Exception as e:
            # If reviews table doesn't exist or any error, return None
            pass
        
        return None
    
    def get_active_promotion(self):
        """Get currently active promotion for this product"""
        now = datetime.utcnow()
        return Promotion.query.filter(
            Promotion.product_id == self.products_id,
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        ).first()

class Cart(db.Model):
    __tablename__ = 'carts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    cart_items = db.relationship('CartItem', backref='cart', lazy=True, cascade='all, delete-orphan')

class CartItem(db.Model):
    __tablename__ = 'cart_items'
    
    cart_item_id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey('carts.id'), nullable=False)
    products_id = db.Column(db.Integer, db.ForeignKey('products.products_id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    selected_size = db.Column(db.String(10))
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    tongtien = db.Column(db.Numeric(12, 2), nullable=False)
    trangthai = db.Column(db.Enum('cho_xac_nhan', 'hoan_thanh', 'huy', name='order_status_enum'), default='cho_xac_nhan')
    diachi_giaohang = db.Column(db.String(225), nullable=False)
    hoten = db.Column(db.String(100), nullable=False)
    sdt = db.Column(db.String(30), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    payment_token = db.Column(db.String(225))
    voucher_id = db.Column(db.Integer, db.ForeignKey('vouchers.id'))
    discount_amount = db.Column(db.Numeric(12, 2), default=0)
    ghichu = db.Column(db.Text)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    order_details = db.relationship('OrderDetail', backref='order', lazy=True, cascade='all, delete-orphan')
    voucher = db.relationship('Voucher', backref='orders', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'tongtien': float(self.tongtien) if self.tongtien else None,
            'trangthai': self.trangthai,
            'diachi_giaohang': self.diachi_giaohang,
            'hoten': self.hoten,
            'sdt': self.sdt,
            'payment_method': self.payment_method,
            'voucher_id': self.voucher_id,
            'discount_amount': float(self.discount_amount) if self.discount_amount else 0,
            'ghichu': self.ghichu,
            'voucher': self.voucher.to_dict() if self.voucher else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'order_details': [item.to_dict() for item in self.order_details]
        }

class OrderDetail(db.Model):
    __tablename__ = 'order_details'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.products_id'), nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    line_total = db.Column(db.Numeric(12, 2), nullable=False)
    selected_size = db.Column(db.String(10))
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    # Promotion fields - store promotion info at time of purchase
    original_price = db.Column(db.Numeric(12, 2))  # Original price before discount
    discount_percent = db.Column(db.Numeric(5, 2))  # Discount percentage
    was_on_promotion = db.Column(db.Boolean, default=False)  # Was purchased during promotion
    
    def to_dict(self):
        result = {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'unit_price': float(self.unit_price) if self.unit_price else None,
            'quantity': self.quantity,
            'line_total': float(self.line_total) if self.line_total else None,
            'selected_size': self.selected_size,
            'product': self.product.to_dict(include_promotion=False) if self.product else None  # Don't include current promotion
        }
        
        # Add promotion info if item was purchased during promotion
        if self.was_on_promotion and self.original_price and self.discount_percent:
            result['promotion_at_purchase'] = {
                'original_price': float(self.original_price),
                'discount_percent': float(self.discount_percent),
                'was_on_promotion': True
            }
        
        return result

class Voucher(db.Model):
    __tablename__ = 'vouchers'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    discount_type = db.Column(db.Enum('percent', 'fixed', name='discount_type_enum'), nullable=False)
    discount_value = db.Column(db.Numeric(12, 2), nullable=False)
    min_order_value = db.Column(db.Numeric(12, 2), default=0)
    max_discount = db.Column(db.Numeric(12, 2))
    usage_limit = db.Column(db.Integer)
    used_count = db.Column(db.Integer, default=0)
    start_date = db.Column(db.TIMESTAMP, nullable=False)
    end_date = db.Column(db.TIMESTAMP, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'discount_type': self.discount_type,
            'discount_value': float(self.discount_value) if self.discount_value else None,
            'min_order_value': float(self.min_order_value) if self.min_order_value else None,
            'max_discount': float(self.max_discount) if self.max_discount else None,
            'usage_limit': self.usage_limit,
            'used_count': self.used_count,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def is_valid(self, order_total):
        now = datetime.utcnow()
        if not self.is_active:
            return False, "Voucher không còn hiệu lực"
        if now < self.start_date:
            return False, "Voucher chưa đến thời gian sử dụng"
        if now > self.end_date:
            return False, "Voucher đã hết hạn"
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False, "Voucher đã hết lượt sử dụng"
        if order_total < self.min_order_value:
            return False, f"Đơn hàng tối thiểu {float(self.min_order_value):,.0f}₫"
        return True, "Voucher hợp lệ"
    
    def calculate_discount(self, order_total):
        if self.discount_type == 'percent':
            discount = order_total * (float(self.discount_value) / 100)
            if self.max_discount:
                discount = min(discount, float(self.max_discount))
        else:  # fixed
            discount = float(self.discount_value)
        return min(discount, order_total)

class StoreInfo(db.Model):
    __tablename__ = 'store_info'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)  # about_us, privacy_policy, terms, contact, etc.
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    content_embedding = db.Column(Vector(384))  # pgvector for semantic search
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'title': self.title,
            'content': self.content,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Promotion(db.Model):
    __tablename__ = 'promotions'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.products_id'), nullable=False)
    discount_type = db.Column(db.Enum('percent', 'fixed', name='promotion_discount_type_enum'), nullable=False)
    discount_value = db.Column(db.Numeric(12, 2), nullable=False)
    start_date = db.Column(db.TIMESTAMP, nullable=False)
    end_date = db.Column(db.TIMESTAMP, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = db.relationship('Product', backref='promotions', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None,
            'discount_type': self.discount_type,
            'discount_value': float(self.discount_value) if self.discount_value else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def is_currently_active(self):
        """Check if promotion is active based on current time"""
        now = datetime.utcnow()
        return self.is_active and self.start_date <= now <= self.end_date
    
    def calculate_promotional_price(self, original_price):
        """Calculate the promotional price"""
        if not self.is_currently_active():
            return float(original_price)
        
        if self.discount_type == 'percent':
            discount_amount = float(original_price) * (float(self.discount_value) / 100)
            promotional_price = float(original_price) - discount_amount
        else:  # fixed
            promotional_price = float(original_price) - float(self.discount_value)
        
        return max(promotional_price, 0)


class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.products_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    comment = db.Column(db.Text)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = db.relationship('Product', backref='reviews', lazy=True)
    user = db.relationship('User', backref='reviews', lazy=True)
    order = db.relationship('Order', backref='reviews', lazy=True)
    reply = db.relationship('ReviewReply', backref='review', uselist=False, lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        result = {
            'id': self.id,
            'product_id': self.product_id,
            'user_id': self.user_id,
            'order_id': self.order_id,
            'rating': self.rating,
            'comment': self.comment,
            'user_name': self.user.hoten if self.user else 'Anonymous',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if self.reply:
            result['reply'] = self.reply.to_dict()
        
        if self.product:
            result['product'] = {
                'products_id': self.product.products_id,
                'ten_san_pham': self.product.ten_san_pham,
                'gia_ban': float(self.product.gia_ban) if self.product.gia_ban else None,
                'loai': self.product.loai,
                'hinh_anh': self.product.hinh_anh
            }
            
            # Calculate product rating stats
            product_reviews = Review.query.filter_by(product_id=self.product_id).all()
            if product_reviews:
                total_rating = sum(r.rating for r in product_reviews)
                avg_rating = total_rating / len(product_reviews)
                result['product']['rating'] = {
                    'average_rating': round(avg_rating, 1),
                    'total_reviews': len(product_reviews)
                }
        
        return result


class ReviewReply(db.Model):
    __tablename__ = 'review_replies'
    
    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False, unique=True)
    reply = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'review_id': self.review_id,
            'reply': self.reply,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ProductView(db.Model):
    __tablename__ = 'product_views'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)  # Nullable for guest users
    product_id = db.Column(db.Integer, db.ForeignKey('products.products_id'), nullable=False)
    session_id = db.Column(db.String(100))  # For tracking guest users
    view_count = db.Column(db.Integer, default=1)
    last_viewed_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    product = db.relationship('Product', backref='views', lazy=True)
    user = db.relationship('User', backref='product_views', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'session_id': self.session_id,
            'view_count': self.view_count,
            'last_viewed_at': self.last_viewed_at.isoformat() if self.last_viewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ChatConversation(db.Model):
    __tablename__ = 'chat_conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.Enum('active', 'closed', name='conversation_status_enum'), default='active')
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = db.relationship('User', backref='conversations', lazy=True)
    messages = db.relationship('ChatMessage', backref='conversation', lazy=True, cascade='all, delete-orphan', order_by='ChatMessage.created_at')
    
    def to_dict(self, include_messages=False):
        result = {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.hoten if self.customer else 'Unknown',
            'customer_email': self.customer.email if self.customer else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'unread_count': self.get_unread_count(),
            'last_message': self.get_last_message()
        }
        if include_messages:
            result['messages'] = [msg.to_dict() for msg in self.messages]
        return result
    
    def get_unread_count(self):
        return ChatMessage.query.filter_by(
            conversation_id=self.id,
            sender_type='customer',
            is_read=False
        ).count()
    
    def get_last_message(self):
        last_msg = ChatMessage.query.filter_by(conversation_id=self.id).order_by(ChatMessage.created_at.desc()).first()
        if last_msg:
            return {
                'content': last_msg.content[:50] + '...' if len(last_msg.content) > 50 else last_msg.content,
                'sender_type': last_msg.sender_type,
                'created_at': last_msg.created_at.isoformat() if last_msg.created_at else None
            }
        return None


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('chat_conversations.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    sender_type = db.Column(db.Enum('customer', 'admin', name='sender_type_enum'), nullable=False)
    content = db.Column(db.Text)
    message_type = db.Column(db.String(20), default='text')  # text, image
    image_url = db.Column(db.Text)  # Base64 image or URL
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    sender = db.relationship('User', backref='sent_messages', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'sender_id': self.sender_id,
            'sender_type': self.sender_type,
            'sender_name': self.sender.hoten if self.sender else 'Unknown',
            'content': self.content,
            'message_type': self.message_type or 'text',
            'image_url': self.image_url,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
