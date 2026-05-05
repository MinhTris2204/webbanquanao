from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Cart, CartItem, Product

cart_bp = Blueprint('cart', __name__)

@cart_bp.route('/', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = int(get_jwt_identity())
    cart = Cart.query.filter_by(user_id=user_id, status='active').first()
    
    if not cart:
        return jsonify({'cart_items': [], 'total': 0}), 200
    
    items = []
    total = 0
    for item in cart.cart_items:
        product = item.product
        product_dict = product.to_dict()
        
        # Dùng giá khuyến mãi nếu có, ngược lại dùng giá thường
        if product_dict.get('promotion') and product_dict['promotion'].get('promotional_price'):
            unit_price = product_dict['promotion']['promotional_price']
        else:
            unit_price = float(product.gia_ban)
        
        item_total = unit_price * item.quantity
        total += item_total
        
        items.append({
            'cart_item_id': item.cart_item_id,
            'product': product_dict,
            'quantity': item.quantity,
            'selected_size': item.selected_size,
            'unit_price': unit_price,
            'item_total': item_total
        })
    
    return jsonify({'cart_items': items, 'total': total}), 200

@cart_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    selected_size = data.get('selected_size')
    
    product = Product.query.get_or_404(product_id)
    
    cart = Cart.query.filter_by(user_id=user_id, status='active').first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.session.add(cart)
        db.session.commit()
    
    # Kiểm tra nếu cùng sản phẩm với cùng size đã tồn tại
    cart_item = CartItem.query.filter_by(
        cart_id=cart.id, 
        products_id=product_id,
        selected_size=selected_size
    ).first()
    
    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(
            cart_id=cart.id, 
            products_id=product_id, 
            quantity=quantity,
            selected_size=selected_size
        )
        db.session.add(cart_item)
    
    db.session.commit()
    
    return jsonify({'message': 'Đã thêm vào giỏ hàng'}), 200

@cart_bp.route('/update/<int:cart_item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(cart_item_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    quantity = data.get('quantity')
    
    cart_item = CartItem.query.get_or_404(cart_item_id)
    
    if cart_item.cart.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if quantity <= 0:
        db.session.delete(cart_item)
    else:
        cart_item.quantity = quantity
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật giỏ hàng thành công'}), 200

@cart_bp.route('/remove/<int:cart_item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(cart_item_id):
    user_id = int(get_jwt_identity())
    cart_item = CartItem.query.get_or_404(cart_item_id)
    
    if cart_item.cart.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(cart_item)
    db.session.commit()
    
    return jsonify({'message': 'Đã xóa khỏi giỏ hàng'}), 200
