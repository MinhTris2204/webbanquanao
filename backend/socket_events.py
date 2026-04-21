from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from models import db, User, ChatConversation, ChatMessage
from datetime import datetime

socketio = SocketIO(cors_allowed_origins="*")

# Lưu danh sách người dùng đang kết nối: {user_id: sid}
connected_users = {}
# Lưu danh sách phiên khách vãng lai: {session_id: sid}
guest_sessions = {}
# Lưu danh sách socket id của admin
admin_sids = set()


def get_user_from_token(token):
    """Giải mã JWT token và lấy thông tin người dùng"""
    try:
        if not token:
            return None
        decoded = decode_token(token)
        user_id = decoded.get('sub')
        return User.query.get(user_id)
    except Exception as e:
        print(f"Lỗi giải mã token: {e}")
        return None


@socketio.on('connect')
def handle_connect():
    from flask import request
    print(f"Client kết nối: {request.sid if hasattr(request, 'sid') else 'unknown'}")


@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    sid = request.sid

    # Xóa khỏi danh sách người dùng đã kết nối
    user_id_to_remove = None
    for user_id, user_sid in connected_users.items():
        if user_sid == sid:
            user_id_to_remove = user_id
            break
    if user_id_to_remove:
        del connected_users[user_id_to_remove]

    # Xóa khỏi danh sách phiên khách vãng lai
    session_to_remove = None
    for session_id, session_sid in guest_sessions.items():
        if session_sid == sid:
            session_to_remove = session_id
            break
    if session_to_remove:
        del guest_sessions[session_to_remove]

    # Xóa khỏi danh sách socket id của admin
    admin_sids.discard(sid)
    print(f"Client ngắt kết nối: {sid}")


@socketio.on('authenticate')
def handle_authenticate(data):
    from flask import request
    token = data.get('token')
    session_id = data.get('session_id')  # Dành cho khách vãng lai

    sid = request.sid

    # Xác thực khách vãng lai (không có token)
    if session_id and not token:
        guest_sessions[session_id] = sid
        join_room(f'guest_{session_id}')
        emit('authenticated', {'session_id': session_id, 'role': 'guest'})
        print(f"Khách vãng lai {session_id} đã xác thực")
        return

    if not token:
        emit('auth_error', {'error': 'Không có token'})
        return

    user = get_user_from_token(token)
    if not user:
        emit('auth_error', {'error': 'Token không hợp lệ'})
        return

    connected_users[user.user_id] = sid

    if user.role == 'admin':
        admin_sids.add(sid)
        join_room('admin_room')
        emit('authenticated', {'user_id': user.user_id, 'role': 'admin'})
    else:
        join_room(f'user_{user.user_id}')
        emit('authenticated', {'user_id': user.user_id, 'role': 'customer'})

    print(f"Người dùng {user.user_id} ({user.role}) đã xác thực")


@socketio.on('join_conversation')
def handle_join_conversation(data):
    from flask import request
    conversation_id = data.get('conversation_id')
    token = data.get('token')
    session_id = data.get('session_id')

    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        emit('error', {'error': 'Không tìm thấy cuộc hội thoại'})
        return

    # Kiểm tra quyền truy cập
    user = get_user_from_token(token)
    if user:
        if user.role != 'admin' and conversation.customer_id != user.user_id:
            emit('error', {'error': 'Không có quyền truy cập'})
            return
    elif session_id:
        if conversation.guest_session_id != session_id:
            emit('error', {'error': 'Không có quyền truy cập'})
            return
    else:
        emit('error', {'error': 'Không có quyền truy cập'})
        return

    room = f'conversation_{conversation_id}'
    join_room(room)
    emit('joined_conversation', {'conversation_id': conversation_id})
    print(f"Đã tham gia cuộc hội thoại {conversation_id}")


@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    conversation_id = data.get('conversation_id')
    room = f'conversation_{conversation_id}'
    leave_room(room)


