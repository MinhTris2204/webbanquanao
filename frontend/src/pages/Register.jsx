import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [formData, setFormData] = useState({
    taikhoan: '',
    email: '',
    matkhau: '',
    confirm_matkhau: '',
    hoten: '',
    sdt: '',
    diachi: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate password match
    if (formData.matkhau !== formData.confirm_matkhau) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    // Validate password length
    if (formData.matkhau.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    try {
      const { confirm_matkhau, ...registerData } = formData
      await register(registerData)
      setSuccess(true)
      // Don't auto-redirect, let user see the verification message
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại')
    }
  }

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

        {success && (
          <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center mb-2">
              <span className="text-xl mr-2">✅</span>
              <span className="font-semibold">Đăng ký thành công!</span>
            </div>
            <p className="text-sm">
              Vui lòng kiểm tra email <strong>{formData.email}</strong> để xác thực tài khoản.
            </p>
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
            <input
              type="password"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
              value={formData.matkhau}
              onChange={(e) => setFormData({ ...formData, matkhau: e.target.value })}
              required
              minLength={6}
            />
            <p className="text-sm text-gray-500 mt-1">Tối thiểu 6 ký tự</p>
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
              value={formData.confirm_matkhau}
              onChange={(e) => setFormData({ ...formData, confirm_matkhau: e.target.value })}
              required
            />
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
            <textarea
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              rows="2"
              value={formData.diachi}
              onChange={(e) => setFormData({ ...formData, diachi: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-4 rounded-lg hover:from-blue-600 hover:to-cyan-700 font-bold text-lg shadow-lg hover:shadow-xl transition"
          >
            🚀 Đăng ký ngay
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
