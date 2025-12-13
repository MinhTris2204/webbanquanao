import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Cart() {
  const { isAuthenticated } = useAuth()
  const [cart, setCart] = useState({ cart_items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/cart')
      setCart(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (cartItemId, quantity) => {
    if (quantity < 1) return
    try {
      await api.put(`/api/cart/update/${cartItemId}`, { quantity })
      fetchCart()
    } catch (err) {
      console.error(err)
    }
  }

  const removeItem = async (cartItemId) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      try {
        await api.delete(`/api/cart/remove/${cartItemId}`)
        fetchCart()
      } catch (err) {
        console.error(err)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải giỏ hàng...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">🛒 Giỏ hàng của bạn</h1>

      {cart.cart_items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-gray-500 text-xl font-medium mb-4">Giỏ hàng trống</p>
          <p className="text-gray-400 mb-6">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
          <Link 
            to="/products" 
            className="inline-block bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.cart_items.map((item) => (
              <div key={item.cart_item_id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Product Image */}
                  <Link to={`/products/${item.product.products_id}`} className="flex-shrink-0">
                    <img
                      src={item.product.hinh_anh || 'https://via.placeholder.com/150'}
                      alt={item.product.ten_san_pham}
                      className="w-full md:w-32 h-32 object-cover rounded-lg"
                    />
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1">
                    <Link 
                      to={`/products/${item.product.products_id}`}
                      className="text-xl font-bold text-gray-800 hover:text-blue-600 transition"
                    >
                      {item.product.ten_san_pham}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.product.loai && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                          {item.product.loai}
                        </span>
                      )}
                      {item.selected_size && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                          Size: {item.selected_size}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-3">
                      {item.product.gia_ban?.toLocaleString('vi-VN')}₫
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-2">
                      <button
                        onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                        className="w-8 h-8 bg-white rounded-lg font-bold text-gray-700 hover:bg-gray-200 transition"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                        className="w-8 h-8 bg-white rounded-lg font-bold text-gray-700 hover:bg-gray-200 transition"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">Tổng</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {item.item_total.toLocaleString('vi-VN')}₫
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(item.cart_item_id)}
                      className="text-red-500 hover:text-red-700 font-semibold text-sm mt-2"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Tóm tắt đơn hàng</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({cart.cart_items.length} sản phẩm)</span>
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

              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition font-bold text-lg shadow-lg hover:shadow-xl"
              >
                ⚡ Thanh toán ngay
              </button>

              <Link
                to="/products"
                className="block text-center mt-4 text-blue-600 hover:text-blue-700 font-semibold"
              >
                ← Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
