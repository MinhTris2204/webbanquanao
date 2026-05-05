import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()
const GUEST_SESSION_KEY = 'guest_chat_session_id'

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket phải được sử dụng trong SocketProvider')
  }
  return context
}

// ==================== LẤY HOẶC TẠO SESSION ID CHO KHÁCH ====================
function getGuestSessionId() {
  let sessionId = localStorage.getItem(GUEST_SESSION_KEY)
  if (!sessionId) {
    sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem(GUEST_SESSION_KEY, sessionId)
  }
  return sessionId
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSocketReady, setIsSocketReady] = useState(false) // true sau khi authenticated
  const { isAuthenticated } = useAuth()
  
  const isAdminApp = window.location.pathname.includes('admin.html')
  const tokenKey = isAdminApp ? 'admin_token' : 'customer_token'

  useEffect(() => {
    const token = localStorage.getItem(tokenKey)
    const guestSessionId = getGuestSessionId()
    
    // ==================== KẾT NỐI SOCKET CHO CẢ USER ĐÃ ĐĂNG NHẬP VÀ KHÁCH ====================
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    newSocket.on('connect', () => {
      console.log('Socket đã kết nối')
      setIsConnected(true)
      setIsSocketReady(false) // reset, chờ authenticated
      // Xác thực - ưu tiên token nếu đã đăng nhập, chỉ dùng session_id cho khách vãng lai
      if (token && isAuthenticated) {
        newSocket.emit('authenticate', { token })
      } else if (!token) {
        // Chỉ gửi session_id khi KHÔNG có token (khách vãng lai)
        newSocket.emit('authenticate', { session_id: guestSessionId })
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Socket đã ngắt kết nối')
      setIsConnected(false)
      setIsSocketReady(false)
    })

    newSocket.on('authenticated', (data) => {
      console.log('Socket đã xác thực:', data)
      setIsSocketReady(true) // sẵn sàng join room
    })

    newSocket.on('auth_error', (error) => {
      console.error('Lỗi xác thực socket:', error)
    })

    newSocket.on('error', (error) => {
      console.error('Lỗi socket:', error)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [isAuthenticated, tokenKey])

  const joinConversation = useCallback((conversationId, guestSessionId = null) => {
    if (socket && isSocketReady) {
      const token = localStorage.getItem(tokenKey)
      const payload = { 
        conversation_id: conversationId, 
        token: token || null
      }
      // Chỉ gửi session_id nếu KHÔNG có token (khách vãng lai)
      if (!token && guestSessionId) {
        payload.session_id = guestSessionId
      }
      socket.emit('join_conversation', payload)
    }
  }, [socket, isSocketReady, tokenKey])

  const leaveConversation = useCallback((conversationId) => {
    if (socket && isSocketReady) {
      socket.emit('leave_conversation', { conversation_id: conversationId })
    }
  }, [socket, isSocketReady])

  const sendMessage = useCallback((conversationId, content, messageType = 'text', imageUrl = null, guestSessionId = null) => {
    if (socket && isConnected) {
      const token = localStorage.getItem(tokenKey)
      const payload = {
        conversation_id: conversationId,
        content,
        message_type: messageType,
        image_url: imageUrl,
        token: token || null
      }
      // Chỉ gửi session_id nếu KHÔNG có token (khách vãng lai)
      if (!token && guestSessionId) {
        payload.session_id = guestSessionId
      }
      socket.emit('send_message', payload)
    }
  }, [socket, isConnected, tokenKey])

  const sendTyping = useCallback((conversationId, isTyping, guestSessionId = null) => {
    if (socket && isConnected) {
      const token = localStorage.getItem(tokenKey)
      const payload = {
        conversation_id: conversationId,
        is_typing: isTyping,
        token: token || null
      }
      // Chỉ gửi session_id nếu KHÔNG có token (khách vãng lai)
      if (!token && guestSessionId) {
        payload.session_id = guestSessionId
      }
      socket.emit('typing', payload)
    }
  }, [socket, isConnected, tokenKey])

  const markAsRead = useCallback((conversationId, guestSessionId = null) => {
    if (socket && isConnected) {
      const token = localStorage.getItem(tokenKey)
      const payload = {
        conversation_id: conversationId,
        token: token || null
      }
      // Chỉ gửi session_id nếu KHÔNG có token (khách vãng lai)
      if (!token && guestSessionId) {
        payload.session_id = guestSessionId
      }
      socket.emit('mark_read', payload)
    }
  }, [socket, isConnected, tokenKey])

  const value = {
    socket,
    isConnected,
    isSocketReady,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markAsRead
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
