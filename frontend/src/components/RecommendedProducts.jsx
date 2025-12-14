import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function RecommendedProducts({ title = '🎯 Gợi ý dành cho bạn', limit = 8, type = 'for-you', productId = null }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [basedOn, setBasedOn] = useState('')

  useEffect(() => {
    fetchRecommendations()
  }, [type, productId])

  const fetchRecommendations = async () => {
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
        case 'frequently-bought':
          endpoint = `/api/recommendations/frequently-bought-together/${productId}?limit=${limit}`
          break
        default:
          endpoint = `/api/recommendations/for-you?limit=${limit}`
      }
      
      const res = await api.get(endpoint)
      setProducts(res.data.products || [])
      setBasedOn(res.data.based_on || '')
    } catch (err) {
      console.error('Error fetching recommendations:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {basedOn && (
            <p className="text-sm text-gray-600 mt-1">
              {basedOn === 'user_behavior' && '📊 Dựa trên lịch sử xem của bạn'}
              {basedOn === 'trending' && '🔥 Sản phẩm đang thịnh hành'}
              {basedOn === 'similar_category' && '🔍 Sản phẩm cùng danh mục'}
              {basedOn === 'frequently_bought_together' && '🛒 Thường được mua cùng nhau'}
            </p>
          )}
        </div>
        {type === 'for-you' && (
          <Link to="/products" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
            Xem tất cả →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link
            key={product.products_id}
            to={`/products/${product.products_id}`}
            className="bg-white rounded-xl shadow hover:shadow-xl transition group relative"
          >
            {/* Promotion Badge */}
            {product.promotion && (
              <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                -{Math.round(((product.gia_ban - product.promotion.promotional_price) / product.gia_ban) * 100)}%
              </div>
            )}
            
            <div className="aspect-square overflow-hidden rounded-t-xl bg-gray-100">
              <img
                src={product.hinh_anh || 'https://via.placeholder.com/300'}
                alt={product.ten_san_pham}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
              />
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm">
                {product.ten_san_pham}
              </h3>
              
              {/* Rating */}
              {product.rating && (
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(product.rating.average_rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 fill-current'
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">
                    {product.rating.average_rating}
                  </span>
                </div>
              )}
              
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
