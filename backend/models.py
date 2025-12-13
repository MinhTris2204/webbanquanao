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
    
    def to_dict(self):
        return {
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
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    tongtien = db.Column(db.Numeric(12, 2), nullable=False)
    trangthai = db.Column(db.Enum('cho_xac_nhan', 'dang_giao', 'hoan_thanh', 'huy', name='order_status_enum'), default='cho_xac_nhan')
    diachi_giaohang = db.Column(db.String(225), nullable=False)
    hoten = db.Column(db.String(100), nullable=False)
    sdt = db.Column(db.String(30), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    payment_token = db.Column(db.String(225))
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    order_details = db.relationship('OrderDetail', backref='order', lazy=True, cascade='all, delete-orphan')
    
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
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'unit_price': float(self.unit_price) if self.unit_price else None,
            'quantity': self.quantity,
            'line_total': float(self.line_total) if self.line_total else None,
            'product': self.product.to_dict() if self.product else None
        }
