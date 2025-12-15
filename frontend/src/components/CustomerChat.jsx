import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'

export default function CustomerChat() {
  const { isAuthenticated, user } = useAuth()
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage, sendTyping, markAsRead } = useSocket()
  
  const [isOpen, setIsOpen] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversation when chat opens
  useEffect(() => {
    if (isOpen && isAuthenticated && !conversation) {
      loadConversation()
    }
  }, [isOpen, isAuthenticated])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    // Only handle new_message for messages in the conversation room (both customer and admin)
    const handleNewMessage = (message) => {
      if (message.conversation_id === conversation?.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) return prev
          return [...prev, message]
        })
        if (message.sender_type === 'admin' && isOpen) {
          markAsRead(conversation?.id)
        }
      }
    }

    // Handle admin message notification (for unread count when chat is closed)
    const handleNewAdminMessage = (data) => {
      if (!isOpen && data.conversation_id === conversation?.id) {
        setUnreadCount(prev => prev + 1)
      }
    }

    const handleTyping = (data) => {
      if (data.conversation_id === conversation?.id && data.sender_type !== 'customer') {
        setTyping(data.is_typing ? data.user_name : null)
        if (data.is_typing) {
          setTimeout(() => setTyping(null), 3000)
        }
      }
    }

    const handleMessagesRead = (data) => {
      if (data.conversation_id === conversation?.id) {
        setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))
      }
    }

    socket.on('new_message', handleNewMessage)
    socket.on('new_admin_message', handleNewAdminMessage)
    socket.on('user_typing', handleTyping)
    socket.on('messages_read', handleMessagesRead)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('new_admin_message', handleNewAdminMessage)
      socket.off('user_typing', handleTyping)
      socket.off('messages_read', handleMessagesRead)
    }
  }, [socket, conversation, isOpen, markAsRead])

  // Join/leave conversation room
  useEffect(() => {
    if (conversation && isConnected) {
      joinConversation(conversation.id)
      return () => leaveConversation(conversation.id)
    }
  }, [conversation, isConnected, joinConversation, leaveConversation])

  const loadConversation = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/chat/my-conversation')
      setConversation(res.data)
      setMessages(res.data.messages || [])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversation) return

    sendMessage(conversation.id, newMessage.trim())
    setNewMessage('')
    sendTyping(conversation.id, false)
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    
    if (conversation) {
      sendTyping(conversation.id, true)
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(conversation.id, false)
      }, 2000)
    }
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
    if (!isOpen && conversation) {
      markAsRead(conversation.id)
      setUnreadCount(0)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4">
            <h3 className="font-semibold">Hỗ trợ khách hàng</h3>
            <p className="text-sm text-blue-100">
              {isConnected ? '🟢 Đã kết nối' : '🔴 Đang kết nối lại...'}
            </p>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>Chào bạn! 👋</p>
                <p className="text-sm mt-2">Hãy gửi tin nhắn để được hỗ trợ</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      msg.sender_type === 'customer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === 'customer' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-gray-200 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-600">{typing} đang nhập...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Nhập tin nhắn..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
