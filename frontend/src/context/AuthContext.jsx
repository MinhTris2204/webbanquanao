import { createContext, useState, useContext, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      console.log('Checking auth with token:', token.substring(0, 20) + '...')
      api.get('/api/auth/me')
        .then(res => {
          console.log('Auth check successful:', res.data)
          setUser(res.data)
        })
        .catch((error) => {
          console.log('Auth check failed:', error.response?.status, error.response?.data)
          // Only clear token if it's actually invalid (401 or 422)
          if (error.response && (error.response.status === 401 || error.response.status === 422)) {
            console.log('Clearing invalid token')
            localStorage.removeItem('token')
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (taikhoan, matkhau) => {
    const res = await api.post('/api/auth/login', { taikhoan, matkhau })
    localStorage.setItem('token', res.data.access_token)
    setUser(res.data.user)
    return res.data
  }

  const register = async (userData) => {
    const res = await api.post('/api/auth/register', userData)
    return res.data
  }

  const logout = (redirectPath) => {
    localStorage.removeItem('token')
    setUser(null)
    if (redirectPath) {
      window.location.href = redirectPath
    }
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
