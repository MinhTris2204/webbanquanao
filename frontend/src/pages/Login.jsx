import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Login() {
  const [formData, setFormData] = useState({ taikhoan: '', matkhau: '' })
  const [error, setError] = useState('')
  const [needVerification, setNeedVerification] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const startResendCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(formData.taikhoan, formData.matkhau)
      
      if (data.user.role === 'admin') {
        setError('Vui lòng sử dụng trang đăng nhập dành cho admin')
        setLoading(false)
        return
      }
      
      navigate('/')
    } catch (err) {
      const response = err.response?.data
      if (response?.need_verification) {
        setNeedVerification(true)
        setVerifyEmail(response.email)
        startResendCooldown()
      } else {
        setError(response?.error || 'Đăng nhập thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.length !== 6) {
      setError('Mã OTP phải có 6 số')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/auth/verify-email', { email: verifyEmail, otp })
      // Sau khi xác thực, thử đăng nhập lại
      const data = await login(formData.taikhoan, formData.matkhau)
      if (data.user.role === 'admin') {
        setError('Vui lòng sử dụng trang đăng nhập dành cho admin')
        return
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Xác thực thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/resend-otp', { email: verifyEmail, purpose: 'register' })
      startResendCooldown()
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể gửi lại mã OTP')
    } finally {
      setLoading(false)
    }
  }

  // Màn hình xác thực OTP
  if (needVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Xác nhận Email</h2>
            <p className="text-gray-600 text-sm mt-2">
              Email chưa được xác thực. Mã OTP đã gửi đến<br/>
              <span className="font-semibold text-blue-600">{verifyEmail}</span>
            </p>
          </div>
          
          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={6}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : '✓ Xác nhận'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
                className="text-blue-600 hover:text-blue-700 font-semibold disabled:text-gray-400"
              >
                {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setNeedVerification(false); setOtp(''); setError(''); }}
              className="w-full text-gray-600 hover:text-gray-800 py-2"
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        </div>
      </div>
    )
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
        
        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <span className="text-xl mr-2">❌</span>
            {error}
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                value={formData.matkhau}
                onChange={(e) => setFormData({ ...formData, matkhau: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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
