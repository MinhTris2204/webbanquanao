from flask import Blueprint, request, jsonify
from models import db, Product, Promotion
from datetime import datetime

products_bp = Blueprint('products', __name__)

@products_bp.route('/', methods=['GET'])
def get_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    search = request.args.get('search', '')
    on_sale = request.args.get('on_sale', '')  # Filter for products with active promotions
    
    query = Product.query
    
    if search:
        query = query.filter(Product.ten_san_pham.ilike(f'%{search}%'))
    
    # Filter for products on sale
    if on_sale == 'true':
        now = datetime.utcnow()
        query = query.join(Promotion).filter(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        )
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@products_bp.route('/categories', methods=['GET'])
def get_categories():
    # Get distinct product categories
    categories = db.session.query(Product.loai).distinct().all()
    category_list = [cat[0] for cat in categories if cat[0]]
    
    return jsonify({'categories': category_list}), 200

@products_bp.route('/autocomplete', methods=['GET'])
def autocomplete():
    query = request.args.get('q', '').strip()
    
    # Validate query length
    if len(query) < 2:
        return jsonify({'suggestions': []}), 200
    
    # Search for products with case-insensitive matching
    products = Product.query.filter(
        Product.ten_san_pham.ilike(f'%{query}%'),
        Product.trang_thai == 'Con_hang'
    ).limit(8).all()
    
    # Format suggestions
    suggestions = [{
        'products_id': p.products_id,
        'ten_san_pham': p.ten_san_pham,
        'gia_ban': float(p.gia_ban) if p.gia_ban else 0,
        'hinh_anh': p.hinh_anh
    } for p in products]
    
    return jsonify({'suggestions': suggestions}), 200

@products_bp.route('/best-sellers', methods=['GET'])
def get_best_sellers():
    """Get best selling products (simulated by getting random products)"""
    limit = request.args.get('limit', 8, type=int)
    
    # Get products ordered by ID descending (newest first) as a simple simulation
    # In a real app, you would track sales and order by sales count
    products = Product.query.filter_by(trang_thai='Con_hang').order_by(Product.products_id.desc()).limit(limit).all()
    
    return jsonify({
        'products': [p.to_dict() for p in products]
    }), 200

@products_bp.route('/on-sale', methods=['GET'])
def get_sale_products():
    """Get all products with active promotions"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    category = request.args.get('category', '')
    sort_by = request.args.get('sort_by', 'discount')  # discount, price, name
    
    now = datetime.utcnow()
    
    query = Product.query.join(Promotion).filter(
        Promotion.is_active == True,
        Promotion.start_date <= now,
        Promotion.end_date >= now,
        Product.trang_thai == 'Con_hang'
    )
    
    if category:
        query = query.filter(Product.loai == category)
    
    # Sorting
    if sort_by == 'discount':
        # Sort by discount percentage (highest first)
        query = query.order_by(Promotion.discount_value.desc())
    elif sort_by == 'price':
        query = query.order_by(Product.gia_ban.asc())
    elif sort_by == 'name':
        query = query.order_by(Product.ten_san_pham.asc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict()), 200
