from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Review, Product, Order, OrderDetail, User
from datetime import datetime

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

@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    """Delete a review"""
    user_id = int(get_jwt_identity())
    review = Review.query.get_or_404(review_id)
    
    # Check if user owns this review
    if review.user_id != user_id:
        return jsonify({'error': 'You can only delete your own reviews'}), 403
    
    db.session.delete(review)
    db.session.commit()
    
    return jsonify({'message': 'Review deleted successfully'}), 200

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
