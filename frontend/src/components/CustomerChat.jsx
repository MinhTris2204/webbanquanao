import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'

export default function CustomerChat() {
  const { isAuthenticated } = useAuth()
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage, sendTyping, markAsRead } = useSocket()
  
  const [isOpen, setIsOpen] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [closedMessage, setClosedMessage] = useState(null)
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])
  useEffect(() => { 
    if (isOpen && isAuthenticated && !conversation && !closedMessage) loadConversation() 
  }, [isOpen, isAuthenticated])

  useEffect(() => {
    if (!socket) return
    const handleNewMessage = (message) => {
      if (message.conversation_id === conversation?.id) {
        setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message])
        if (message.sender_type === 'admin' && isOpen) markAsRead(conversation?.id)
      }
    }
    const handleNewAdminMessage = (data) => {
      if (!isOpen && data.conversation_id === conversation?.id) setUnreadCount(prev => prev + 1)
    }
    const handleTyping = (data) => {
      if (data.conversation_id === conversation?.id && data.sender_type !== 'customer') {
        setTyping(data.is_typing ? data.user_name : null)
        if (data.is_typing) setTimeout(() => setTyping(null), 3000)
      }
    }
    const handleMessagesRead = (data) => {
      if (data.conversation_id === conversation?.id) setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))
    }
    const handleConversationClosed = (data) => {
      if (data.conversation_id === conversation?.id) {
        setClosedMessage(data.message)
        // Keep messages to show history, but mark conversation as closed
        setConversation(prev => prev ? { ...prev, status: 'closed' } : null)
      }
    }
    socket.on('new_message', handleNewMessage)
    socket.on('new_admin_message', handleNewAdminMessage)
    socket.on('user_typing', handleTyping)
    socket.on('messages_read', handleMessagesRead)
    socket.on('conversation_closed', handleConversationClosed)
    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('new_admin_message', handleNewAdminMessage)
      socket.off('user_typing', handleTyping)
      socket.off('messages_read', handleMessagesRead)
      socket.off('conversation_closed', handleConversationClosed)
    }
  }, [socket, conversation, isOpen, markAsRead])

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
      // Check if conversation is closed
      if (res.data.status === 'closed') {
        setClosedMessage('Cuộc trò chuyện đã được kết thúc bởi admin. Cảm ơn bạn đã liên hệ!')
      } else {
        setClosedMessage(null)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const startNewConversation = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/chat/start-new')
      setConversation(res.data)
      setMessages([])
      setClosedMessage(null)
    } catch (error) {
      console.error('Error starting new conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversation) return
    sendMessage(conversation.id, newMessage.trim(), 'text')
    setNewMessage('')
    sendTyping(conversation.id, false)
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    if (conversation) {
      sendTyping(conversation.id, true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => sendTyping(conversation.id, false), 2000)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !conversation) return
    if (!file.type.startsWith('image/')) return alert('Vui lòng chọn file ảnh')
    if (file.size > 5 * 1024 * 1024) return alert('Ảnh không được vượt quá 5MB')
    setUploadingImage(true)
    const reader = new FileReader()
    reader.onload = () => { sendMessage(conversation.id, '', 'image', reader.result); setUploadingImage(false) }
    reader.onerror = () => { alert('Lỗi khi đọc file ảnh'); setUploadingImage(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
    if (!isOpen && conversation) { markAsRead(conversation.id); setUnreadCount(0) }
  }

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  if (!isAuthenticated) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip */}
      {!isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 animate-bounce">
          <div className="bg-white text-gray-800 text-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap">
            💬 Chat với chúng tôi!
            <div className="absolute -bottom-2 right-6 w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
          </div>
        </div>
      )}
      
      {/* Pulse ring effect */}
      {!isOpen && (
        <>
          <span className="absolute inset-0 w-14 h-14 rounded-full bg-blue-400 animate-ping opacity-75"></span>
          <span className="absolute inset-0 w-14 h-14 rounded-full bg-blue-500 animate-pulse opacity-50"></span>
        </>
      )}
      
      <button
        onClick={toggleChat}
        className={`group relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-7 h-7 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Chat với nhân viên CSKH</h3>
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                  <span className="text-xs text-blue-100">{isConnected ? 'Đang hoạt động' : 'Đang kết nối...'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[380px] overflow-y-auto p-4 space-y-4 bg-gray-50">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-3 h-3 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-800 font-medium">Xin chào! 👋</p>
                <p className="text-sm text-gray-500 mt-1">Chúng tôi sẵn sàng hỗ trợ bạn</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender_type === 'admin' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      msg.sender_type === 'customer'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                    }`}>
                      {msg.message_type === 'image' && msg.image_url ? (
                        <img src={msg.image_url} alt="Ảnh" className="max-w-full rounded-lg cursor-pointer hover:opacity-90" onClick={() => window.open(msg.image_url, '_blank')} />
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    <p className={`text-[10px] mt-1 ${msg.sender_type === 'customer' ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                      {msg.sender_type === 'customer' && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
                    </p>
                  </div>
                </div>
              ))
            )}
            {typing && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            {/* Closed Message - System message in chat */}
            {closedMessage && (
              <div className="flex justify-center my-4">
                <div className="bg-gray-200 rounded-xl px-4 py-3 max-w-[90%] text-center">
                  <p className="text-sm text-gray-700">{closedMessage}</p>
                  <button 
                    onClick={startNewConversation}
                    className="mt-3 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Bắt đầu cuộc trò chuyện mới
                  </button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {closedMessage || conversation?.status === 'closed' ? (
            <div className="p-4 bg-gray-100 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">Cuộc trò chuyện đã kết thúc</p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                  {uploadingImage ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <input type="text" value={newMessage} onChange={handleInputChange} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400" />
                <button type="submit" disabled={!newMessage.trim()} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-700 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
