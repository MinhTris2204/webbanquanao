import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'

export default function AdminDashboard() {
  // Helper to get local date string in YYYY-MM-DD format
  const getTodayString = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const getCurrentMonth = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const getCurrentYear = () => {
    return `${new Date().getFullYear()}`
  }

  // viewMode: 'day' | 'month' | 'year'
  const [viewMode, setViewMode] = useState('day')
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
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
  }, [selectedDate, selectedMonth, selectedYear, viewMode, data, loading])

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

  // Kiểm tra một item có thuộc kỳ được chọn không
  const inPeriod = (dateStr) => {
    const d = new Date(dateStr)
    if (viewMode === 'day') {
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return s === selectedDate
    } else if (viewMode === 'month') {
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return s === selectedMonth
    } else {
      return `${d.getFullYear()}` === selectedYear
    }
  }

  const getPeriodLabel = () => {
    if (viewMode === 'day') return selectedDate === getTodayString() ? 'Hôm nay' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN')
    if (viewMode === 'month') return 'Tháng ' + selectedMonth.split('-').reverse().join('/')
    return 'Năm ' + selectedYear
  }

  const calculateStats = () => {
    const { products, orders, users, activePromotions, activeVouchers } = data

    // Lọc theo kỳ
    const filteredOrders = orders.filter(o => inPeriod(o.created_at))
    const filteredUsers = users.filter(u => inPeriod(u.created_at))

    // Doanh thu kỳ (chỉ đơn hoàn thành)
    const periodRevenue = filteredOrders
      .filter(o => o.trangthai === 'hoan_thanh')
      .reduce((sum, o) => sum + parseFloat(o.tongtien || 0), 0)

    // Trạng thái đơn hàng theo kỳ
    const pendingOrders = filteredOrders.filter(o => o.trangthai === 'cho_xac_nhan').length
    const processingOrders = filteredOrders.filter(o => o.trangthai === 'dang_xu_ly').length
    const shippingOrders = filteredOrders.filter(o => o.trangthai === 'dang_giao').length
    const completedOrders = filteredOrders.filter(o => o.trangthai === 'hoan_thanh').length
    const cancelledOrders = filteredOrders.filter(o => o.trangthai === 'huy').length

    // Sản phẩm mới trong kỳ
    const newProducts = products.filter(p => p.created_at && inPeriod(p.created_at)).length

    setStats({
      totalProducts: products.length,
      newProducts,
      totalOrders: filteredOrders.length,
      totalUsers: filteredUsers.length,
      totalRevenue: periodRevenue,
      pendingOrders,
      processingOrders,
      shippingOrders,
      completedOrders,
      cancelledOrders,
      activePromotions,
      activeVouchers,
    })

    setRecentOrders(filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          {/* Mode tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[
              { key: 'day', label: 'Ngày' },
              { key: 'month', label: 'Tháng' },
              { key: 'year', label: 'Năm' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date input based on mode */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">📅</span>
            {viewMode === 'day' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="outline-none text-gray-700 font-medium bg-transparent text-sm"
              />
            )}
            {viewMode === 'month' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="outline-none text-gray-700 font-medium bg-transparent text-sm"
              />
            )}
            {viewMode === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="outline-none text-gray-700 font-medium bg-transparent text-sm"
              >
                {Array.from({ length: 6 }, (_, i) => `${new Date().getFullYear() - i}`).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">DOANH THU</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalRevenue.toLocaleString()}₫</p>
              <p className="text-xs text-green-600 mt-2 font-medium">📅 {getPeriodLabel()}</p>
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
              <p className="text-gray-500 text-sm font-medium mb-1">ĐƠN HÀNG</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
              <p className="text-xs text-blue-600 mt-2 font-medium">📅 {getPeriodLabel()}</p>
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
              <p className="text-gray-500 text-sm font-medium mb-1">SẢN PHẨM MỚI</p>
              <p className="text-3xl font-bold text-gray-800">{stats.newProducts}</p>
              <p className="text-xs text-teal-600 mt-2 font-medium">
                📅 {getPeriodLabel()} · Tổng kho: {stats.totalProducts} sản phẩm
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
              <p className="text-gray-500 text-sm font-medium mb-1">KHÁCH HÀNG MỚI</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
              <p className="text-xs text-orange-600 mt-2 font-medium">
                📅 {getPeriodLabel()} · Voucher: {stats.activeVouchers}
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
        <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          📋 Trạng thái đơn hàng
        </h2>
        <p className="text-sm text-gray-400 mb-6">📅 {getPeriodLabel()}</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🕐 Đơn hàng{' '}
              {viewMode === 'day'
                ? (selectedDate === getTodayString() ? 'hôm nay' : 'ngày ' + new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN'))
                : viewMode === 'month'
                ? 'tháng ' + selectedMonth.split('-').reverse().join('/')
                : 'năm ' + selectedYear
              }
            </h2>
            <Link to="/orders" className="text-blue-600 hover:text-blue-700 text-sm font-bold">
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-5xl">📭</span>
                <p className="text-gray-500 mt-2">Không có đơn hàng nào trong kỳ này</p>
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
