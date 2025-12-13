import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminNavbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/admin" className="text-2xl font-bold text-white">
            Admin Panel
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/admin" className="text-gray-300 hover:text-white">
              Dashboard
            </Link>
            <Link to="/admin/products" className="text-gray-300 hover:text-white">
              Sản phẩm
            </Link>
            <Link to="/admin/orders" className="text-gray-300 hover:text-white">
              Đơn hàng
            </Link>
            <Link to="/admin/users" className="text-gray-300 hover:text-white">
              Người dùng
            </Link>
            
            <div className="border-l border-gray-600 pl-4 ml-4">
              <span className="text-gray-300 mr-4">Admin: {user?.hoten}</span>
              <Link
                to="/"
                className="text-gray-300 hover:text-white mr-4"
              >
                Về trang chủ
              </Link>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
