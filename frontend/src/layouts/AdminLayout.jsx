import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminLayout() {
  const location = useLocation()

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return '📊 Dashboard'
      case '/products':
        return '📦 Quản lý sản phẩm'
      case '/orders':
        return '📋 Quản lý đơn hàng'
      case '/vouchers':
        return '🎫 Quản lý voucher'
      case '/users':
        return '👥 Quản lý người dùng'
      default:
        return '📊 Dashboard'
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <header className="bg-white shadow-sm h-16 flex items-center px-6">
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
