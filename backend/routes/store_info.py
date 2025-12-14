from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, StoreInfo, User
from functools import wraps

store_info_bp = Blueprint('store_info', __name__)

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

# Public routes
@store_info_bp.route('/', methods=['GET'])
def get_all_store_info():
    """Get all active store info"""
    store_infos = StoreInfo.query.filter_by(is_active=True).all()
    return jsonify([info.to_dict() for info in store_infos]), 200

@store_info_bp.route('/<string:key>', methods=['GET'])
def get_store_info_by_key(key):
    """Get specific store info by key"""
    info = StoreInfo.query.filter_by(key=key, is_active=True).first()
    if not info:
        return jsonify({'error': 'Không tìm thấy thông tin'}), 404
    return jsonify(info.to_dict()), 200

# Admin routes
@store_info_bp.route('/admin/all', methods=['GET'])
@admin_required
def admin_get_all():
    """Admin: Get all store info (including inactive)"""
    store_infos = StoreInfo.query.all()
    return jsonify([info.to_dict() for info in store_infos]), 200

@store_info_bp.route('/admin', methods=['POST'])
@admin_required
def create_store_info():
    """Admin: Create new store info"""
    data = request.get_json()
    
    # Check if key already exists
    if StoreInfo.query.filter_by(key=data.get('key')).first():
        return jsonify({'error': 'Key đã tồn tại'}), 400
    
    info = StoreInfo(
        key=data.get('key'),
        title=data.get('title'),
        content=data.get('content'),
        is_active=data.get('is_active', True)
    )
    
    db.session.add(info)
    db.session.commit()
    
    return jsonify({'message': 'Tạo thông tin thành công', 'info': info.to_dict()}), 201

@store_info_bp.route('/admin/<int:info_id>', methods=['PUT'])
@admin_required
def update_store_info(info_id):
    """Admin: Update store info"""
    info = StoreInfo.query.get_or_404(info_id)
    data = request.get_json()
    
    if 'title' in data:
        info.title = data['title']
    if 'content' in data:
        info.content = data['content']
    if 'is_active' in data:
        info.is_active = data['is_active']
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật thông tin thành công', 'info': info.to_dict()}), 200

@store_info_bp.route('/admin/<int:info_id>', methods=['DELETE'])
@admin_required
def delete_store_info(info_id):
    """Admin: Delete store info"""
    info = StoreInfo.query.get_or_404(info_id)
    db.session.delete(info)
    db.session.commit()
    
    return jsonify({'message': 'Xóa thông tin thành công'}), 200
