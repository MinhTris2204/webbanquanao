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
        bai=data.get('bai'),
        mo_ta=data.get('mo_ta'),
        size=data.get('size'),
        chat_lieu=data.get('chat_lieu'),
        gia_tien=data.get('gia_tien'),
        hinh_anh=data.get('hinh_anh'),
        trang_thai=data.get('trang_thai', 'available')
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
    
    pagination = Order.query.order_by(Order.created_at.desc()).paginate(
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
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200
