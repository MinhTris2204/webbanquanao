import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useToast } from '../../components/Toast'

export default function AdminOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    hoten: '',
    sdt: '',
    diachi_giaohang: '',
    payment_method: '',
    trangthai: ''
  })

  useEffect(() => {
    fetchOrders()
  }, [currentPage, statusFilter, searchTerm])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/orders', {
        params: {
          page: currentPage,
          per_page: 10,
          status: statusFilter,
          search: searchTerm
        }
      })
      setOrders(res.data.orders)
      setTotalPages(res.data.pages)
      setTotalOrders(res.data.total)
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi tải danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId, status) => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status`, { trangthai: status })
      toast.success('Cập nhật trạng thái thành công!')
      fetchOrders()
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi cập nhật trạng thái')
    }
  }

  const viewDetail = (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
  }

  const openEditModal = (order) => {
    setSelectedOrder(order)
    setEditForm({
      hoten: order.hoten,
      sdt: order.sdt,
      diachi_giaohang: order.diachi_giaohang,
      payment_method: order.payment_method,
      trangthai: order.trangthai
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/api/admin/orders/${selectedOrder.id}`, editForm)
      toast.success('Cập nhật đơn hàng thành công!')
      setShowEditModal(false)
      fetchOrders()
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi cập nhật đơn hàng')
    }
  }

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return
    
    try {
      await api.delete(`/api/admin/orders/${orderId}`)
      toast.success('Xóa đơn hàng thành công!')
      fetchOrders()
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi xóa đơn hàng')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      cho_xac_nhan: 'bg-yellow-100 text-yellow-800',
      hoan_thanh: 'bg-green-100 text-green-800',
      huy: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      cho_xac_nhan: '⏳ Chờ xác nhận',
      hoan_thanh: '✅ Hoàn thành',
      huy: '❌ Đã hủy'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  if (loading && orders.length === 0) {
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
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, SĐT, mã đơn hàng..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleStatusFilter('')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === '' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => handleStatusFilter('cho_xac_nhan')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === 'cho_xac_nhan' 
                  ? 'bg-yellow-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chờ xác nhận
            </button>
            <button
              onClick={() => handleStatusFilter('hoan_thanh')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === 'hoan_thanh' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoàn thành
            </button>
            <button
              onClick={() => handleStatusFilter('huy')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === 'huy' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đã hủy
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Hiển thị <span className="font-bold text-blue-600">{orders.length}</span> / {totalOrders} đơn hàng
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mã ĐH</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ngày đặt</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-blue-600">#{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.hoten}</p>
                      <p className="text-sm text-gray-500">{order.sdt}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-900">
                      {order.tongtien?.toLocaleString('vi-VN')} đ
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.trangthai)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => viewDetail(order)}
                      className="text-blue-600 hover:text-blue-900 mr-3 transition"
                      title="Xem chi tiết"
                    >
                      <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(order)}
                      className="text-green-600 hover:text-green-900 mr-3 transition"
                      title="Sửa đơn hàng"
                    >
                      <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="text-red-600 hover:text-red-900 transition"
                      title="Xóa đơn hàng"
                    >
                      <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 text-lg">Không tìm thấy đơn hàng</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600">
            Trang <span className="font-bold text-blue-600">{currentPage}</span> / {totalPages}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
              }`}
            >
              ← Trước
            </button>
            
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-semibold transition ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 py-2 text-gray-400">...</span>
                }
                return null
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
              }`}
            >
              Sau →
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">✏️ Sửa đơn hàng #{selectedOrder.id}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:text-gray-200 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Họ tên</label>
                  <input
                    type="text"
                    value={editForm.hoten}
                    onChange={(e) => setEditForm({ ...editForm, hoten: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại</label>
                  <input
                    type="text"
                    value={editForm.sdt}
                    onChange={(e) => setEditForm({ ...editForm, sdt: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Địa chỉ giao hàng</label>
                  <textarea
                    value={editForm.diachi_giaohang}
                    onChange={(e) => setEditForm({ ...editForm, diachi_giaohang: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phương thức thanh toán</label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="COD">COD (Thanh toán khi nhận hàng)</option>
                    <option value="Bank Transfer">Chuyển khoản ngân hàng</option>
                    <option value="Credit Card">Thẻ tín dụng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Trạng thái</label>
                  <select
                    value={editForm.trangthai}
                    onChange={(e) => setEditForm({ ...editForm, trangthai: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="cho_xac_nhan">Chờ xác nhận</option>
                    <option value="hoan_thanh">Hoàn thành</option>
                    <option value="huy">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  💾 Lưu thay đổi
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">📋 Chi tiết đơn hàng #{selectedOrder.id}</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:text-gray-200 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Customer Info */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">Thông tin khách hàng</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><span className="font-semibold">Họ tên:</span> {selectedOrder.hoten}</p>
                  <p><span className="font-semibold">Số điện thoại:</span> {selectedOrder.sdt}</p>
                  <p><span className="font-semibold">Địa chỉ giao hàng:</span> {selectedOrder.diachi_giaohang}</p>
                  <p><span className="font-semibold">Phương thức thanh toán:</span> {selectedOrder.payment_method}</p>
                  {selectedOrder.ghichu && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="font-semibold mb-1">📝 Ghi chú từ khách hàng:</p>
                      <p className="text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400 italic">
                        "{selectedOrder.ghichu}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">Sản phẩm đã đặt</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Sản phẩm</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Đơn giá</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Số lượng</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.order_details?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img 
                                src={item.product?.hinh_anh || 'https://via.placeholder.com/50'} 
                                alt={item.product?.ten_san_pham}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div>
                                <p className="font-medium">{item.product?.ten_san_pham}</p>
                                {item.selected_size && (
                                  <p className="text-sm text-gray-500">Size: {item.selected_size}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{item.unit_price?.toLocaleString('vi-VN')} đ</td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3 font-semibold">{item.line_total?.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-6">
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  {selectedOrder.voucher && (
                    <div className="flex justify-between">
                      <span>Voucher ({selectedOrder.voucher.code}):</span>
                      <span className="text-red-600">-{selectedOrder.discount_amount?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Tổng cộng:</span>
                    <span className="text-blue-600">{selectedOrder.tongtien?.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">Cập nhật trạng thái</h4>
                <select
                  value={selectedOrder.trangthai}
                  onChange={(e) => {
                    updateStatus(selectedOrder.id, e.target.value)
                    setSelectedOrder({ ...selectedOrder, trangthai: e.target.value })
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cho_xac_nhan">Chờ xác nhận</option>
                  <option value="hoan_thanh">Hoàn thành</option>
                  <option value="huy">Đã hủy</option>
                </select>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
