import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Profile() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('info')
  
  // Info form
  const [infoForm, setInfoForm] = useState({
    hoten: '',
    email: '',
    sdt: '',
    diachi: ''
  })
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  
  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login')
      } else if (user) {
        setInfoForm({
          hoten: user.hoten || '',
          email: user.email || '',
          sdt: user.sdt || '',
          diachi: user.diachi || ''
        })
      }
    }
  }, [user, isAuthenticated, authLoading, navigate])

  const handleInfoSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      await api.put('/api/auth/profile', {
        hoten: infoForm.hoten,
        email: infoForm.email,
        sdt: infoForm.sdt,
        diachi: infoForm.diachi
      })
      setMessage('Cập nhật thông tin thành công!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    if (passwordForm.new_password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)
    try {
      await api.put('/api/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })
      setMessage('Đổi mật khẩu thành công!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'XOA TAI KHOAN') {
      setError('Vui lòng nhập chính xác "XOA TAI KHOAN" để xác nhận')
      return
    }

    setLoading(true)
    try {
      await api.delete('/api/auth/delete-account')
      logout()
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">👤 Tài khoản của tôi</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">
                  {user?.hoten?.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-800">{user?.hoten}</h3>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('info')}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'info'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 Thông tin cá nhân
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'password'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔒 Đổi mật khẩu
              </button>
              <button
                onClick={() => setActiveTab('delete')}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'delete'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🗑️ Xóa tài khoản
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {message && (
              <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                <span className="text-xl mr-2">✅</span>
                {message}
              </div>
            )}

            {error && (
              <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                <span className="text-xl mr-2">❌</span>
                {error}
              </div>
            )}

            {/* Info Tab */}
            {activeTab === 'info' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-gray-800">📋 Thông tin cá nhân</h2>
                <form onSubmit={handleInfoSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        value={infoForm.hoten}
                        onChange={(e) => setInfoForm({ ...infoForm, hoten: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        value={infoForm.email}
                        onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        value={infoForm.sdt}
                        onChange={(e) => setInfoForm({ ...infoForm, sdt: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Tài khoản
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                        value={user?.taikhoan}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-gray-700 mb-2 font-semibold">
                      Địa chỉ
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      rows="3"
                      value={infoForm.diachi}
                      onChange={(e) => setInfoForm({ ...infoForm, diachi: e.target.value })}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`mt-6 w-full py-4 rounded-lg font-bold text-lg shadow-lg transition ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl'
                    }`}
                  >
                    {loading ? '⏳ Đang cập nhật...' : '💾 Lưu thay đổi'}
                  </button>
                </form>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-gray-800">🔒 Đổi mật khẩu</h2>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Mật khẩu hiện tại <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Mật khẩu mới <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        required
                        minLength={6}
                      />
                      <p className="text-sm text-gray-500 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`mt-6 w-full py-4 rounded-lg font-bold text-lg shadow-lg transition ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl'
                    }`}
                  >
                    {loading ? '⏳ Đang xử lý...' : '🔐 Đổi mật khẩu'}
                  </button>
                </form>
              </div>
            )}

            {/* Delete Account Tab */}
            {activeTab === 'delete' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-red-600">🗑️ Xóa tài khoản</h2>
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-red-800 mb-3">⚠️ Cảnh báo quan trọng</h3>
                  <ul className="list-disc list-inside space-y-2 text-red-700">
                    <li>Hành động này không thể hoàn tác</li>
                    <li>Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn</li>
                    <li>Lịch sử đơn hàng sẽ bị xóa</li>
                    <li>Bạn sẽ không thể đăng nhập lại với tài khoản này</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-700 font-semibold">
                    Để xác nhận xóa tài khoản, vui lòng nhập chính xác: <span className="text-red-600 font-bold">XOA TAI KHOAN</span>
                  </p>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Nhập: XOA TAI KHOAN"
                  />

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={deleteConfirmText !== 'XOA TAI KHOAN' || loading}
                    className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg transition ${
                      deleteConfirmText !== 'XOA TAI KHOAN' || loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:shadow-xl'
                    }`}
                  >
                    {loading ? '⏳ Đang xử lý...' : '🗑️ Xóa tài khoản vĩnh viễn'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-red-600 mb-4">⚠️ Xác nhận cuối cùng</h3>
            <p className="text-gray-700 mb-6">
              Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition"
              >
                ❌ Hủy
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition disabled:bg-gray-400"
              >
                {loading ? '⏳ Đang xóa...' : '✅ Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
