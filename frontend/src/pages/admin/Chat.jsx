import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'

export default function AdminChat() {
  const { user } = useAuth()
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage, sendTyping, markAsRead } = useSocket()
  
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [typing, setTyping] = useState(null)
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversations
  useEffect(() => {
    loadConversations()
  }, [])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (message) => {
      if (message.conversation_id === selectedConversation?.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) return prev
          return [...prev, message]
        })
        if (message.sender_type === 'customer') {
          markAsRead(selectedConversation.id)
        }
      }
      // Update conversation list
      updateConversationInList(message.conversation_id)
    }

    const handleNewCustomerMessage = (data) => {
      // Update or add conversation to list (for sidebar notification)
      setConversations(prev => {
        const exists = prev.find(c => c.id === data.conversation.id)
        if (exists) {
          return prev.map(c => c.id === data.conversation.id ? data.conversation : c)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        }
        return [data.conversation, ...prev]
      })
    }

    const handleTyping = (data) => {
      if (data.conversation_id === selectedConversation?.id) {
        setTyping(data.is_typing ? data.user_name : null)
        if (data.is_typing) {
          setTimeout(() => setTyping(null), 3000)
        }
      }
    }

    const handleMessagesRead = (data) => {
      if (data.conversation_id === selectedConversation?.id) {
        setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))
      }
    }

    socket.on('new_message', handleNewMessage)
    socket.on('new_customer_message', handleNewCustomerMessage)
    socket.on('user_typing', handleTyping)
    socket.on('messages_read', handleMessagesRead)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('new_customer_message', handleNewCustomerMessage)
      socket.off('user_typing', handleTyping)
      socket.off('messages_read', handleMessagesRead)
    }
  }, [socket, selectedConversation, markAsRead])

  // Join/leave conversation room
  useEffect(() => {
    if (selectedConversation && isConnected) {
      joinConversation(selectedConversation.id)
      return () => leaveConversation(selectedConversation.id)
    }
  }, [selectedConversation, isConnected, joinConversation, leaveConversation])

  const loadConversations = async () => {
    try {
      const res = await api.get('/api/chat/')
      setConversations(res.data)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateConversationInList = async (conversationId) => {
    try {
      const res = await api.get(`/api/chat/${conversationId}`)
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? res.data : c)
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      )
    } catch (error) {
      console.error('Error updating conversation:', error)
    }
  }

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation)
    try {
      const res = await api.get(`/api/chat/${conversation.id}`)
      setMessages(res.data.messages || [])
      markAsRead(conversation.id)
      // Update unread count in list
      setConversations(prev => 
        prev.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c)
      )
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    sendMessage(selectedConversation.id, newMessage.trim())
    setNewMessage('')
    sendTyping(selectedConversation.id, false)
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    
    if (selectedConversation) {
      sendTyping(selectedConversation.id, true)
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(selectedConversation.id, false)
      }, 2000)
    }
  }

  const closeConversation = async (conversationId) => {
    try {
      await api.post(`/api/chat/${conversationId}/close`)
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error closing conversation:', error)
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white rounded-lg shadow overflow-hidden">
      {/* Conversation List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-lg">
            Tin nhắn
            {totalUnread > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {totalUnread}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">
            {isConnected ? '🟢 Đã kết nối' : '🔴 Đang kết nối lại...'}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-gray-500 mt-8 px-4">
              <p>Chưa có cuộc hội thoại nào</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conv.customer_name}</p>
                    <p className="text-sm text-gray-500 truncate">{conv.customer_email}</p>
                    {conv.last_message && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conv.last_message.sender_type === 'admin' ? 'Bạn: ' : ''}
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    {conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                    <span className={`text-xs mt-1 px-2 py-0.5 rounded ${
                      conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {conv.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{selectedConversation.customer_name}</h3>
                <p className="text-sm text-gray-500">{selectedConversation.customer_email}</p>
              </div>
              <button
                onClick={() => closeConversation(selectedConversation.id)}
                className="text-red-600 hover:text-red-700 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
              >
                Đóng hội thoại
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.sender_type === 'admin'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center justify-end space-x-1 mt-1`}>
                      <span className={`text-xs ${msg.sender_type === 'admin' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.sender_type === 'admin' && (
                        <span className={`text-xs ${msg.is_read ? 'text-blue-200' : 'text-blue-300'}`}>
                          {msg.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Gửi
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Chọn một cuộc hội thoại để bắt đầu</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
