from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email đã tồn tại'}), 400
    
    if User.query.filter_by(taikhoan=data.get('taikhoan')).first():
        return jsonify({'error': 'Tài khoản đã tồn tại'}), 400
    
    user = User(
        taikhoan=data.get('taikhoan'),
        email=data.get('email'),
        hoten=data.get('hoten'),
        sdt=data.get('sdt'),
        diachi=data.get('diachi'),
        role='customer'
    )
    user.set_password(data.get('matkhau'))
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Đăng ký thành công', 'user': user.to_dict()}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    taikhoan = data.get('taikhoan')
    password = data.get('matkhau')
    
    user = User.query.filter_by(taikhoan=taikhoan).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Tài khoản hoặc mật khẩu không đúng'}), 401
    
    access_token = create_access_token(identity=str(user.user_id))
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # JWT logout is handled on client side by removing token
    return jsonify({'message': 'Đăng xuất thành công'}), 200

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Check if email is being changed and if it's already taken
    if 'email' in data and data['email'] != user.email:
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email đã được sử dụng'}), 400
        user.email = data['email']
    
    if 'hoten' in data:
        user.hoten = data['hoten']
    if 'sdt' in data:
        user.sdt = data['sdt']
    if 'diachi' in data:
        user.diachi = data['diachi']
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật thành công', 'user': user.to_dict()}), 200

@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Vui lòng điền đầy đủ thông tin'}), 400
    
    # Verify current password
    if not user.check_password(current_password):
        return jsonify({'error': 'Mật khẩu hiện tại không đúng'}), 401
    
    # Check new password length
    if len(new_password) < 6:
        return jsonify({'error': 'Mật khẩu mới phải có ít nhất 6 ký tự'}), 400
    
    # Set new password
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Đổi mật khẩu thành công'}), 200

@auth_bp.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Delete user (cascade will handle related records)
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Tài khoản đã được xóa'}), 200
