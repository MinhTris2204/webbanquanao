from flask import Blueprint, request, jsonify
from models import db, Product, Promotion, Order, OrderDetail
from sqlalchemy import func, desc
from datetime import datetime

products_bp = Blueprint('products', __name__)

@products_bp.route('/', methods=['GET'])
def get_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    search = request.args.get('search', '')
    on_sale = request.args.get('on_sale', '')  # Filter for products with active promotions
    sort_by = request.args.get('sort_by', 'newest')  # newest, oldest, name, price_asc, price_desc
    
    # New filter parameters
    category = request.args.get('category', '')  # Filter by loai (category)
    gender = request.args.get('gender', '')  # Filter by gioi_tinh (gender)
    size = request.args.get('size', '')  # Filter by size
    min_price = request.args.get('min_price', type=float)  # Minimum price
    max_price = request.args.get('max_price', type=float)  # Maximum price
    
    query = Product.query
    
    if search:
        # Check if search is a number (ID search)
        if search.isdigit():
            query = query.filter(Product.products_id == int(search))
        elif search.startswith('#') and search[1:].isdigit():
            # Support searching with # prefix like "#123"
            query = query.filter(Product.products_id == int(search[1:]))
        else:
            query = query.filter(Product.ten_san_pham.ilike(f'%{search}%'))
    
    # Filter by category (loai)
    if category:
        query = query.filter(Product.loai == category)
    
    # Filter by gender (gioi_tinh)
    if gender:
        query = query.filter(Product.gioi_tinh == gender)
    
    # Filter by size (contains check for comma-separated sizes)
    if size:
        query = query.filter(Product.size.ilike(f'%{size}%'))
    
    # Filter by price range
    if min_price is not None:
        query = query.filter(Product.gia_ban >= min_price)
    if max_price is not None:
        query = query.filter(Product.gia_ban <= max_price)
    
    # Filter for products on sale
    if on_sale == 'true':
        now = datetime.utcnow()
        query = query.join(Promotion).filter(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        )
    
    # Sorting
    if sort_by == 'newest':
        query = query.order_by(desc(Product.created_at))
    elif sort_by == 'oldest':
        query = query.order_by(Product.created_at)
    elif sort_by == 'name':
        query = query.order_by(Product.ten_san_pham)
    elif sort_by == 'price_asc':
        query = query.order_by(Product.gia_ban)
    elif sort_by == 'price_desc':
        query = query.order_by(desc(Product.gia_ban))
    else:
        query = query.order_by(desc(Product.created_at))  # Default: newest first
    
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
    
    # Check if query is a number (ID search)
    if query.isdigit():
        products = Product.query.filter(
            Product.products_id == int(query),
            Product.trang_thai == 'Con_hang'
        ).limit(8).all()
    elif query.startswith('#') and query[1:].isdigit():
        products = Product.query.filter(
            Product.products_id == int(query[1:]),
            Product.trang_thai == 'Con_hang'
        ).limit(8).all()
    else:
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
    """Get best selling products based on completed orders"""
    limit = request.args.get('limit', 8, type=int)
    
    # Get products with most sales from completed orders (hoan_thanh)
    best_sellers = db.session.query(
        Product,
        func.sum(OrderDetail.quantity).label('total_sold')
    ).join(OrderDetail, Product.products_id == OrderDetail.product_id)\
     .join(Order, OrderDetail.order_id == Order.id)\
     .filter(
        Order.trangthai == 'hoan_thanh',  # Only completed orders
        Product.trang_thai == 'Con_hang'   # Only available products
    ).group_by(Product.products_id)\
     .order_by(desc('total_sold'))\
     .limit(limit).all()
    
    # Only return products that have actual sales data
    products = [p[0] for p in best_sellers]
    
    return jsonify({
        'products': [p.to_dict() for p in products]
    }), 200

@products_bp.route('/on-sale', methods=['GET'])
def get_sale_products():
    """Get all products with active promotions"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    category = request.args.get('category', '')
    gender = request.args.get('gender', '')
    size = request.args.get('size', '')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    sort_by = request.args.get('sort_by', 'discount')  # discount, price, name
    
    now = datetime.utcnow()
    
    query = Product.query.join(Promotion).filter(
        Promotion.is_active == True,
        Promotion.start_date <= now,
        Promotion.end_date >= now,
        Product.trang_thai == 'Con_hang'
    )
    
    # Apply filters
    if category:
        query = query.filter(Product.loai == category)
    
    if gender:
        query = query.filter(Product.gioi_tinh == gender)
    
    if size:
        query = query.filter(Product.size.ilike(f'%{size}%'))
    
    if min_price is not None:
        query = query.filter(Product.gia_ban >= min_price)
    
    if max_price is not None:
        query = query.filter(Product.gia_ban <= max_price)
    
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
