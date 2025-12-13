import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/orders')
      setOrders(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Đơn hàng của tôi</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Bạn chưa có đơn hàng nào
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">Đơn hàng #{order.id}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${
                  order.trangthai === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  order.trangthai === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.trangthai === 'pending' ? 'Đang xử lý' :
                   order.trangthai === 'completed' ? 'Hoàn thành' : order.trangthai}
                </span>
              </div>

              <div className="border-t pt-4">
                {order.order_details?.map((detail) => (
                  <div key={detail.id} className="flex justify-between mb-2">
                    <span>{detail.product?.ten_san_pham} x {detail.quantity}</span>
                    <span>{detail.line_total?.toLocaleString('vi-VN')} đ</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between font-bold">
                  <span>Tổng cộng:</span>
                  <span className="text-blue-600">
                    {order.tongdon?.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>Người nhận: {order.hoten}</p>
                <p>SĐT: {order.sdt}</p>
                <p>Địa chỉ: {order.diachi_giaohang}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
