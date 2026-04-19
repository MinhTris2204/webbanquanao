import { createContext, useState, useContext, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // ==================== XÁC ĐỊNH ĐANG TRONG APP ADMIN HAY KHÁCH HÀNG ====================
  const isAdminApp = window.location.pathname.includes('admin.html') || 
                     window.location.href.includes('admin.html') ||
                     document.querySelector('title')?.textContent?.includes('Admin Panel')
  const tokenKey = isAdminApp ? 'admin_token' : 'customer_token'

  useEffect(() => {
    const token = localStorage.getItem(tokenKey)
    if (token) {
      console.log('Kiểm tra xác thực với token:', token.substring(0, 20) + '...')
      api.get('/api/auth/me')
        .then(res => {
          console.log('Kiểm tra xác thực thành công:', res.data)
          // Xác thực vai trò người dùng phù hợp với loại app
          if (isAdminApp && res.data.role !== 'admin') {
            console.log('App admin nhưng người dùng không phải admin, xóa token')
            localStorage.removeItem(tokenKey)
            setUser(null)
          } else if (!isAdminApp && res.data.role === 'admin') {
            console.log('App khách hàng nhưng người dùng là admin, xóa token')
            localStorage.removeItem(tokenKey)
            setUser(null)
          } else {
            setUser(res.data)
          }
        })
        .catch((error) => {
          console.log('Kiểm tra xác thực thất bại:', error.response?.status, error.response?.data)
          // Chỉ xóa token nếu thực sự không hợp lệ (401 hoặc 422)
          if (error.response && (error.response.status === 401 || error.response.status === 422)) {
            console.log('Xóa token không hợp lệ')
            localStorage.removeItem(tokenKey)
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [tokenKey, isAdminApp])

  const login = async (taikhoan, matkhau) => {
    const res = await api.post('/api/auth/login', { taikhoan, matkhau })
    localStorage.setItem(tokenKey, res.data.access_token)
    setUser(res.data.user)
    return res.data
  }

  const register = async (userData) => {
    const res = await api.post('/api/auth/register', userData)
    return res.data
  }

  const logout = (redirectPath) => {
    localStorage.removeItem(tokenKey)
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
    isAdmin: user?.role === 'admin',
    updateUser: (userData) => setUser(userData)
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
