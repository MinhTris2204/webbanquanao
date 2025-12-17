import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api, { getImageUrl } from '../utils/api'

const AI_INITIAL_MESSAGE = { role: 'assistant', content: 'Xin chào! 👋 Tôi là trợ lý AI của Shop Quần Áo. Tôi có thể giúp bạn tìm sản phẩm, trả lời câu hỏi về cửa hàng. Bạn cần hỗ trợ gì?' }
const AI_STORAGE_KEY = 'ai_chatbot_messages'

export default function ChatWidget() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage: sendSocketMessage, sendTyping, markAsRead } = useSocket()
  
  const [isOpen, setIsOpen] = useState(false)
  const [chatMode, setChatMode] = useState(null) // null = menu, 'ai' = AI chatbot, 'support' = CSKH
  
  // AI Chatbot state
  const [aiMessages, setAiMessages] = useState(() => {
    const saved = sessionStorage.getItem(AI_STORAGE_KEY)
    if (saved) {
      try { return JSON.parse(saved) } catch { return [AI_INITIAL_MESSAGE] }
    }
    return [AI_INITIAL_MESSAGE]
  })
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  
  // CSKH state
  const [conversation, setConversation] = useState(null)
  const [cskhMessages, setCskhMessages] = useState([])
  const [cskhInput, setCskhInput] = useState('')
  const [cskhLoading, setCskhLoading] = useState(false)
  const [typing, setTyping] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [closedMessage, setClosedMessage] = useState(null)
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  // Persist AI messages
  useEffect(() => {
    sessionStorage.setItem(AI_STORAGE_KEY, JSON.stringify(aiMessages))
  }, [aiMessages])

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [aiMessages, cskhMessages])


  // Tải cuộc trò chuyện CSKH khi chuyển sang chế độ hỗ trợ
  useEffect(() => {
    if (chatMode === 'support' && isAuthenticated && !conversation && !closedMessage) {
      loadConversation()
    }
  }, [chatMode, isAuthenticated])

  // Socket events for CSKH
  useEffect(() => {
    if (!socket) return
    const handleNewMessage = (message) => {
      if (message.conversation_id === conversation?.id) {
        setCskhMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message])
        if (message.sender_type === 'admin' && isOpen && chatMode === 'support') markAsRead(conversation?.id)
      }
    }
    const handleNewAdminMessage = (data) => {
      if ((!isOpen || chatMode !== 'support') && data.conversation_id === conversation?.id) setUnreadCount(prev => prev + 1)
    }
    const handleTyping = (data) => {
      if (data.conversation_id === conversation?.id && data.sender_type !== 'customer') {
        setTyping(data.is_typing ? data.user_name : null)
        if (data.is_typing) setTimeout(() => setTyping(null), 3000)
      }
    }
    const handleMessagesRead = (data) => {
      if (data.conversation_id === conversation?.id) setCskhMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))
    }
    const handleConversationClosed = (data) => {
      if (data.conversation_id === conversation?.id) {
        setClosedMessage(data.message)
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
  }, [socket, conversation, isOpen, chatMode, markAsRead])

  useEffect(() => {
    if (conversation && isConnected) {
      joinConversation(conversation.id)
      return () => leaveConversation(conversation.id)
    }
  }, [conversation, isConnected, joinConversation, leaveConversation])

  const loadConversation = async () => {
    setCskhLoading(true)
    try {
      const res = await api.get('/api/chat/my-conversation')
      setConversation(res.data)
      setCskhMessages(res.data.messages || [])
      setUnreadCount(0)
      if (res.data.status === 'closed') {
        setClosedMessage('Cuộc trò chuyện đã được kết thúc bởi admin. Cảm ơn bạn đã liên hệ!')
      } else {
        setClosedMessage(null)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setCskhLoading(false)
    }
  }

  const startNewConversation = async () => {
    setCskhLoading(true)
    try {
      const res = await api.post('/api/chat/start-new')
      setConversation(res.data)
      setCskhMessages([])
      setClosedMessage(null)
    } catch (error) {
      console.error('Error starting new conversation:', error)
    } finally {
      setCskhLoading(false)
    }
  }

  // AI Chatbot functions
  const sendAiMessage = async (e) => {
    e.preventDefault()
    if (!aiInput.trim() || aiLoading) return
    const userMessage = aiInput.trim()
    setAiInput('')
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setAiLoading(true)
    try {
      const res = await api.post('/api/chatbot/ask', { query: userMessage })
      setAiMessages(prev => [...prev, { role: 'assistant', content: res.data.response, products: res.data.products }])
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.' }])
    } finally {
      setAiLoading(false)
    }
  }

  // CSKH functions
  const sendCskhMessage = (e) => {
    e.preventDefault()
    if (!cskhInput.trim() || !conversation) return
    sendSocketMessage(conversation.id, cskhInput.trim(), 'text')
    setCskhInput('')
    sendTyping(conversation.id, false)
  }

  const handleCskhInputChange = (e) => {
    setCskhInput(e.target.value)
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
    reader.onload = () => { sendSocketMessage(conversation.id, '', 'image', reader.result); setUploadingImage(false) }
    reader.onerror = () => { alert('Lỗi khi đọc file ảnh'); setUploadingImage(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false)
      setChatMode(null)
    } else {
      setIsOpen(true)
    }
  }

  const selectMode = (mode) => {
    setChatMode(mode)
    if (mode === 'support' && conversation) {
      markAsRead(conversation.id)
      setUnreadCount(0)
    }
  }

  const goBackToMenu = () => setChatMode(null)

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ'
  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })


  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip */}
      {!isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 animate-bounce">
          <div className="bg-white text-gray-800 text-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap">
            💬 Cần hỗ trợ?
          </div>
        </div>
      )}
      
      {/* Pulse effect */}
      {!isOpen && (
        <>
          <span className="absolute inset-0 w-14 h-14 rounded-full bg-blue-400 animate-ping opacity-75"></span>
          <span className="absolute inset-0 w-14 h-14 rounded-full bg-blue-500 animate-pulse opacity-50"></span>
        </>
      )}
      
      {/* Toggle Button */}
      <button
        onClick={toggleChat}
        className={`group relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'
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

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Menu Selection */}
          {chatMode === null && (
            <>
              <div className="bg-blue-500 p-4">
                <h3 className="font-semibold text-white text-center">Chọn hình thức hỗ trợ</h3>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={() => selectMode('ai')}
                  className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">🤖 Chat với AI</p>
                    <p className="text-sm text-gray-500">Trả lời tự động 24/7</p>
                  </div>
                </button>
                
                {isAuthenticated ? (
                  <button
                    onClick={() => selectMode('support')}
                    className="w-full flex items-center gap-4 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition-all group relative"
                  >
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">👨‍💼 Chat với CSKH</p>
                      <p className="text-sm text-gray-500">Nhân viên hỗ trợ trực tiếp</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-60">
                    <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-500">👨‍💼 Chat với CSKH</p>
                      <p className="text-sm text-gray-400">Đăng nhập để chat với nhân viên</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}


          {/* AI Chatbot Mode */}
          {chatMode === 'ai' && (
            <>
              <div className="bg-blue-500 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button onClick={goBackToMenu} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Trợ lý AI</h3>
                      <p className="text-xs text-white/80">Hỗ trợ 24/7</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAiMessages([AI_INITIAL_MESSAGE])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white text-xs font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Mới
                  </button>
                </div>
              </div>

              <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-gray-50">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="max-w-[80%]">
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.products && msg.products.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {msg.products.map((product, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => navigate(`/products/${product.id}`)}
                              className="block bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all group text-left"
                            >
                              <div className="aspect-square overflow-hidden bg-gray-100">
                                <img src={getImageUrl(product.hinh_anh) || 'https://via.placeholder.com/150'} alt={product.ten_san_pham} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              </div>
                              <div className="p-2">
                                <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{product.ten_san_pham}</p>
                                <p className="text-sm text-blue-600 font-bold mt-1">{formatPrice(product.gia_ban)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendAiMessage} className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Hỏi về sản phẩm, cửa hàng..."
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
                    disabled={aiLoading}
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim() || aiLoading}
                    className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-600 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          )}


          {/* CSKH Support Mode */}
          {chatMode === 'support' && (
            <>
              <div className="bg-orange-500 p-4">
                <div className="flex items-center space-x-3">
                  <button onClick={goBackToMenu} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">Chat với CSKH</h3>
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-orange-300 animate-pulse' : 'bg-gray-300'}`}></span>
                      <span className="text-xs text-orange-100">{isConnected ? 'Đang hoạt động' : 'Đang kết nối...'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-gray-50">
                {cskhLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-3 h-3 bg-orange-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : cskhMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-800 font-medium">Xin chào! 👋</p>
                    <p className="text-sm text-gray-500 mt-1">Chúng tôi sẵn sàng hỗ trợ bạn</p>
                  </div>
                ) : (
                  cskhMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender_type === 'admin' && (
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      )}
                      <div className="max-w-[75%]">
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          msg.sender_type === 'customer'
                            ? 'bg-orange-500 text-white rounded-br-md'
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
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
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
                {closedMessage && (
                  <div className="flex justify-center my-4">
                    <div className="bg-gray-200 rounded-xl px-4 py-3 max-w-[90%] text-center">
                      <p className="text-sm text-gray-700">{closedMessage}</p>
                      <button onClick={startNewConversation} className="mt-3 bg-orange-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                        Bắt đầu cuộc trò chuyện mới
                      </button>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {closedMessage || conversation?.status === 'closed' ? (
                <div className="p-4 bg-gray-100 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-500">Cuộc trò chuyện đã kết thúc</p>
                </div>
              ) : (
                <form onSubmit={sendCskhMessage} className="p-4 bg-white border-t border-gray-100">
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-50">
                      {uploadingImage ? (
                        <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <input type="text" value={cskhInput} onChange={handleCskhInputChange} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400" />
                    <button type="submit" disabled={!cskhInput.trim()} className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-orange-600 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
