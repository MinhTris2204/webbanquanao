import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'
import { useToast } from '../../components/Toast'

export default function AdminChat() {
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage, sendTyping, markAsRead } = useSocket()
  const toast = useToast()

  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [typing, setTyping] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    warning: '',
    confirmText: 'Xác nhận',
    confirmColor: 'blue',
    onConfirm: null
  })

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])
  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (!socket) return
    const handleNewMessage = (message) => {
      if (message.conversation_id === selectedConversation?.id) {
        setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message])
        if (message.sender_type === 'customer') markAsRead(selectedConversation.id)
      }
      updateConversationInList(message.conversation_id)
    }
    const handleNewCustomerMessage = (data) => {
      setConversations(prev => {
        const exists = prev.find(c => c.id === data.conversation.id)
        if (exists) return prev.map(c => c.id === data.conversation.id ? data.conversation : c).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        return [data.conversation, ...prev]
      })
    }
    const handleTyping = (data) => {
      if (data.conversation_id === selectedConversation?.id) {
        setTyping(data.is_typing ? data.user_name : null)
        if (data.is_typing) setTimeout(() => setTyping(null), 3000)
      }
    }
    const handleMessagesRead = (data) => {
      if (data.conversation_id === selectedConversation?.id) setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))
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
      setConversations(prev => prev.map(c => c.id === conversationId ? res.data : c).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)))
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
      setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c))
    } catch (error) {
      console.error('Error loading messages:', error)
      if (error.response?.status === 404) {
        toast.error('Cuộc trò chuyện không tồn tại (có thể đã bị xóa).')
        setConversations(prev => prev.filter(c => c.id !== conversation.id))
        setSelectedConversation(null)
      }
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return
    sendMessage(selectedConversation.id, newMessage.trim(), 'text')
    setNewMessage('')
    sendTyping(selectedConversation.id, false)
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    if (selectedConversation) {
      sendTyping(selectedConversation.id, true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => sendTyping(selectedConversation.id, false), 2000)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedConversation) return

    // Danh sách các định dạng ảnh được hỗ trợ
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/bmp', 'image/svg+xml', 'image/tiff', 'image/ico', 'image/x-icon',
      'image/heic', 'image/heif', 'image/avif'
    ]
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif']

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)

    if (!isValidType) {
      return toast.warning('Định dạng ảnh không được hỗ trợ. Vui lòng chọn file: ' + allowedExtensions.join(', '))
    }
    if (file.size > 5 * 1024 * 1024) return toast.warning('Ảnh không được vượt quá 5MB')

    setUploadingImage(true)
    const reader = new FileReader()
    reader.onload = () => { sendMessage(selectedConversation.id, '', 'image', reader.result); setUploadingImage(false) }
    reader.onerror = () => { toast.error('Lỗi khi đọc file ảnh'); setUploadingImage(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const closeConversation = (conversationId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kết thúc cuộc trò chuyện',
      message: 'Bạn có chắc chắn muốn kết thúc cuộc trò chuyện này?',
      warning: 'Khách hàng sẽ nhận được thông báo kết thúc.',
      confirmText: 'Kết thúc',
      confirmColor: 'orange',
      onConfirm: async () => {
        try {
          await api.post(`/api/chat/${conversationId}/close`)
          setConversations(prev => prev.map(c =>
            c.id === conversationId ? { ...c, status: 'closed' } : c
          ))
          if (selectedConversation?.id === conversationId) {
            setSelectedConversation(prev => ({ ...prev, status: 'closed' }))
          }
          toast.success('Đã kết thúc cuộc trò chuyện')
        } catch (error) {
          console.error('Error closing conversation:', error)
          if (error.response?.status === 404) {
            setConversations(prev => prev.filter(c => c.id !== conversationId))
            setSelectedConversation(null)
          }
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDeleteConversation = (conversationId) => {
    // Kiểm tra trạng thái cuộc trò chuyện
    const conversation = conversations.find(c => c.id === conversationId) || selectedConversation
    if (conversation && conversation.status !== 'closed') {
      toast.warning('Vui lòng KẾT THÚC cuộc trò chuyện trước khi xóa!')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Xóa cuộc trò chuyện',
      message: 'Bạn có chắc chắn muốn XÓA VĨNH VIỄN cuộc trò chuyện này?',
      warning: 'Hành động này không thể hoàn tác! Tất cả tin nhắn sẽ bị xóa.',
      confirmText: 'Xóa vĩnh viễn',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await api.delete(`/api/chat/${conversationId}`)
          setConversations(prev => prev.filter(c => c.id !== conversationId))
          if (selectedConversation?.id === conversationId) { setSelectedConversation(null); setMessages([]) }
          toast.success('Đã xóa cuộc trò chuyện')
        } catch (error) {
          console.error('Error deleting conversation:', error)
          if (error.response?.status === 404) {
            toast.error('Cuộc trò chuyện đã không còn tồn tại.')
            setConversations(prev => prev.filter(c => c.id !== conversationId))
            setSelectedConversation(null)
          } else {
            toast.error(error.response?.data?.error || 'Lỗi khi xóa cuộc trò chuyện')
          }
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return formatTime(dateStr)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
  const filteredConversations = conversations.filter(c =>
    c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="h-[calc(100vh-100px)] flex bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Sidebar */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-5 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Tin nhắn</h2>
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className="text-xs text-gray-500">{isConnected ? 'Đang hoạt động' : 'Mất kết nối'}</span>
                </div>
              </div>
            </div>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{totalUnread}</span>
            )}
          </div>
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`p-4 cursor-pointer transition-all hover:bg-white ${selectedConversation?.id === conv.id ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : 'border-l-4 border-l-transparent'
                  } ${conv.status === 'closed' ? 'opacity-75 bg-gray-50' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${conv.status === 'closed' ? 'bg-gray-400' : 'bg-blue-600'}`}>
                      {conv.customer_name?.charAt(0).toUpperCase() || 'K'}
                    </div>
                    {conv.status === 'active' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                    {conv.status === 'closed' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold truncate ${conv.status === 'closed' ? 'text-gray-500' : 'text-gray-800'}`}>
                        {conv.customer_name} {conv.status === 'closed' && '(Đã kết thúc)'}
                      </p>
                      <span className="text-xs text-gray-400">{conv.last_message ? formatDate(conv.last_message.created_at) : ''}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{conv.customer_email}</p>
                    {conv.last_message && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conv.last_message.sender_type === 'admin' && <span className="text-blue-600">Bạn: </span>}
                        {conv.last_message.content || '📷 Hình ảnh'}
                      </p>
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{conv.unread_count}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-lg ${selectedConversation.status === 'closed' ? 'bg-gray-400' : 'bg-blue-600'}`}>
                  {selectedConversation.customer_name?.charAt(0).toUpperCase() || 'K'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    {selectedConversation.customer_name}
                    {selectedConversation.status === 'closed' && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Đã kết thúc</span>}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedConversation.customer_email}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {selectedConversation.status !== 'closed' && (
                  <button
                    onClick={() => closeConversation(selectedConversation.id)}
                    className="flex items-center space-x-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg transition-colors"
                    title="Kết thúc cuộc trò chuyện"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">Kết thúc</span>
                  </button>
                )}
                <button
                  onClick={() => handleDeleteConversation(selectedConversation.id)}
                  className="flex items-center space-x-2 text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                  title="Xóa vĩnh viễn"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="text-sm font-medium">Xóa</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender_type === 'customer' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0">
                      {selectedConversation.customer_name?.charAt(0).toUpperCase() || 'K'}
                    </div>
                  )}
                  <div className="max-w-[65%]">
                    <div className={`rounded-2xl px-4 py-3 ${msg.sender_type === 'admin'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                      }`}>
                      {msg.message_type === 'image' && msg.image_url ? (
                        <img src={msg.image_url} alt="Ảnh" className="max-w-full max-h-72 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.image_url, '_blank')} />
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    <div className={`flex items-center space-x-1 mt-1 ${msg.sender_type === 'admin' ? 'justify-end' : ''}`}>
                      <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                      {msg.sender_type === 'admin' && (
                        <span className={`text-[10px] ${msg.is_read ? 'text-blue-600' : 'text-gray-400'}`}>
                          {msg.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {selectedConversation.customer_name?.charAt(0).toUpperCase() || 'K'}
                  </div>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {selectedConversation.status === 'closed' ? (
              <div className="p-4 bg-gray-100 border-t border-gray-200 text-center">
                <p className="text-gray-500 font-medium">Cuộc trò chuyện này đã kết thúc</p>
                <p className="text-xs text-gray-400 mt-1">Bạn chỉ có thể xem lại nội dung tin nhắn</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-center space-x-3 bg-gray-100 rounded-2xl px-4 py-3">
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.tif,.ico,.heic,.heif,.avif,image/*" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-700 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Chọn cuộc trò chuyện</h3>
              <p className="text-gray-500">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className={`px-6 py-4 rounded-t-xl ${confirmModal.confirmColor === 'red' ? 'bg-red-500' : 'bg-orange-500'}`}>
              <h3 className="text-xl font-bold text-white mb-0">{confirmModal.title}</h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 text-lg mb-4">
                {confirmModal.message}
              </p>

              {confirmModal.warning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <p className="text-yellow-800 text-sm font-semibold">
                    ⚠️ {confirmModal.warning}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 text-white px-4 py-2 rounded-lg font-semibold transition shadow-md ${confirmModal.confirmColor === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                >
                  {confirmModal.confirmText}
                </button>
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
