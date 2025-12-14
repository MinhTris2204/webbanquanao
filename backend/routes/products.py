from flask import Blueprint, request, jsonify
from models import db, Product

products_bp = Blueprint('products', __name__)

@products_bp.route('/', methods=['GET'])
def get_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    search = request.args.get('search', '')
    
    query = Product.query
    
    if search:
        query = query.filter(Product.ten_san_pham.ilike(f'%{search}%'))
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

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

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict()), 200
