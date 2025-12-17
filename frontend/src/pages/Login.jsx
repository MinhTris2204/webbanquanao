import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Login() {
  const [formData, setFormData] = useState({ taikhoan: '', matkhau: '' })
  const [error, setError] = useState('')
  const [needVerification, setNeedVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNeedVerification(false)
    try {
      const data = await login(formData.taikhoan, formData.matkhau)
      
      // Check if user is customer
      if (data.user.role === 'admin') {
        setError('Vui lòng sử dụng trang đăng nhập dành cho admin')
        return
      }
      
      navigate('/')
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.need_verification) {
        setNeedVerification(true)
        setVerificationEmail(errorData.email)
      }
      setError(errorData?.error || 'Đăng nhập thất bại')
    }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    setResendSuccess(false)
    try {
      await api.post('/api/auth/resend-verification', { email: verificationEmail })
      setResendSuccess(true)
    } catch (err) {
      // Still show success to prevent email enumeration
      setResendSuccess(true)
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Đăng nhập</h2>
          <p className="text-gray-600 text-sm mt-2">Chào mừng bạn trở lại!</p>
        </div>
        
        {error && !needVerification && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <span className="text-xl mr-2">❌</span>
            {error}
          </div>
        )}

        {needVerification && (
          <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center mb-2">
              <span className="text-xl mr-2">⚠️</span>
              <span className="font-semibold">Email chưa được xác thực</span>
            </div>
            <p className="text-sm mb-3">
              Vui lòng kiểm tra email <strong>{verificationEmail}</strong> để xác thực tài khoản.
            </p>
            {resendSuccess ? (
              <p className="text-sm text-green-600">✅ Email xác thực đã được gửi lại!</p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-sm text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
              >
                {resendLoading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Tài khoản <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="username"
              value={formData.taikhoan}
              onChange={(e) => setFormData({ ...formData, taikhoan: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
              value={formData.matkhau}
              onChange={(e) => setFormData({ ...formData, matkhau: e.target.value })}
              required
            />
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-4 rounded-lg hover:from-blue-600 hover:to-cyan-700 font-bold text-lg shadow-lg hover:shadow-xl transition"
          >
            🔐 Đăng nhập
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
