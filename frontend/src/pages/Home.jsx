import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Chào mừng đến Shop Quần Áo
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Thời trang chất lượng cao với giá cả phải chăng
        </p>
        <Link
          to="/products"
          className="bg-blue-500 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-600 inline-block"
        >
          Xem sản phẩm
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold mb-2">Chất lượng cao</h3>
          <p className="text-gray-600">Sản phẩm được chọn lọc kỹ càng</p>
        </div>
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold mb-2">Giao hàng nhanh</h3>
          <p className="text-gray-600">Giao hàng toàn quốc trong 2-3 ngày</p>
        </div>
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold mb-2">Hỗ trợ 24/7</h3>
          <p className="text-gray-600">Luôn sẵn sàng hỗ trợ khách hàng</p>
        </div>
      </div>
    </div>
  )
}
