from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models import db, User, ChatConversation, ChatMessage

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations that have messages - for admin only"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Chỉ lấy các conversation có tin nhắn
    conversations = ChatConversation.query.filter(
        ChatConversation.id.in_(
            db.session.query(ChatMessage.conversation_id).distinct()
        )
    ).order_by(ChatConversation.status.asc(), ChatConversation.updated_at.desc()).all()
    
    return jsonify([conv.to_dict() for conv in conversations])


@chat_bp.route('/my-conversation', methods=['GET'])
def get_my_conversation():
    """Get existing conversation for customer or guest (don't create new)"""
    # Kiểm tra nếu đã đăng nhập
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user:
            return get_user_conversation(user_id)
    except:
        pass
    
    # Khách vãng lai - dùng session_id
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({'error': 'Session ID required for guest'}), 400
    
    return get_guest_conversation(session_id)


def get_user_conversation(user_id):
    """Get conversation for logged in user - don't create if not exists"""
    # Check for closed conversation first
    closed_conversation = ChatConversation.query.filter_by(
        customer_id=user_id,
        status='closed'
    ).order_by(ChatConversation.updated_at.desc()).first()
    
    if closed_conversation:
        return jsonify(closed_conversation.to_dict(include_messages=True))
    
    # Find existing active conversation
    conversation = ChatConversation.query.filter_by(
        customer_id=user_id,
        status='active'
    ).first()
    
    if conversation:
        return jsonify(conversation.to_dict(include_messages=True))
    
    # Trả về empty nếu chưa có conversation
    return jsonify({
        'id': None,
        'messages': [],
        'status': 'new'
    })


def get_guest_conversation(session_id):
    """Get conversation for guest user - don't create if not exists"""
    # Check for closed conversation first
    closed_conversation = ChatConversation.query.filter_by(
        guest_session_id=session_id,
        status='closed'
    ).order_by(ChatConversation.updated_at.desc()).first()
    
    if closed_conversation:
        return jsonify(closed_conversation.to_dict(include_messages=True))
    
    # Find existing active conversation
    conversation = ChatConversation.query.filter_by(
        guest_session_id=session_id,
        status='active'
    ).first()
    
    if conversation:
        return jsonify(conversation.to_dict(include_messages=True))
    
    # Trả về empty nếu chưa có conversation
    return jsonify({
        'id': None,
        'messages': [],
        'status': 'new'
    })


@chat_bp.route('/guest/set-name', methods=['POST'])
def set_guest_name():
    """Set name for guest conversation"""
    data = request.get_json()
    session_id = data.get('session_id')
    guest_name = data.get('name', '').strip()
    
    if not session_id:
        return jsonify({'error': 'Session ID required'}), 400
    
    conversation = ChatConversation.query.filter_by(
        guest_session_id=session_id,
        status='active'
    ).first()
    
    if conversation and guest_name:
        conversation.guest_name = guest_name
        db.session.commit()
        return jsonify(conversation.to_dict())
    
    return jsonify({'error': 'Conversation not found'}), 404


