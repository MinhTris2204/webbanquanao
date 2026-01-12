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
    from models import Product
    
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Kiểm tra xem có phải "Mua ngay" không
    buy_now_item = data.get('buy_now_item')
    
    if buy_now_item:
        # Xử lý "Mua ngay" - không dùng giỏ hàng
        product = Product.query.get(buy_now_item['product_id'])
        if not product:
            return jsonify({'error': 'Sản phẩm không tồn tại'}), 404
        
        product_dict = product.to_dict()
        original_price = float(product.gia_ban)
        
        # Check promotion
        has_promotion = product_dict.get('promotion') and product_dict['promotion'].get('promotional_price')
        if has_promotion:
            unit_price = product_dict['promotion']['promotional_price']
            discount_percent = ((original_price - unit_price) / original_price) * 100
            was_on_promotion = True
        else:
            unit_price = original_price
            discount_percent = None
            was_on_promotion = False
        
        quantity = buy_now_item['quantity']
        line_total = unit_price * quantity
        total_float = line_total
        
        # Apply voucher if provided
        voucher_id = None
        discount_amount = 0
        ma_voucher = data.get('ma_voucher')
        
        if ma_voucher:
            voucher = Voucher.query.filter_by(code=ma_voucher).first()
            if voucher:
                now = datetime.utcnow()
                if voucher.is_active and voucher.start_date <= now <= voucher.end_date:
                    min_order = float(voucher.min_order_value) if voucher.min_order_value else 0
                    if (voucher.usage_limit is None or voucher.used_count < voucher.usage_limit) and total_float >= min_order:
                        if voucher.discount_type == 'percent':
                            discount_amount = (total_float * float(voucher.discount_value)) / 100
                            if voucher.max_discount:
                                discount_amount = min(discount_amount, float(voucher.max_discount))
                        else:
                            discount_amount = float(voucher.discount_value)
                        
                        voucher_id = voucher.id
                        voucher.used_count += 1
        
        final_total = max(0, total_float - discount_amount)
        
        # Create order
        order = Order(
            user_id=user_id,
            hoten=data.get('hoten'),
            sdt=data.get('sdt'),
            diachi_giaohang=data.get('diachi_giaohang'),
            payment_method=data.get('payment_method', 'COD'),
            trangthai='cho_xac_nhan',
            tongtien=final_total,
            voucher_id=voucher_id,
            discount_amount=discount_amount,
            ghichu=data.get('ghichu')
        )
        
        db.session.add(order)
        db.session.flush()
        
        # Create order detail
        order_detail = OrderDetail(
            order_id=order.id,
            product_id=product.products_id,
            unit_price=unit_price,
            quantity=quantity,
            original_price=original_price if was_on_promotion else None,
            discount_percent=discount_percent,
            was_on_promotion=was_on_promotion,
            line_total=line_total,
            selected_size=buy_now_item.get('selected_size')
        )
        db.session.add(order_detail)
        db.session.commit()
        
        return jsonify({'message': 'Đặt hàng thành công', 'order': order.to_dict()}), 201
    
    # Xử lý đặt hàng từ giỏ hàng (logic cũ)
    cart = Cart.query.filter_by(user_id=user_id, status='active').first()
    if not cart or not cart.cart_items:
        return jsonify({'error': 'Giỏ hàng trống'}), 400
    
    # Calculate total first (with promotional prices if available)
    total = 0
    for item in cart.cart_items:
        product = item.product
        product_dict = product.to_dict()
        
        # Use promotional price if available, otherwise use regular price
        if product_dict.get('promotion') and product_dict['promotion'].get('promotional_price'):
            unit_price = product_dict['promotion']['promotional_price']
        else:
            unit_price = float(product.gia_ban)
        
        line_total = unit_price * item.quantity
        total += line_total
    
    # Convert total to float for calculations
    total_float = float(total)
    
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
                min_order = float(voucher.min_order_value) if voucher.min_order_value else 0
                if (voucher.usage_limit is None or voucher.used_count < voucher.usage_limit) and total_float >= min_order:
                    # Calculate discount
                    if voucher.discount_type == 'percent':
                        discount_amount = (total_float * float(voucher.discount_value)) / 100
                        if voucher.max_discount:
                            discount_amount = min(discount_amount, float(voucher.max_discount))
                    else:
                        discount_amount = float(voucher.discount_value)
                    
                    voucher_id = voucher.id
                    # Increase used count
                    voucher.used_count += 1
    
    final_total = max(0, total_float - discount_amount)
    
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
        discount_amount=discount_amount,
        ghichu=data.get('ghichu')
    )
    
    db.session.add(order)
    db.session.flush()
    
    # Create order details (with promotional prices if available)
    for item in cart.cart_items:
        product = item.product
        product_dict = product.to_dict()
        original_price = float(product.gia_ban)
        
        # Check if product has active promotion
        has_promotion = product_dict.get('promotion') and product_dict['promotion'].get('promotional_price')
        
        if has_promotion:
            unit_price = product_dict['promotion']['promotional_price']
            discount_percent = ((original_price - unit_price) / original_price) * 100
            was_on_promotion = True
        else:
            unit_price = original_price
            discount_percent = None
            was_on_promotion = False
        
        line_total = unit_price * item.quantity
        
        order_detail = OrderDetail(
            order_id=order.id,
            product_id=item.products_id,
            unit_price=unit_price,
            quantity=item.quantity,
            original_price=original_price if was_on_promotion else None,
            discount_percent=discount_percent,
            was_on_promotion=was_on_promotion,
            line_total=line_total,
            selected_size=item.selected_size
        )
        db.session.add(order_detail)
    
    cart.status = 'completed'
    
    db.session.commit()
    
    return jsonify({'message': 'Đặt hàng thành công', 'order': order.to_dict()}), 201
