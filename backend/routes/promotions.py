from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Promotion, Product, User
from datetime import datetime
from functools import wraps

promotions_bp = Blueprint('promotions', __name__)

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

@promotions_bp.route('/', methods=['GET'])
@admin_required
def get_promotions():
    """Get all promotions with filters"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')  # active, upcoming, expired, all
    
    query = Promotion.query.join(Product)
    
    # Search by product name
    if search:
        query = query.filter(Product.ten_san_pham.ilike(f'%{search}%'))
    
    # Filter by status
    now = datetime.utcnow()
    if status == 'active':
        query = query.filter(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        )
    elif status == 'upcoming':
        query = query.filter(
            Promotion.is_active == True,
            Promotion.start_date > now
        )
    elif status == 'expired':
        query = query.filter(
            db.or_(
                Promotion.is_active == False,
                Promotion.end_date < now
            )
        )
    
    # Order by created_at descending
    query = query.order_by(Promotion.created_at.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'promotions': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@promotions_bp.route('/<int:promotion_id>', methods=['GET'])
@admin_required
def get_promotion(promotion_id):
    """Get single promotion details"""
    promotion = Promotion.query.get_or_404(promotion_id)
    return jsonify(promotion.to_dict()), 200

@promotions_bp.route('/', methods=['POST'])
@admin_required
def create_promotion():
    """Create new promotion"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['product_id', 'discount_type', 'discount_value', 'start_date', 'end_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Thiếu trường {field}'}), 400
    
    # Get product
    product = Product.query.get(data['product_id'])
    if not product:
        return jsonify({'error': 'Sản phẩm không tồn tại'}), 404
    
    # Validate discount value
    discount_type = data['discount_type']
    discount_value = float(data['discount_value'])
    
    if discount_type == 'percent':
        if discount_value <= 0 or discount_value >= 100:
            return jsonify({'error': 'Giảm giá phần trăm phải từ 1-99'}), 400
    elif discount_type == 'fixed':
        if discount_value <= 0 or discount_value >= float(product.gia_ban):
            return jsonify({'error': 'Giảm giá cố định phải nhỏ hơn giá sản phẩm'}), 400
    else:
        return jsonify({'error': 'Loại giảm giá không hợp lệ'}), 400
    
    # Parse dates
    try:
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
    except:
        return jsonify({'error': 'Định dạng ngày không hợp lệ'}), 400
    
    # Validate dates
    if end_date <= start_date:
        return jsonify({'error': 'Ngày kết thúc phải sau ngày bắt đầu'}), 400
    
    # Check for overlapping promotions
    overlapping = Promotion.query.filter(
        Promotion.product_id == data['product_id'],
        Promotion.is_active == True,
        db.or_(
            db.and_(Promotion.start_date <= start_date, Promotion.end_date >= start_date),
            db.and_(Promotion.start_date <= end_date, Promotion.end_date >= end_date),
            db.and_(Promotion.start_date >= start_date, Promotion.end_date <= end_date)
        )
    ).first()
    
    if overlapping:
        return jsonify({'error': 'Sản phẩm đã có khuyến mãi trong khoảng thời gian này'}), 400
    
    # Create promotion
    promotion = Promotion(
        product_id=data['product_id'],
        discount_type=discount_type,
        discount_value=discount_value,
        start_date=start_date,
        end_date=end_date,
        is_active=data.get('is_active', True)
    )
    
    db.session.add(promotion)
    db.session.commit()
    
    return jsonify(promotion.to_dict()), 201

@promotions_bp.route('/<int:promotion_id>', methods=['PUT'])
@admin_required
def update_promotion(promotion_id):
    """Update promotion"""
    promotion = Promotion.query.get_or_404(promotion_id)
    data = request.get_json()
    
    # Validate discount value if provided
    if 'discount_value' in data:
        discount_type = data.get('discount_type', promotion.discount_type)
        discount_value = float(data['discount_value'])
        product = Product.query.get(promotion.product_id)
        
        if discount_type == 'percent':
            if discount_value <= 0 or discount_value >= 100:
                return jsonify({'error': 'Giảm giá phần trăm phải từ 1-99'}), 400
        elif discount_type == 'fixed':
            if discount_value <= 0 or discount_value >= float(product.gia_ban):
                return jsonify({'error': 'Giảm giá cố định phải nhỏ hơn giá sản phẩm'}), 400
    
    # Parse and validate dates if provided
    start_date = promotion.start_date
    end_date = promotion.end_date
    
    if 'start_date' in data:
        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        except:
            return jsonify({'error': 'Định dạng ngày bắt đầu không hợp lệ'}), 400
    
    if 'end_date' in data:
        try:
            end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        except:
            return jsonify({'error': 'Định dạng ngày kết thúc không hợp lệ'}), 400
    
    if end_date <= start_date:
        return jsonify({'error': 'Ngày kết thúc phải sau ngày bắt đầu'}), 400
    
    # Update fields
    if 'discount_type' in data:
        promotion.discount_type = data['discount_type']
    if 'discount_value' in data:
        promotion.discount_value = data['discount_value']
    if 'start_date' in data:
        promotion.start_date = start_date
    if 'end_date' in data:
        promotion.end_date = end_date
    if 'is_active' in data:
        promotion.is_active = data['is_active']
    
    promotion.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(promotion.to_dict()), 200

