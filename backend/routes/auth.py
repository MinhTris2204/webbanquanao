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


def send_otp_email(to_email, otp_code, user_name, purpose='register'):
    """Send OTP email for verification"""
    if purpose == 'register':
        subject = '🔐 Xác nhận đăng ký tài khoản - Shop Quần Áo'
        title = 'Xác nhận đăng ký'
        message = 'Bạn đã đăng ký tài khoản tại Shop Quần Áo. Vui lòng nhập mã OTP bên dưới để xác nhận email của bạn:'
    else:
        subject = '🔐 Đặt lại mật khẩu - Shop Quần Áo'
        title = 'Đặt lại mật khẩu'
        message = 'Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhập mã OTP bên dưới để tiếp tục:'
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🛍️ Shop Quần Áo</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">{title}</h2>
            <p style="color: #666; line-height: 1.6;">Xin chào {user_name}!</p>
            <p style="color: #666; line-height: 1.6;">{message}</p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); 
                            color: white; 
                            padding: 20px 40px; 
                            border-radius: 10px;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            display: inline-block;">
                    {otp_code}
                </div>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
                ⏰ Mã OTP này sẽ hết hạn sau 10 phút.<br>
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                © 2024 Shop Quần Áo. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Đăng ký tài khoản - Bước 1: Tạo tài khoản chưa xác thực"""
    data = request.get_json()
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email đã tồn tại'}), 400
    
    username = data.get('taikhoan') or data.get('username')
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Tài khoản đã tồn tại'}), 400
    
    user = User(
        username=username,
        email=data.get('email'),
        full_name=data.get('hoten') or data.get('full_name'),
        phone=data.get('sdt') or data.get('phone'),
        address=data.get('diachi') or data.get('address'),
        role='customer',
        is_verified=False
    )
    user.set_password(data.get('matkhau') or data.get('password'))
    
    # Generate OTP
    otp_code = user.generate_otp()
    
    db.session.add(user)
    db.session.commit()
    
    # Send OTP email
    email_sent = send_otp_email(user.email, otp_code, user.full_name, 'register')
    
    return jsonify({
        'message': 'Vui lòng kiểm tra email để nhận mã OTP xác nhận',
        'email': user.email,
        'need_verification': True,
        'email_sent': email_sent
    }), 201


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Xác nhận email bằng OTP - Bước 2"""
    data = request.get_json()
    email = data.get('email', '').strip()
    otp = data.get('otp', '').strip()
    
    if not email or not otp:
        return jsonify({'error': 'Vui lòng nhập email và mã OTP'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Email không tồn tại'}), 404
    
    if user.is_verified:
        return jsonify({'error': 'Email đã được xác thực'}), 400
    
    # Verify OTP
    is_valid, message = user.verify_otp(otp)
    
    if not is_valid:
        return jsonify({'error': message}), 400
    
    # Mark as verified and clear OTP
    user.is_verified = True
    user.clear_otp()
    db.session.commit()
    
    return jsonify({
        'message': 'Xác thực email thành công! Bạn có thể đăng nhập ngay.',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Gửi lại mã OTP"""
    data = request.get_json()
    email = data.get('email', '').strip()
    purpose = data.get('purpose', 'register')  # 'register' or 'reset'
    
    if not email:
        return jsonify({'error': 'Vui lòng nhập email'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Email không tồn tại'}), 404
    
    if purpose == 'register' and user.is_verified:
        return jsonify({'error': 'Email đã được xác thực'}), 400
    
    # Generate new OTP
    otp_code = user.generate_otp()
    db.session.commit()
    
    # Send OTP email
    email_sent = send_otp_email(user.email, otp_code, user.full_name, purpose)
    
    if email_sent:
        return jsonify({'message': 'Mã OTP mới đã được gửi đến email của bạn'}), 200
    else:
        return jsonify({'error': 'Không thể gửi email. Vui lòng thử lại sau'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('taikhoan') or data.get('username')
    password = data.get('matkhau') or data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Tài khoản hoặc mật khẩu không đúng'}), 401
    
    # Check if email is verified
    if not user.is_verified:
        # Generate new OTP and send
        otp_code = user.generate_otp()
        db.session.commit()
        send_otp_email(user.email, otp_code, user.full_name, 'register')
        
        return jsonify({
            'error': 'Email chưa được xác thực',
            'need_verification': True,
            'email': user.email
        }), 403
    
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
    
    # Support both old and new field names
    if 'hoten' in data or 'full_name' in data:
        user.full_name = data.get('full_name') or data.get('hoten')
    if 'sdt' in data or 'phone' in data:
        user.phone = data.get('phone') or data.get('sdt')
    if 'diachi' in data or 'address' in data:
        user.address = data.get('address') or data.get('diachi')
    
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
    
    if not user.check_password(current_password):
        return jsonify({'error': 'Mật khẩu hiện tại không đúng'}), 401
    
    if len(new_password) < 6:
        return jsonify({'error': 'Mật khẩu mới phải có ít nhất 6 ký tự'}), 400
    
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
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Tài khoản đã được xóa'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Gửi OTP để đặt lại mật khẩu"""
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'error': 'Vui lòng nhập email'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return jsonify({'message': 'Nếu email tồn tại, bạn sẽ nhận được mã OTP'}), 200
    
    # Generate OTP
    otp_code = user.generate_otp()
    db.session.commit()
    
    # Send OTP email
    email_sent = send_otp_email(user.email, otp_code, user.full_name, 'reset')
    
    if email_sent:
        return jsonify({
            'message': 'Mã OTP đã được gửi đến email của bạn',
            'email': email
        }), 200
    else:
        return jsonify({'message': 'Nếu email tồn tại, bạn sẽ nhận được mã OTP'}), 200


@auth_bp.route('/verify-reset-otp', methods=['POST'])
def verify_reset_otp():
    """Xác thực OTP để đặt lại mật khẩu"""
    data = request.get_json()
    email = data.get('email', '').strip()
    otp = data.get('otp', '').strip()
    
    if not email or not otp:
        return jsonify({'error': 'Vui lòng nhập email và mã OTP'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Email không tồn tại'}), 404
    
    # Verify OTP
    is_valid, message = user.verify_otp(otp)
    
    if not is_valid:
        return jsonify({'error': message}), 400
    
    # Generate a temporary token for password reset
    reset_token = secrets.token_urlsafe(32)
    user.otp_code = reset_token  # Reuse otp_code field for reset token
    user.otp_expires = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()
    
    return jsonify({
        'message': 'Xác thực OTP thành công',
        'reset_token': reset_token
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Đặt lại mật khẩu với token"""
    data = request.get_json()
    token = data.get('token', '').strip()
    new_password = data.get('new_password', '')
    
    if not token:
        return jsonify({'error': 'Token không hợp lệ'}), 400
    
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400
    
    user = User.query.filter_by(otp_code=token).first()
    
    if not user:
        return jsonify({'error': 'Token không hợp lệ hoặc đã hết hạn'}), 400
    
    # Check if token expired
    if user.otp_expires and user.otp_expires < datetime.utcnow():
        user.clear_otp()
        db.session.commit()
        return jsonify({'error': 'Token đã hết hạn. Vui lòng yêu cầu mã OTP mới'}), 400
    
    # Reset password
    user.set_password(new_password)
    user.clear_otp()
    db.session.commit()
    
    return jsonify({'message': 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới'}), 200


# Legacy endpoint for backward compatibility
@auth_bp.route('/verify-reset-token', methods=['POST'])
def verify_reset_token():
    """Verify if reset token is valid (legacy)"""
    data = request.get_json()
    token = data.get('token', '').strip()
    
    if not token:
        return jsonify({'valid': False, 'error': 'Token không hợp lệ'}), 400
    
    user = User.query.filter_by(otp_code=token).first()
    
    if not user:
        return jsonify({'valid': False, 'error': 'Token không hợp lệ'}), 400
    
    if user.otp_expires and user.otp_expires < datetime.utcnow():
        return jsonify({'valid': False, 'error': 'Token đã hết hạn'}), 400
    
    return jsonify({'valid': True, 'email': user.email}), 200
