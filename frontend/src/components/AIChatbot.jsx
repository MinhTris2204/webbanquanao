import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'

const INITIAL_MESSAGE = { role: 'assistant', content: 'Xin chào! 👋 Tôi là trợ lý AI của Shop Quần Áo. Tôi có thể giúp bạn tìm sản phẩm, trả lời câu hỏi về cửa hàng. Bạn cần hỗ trợ gì?' }
const STORAGE_KEY = 'ai_chatbot_messages'
const OPEN_STATE_KEY = 'ai_chatbot_open'

export default function AIChatbot() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(() => {
    const saved = sessionStorage.getItem(OPEN_STATE_KEY)
    return saved === 'true'
  })
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return [INITIAL_MESSAGE]
      }
    }
    return [INITIAL_MESSAGE]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Persist messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  // Persist open state
  useEffect(() => {
    sessionStorage.setItem(OPEN_STATE_KEY, isOpen.toString())
  }, [isOpen])

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    
    // Prepare history for API (exclude initial message, last 6 messages)
    const historyForApi = messages
      .slice(1) // Skip initial greeting
      .slice(-6) // Last 6 messages
      .map(m => ({ role: m.role, content: m.content }))
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await api.post('/api/chatbot/ask', { 
        query: userMessage,
        history: historyForApi
      })
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.data.response,
        products: res.data.products
      }])
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ'

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'bg-gray-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
        }`}
      >
        {!isOpen && (
          <span className="absolute inset-0 w-14 h-14 rounded-full bg-emerald-400 animate-ping opacity-50"></span>
        )}
        {isOpen ? (
          <svg className="w-6 h-6 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Tooltip */}
      {!isOpen && (
        <div className="absolute bottom-16 left-0 mb-2 animate-bounce">
          <div className="bg-white text-gray-800 text-sm px-3 py-2 rounded-lg shadow-lg border whitespace-nowrap">
            🤖 Hỏi AI
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 left-0 w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
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
              {/* New Chat Button */}
              <button
                onClick={() => setMessages([INITIAL_MESSAGE])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white text-xs font-medium"
                title="Đoạn chat mới"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Chat mới
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="max-w-[80%]">
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {/* Product Grid Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {msg.products.map((product, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="block bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all group text-left"
                        >
                          <div className="aspect-square overflow-hidden bg-gray-100">
                            <img 
                              src={getImageUrl(product.hinh_anh) || 'https://via.placeholder.com/150'} 
                              alt={product.ten_san_pham}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div className="p-2">
                            <p className="text-[10px] text-gray-400">ID: #{product.id}</p>
                            <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{product.ten_san_pham}</p>
                            <p className="text-sm text-emerald-600 font-bold mt-1">{formatPrice(product.gia_ban)}</p>
                            {product.size && (
                              <p className="text-[10px] text-gray-500 mt-0.5">Size: {product.size}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về sản phẩm, cửa hàng..."
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
