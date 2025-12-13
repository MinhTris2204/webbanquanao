import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState({ cart_items: [], total: 0 })
  const [formData, setFormData] = useState({
    hoten: user?.hoten || '',
    sdt: user?.sdt || '',
    diachi_giaohang: user?.diachi || '',
    payment_method: 'COD'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else {
      fetchCart()
    }
  }, [isAuthenticated, navigate])

  const fetchCart = async () => {
    try {
      const res = await api.get('/api/cart')
      setCart(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await api.post('/api/orders/create', formData)
      alert('Đặt hàng thành công!')
      navigate('/orders')
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  if (cart.cart_items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Giỏ hàng trống</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Thanh toán</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-4">Thông tin giao hàng</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Họ tên</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                value={formData.hoten}
                onChange={(e) => setFormData({ ...formData, hoten: e.target.value })}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Số điện thoại</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded"
                value={formData.sdt}
                onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Địa chỉ giao hàng</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows="3"
                value={formData.diachi_giaohang}
                onChange={(e) => setFormData({ ...formData, diachi_giaohang: e.target.value })}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Phương thức thanh toán</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                <option value="BANK">Chuyển khoản ngân hàng</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Đang xử lý...' : 'Đặt hàng'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Đơn hàng của bạn</h2>
          <div className="bg-white rounded-lg shadow p-4">
            {cart.cart_items.map((item) => (
              <div key={item.cart_item_id} className="flex justify-between mb-2">
                <span>{item.product.ten_san_pham} x {item.quantity}</span>
                <span>{item.item_total.toLocaleString('vi-VN')} đ</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng:</span>
                <span className="text-blue-600">{cart.total.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
