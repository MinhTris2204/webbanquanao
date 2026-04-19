from flask import Blueprint, jsonify, request
from models import db, Product, ProductView, Order, OrderDetail
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
import uuid

recommendations_bp = Blueprint('recommendations', __name__)

def get_user_or_session():
    """Lấy user_id nếu đã đăng nhập, ngược lại lấy/tạo session_id"""
    # Kỹ thuật: SESSION-BASED TRACKING cho guest users
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return {'user_id': user_id, 'session_id': None}
    except:
        pass
    
    # Đối với guest users, sử dụng session_id từ cookie hoặc tạo mới
    session_id = request.cookies.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
    
    return {'user_id': None, 'session_id': session_id}


@recommendations_bp.route('/track-view', methods=['POST'])
def track_view():
    """Theo dõi lượt xem sản phẩm cho thuật toán gợi ý"""
    # Kỹ thuật: EVENT TRACKING & IMPLICIT FEEDBACK
    try:
        data = request.json
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({'error': 'product_id is required'}), 400
        
        # Kiểm tra sản phẩm có tồn tại
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        user_session = get_user_or_session()
        
        # Tìm bản ghi xem sản phẩm hiện có
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
            # Cập nhật lượt xem hiện có
            view.view_count += 1
            view.last_viewed_at = datetime.utcnow()
        else:
            # Tạo bản ghi xem mới
            view = ProductView(
                user_id=user_session['user_id'],
                session_id=user_session['session_id'],
                product_id=product_id,
                view_count=1
            )
            db.session.add(view)
        
        db.session.commit()
        
        response = jsonify({'message': 'View tracked successfully'})
        
        # Lưu session_id vào cookie cho guest users (30 ngày)
        if user_session['session_id']:
            response.set_cookie('session_id', user_session['session_id'], max_age=30*24*60*60)
        
        return response
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/for-you', methods=['GET'])
def get_recommendations():
    """Gợi ý sản phẩm cá nhân hóa dựa trên hành vi người dùng"""
    ###########################################################################
    # Thuật toán: HYBRID RECOMMENDATION (Kết hợp nhiều phương pháp)
    # 1. COLLABORATIVE FILTERING - Phân tích lịch sử xem
    # 2. CONTENT-BASED FILTERING - Lọc theo category/gender
    # 3. POPULARITY-BASED RANKING - Ưu tiên sản phẩm hot
    # 4. FALLBACK MECHANISM - Bổ sung từ trending nếu thiếu
    ###########################################################################
    try:
        limit = request.args.get('limit', 8, type=int)
        user_session = get_user_or_session()
        
        # Lấy danh sách sản phẩm người dùng đã xem (10 sản phẩm gần nhất)
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
            # Không có lịch sử xem - fallback về trending
            trending = get_trending_products_query(limit)
            return jsonify({
                'products': [p.to_dict() for p in trending],
                'based_on': 'trending'
            })
        
        # Trích xuất categories và gender từ sản phẩm đã xem
        viewed_product_details = Product.query.filter(
            Product.products_id.in_(viewed_product_ids)
        ).all()
        
        categories = list(set([p.loai for p in viewed_product_details if p.loai]))
        genders = list(set([p.gioi_tinh for p in viewed_product_details if p.gioi_tinh]))
        
        # Subquery: tổng hợp lượt xem theo sản phẩm
        view_count_subquery = db.session.query(
            ProductView.product_id,
            func.sum(ProductView.view_count).label('total_views')
        ).group_by(ProductView.product_id).subquery()
        
        # Xây dựng query gợi ý với Content-Based Filtering
        recommendations_query = Product.query.filter(
            Product.trang_thai == 'Con_hang',
            Product.products_id.notin_(viewed_product_ids)  # Loại trừ sản phẩm đã xem
        )
        
        # Lọc theo categories hoặc gender tương tự
        if categories or genders:
            recommendations_query = recommendations_query.filter(
                db.or_(
                    Product.loai.in_(categories) if categories else False,
                    Product.gioi_tinh.in_(genders) if genders else False
                )
            )
        
        # Sắp xếp theo độ phổ biến (Popularity-Based Ranking)
        recommendations_query = recommendations_query.outerjoin(
            view_count_subquery,
            Product.products_id == view_count_subquery.c.product_id
        ).order_by(
            desc(view_count_subquery.c.total_views),
            desc(Product.created_at)
        )
        
        recommendations = recommendations_query.limit(limit).all()
        
        # Fallback: Bổ sung từ trending nếu không đủ
        if len(recommendations) < limit:
            remaining = limit - len(recommendations)
            exclude = [p.products_id for p in recommendations] + viewed_product_ids
            trending = get_trending_products_query(remaining, exclude_ids=exclude)
            recommendations.extend(trending)
        
        return jsonify({
            'products': [p.to_dict() for p in recommendations],
            'based_on': 'user_behavior'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/similar/<int:product_id>', methods=['GET'])
def get_similar_products(product_id):
    """Tìm sản phẩm tương tự với sản phẩm đã cho"""
    ###########################################################################
    # Thuật toán: CONTENT-BASED SIMILARITY với MULTI-CRITERIA RANKING
    # - Bắt buộc: Cùng loại sản phẩm (áo -> áo, quần -> quần)
    # - Ưu tiên: Cùng giới tính > Giá tương đương (±50%) > Random
    # - Kỹ thuật: CASE-BASED SCORING
    ###########################################################################
    try:
        limit = request.args.get('limit', 8, type=int)
        
        # Lấy thông tin sản phẩm tham chiếu
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Tính khoảng giá tương tự (±50%)
        price_min = float(product.gia_ban) * 0.5
        price_max = float(product.gia_ban) * 1.5
        
        # Tìm sản phẩm tương tự - BẮT BUỘC cùng loại
        similar = Product.query.filter(
            Product.products_id != product_id,
            Product.trang_thai == 'Con_hang',
            Product.loai == product.loai  # Bắt buộc cùng category
        ).order_by(
            # Ưu tiên 1: Cùng giới tính
            db.case(
                (Product.gioi_tinh == product.gioi_tinh, 1),
                else_=0
            ).desc(),
            # Ưu tiên 2: Giá tương đương
            db.case(
                (Product.gia_ban.between(price_min, price_max), 1),
                else_=0
            ).desc(),
            # Ưu tiên 3: Random để tạo đa dạng
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
    """Lấy danh sách sản phẩm đang thịnh hành"""
    # Thuật toán: TIME-BASED POPULARITY RANKING (30 ngày gần nhất)
    try:
        limit = request.args.get('limit', 8, type=int)
        return get_trending_products(limit)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_trending_products(limit=8):
    """Helper function để lấy sản phẩm trending"""
    products = get_trending_products_query(limit)
    return jsonify({
        'products': [p.to_dict() for p in products],
        'based_on': 'trending'
    })


def get_trending_products_query(limit=8, exclude_ids=None):
    """Helper function để query sản phẩm trending"""
    ###########################################################################
    # Thuật toán: AGGREGATION-BASED TRENDING
    # 1. TIME WINDOW FILTERING - Chỉ tính 30 ngày gần nhất
    # 2. AGGREGATION - Tổng hợp view_count theo product_id
    # 3. RANKING - Sắp xếp theo total_views giảm dần
    ###########################################################################
    
    # Lấy sản phẩm có nhiều lượt xem nhất trong 30 ngày qua
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Subquery: Tổng hợp lượt xem theo sản phẩm
    trending_subquery = db.session.query(
        ProductView.product_id,
        func.sum(ProductView.view_count).label('total_views')
    ).filter(
        ProductView.last_viewed_at >= thirty_days_ago  # Time window: 30 ngày
    ).group_by(ProductView.product_id).subquery()
    
    query = Product.query.filter(
        Product.trang_thai == 'Con_hang'
    )
    
    # Loại trừ các sản phẩm đã có trong danh sách khác
    if exclude_ids:
        query = query.filter(Product.products_id.notin_(exclude_ids))
    
    # Join với trending_subquery và sắp xếp theo popularity
    products = query.outerjoin(
        trending_subquery,
        Product.products_id == trending_subquery.c.product_id
    ).order_by(
        desc(trending_subquery.c.total_views),  # Ưu tiên: Nhiều lượt xem
        desc(Product.created_at)  # Fallback: Sản phẩm mới nhất
    ).limit(limit).all()
    
    return products


@recommendations_bp.route('/frequently-bought-together/<int:product_id>', methods=['GET'])
def get_frequently_bought_together(product_id):
    """Tìm sản phẩm thường được mua cùng với sản phẩm đã cho"""
    ###########################################################################
    # Thuật toán: MARKET BASKET ANALYSIS (Phân tích giỏ hàng)
    # Kỹ thuật: ASSOCIATION RULE MINING - Frequency Counting
    # - Tìm đơn hàng có chứa sản phẩm A
    # - Đếm tần suất xuất hiện sản phẩm B trong các đơn hàng đó
    # - Sắp xếp theo tần suất giảm dần
    ###########################################################################
    try:
        limit = request.args.get('limit', 4, type=int)
        
        # Bước 1: Tìm các đơn hàng đã hoàn thành có chứa sản phẩm này
        orders_with_product = db.session.query(OrderDetail.order_id).join(
            Order, OrderDetail.order_id == Order.id
        ).filter(
            OrderDetail.product_id == product_id,
            Order.trangthai == 'hoan_thanh'  # Chỉ tính đơn hàng hoàn thành
        ).subquery()
        
        # Bước 2: Đếm tần suất xuất hiện của các sản phẩm khác (Frequency Counting)
        frequently_bought = db.session.query(
            OrderDetail.product_id,
            func.count(OrderDetail.product_id).label('frequency')
        ).filter(
            OrderDetail.order_id.in_(orders_with_product),
            OrderDetail.product_id != product_id  # Loại trừ chính sản phẩm đang xem
        ).group_by(OrderDetail.product_id).order_by(
            desc('frequency')  # Sắp xếp theo tần suất
        ).limit(limit).all()
        
        product_ids = [item[0] for item in frequently_bought]
        
        # Nếu không có dữ liệu thực tế, trả về mảng rỗng
        if not product_ids:
            return jsonify({
                'products': [],
                'based_on': 'no_data'
            })
        
        # Bước 3: Lấy thông tin chi tiết sản phẩm
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
