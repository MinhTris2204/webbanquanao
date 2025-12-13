import { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await api.get('/admin/orders')
      setOrders(res.data.orders)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId, status) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { trangthai: status })
      fetchOrders()
    } catch (err) {
      alert('Có lỗi xảy ra')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Quản lý đơn hàng</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Khách hàng</th>
              <th className="px-6 py-3 text-left">Tổng tiền</th>
              <th className="px-6 py-3 text-left">Trạng thái</th>
              <th className="px-6 py-3 text-left">Ngày đặt</th>
              <th className="px-6 py-3 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="px-6 py-4">{order.id}</td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-bold">{order.hoten}</p>
                    <p className="text-sm text-gray-500">{order.sdt}</p>
                  </div>
                </td>
                <td className="px-6 py-4">{order.tongdon?.toLocaleString('vi-VN')} đ</td>
                <td className="px-6 py-4">
                  <select
                    value={order.trangthai}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="px-3 py-1 border rounded"
                  >
                    <option value="pending">Đang xử lý</option>
                    <option value="processing">Đang giao</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => alert(`Chi tiết đơn hàng #${order.id}\n${order.diachi_giaohang}`)}
                    className="text-blue-500 hover:underline"
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