@socketio.on('send_message')
def handle_send_message(data):
    from flask import request
    token = data.get('token')
    session_id = data.get('session_id')
    conversation_id = data.get('conversation_id')
    content = data.get('content', '')
    message_type = data.get('message_type', 'text')
    image_url = data.get('image_url')

    # Kiểm tra nội dung tin nhắn
    if message_type == 'text' and (not content or not content.strip()):
        emit('error', {'error': 'Nội dung tin nhắn không được để trống'})
        return
    if message_type == 'image' and not image_url:
        emit('error', {'error': 'Thiếu ảnh để gửi'})
        return

    # Xác định người gửi
    user = get_user_from_token(token)
    sender_id = None
    sender_type = 'customer'
    conversation = None
    is_new_conversation = False

    if user:
        sender_id = user.user_id
        if user.role == 'admin':
            sender_type = 'admin'
            # Admin phải có conversation_id
            if not conversation_id:
                emit('error', {'error': 'Admin cần cung cấp conversation_id'})
                return
            conversation = ChatConversation.query.get(conversation_id)
        else:
            # Khách hàng đã đăng nhập - tìm hoặc tạo cuộc hội thoại
            if conversation_id:
                conversation = ChatConversation.query.get(conversation_id)
                if conversation and conversation.customer_id != user.user_id:
                    emit('error', {'error': 'Không có quyền truy cập'})
                    return

            if not conversation:
                # Tạo cuộc hội thoại mới khi gửi tin nhắn đầu tiên
                conversation = ChatConversation.query.filter_by(
                    customer_id=user.user_id,
                    status='active'
                ).first()

                if not conversation:
                    conversation = ChatConversation(customer_id=user.user_id)
                    db.session.add(conversation)
                    db.session.flush()
                    is_new_conversation = True
    elif session_id:
        # Khách vãng lai
        sender_type = 'customer'
        sender_id = None

        if conversation_id:
            conversation = ChatConversation.query.get(conversation_id)
            if conversation and conversation.guest_session_id != session_id:
                emit('error', {'error': 'Không có quyền truy cập'})
                return

        if not conversation:
            # Tạo cuộc hội thoại mới cho khách vãng lai khi gửi tin nhắn đầu tiên
            conversation = ChatConversation.query.filter_by(
                guest_session_id=session_id,
                status='active'
            ).first()

            if not conversation:
                conversation = ChatConversation(guest_session_id=session_id)
                db.session.add(conversation)
                db.session.flush()
                is_new_conversation = True
    else:
        emit('error', {'error': 'Không có quyền truy cập'})
        return

    if not conversation:
        emit('error', {'error': 'Không tìm thấy cuộc hội thoại'})
        return

    # Tạo tin nhắn mới
    message = ChatMessage(
        conversation_id=conversation.id,
        sender_id=sender_id,
        sender_type=sender_type,
        content=content.strip() if content else '',
        message_type=message_type,
        image_url=image_url
    )
    db.session.add(message)

    # Cập nhật thời gian cuộc hội thoại
    conversation.updated_at = datetime.utcnow()
    db.session.commit()

    message_data = message.to_dict()
    room = f'conversation_{conversation.id}'

    # Nếu là cuộc hội thoại mới, join room trước khi emit
    if is_new_conversation:
        join_room(room)
        # Thông báo cho client biết cuộc hội thoại vừa được tạo
        emit('conversation_created', {
            'conversation': conversation.to_dict()
        })

    # Gửi tin nhắn vào room của cuộc hội thoại
    emit('new_message', message_data, room=room)

    # Thông báo cho admin khi có tin nhắn mới từ khách
    if sender_type == 'customer':
        emit('new_customer_message', {
            'conversation': conversation.to_dict(),
            'message': message_data,
            'is_new': is_new_conversation
        }, room='admin_room')

    # Thông báo cho khách hàng khi admin trả lời
    if sender_type == 'admin':
        if conversation.customer_id:
            customer_room = f'user_{conversation.customer_id}'
            emit('new_admin_message', {
                'conversation_id': conversation.id,
                'message': message_data
            }, room=customer_room)
        elif conversation.guest_session_id:
            guest_room = f'guest_{conversation.guest_session_id}'
            emit('new_admin_message', {
                'conversation_id': conversation.id,
                'message': message_data
            }, room=guest_room)

    print(f"Đã gửi tin nhắn trong cuộc hội thoại {conversation.id}")


@socketio.on('typing')
def handle_typing(data):
    conversation_id = data.get('conversation_id')
    token = data.get('token')
    session_id = data.get('session_id')
    is_typing = data.get('is_typing', True)

    user = get_user_from_token(token)
    user_name = 'Khách'
    user_id = None
    sender_type = 'customer'

    if user:
        user_name = user.hoten
        user_id = user.user_id
        sender_type = 'admin' if user.role == 'admin' else 'customer'

    room = f'conversation_{conversation_id}'
    emit('user_typing', {
        'conversation_id': conversation_id,
        'user_id': user_id,
        'user_name': user_name,
        'sender_type': sender_type,
        'is_typing': is_typing
    }, room=room, include_self=False)


@socketio.on('mark_read')
def handle_mark_read(data):
    token = data.get('token')
    session_id = data.get('session_id')
    conversation_id = data.get('conversation_id')

    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        return

    user = get_user_from_token(token)
    is_admin = False

    if user:
        if user.role == 'admin':
            is_admin = True

    # Đánh dấu tin nhắn từ phía đối diện là đã đọc
    if is_admin:
        # Admin đọc → đánh dấu tin nhắn của khách là đã đọc
        ChatMessage.query.filter_by(
            conversation_id=conversation_id,
            sender_type='customer',
            is_read=False
        ).update({'is_read': True})
    else:
        # Khách đọc → đánh dấu tin nhắn của admin là đã đọc
        ChatMessage.query.filter_by(
            conversation_id=conversation_id,
            sender_type='admin',
            is_read=False
        ).update({'is_read': True})

    db.session.commit()

    room = f'conversation_{conversation_id}'
    emit('messages_read', {
        'conversation_id': conversation_id
    }, room=room)


def init_socketio(app):
    socketio.init_app(app)
    return socketio
