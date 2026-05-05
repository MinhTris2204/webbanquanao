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
        # Kiểm tra nếu từ khóa là số (tìm theo ID)
        if search.isdigit():
            query = query.filter(Product.products_id == int(search))
        elif search.startswith('#') and search[1:].isdigit():
            # Hỗ trợ tìm kiếm với tiền tố # như "#123"
            query = query.filter(Product.products_id == int(search[1:]))
        else:
            query = query.filter(Product.ten_san_pham.ilike(f'%{search}%'))
    
    # Lọc theo danh mục (loai)
    if category:
        query = query.filter(Product.loai == category)
    
    # Lọc theo giới tính (gioi_tinh)
    if gender:
        query = query.filter(Product.gioi_tinh == gender)
    
    # Lọc theo size (kiểm tra chuỗi phân cách bằng dấu phẩy)
    if size:
        query = query.filter(Product.size.ilike(f'%{size}%'))
    
    # Lọc theo khoảng giá
    if min_price is not None:
        query = query.filter(Product.gia_ban >= min_price)
    if max_price is not None:
        query = query.filter(Product.gia_ban <= max_price)
    
    # Filter for products on sale
    if on_sale == 'true':
        now = datetime.utcnow()
        active_product_ids = db.session.query(Promotion.product_id).filter(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        ).subquery()
        query = query.filter(Product.products_id.in_(active_product_ids))
    
    # Sắp xếp
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
        query = query.order_by(desc(Product.created_at))  # Mặc định: mới nhất trước
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Tính số lượng đã bán cho mỗi sản phẩm
    product_ids = [p.products_id for p in pagination.items]
    sold_counts = {}
    if product_ids:
        sold_query = db.session.query(
            OrderDetail.product_id,
            func.sum(OrderDetail.quantity).label('total_sold')
        ).join(Order, OrderDetail.order_id == Order.id)\
         .filter(
            OrderDetail.product_id.in_(product_ids),
            Order.trangthai == 'hoan_thanh'
        ).group_by(OrderDetail.product_id).all()
        
        sold_counts = {product_id: int(total_sold) for product_id, total_sold in sold_query}
    
    # Thêm số lượng đã bán vào mỗi sản phẩm
    products_with_sold = []
    for product in pagination.items:
        product_dict = product.to_dict()
        product_dict['total_sold'] = sold_counts.get(product.products_id, 0)
        products_with_sold.append(product_dict)
    
    return jsonify({
        'products': products_with_sold,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@products_bp.route('/categories', methods=['GET'])
def get_categories():
    # Lấy danh sách loại sản phẩm không trùng lặp
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
        # Tìm kiếm sản phẩm không phân biệt hoa thường
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
    period = request.args.get('period', 'all')  # day, month, year, all

    from datetime import timedelta
    now = datetime.utcnow()

    query = db.session.query(
        Product,
        func.sum(OrderDetail.quantity).label('total_sold')
    ).join(OrderDetail, Product.products_id == OrderDetail.product_id)\
     .join(Order, OrderDetail.order_id == Order.id)\
     .filter(
        Order.trangthai == 'hoan_thanh',
        Product.trang_thai == 'Con_hang'
    )

    if period == 'day':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Order.created_at >= start)
    elif period == 'month':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Order.created_at >= start)
    elif period == 'year':
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Order.created_at >= start)
    # 'all' => không lọc thời gian

    best_sellers = query.group_by(Product.products_id)\
        .order_by(desc('total_sold'))\
        .limit(limit).all()

    # Thêm số lượng đã bán vào mỗi sản phẩm
    products_with_sold = []
    for product, total_sold in best_sellers:
        product_dict = product.to_dict()
        product_dict['total_sold'] = int(total_sold) if total_sold else 0
        products_with_sold.append(product_dict)

    return jsonify({
        'products': products_with_sold
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
    
    # Lấy danh sách product_id có promotion đang active
    active_product_ids = db.session.query(Promotion.product_id).filter(
        Promotion.is_active == True,
        Promotion.start_date <= now,
        Promotion.end_date >= now
    ).subquery()

    query = Product.query.filter(
        Product.products_id.in_(active_product_ids)
    )
    
    # Áp dụng bộ lọc
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
    
    # Sắp xếp
    if sort_by == 'price':
        query = query.order_by(Product.gia_ban.asc())
    elif sort_by == 'name':
        query = query.order_by(Product.ten_san_pham.asc())
    else:
        # Mặc định: mới nhất trước
        query = query.order_by(Product.created_at.desc())
    
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
    
    # Tính số lượng đã bán
    sold_count = db.session.query(
        func.sum(OrderDetail.quantity)
    ).join(Order, OrderDetail.order_id == Order.id)\
     .filter(
        OrderDetail.product_id == product_id,
        Order.trangthai == 'hoan_thanh'
    ).scalar()
    
    product_dict = product.to_dict()
    product_dict['total_sold'] = int(sold_count) if sold_count else 0
    
    return jsonify(product_dict), 200
