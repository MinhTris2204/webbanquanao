from flask import Blueprint, jsonify, request
from models import db, Review, ReviewReply, Product, Order, OrderDetail, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc, func, and_
from datetime import datetime

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/product/<int:product_id>', methods=['GET'])
def get_product_reviews(product_id):
    """Get all reviews for a product"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'newest')  # newest, oldest, highest, lowest
        
        query = Review.query.filter_by(product_id=product_id)
        
        # Apply sorting
        if sort_by == 'newest':
            query = query.order_by(desc(Review.created_at))
        elif sort_by == 'oldest':
            query = query.order_by(Review.created_at)
        elif sort_by == 'highest':
            query = query.order_by(desc(Review.rating))
        elif sort_by == 'lowest':
            query = query.order_by(Review.rating)
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Calculate average rating
        all_reviews = Review.query.filter_by(product_id=product_id).all()
        average_rating = 0
        if all_reviews:
            total_rating = sum([r.rating for r in all_reviews])
            average_rating = total_rating / len(all_reviews)
        
        reviews = []
        for review in pagination.items:
            review_data = review.to_dict()
            # Get user info
            user = User.query.get(review.user_id)
            if user:
                review_data['user_name'] = user.hoten
            # Get replies
            replies = ReviewReply.query.filter_by(review_id=review.id).order_by(ReviewReply.created_at).all()
            review_data['replies'] = [reply.to_dict() for reply in replies]
            reviews.append(review_data)
        
        return jsonify({
            'reviews': reviews,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'average_rating': average_rating
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/user/can-review/<int:product_id>', methods=['GET'])
@jwt_required()
def can_user_review(product_id):
    """Check if user can review a product (must have purchased it)"""
    try:
        user_id = get_jwt_identity()
        
        # Check if user has already reviewed this product
        existing_review = Review.query.filter_by(
            user_id=user_id,
            product_id=product_id
        ).first()
        
        if existing_review:
            return jsonify({
                'can_review': False,
                'reason': 'already_reviewed',
                'review': existing_review.to_dict()
            })
        
        # Check if user has purchased this product
        purchased = db.session.query(OrderDetail).join(Order).filter(
            Order.user_id == user_id,
            OrderDetail.product_id == product_id,
            Order.trang_thai.in_(['Dang_xu_ly', 'Dang_giao', 'Da_giao'])
        ).first()
        
        if not purchased:
            return jsonify({
                'can_review': False,
                'reason': 'not_purchased'
            })
        
        return jsonify({
            'can_review': True
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/create', methods=['POST'])
@jwt_required()
def create_review():
    """Create a new review"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        product_id = data.get('product_id')
        rating = data.get('rating')
        comment = data.get('comment', '')
        
        if not product_id or not rating:
            return jsonify({'error': 'product_id and rating are required'}), 400
        
        if rating < 1 or rating > 5:
            return jsonify({'error': 'rating must be between 1 and 5'}), 400
        
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check if user has already reviewed
        existing_review = Review.query.filter_by(
            user_id=user_id,
            product_id=product_id
        ).first()
        
        if existing_review:
            return jsonify({'error': 'You have already reviewed this product'}), 400
        
        # Check if user has purchased the product
        purchased = db.session.query(OrderDetail).join(Order).filter(
            Order.user_id == user_id,
            OrderDetail.product_id == product_id,
            Order.trang_thai.in_(['Dang_xu_ly', 'Dang_giao', 'Da_giao'])
        ).first()
        
        if not purchased:
            return jsonify({'error': 'You can only review products you have purchased'}), 403
        
        # Create review
        review = Review(
            user_id=user_id,
            product_id=product_id,
            rating=rating,
            comment=comment
        )
        
        db.session.add(review)
        db.session.commit()
        
        return jsonify({
            'message': 'Review created successfully',
            'review': review.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/<int:review_id>', methods=['PUT'])
@jwt_required()
def update_review(review_id):
    """Update a review"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        if review.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if 'rating' in data:
            rating = data['rating']
            if rating < 1 or rating > 5:
                return jsonify({'error': 'rating must be between 1 and 5'}), 400
            review.rating = rating
        
        if 'comment' in data:
            review.comment = data['comment']
        
        review.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Review updated successfully',
            'review': review.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    """Delete a review"""
    try:
        user_id = get_jwt_identity()
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        if review.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(review)
        db.session.commit()
        
        return jsonify({'message': 'Review deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Admin endpoints
@reviews_bp.route('/admin/all', methods=['GET'])
@jwt_required()
def get_all_reviews():
    """Get all reviews (admin only)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        sort_by = request.args.get('sort_by', 'newest')
        filter_rating = request.args.get('rating', type=int)
        
        query = Review.query
        
        if filter_rating:
            query = query.filter_by(rating=filter_rating)
        
        if sort_by == 'newest':
            query = query.order_by(desc(Review.created_at))
        elif sort_by == 'oldest':
            query = query.order_by(Review.created_at)
        elif sort_by == 'highest':
            query = query.order_by(desc(Review.rating))
        elif sort_by == 'lowest':
            query = query.order_by(Review.rating)
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        reviews = []
        for review in pagination.items:
            review_data = review.to_dict()
            # Get user and product info
            user = User.query.get(review.user_id)
            product = Product.query.get(review.product_id)
            if user:
                review_data['user_name'] = user.hoten
                review_data['user_email'] = user.email
            if product:
                review_data['product_name'] = product.ten_san_pham
            # Get replies
            replies = ReviewReply.query.filter_by(review_id=review.id).order_by(ReviewReply.created_at).all()
            review_data['replies'] = [reply.to_dict() for reply in replies]
            reviews.append(review_data)
        
        return jsonify({
            'reviews': reviews,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/admin/alerts', methods=['GET'])
@jwt_required()
def get_review_alerts():
    """Get reviews that need attention (low ratings without replies)"""
    try:
        # Get reviews with rating <= 2 that don't have replies
        low_rating_reviews = Review.query.filter(
            Review.rating <= 2
        ).outerjoin(ReviewReply).filter(
            ReviewReply.id == None
        ).order_by(desc(Review.created_at)).limit(10).all()
        
        alerts = []
        for review in low_rating_reviews:
            review_data = review.to_dict()
            user = User.query.get(review.user_id)
            product = Product.query.get(review.product_id)
            if user:
                review_data['user_name'] = user.hoten
            if product:
                review_data['product_name'] = product.ten_san_pham
            alerts.append(review_data)
        
        return jsonify({
            'alerts': alerts,
            'count': len(alerts)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/reply', methods=['POST'])
@jwt_required()
def create_reply():
    """Create a reply to a review (admin only)"""
    try:
        data = request.json
        
        review_id = data.get('review_id')
        reply_text = data.get('reply_text')
        
        if not review_id or not reply_text:
            return jsonify({'error': 'review_id and reply_text are required'}), 400
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        reply = ReviewReply(
            review_id=review_id,
            reply_text=reply_text
        )
        
        db.session.add(reply)
        db.session.commit()
        
        return jsonify({
            'message': 'Reply created successfully',
            'reply': reply.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/reply/<int:reply_id>', methods=['PUT'])
@jwt_required()
def update_reply(reply_id):
    """Update a reply (admin only)"""
    try:
        data = request.json
        
        reply = ReviewReply.query.get(reply_id)
        if not reply:
            return jsonify({'error': 'Reply not found'}), 404
        
        if 'reply_text' in data:
            reply.reply_text = data['reply_text']
        
        reply.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Reply updated successfully',
            'reply': reply.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/reply/<int:reply_id>', methods=['DELETE'])
@jwt_required()
def delete_reply(reply_id):
    """Delete a reply (admin only)"""
    try:
        reply = ReviewReply.query.get(reply_id)
        if not reply:
            return jsonify({'error': 'Reply not found'}), 404
        
        db.session.delete(reply)
        db.session.commit()
        
        return jsonify({'message': 'Reply deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
