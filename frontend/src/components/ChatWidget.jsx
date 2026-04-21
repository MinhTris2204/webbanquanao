import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useCart } from '../context/CartContext'
import { useToast } from './Toast'
import api, { getImageUrl } from '../utils/api'

// =============================================================
// ChatWidget: 1 khung chat duy nhat - AI + CSKH hien chung
// Tin nhan AI: avatar robot + ten "Tro ly AI"
// Tin nhan CSKH: avatar nhan vien + ten "CSKH" + dot online
// Tin nhan user: bubble ben phai
// =============================================================

const robotAssistantImg = '/robot-assistant.png'
const cskhImg = '/icon_cskh.png'
const GUEST_SESSION_KEY = 'guest_chat_session_id'
const UNIFIED_STORAGE_KEY = 'unified_chat_messages'

// Tu khoa -> chuyen sang CSKH
const CSKH_KEYWORDS = [
  // ASCII fallback
  'bao mat', 'tai khoan', 'mat khau', 'password',
  'bi hack', 'hack', 'dang nhap khong duoc',
  'tai khoan bi khoa', 'khoa tai khoan',
  'khieu nai', 'khieu kien', 'complaint',
  'tranh chap', 'to cao',
  'hoan tien', 'hoan tra', 'refund',
  'thanh toan loi', 'loi thanh toan', 'payment error',
  'mat tien', 'tru tien',
  'don hang', 'don cua toi',
  'kiem tra don', 'trang thai don',
  'don hang sai', 'don hang loi',
  'don hang o dau', 'don hang khi nao',
  'theo doi don', 'track order', 'order status',
  'huy don', 'cancel order', 'doi don',
  'giao hang', 'ship', 'shipper', 'van chuyen',
  'chua nhan hang', 'khong nhan duoc hang',
  'hang bi hong', 'hang loi', 'damaged',
  'su co', 'van de tai khoan',
  // Tiếng Việt có dấu
  'bảo mật', 'tài khoản', 'mật khẩu',
  'bị hack', 'đăng nhập không được',
  'tài khoản bị khóa', 'khóa tài khoản',
  'khiếu nại', 'khiếu kiện',
  'tranh chấp', 'tố cáo',
  'hoàn tiền', 'hoàn trả',
  'thanh toán lỗi', 'lỗi thanh toán',
  'mất tiền', 'trừ tiền',
  'đơn hàng', 'đơn của tôi',
  'kiểm tra đơn', 'trạng thái đơn',
  'đơn hàng sai', 'đơn hàng lỗi',
  'đơn hàng ở đâu', 'đơn hàng khi nào',
  'theo dõi đơn', 'hủy đơn', 'đổi đơn',
  'giao hàng', 'vận chuyển',
  'chưa nhận hàng', 'không nhận được hàng',
  'hàng bị hỏng', 'hàng lỗi',
  'sự cố', 'vấn đề tài khoản'
]

function getGuestSessionId() {
  let id = localStorage.getItem(GUEST_SESSION_KEY)
  if (!id) {
    id = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem(GUEST_SESSION_KEY, id)
  }
  return id
}

function needsCskh(text) {
  const lower = text.toLowerCase()
  return CSKH_KEYWORDS.some(kw => lower.includes(kw))
}

// Tao tin nhan AI
function makeAiMsg(content, products, suggestCskh) {
  return { id: 'ai_' + Date.now() + '_' + Math.random(), type: 'ai', content, products: products || [], suggestCskh: !!suggestCskh, ts: new Date().toISOString() }
}
// Tao tin nhan user
function makeUserMsg(content) {
  return { id: 'u_' + Date.now() + '_' + Math.random(), type: 'user', content, ts: new Date().toISOString() }
}
// Tao tin nhan CSKH (tu socket)
function makeCskhMsg(msg) {
  return { ...msg, type: msg.sender_type === 'customer' ? 'user' : 'cskh' }
}
// Tao system message (phan cach AI / CSKH)
function makeSystemMsg(content) {
  return { id: 'sys_' + Date.now(), type: 'system', content, ts: new Date().toISOString() }
}

const INITIAL_AI_MSG = makeAiMsg(
  'Xin chào! 👋 Tôi là trợ lý AI của Shop Quần Áo. Tôi có thể giúp bạn tìm sản phẩm, tư vấn khuyến mãi và trả lời câu hỏi về cửa hàng. Bạn cần hỗ trợ gì?'
)

