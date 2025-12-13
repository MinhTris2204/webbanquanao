import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function Cart() {
  const [cart, setCart] = useState({ cart_items: [], total: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      const res = await api.get('/api/cart')
      setCart(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const updateQuantity = async (cartItemId, quantity) => {
    try {
      await api.put(`/api/cart/update/${cartItemId}`, { quantity })
      fetchCart()
    } catch (err) {
      console.error(err)
    }
  }

  const removeItem = async (cartItemId) => {
    try {
      await api.delete(`/api/cart/remove/${cartItemId}`)
      fetchCart()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Giỏ hàng</h1>

      {cart.cart_items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Giỏ hàng trống</p>
          <Link to="/products" className="text-blue-500 hover:underline">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow">
            {cart.cart_items.map((item) => (
              <div key={item.cart_item_id} className="flex items-center p-4 border-b">
                <img
                  src={item.product.hinh_anh || 'https://via.placeholder.com/100'}
                  alt={item.product.ten_san_pham}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1 ml-4">
                  <h3 className="font-bold">{item.product.ten_san_pham}</h3>
                  <p className="text-blue-600">
                    {item.product.gia_ban?.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    -
                  </button>
                  <span className="px-4">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    +
                  </button>
                </div>
                <div className="ml-4 w-32 text-right">
                  <p className="font-bold">{item.item_total.toLocaleString('vi-VN')} đ</p>
                </div>
                <button
                  onClick={() => removeItem(item.cart_item_id)}
                  className="ml-4 text-red-500 hover:text-red-700"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold">Tổng cộng:</span>
              <span className="text-2xl font-bold text-blue-600">
                {cart.total.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
            >
              Thanh toán
            </button>
          </div>
        </>
      )}
    </div>
  )
}
