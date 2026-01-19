import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'

export default function AdminDashboard() {
  // Helper to get local date string in YYYY-MM-DD format
  const getTodayString = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [data, setData] = useState({
    products: [],
    orders: [],
    users: [],
    promotions: [],
    vouchers: []
  })
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    activePromotions: 0,
    activeVouchers: 0,
    dateOrders: 0,
    dateRevenue: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!loading) {
      calculateStats()
    }
  }, [selectedDate, data, loading])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [productsRes, ordersRes, usersRes, promotionsRes, vouchersRes] = await Promise.all([
        api.get('/api/products?per_page=1000'),
        api.get('/api/admin/orders?per_page=1000'),
        api.get('/api/admin/users?per_page=1000'),
        api.get('/api/promotions/stats').catch(() => ({ data: { active_count: 0 } })),
        api.get('/api/vouchers/admin').catch(() => ({ data: [] }))
      ])

      setData({
        products: productsRes.data.products || [],
        orders: ordersRes.data.orders || [],
        users: usersRes.data.users || [],
        activePromotions: promotionsRes.data.active_count || 0,
        activeVouchers: (vouchersRes.data || []).filter(v => v.is_active).length
      })

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const { products, orders, users, activePromotions, activeVouchers } = data

    // Filter orders by selected date
    const dateOrdersList = orders.filter(o => {
      const orderDate = new Date(o.created_at)
      const orderDateString = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`
      return orderDateString === selectedDate
    })

    // Calculate stats based on ALL orders for totals
    const totalRevenue = orders
      .filter(o => o.trangthai === 'hoan_thanh')
      .reduce((sum, o) => sum + parseFloat(o.tongtien || 0), 0)

    // Calculate daily stats
    const dateRevenue = dateOrdersList
      .filter(o => o.trangthai === 'hoan_thanh')
      .reduce((sum, o) => sum + parseFloat(o.tongtien || 0), 0)

    // Status counts - let's make these reflect the selected date to match "View by Date" intent
    // If the user selects a date, they probably want to see the status breakup of orders from that date
    // Or we could keep them global. Let's keep them global as per typical dashboard behavior (current system status)
    // BUT user asked "choose date to view", so maybe they want to drill down?
    // Let's stick to: Totals are Global, "Today/Date" stats are filtered.
    // Status badges typically show the Current State of the pipeline. Filtering by date created is a nice analysis feature though.
    // Let's filtered status counts by date? No, that might be confusing if the totals don't match up.
    // Let's keep status counts GLOBAL (Current pending orders regardless of when they were made) to ensure operational utility.
    // AND we provide "Date Orders" and "Date Revenue".

    const pendingOrders = orders.filter(o => o.trangthai === 'cho_xac_nhan').length
    const processingOrders = orders.filter(o => o.trangthai === 'dang_xu_ly').length
    const shippingOrders = orders.filter(o => o.trangthai === 'dang_giao').length
    const completedOrders = orders.filter(o => o.trangthai === 'hoan_thanh').length
    const cancelledOrders = orders.filter(o => o.trangthai === 'huy').length

    setStats({
      totalProducts: products.length,
      totalOrders: orders.length,
      totalUsers: users.length,
      totalRevenue,
      pendingOrders,
      processingOrders,
      shippingOrders,
      completedOrders,
      cancelledOrders,
      activePromotions,
      activeVouchers,
      dateOrders: dateOrdersList.length,
      dateRevenue
    })

    // Recent orders - show orders from selected date
    setRecentOrders(dateOrdersList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))

    // Top products (mock)
    setTopProducts(products.slice(0, 5))
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'cho_xac_nhan': { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
      'dang_xu_ly': { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-800', icon: '🔄' },
      'dang_giao': { label: 'Đang giao', color: 'bg-purple-100 text-purple-800', icon: '🚚' },
      'hoan_thanh': { label: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: '✅' },
      'huy': { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: '❌' }
    }
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: '📋' }
    return (
      <span className={`px-3 py-1 text-xs rounded-full font-bold ${statusInfo.color}`}>
        {statusInfo.icon} {statusInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
          <p className="text-gray-500 text-sm">Xem thống kê và báo cáo kinh doanh</p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <span className="text-gray-500 text-sm font-medium">📅 Chọn ngày:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="outline-none text-gray-700 font-medium bg-transparent"
          />
        </div>
      </div>
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">TỔNG DOANH THU</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalRevenue.toLocaleString()}₫</p>
              <p className="text-sm text-green-600 mt-2 font-medium">
                {selectedDate === getTodayString() ? 'Hôm nay' : 'Ngày chọn'}: {stats.dateRevenue.toLocaleString()}₫
              </p>
            </div>
            <div className="bg-green-100 p-4 rounded-full">
              <span className="text-4xl">💰</span>
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">TỔNG ĐƠN HÀNG</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
              <p className="text-sm text-blue-600 mt-2 font-medium">
                {selectedDate === getTodayString() ? 'Hôm nay' : 'Ngày chọn'}: {stats.dateOrders} đơn
              </p>
            </div>
            <div className="bg-blue-100 p-4 rounded-full">
              <span className="text-4xl">📦</span>
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">SẢN PHẨM</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalProducts}</p>
              <p className="text-sm text-teal-600 mt-2 font-medium">
                Đang khuyến mãi: {stats.activePromotions}
              </p>
            </div>
            <div className="bg-teal-100 p-4 rounded-full">
              <span className="text-4xl">👕</span>
            </div>
          </div>
        </div>

        {/* Users Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">KHÁCH HÀNG</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
              <p className="text-sm text-orange-600 mt-2 font-medium">
                Voucher active: {stats.activeVouchers}
              </p>
            </div>
            <div className="bg-orange-100 p-4 rounded-full">
              <span className="text-4xl">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          📋 Trạng thái đơn hàng
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
            <span className="text-3xl">⏳</span>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingOrders}</p>
            <p className="text-sm text-gray-600 font-medium">Chờ xác nhận</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
            <span className="text-3xl">🔄</span>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.processingOrders}</p>
            <p className="text-sm text-gray-600 font-medium">Đang xử lý</p>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-center">
            <span className="text-3xl">🚚</span>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.shippingOrders}</p>
            <p className="text-sm text-gray-600 font-medium">Đang giao</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <span className="text-3xl">✅</span>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedOrders}</p>
            <p className="text-sm text-gray-600 font-medium">Hoàn thành</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
            <span className="text-3xl">❌</span>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.cancelledOrders}</p>
            <p className="text-sm text-gray-600 font-medium">Đã hủy</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Tỷ lệ hoàn thành</span>
            <span className="font-bold text-green-600">
              {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.totalOrders > 0 ? (stats.completedOrders / stats.totalOrders) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🕐 Đơn hàng {selectedDate === getTodayString() ? 'gần đây' : 'ngày ' + new Date(selectedDate).toLocaleDateString('vi-VN')}
            </h2>
            <Link to="/orders" className="text-blue-600 hover:text-blue-700 text-sm font-bold">
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-5xl">📭</span>
                <p className="text-gray-500 mt-2">Không có đơn hàng nào trong ngày này</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">Đơn #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.hoten}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-bold text-lg text-gray-800">{parseFloat(order.tongtien).toLocaleString()}₫</p>
                  </div>
                  <div>
                    {getStatusBadge(order.trangthai)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Marketing Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            🎯 Marketing & Khuyến mãi
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏷️</span>
                <div>
                  <p className="font-bold text-gray-800">Khuyến mãi sản phẩm</p>
                  <p className="text-sm text-gray-500">Đang hoạt động</p>
                </div>
              </div>
              <span className="text-3xl font-bold text-red-600">{stats.activePromotions}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎫</span>
                <div>
                  <p className="font-bold text-gray-800">Voucher giảm giá</p>
                  <p className="text-sm text-gray-500">Đang hoạt động</p>
                </div>
              </div>
              <span className="text-3xl font-bold text-teal-600">{stats.activeVouchers}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Link
                to="/promotions"
                className="flex items-center justify-center gap-2 p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-bold"
              >
                🏷️ Khuyến mãi
              </Link>
              <Link
                to="/vouchers"
                className="flex items-center justify-center gap-2 p-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition font-bold"
              >
                🎫 Voucher
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          ⚡ Truy cập nhanh
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Link to="/products" className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition group">
            <span className="text-4xl mb-2 group-hover:scale-110 transition">👕</span>
            <span className="font-bold text-gray-700">Sản phẩm</span>
          </Link>
          <Link to="/orders" className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition group">
            <span className="text-4xl mb-2 group-hover:scale-110 transition">📦</span>
            <span className="font-bold text-gray-700">Đơn hàng</span>
          </Link>
          <Link to="/users" className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition group">
            <span className="text-4xl mb-2 group-hover:scale-110 transition">👥</span>
            <span className="font-bold text-gray-700">Khách hàng</span>
          </Link>
          <Link to="/reviews" className="flex flex-col items-center p-4 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition group">
            <span className="text-4xl mb-2 group-hover:scale-110 transition">⭐</span>
            <span className="font-bold text-gray-700">Đánh giá</span>
          </Link>
          <Link to="/customer-insights" className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition group">
            <span className="text-4xl mb-2 group-hover:scale-110 transition">📈</span>
            <span className="font-bold text-gray-700">Phân tích</span>
          </Link>
          <Link to="/store-info" className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
            <span className="text-4xl mb-2 group-hover:scale-110 transition">🏪</span>
            <span className="font-bold text-gray-700">Cửa hàng</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
