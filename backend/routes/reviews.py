from flask import Blueprint, jsonify, request
from models import db, Review, ReviewReply, Product, Order, OrderDetail, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc, func, and_
from datetime import datetime

reviews_bp = Blueprint('reviews', __name__)


# ==================== QUẢN LÝ ĐÁNH GIÁ SẢN PHẨM ====================
@reviews_bp.route('/product/<int:product_id>', methods=['GET', 'POST'])
def handle_product_reviews(product_id):
    """Lấy tất cả đánh giá cho sản phẩm (GET) hoặc tạo đánh giá mới (POST)"""
    if request.method == 'POST':
        return create_product_review(product_id)
    
    # Phương thức GET - lấy tất cả đánh giá
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'newest')  # newest, oldest, highest, lowest
        
        query = Review.query.filter_by(product_id=product_id)
        
        # Áp dụng sắp xếp
        if sort_by == 'newest':
            query = query.order_by(desc(Review.created_at))
        elif sort_by == 'oldest':
            query = query.order_by(Review.created_at)
        elif sort_by == 'highest':
            query = query.order_by(desc(Review.rating))
        elif sort_by == 'lowest':
            query = query.order_by(Review.rating)
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Tính toán đánh giá trung bình
        all_reviews = Review.query.filter_by(product_id=product_id).all()
        average_rating = 0
        if all_reviews:
            total_rating = sum([r.rating for r in all_reviews])
            average_rating = total_rating / len(all_reviews)
        
        reviews = []
        for review in pagination.items:
            review_data = review.to_dict()
            # Lấy thông tin người dùng
            user = User.query.get(review.user_id)
            if user:
                review_data['user_name'] = user.hoten
            # Lấy phản hồi
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
    """Kiểm tra xem người dùng có thể đánh giá sản phẩm không (phải đã mua)"""
    try:
        user_id = get_jwt_identity()
        
        # Kiểm tra xem người dùng đã đánh giá sản phẩm này chưa
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
        
        # Kiểm tra xem người dùng đã mua sản phẩm này chưa (chỉ đơn hàng hoàn thành)
        purchased = db.session.query(OrderDetail).join(Order).filter(
            Order.user_id == user_id,
            OrderDetail.product_id == product_id,
            Order.trangthai == 'hoan_thanh'
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


@jwt_required()
def create_product_review(product_id):
    """Tạo đánh giá mới cho sản phẩm"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        rating = data.get('rating')
        comment = data.get('comment', '')
        
        if not rating:
            return jsonify({'error': 'rating là bắt buộc'}), 400
        
        if rating < 1 or rating > 5:
            return jsonify({'error': 'rating phải từ 1 đến 5'}), 400
        
        # Kiểm tra sản phẩm có tồn tại không
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Sản phẩm không tồn tại'}), 404
        
        # Kiểm tra người dùng đã đánh giá chưa
        existing_review = Review.query.filter_by(
            user_id=user_id,
            product_id=product_id
        ).first()
        
        if existing_review:
            return jsonify({'error': 'Bạn đã đánh giá sản phẩm này rồi'}), 400
        
        # Kiểm tra người dùng đã mua sản phẩm (chỉ đơn hàng hoàn thành)
        order_detail = db.session.query(OrderDetail).join(Order).filter(
            Order.user_id == user_id,
            OrderDetail.product_id == product_id,
            Order.trangthai == 'hoan_thanh'
        ).first()
        
        if not order_detail:
            return jsonify({'error': 'Bạn chỉ có thể đánh giá sản phẩm đã mua'}), 403
        
        # Tạo đánh giá
        review = Review(
            user_id=user_id,
            product_id=product_id,
            order_id=order_detail.order_id,
            rating=rating,
            comment=comment
        )
        
        db.session.add(review)
        db.session.commit()
        
        return jsonify({
            'message': 'Tạo đánh giá thành công',
            'review': review.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/create', methods=['POST'])
@jwt_required()
def create_review():
    """Tạo đánh giá mới (endpoint cũ)"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        product_id = data.get('product_id')
        rating = data.get('rating')
        comment = data.get('comment', '')
        
        if not product_id or not rating:
            return jsonify({'error': 'product_id và rating là bắt buộc'}), 400
        
        if rating < 1 or rating > 5:
            return jsonify({'error': 'rating phải từ 1 đến 5'}), 400
        
        # Kiểm tra sản phẩm có tồn tại không
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Sản phẩm không tồn tại'}), 404
        
        # Kiểm tra người dùng đã đánh giá chưa
        existing_review = Review.query.filter_by(
            user_id=user_id,
            product_id=product_id
        ).first()
        
        if existing_review:
            return jsonify({'error': 'Bạn đã đánh giá sản phẩm này rồi'}), 400
        
        # Kiểm tra người dùng đã mua sản phẩm (chỉ đơn hàng hoàn thành)
        order_detail = db.session.query(OrderDetail).join(Order).filter(
            Order.user_id == user_id,
            OrderDetail.product_id == product_id,
            Order.trangthai == 'hoan_thanh'
        ).first()
        
        if not order_detail:
            return jsonify({'error': 'Bạn chỉ có thể đánh giá sản phẩm đã mua'}), 403
        
        # Tạo đánh giá
        review = Review(
            user_id=user_id,
            product_id=product_id,
            order_id=order_detail.order_id,
            rating=rating,
            comment=comment
        )
        
        db.session.add(review)
        db.session.commit()
        
        return jsonify({
            'message': 'Tạo đánh giá thành công',
            'review': review.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/<int:review_id>', methods=['PUT'])
@jwt_required()
def update_review(review_id):
    """Cập nhật đánh giá"""
    try:
        user_id = get_jwt_identity()
        # Chuyển đổi sang int nếu là string
        if isinstance(user_id, str):
            user_id = int(user_id)
        data = request.json
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Đánh giá không tồn tại'}), 404
        
        if review.user_id != user_id:
            return jsonify({'error': 'Không có quyền'}), 403
        
        if 'rating' in data:
            rating = data['rating']
            if rating < 1 or rating > 5:
                return jsonify({'error': 'rating phải từ 1 đến 5'}), 400
            review.rating = rating
        
        if 'comment' in data:
            review.comment = data['comment']
        
        review.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Cập nhật đánh giá thành công',
            'review': review.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    """Xóa đánh giá"""
    try:
        user_id = get_jwt_identity()
        # Chuyển đổi sang int nếu là string
        if isinstance(user_id, str):
            user_id = int(user_id)
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Đánh giá không tồn tại'}), 404
        
        # Lấy người dùng hiện tại để kiểm tra quyền
        current_user = User.query.get(user_id)
        if not current_user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        # Cho phép xóa nếu người dùng là chủ đánh giá HOẶC là admin
        if review.user_id != user_id and current_user.role != 'admin':
            return jsonify({'error': 'Không có quyền'}), 403
        
        db.session.delete(review)
        db.session.commit()
        
        return jsonify({'message': 'Xóa đánh giá thành công'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== QUẢN LÝ ĐÁNH GIÁ (ADMIN) ====================
@reviews_bp.route('/admin/all', methods=['GET'])
@jwt_required()
def get_all_reviews():
    """Lấy tất cả đánh giá (chỉ admin)"""
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
            # Lấy thông tin người dùng và sản phẩm
            user = User.query.get(review.user_id)
            product = Product.query.get(review.product_id)
            if user:
                review_data['user_name'] = user.hoten
                review_data['user_email'] = user.email
            if product:
                review_data['product_name'] = product.ten_san_pham
            # Lấy phản hồi
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
    """Lấy đánh giá cần chú ý (đánh giá thấp chưa có phản hồi)"""
    try:
        # Lấy đánh giá có rating <= 2 mà chưa có phản hồi
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


@reviews_bp.route('/<int:review_id>/reply', methods=['POST', 'PUT', 'DELETE'])
@jwt_required()
def handle_review_reply(review_id):
    """Tạo, cập nhật hoặc xóa phản hồi cho đánh giá (chỉ admin)"""
    try:
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Đánh giá không tồn tại'}), 404
        
        if request.method == 'POST':
            # Tạo phản hồi mới
            data = request.json
            reply_text = data.get('reply')
            
            if not reply_text:
                return jsonify({'error': 'reply là bắt buộc'}), 400
            
            # Kiểm tra xem phản hồi đã tồn tại chưa
            existing_reply = ReviewReply.query.filter_by(review_id=review_id).first()
            if existing_reply:
                return jsonify({'error': 'Đánh giá này đã có phản hồi'}), 400
            
            reply = ReviewReply(
                review_id=review_id,
                reply=reply_text
            )
            
            db.session.add(reply)
            db.session.commit()
            
            return jsonify({
                'message': 'Tạo phản hồi thành công',
                'reply': reply.to_dict()
            }), 201
        
        elif request.method == 'PUT':
            # Cập nhật phản hồi hiện tại
            data = request.json
            reply_text = data.get('reply')
            
            if not reply_text:
                return jsonify({'error': 'reply là bắt buộc'}), 400
            
            reply = ReviewReply.query.filter_by(review_id=review_id).first()
            if not reply:
                return jsonify({'error': 'Phản hồi không tồn tại'}), 404
            
            reply.reply = reply_text
            reply.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'message': 'Cập nhật phản hồi thành công',
                'reply': reply.to_dict()
            })
        
        elif request.method == 'DELETE':
            # Xóa phản hồi
            reply = ReviewReply.query.filter_by(review_id=review_id).first()
            if not reply:
                return jsonify({'error': 'Phản hồi không tồn tại'}), 404
            
            db.session.delete(reply)
            db.session.commit()
            
            return jsonify({'message': 'Xóa phản hồi thành công'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
