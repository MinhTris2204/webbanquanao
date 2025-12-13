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
    
    access_token = create_access_token(identity=user.user_id)
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
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
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'hoten' in data:
        user.hoten = data['hoten']
    if 'sdt' in data:
        user.sdt = data['sdt']
    if 'diachi' in data:
        user.diachi = data['diachi']
    
    db.session.commit()
    
    return jsonify({'message': 'Cập nhật thành công', 'user': user.to_dict()}), 200
