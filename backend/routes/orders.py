from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order, OrderDetail, Cart, CartItem

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders]), 200

@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)
    
    if order.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(order.to_dict()), 200

@orders_bp.route('/create', methods=['POST'])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    cart = Cart.query.filter_by(user_id=user_id, status='active').first()
    if not cart or not cart.cart_items:
        return jsonify({'error': 'Giỏ hàng trống'}), 400
    
    total = 0
    order = Order(
        user_id=user_id,
        hoten=data.get('hoten'),
        sdt=data.get('sdt'),
        diachi_giaohang=data.get('diachi_giaohang'),
        payment_method=data.get('payment_method', 'COD'),
        trangthai='pending'
    )
    
    db.session.add(order)
    db.session.flush()
    
    for item in cart.cart_items:
        product = item.product
        unit_price = product.gia_ban
        line_total = unit_price * item.quantity
        total += line_total
        
        order_detail = OrderDetail(
            order_id=order.id,
            product_id=item.products_id,
            unit_price=unit_price,
            quantity=item.quantity,
            line_total=line_total
        )
        db.session.add(order_detail)
    
    order.tongdon = total
    cart.status = 'completed'
    
    db.session.commit()
    
    return jsonify({'message': 'Đặt hàng thành công', 'order': order.to_dict()}), 201
