from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from datetime import datetime, timedelta
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

auth_bp = Blueprint('auth', __name__)


def get_smtp_config():
    """Get SMTP configuration"""
    return {
        'server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
        'port': int(os.getenv('SMTP_PORT', 587)),
        'user': os.getenv('SMTP_USER', ''),
        'password': os.getenv('SMTP_PASSWORD', ''),
        'frontend_url': os.getenv('FRONTEND_URL', 'http://localhost:5173')
    }


def send_email(to_email, subject, html_content):
    """Send email using SMTP"""
    cfg = get_smtp_config()
    
    if not cfg['user'] or not cfg['password']:
        print("[EMAIL] SMTP not configured, skipping email send")
        return False
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = cfg['user']
    msg['To'] = to_email
    msg.attach(MIMEText(html_content, 'html'))
    
    try:
        server = smtplib.SMTP(cfg['server'], cfg['port'])
        server.starttls()
        server.login(cfg['user'], cfg['password'])
        server.sendmail(cfg['user'], to_email, msg.as_string())
        server.quit()
        print(f"[EMAIL] Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Error sending email: {e}")
        return False


def send_verification_email(to_email, verify_token, user_name):
    """Send email verification"""
    cfg = get_smtp_config()
    verify_link = f"{cfg['frontend_url']}/verify-email?token={verify_token}"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🛍️ Fashion Store</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Chào mừng {user_name}!</h2>
            <p style="color: #666; line-height: 1.6;">
                Cảm ơn bạn đã đăng ký tài khoản tại Fashion Store.
                Vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_link}" 
                   style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); 
                          color: white; 
                          padding: 15px 40px; 
                          text-decoration: none; 
                          border-radius: 25px;
                          font-weight: bold;
                          display: inline-block;">
                    Xác thực email
                </a>
            </div>
            <p style="color: #999; font-size: 14px;">
                Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                © 2024 Fashion Store. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, '✉️ Xác thực email - Fashion Store', html)


def send_reset_email(to_email, reset_token, user_name):
    """Send password reset email"""
    cfg = get_smtp_config()
    reset_link = f"{cfg['frontend_url']}/reset-password?token={reset_token}"
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = '🔐 Đặt lại mật khẩu - Fashion Store'
    msg['From'] = cfg['user']
    msg['To'] = to_email
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🛍️ Fashion Store</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Xin chào {user_name}!</h2>
            <p style="color: #666; line-height: 1.6;">
                Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.
                Nhấn vào nút bên dưới để tạo mật khẩu mới:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); 
                          color: white; 
                          padding: 15px 40px; 
                          text-decoration: none; 
                          border-radius: 25px;
                          font-weight: bold;
                          display: inline-block;">
                    Đặt lại mật khẩu
                </a>
            </div>
            <p style="color: #999; font-size: 14px;">
                ⏰ Link này sẽ hết hạn sau 1 giờ.<br>
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                © 2024 Fashion Store. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(html, 'html'))
    
    try:
        server = smtplib.SMTP(cfg['server'], cfg['port'])
        server.starttls()
        server.login(cfg['user'], cfg['password'])
        server.sendmail(cfg['user'], to_email, msg.as_string())
        server.quit()
        print(f"[EMAIL] Reset email sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Error sending email: {e}")
        return False


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
    
    return jsonify({
        'message': 'Đăng ký thành công!',
        'user': user.to_dict(),
        'need_verification': False
    }), 201


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email with token"""
    data = request.get_json()
    token = data.get('token', '').strip()
    
    if not token:
        return jsonify({'error': 'Token không hợp lệ'}), 400
    
    user = User.query.filter_by(verify_token=token).first()
    
    if not user:
        return jsonify({'error': 'Token không hợp lệ hoặc đã được sử dụng'}), 400
    
    user.email_verified = True
    user.verify_token = None
    db.session.commit()
    
    return jsonify({'message': 'Xác thực email thành công! Bạn có thể đăng nhập ngay.'}), 200


@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email"""
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'error': 'Vui lòng nhập email'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'message': 'Nếu email tồn tại, bạn sẽ nhận được email xác thực'}), 200
    
    if user.email_verified:
        return jsonify({'message': 'Email đã được xác thực'}), 200
    
    # Generate new token
    verify_token = secrets.token_urlsafe(32)
    user.verify_token = verify_token
    db.session.commit()
    
    send_verification_email(user.email, verify_token, user.hoten)
    
    return jsonify({'message': 'Email xác thực đã được gửi lại'}), 200


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    taikhoan = data.get('taikhoan')
    password = data.get('matkhau')
    
    user = User.query.filter_by(taikhoan=taikhoan).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Tài khoản hoặc mật khẩu không đúng'}), 401
    
    # Check if email is verified
    # Bỏ check email_verified - không cần xác minh email nữa
    
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


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'error': 'Vui lòng nhập email'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return jsonify({'message': 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu'}), 200
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()
    
    # Send email
    email_sent = send_reset_email(user.email, reset_token, user.hoten)
    
    if email_sent:
        return jsonify({'message': 'Link đặt lại mật khẩu đã được gửi đến email của bạn'}), 200
    else:
        return jsonify({'message': 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu', 'debug': 'SMTP not configured'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    data = request.get_json()
    token = data.get('token', '').strip()
    new_password = data.get('new_password', '')
    
    if not token:
        return jsonify({'error': 'Token không hợp lệ'}), 400
    
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400
    
    user = User.query.filter_by(reset_token=token).first()
    
    if not user:
        return jsonify({'error': 'Token không hợp lệ hoặc đã hết hạn'}), 400
    
    # Check if token expired
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        return jsonify({'error': 'Token đã hết hạn. Vui lòng yêu cầu link mới'}), 400
    
    # Reset password
    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()
    
    return jsonify({'message': 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới'}), 200


@auth_bp.route('/verify-reset-token', methods=['POST'])
def verify_reset_token():
    """Verify if reset token is valid"""
    data = request.get_json()
    token = data.get('token', '').strip()
    
    if not token:
        return jsonify({'valid': False, 'error': 'Token không hợp lệ'}), 400
    
    user = User.query.filter_by(reset_token=token).first()
    
    if not user:
        return jsonify({'valid': False, 'error': 'Token không hợp lệ'}), 400
    
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        return jsonify({'valid': False, 'error': 'Token đã hết hạn'}), 400
    
    return jsonify({'valid': True, 'email': user.email}), 200
