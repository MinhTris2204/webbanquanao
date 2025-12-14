from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Product, Order
from functools import wraps

admin_bp = Blueprint('admin', __name__)

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper

@admin_bp.route('/products', methods=['POST'])
@admin_required
def create_product():
    data = request.get_json()
    
    product = Product(
        ten_san_pham=data.get('ten_san_pham'),
        gia_ban=data.get('gia_ban'),
        loai=data.get('loai'),
        mo_ta=data.get('mo_ta'),
        size=data.get('size'),
        chat_lieu=data.get('chat_lieu'),
        gioi_tinh=data.get('gioi_tinh', 'Unisex'),
        hinh_anh=data.get('hinh_anh'),
        trang_thai=data.get('trang_thai', 'Con_hang')
    )
    
    db.session.add(product)
    db.session.commit()
    
    return jsonify({'message': 'Tạo sản phẩm thành công', 'product': product.to_dict()}), 201

@admin_bp.route('/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    for key, value in data.items():
        if hasattr(product, key):
            setattr(product, key, value)
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật sản phẩm thành công', 'product': product.to_dict()}), 200

@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({'message': 'Xóa sản phẩm thành công'}), 200

@admin_bp.route('/orders', methods=['GET'])
@admin_required
def get_all_orders():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status_filter = request.args.get('status', '')
    search = request.args.get('search', '')
    
    query = Order.query
    
    # Status filter
    if status_filter:
        query = query.filter(Order.trangthai == status_filter)
    
    # Search filter (search by customer name, phone, or order ID)
    if search:
        query = query.filter(
            db.or_(
                Order.hoten.ilike(f'%{search}%'),
                Order.sdt.ilike(f'%{search}%'),
                db.cast(Order.id, db.String).ilike(f'%{search}%')
            )
        )
    
    pagination = query.order_by(Order.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'orders': [order.to_dict() for order in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    
    order.trangthai = data.get('trangthai')
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật trạng thái đơn hàng thành công', 'order': order.to_dict()}), 200

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    role_filter = request.args.get('role', '')
    
    query = User.query
    
    # Search filter
    if search:
        query = query.filter(
            db.or_(
                User.taikhoan.ilike(f'%{search}%'),
                User.hoten.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    # Role filter
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'users': [user.to_dict() for user in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    # Update allowed fields
    if 'hoten' in data:
        user.hoten = data['hoten']
    if 'email' in data:
        user.email = data['email']
    if 'sdt' in data:
        user.sdt = data['sdt']
    if 'diachi' in data:
        user.diachi = data['diachi']
    if 'role' in data:
        user.role = data['role']
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật người dùng thành công', 'user': user.to_dict()}), 200

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    current_user_id = int(get_jwt_identity())
    
    # Prevent deleting yourself
    if user_id == current_user_id:
        return jsonify({'error': 'Không thể xóa tài khoản của chính mình'}), 400
    
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Xóa người dùng thành công'}), 200

@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    
    # Check if username or email already exists
    if User.query.filter_by(taikhoan=data.get('taikhoan')).first():
        return jsonify({'error': 'Tài khoản đã tồn tại'}), 400
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email đã tồn tại'}), 400
    
    user = User(
        taikhoan=data.get('taikhoan'),
        hoten=data.get('hoten'),
        email=data.get('email'),
        sdt=data.get('sdt'),
        diachi=data.get('diachi'),
        role=data.get('role', 'customer')
    )
    user.set_password(data.get('matkhau'))
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Tạo người dùng thành công', 'user': user.to_dict()}), 201

@admin_bp.route('/users/<int:user_id>/password', methods=['PUT'])
@admin_required
def change_user_password(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    new_password = data.get('matkhau')
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400
    
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Đổi mật khẩu thành công'}), 200
