import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get('/api/products', { params: { search: searchTerm } })
      setProducts(res.data.products)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tìm kiếm sản phẩm</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Nhập tên sản phẩm cần tìm..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Tìm kiếm
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Đang tìm kiếm...</p>
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="mb-4">
            <p className="text-gray-600">
              Tìm thấy <span className="font-bold text-blue-600">{products.length}</span> sản phẩm
              {searchTerm && ` cho "${searchTerm}"`}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.products_id}
                  to={`/products/${product.products_id}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition"
                >
                  <img
                    src={product.hinh_anh || 'https://via.placeholder.com/300'}
                    alt={product.ten_san_pham}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{product.ten_san_pham}</h3>
                    <p className="text-blue-600 font-bold">
                      {product.gia_ban?.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
              <p className="text-gray-400 mt-2">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </>
      )}

      {!searched && (
        <div className="text-center py-12">
          <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 text-lg">Nhập từ khóa để tìm kiếm sản phẩm</p>
        </div>
      )}
    </div>
  )
}
