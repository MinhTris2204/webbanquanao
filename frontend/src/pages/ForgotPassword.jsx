import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailValidation, setEmailValidation] = useState({ checking: false, valid: null, message: '' })
  const [emailCheckTimeout, setEmailCheckTimeout] = useState(null)

  const startCountdown = () => {
    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const startOtpExpiry = () => {
    setOtpExpiry(600)
    const interval = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Kiểm tra email realtime
  const validateEmailRealtime = async (email) => {
    if (!email || email.length < 5) {
      setEmailValidation({ checking: false, valid: null, message: '' })
      return
    }

    setEmailValidation({ checking: true, valid: null, message: 'Đang kiểm tra...' })

    try {
      const res = await api.post('/api/auth/validate-email', { email, check_smtp: false })
      if (res.data.valid) {
        // Email hợp lệ nhưng chưa đăng ký - không cho phép reset password
        setEmailValidation({ checking: false, valid: false, message: 'Email chưa được đăng ký' })
      } else {
        // Email đã đăng ký hoặc có lỗi khác
        if (res.data.error === 'Email đã được đăng ký') {
          // Email đã đăng ký - cho phép reset password
          setEmailValidation({ checking: false, valid: true, message: '✓ Email hợp lệ' })
        } else {
          // Email không hợp lệ (không tồn tại, tạm thời, v.v.)
          setEmailValidation({ checking: false, valid: false, message: res.data.error })
        }
      }
    } catch (err) {
      setEmailValidation({ checking: false, valid: false, message: 'Không thể kiểm tra email' })
    }
  }

  // Debounce email validation
  const handleEmailChange = (email) => {
    setEmail(email)
    
    // Clear previous timeout
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      validateEmailRealtime(email)
    }, 800) // Wait 800ms after user stops typing

    setEmailCheckTimeout(timeout)
  }

  const handleSubmitEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/forgot-password', { email })
      setStep(2)
      startCountdown()
      startOtpExpiry()
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (otp.length !== 6) {
      setError('Mã OTP phải có 6 số')
      setLoading(false)
      return
    }
    try {
      const res = await api.post('/api/auth/verify-reset-otp', { email, otp })
      setResetToken(res.data.reset_token)
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Mã OTP không đúng')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token: resetToken, new_password: newPassword })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      startCountdown()
      startOtpExpiry()
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể gửi lại mã OTP')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Đặt lại mật khẩu thành công!</h2>
          <p className="text-gray-600 mb-6">Bạn có thể đăng nhập với mật khẩu mới.</p>
          <Link to="/login" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">Đăng nhập ngay</Link>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Đặt mật khẩu mới</h2>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>}
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Mật khẩu mới</label>
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  placeholder="Nhập mật khẩu mới" 
                  required 
                  minLength={6} 
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showNewPassword ? (
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
              <label className="block text-gray-700 font-medium mb-2">Xác nhận mật khẩu</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  placeholder="Nhập lại mật khẩu" 
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
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Nhập mã OTP</h2>
            <p className="text-gray-600 mt-2">Mã OTP đã gửi đến <span className="font-semibold text-blue-600">{email}</span></p>
            {otpExpiry > 0 && (
              <div className={`mt-3 px-4 py-2 rounded-lg ${otpExpiry <= 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                <span className="font-semibold"> Mã OTP hết hạn sau: </span>
                <span className="font-mono text-lg">{formatTime(otpExpiry)}</span>
              </div>
            )}
            {otpExpiry === 0 && (
              <div className="mt-3 px-4 py-2 rounded-lg bg-red-100 text-red-700">
                <span className="font-semibold"> Mã OTP đã hết hạn!</span>
                <p className="text-sm">Vui lòng nhấn "Gửi lại mã OTP" để nhận mã mới.</p>
              </div>
            )}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>}
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono" placeholder="000000" required />
            </div>
            <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">
              {loading ? 'Đang xác thực...' : 'Xác nhận OTP'}
            </button>
            <div className="text-center">
              <button type="button" onClick={handleResendOTP} disabled={countdown > 0 || loading} className="text-blue-600 hover:text-blue-700 font-semibold disabled:text-gray-400">
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
              </button>
            </div>
            <button type="button" onClick={() => setStep(1)} className="w-full text-gray-600 hover:text-gray-800 py-2">Quay lại</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Quên mật khẩu?</h2>
          <p className="text-gray-600 mt-2">Nhập email để nhận mã OTP</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>}
        <form onSubmit={handleSubmitEmail} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <div className="relative">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => handleEmailChange(e.target.value)} 
                className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                  emailValidation.valid === true 
                    ? 'border-green-500 focus:ring-green-500' 
                    : emailValidation.valid === false 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                } focus:border-transparent`}
                placeholder="Nhập email của bạn" 
                required 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {emailValidation.checking && (
                  <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {!emailValidation.checking && emailValidation.valid === true && (
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {!emailValidation.checking && emailValidation.valid === false && (
                  <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
            {emailValidation.message && (
              <p className={`text-sm mt-1 ${
                emailValidation.valid === true ? 'text-green-600' : 
                emailValidation.valid === false ? 'text-red-600' : 
                'text-gray-500'
              }`}>
                {emailValidation.message}
              </p>
            )}
          </div>
          <button 
            type="submit" 
            disabled={loading || emailValidation.valid !== true} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Đang gửi...' : emailValidation.valid !== true ? '⚠️ Vui lòng nhập email đã đăng ký' : 'Gửi mã OTP'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}