@promotions_bp.route('/<int:promotion_id>', methods=['DELETE'])
@admin_required
def delete_promotion(promotion_id):
    """Delete promotion"""
    promotion = Promotion.query.get_or_404(promotion_id)
    
    db.session.delete(promotion)
    db.session.commit()
    
    return jsonify({'message': 'Xóa khuyến mãi thành công'}), 200

@promotions_bp.route('/bulk', methods=['POST'])
@admin_required
def bulk_create_promotions():
    """Create promotions for multiple products"""
    data = request.get_json()
    
    required_fields = ['product_ids', 'discount_type', 'discount_value', 'start_date', 'end_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Thiếu trường {field}'}), 400
    
    product_ids = data['product_ids']
    discount_type = data['discount_type']
    discount_value = float(data['discount_value'])
    
    try:
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
    except:
        return jsonify({'error': 'Định dạng ngày không hợp lệ'}), 400
    
    if end_date <= start_date:
        return jsonify({'error': 'Ngày kết thúc phải sau ngày bắt đầu'}), 400
    
    success_count = 0
    failed_products = []
    
    for product_id in product_ids:
        product = Product.query.get(product_id)
        if not product:
            failed_products.append({'product_id': product_id, 'reason': 'Sản phẩm không tồn tại'})
            continue
        
        # Validate discount
        if discount_type == 'percent':
            if discount_value <= 0 or discount_value >= 100:
                failed_products.append({'product_id': product_id, 'reason': 'Giảm giá không hợp lệ'})
                continue
        elif discount_type == 'fixed':
            if discount_value <= 0 or discount_value >= float(product.gia_ban):
                failed_products.append({'product_id': product_id, 'reason': 'Giảm giá lớn hơn giá sản phẩm'})
                continue
        
        # Check overlapping
        overlapping = Promotion.query.filter(
            Promotion.product_id == product_id,
            Promotion.is_active == True,
            db.or_(
                db.and_(Promotion.start_date <= start_date, Promotion.end_date >= start_date),
                db.and_(Promotion.start_date <= end_date, Promotion.end_date >= end_date),
                db.and_(Promotion.start_date >= start_date, Promotion.end_date <= end_date)
            )
        ).first()
        
        if overlapping:
            failed_products.append({'product_id': product_id, 'reason': 'Đã có khuyến mãi trùng thời gian'})
            continue
        
        # Create promotion
        promotion = Promotion(
            product_id=product_id,
            discount_type=discount_type,
            discount_value=discount_value,
            start_date=start_date,
            end_date=end_date,
            is_active=True
        )
        db.session.add(promotion)
        success_count += 1
    
    db.session.commit()
    
    return jsonify({
        'message': f'Tạo thành công {success_count} khuyến mãi',
        'success_count': success_count,
        'failed_count': len(failed_products),
        'failed_products': failed_products
    }), 201

@promotions_bp.route('/stats', methods=['GET'])
@admin_required
def get_promotion_stats():
    """Get promotion statistics"""
    now = datetime.utcnow()
    
    active_count = Promotion.query.filter(
        Promotion.is_active == True,
        Promotion.start_date <= now,
        Promotion.end_date >= now
    ).count()
    
    upcoming_count = Promotion.query.filter(
        Promotion.is_active == True,
        Promotion.start_date > now
    ).count()
    
    expired_count = Promotion.query.filter(
        db.or_(
            Promotion.is_active == False,
            Promotion.end_date < now
        )
    ).count()
    
    return jsonify({
        'active_count': active_count,
        'upcoming_count': upcoming_count,
        'expired_count': expired_count,
        'total_count': active_count + upcoming_count + expired_count
    }), 200
