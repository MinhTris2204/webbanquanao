
from flask import Blueprint, jsonify, request
from models import db, Product, ProductView, Order, OrderDetail
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
import uuid

recommendations_bp = Blueprint('recommendations', __name__)

def get_user_or_session():
    """Get user_id if authenticated, otherwise get/create session_id"""
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return {'user_id': user_id, 'session_id': None}
    except:
        pass
    
    # For guest users, use session_id from cookie or create new one
    session_id = request.cookies.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
    
    return {'user_id': None, 'session_id': session_id}


@recommendations_bp.route('/track-view', methods=['POST'])
def track_view():
    """Track product view for recommendation algorithm"""
    try:
        data = request.json
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({'error': 'product_id is required'}), 400
        
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        user_session = get_user_or_session()
        
        # Find existing view record
        if user_session['user_id']:
            view = ProductView.query.filter_by(
                user_id=user_session['user_id'],
                product_id=product_id
            ).first()
        else:
            view = ProductView.query.filter_by(
                session_id=user_session['session_id'],
                product_id=product_id
            ).first()
        
        if view:
            # Update existing view
            view.view_count += 1
            view.last_viewed_at = datetime.utcnow()
        else:
            # Create new view record
            view = ProductView(
                user_id=user_session['user_id'],
                session_id=user_session['session_id'],
                product_id=product_id,
                view_count=1
            )
            db.session.add(view)
        
        db.session.commit()
        
        response = jsonify({'message': 'View tracked successfully'})
        
        # Set session_id cookie for guest users
        if user_session['session_id']:
            response.set_cookie('session_id', user_session['session_id'], max_age=30*24*60*60)  # 30 days
        
        return response
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/for-you', methods=['GET'])
def get_recommendations():
    """Get personalized product recommendations based on user behavior"""
    try:
        limit = request.args.get('limit', 8, type=int)
        user_session = get_user_or_session()
        
        # Get user's viewed products
        if user_session['user_id']:
            viewed_products = db.session.query(ProductView.product_id).filter(
                ProductView.user_id == user_session['user_id']
            ).order_by(desc(ProductView.last_viewed_at)).limit(10).all()
        else:
            viewed_products = db.session.query(ProductView.product_id).filter(
                ProductView.session_id == user_session['session_id']
            ).order_by(desc(ProductView.last_viewed_at)).limit(10).all()
        
        viewed_product_ids = [p[0] for p in viewed_products]
        
        if not viewed_product_ids:
            # No viewing history - return trending products
            return get_trending_products(limit)
        
        # Get categories and gender from viewed products
        viewed_product_details = Product.query.filter(
            Product.products_id.in_(viewed_product_ids)
        ).all()
        
        categories = list(set([p.loai for p in viewed_product_details if p.loai]))
        genders = list(set([p.gioi_tinh for p in viewed_product_details if p.gioi_tinh]))
        
        # Build recommendation query
        recommendations = Product.query.filter(
            Product.trang_thai == 'Con_hang',
            Product.products_id.notin_(viewed_product_ids)  # Exclude already viewed
        )
        
        # Filter by similar categories or gender
        if categories or genders:
            recommendations = recommendations.filter(
                db.or_(
                    Product.loai.in_(categories) if categories else False,
                    Product.gioi_tinh.in_(genders) if genders else False
                )
            )
        
        # Prioritize products with promotions
        recommendations = recommendations.outerjoin(
            db.session.query(
                db.func.count(ProductView.id).label('view_count'),
                ProductView.product_id
            ).group_by(ProductView.product_id).subquery(),
            Product.products_id == db.column('product_id')
        ).order_by(
            desc(db.column('view_count')),
            desc(Product.created_at)
        ).limit(limit).all()
        
        if len(recommendations) < limit:
            # Fill with trending products if not enough recommendations
            remaining = limit - len(recommendations)
            trending = get_trending_products_query(remaining, exclude_ids=[p.products_id for p in recommendations])
            recommendations.extend(trending)
        
        return jsonify({
            'products': [p.to_dict() for p in recommendations],
            'based_on': 'user_behavior' if viewed_product_ids else 'trending'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/similar/<int:product_id>', methods=['GET'])
def get_similar_products(product_id):
    """Get products similar to the given product"""
    try:
        limit = request.args.get('limit', 8, type=int)
        
        # Get the reference product
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Find similar products based on category, gender, and price range
        price_min = float(product.gia_ban) * 0.7  # 30% lower
        price_max = float(product.gia_ban) * 1.3  # 30% higher
        
        # Build query with proper SQLAlchemy syntax
        similar = Product.query.filter(
            Product.products_id != product_id,
            Product.trang_thai == 'Con_hang',
            Product.gia_ban.between(price_min, price_max)
        ).filter(
            db.or_(
                Product.loai == product.loai,
                Product.gioi_tinh == product.gioi_tinh
            )
        ).order_by(
            # Prioritize same category using case
            func.coalesce(
                func.nullif(Product.loai == product.loai, False).cast(db.Integer),
                0
            ).desc(),
            # Then random
            func.random()
        ).limit(limit).all()
        
        return jsonify({
            'products': [p.to_dict() for p in similar],
            'reference_product': product.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/trending', methods=['GET'])
def get_trending():
    """Get trending products based on recent views and purchases"""
    try:
        limit = request.args.get('limit', 8, type=int)
        return get_trending_products(limit)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_trending_products(limit=8):
    """Helper function to get trending products"""
    products = get_trending_products_query(limit)
    return jsonify({
        'products': [p.to_dict() for p in products],
        'based_on': 'trending'
    })


def get_trending_products_query(limit=8, exclude_ids=None):
    """Helper function to get trending products query"""
    # Get products with most views in last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    trending_subquery = db.session.query(
        ProductView.product_id,
        func.sum(ProductView.view_count).label('total_views')
    ).filter(
        ProductView.last_viewed_at >= thirty_days_ago
    ).group_by(ProductView.product_id).subquery()
    
    query = Product.query.filter(
        Product.trang_thai == 'Con_hang'
    )
    
    if exclude_ids:
        query = query.filter(Product.products_id.notin_(exclude_ids))
    
    products = query.outerjoin(
        trending_subquery,
        Product.products_id == trending_subquery.c.product_id
    ).order_by(
        desc(trending_subquery.c.total_views),
        desc(Product.created_at)
    ).limit(limit).all()
    
    return products


@recommendations_bp.route('/frequently-bought-together/<int:product_id>', methods=['GET'])
def get_frequently_bought_together(product_id):
    """Get products frequently bought together with the given product"""
    try:
        limit = request.args.get('limit', 4, type=int)
        
        # Find completed orders containing this product
        orders_with_product = db.session.query(OrderDetail.order_id).join(
            Order, OrderDetail.order_id == Order.id
        ).filter(
            OrderDetail.product_id == product_id,
            Order.trangthai == 'hoan_thanh'  # Only completed orders
        ).subquery()
        
        # Find other products in those orders
        frequently_bought = db.session.query(
            OrderDetail.product_id,
            func.count(OrderDetail.product_id).label('frequency')
        ).filter(
            OrderDetail.order_id.in_(orders_with_product),
            OrderDetail.product_id != product_id
        ).group_by(OrderDetail.product_id).order_by(
            desc('frequency')
        ).limit(limit).all()
        
        product_ids = [item[0] for item in frequently_bought]
        
        # Nếu không có dữ liệu thực tế, trả về mảng rỗng (không fallback)
        if not product_ids:
            return jsonify({
                'products': [],
                'based_on': 'no_data'
            })
        
        products = Product.query.filter(
            Product.products_id.in_(product_ids),
            Product.trang_thai == 'Con_hang'
        ).all()
        
        return jsonify({
            'products': [p.to_dict() for p in products],
            'based_on': 'frequently_bought_together'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
