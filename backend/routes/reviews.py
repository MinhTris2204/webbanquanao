from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Review, ReviewReply, Product, Order, OrderDetail, User
from datetime import datetime, timedelta
from sqlalchemy import func, and_

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/product/<int:product_id>', methods=['GET'])
def get_product_reviews(product_id):
    """Get all reviews for a product"""
    reviews = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc()).all()
    
    # Calculate average rating
    total_rating = sum(r.rating for r in reviews)
    avg_rating = total_rating / len(reviews) if reviews else 0
    
    return jsonify({
        'reviews': [r.to_dict() for r in reviews],
        'total': len(reviews),
        'average_rating': round(avg_rating, 1)
    }), 200

@reviews_bp.route('/product/<int:product_id>', methods=['POST'])
@jwt_required()
def create_review(product_id):
    """Create a review for a product"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate product exists
    product = Product.query.get_or_404(product_id)
    
    # Check if user has purchased this product
    order_id = data.get('order_id')
    if not order_id:
        return jsonify({'error': 'Order ID is required'}), 400
    
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    # Check if order contains this product
    order_detail = OrderDetail.query.filter_by(order_id=order_id, product_id=product_id).first()
    if not order_detail:
        return jsonify({'error': 'You have not purchased this product'}), 400
    
    # Check if user already reviewed this product for this order
    existing_review = Review.query.filter_by(
        product_id=product_id,
        user_id=user_id,
        order_id=order_id
    ).first()
    
    if existing_review:
        return jsonify({'error': 'You have already reviewed this product'}), 400
    
    # Validate rating
    rating = data.get('rating')
    if not rating or rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    
    # Create review
    review = Review(
        product_id=product_id,
        user_id=user_id,
        order_id=order_id,
        rating=rating,
        comment=data.get('comment', '')
    )
    
    db.session.add(review)
    db.session.commit()
    
    return jsonify({
        'message': 'Review created successfully',
        'review': review.to_dict()
    }), 201

@reviews_bp.route('/<int:review_id>', methods=['PUT'])
@jwt_required()
def update_review(review_id):
    """Update a review"""
    user_id = int(get_jwt_identity())
    review = Review.query.get_or_404(review_id)
    
    # Check if user owns this review
    if review.user_id != user_id:
        return jsonify({'error': 'You can only edit your own reviews'}), 403
    
    data = request.get_json()
    
    # Update rating
    if 'rating' in data:
        rating = data['rating']
        if rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        review.rating = rating
    
    # Update comment
    if 'comment' in data:
        review.comment = data['comment']
    
    review.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Review updated successfully',
        'review': review.to_dict()
    }), 200



@reviews_bp.route('/user/can-review/<int:product_id>', methods=['GET'])
@jwt_required()
def can_review_product(product_id):
    """Check if user can review a product"""
    user_id = int(get_jwt_identity())
    
    # Find completed orders with this product
    orders = db.session.query(Order).join(OrderDetail).filter(
        Order.user_id == user_id,
        Order.trangthai == 'hoan_thanh',
        OrderDetail.product_id == product_id
    ).all()
    
    if not orders:
        return jsonify({
            'can_review': False,
            'reason': 'You have not purchased this product yet'
        }), 200
    
    # Check if user already reviewed for any of these orders
    reviewed_orders = [r.order_id for r in Review.query.filter_by(
        product_id=product_id,
        user_id=user_id
    ).all()]
    
    # Find orders that haven't been reviewed
    available_orders = [o for o in orders if o.id not in reviewed_orders]
    
    if not available_orders:
        return jsonify({
            'can_review': False,
            'reason': 'You have already reviewed this product'
        }), 200
    
    return jsonify({
        'can_review': True,
        'orders': [{'id': o.id, 'created_at': o.created_at.isoformat()} for o in available_orders]
    }), 200


# ============= ADMIN ROUTES =============

@reviews_bp.route('/admin/all', methods=['GET'])
@jwt_required()
def get_all_reviews_admin():
    """Get all reviews with filters (Admin only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Get query parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    rating_filter = request.args.get('rating', 0, type=int)
    has_reply = request.args.get('has_reply', 'all')
    sort_by = request.args.get('sort_by', 'newest')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Build query
    query = Review.query
    
    # Apply filters
    if rating_filter > 0:
        query = query.filter(Review.rating == rating_filter)
    
    if has_reply == 'true':
        query = query.join(ReviewReply, Review.id == ReviewReply.review_id)
    elif has_reply == 'false':
        query = query.outerjoin(ReviewReply, Review.id == ReviewReply.review_id).filter(ReviewReply.id == None)
    
    # Date filters
    if start_date:
        query = query.filter(Review.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Review.created_at <= datetime.fromisoformat(end_date))
    
    # Sorting
    if sort_by == 'newest':
        query = query.order_by(Review.created_at.desc())
    elif sort_by == 'oldest':
        query = query.order_by(Review.created_at.asc())
    elif sort_by == 'highest':
        query = query.order_by(Review.rating.desc(), Review.created_at.desc())
    elif sort_by == 'lowest':
        query = query.order_by(Review.rating.asc(), Review.created_at.desc())
    
    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'reviews': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@reviews_bp.route('/admin/alerts', methods=['GET'])
@jwt_required()
def get_review_alerts():
    """Get alerts for products with many 1-star reviews (Admin only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Find products with many 1-star reviews in the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Query to get products with recent 1-star reviews
    recent_one_star = db.session.query(
        Review.product_id,
        func.count(Review.id).label('recent_count')
    ).filter(
        Review.rating == 1,
        Review.created_at >= seven_days_ago
    ).group_by(Review.product_id).subquery()
    
    # Query to get total 1-star reviews per product
    total_one_star = db.session.query(
        Review.product_id,
        func.count(Review.id).label('total_count')
    ).filter(
        Review.rating == 1
    ).group_by(Review.product_id).subquery()
    
    # Get products with at least 3 recent 1-star reviews
    alerts = db.session.query(
        Product,
        recent_one_star.c.recent_count,
        total_one_star.c.total_count
    ).join(
        recent_one_star, Product.products_id == recent_one_star.c.product_id
    ).outerjoin(
        total_one_star, Product.products_id == total_one_star.c.product_id
    ).filter(
        recent_one_star.c.recent_count >= 3
    ).order_by(
        recent_one_star.c.recent_count.desc()
    ).all()
    
    return jsonify({
        'alerts': [{
            'product_id': product.products_id,
            'product_name': product.ten_san_pham,
            'product_image': product.hinh_anh,
            'recent_one_star': recent_count,
            'total_one_star': total_count or 0
        } for product, recent_count, total_count in alerts]
    }), 200


@reviews_bp.route('/<int:review_id>/reply', methods=['POST'])
@jwt_required()
def create_reply(review_id):
    """Create a reply to a review (Admin only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    review = Review.query.get_or_404(review_id)
    
    # Check if reply already exists
    if review.reply:
        return jsonify({'error': 'Reply already exists'}), 400
    
    data = request.get_json()
    reply_text = data.get('reply', '').strip()
    
    if not reply_text:
        return jsonify({'error': 'Reply text is required'}), 400
    
    # Create reply
    reply = ReviewReply(
        review_id=review_id,
        reply=reply_text
    )
    
    db.session.add(reply)
    db.session.commit()
    
    return jsonify({
        'message': 'Reply created successfully',
        'reply': reply.to_dict()
    }), 201


@reviews_bp.route('/<int:review_id>/reply', methods=['PUT'])
@jwt_required()
def update_reply(review_id):
    """Update a reply to a review (Admin only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    review = Review.query.get_or_404(review_id)
    
    if not review.reply:
        return jsonify({'error': 'Reply does not exist'}), 404
    
    data = request.get_json()
    reply_text = data.get('reply', '').strip()
    
    if not reply_text:
        return jsonify({'error': 'Reply text is required'}), 400
    
    # Update reply
    review.reply.reply = reply_text
    review.reply.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Reply updated successfully',
        'reply': review.reply.to_dict()
    }), 200


@reviews_bp.route('/<int:review_id>/reply', methods=['DELETE'])
@jwt_required()
def delete_reply(review_id):
    """Delete a reply to a review (Admin only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    review = Review.query.get_or_404(review_id)
    
    if not review.reply:
        return jsonify({'error': 'Reply does not exist'}), 404
    
    db.session.delete(review.reply)
    db.session.commit()
    
    return jsonify({'message': 'Reply deleted successfully'}), 200


@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review_admin(review_id):
    """Delete a review (Admin or owner)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    review = Review.query.get_or_404(review_id)
    
    # Check if user is admin or review owner
    if user.role != 'admin' and review.user_id != user_id:
        return jsonify({'error': 'You can only delete your own reviews'}), 403
    
    db.session.delete(review)
    db.session.commit()
    
    return jsonify({'message': 'Review deleted successfully'}), 200
