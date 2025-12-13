from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order, OrderDetail, Cart, CartItem, Voucher
from datetime import datetime

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
    
    # Calculate total first
    total = 0
    for item in cart.cart_items:
        product = item.product
        unit_price = product.gia_ban
        line_total = unit_price * item.quantity
        total += line_total
    
    # Apply voucher if provided
    voucher_id = None
    discount_amount = 0
    ma_voucher = data.get('ma_voucher')
    
    if ma_voucher:
        voucher = Voucher.query.filter_by(code=ma_voucher).first()
        if voucher:
            # Validate voucher
            now = datetime.utcnow()
            if voucher.is_active and voucher.start_date <= now <= voucher.end_date:
                if (voucher.usage_limit is None or voucher.used_count < voucher.usage_limit) and total >= voucher.min_order_value:
                    # Calculate discount
                    if voucher.discount_type == 'percent':
                        discount_amount = (total * float(voucher.discount_value)) / 100
                        if voucher.max_discount:
                            discount_amount = min(discount_amount, float(voucher.max_discount))
                    else:
                        discount_amount = float(voucher.discount_value)
                    
                    voucher_id = voucher.id
                    # Increase used count
                    voucher.used_count += 1
    
    final_total = max(0, total - discount_amount)
    
    # Create order with total
    order = Order(
        user_id=user_id,
        hoten=data.get('hoten'),
        sdt=data.get('sdt'),
        diachi_giaohang=data.get('diachi_giaohang'),
        payment_method=data.get('payment_method', 'COD'),
        trangthai='cho_xac_nhan',
        tongtien=final_total,
        voucher_id=voucher_id,
        discount_amount=discount_amount
    )
    
    db.session.add(order)
    db.session.flush()
    
    # Create order details
    for item in cart.cart_items:
        product = item.product
        unit_price = product.gia_ban
        line_total = unit_price * item.quantity
        
        order_detail = OrderDetail(
            order_id=order.id,
            product_id=item.products_id,
            unit_price=unit_price,
            quantity=item.quantity,
            line_total=line_total,
            selected_size=item.selected_size
        )
        db.session.add(order_detail)
    
    cart.status = 'completed'
    
    db.session.commit()
    
    return jsonify({'message': 'Đặt hàng thành công', 'order': order.to_dict()}), 201
