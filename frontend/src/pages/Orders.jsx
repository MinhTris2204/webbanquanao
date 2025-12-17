import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { getImageUrl } from '../utils/api'

export default function Orders() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showSuccess, setShowSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login')
      } else {
        fetchOrders()
      }
    }
  }, [isAuthenticated, authLoading, navigate])

  const [vnpayMessage, setVnpayMessage] = useState(null)

  useEffect(() => {
    // Check for success message
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      const timer = setTimeout(() => {
        setShowSuccess(false)
        searchParams.delete('success')
        setSearchParams(searchParams)
      }, 5000)
      return () => clearTimeout(timer)
    }

    // Check for VNPay return
    const vnpayStatus = searchParams.get('vnpay')
    if (vnpayStatus) {
      const orderId = searchParams.get('order_id')
      if (vnpayStatus === 'success') {
        setVnpayMessage({
          type: 'success',
          title: 'Thanh toán VNPay thành công!',
          message: `Đơn hàng #${orderId} đã được thanh toán thành công.`
        })
      } else if (vnpayStatus === 'failed') {
        const code = searchParams.get('code')
        setVnpayMessage({
          type: 'error',
          title: 'Thanh toán VNPay thất bại',
          message: `Đơn hàng #${orderId} chưa được thanh toán. Mã lỗi: ${code}`
        })
      }
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setVnpayMessage(null)
        searchParams.delete('vnpay')
        searchParams.delete('order_id')
        searchParams.delete('code')
        setSearchParams(searchParams)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, setSearchParams])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/orders')
      setOrders(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      'cho_xac_nhan': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Chờ thanh toán': 'bg-orange-100 text-orange-800 border-orange-300',
      'Đã thanh toán': 'bg-blue-100 text-blue-800 border-blue-300',
      'hoan_thanh': 'bg-green-100 text-green-800 border-green-300',
      'Hủy': 'bg-red-100 text-red-800 border-red-300',
      'huy': 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getStatusText = (status) => {
    const texts = {
      'cho_xac_nhan': '⏳ Chờ xác nhận',
      'Chờ thanh toán': '💳 Chờ thanh toán',
      'Đã thanh toán': '✅ Đã thanh toán',
      'hoan_thanh': '✅ Hoàn thành',
      'Hủy': '❌ Đã hủy',
      'huy': '❌ Đã hủy'
    }
    return texts[status] || status
  }

  const getPaymentMethodText = (method) => {
    const methods = {
      'COD': '💵 Thanh toán khi nhận hàng',
      'VNPAY': '💳 VNPay'
    }
    return methods[method] || method
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải đơn hàng...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-green-100 border-2 border-green-400 text-green-700 px-6 py-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold">Đặt hàng thành công!</p>
              <p className="text-sm">Đơn hàng của bạn đã được ghi nhận và đang chờ xác nhận.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-green-700 hover:text-green-900 font-bold text-xl"
          >
            ×
          </button>
        </div>
      )}

      {/* VNPay Message */}
      {vnpayMessage && (
        <div className={`mb-6 px-6 py-4 rounded-xl flex items-center justify-between animate-fadeIn ${
          vnpayMessage.type === 'success' 
            ? 'bg-green-100 border-2 border-green-400 text-green-700' 
            : 'bg-red-100 border-2 border-red-400 text-red-700'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{vnpayMessage.type === 'success' ? '💳✅' : '💳❌'}</span>
            <div>
              <p className="font-bold">{vnpayMessage.title}</p>
              <p className="text-sm">{vnpayMessage.message}</p>
            </div>
          </div>
          <button
            onClick={() => setVnpayMessage(null)}
            className={`font-bold text-xl ${
              vnpayMessage.type === 'success' ? 'text-green-700 hover:text-green-900' : 'text-red-700 hover:text-red-900'
            }`}
          >
            ×
          </button>
        </div>
      )}

      <h1 className="text-4xl font-bold mb-8 text-gray-800">📦 Đơn hàng của tôi</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500 text-xl font-medium mb-4">Chưa có đơn hàng nào</p>
          <p className="text-gray-400 mb-6">Hãy đặt hàng để theo dõi đơn hàng của bạn</p>
          <button
            onClick={() => navigate('/products')}
            className="inline-block bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
          >
            Mua sắm ngay
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              {/* Order Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b-2 border-blue-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Mã đơn hàng</p>
                    <p className="text-xl font-bold text-gray-800">#{order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ngày đặt</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <span className={`inline-block px-4 py-2 rounded-lg font-bold border-2 ${getStatusColor(order.trangthai)}`}>
                      {getStatusText(order.trangthai)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Tổng tiền</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {order.tongtien?.toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="p-6">
                {/* Shipping Info */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">👤 Người nhận</p>
                    <p className="font-semibold text-gray-800">{order.hoten}</p>
                    <p className="text-gray-600">{order.sdt}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">📍 Địa chỉ giao hàng</p>
                    <p className="text-gray-800">{order.diachi_giaohang}</p>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-3">📦 Sản phẩm</p>
                  <div className="space-y-3">
                    {order.order_details?.map((detail, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                        onClick={() => navigate(`/products/${detail.product?.products_id}`)}
                      >
                        <img
                          src={getImageUrl(detail.product?.hinh_anh) || 'https://via.placeholder.com/80'}
                          alt={detail.product?.ten_san_pham}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="text-xs text-gray-400">ID: #{detail.product?.products_id}</p>
                          <p className="font-semibold text-gray-800 hover:text-blue-600 transition">{detail.product?.ten_san_pham}</p>
                          {detail.selected_size && (
                            <p className="text-xs text-blue-600 font-semibold">Size: {detail.selected_size}</p>
                          )}
                          
                          {/* Show promotion info if item was purchased during promotion */}
                          {detail.promotion_at_purchase ? (
                            <div className="mt-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                                  -{Math.round(detail.promotion_at_purchase.discount_percent)}% OFF
                                </span>
                              </div>
                              <p className="text-sm font-bold text-red-600">
                                {detail.unit_price?.toLocaleString('vi-VN')}₫ x {detail.quantity}
                              </p>
                              <p className="text-xs text-gray-500 line-through">
                                Giá gốc: {detail.promotion_at_purchase.original_price?.toLocaleString('vi-VN')}₫
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              {detail.unit_price?.toLocaleString('vi-VN')}₫ x {detail.quantity}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">
                            {detail.line_total?.toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voucher & Discount Info */}
                {order.voucher && order.discount_amount > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🎟️</span>
                          <div>
                            <p className="font-bold text-green-700">Đã áp dụng mã giảm giá</p>
                            <p className="text-sm text-green-600">
                              Mã: <span className="font-bold">{order.voucher.code}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-600">Tiết kiệm</p>
                          <p className="text-xl font-bold text-green-700">
                            -{order.discount_amount?.toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    💰 Phương thức thanh toán: <span className="font-semibold text-gray-800">{getPaymentMethodText(order.payment_method)}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
