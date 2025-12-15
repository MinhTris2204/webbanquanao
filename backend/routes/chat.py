from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, ChatConversation, ChatMessage

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations - for admin only"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conversations = ChatConversation.query.order_by(ChatConversation.updated_at.desc()).all()
    return jsonify([conv.to_dict() for conv in conversations])


@chat_bp.route('/my-conversation', methods=['GET'])
@jwt_required()
def get_my_conversation():
    """Get or create conversation for current customer"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Find existing active conversation or create new one
    conversation = ChatConversation.query.filter_by(
        customer_id=user_id,
        status='active'
    ).first()
    
    if not conversation:
        conversation = ChatConversation(customer_id=user_id)
        db.session.add(conversation)
        db.session.commit()
    
    return jsonify(conversation.to_dict(include_messages=True))


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
@jwt_required()
def get_messages(conversation_id):
    """Get messages for a conversation"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    conversation = ChatConversation.query.get_or_404(conversation_id)
    
    # Check permission
    if user.role != 'admin' and conversation.customer_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    messages = ChatMessage.query.filter_by(conversation_id=conversation_id).order_by(ChatMessage.created_at.asc()).all()
    return jsonify([msg.to_dict() for msg in messages])


@chat_bp.route('/<int:conversation_id>/read', methods=['POST'])
@jwt_required()
def mark_as_read(conversation_id):
    """Mark messages as read"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    conversation = ChatConversation.query.get_or_404(conversation_id)
    
    # Check permission
    if user.role != 'admin' and conversation.customer_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
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
    conversation.status = 'closed'
    db.session.commit()
    
    return jsonify({'success': True, 'conversation': conversation.to_dict()})


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
