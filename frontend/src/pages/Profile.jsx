import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Profile() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    hoten: '',
    sdt: '',
    diachi: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else if (user) {
      setFormData({
        hoten: user.hoten || '',
        sdt: user.sdt || '',
        diachi: user.diachi || ''
      })
    }
  }, [user, isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      await api.put('/api/auth/profile', formData)
      setMessage('Cập nhật thông tin thành công!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Thông tin cá nhân</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg">{user?.hoten}</h3>
            <p className="text-gray-600 text-sm">{user?.email}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm">Tài khoản: {user?.taikhoan}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm">Vai trò: Khách hàng</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">Cập nhật thông tin</h2>

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-semibold">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100"
                value={user?.email}
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">Email không thể thay đổi</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-semibold">Họ tên</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.hoten}
                onChange={(e) => setFormData({ ...formData, hoten: e.target.value })}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-semibold">Số điện thoại</label>
              <input
                type="tel"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.sdt}
                onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-semibold">Địa chỉ</label>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={formData.diachi}
                onChange={(e) => setFormData({ ...formData, diachi: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold transition"
            >
              Cập nhật thông tin
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
