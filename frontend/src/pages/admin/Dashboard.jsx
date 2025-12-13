import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Quản trị hệ thống</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/admin/products"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-2">Quản lý sản phẩm</h2>
          <p className="text-gray-600">Thêm, sửa, xóa sản phẩm</p>
        </Link>

        <Link
          to="/admin/orders"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-2">Quản lý đơn hàng</h2>
          <p className="text-gray-600">Xem và cập nhật trạng thái đơn hàng</p>
        </Link>
      </div>
    </div>
  )
}
