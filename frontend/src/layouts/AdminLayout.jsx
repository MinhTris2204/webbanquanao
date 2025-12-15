import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return '📊 Dashboard'
      case '/products':
        return '📦 Quản lý sản phẩm'
      case '/orders':
        return '📋 Quản lý đơn hàng'
      case '/promotions':
        return '🎁 Quản lý khuyến mãi'
      case '/vouchers':
        return '🎫 Quản lý voucher'
      case '/users':
        return '👥 Quản lý người dùng'
      case '/store-info':
        return 'ℹ️ Quản lý thông tin cửa hàng'
      case '/chat':
        return '💬 Chat hỗ trợ khách hàng'
      case '/reviews':
        return '⭐ Quản lý đánh giá'
      default:
        return '📊 Dashboard'
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} />
      
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm h-16 flex items-center px-6 sticky top-0 z-10">
          {/* Hamburger Menu Button */}
          <div className="relative mr-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative p-2 rounded-lg hover:bg-blue-50 transition-all duration-300 group bg-gray-50 border border-gray-200 hover:border-blue-300"
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span className={`block h-0.5 bg-gray-600 group-hover:bg-blue-600 rounded transition-all duration-300 ${sidebarOpen ? '' : 'rotate-45 translate-y-2'}`}></span>
                <span className={`block h-0.5 bg-gray-600 group-hover:bg-blue-600 rounded transition-all duration-300 ${sidebarOpen ? '' : 'opacity-0'}`}></span>
                <span className={`block h-0.5 bg-gray-600 group-hover:bg-blue-600 rounded transition-all duration-300 ${sidebarOpen ? '' : '-rotate-45 -translate-y-2'}`}></span>
              </div>
              {/* Pulse effect */}
              <span className="absolute inset-0 rounded-lg bg-blue-400 animate-ping opacity-20"></span>
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h1>
        </header>
        
        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
