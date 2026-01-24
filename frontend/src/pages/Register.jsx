import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../utils/api'
import AddressSelector from '../components/AddressSelector'

export default function Register() {
  const [step, setStep] = useState(1) // 1: Form đăng ký, 2: Nhập OTP
  const [formData, setFormData] = useState({
    taikhoan: '',
    email: '',
    matkhau: '',
    confirm_matkhau: '',
    hoten: '',
    sdt: '',
    diachi: ''
  })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0) // Đếm ngược thời gian OTP hết hạn
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()

  // Đếm ngược để gửi lại OTP
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

  // Đếm ngược thời gian OTP hết hạn (10 phút)
  const startOtpExpiry = () => {
    setOtpExpiry(600) // 10 phút = 600 giây
    const interval = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Format thời gian mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.matkhau !== formData.confirm_matkhau) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    if (formData.matkhau.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)
    try {
      const { confirm_matkhau, ...registerData } = formData
      const res = await api.post('/api/auth/register', registerData)

      if (res.data.need_verification) {
        setStep(2)
        startResendCooldown()
        startOtpExpiry()
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại')
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
      await api.post('/api/auth/verify-email', {
        email: formData.email,
        otp: otp
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
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
      await api.post('/api/auth/resend-otp', {
        email: formData.email,
        purpose: 'register'
      })
      startResendCooldown()
      startOtpExpiry()
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể gửi lại mã OTP')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 py-8 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Xác nhận Email</h2>
            <p className="text-gray-600 text-sm mt-2">
              Mã OTP đã được gửi đến<br />
              <span className="font-semibold text-blue-600">{formData.email}</span>
            </p>
            {otpExpiry > 0 && (
              <div className={`mt-3 px-4 py-2 rounded-lg ${otpExpiry <= 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                <span className="font-semibold">⏱️ Mã OTP hết hạn sau: </span>
                <span className="font-mono text-lg">{formatTime(otpExpiry)}</span>
              </div>
            )}
            {otpExpiry === 0 && step === 2 && !success && (
              <div className="mt-3 px-4 py-2 rounded-lg bg-red-100 text-red-700">
                <span className="font-semibold">⚠️ Mã OTP đã hết hạn!</span>
                <p className="text-sm">Vui lòng nhấn "Gửi lại mã OTP" để nhận mã mới.</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
              <span className="text-xl mr-2">❌</span>
              {error}
            </div>
          )}

          {success ? (
            <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <span className="text-xl mr-2">✅</span>
                <span className="font-semibold">Xác thực thành công!</span>
              </div>
              <p className="text-sm">
                Đang chuyển đến trang đăng nhập...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-semibold text-center">
                  Nhập mã OTP (6 số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg hover:from-green-600 hover:to-emerald-700 font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang xác thực...
                  </span>
                ) : '✓ Xác nhận'}
              </button>

              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">Không nhận được mã?</p>
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
                onClick={() => setStep(1)}
                className="w-full text-gray-600 hover:text-gray-800 py-2"
              >
                ← Quay lại đăng ký
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Step 1: Registration Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 py-8 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Đăng ký tài khoản</h2>
          <p className="text-gray-600 text-sm mt-2">Tạo tài khoản mới để bắt đầu mua sắm</p>
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
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <p className="text-sm text-gray-500 mt-1">Bạn sẽ nhận mã OTP qua email này</p>
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Nguyễn Văn A"
              value={formData.hoten}
              onChange={(e) => setFormData({ ...formData, hoten: e.target.value })}
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
                minLength={6}
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
            <p className="text-sm text-gray-500 mt-1">Tối thiểu 6 ký tự</p>
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                value={formData.confirm_matkhau}
                onChange={(e) => setFormData({ ...formData, confirm_matkhau: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showConfirmPassword ? (
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

          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Số điện thoại
            </label>
            <input
              type="tel"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="0123456789"
              value={formData.sdt}
              onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Địa chỉ
            </label>
            <AddressSelector
              onChange={(data) => {
                if (data.fullAddress) {
                  setFormData(prev => ({ ...prev, diachi: data.fullAddress }))
                }
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-4 rounded-lg hover:from-blue-600 hover:to-cyan-700 font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang xử lý...
              </span>
            ) : '🚀 Đăng ký ngay'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Đăng nhập tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
