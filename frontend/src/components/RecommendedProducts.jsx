import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'
import ProductRating from './ProductRating'

export default function RecommendedProducts({ title = '🎯 Gợi ý dành cho bạn', limit = 12, type = 'for-you', productId = null }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [basedOn, setBasedOn] = useState('')
  const sliderRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    fetchRecommendations()
  }, [type, productId])

  useEffect(() => {
    checkScrollButtons()
  }, [products])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      let endpoint = ''
      switch (type) {
        case 'for-you':
          endpoint = `/api/recommendations/for-you?limit=${limit}`
          break
        case 'similar':
          endpoint = `/api/recommendations/similar/${productId}?limit=${limit}`
          break
        case 'trending':
          endpoint = `/api/recommendations/trending?limit=${limit}`
          break
        default:
          endpoint = `/api/recommendations/for-you?limit=${limit}`
      }
      const res = await api.get(endpoint)
      setProducts(res.data.products || [])
      setBasedOn(res.data.based_on || '')
    } catch (err) {
      console.error('Error fetching recommendations:', err)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const checkScrollButtons = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 300
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
      setTimeout(checkScrollButtons, 300)
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-56 bg-gray-200 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {basedOn && basedOn !== 'no_data' && (
            <p className="text-sm text-gray-600 mt-1">
              {basedOn === 'user_behavior' && '📊 Dựa trên lịch sử xem của bạn'}
              {basedOn === 'trending' && '🔥 Sản phẩm đang thịnh hành'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-2 rounded-full bg-white shadow hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-2 rounded-full bg-white shadow hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {type === 'for-you' && (
            <Link to="/products" className="text-blue-600 hover:text-blue-700 font-semibold text-sm ml-2">
              Xem tất cả →
            </Link>
          )}
        </div>
      </div>

      <div
        ref={sliderRef}
        onScroll={checkScrollButtons}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => (
          <Link
            key={product.products_id}
            to={`/products/${product.products_id}`}
            className="flex-shrink-0 w-56 bg-white rounded-xl shadow hover:shadow-xl transition group relative"
          >
            {product.promotion && (
              <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
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
              <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm h-10">
                {product.ten_san_pham}
              </h3>
              <div className="mb-2">
                <ProductRating 
                  rating={product.rating?.average_rating || 0}
                  reviewCount={product.rating?.review_count || 0}
                  size="xs"
                  showCount={true}
                />
              </div>
              {product.promotion ? (
                <div className="space-y-1">
                  <p className="text-red-600 font-bold text-lg">
                    {product.promotion.promotional_price?.toLocaleString('vi-VN')} đ
                  </p>
                  <p className="text-gray-500 text-xs line-through">
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
    </div>
  )
}
