import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, isAuthenticated } = useAuth()
  
  const isAdminApp = window.location.pathname.includes('admin.html')
  const tokenKey = isAdminApp ? 'admin_token' : 'customer_token'

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const token = localStorage.getItem(tokenKey)
    if (!token) return

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      // Authenticate after connection
      newSocket.emit('authenticate', { token })
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data)
    })

    newSocket.on('auth_error', (error) => {
      console.error('Socket auth error:', error)
    })

    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [isAuthenticated, tokenKey])

  const joinConversation = useCallback((conversationId) => {
    if (socket && isConnected) {
      const token = localStorage.getItem(tokenKey)
      socket.emit('join_conversation', { conversation_id: conversationId, token })
    }
  }, [socket, isConnected, tokenKey])

  const leaveConversation = useCallback((conversationId) => {
    if (socket && isConnected) {
      socket.emit('leave_conversation', { conversation_id: conversationId })
    }
  }, [socket, isConnected])

  const sendMessage = useCallback((conversationId, content, messageType = 'text', imageUrl = null) => {
    if (socket && isConnected) {
      const token = localStorage.getItem(tokenKey)
      socket.emit('send_message', {
        conversation_id: conversationId,
        content,
        message_type: messageType,
        image_url: imageUrl,
        token
      })
    }
  }, [socket, isConnected, tokenKey])

  const sendTyping = useCallback((conversationId, isTyping) => {
    if (socket && isConnected) {
      const token = localStorage.getItem(tokenKey)
      socket.emit('typing', {
        conversation_id: conversationId,
        is_typing: isTyping,
        token
      })
    }
  }, [socket, isConnected, tokenKey])

  const markAsRead = useCallback((conversationId) => {
    if (socket && isConnected) {
      const token = localStorage.getItem(tokenKey)
      socket.emit('mark_read', {
        conversation_id: conversationId,
        token
      })
    }
  }, [socket, isConnected, tokenKey])

  const value = {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markAsRead
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