@chat_bp.route('/<int:conversation_id>', methods=['GET'])
@jwt_required()
def get_conversation(conversation_id):
    """Get conversation by ID with messages"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    conversation = ChatConversation.query.get_or_404(conversation_id)
    
    # Check permission
    if user.role != 'admin' and conversation.customer_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(conversation.to_dict(include_messages=True))


@chat_bp.route('/<int:conversation_id>/messages', methods=['GET'])
def get_messages(conversation_id):
    """Get messages for a conversation"""
    conversation = ChatConversation.query.get_or_404(conversation_id)
    
    # Kiểm tra quyền truy cập
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user.role != 'admin' and conversation.customer_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
    except:
        # Guest - kiểm tra session_id
        session_id = request.args.get('session_id')
        if conversation.guest_session_id != session_id:
            return jsonify({'error': 'Unauthorized'}), 403
    
    messages = ChatMessage.query.filter_by(conversation_id=conversation_id).order_by(ChatMessage.created_at.asc()).all()
    return jsonify([msg.to_dict() for msg in messages])


@chat_bp.route('/<int:conversation_id>/read', methods=['POST'])
def mark_as_read(conversation_id):
    """Mark messages as read"""
    conversation = ChatConversation.query.get_or_404(conversation_id)
    is_admin = False
    
    # Kiểm tra quyền
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user.role == 'admin':
            is_admin = True
        elif conversation.customer_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
    except:
        # Guest
        data = request.get_json() or {}
        session_id = data.get('session_id') or request.args.get('session_id')
        if conversation.guest_session_id != session_id:
            return jsonify({'error': 'Unauthorized'}), 403
    
    # Mark messages from the other party as read
    if is_admin:
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
    return jsonify({'success': True})


@chat_bp.route('/<int:conversation_id>/close', methods=['POST'])
@jwt_required()
def close_conversation(conversation_id):
    """Close a conversation - admin only"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conversation = ChatConversation.query.get_or_404(conversation_id)
    customer_id = conversation.customer_id
    guest_session_id = conversation.guest_session_id
    
    # Mark conversation as closed
    conversation.status = 'closed'
    db.session.commit()
    
    # Notify customer via socket
    from socket_events import socketio
    if customer_id:
        socketio.emit('conversation_closed', {
            'conversation_id': conversation_id,
            'message': 'Cuộc trò chuyện đã được kết thúc bởi admin. Cảm ơn bạn đã liên hệ!'
        }, room=f'user_{customer_id}')
    elif guest_session_id:
        socketio.emit('conversation_closed', {
            'conversation_id': conversation_id,
            'message': 'Cuộc trò chuyện đã được kết thúc bởi admin. Cảm ơn bạn đã liên hệ!'
        }, room=f'guest_{guest_session_id}')
    
    return jsonify({'success': True})


@chat_bp.route('/<int:conversation_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conversation_id):
    """Delete a conversation permanently - admin only"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conversation = ChatConversation.query.get_or_404(conversation_id)
    
    # Delete all messages first
    ChatMessage.query.filter_by(conversation_id=conversation_id).delete()
    
    # Delete conversation
    db.session.delete(conversation)
    db.session.commit()
    
    return jsonify({'success': True})


@chat_bp.route('/start-new', methods=['POST'])
def start_new_conversation():
    """Delete closed conversation and start new one"""
    # Kiểm tra nếu đã đăng nhập
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user:
            return start_new_user_conversation(user_id)
    except:
        pass
    
    # Guest
    data = request.get_json() or {}
    session_id = data.get('session_id')
    if not session_id:
        return jsonify({'error': 'Session ID required'}), 400
    
    return start_new_guest_conversation(session_id)


def start_new_user_conversation(user_id):
    """Start new conversation for logged in user"""
    # Delete closed conversations
    closed_conversations = ChatConversation.query.filter_by(
        customer_id=user_id,
        status='closed'
    ).all()
    
    for conv in closed_conversations:
        ChatMessage.query.filter_by(conversation_id=conv.id).delete()
        db.session.delete(conv)
    db.session.commit()
    
    # Trả về empty - conversation sẽ được tạo khi gửi tin nhắn đầu tiên
    return jsonify({
        'id': None,
        'messages': [],
        'status': 'new'
    })


def start_new_guest_conversation(session_id):
    """Start new conversation for guest"""
    # Delete closed conversations
    closed_conversations = ChatConversation.query.filter_by(
        guest_session_id=session_id,
        status='closed'
    ).all()
    
    for conv in closed_conversations:
        ChatMessage.query.filter_by(conversation_id=conv.id).delete()
        db.session.delete(conv)
    db.session.commit()
    
    # Trả về empty - conversation sẽ được tạo khi gửi tin nhắn đầu tiên
    return jsonify({
        'id': None,
        'messages': [],
        'status': 'new'
    })


@chat_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get total unread message count for admin"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    count = db.session.query(ChatMessage).join(ChatConversation).filter(
        ChatMessage.sender_type == 'customer',
        ChatMessage.is_read == False,
        ChatConversation.status == 'active'
    ).count()
    
    return jsonify({'unread_count': count})
