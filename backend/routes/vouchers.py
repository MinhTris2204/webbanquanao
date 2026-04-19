from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Voucher
from datetime import datetime
from functools import wraps

vouchers_bp = Blueprint('vouchers', __name__)

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Cần quyền admin'}), 403
        return fn(*args, **kwargs)
    return wrapper

# ==================== QUẢN LÝ MÃ GIẢM GIÁ (ADMIN) ====================
@vouchers_bp.route('/admin', methods=['GET'])
@admin_required
def get_all_vouchers():
    """Lấy danh sách tất cả mã giảm giá"""
    vouchers = Voucher.query.order_by(Voucher.created_at.desc()).all()
    return jsonify([v.to_dict() for v in vouchers]), 200

@vouchers_bp.route('/admin', methods=['POST'])
@admin_required
def create_voucher():
    """Tạo mã giảm giá mới"""
    data = request.get_json()
    
    # Kiểm tra mã voucher đã tồn tại chưa
    code = data.get('code', '').upper()
    existing_voucher = Voucher.query.filter_by(code=code).first()
    if existing_voucher:
        return jsonify({'error': f'Mã voucher "{code}" đã tồn tại'}), 400
    
    # Xử lý các trường số có thể rỗng
    max_discount = data.get('max_discount')
    if max_discount == '' or max_discount is None:
        max_discount = None
    else:
        max_discount = float(max_discount)
    
    usage_limit = data.get('usage_limit')
    if usage_limit == '' or usage_limit is None:
        usage_limit = None
    else:
        usage_limit = int(usage_limit)
    
    # Phân tích ngày tháng - xử lý định dạng ISO với múi giờ
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    
    if 'Z' in start_date_str:
        start_date_str = start_date_str.replace('Z', '+00:00')
    if 'Z' in end_date_str:
        end_date_str = end_date_str.replace('Z', '+00:00')
    
    start_date = datetime.fromisoformat(start_date_str)
    end_date = datetime.fromisoformat(end_date_str)
    
    # Loại bỏ thông tin múi giờ để so sánh
    if start_date.tzinfo is not None:
        start_date = start_date.replace(tzinfo=None)
    if end_date.tzinfo is not None:
        end_date = end_date.replace(tzinfo=None)
    
    # Xác thực ngày tháng - chỉ so sánh ngày, không so sánh giờ
    today = datetime.utcnow().date()
    
    if start_date.date() < today:
        return jsonify({'error': 'Ngày bắt đầu không được trong quá khứ'}), 400
    if end_date.date() < today:
        return jsonify({'error': 'Ngày kết thúc không được trong quá khứ'}), 400
    if end_date <= start_date:
        return jsonify({'error': 'Ngày kết thúc phải sau ngày bắt đầu'}), 400
    
    voucher = Voucher(
        code=code,
        discount_type=data.get('discount_type'),
        discount_value=float(data.get('discount_value')),
        min_order_value=float(data.get('min_order_value', 0)),
        max_discount=max_discount,
        usage_limit=usage_limit,
        start_date=start_date,
        end_date=end_date,
        is_active=data.get('is_active', True)
    )
    
    db.session.add(voucher)
    db.session.commit()
    
    return jsonify({'message': 'Tạo voucher thành công', 'voucher': voucher.to_dict()}), 201

@vouchers_bp.route('/admin/<int:voucher_id>', methods=['PUT'])
@admin_required
def update_voucher(voucher_id):
    """Cập nhật mã giảm giá"""
    voucher = Voucher.query.get_or_404(voucher_id)
    data = request.get_json()
    
    today = datetime.utcnow().date()
    
    if 'code' in data:
        new_code = data['code'].upper()
        # Kiểm tra mã mới đã tồn tại chưa (không tính voucher hiện tại)
        existing = Voucher.query.filter(Voucher.code == new_code, Voucher.id != voucher_id).first()
        if existing:
            return jsonify({'error': f'Mã voucher "{new_code}" đã tồn tại'}), 400
        voucher.code = new_code
    if 'discount_type' in data:
        voucher.discount_type = data['discount_type']
    if 'discount_value' in data:
        voucher.discount_value = float(data['discount_value'])
    if 'min_order_value' in data:
        voucher.min_order_value = float(data['min_order_value'])
    if 'max_discount' in data:
        max_discount = data['max_discount']
        voucher.max_discount = None if max_discount == '' or max_discount is None else float(max_discount)
    if 'usage_limit' in data:
        usage_limit = data['usage_limit']
        voucher.usage_limit = None if usage_limit == '' or usage_limit is None else int(usage_limit)
    if 'start_date' in data:
        start_date_str = data['start_date']
        if 'Z' in start_date_str:
            start_date_str = start_date_str.replace('Z', '+00:00')
        new_start_date = datetime.fromisoformat(start_date_str)
        if new_start_date.tzinfo is not None:
            new_start_date = new_start_date.replace(tzinfo=None)
        if new_start_date.date() < today:
            return jsonify({'error': 'Ngày bắt đầu không được trong quá khứ'}), 400
        voucher.start_date = new_start_date
    if 'end_date' in data:
        end_date_str = data['end_date']
        if 'Z' in end_date_str:
            end_date_str = end_date_str.replace('Z', '+00:00')
        new_end_date = datetime.fromisoformat(end_date_str)
        if new_end_date.tzinfo is not None:
            new_end_date = new_end_date.replace(tzinfo=None)
        if new_end_date.date() < today:
            return jsonify({'error': 'Ngày kết thúc không được trong quá khứ'}), 400
        voucher.end_date = new_end_date
    if 'is_active' in data:
        voucher.is_active = data['is_active']
    
    # Xác thực end_date > start_date
    if voucher.end_date <= voucher.start_date:
        return jsonify({'error': 'Ngày kết thúc phải sau ngày bắt đầu'}), 400
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật voucher thành công', 'voucher': voucher.to_dict()}), 200

@vouchers_bp.route('/admin/<int:voucher_id>', methods=['DELETE'])
@admin_required
def delete_voucher(voucher_id):
    """Xóa mã giảm giá"""
    voucher = Voucher.query.get_or_404(voucher_id)
    db.session.delete(voucher)
    db.session.commit()
    
    return jsonify({'message': 'Xóa voucher thành công'}), 200

# ==================== KIỂM TRA MÃ GIẢM GIÁ (KHÁCH HÀNG) ====================
@vouchers_bp.route('/validate', methods=['POST'])
@jwt_required()
def validate_voucher():
    """Xác thực và áp dụng mã giảm giá"""
    data = request.get_json()
    code = data.get('code', '').upper()
    order_total = float(data.get('order_total', 0))
    
    voucher = Voucher.query.filter_by(code=code).first()
    
    if not voucher:
        return jsonify({'valid': False, 'message': 'Mã voucher không tồn tại'}), 404
    
    is_valid, message = voucher.is_valid(order_total)
    
    if not is_valid:
        return jsonify({'valid': False, 'message': message}), 400
    
    discount = voucher.calculate_discount(order_total)
    
    return jsonify({
        'valid': True,
        'message': 'Áp dụng voucher thành công',
        'voucher': voucher.to_dict(),
        'discount': discount,
        'final_total': order_total - discount
    }), 200
