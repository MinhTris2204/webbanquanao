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

  const startCountdown = () => {
    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleSubmitEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/forgot-password', { email })
      setStep(2)
      startCountdown()
    } catch (err) {
      setError(err.response?.data?.error || 'Co loi xay ra')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (otp.length !== 6) { setError('Ma OTP phai co 6 so'); setLoading(false); return }
    try {
      const res = await api.post('/api/auth/verify-reset-otp', { email, otp })
      setResetToken(res.data.reset_token)
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Ma OTP khong dung')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError('Mat khau xac nhan khong khop'); return }
    if (newPassword.length < 6) { setError('Mat khau phai co it nhat 6 ky tu'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token: resetToken, new_password: newPassword })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Co loi xay ra')
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
    } catch (err) {
      setError(err.response?.data?.error || 'Khong the gui lai ma OTP')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Dat lai mat khau thanh cong!</h2>
          <p className="text-gray-600 mb-6">Ban co the dang nhap voi mat khau moi.</p>
          <Link to="/login" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">Dang nhap ngay</Link>
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
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Dat mat khau moi</h2>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>}
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div><label className="block text-gray-700 font-medium mb-2">Mat khau moi</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Nhap mat khau moi" required minLength={6} /></div>
            <div><label className="block text-gray-700 font-medium mb-2">Xac nhan mat khau</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Nhap lai mat khau" required /></div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">{loading ? 'Dang xu ly...' : 'Dat lai mat khau'}</button>
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
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Nhap ma OTP</h2>
            <p className="text-gray-600 mt-2">Ma OTP da gui den <span className="font-semibold text-blue-600">{email}</span></p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>}
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div><input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-4 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono" placeholder="000000" required /></div>
            <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">{loading ? 'Dang xac thuc...' : 'Xac nhan OTP'}</button>
            <div className="text-center"><button type="button" onClick={handleResendOTP} disabled={countdown > 0 || loading} className="text-blue-600 font-semibold disabled:text-gray-400">{countdown > 0 ? 'Gui lai sau ' + countdown + 's' : 'Gui lai ma OTP'}</button></div>
            <button type="button" onClick={() => setStep(1)} className="w-full text-gray-600 py-2">Quay lai</button>
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
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Quên mật khẩu?</h2>
          <p className="text-gray-600 mt-2">Nhập email để nhận mã OTP</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>}
        <form onSubmit={handleSubmitEmail} className="space-y-6">
          <div><label className="block text-gray-700 font-medium mb-2">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Nhập email của bạn" required /></div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">{loading ? 'Đang gửi...' : 'Gửi mã OTP'}</button>
        </form>
        <div className="mt-6 text-center"><Link to="/login" className="text-blue-600 font-medium">Quay lại đăng nhập</Link></div>
      </div>
    </div>
  )
}
