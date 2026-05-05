import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'
import RecommendedProducts from '../components/RecommendedProducts'
import ProductRating from '../components/ProductRating'
import WeatherWidget from '../components/WeatherWidget'

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingBestSellers, setLoadingBestSellers] = useState(true)
  const [bestSellerPeriod, setBestSellerPeriod] = useState('month')

  // Các slide banner
  const slides = [
    {
      title: 'Bộ Sưu Tập Mùa Hè 2024',
      subtitle: 'Thoải mái - Năng động - Phong cách',
      description: 'Khám phá những xu hướng thời trang mới nhất',
      cta: 'Mua ngay',
      link: '/products',
      bg: 'from-blue-500 to-blue-700'
    },
    {
      title: 'Giảm Giá Đến 50%',
      subtitle: 'Chương trình khuyến mãi đặc biệt',
      description: 'Áp dụng cho tất cả sản phẩm trong tuần này',
      cta: 'Xem ưu đãi',
      link: '/products',
      bg: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Thời Trang Công Sở',
      subtitle: 'Lịch sự - Sang trọng - Chuyên nghiệp',
      description: 'Bộ sưu tập dành riêng cho dân văn phòng',
      cta: 'Khám phá',
      link: '/products?category=Áo',
      bg: 'from-cyan-500 to-blue-600'
    }
  ]

  // Tự động chuyển slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Lấy sản phẩm sale (sản phẩm có khuyến mãi đang hoạt động)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/api/products?per_page=100')
        // Chỉ lọc sản phẩm có khuyến mãi đang hoạt động
        const saleProducts = (res.data.products || []).filter(p => p.promotion && p.promotion.promotional_price)
        setFeaturedProducts(saleProducts.slice(0, 8))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  // Lấy sản phẩm bán chạy
  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        setLoadingBestSellers(true)
        const res = await api.get(`/api/products/best-sellers?limit=8&period=${bestSellerPeriod}`)
        setBestSellers(res.data.products || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingBestSellers(false)
      }
    }
    fetchBestSellers()
  }, [bestSellerPeriod])

  const categories = [
    { name: 'Áo', icon: '👕', link: '/products?category=Áo' },
    { name: 'Quần', icon: '👖', link: '/products?category=Quần' },
    { name: 'Váy', icon: '👗', link: '/products?category=Váy' },
    { name: 'Đầm', icon: '👘', link: '/products?category=Đầm' },
    { name: 'Áo khoác', icon: '🧥', link: '/products?category=Áo khoác' },
    { name: 'Phụ kiện', icon: '👜', link: '/products?category=Phụ kiện' }
  ]

  return (
    <div>
      {/* Hero Banner Carousel */}
      <div className="relative h-[500px] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <div className={`h-full bg-gradient-to-r ${slide.bg} flex items-center`}>
              <div className="max-w-7xl mx-auto px-4 w-full">
                <div className="max-w-2xl text-white">
                  <h1 className="text-5xl md:text-6xl font-bold mb-4 animate-fade-in">
                    {slide.title}
                  </h1>
                  <p className="text-2xl md:text-3xl mb-2 font-semibold">
                    {slide.subtitle}
                  </p>
                  <p className="text-lg md:text-xl mb-8 text-white/90">
                    {slide.description}
                  </p>
                  <Link
                    to={slide.link}
                    className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-bold hover:bg-gray-100 transition shadow-lg"
                  >
                    {slide.cta} →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                }`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weather Widget */}
      <div className="max-w-7xl mx-auto px-4 mt-8 relative z-20">
        <WeatherWidget />
      </div>

      {/* Categories Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Danh mục sản phẩm</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={category.link}
                className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition text-center group"
              >
                <div className="text-5xl mb-3 group-hover:scale-110 transition">{category.icon}</div>
                <h3 className="font-bold text-gray-800">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold">🔥 Sản phẩm bán chạy</h2>
            <p className="text-gray-600 mt-2">Được yêu thích nhất bởi khách hàng</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { value: 'day', label: 'Hôm nay' },
              { value: 'month', label: 'Tháng này' },
              { value: 'year', label: 'Năm nay' },
              { value: 'all', label: 'Tất cả' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBestSellerPeriod(opt.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                  bestSellerPeriod === opt.value
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Link to="/products" className="text-blue-600 hover:text-blue-700 font-semibold hidden sm:block">
            Xem tất cả →
          </Link>
        </div>

        {loadingBestSellers ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : bestSellers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chưa có dữ liệu bán hàng trong khoảng thời gian này</p>
            <button
              onClick={() => setBestSellerPeriod('all')}
              className="text-blue-600 hover:text-blue-700 font-semibold mt-3 inline-block"
            >
              Xem tất cả thời gian →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {bestSellers.map((product, index) => (
              <Link
                key={product.products_id}
                to={`/products/${product.products_id}`}
                className="bg-white rounded-xl shadow hover:shadow-xl transition group relative"
              >
                {/* Best Seller Badge */}
                {index < 3 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                    Top {index + 1}
                  </div>
                )}
                {/* Promotion Badge */}
                {product.promotion && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold z-10">
                    -{Math.round(((product.gia_ban - product.promotion.promotional_price) / product.gia_ban) * 100)}%
                  </div>
                )}
                <div className="aspect-square overflow-hidden rounded-t-xl bg-gray-100">
                  <img
                    src={getImageUrl(product.hinh_anh) || 'https://via.placeholder.com/300'}
                    alt={product.ten_san_pham}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1">ID: #{product.products_id}</p>
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                    {product.ten_san_pham}
                  </h3>

                  {/* Rating và Số lượng đã bán */}
                  <div className="flex items-center gap-2 mb-2">
                    <ProductRating
                      rating={product.rating?.average_rating || 0}
                      reviewCount={product.rating?.review_count || 0}
                      size="xs"
                      showCount={false}
                    />
                    {product.total_sold > 0 && (
                      <span className="text-xs text-gray-600">
                        Đã bán <span className="font-semibold text-orange-600">{product.total_sold}</span>
                      </span>
                    )}
                  </div>

                  {product.promotion ? (
                    <div className="space-y-1">
                      <p className="text-red-600 font-bold text-lg">
                        {product.promotion.promotional_price?.toLocaleString('vi-VN')} đ
                      </p>
                      <p className="text-gray-500 text-sm line-through">
                        {product.gia_ban?.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  ) : (
                    <p className="text-blue-600 font-bold text-lg">
                      {product.gia_ban?.toLocaleString('vi-VN')} đ
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sale Products */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold">🔥 Sản phẩm Sale</h2>
              <p className="text-gray-600 mt-2">Giảm giá đặc biệt - Số lượng có hạn</p>
            </div>
            <Link to="/products?on_sale=true" className="text-blue-600 hover:text-blue-700 font-semibold">
              Xem tất cả →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl h-80 animate-pulse" />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Hiện chưa có sản phẩm sale nào</p>
              <Link to="/products" className="text-blue-600 hover:text-blue-700 font-semibold mt-4 inline-block">
                Xem tất cả sản phẩm →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Link
                  key={product.products_id}
                  to={`/products/${product.products_id}`}
                  className="bg-white rounded-xl shadow hover:shadow-xl transition group relative"
                >
                  {/* Promotion Badge */}
                  {product.promotion && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10 animate-pulse">
                      -{Math.round(((product.gia_ban - product.promotion.promotional_price) / product.gia_ban) * 100)}%
                    </div>
                  )}
                  <div className="aspect-square overflow-hidden rounded-t-xl bg-gray-100">
                    <img
                      src={getImageUrl(product.hinh_anh) || 'https://via.placeholder.com/300'}
                      alt={product.ten_san_pham}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">ID: #{product.products_id}</p>
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                      {product.ten_san_pham}
                    </h3>

                    {/* Rating và Số lượng đã bán */}
                    <div className="flex items-center gap-2 mb-2">
                      <ProductRating
                        rating={product.rating?.average_rating || 0}
                        reviewCount={product.rating?.review_count || 0}
                        size="xs"
                        showCount={false}
                      />
                      {product.total_sold > 0 && (
                        <span className="text-xs text-gray-600">
                          Đã bán <span className="font-semibold text-orange-600">{product.total_sold}</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-red-600 font-bold text-lg">
                        {product.promotion.promotional_price?.toLocaleString('vi-VN')} đ
                      </p>
                      <p className="text-gray-500 text-sm line-through">
                        {product.gia_ban?.toLocaleString('vi-VN')} đ
                      </p>
                      <p className="text-green-600 text-xs font-semibold">
                        Tiết kiệm {(product.gia_ban - product.promotion.promotional_price)?.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Products */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <RecommendedProducts title="🎯 Gợi ý dành cho bạn" limit={8} type="for-you" />
      </div>

      {/* Promotional Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-green-600 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">🎉 Ưu đãi đặc biệt trong tuần!</h2>
          <p className="text-xl mb-6">Giảm giá lên đến 50% cho tất cả sản phẩm</p>
          <Link
            to="/products"
            className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-bold hover:bg-gray-100 transition shadow-lg"
          >
            Mua sắm ngay
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Chất lượng đảm bảo</h3>
            <p className="text-gray-600">100% hàng chính hãng</p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Giao hàng nhanh</h3>
            <p className="text-gray-600">Toàn quốc 2-3 ngày</p>
          </div>

          <div className="text-center">
            <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Đổi trả dễ dàng</h3>
            <p className="text-gray-600">Trong vòng 7 ngày</p>
          </div>

          <div className="text-center">
            <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Hỗ trợ 24/7</h3>
            <p className="text-gray-600">Luôn sẵn sàng hỗ trợ</p>
          </div>
        </div>
      </div>
    </div>
  )
}
