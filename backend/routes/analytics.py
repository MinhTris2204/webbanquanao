from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Product, Order, OrderDetail, ProductView, Promotion
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func, desc, and_

analytics_bp = Blueprint('analytics', __name__)


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


@analytics_bp.route('/top-customers', methods=['GET'])
@admin_required
def get_top_customers():
    """Top khách hàng chi tiêu nhiều nhất"""
    limit = request.args.get('limit', 10, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = db.session.query(
        User.user_id,
        User.full_name,
        User.email,
        User.phone,
        func.count(Order.id).label('total_orders'),
        func.sum(Order.tongtien).label('total_spent'),
        func.avg(Order.tongtien).label('avg_order_value')
    ).join(Order, User.user_id == Order.user_id)\
     .filter(Order.trangthai == 'hoan_thanh')
    
    if start_date:
        query = query.filter(Order.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        # Set đến cuối ngày 23:59:59 để bao gồm toàn bộ ngày được chọn
        end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        query = query.filter(Order.created_at <= end_dt)
    
    results = query.group_by(User.user_id, User.full_name, User.email, User.phone)\
                   .order_by(desc('total_spent'))\
                   .limit(limit)\
                   .all()
    
    customers = []
    for r in results:
        customers.append({
            'user_id': r.user_id,
            'hoten': r.full_name,
            'email': r.email,
            'sdt': r.phone,
            'total_orders': r.total_orders,
            'total_spent': float(r.total_spent) if r.total_spent else 0,
            'avg_order_value': float(r.avg_order_value) if r.avg_order_value else 0
        })
    
    return jsonify({'customers': customers}), 200


@analytics_bp.route('/top-products', methods=['GET'])
@admin_required
def get_top_products():
    """Top sản phẩm bán chạy"""
    limit = request.args.get('limit', 10, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    
    query = db.session.query(
        Product.products_id,
        Product.ten_san_pham,
        Product.gia_ban,
        Product.loai,
        Product.hinh_anh,
        func.sum(OrderDetail.quantity).label('total_sold'),
        func.sum(OrderDetail.line_total).label('total_revenue'),
        func.count(OrderDetail.id).label('order_count')
    ).join(OrderDetail, Product.products_id == OrderDetail.product_id)\
     .join(Order, OrderDetail.order_id == Order.id)\
     .filter(Order.trangthai == 'hoan_thanh')
    
    if start_date:
        query = query.filter(Order.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        # Set đến cuối ngày 23:59:59 để bao gồm toàn bộ ngày được chọn
        end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        query = query.filter(Order.created_at <= end_dt)
    if category:
        query = query.filter(Product.loai == category)
    
    results = query.group_by(
        Product.products_id, Product.ten_san_pham, 
        Product.gia_ban, Product.loai, Product.hinh_anh
    ).order_by(desc('total_sold')).limit(limit).all()
    
    products = []
    for r in results:
        hinh_anh = r.hinh_anh
        if hinh_anh and not hinh_anh.startswith('http') and not hinh_anh.startswith('data:'):
            hinh_anh = f"/uploads/{hinh_anh}"
        
        products.append({
            'products_id': r.products_id,
            'ten_san_pham': r.ten_san_pham,
            'gia_ban': float(r.gia_ban) if r.gia_ban else 0,
            'loai': r.loai,
            'hinh_anh': hinh_anh,
            'total_sold': r.total_sold or 0,
            'total_revenue': float(r.total_revenue) if r.total_revenue else 0,
            'order_count': r.order_count or 0
        })
    
    return jsonify({'products': products}), 200


@analytics_bp.route('/product-categories', methods=['GET'])
@admin_required
def get_product_categories():
    """Lấy danh sách loại sản phẩm"""
    categories = db.session.query(Product.loai).distinct().all()
    return jsonify({'categories': [c[0] for c in categories if c[0]]}), 200


@analytics_bp.route('/sales-trend', methods=['GET'])
@admin_required
def get_sales_trend():
    """Xu hướng doanh số theo thời gian"""
    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    results = db.session.query(
        func.date(Order.created_at).label('date'),
        func.count(Order.id).label('order_count'),
        func.sum(Order.tongtien).label('revenue')
    ).filter(
        Order.created_at >= start_date,
        Order.trangthai == 'hoan_thanh'
    ).group_by(func.date(Order.created_at))\
     .order_by('date').all()
    
    trend = []
    for r in results:
        trend.append({
            'date': r.date.isoformat() if r.date else None,
            'order_count': r.order_count or 0,
            'revenue': float(r.revenue) if r.revenue else 0
        })
    
    return jsonify({'trend': trend}), 200


@analytics_bp.route('/promotion-suggestions', methods=['GET'])
@admin_required
def get_promotion_suggestions():
    """Gợi ý sản phẩm cần khuyến mãi dựa trên dữ liệu"""
    
    # Sản phẩm có nhiều lượt xem nhưng ít mua
    low_conversion = db.session.query(
        Product.products_id,
        Product.ten_san_pham,
        Product.gia_ban,
        Product.loai,
        Product.hinh_anh,
        func.coalesce(func.sum(ProductView.view_count), 0).label('total_views'),
        func.coalesce(func.sum(OrderDetail.quantity), 0).label('total_sold')
    ).outerjoin(ProductView, Product.products_id == ProductView.product_id)\
     .outerjoin(OrderDetail, Product.products_id == OrderDetail.product_id)\
     .group_by(Product.products_id, Product.ten_san_pham, Product.gia_ban, Product.loai, Product.hinh_anh)\
     .having(func.coalesce(func.sum(ProductView.view_count), 0) > 5)\
     .order_by(desc('total_views'))\
     .limit(50).all()
    
    suggestions = []
    for r in low_conversion:
        views = r.total_views or 0
        sold = r.total_sold or 0

        # Bỏ qua sản phẩm bán tốt (sold >= views * 0.1 và sold >= 5)
        if sold >= 5 and views > 0 and (sold / views) >= 0.1:
            continue

        hinh_anh = r.hinh_anh
        if hinh_anh and not hinh_anh.startswith('http') and not hinh_anh.startswith('data:'):
            hinh_anh = f"/uploads/{hinh_anh}"
        
        # Kiểm tra khuyến mãi đang hoạt động
        active_promotion = Promotion.query.filter(
            Promotion.product_id == r.products_id,
            Promotion.is_active == True,
            Promotion.start_date <= datetime.utcnow(),
            Promotion.end_date >= datetime.utcnow()
        ).first()
        
        has_promotion = active_promotion is not None
        promotion_price = None
        promotion_info = None
        
        if active_promotion:
            gia_ban = float(r.gia_ban) if r.gia_ban else 0
            discount_val = float(active_promotion.discount_value)
            if active_promotion.discount_type == 'percent':
                promotion_price = gia_ban * (1 - discount_val / 100)
                promotion_info = f'-{discount_val:.0f}%'
            else:
                promotion_price = gia_ban - discount_val
                promotion_info = f'-{int(discount_val):,}đ'
        
        # Mức độ ưu tiên dựa trên: lượt xem cao + bán ít
        # Score = views - sold * 10 (xem nhiều mà bán ít thì score cao)
        priority_score = views - sold * 10

        if views >= 50 and sold == 0:
            priority = 'high'
            priority_label = 'Cao'
            reason = 'Rất nhiều lượt xem nhưng gần như không bán được - CẦN KHUYẾN MÃI NGAY'
            suggested_discount = '20-30%'
        elif views >= 20 and sold < 3:
            priority = 'medium'
            priority_label = 'Trung bình'
            reason = 'Nhiều lượt xem nhưng ít mua - nên tạo khuyến mãi'
            suggested_discount = '10-20%'
        else:
            priority = 'low'
            priority_label = 'Thấp'
            reason = 'Lượt xem khá nhưng chưa có nhiều đơn - có thể cân nhắc khuyến mãi nhẹ'
            suggested_discount = '5-10%'
        
        suggestions.append({
            'products_id': r.products_id,
            'ten_san_pham': r.ten_san_pham,
            'gia_ban': float(r.gia_ban) if r.gia_ban else 0,
            'gia_khuyen_mai': round(promotion_price, 0) if promotion_price else None,
            'promotion_info': promotion_info,
            'loai': r.loai,
            'hinh_anh': hinh_anh,
            'total_views': views,
            'total_sold': sold,
            'has_promotion': has_promotion,
            'priority': priority,
            'priority_label': priority_label,
            'priority_score': priority_score,
            'reason': reason if not has_promotion else 'Đang khuyến mãi nhưng vẫn ít người mua - cần xem xét lại chiến lược',
            'suggested_discount': suggested_discount
        })
    
    # Sản phẩm tồn kho lâu (ít bán trong 30 ngày qua)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    slow_moving = db.session.query(
        Product.products_id,
        Product.ten_san_pham,
        Product.gia_ban,
        Product.loai,
        Product.hinh_anh,
        func.coalesce(func.sum(OrderDetail.quantity), 0).label('recent_sold')
    ).outerjoin(
        OrderDetail, 
        and_(
            Product.products_id == OrderDetail.product_id,
            OrderDetail.created_at >= thirty_days_ago
        )
    ).filter(Product.trang_thai == 'Con_hang')\
     .group_by(Product.products_id, Product.ten_san_pham, Product.gia_ban, Product.loai, Product.hinh_anh)\
     .having(func.coalesce(func.sum(OrderDetail.quantity), 0) < 3)\
     .order_by('recent_sold')\
     .limit(50).all()
    
    for r in slow_moving:
        if not any(s['products_id'] == r.products_id for s in suggestions):
            hinh_anh = r.hinh_anh
            if hinh_anh and not hinh_anh.startswith('http') and not hinh_anh.startswith('data:'):
                hinh_anh = f"/uploads/{hinh_anh}"
            
            active_promotion = Promotion.query.filter(
                Promotion.product_id == r.products_id,
                Promotion.is_active == True,
                Promotion.start_date <= datetime.utcnow(),
                Promotion.end_date >= datetime.utcnow()
            ).first()
            
            has_promotion = active_promotion is not None
            promotion_price = None
            promotion_info = None
            
            if active_promotion:
                gia_ban = float(r.gia_ban) if r.gia_ban else 0
                discount_val = float(active_promotion.discount_value)
                if active_promotion.discount_type == 'percent':
                    promotion_price = gia_ban * (1 - discount_val / 100)
                    promotion_info = f'-{discount_val:.0f}%'
                else:
                    promotion_price = gia_ban - discount_val
                    promotion_info = f'-{int(discount_val):,}đ'
            
            recent_sold = r.recent_sold or 0
            if recent_sold == 0:
                priority = 'high'
                priority_label = 'Cao'
                reason = 'Đang khuyến mãi nhưng vẫn không bán được - cần xem xét giảm giá mạnh hơn' if has_promotion else 'Không bán được sản phẩm nào trong 30 ngày - CẦN KHUYẾN MÃI NGAY'
                suggested_discount = '25-35%'
                priority_score = 100
            else:
                priority = 'medium'
                priority_label = 'Trung bình'
                reason = 'Đang khuyến mãi nhưng bán chậm - cần điều chỉnh mức giảm giá' if has_promotion else 'Sản phẩm bán chậm trong 30 ngày qua - nên tạo khuyến mãi'
                suggested_discount = '15-25%'
                priority_score = 50
            
            suggestions.append({
                'products_id': r.products_id,
                'ten_san_pham': r.ten_san_pham,
                'gia_ban': float(r.gia_ban) if r.gia_ban else 0,
                'gia_khuyen_mai': round(promotion_price, 0) if promotion_price else None,
                'promotion_info': promotion_info,
                'loai': r.loai,
                'hinh_anh': hinh_anh,
                'total_views': 0,
                'total_sold': recent_sold,
                'has_promotion': has_promotion,
                'priority': priority,
                'priority_label': priority_label,
                'priority_score': priority_score,
                'reason': reason,
                'suggested_discount': suggested_discount
            })
    
    # Sắp xếp theo priority_score cao nhất lên đầu
    suggestions.sort(key=lambda x: x['priority_score'], reverse=True)
    
    return jsonify({'suggestions': suggestions}), 200


@analytics_bp.route('/view-to-purchase', methods=['GET'])
@admin_required
def get_view_to_purchase_analytics():
    """Phân tích hành vi xem sản phẩm - Tỷ lệ chuyển đổi xem → mua"""
    limit = request.args.get('limit', 20, type=int)
    
    # Lấy thống kê xem và mua cho từng sản phẩm
    results = db.session.query(
        Product.products_id,
        Product.ten_san_pham,
        Product.gia_ban,
        Product.loai,
        Product.hinh_anh,
        func.coalesce(func.sum(ProductView.view_count), 0).label('total_views'),
        func.count(func.distinct(ProductView.user_id)).label('unique_viewers')
    ).outerjoin(ProductView, Product.products_id == ProductView.product_id)\
     .group_by(Product.products_id, Product.ten_san_pham, Product.gia_ban, Product.loai, Product.hinh_anh)\
     .having(func.coalesce(func.sum(ProductView.view_count), 0) > 0)\
     .order_by(desc('total_views'))\
     .limit(limit).all()
    
    analytics = []
    for r in results:
        # Đếm số lượng đã bán
        sold_result = db.session.query(
            func.coalesce(func.sum(OrderDetail.quantity), 0)
        ).join(Order, OrderDetail.order_id == Order.id)\
         .filter(
            OrderDetail.product_id == r.products_id,
            Order.trangthai == 'hoan_thanh'
        ).scalar()
        
        total_sold = sold_result or 0
        total_views = r.total_views or 0
        conversion_rate = (total_sold / total_views * 100) if total_views > 0 else 0
        
        hinh_anh = r.hinh_anh
        if hinh_anh and not hinh_anh.startswith('http') and not hinh_anh.startswith('data:'):
            hinh_anh = f"/uploads/{hinh_anh}"
        
        analytics.append({
            'products_id': r.products_id,
            'ten_san_pham': r.ten_san_pham,
            'gia_ban': float(r.gia_ban) if r.gia_ban else 0,
            'loai': r.loai,
            'hinh_anh': hinh_anh,
            'total_views': total_views,
            'unique_viewers': r.unique_viewers or 0,
            'total_sold': total_sold,
            'conversion_rate': round(conversion_rate, 2)
        })
    
    # Tính tổng quan
    total_views_all = sum(a['total_views'] for a in analytics)
    total_sold_all = sum(a['total_sold'] for a in analytics)
    overall_conversion = (total_sold_all / total_views_all * 100) if total_views_all > 0 else 0
    
    return jsonify({
        'analytics': analytics,
        'summary': {
            'total_views': total_views_all,
            'total_sold': total_sold_all,
            'overall_conversion_rate': round(overall_conversion, 2)
        }
    }), 200


@analytics_bp.route('/customer-segments', methods=['GET'])
@admin_required
def get_customer_segments():
    """Phân khúc khách hàng theo giá trị"""
    
    # Lấy tổng chi tiêu của từng khách hàng
    customer_spending = db.session.query(
        User.user_id,
        func.sum(Order.tongtien).label('total_spent')
    ).join(Order, User.user_id == Order.user_id)\
     .filter(Order.trangthai == 'hoan_thanh')\
     .group_by(User.user_id).all()
    
    # Phân khúc
    vip = 0  # > 5 triệu
    loyal = 0  # 2-5 triệu
    regular = 0  # 500k - 2 triệu
    new_customer = 0  # < 500k
    
    for c in customer_spending:
        spent = float(c.total_spent) if c.total_spent else 0
        if spent > 5000000:
            vip += 1
        elif spent > 2000000:
            loyal += 1
        elif spent > 500000:
            regular += 1
        else:
            new_customer += 1
    
    # Khách chưa mua hàng
    total_users = User.query.filter(User.role == 'customer').count()
    no_purchase = total_users - len(customer_spending)
    
    return jsonify({
        'segments': [
            {'name': 'VIP (>5 triệu)', 'count': vip, 'color': '#FFD700'},
            {'name': 'Trung thành (2-5 triệu)', 'count': loyal, 'color': '#4CAF50'},
            {'name': 'Thường xuyên (500k-2 triệu)', 'count': regular, 'color': '#2196F3'},
            {'name': 'Mới (<500k)', 'count': new_customer, 'color': '#9E9E9E'},
            {'name': 'Chưa mua hàng', 'count': no_purchase, 'color': '#F44336'}
        ],
        'total_customers': total_users
    }), 200


@analytics_bp.route('/overview', methods=['GET'])
@admin_required
def get_analytics_overview():
    """Tổng quan phân tích - thống kê nhanh"""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    
    # Doanh thu 30 ngày
    revenue_30d = db.session.query(
        func.coalesce(func.sum(Order.tongtien), 0)
    ).filter(
        Order.trangthai == 'hoan_thanh',
        Order.created_at >= thirty_days_ago
    ).scalar() or 0
    
    # Doanh thu 7 ngày
    revenue_7d = db.session.query(
        func.coalesce(func.sum(Order.tongtien), 0)
    ).filter(
        Order.trangthai == 'hoan_thanh',
        Order.created_at >= seven_days_ago
    ).scalar() or 0
    
    # Số đơn hàng 30 ngày
    orders_30d = Order.query.filter(
        Order.trangthai == 'hoan_thanh',
        Order.created_at >= thirty_days_ago
    ).count()
    
    # Số đơn hàng 7 ngày
    orders_7d = Order.query.filter(
        Order.trangthai == 'hoan_thanh',
        Order.created_at >= seven_days_ago
    ).count()
    
    # Khách hàng mới 30 ngày
    new_customers_30d = User.query.filter(
        User.role == 'customer',
        User.created_at >= thirty_days_ago
    ).count()
    
    # Tổng lượt xem sản phẩm 30 ngày
    views_30d = db.session.query(
        func.coalesce(func.sum(ProductView.view_count), 0)
    ).filter(
        ProductView.created_at >= thirty_days_ago
    ).scalar() or 0
    
    # Tổng sản phẩm đã bán 30 ngày
    products_sold_30d = db.session.query(
        func.coalesce(func.sum(OrderDetail.quantity), 0)
    ).join(Order, OrderDetail.order_id == Order.id)\
     .filter(
        Order.trangthai == 'hoan_thanh',
        Order.created_at >= thirty_days_ago
    ).scalar() or 0
    
    # Giá trị đơn hàng trung bình
    avg_order_value = db.session.query(
        func.coalesce(func.avg(Order.tongtien), 0)
    ).filter(
        Order.trangthai == 'hoan_thanh',
        Order.created_at >= thirty_days_ago
    ).scalar() or 0
    
    # Tỷ lệ chuyển đổi tổng thể
    total_views = db.session.query(
        func.coalesce(func.sum(ProductView.view_count), 0)
    ).scalar() or 0
    
    total_sold = db.session.query(
        func.coalesce(func.sum(OrderDetail.quantity), 0)
    ).join(Order, OrderDetail.order_id == Order.id)\
     .filter(Order.trangthai == 'hoan_thanh').scalar() or 0
    
    conversion_rate = (total_sold / total_views * 100) if total_views > 0 else 0
    
    return jsonify({
        'revenue_30d': float(revenue_30d),
        'revenue_7d': float(revenue_7d),
        'orders_30d': orders_30d,
        'orders_7d': orders_7d,
        'new_customers_30d': new_customers_30d,
        'views_30d': views_30d,
        'products_sold_30d': products_sold_30d,
        'avg_order_value': float(avg_order_value),
        'conversion_rate': round(conversion_rate, 2)
    }), 200


@analytics_bp.route('/revenue-by-category', methods=['GET'])
@admin_required
def get_revenue_by_category():
    """Doanh thu theo loại sản phẩm"""
    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    results = db.session.query(
        Product.loai,
        func.sum(OrderDetail.line_total).label('revenue'),
        func.sum(OrderDetail.quantity).label('quantity')
    ).join(OrderDetail, Product.products_id == OrderDetail.product_id)\
     .join(Order, OrderDetail.order_id == Order.id)\
     .filter(
        Order.trangthai == 'hoan_thanh',
        Order.created_at >= start_date
    ).group_by(Product.loai)\
     .order_by(desc('revenue')).all()
    
    categories = []
    for r in results:
        categories.append({
            'category': r.loai or 'Khác',
            'revenue': float(r.revenue) if r.revenue else 0,
            'quantity': r.quantity or 0
        })
    
    return jsonify({'categories': categories}), 200
