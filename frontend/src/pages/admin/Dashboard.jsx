import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    activePromotions: 0,
    activeVouchers: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [ordersByStatus, setOrdersByStatus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const productsRes = await api.get('/api/products?per_page=1000')
      const productsData = productsRes.data.products || []
      
      const ordersRes = await api.get('/api/admin/orders?per_page=1000')
      const ordersData = ordersRes.data.orders || []
      
      const usersRes = await api.get('/api/admin/users?per_page=1000')
      const usersData = usersRes.data.users || []
      
      let activePromotions = 0
      try {
        const promotionsRes = await api.get('/api/promotions/stats')
        activePromotions = promotionsRes.data.active_count || 0
      } catch (err) {
        console.log('Promotions stats not available')
      }
      
      let activeVouchers = 0
      try {
        const vouchersRes = await api.get('/api/vouchers/admin')
        const vouchersData = vouchersRes.data || []
        activeVouchers = vouchersData.filter(v => v.is_active).length
      } catch (err) {
        console.log('Vouchers not available:', err)
      }
      
      const totalRevenue = ordersData
        .filter(o => o.trangthai === 'hoan_thanh')
        .reduce((sum, o) => sum + parseFloat(o.tongtien || 0), 0)
      
      const pendingOrders = ordersData.filter(o => o.trangthai === 'cho_xac_nhan').length
      const completedOrders = ordersData.filter(o => o.trangthai === 'hoan_thanh').length
      const cancelledOrders = ordersData.filter(o => o.trangthai === 'huy').length
      
      setStats({
        totalProducts: productsData.length,
        totalOrders: ordersData.length,
        totalUsers: usersData.length,
        totalRevenue: totalRevenue,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        activePromotions,
        activeVouchers
      })
      
      setOrdersByStatus([
        { label: 'Chờ xác nhận', value: pendingOrders, color: 'bg-yellow-500' },
        { label: 'Hoàn thành', value: completedOrders, color: 'bg-green-500' },
        { label: 'Đã hủy', value: cancelledOrders, color: 'bg-red-500' }
      ])
      
      setRecentOrders(ordersData.slice(0, 5))
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'cho_xac_nhan': { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
      'hoan_thanh': { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
      'huy': { label: 'Đã hủy', color: 'bg-red-100 text-red-800' }
    }
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  const maxOrderValue = Math.max(...ordersByStatus.map(s => s.value), 1)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Doanh thu</p>
              <p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}₫</p>
            </div>
          </div>
          <div className="flex items-center text-sm opacity-90">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            Từ {stats.completedOrders} đơn hoàn thành
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Đơn hàng</p>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-90">Chờ xử lý:</span>
            <span className="font-semibold">{stats.pendingOrders}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Sản phẩm</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-90">Khuyến mãi:</span>
            <span className="font-semibold">{stats.activePromotions}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Người dùng</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-90">Voucher:</span>
            <span className="font-semibold">{stats.activeVouchers}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">📊 Thống kê đơn hàng theo trạng thái</h3>
          <div className="space-y-4">
            {ordersByStatus.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900">{item.value} đơn</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${(item.value / maxOrderValue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Tỷ lệ hoàn thành</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Tỷ lệ hủy</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.totalOrders > 0 ? Math.round((stats.cancelledOrders / stats.totalOrders) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">📋 Đơn hàng gần đây</h3>
            <Link to="/orders" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Chưa có đơn hàng nào</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">#{order.id} - {order.hoten}</p>
                    <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-bold text-gray-800">{parseFloat(order.tongtien).toLocaleString()}₫</p>
                  </div>
                  <div>
                    {getStatusBadge(order.trangthai)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Marketing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-800">📈 Trạng thái đơn hàng</h4>
            <span className="text-2xl">📊</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Chờ xác nhận</span>
              <span className="text-xl font-bold text-yellow-600">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Hoàn thành</span>
              <span className="text-xl font-bold text-green-600">{stats.completedOrders}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Đã hủy</span>
              <span className="text-xl font-bold text-red-600">{stats.cancelledOrders}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-800">🎯 Marketing</h4>
            <span className="text-2xl">🎁</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Khuyến mãi active</span>
              <span className="text-xl font-bold text-red-600">{stats.activePromotions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Voucher active</span>
              <span className="text-xl font-bold text-purple-600">{stats.activeVouchers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Tổng cộng</span>
              <span className="text-xl font-bold text-blue-600">{stats.activePromotions + stats.activeVouchers}</span>
            </div>
            <Link 
              to="/promotions"
              className="block text-center p-3 bg-gradient-to-r from-red-500 to-purple-500 text-white rounded-lg hover:from-red-600 hover:to-purple-600 transition font-semibold"
            >
              Quản lý Marketing →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">⚡ Quản lý nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/products"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition"
          >
            <div className="flex items-center mb-2">
              <div className="bg-blue-100 p-2 rounded-lg mr-3 group-hover:bg-blue-500 transition">
                <svg className="w-6 h-6 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-800">Sản phẩm</h4>
            </div>
            <p className="spxt-sm text-gray-600">Quản lý kho hàng</p>
          </Link>

          <Link
            to="/orders"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition"
          >
            <div className="flex items-center mb-2">
              <div className="bg-green-100 p-2 rounded-lg mr-3 group-hover:bg-green-500 transition">
                <svg className="w-6 h-6 text-green-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-800">Đơn hàng</h4>
            </div>
            <p className="text-sm text-gray-600">Xử lý đơn hàng</p>
          </Link>

          <Link
            to="/promotions"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:shadow-md transition"
          >
            <div className="flex items-center mb-2">
              <div className="bg-red-100 p-2 rounded-lg mr-3 group-hover:bg-red-500 transition">
                <svg className="w-6 h-6 text-red-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-800">Khuyến mãi</h4>
            </div>
            <p className="text-sm text-gray-600">Tạo chương trình sale</p>
          </Link>

          <Link
            to="/vouchers"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition"
          >
            <div className="flex items-center mb-2">
              <div className="bg-purple-100 p-2 rounded-lg mr-3 group-hover:bg-purple-500 transition">
                <svg className="w-6 h-6 text-purple-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-800">Voucher</h4>
            </div>
            <p className="text-sm text-gray-600">Quản lý mã giảm giá</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
