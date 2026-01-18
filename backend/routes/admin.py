from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Product, Order, OrderDetail
from functools import wraps
from werkzeug.utils import secure_filename
import os
import uuid
import base64

admin_bp = Blueprint('admin', __name__)

# Upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_base64_image(base64_string, original_filename=None):
    """Save base64 image to uploads folder and return the filename"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            header, base64_data = base64_string.split(',', 1)
            # Get extension from header
            if 'png' in header:
                ext = 'png'
            elif 'gif' in header:
                ext = 'gif'
            elif 'webp' in header:
                ext = 'webp'
            else:
                ext = 'jpg'
        else:
            base64_data = base64_string
            ext = 'jpg'
        
        # Decode base64
        image_data = base64.b64decode(base64_data)
        
        # Use original filename if provided, otherwise generate unique name
        if original_filename:
            # Secure the filename and keep original name
            filename = secure_filename(original_filename)
            # If file exists, add timestamp to make unique
            upload_path = os.path.join(os.getcwd(), UPLOAD_FOLDER)
            os.makedirs(upload_path, exist_ok=True)
            filepath = os.path.join(upload_path, filename)
            if os.path.exists(filepath):
                name, ext_orig = os.path.splitext(filename)
                import time
                filename = f"{name}_{int(time.time())}{ext_orig}"
                filepath = os.path.join(upload_path, filename)
        else:
            filename = f"{uuid.uuid4().hex}.{ext}"
            upload_path = os.path.join(os.getcwd(), UPLOAD_FOLDER)
            os.makedirs(upload_path, exist_ok=True)
            filepath = os.path.join(upload_path, filename)
        
        # Save file
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        return filename
    except Exception as e:
        print(f"Error saving base64 image: {e}")
        return None


def delete_image_file(filename):
    """Delete image file from uploads folder"""
    if not filename or filename.startswith('http') or filename.startswith('data:'):
        return
    try:
        filepath = os.path.join(os.getcwd(), UPLOAD_FOLDER, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Error deleting image: {e}")


def generate_product_embedding(product):
    """Generate and save embedding for a product"""
    try:
        from routes.chatbot import get_embedding
        text = f"{product.ten_san_pham} {product.loai} {product.mo_ta or ''} {product.chat_lieu or ''} {product.gioi_tinh}"
        embedding = get_embedding(text)
        product.embedding = embedding
        return True
    except Exception as e:
        print(f"Error generating embedding for product {product.products_id}: {e}")
        return False

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

@admin_bp.route('/products', methods=['POST'])
@admin_required
def create_product():
    data = request.get_json()
    
    # Handle image - convert base64 to file
    hinh_anh = data.get('hinh_anh')
    original_filename = data.get('hinh_anh_filename')
    if hinh_anh:
        if hinh_anh.startswith('data:'):
            # Save base64 image to file with original filename
            filename = save_base64_image(hinh_anh, original_filename)
            if filename:
                hinh_anh = filename
        elif hinh_anh.startswith('/uploads/'):
            # Extract just the filename
            hinh_anh = hinh_anh.replace('/uploads/', '')
    
    product = Product(
        ten_san_pham=data.get('ten_san_pham'),
        gia_ban=data.get('gia_ban'),
        loai=data.get('loai'),
        mo_ta=data.get('mo_ta'),
        size=data.get('size'),
        chat_lieu=data.get('chat_lieu'),
        gioi_tinh=data.get('gioi_tinh', 'Unisex'),
        hinh_anh=hinh_anh,
        trang_thai=data.get('trang_thai', 'Con_hang')
    )
    
    db.session.add(product)
    db.session.flush()  # Get product ID before commit
    
    # Generate embedding for chatbot search
    generate_product_embedding(product)
    
    db.session.commit()
    
    return jsonify({'message': 'Tạo sản phẩm thành công', 'product': product.to_dict()}), 201

@admin_bp.route('/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    # Track if text fields changed (need to regenerate embedding)
    text_fields = ['ten_san_pham', 'loai', 'mo_ta', 'chat_lieu', 'gioi_tinh']
    need_embedding_update = any(key in data for key in text_fields)
    
    # Handle image update
    if 'hinh_anh' in data:
        new_image = data['hinh_anh']
        old_image = product.hinh_anh
        
        if new_image and new_image.startswith('data:'):
            # Save new base64 image to file with original filename
            original_filename = data.get('hinh_anh_filename')
            filename = save_base64_image(new_image, original_filename)
            if filename:
                # Delete old image file if it exists
                delete_image_file(old_image)
                data['hinh_anh'] = filename
        elif new_image and new_image.startswith('/uploads/'):
            # Frontend sent back the URL format, extract just the filename
            data['hinh_anh'] = new_image.replace('/uploads/', '')
        elif not new_image:
            # Image was cleared
            delete_image_file(old_image)
            data['hinh_anh'] = None
    
    for key, value in data.items():
        if hasattr(product, key) and key != 'embedding':
            setattr(product, key, value)
    
    # Regenerate embedding if text fields changed
    if need_embedding_update:
        generate_product_embedding(product)
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật sản phẩm thành công', 'product': product.to_dict()}), 200

@admin_bp.route('/products/<int:product_id>/check-delete', methods=['GET'])
@admin_required
def check_delete_product(product_id):
    """Kiểm tra thông tin liên quan trước khi xóa sản phẩm"""
    product = Product.query.get_or_404(product_id)
    
    # Đếm số đơn hàng có chứa sản phẩm này
    order_count = db.session.query(OrderDetail.order_id).filter_by(product_id=product_id).distinct().count()
    
    # Đếm số lượng sản phẩm đã bán (từ đơn hàng hoàn thành)
    sold_quantity = db.session.query(db.func.sum(OrderDetail.quantity)).join(Order).filter(
        OrderDetail.product_id == product_id,
        Order.trangthai == 'hoan_thanh'
    ).scalar() or 0
    
    # Đếm số đánh giá
    try:
        from models import Review, CartItem, Promotion
        review_count = Review.query.filter_by(product_id=product_id).count()
        cart_count = CartItem.query.filter_by(products_id=product_id).count()
        promotion_count = Promotion.query.filter_by(product_id=product_id).count()
    except:
        review_count = 0
        cart_count = 0
        promotion_count = 0
    
    return jsonify({
        'product': product.to_dict(),
        'order_count': order_count,
        'sold_quantity': int(sold_quantity),
        'review_count': review_count,
        'cart_count': cart_count,
        'promotion_count': promotion_count,
        'has_related_data': order_count > 0 or review_count > 0 or cart_count > 0
    }), 200

@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    # Xóa tất cả dữ liệu liên quan
    try:
        from models import Review, CartItem, Promotion, ProductView
        
        # Xóa reviews của sản phẩm
        Review.query.filter_by(product_id=product_id).delete()
        
        # Xóa sản phẩm khỏi giỏ hàng
        CartItem.query.filter_by(products_id=product_id).delete()
        
        # Xóa promotions của sản phẩm
        Promotion.query.filter_by(product_id=product_id).delete()
        
        # Xóa lượt xem sản phẩm
        ProductView.query.filter_by(product_id=product_id).delete()
        
        # Xóa chi tiết đơn hàng liên quan (hoặc set null nếu muốn giữ lại đơn hàng)
        OrderDetail.query.filter_by(product_id=product_id).delete()
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi khi xóa dữ liệu liên quan: {str(e)}'}), 500
    
    # Delete image file if exists
    delete_image_file(product.hinh_anh)
    
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({'message': 'Xóa sản phẩm thành công'}), 200


@admin_bp.route('/products/update-all-embeddings', methods=['POST'])
@admin_required
def update_all_product_embeddings():
    """Update embeddings for all products (run once to initialize)"""
    try:
        products = Product.query.all()
        updated = 0
        failed = 0
        
        for product in products:
            if generate_product_embedding(product):
                updated += 1
            else:
                failed += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Đã cập nhật embedding cho {updated} sản phẩm',
            'updated': updated,
            'failed': failed
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/orders', methods=['GET'])
@admin_required
def get_all_orders():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status_filter = request.args.get('status', '')
    search = request.args.get('search', '')
    
    query = Order.query
    
    # Status filter
    if status_filter:
        query = query.filter(Order.trangthai == status_filter)
    
    # Search filter (search by customer name, phone, or order ID)
    if search:
        query = query.filter(
            db.or_(
                Order.hoten.ilike(f'%{search}%'),
                Order.sdt.ilike(f'%{search}%'),
                db.cast(Order.id, db.String).ilike(f'%{search}%')
            )
        )
    
    pagination = query.order_by(Order.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'orders': [order.to_dict() for order in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    
    new_status = data.get('trangthai')
    current_status = order.trangthai
    
    # Validation: Đơn hàng đã hủy không thể chuyển sang trạng thái khác
    if current_status == 'huy' and new_status != 'huy':
        return jsonify({
            'error': 'Không thể thay đổi trạng thái của đơn hàng đã hủy'
        }), 400
    
    # Validation: Đơn hàng đã hoàn thành không thể chuyển sang trạng thái khác
    if current_status == 'hoan_thanh' and new_status != 'hoan_thanh':
        return jsonify({
            'error': 'Không thể thay đổi trạng thái của đơn hàng đã hoàn thành'
        }), 400
    
    order.trangthai = new_status
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật trạng thái đơn hàng thành công', 'order': order.to_dict()}), 200

@admin_bp.route('/orders/<int:order_id>', methods=['PUT'])
@admin_required
def update_order(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    
    # Update allowed fields
    if 'hoten' in data:
        order.hoten = data['hoten']
    if 'sdt' in data:
        order.sdt = data['sdt']
    if 'diachi_giaohang' in data:
        order.diachi_giaohang = data['diachi_giaohang']
    if 'payment_method' in data:
        order.payment_method = data['payment_method']
    if 'trangthai' in data:
        new_status = data['trangthai']
        current_status = order.trangthai
        
        # Validation: Đơn hàng đã hủy không thể chuyển sang trạng thái khác
        if current_status == 'huy' and new_status != 'huy':
            return jsonify({
                'error': 'Không thể thay đổi trạng thái của đơn hàng đã hủy'
            }), 400
        
        # Validation: Đơn hàng đã hoàn thành không thể chuyển sang trạng thái khác
        if current_status == 'hoan_thanh' and new_status != 'hoan_thanh':
            return jsonify({
                'error': 'Không thể thay đổi trạng thái của đơn hàng đã hoàn thành'
            }), 400
        
        order.trangthai = new_status
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật đơn hàng thành công', 'order': order.to_dict()}), 200

@admin_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@admin_required
def delete_order(order_id):
    order = Order.query.get_or_404(order_id)
    db.session.delete(order)
    db.session.commit()
    
    return jsonify({'message': 'Xóa đơn hàng thành công'}), 200

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    role_filter = request.args.get('role', '')
    
    query = User.query
    
    # Search filter - use new column names
    if search:
        query = query.filter(
            db.or_(
                User.username.ilike(f'%{search}%'),
                User.full_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    # Role filter
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'users': [user.to_dict() for user in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    # Update allowed fields - support both old and new field names
    if 'hoten' in data or 'full_name' in data:
        user.full_name = data.get('full_name') or data.get('hoten')
    if 'email' in data:
        user.email = data['email']
    if 'sdt' in data or 'phone' in data:
        user.phone = data.get('phone') or data.get('sdt')
    if 'diachi' in data or 'address' in data:
        user.address = data.get('address') or data.get('diachi')
    if 'role' in data:
        user.role = data['role']
    if 'is_verified' in data:
        user.is_verified = data['is_verified']
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật người dùng thành công', 'user': user.to_dict()}), 200

@admin_bp.route('/users/<int:user_id>/check-delete', methods=['GET'])
@admin_required
def check_delete_user(user_id):
    """Kiểm tra thông tin liên quan trước khi xóa user"""
    user = User.query.get_or_404(user_id)
    
    order_count = Order.query.filter_by(user_id=user_id).count()
    
    # Import các model cần thiết
    try:
        from models import Review, ProductView, ChatConversation
        review_count = Review.query.filter_by(user_id=user_id).count()
        chat_count = ChatConversation.query.filter_by(customer_id=user_id).count()
    except:
        review_count = 0
        chat_count = 0
    
    return jsonify({
        'user': user.to_dict(),
        'order_count': order_count,
        'review_count': review_count,
        'chat_count': chat_count,
        'has_related_data': order_count > 0 or review_count > 0 or chat_count > 0
    }), 200

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    current_user_id = int(get_jwt_identity())
    
    # Prevent deleting yourself
    if user_id == current_user_id:
        return jsonify({'error': 'Không thể xóa tài khoản của chính mình'}), 400
    
    user = User.query.get_or_404(user_id)
    
    # Xóa tất cả dữ liệu liên quan
    try:
        from models import Review, ProductView, ChatConversation
        
        # Xóa reviews của user
        Review.query.filter_by(user_id=user_id).delete()
        
        # Xóa product views của user
        ProductView.query.filter_by(user_id=user_id).delete()
        
        # Xóa chat conversations của user
        ChatConversation.query.filter_by(customer_id=user_id).delete()
        
        # Xóa các đơn hàng của user (và order_details sẽ tự động xóa do cascade)
        Order.query.filter_by(user_id=user_id).delete()
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi khi xóa dữ liệu liên quan: {str(e)}'}), 500
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Xóa người dùng thành công'}), 200

@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    
    username = data.get('taikhoan') or data.get('username')
    # Check if username or email already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Tài khoản đã tồn tại'}), 400
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email đã tồn tại'}), 400
    
    user = User(
        username=username,
        full_name=data.get('hoten') or data.get('full_name'),
        email=data.get('email'),
        phone=data.get('sdt') or data.get('phone'),
        address=data.get('diachi') or data.get('address'),
        role=data.get('role', 'customer'),
        is_verified=True  # Admin-created users are verified by default
    )
    user.set_password(data.get('matkhau') or data.get('password'))
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Tạo người dùng thành công', 'user': user.to_dict()}), 201

@admin_bp.route('/users/<int:user_id>/password', methods=['PUT'])
@admin_required
def change_user_password(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    new_password = data.get('matkhau')
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400
    
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Đổi mật khẩu thành công'}), 200
