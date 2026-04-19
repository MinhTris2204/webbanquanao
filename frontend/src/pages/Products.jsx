import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'
import ProductRating from '../components/ProductRating'

export default function Products() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedGender, setSelectedGender] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [priceDisplay, setPriceDisplay] = useState({ min: '', max: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const itemsPerPage = 12

  // Lấy danh mục và bộ lọc sale từ URL params
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const onSaleParam = searchParams.get('on_sale')
    
    if (categoryParam) {
      setSelectedCategory(categoryParam)
      setShowFilters(true)
    } else {
      setSelectedCategory('')
    }
    
    if (onSaleParam === 'true') {
      setOnSaleOnly(true)
      setShowFilters(true)
    } else {
      setOnSaleOnly(false)
    }
    
    // Reset về trang 1 khi URL params thay đổi
    setCurrentPage(1)
  }, [searchParams])

  useEffect(() => {
    fetchProducts()
  }, [currentPage, onSaleOnly, selectedCategory, selectedGender, selectedSize, priceRange])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let res
      if (onSaleOnly) {
        // Gọi API riêng cho sản phẩm khuyến mãi
        res = await api.get('/api/products/on-sale', { 
          params: { 
            page: currentPage,
            per_page: itemsPerPage,
            category: selectedCategory || undefined,
            gender: selectedGender || undefined,
            size: selectedSize || undefined,
            min_price: priceRange.min || undefined,
            max_price: priceRange.max || undefined
          } 
        })
      } else {
        res = await api.get('/api/products', { 
          params: { 
            page: currentPage,
            per_page: itemsPerPage,
            category: selectedCategory || undefined,
            gender: selectedGender || undefined,
            size: selectedSize || undefined,
            min_price: priceRange.min || undefined,
            max_price: priceRange.max || undefined
          } 
        })
      }
      setProducts(res.data.products)
      setTotalPages(res.data.pages)
      setTotalProducts(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products // Không cần lọc nữa vì backend đã lọc

  const formatPrice = (value) => {
    const number = value.replace(/\D/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handlePriceChange = (field, value) => {
    const rawValue = value.replace(/\./g, '')
    setPriceRange({ ...priceRange, [field]: rawValue })
    setPriceDisplay({ ...priceDisplay, [field]: formatPrice(value) })
  }

  const handleQuickPrice = (min, max) => {
    setPriceRange({ min, max })
    setPriceDisplay({ 
      min: min ? formatPrice(min) : '', 
      max: max ? formatPrice(max) : '' 
    })
    setCurrentPage(1) // Reset về trang 1 khi thay đổi giá
  }

  const handleResetFilters = () => {
    setSelectedCategory('')
    setSelectedGender('')
    setSelectedSize('')
    setOnSaleOnly(false)
    setPriceRange({ min: '', max: '' })
    setPriceDisplay({ min: '', max: '' })
    setCurrentPage(1)
    // Trigger re-fetch
    fetchProducts()
  }

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

      {/* Filter Toggle Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full bg-white rounded-xl shadow-lg px-6 py-4 flex items-center justify-between hover:shadow-xl transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔧</span>
            <span className="text-xl font-bold text-gray-800">Bộ lọc</span>
            {(selectedCategory || selectedGender || selectedSize || onSaleOnly || priceRange.min || priceRange.max) && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                Đang lọc
              </span>
            )}
          </div>
          <svg 
            className={`w-6 h-6 text-gray-600 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Tùy chọn lọc</h2>
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              ↻ Đặt lại
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Loại sản phẩm</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">Tất cả</option>
              <option value="Áo">Áo</option>
              <option value="Quần">Quần</option>
              <option value="Váy">Váy</option>
              <option value="Đầm">Đầm</option>
              <option value="Áo khoác">Áo khoác</option>
              <option value="Phụ kiện">Phụ kiện</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Giới tính</label>
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">Tất cả</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Size</label>
            <select
              value={selectedSize}
              onChange={(e) => {
                setSelectedSize(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">Tất cả</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
            </select>
          </div>

          {/* Sale Filter */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onSaleOnly}
                onChange={(e) => {
                  setOnSaleOnly(e.target.checked)
                  setCurrentPage(1)
                }}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 mr-3"
              />
              <span className="text-sm font-semibold text-red-600">🔥 Chỉ sản phẩm Sale</span>
            </label>
          </div>

          {/* Price Range Filter */}
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Khoảng giá (VNĐ)</label>
            
            {/* Quick Price Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => handleQuickPrice('', '')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  !priceRange.min && !priceRange.max
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => handleQuickPrice('0', '200000')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  priceRange.min === '0' && priceRange.max === '200000'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Dưới 200k
              </button>
              <button
                onClick={() => handleQuickPrice('200000', '500000')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  priceRange.min === '200000' && priceRange.max === '500000'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                200k - 500k
              </button>
              <button
                onClick={() => handleQuickPrice('500000', '1000000')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  priceRange.min === '500000' && priceRange.max === '1000000'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                500k - 1tr
              </button>
              <button
                onClick={() => handleQuickPrice('1000000', '')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  priceRange.min === '1000000' && !priceRange.max
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Trên 1tr
              </button>
            </div>

            {/* Custom Price Inputs */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Từ"
                value={priceDisplay.min}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                className="flex-1 px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <span className="flex items-center text-gray-500">-</span>
              <input
                type="text"
                placeholder="Đến"
                value={priceDisplay.max}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                className="flex-1 px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Hiển thị <span className="font-bold text-blue-600">{filteredProducts.length}</span> / {totalProducts} sản phẩm
            </p>
          </div>
        </div>
      )}

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
                src={getImageUrl(product.hinh_anh) || 'https://via.placeholder.com/300'}
                alt={product.ten_san_pham}
                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {product.promotion && (
                <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                  -{Math.round(((product.gia_ban - product.promotion.promotional_price) / product.gia_ban) * 100)}%
                </div>
              )}
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
                <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full font-semibold">
                  {product.loai}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                  {product.gioi_tinh}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-1">ID: #{product.products_id}</p>
              <h3 className="font-bold text-lg mb-2 text-gray-800 line-clamp-2 group-hover:text-blue-600 transition">
                {product.ten_san_pham}
              </h3>
              
              {/* Rating */}
              <div className="mb-2">
                <ProductRating 
                  rating={product.rating?.average_rating || 0}
                  reviewCount={product.rating?.review_count || 0}
                  size="sm"
                />
              </div>
              
              {product.size && (
                <p className="text-xs text-gray-500 mb-2">Size: {product.size}</p>
              )}
              <div className="flex items-center justify-between">
                {product.promotion ? (
                  <div className="space-y-1">
                    <p className="text-red-600 font-bold text-xl">
                      {product.promotion.promotional_price?.toLocaleString('vi-VN')}₫
                    </p>
                    <p className="text-gray-500 text-sm line-through">
                      {product.gia_ban?.toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                ) : (
                  <p className="text-blue-600 font-bold text-xl">
                    {product.gia_ban?.toLocaleString('vi-VN')}₫
                  </p>
                )}
                <button className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-600 transition">
                  Xem
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500 text-xl font-medium">Không tìm thấy sản phẩm</p>
          <p className="text-gray-400 text-sm mt-2">Thử thay đổi bộ lọc để xem thêm sản phẩm</p>
          <button
            onClick={handleResetFilters}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filteredProducts.length > 0 && (
        <div className="mt-8 flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600">
            Trang <span className="font-bold text-blue-600">{currentPage}</span> / {totalPages}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
              }`}
            >
              ← Trước
            </button>
            
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="px-2 py-2 text-gray-400">...</span>
                }
                return null
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
              }`}
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
