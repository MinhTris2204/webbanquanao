import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedGender, setSelectedGender] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [search])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products', { params: { search, per_page: 50 } })
      setProducts(res.data.products)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchCategory = !selectedCategory || product.loai === selectedCategory
    const matchGender = !selectedGender || product.gioi_tinh === selectedGender
    return matchCategory && matchGender
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải sản phẩm...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">🛍️ Sản phẩm</h1>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm sản phẩm..."
            className="w-full px-6 py-4 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg 
            className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả loại</option>
            <option value="Áo">Áo</option>
            <option value="Quần">Quần</option>
            <option value="Váy">Váy</option>
            <option value="Đầm">Đầm</option>
            <option value="Áo khoác">Áo khoác</option>
            <option value="Phụ kiện">Phụ kiện</option>
          </select>

          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Unisex">Unisex</option>
          </select>

          <div className="ml-auto text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg flex items-center">
            Hiển thị: <span className="font-bold text-blue-600 ml-2">{filteredProducts.length}</span> sản phẩm
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Link
            key={product.products_id}
            to={`/products/${product.products_id}`}
            className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="relative overflow-hidden">
              <img
                src={product.hinh_anh || 'https://via.placeholder.com/300'}
                alt={product.ten_san_pham}
                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {product.trang_thai === 'Het_hang' && (
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">Hết hàng</span>
                </div>
              )}
              {product.trang_thai === 'Con_hang' && (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Còn hàng
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                  {product.loai}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                  {product.gioi_tinh}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-800 line-clamp-2 group-hover:text-blue-600 transition">
                {product.ten_san_pham}
              </h3>
              {product.size && (
                <p className="text-xs text-gray-500 mb-2">Size: {product.size}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-blue-600 font-bold text-xl">
                  {product.gia_ban?.toLocaleString('vi-VN')}₫
                </p>
                <button className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-600 transition">
                  Xem
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500 text-xl font-medium">Không tìm thấy sản phẩm</p>
          <p className="text-gray-400 text-sm mt-2">Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc</p>
        </div>
      )}
    </div>
  )
}