export default function ChatWidget() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { fetchCartCount } = useCart()
  const toast = useToast()
  const { socket, isConnected, isSocketReady, joinConversation, leaveConversation, sendMessage: sendSocketMessage, sendTyping, markAsRead } = useSocket()

  const [isOpen, setIsOpen] = useState(false)
  const [guestSessionId] = useState(getGuestSessionId())

  // Tat ca tin nhan hien chung 1 khung
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem(UNIFIED_STORAGE_KEY)
    if (saved) { try { return JSON.parse(saved) } catch {} }
    return [INITIAL_AI_MSG]
  })

  // Trang thai AI
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Trang thai CSKH
  const [cskhMode, setCskhMode] = useState(() => sessionStorage.getItem('cskh_mode') === 'true')
  const [conversation, setConversation] = useState(() => {
    const saved = sessionStorage.getItem('cskh_conversation')
    if (saved) { try { return JSON.parse(saved) } catch {} }
    return null
  })
  const [cskhLoading, setCskhLoading] = useState(false)
  const [cskhInput, setCskhInput] = useState('')
  const [typing, setTyping] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [closedConv, setClosedConv] = useState(() => sessionStorage.getItem('cskh_closed') === 'true')

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  // Persist messages
  useEffect(() => {
    sessionStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  // Persist CSKH state
  useEffect(() => {
    sessionStorage.setItem('cskh_mode', cskhMode ? 'true' : 'false')
  }, [cskhMode])

  useEffect(() => {
    if (conversation) sessionStorage.setItem('cskh_conversation', JSON.stringify(conversation))
    else sessionStorage.removeItem('cskh_conversation')
  }, [conversation])

  useEffect(() => {
    sessionStorage.setItem('cskh_closed', closedConv ? 'true' : 'false')
  }, [closedConv])

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])

  // Load/sync CSKH conversation: khi chuyen sang CSKH hoac khi mount lai trang voi cskhMode=true
  useEffect(() => {
    if (cskhMode) {
      loadConversation()
    }
  }, []) // chỉ chạy 1 lần khi mount

  useEffect(() => {
    if (cskhMode && !conversation) {
      loadConversation()
    }
  }, [cskhMode])

  // Thông báo khi có tin nhắn từ admin
  const [toastMsg, setToastMsg] = useState(null)
  const toastTimerRef = useRef(null)

  const showAdminNotification = (content) => {
    // 1. Browser Notification (nếu được cấp quyền)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('CSKH Shop Quần Áo', {
        body: content || 'Nhân viên vừa gửi tin nhắn',
        icon: cskhImg,
        tag: 'cskh-msg'
      })
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // 2. In-app toast popup
    setToastMsg(content || 'Nhân viên vừa gửi tin nhắn')
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4000)
  }

  // Socket events
  useEffect(() => {
    if (!socket) return
    const handleNewMessage = (msg) => {
      if (msg.conversation_id === conversation?.id || !conversation?.id) {
        const unified = makeCskhMsg(msg)
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, unified])
        if (msg.sender_type === 'admin' && isOpen && cskhMode && conversation?.id) {
          markAsRead(conversation.id, guestSessionId)
        }
        // Thông báo khi widget đóng hoặc đang ở tab khác
        if (msg.sender_type === 'admin' && !isOpen) {
          showAdminNotification(msg.content || 'Nhân viên vừa gửi tin nhắn')
        }
      }
    }
    const handleNewAdminMessage = (data) => {
      if ((!isOpen || !cskhMode) && data.conversation_id === conversation?.id) {
        setUnreadCount(prev => prev + 1)
        showAdminNotification(data.message?.content || 'Nhân viên vừa gửi tin nhắn')
      }
    }
    const handleTyping = (data) => {
      if (data.conversation_id === conversation?.id && data.sender_type !== 'customer') {
        setTyping(data.is_typing ? (data.user_name || 'CSKH') : null)
        if (data.is_typing) setTimeout(() => setTyping(null), 3000)
      }
    }
    const handleMessagesRead = (data) => {
      if (data.conversation_id === conversation?.id) {
        setMessages(prev => prev.map(m => m.type === 'user' ? { ...m, is_read: true } : m))
      }
    }
    const handleConversationClosed = (data) => {
      if (data.conversation_id === conversation?.id) {
        setClosedConv(true)
        setConversation(prev => prev ? { ...prev, status: 'closed' } : null)
        setMessages(prev => [...prev, makeSystemMsg(data.message || 'Cuoc tro chuyen da ket thuc. Cam on ban da lien he!')])
      }
    }
    const handleConversationCreated = (data) => {
      if (data.conversation) setConversation(data.conversation)
    }
    socket.on('new_message', handleNewMessage)
    socket.on('new_admin_message', handleNewAdminMessage)
    socket.on('user_typing', handleTyping)
    socket.on('messages_read', handleMessagesRead)
    socket.on('conversation_closed', handleConversationClosed)
    socket.on('conversation_created', handleConversationCreated)
    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('new_admin_message', handleNewAdminMessage)
      socket.off('user_typing', handleTyping)
      socket.off('messages_read', handleMessagesRead)
      socket.off('conversation_closed', handleConversationClosed)
      socket.off('conversation_created', handleConversationCreated)
    }
  }, [socket, conversation, isOpen, cskhMode, markAsRead, guestSessionId])

  useEffect(() => {
    if (conversation?.id && isSocketReady) {
      joinConversation(conversation.id, guestSessionId)
      return () => leaveConversation(conversation.id)
    }
  }, [conversation?.id, isSocketReady, joinConversation, leaveConversation, guestSessionId])

  const loadConversation = async () => {
    setCskhLoading(true)
    try {
      const url = isAuthenticated ? '/api/chat/my-conversation' : `/api/chat/my-conversation?session_id=${guestSessionId}`
      const res = await api.get(url)
      setConversation(res.data)
      // Them lich su CSKH vao unified messages
      const history = (res.data.messages || []).map(makeCskhMsg)
      if (history.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMsgs = history.filter(m => !existingIds.has(m.id))
          return [...prev, ...newMsgs]
        })
      }
      setUnreadCount(0)
      if (res.data.status === 'closed') setClosedConv(true)
    } catch (err) {
      console.error('Error loading conversation:', err)
    } finally {
      setCskhLoading(false)
    }
  }

  const startNewConversation = async () => {
    // Reset hoàn toàn về AI mode, xóa session CSKH cũ
    try {
      const data = isAuthenticated ? {} : { session_id: guestSessionId }
      await api.post('/api/chat/start-new', data)
    } catch (err) {
      console.error('Error clearing old conversation:', err)
    }
    // Reset tất cả state CSKH
    setCskhMode(false)
    setConversation(null)
    setClosedConv(false)
    setUnreadCount(0)
    // Reset sessionStorage
    sessionStorage.removeItem('cskh_conversation')
    sessionStorage.setItem('cskh_mode', 'false')
    sessionStorage.setItem('cskh_closed', 'false')
    // Reset messages về AI ban đầu
    setMessages([INITIAL_AI_MSG])
    sessionStorage.removeItem(UNIFIED_STORAGE_KEY)
  }

  // Khách hàng tự kết thúc cuộc trò chuyện
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const customerCloseConversation = async () => {
    if (!conversation?.id) return
    try {
      const params = isAuthenticated ? '' : `?session_id=${guestSessionId}`
      const body = isAuthenticated ? {} : { session_id: guestSessionId }
      await api.post(`/api/chat/${conversation.id}/customer-close`, body)
      setClosedConv(true)
      setConversation(prev => prev ? { ...prev, status: 'closed' } : null)
      sessionStorage.setItem('cskh_closed', 'true')
      setMessages(prev => [...prev, makeSystemMsg('Bạn đã kết thúc cuộc trò chuyện. Cảm ơn bạn đã liên hệ!')])
    } catch (err) {
      console.error('Error closing conversation:', err)
    }
    setShowCloseConfirm(false)
  }

  // Chuyen sang che do CSKH
  const switchToCskh = () => {
    if (!cskhMode) {
      setCskhMode(true)
      setMessages(prev => [...prev, makeSystemMsg('— Đã chuyển sang hỗ trợ nhân viên CSKH —')])
      if (conversation) {
        markAsRead(conversation.id, guestSessionId)
        setUnreadCount(0)
      }
      // Lấy câu hỏi cuối cùng của user để đính kèm context
      const lastUserMsg = [...messages].reverse().find(m => m.type === 'user')
      const contextNote = lastUserMsg
        ? `👋 Khách hàng cần hỗ trợ từ nhân viên CSKH.\n📝 Vấn đề: "${lastUserMsg.content}"`
        : '👋 Khách hàng cần hỗ trợ từ nhân viên CSKH.'
      // Gửi qua socket → tạo conversation + notify admin ngay lập tức
      sendSocketMessage(
        conversation?.id || null,
        contextNote,
        'text',
        null,
        guestSessionId
      )
    }
  }

  // Gui tin nhan AI
  const sendAiMessage = async (e) => {
    e.preventDefault()
    if (!aiInput.trim() || aiLoading) return
    const text = aiInput.trim()
    setAiInput('')

    const userMsg = makeUserMsg(text)
    setMessages(prev => [...prev, userMsg])

    // Detect CSKH keywords
    if (needsCskh(text)) {
      setMessages(prev => [...prev, makeAiMsg(
        'Vấn đề này cần được hỗ trợ trực tiếp bởi nhân viên. Bạn có muốn chuyển sang CSKH không?',
        [], true
      )])
      return
    }

    setAiLoading(true)
    try {
      const history = messages
        .filter(m => m.type === 'user' || m.type === 'ai')
        .slice(-6)
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))
      const res = await api.post('/api/chatbot/ask', { query: text, history })
      setMessages(prev => [...prev, makeAiMsg(res.data.response, res.data.products, res.data.suggest_cskh)])
    } catch {
      setMessages(prev => [...prev, makeAiMsg('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.')])
    } finally {
      setAiLoading(false)
    }
  }

  // Gui tin nhan CSKH
  const sendCskhMessage = (e) => {
    e.preventDefault()
    if (!cskhInput.trim()) return
    sendSocketMessage(conversation?.id || null, cskhInput.trim(), 'text', null, guestSessionId)
    setCskhInput('')
    if (conversation?.id) sendTyping(conversation.id, false, guestSessionId)
  }

  const handleCskhInputChange = (e) => {
    setCskhInput(e.target.value)
    if (conversation?.id) {
      sendTyping(conversation.id, true, guestSessionId)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => sendTyping(conversation.id, false, guestSessionId), 2000)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Vui lòng chọn file ảnh')
    if (file.size > 5 * 1024 * 1024) return alert('Ảnh không được vượt quá 5MB')
    setUploadingImage(true)
    const reader = new FileReader()
    reader.onload = () => { sendSocketMessage(conversation?.id || null, '', 'image', reader.result, guestSessionId); setUploadingImage(false) }
    reader.onerror = () => { alert('Lỗi khi đọc file ảnh'); setUploadingImage(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false)
    } else {
      if (!isAuthenticated) {
        setShowLoginPrompt(true)
        return
      }
      setIsOpen(true)
      if (cskhMode && conversation) { markAsRead(conversation.id, guestSessionId); setUnreadCount(0) }
    }
  }

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ'
  const formatTime = (ts) => {
    if (!ts) return ''
    // Đảm bảo parse đúng UTC: thêm 'Z' nếu string chưa có timezone
    let dateStr = ts
    if (typeof ts === 'string' && !ts.endsWith('Z') && !ts.includes('+') && !ts.includes('-', 10)) {
      dateStr = ts + 'Z'
    }
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
  }

  const handleAddToCart = async (e, product) => {
    e.stopPropagation()
    if (!isAuthenticated) { toast.info('Vui lòng đăng nhập để mua hàng'); navigate('/login'); return }
    if (product.size?.trim()) { toast.info('Vui lòng chọn size'); navigate(`/products/${product.id}`); return }
    try { await api.post('/api/cart/add', { product_id: product.id, quantity: 1 }); fetchCartCount(); toast.success('Đã thêm vào giỏ hàng!') }
    catch { toast.error('Có lỗi xảy ra') }
  }

  const handleBuyNow = (e, product) => {
    e.stopPropagation()
    if (!isAuthenticated) { toast.info('Vui lòng đăng nhập'); navigate('/login'); return }
    if (product.size?.trim()) { toast.info('Vui lòng chọn size'); navigate(`/products/${product.id}`); return }
    navigate('/checkout', { state: { buyNowItem: { product_id: product.id, product: { ...product, products_id: product.id }, quantity: 1, selected_size: null } } })
  }


  // ============================================================
  // RENDER
  // ============================================================
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
      {!isOpen && (
        <>
          <span className="absolute inset-0 w-14 h-14 rounded-full bg-blue-400 animate-ping opacity-75"></span>
          <span className="absolute inset-0 w-14 h-14 rounded-full bg-blue-500 animate-pulse opacity-50"></span>
        </>
      )}

      {/* Toast thông báo tin nhắn từ admin */}
      {toastMsg && !isOpen && (
        <div
          className="absolute bottom-20 right-0 bg-white rounded-xl shadow-xl border border-orange-200 px-4 py-3 w-72 cursor-pointer animate-fade-in"
          onClick={() => { setToastMsg(null); setIsOpen(true) }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              <img src={cskhImg} alt="CSKH" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-semibold text-gray-800">CSKH</p>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{toastMsg}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setToastMsg(null) }}
              className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Progress bar tự tắt */}
          <div className="mt-2 h-0.5 bg-orange-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-400 rounded-full animate-[shrink_4s_linear_forwards]"></div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggleChat}
        className={`group relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${isOpen ? 'bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'}`}
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

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col" style={{ height: '520px' }}>

          {/* HEADER */}
          <div className={`px-4 py-3 flex items-center justify-between flex-shrink-0 ${cskhMode ? 'bg-orange-500' : 'bg-blue-500'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white flex-shrink-0">
                <img src={cskhMode ? cskhImg : robotAssistantImg} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">
                  {cskhMode ? 'Hỗ trợ khách hàng' : 'Trợ lý AI'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300 animate-pulse' : 'bg-gray-300'}`}></span>
                  <span className={`text-xs ${cskhMode ? 'text-orange-100' : 'text-blue-100'}`}>
                    {cskhMode
                      ? (isConnected ? 'Đang hoạt động' : 'Đang kết nối...')
                      : 'Hỗ trợ 24/7'}
                  </span>
                </div>
              </div>
            </div>
            {/* Nút chat mới (AI) hoặc kết thúc (CSKH) */}
            {!cskhMode ? (
              <button
                onClick={() => { setMessages([INITIAL_AI_MSG]); sessionStorage.removeItem(UNIFIED_STORAGE_KEY) }}
                className="flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white text-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Mới
              </button>
            ) : !closedConv && conversation?.id ? (
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="relative flex items-center gap-1 px-3 py-1.5 bg-white text-orange-500 hover:bg-red-500 hover:text-white rounded-full text-[13px] font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 group"
                title="Kết thúc trò chuyện"
              >
                <span className="absolute inset-0 rounded-full bg-white/60 animate-ping"></span>
                <svg className="w-3.5 h-3.5 relative z-10 transition-transform duration-200 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="relative z-10">Kết thúc</span>
              </button>
            ) : null}
          </div>

          {/* MESSAGES - unified stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {cskhLoading && (
              <div className="flex justify-center py-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              // System message (phan cach)
              if (msg.type === 'system') {
                return (
                  <div key={msg.id || idx} className="flex justify-center my-2">
                    <span className="bg-gray-200 text-gray-500 text-[11px] px-3 py-1 rounded-full">{msg.content}</span>
                  </div>
                )
              }

              // User message
              if (msg.type === 'user') {
                return (
                  <div key={msg.id || idx} className="flex justify-end">
                    <div className="max-w-[75%]">
                      <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2.5">
                        {msg.message_type === 'image' && msg.image_url ? (
                          <img src={msg.image_url} alt="Anh" className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 text-right mt-0.5">
                        {msg.ts ? formatTime(msg.ts) : (msg.created_at ? formatTime(msg.created_at) : '')}
                        {msg.is_read !== undefined && <span className="ml-1">{msg.is_read ? '' : ''}</span>}
                      </p>
                    </div>
                  </div>
                )
              }

              // AI message
              if (msg.type === 'ai') {
                return (
                  <div key={msg.id || idx} className="flex justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-0.5">
                      <img src={robotAssistantImg} alt="AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="max-w-[80%]">
                  <p className="text-[10px] text-gray-400 mb-0.5 ml-1">Trợ lý AI</p>
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm border border-gray-100">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {/* Nut chuyen CSKH */}
                      {msg.suggestCskh && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <button
                            onClick={switchToCskh}
                            disabled={cskhMode}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors shadow-sm ${
                              cskhMode
                                ? 'bg-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                          >
                            <img src={cskhImg} alt="CSKH" className={`w-4 h-4 rounded-full object-cover ${cskhMode ? 'opacity-50' : ''}`} />
                            {cskhMode ? 'Đã chuyển sang CSKH ✓' : 'Chuyển sang CSKH'}
                          </button>
                        </div>
                      )}
                      {/* Product cards */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {msg.products.map((product, pIdx) => (
                            <div key={pIdx} onClick={() => navigate(`/products/${product.id}`)}
                              className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all group cursor-pointer relative">
                              {product.is_promotional && product.discount_text && (
                                <div className="absolute top-1 left-1 z-10 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{product.discount_text}</div>
                              )}
                              <div className="aspect-square overflow-hidden bg-gray-100">
                                <img src={getImageUrl(product.hinh_anh) || 'https://via.placeholder.com/150'} alt={product.ten_san_pham} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              </div>
                              <div className="p-2">
                                <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{product.ten_san_pham}</p>
                                {product.is_promotional && product.gia_khuyen_mai ? (
                                  <div className="mt-1">
                                    <p className="text-[10px] text-gray-400 line-through">{formatPrice(product.gia_ban)}</p>
                                    <p className="text-sm text-red-500 font-bold">{formatPrice(product.gia_khuyen_mai)}</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-blue-600 font-bold mt-1">{formatPrice(product.gia_ban)}</p>
                                )}
                              </div>
                              <div className="flex gap-1 p-2 pt-0">
                                <button onClick={(e) => handleAddToCart(e, product)} className="flex-1 bg-blue-100 text-blue-700 text-[10px] py-1.5 rounded font-bold hover:bg-blue-200 transition-colors">Thêm</button>
                                <button onClick={(e) => handleBuyNow(e, product)} className="flex-1 bg-blue-600 text-white text-[10px] py-1.5 rounded font-bold hover:bg-blue-700 transition-colors">Mua</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5 ml-1">{msg.ts ? formatTime(msg.ts) : ''}</p>
                    </div>
                  </div>
                )
              }

              // CSKH message (tu nhan vien)
              if (msg.type === 'cskh') {
                return (
                  <div key={msg.id || idx} className="flex justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-0.5">
                      <img src={cskhImg} alt="CSKH" className="w-full h-full object-cover" />
                    </div>
                    <div className="max-w-[75%]">
                      <div className="flex items-center gap-1 mb-0.5 ml-1">
                        <p className="text-[10px] text-gray-400">CSKH</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      </div>
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm border border-gray-100">
                        {msg.message_type === 'image' && msg.image_url ? (
                          <img src={msg.image_url} alt="Anh" className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 ml-1">{msg.created_at ? formatTime(msg.created_at) : ''}</p>
                    </div>
                  </div>
                )
              }

              return null
            })}

            {/* AI typing */}
            {aiLoading && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img src={robotAssistantImg} alt="AI" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5 ml-1">Trợ lý AI</p>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CSKH typing */}
            {typing && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img src={cskhImg} alt="CSKH" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5 ml-1">
                    <p className="text-[10px] text-gray-400">CSKH</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  </div>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation closed */}
            {closedConv && (
              <div className="flex justify-center my-2">
                <div className="bg-gray-100 rounded-xl px-4 py-3 text-center max-w-[90%]">
                  <p className="text-xs text-gray-500">Cuộc trò chuyện đã kết thúc</p>
                  <button onClick={startNewConversation} className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium underline">
                    Bắt đầu cuộc trò chuyện mới
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          {cskhMode ? (
            // CSKH input
            closedConv ? (
              <div className="p-3 bg-gray-100 border-t border-gray-200 text-center flex-shrink-0">
                <p className="text-xs text-gray-500">Cuộc trò chuyện đã kết thúc</p>
              </div>
            ) : (
              <form onSubmit={sendCskhMessage} className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50">
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                <input type="text" value={cskhInput ?? ''} onChange={handleCskhInputChange} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400" />
                  <button type="submit" disabled={!cskhInput.trim()} className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-orange-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            )
          ) : (
            // AI input
            <form onSubmit={sendAiMessage} className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                <input type="text" value={aiInput ?? ''} onChange={(e) => setAiInput(e.target.value)} placeholder="Hỏi về sản phẩm, cửa hàng..." className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400" disabled={aiLoading} />
                <button type="submit" disabled={!aiInput.trim() || aiLoading} className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-600 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* Modal xác nhận đăng nhập */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-end z-[60] pb-24 pr-6">
          <div className="bg-white rounded-2xl shadow-2xl w-[340px] overflow-hidden animate-fade-in">
            <div className="bg-blue-500 px-4 py-3">
              <p className="font-semibold text-white text-sm">Yêu cầu đăng nhập</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">Bạn cần đăng nhập để sử dụng tính năng chat hỗ trợ.</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowLoginPrompt(false); navigate('/login') }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận kết thúc trò chuyện */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-end z-[60] pb-24 pr-6">
          <div className="bg-white rounded-2xl shadow-2xl w-[340px] overflow-hidden animate-fade-in">
            <div className="bg-orange-500 px-4 py-3">
              <p className="font-semibold text-white text-sm">Kết thúc trò chuyện?</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">Bạn có chắc muốn kết thúc cuộc trò chuyện này không?</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={customerCloseConversation}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Kết thúc
                </button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
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
