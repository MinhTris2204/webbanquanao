import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState({ cart_items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    hoten: user?.hoten || '',
    sdt: user?.sdt || '',
    diachi_giaohang: user?.diachi || '',
    payment_method: 'COD',
    ghichu: ''
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else {
      fetchCart()
    }
  }, [isAuthenticated, navigate])

  const fetchCart = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/cart')
      if (res.data.cart_items.length === 0) {
        navigate('/cart')
      }
      setCart(res.data)
    } catch (err) {
      console.error(err)
      setError('Không thể tải giỏ hàng')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await api.post('/api/orders/create', formData)
      navigate('/orders?success=true')
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra khi đặt hàng')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">💳 Thanh toán</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">📋 Thông tin người nhận</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hoten}
                    onChange={(e) => setFormData({ ...formData, hoten: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.sdt}
                    onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="0123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={formData.diachi_giaohang}
                    onChange={(e) => setFormData({ ...formData, diachi_giaohang: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    rows="2"
                    value={formData.ghichu}
                    onChange={(e) => setFormData({ ...formData, ghichu: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Ghi chú cho người bán..."
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">💰 Phương thức thanh toán</h2>
              
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                  <input
                    type="radio"
                    name="payment_method"
                    value="COD"
                    checked={formData.payment_method === 'COD'}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-gray-800">💵 Thanh toán khi nhận hàng (COD)</p>
                    <p className="text-sm text-gray-500">Thanh toán bằng tiền mặt khi nhận hàng</p>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition opacity-50">
                  <input
                    type="radio"
                    name="payment_method"
                    value="BANK"
                    disabled
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-gray-800">🏦 Chuyển khoản ngân hàng</p>
                    <p className="text-sm text-gray-500">Đang phát triển</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">📦 Đơn hàng</h2>
              
              {/* Products */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cart.cart_items.map((item) => (
                  <div key={item.cart_item_id} className="flex gap-3">
                    <img
                      src={item.product.hinh_anh || 'https://via.placeholder.com/60'}
                      alt={item.product.ten_san_pham}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-800 line-clamp-2">
                        {item.product.ten_san_pham}
                      </p>
                      <p className="text-sm text-gray-500">SL: {item.quantity}</p>
                      <p className="text-sm font-bold text-blue-600">
                        {item.item_total.toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span className="font-semibold">{cart.total.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-green-600">Miễn phí</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">Tổng cộng</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {cart.total.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full mt-6 py-4 rounded-xl font-bold text-lg shadow-lg transition ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl'
                }`}
              >
                {submitting ? '⏳ Đang xử lý...' : '✅ Đặt hàng'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="w-full mt-3 text-blue-600 hover:text-blue-700 font-semibold"
              >
                ← Quay lại giỏ hàng
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
