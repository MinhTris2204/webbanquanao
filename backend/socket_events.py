from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from models import db, User, ChatConversation, ChatMessage
from datetime import datetime

socketio = SocketIO(cors_allowed_origins="*")

# Store connected users: {user_id: sid}
connected_users = {}
# Store admin sids
admin_sids = set()


def get_user_from_token(token):
    """Decode JWT token and get user"""
    try:
        decoded = decode_token(token)
        user_id = decoded.get('sub')
        return User.query.get(user_id)
    except Exception as e:
        print(f"Token decode error: {e}")
        return None


@socketio.on('connect')
def handle_connect():
    from flask import request
    print(f"Client connected: {request.sid if hasattr(request, 'sid') else 'unknown'}")


@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    sid = request.sid
    # Remove from connected users
    user_id_to_remove = None
    for user_id, user_sid in connected_users.items():
        if user_sid == sid:
            user_id_to_remove = user_id
            break
    if user_id_to_remove:
        del connected_users[user_id_to_remove]
    
    # Remove from admin sids
    admin_sids.discard(sid)
    print(f"Client disconnected: {sid}")


@socketio.on('authenticate')
def handle_authenticate(data):
    from flask import request
    token = data.get('token')
    if not token:
        emit('auth_error', {'error': 'No token provided'})
        return
    
    user = get_user_from_token(token)
    if not user:
        emit('auth_error', {'error': 'Invalid token'})
        return
    
    sid = request.sid
    connected_users[user.user_id] = sid
    
    if user.role == 'admin':
        admin_sids.add(sid)
        # Join admin room
        join_room('admin_room')
        emit('authenticated', {'user_id': user.user_id, 'role': 'admin'})
    else:
        # Join user's personal room
        join_room(f'user_{user.user_id}')
        emit('authenticated', {'user_id': user.user_id, 'role': 'customer'})
    
    print(f"User {user.user_id} ({user.role}) authenticated")


@socketio.on('join_conversation')
def handle_join_conversation(data):
    from flask import request
    conversation_id = data.get('conversation_id')
    token = data.get('token')
    
    user = get_user_from_token(token)
    if not user:
        emit('error', {'error': 'Unauthorized'})
        return
    
    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        emit('error', {'error': 'Conversation not found'})
        return
    
    # Check permission
    if user.role != 'admin' and conversation.customer_id != user.user_id:
        emit('error', {'error': 'Unauthorized'})
        return
    
    room = f'conversation_{conversation_id}'
    join_room(room)
    emit('joined_conversation', {'conversation_id': conversation_id})
    print(f"User {user.user_id} joined conversation {conversation_id}")


@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    conversation_id = data.get('conversation_id')
    room = f'conversation_{conversation_id}'
    leave_room(room)


@socketio.on('send_message')
def handle_send_message(data):
    from flask import request
    token = data.get('token')
    conversation_id = data.get('conversation_id')
    content = data.get('content', '')
    message_type = data.get('message_type', 'text')
    image_url = data.get('image_url')
    
    # Require content for text messages, image_url for image messages
    if message_type == 'text' and (not content or not content.strip()):
        emit('error', {'error': 'Message content is required'})
        return
    if message_type == 'image' and not image_url:
        emit('error', {'error': 'Image is required'})
        return
    
    user = get_user_from_token(token)
    if not user:
        emit('error', {'error': 'Unauthorized'})
        return
    
    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        emit('error', {'error': 'Conversation not found'})
        return
    
    # Check permission
    if user.role != 'admin' and conversation.customer_id != user.user_id:
        emit('error', {'error': 'Unauthorized'})
        return
    
    # Create message
    sender_type = 'admin' if user.role == 'admin' else 'customer'
    message_type = data.get('message_type', 'text')
    image_url = data.get('image_url')
    
    message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=user.user_id,
        sender_type=sender_type,
        content=content.strip() if content else '',
        message_type=message_type,
        image_url=image_url
    )
    db.session.add(message)
    
    # Update conversation timestamp
    conversation.updated_at = datetime.utcnow()
    db.session.commit()
    
    message_data = message.to_dict()
    room = f'conversation_{conversation_id}'
    
    # Emit to conversation room
    emit('new_message', message_data, room=room)
    
    # Notify admins about new customer message
    if sender_type == 'customer':
        emit('new_customer_message', {
            'conversation': conversation.to_dict(),
            'message': message_data
        }, room='admin_room')
    
    # Notify customer about admin reply
    if sender_type == 'admin':
        customer_room = f'user_{conversation.customer_id}'
        emit('new_admin_message', {
            'conversation_id': conversation_id,
            'message': message_data
        }, room=customer_room)
    
    print(f"Message sent in conversation {conversation_id} by {user.user_id}")


@socketio.on('typing')
def handle_typing(data):
    conversation_id = data.get('conversation_id')
    token = data.get('token')
    is_typing = data.get('is_typing', True)
    
    user = get_user_from_token(token)
    if not user:
        return
    
    room = f'conversation_{conversation_id}'
    emit('user_typing', {
        'conversation_id': conversation_id,
        'user_id': user.user_id,
        'user_name': user.hoten,
        'is_typing': is_typing
    }, room=room, include_self=False)


@socketio.on('mark_read')
def handle_mark_read(data):
    token = data.get('token')
    conversation_id = data.get('conversation_id')
    
    user = get_user_from_token(token)
    if not user:
        return
    
    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        return
    
    # Mark messages from the other party as read
    if user.role == 'admin':
        ChatMessage.query.filter_by(
            conversation_id=conversation_id,
            sender_type='customer',
            is_read=False
        ).update({'is_read': True})
    else:
        ChatMessage.query.filter_by(
            conversation_id=conversation_id,
            sender_type='admin',
            is_read=False
        ).update({'is_read': True})
    
    db.session.commit()
    
    room = f'conversation_{conversation_id}'
    emit('messages_read', {
        'conversation_id': conversation_id,
        'reader_id': user.user_id
    }, room=room)


def init_socketio(app):
    socketio.init_app(app)
    return socketio
