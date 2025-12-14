import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import ProductReviews from '../components/ProductReviews'

// Countdown Timer Component
function CountdownTimer({ endDate }) {
  const calculateTimeLeft = () => {
    if (!endDate) return null
    
    const difference = new Date(endDate) - new Date()
    
    if (difference <= 0 || isNaN(difference)) {
      return null
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    }
  }

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  // Don't render anything if expired
  if (!timeLeft) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-gray-700">⏰ Kết thúc sau:</span>
      <div className="flex gap-1">
        {timeLeft.days > 0 && (
          <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm">
            {timeLeft.days} ngày
          </div>
        )}
        <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm">
          {String(timeLeft.hours).padStart(2, '0')} giờ
        </div>
        <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm">
          {String(timeLeft.minutes).padStart(2, '0')} phút
        </div>
        <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm animate-pulse">
          {String(timeLeft.seconds).padStart(2, '0')} giây
        </div>
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { fetchCartCount } = useCart()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/api/products/${id}`)
      setProduct(res.data)
      // Auto-select first size if available
      if (res.data.size) {
        const sizes = res.data.size.split(', ')
        setSelectedSize(sizes[0])
      }
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Không tìm thấy sản phẩm', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (product.size && !selectedSize) {
      setMessage({ text: 'Vui lòng chọn size!', type: 'error' })
      return
    }

    try {
      await api.post('/api/cart/add', {
        product_id: product.products_id,
        quantity,
        selected_size: selectedSize
      })
      fetchCartCount() // Refresh cart count
      setMessage({ text: '✅ Đã thêm vào giỏ hàng!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (err) {
      setMessage({ text: '❌ Có lỗi xảy ra', type: 'error' })
    }
  }

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (product.size && !selectedSize) {
      setMessage({ text: 'Vui lòng chọn size!', type: 'error' })
      return
    }

    try {
      // Add to cart first
      await api.post('/api/cart/add', {
        product_id: product.products_id,
        quantity,
        selected_size: selectedSize
      })
      fetchCartCount() // Refresh cart count
      // Go directly to checkout
      navigate('/checkout')
    } catch (err) {
      setMessage({ text: '❌ Có lỗi xảy ra', type: 'error' })
    }
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

  if (!product) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-gray-500 text-xl">Không tìm thấy sản phẩm</p>
      </div>
    )
  }

  const availableSizes = product.size ? product.size.split(', ') : []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-600">
        <button onClick={() => navigate('/products')} className="hover:text-blue-600">
          Sản phẩm
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-800 font-medium">{product.ten_san_pham}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="relative">
          <img
            src={product.hinh_anh || 'https://via.placeholder.com/600'}
            alt={product.ten_san_pham}
            className="w-full rounded-2xl shadow-2xl"
          />
          {product.trang_thai === 'Het_hang' && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
              Hết hàng
            </div>
          )}
          {product.trang_thai === 'Con_hang' && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
              Còn hàng
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                {product.loai}
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {product.gioi_tinh}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gray-800">{product.ten_san_pham}</h1>
            {product.promotion ? (
              <div className="space-y-3 mb-6">
                {/* Countdown Timer */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-red-700 mb-1">🔥 FLASH SALE</p>
                      <CountdownTimer endDate={product.promotion.end_date} />
                    </div>
                    <div className="text-right">
                      <span className="bg-red-600 text-white px-4 py-2 rounded-full text-lg font-bold shadow-lg">
                        -{Math.round(((product.gia_ban - product.promotion.promotional_price) / product.gia_ban) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Price */}
                <div className="flex items-center gap-3">
                  <p className="text-4xl text-red-600 font-bold">
                    {product.promotion.promotional_price?.toLocaleString('vi-VN')}₫
                  </p>
                </div>
                <p className="text-xl text-gray-500 line-through">
                  Giá gốc: {product.gia_ban?.toLocaleString('vi-VN')}₫
                </p>
                <p className="text-lg text-green-600 font-semibold">
                  🎉 Tiết kiệm {(product.gia_ban - product.promotion.promotional_price)?.toLocaleString('vi-VN')}₫
                </p>
              </div>
            ) : (
              <p className="text-4xl text-blue-600 font-bold mb-6">
                {product.gia_ban?.toLocaleString('vi-VN')}₫
              </p>
            )}
          </div>

          {/* Product Details */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-3">
            {product.chat_lieu && (
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-32">Chất liệu:</span>
                <span className="text-gray-600">{product.chat_lieu}</span>
              </div>
            )}
            {product.size && (
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-32">Size có sẵn:</span>
                <span className="text-gray-600">{product.size}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {product.mo_ta && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-xl mb-3 text-gray-800">📝 Mô tả sản phẩm:</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.mo_ta}</p>
            </div>
          )}

          {/* Size Selection */}
          {availableSizes.length > 0 && (
            <div>
              <label className="block font-bold text-lg mb-3 text-gray-800">
                Chọn size: <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      selectedSize === size
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block font-bold text-lg mb-3 text-gray-800">Số lượng:</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 bg-gray-200 rounded-lg font-bold text-xl hover:bg-gray-300 transition"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 bg-gray-200 rounded-lg font-bold text-xl hover:bg-gray-300 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`px-6 py-4 rounded-xl font-semibold ${
              message.type === 'success' 
                ? 'bg-green-100 border-2 border-green-400 text-green-700' 
                : 'bg-red-100 border-2 border-red-400 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              disabled={product.trang_thai === 'Het_hang'}
              className={`flex-1 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                product.trang_thai === 'Het_hang'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              🛒 Thêm vào giỏ
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.trang_thai === 'Het_hang'}
              className={`flex-1 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                product.trang_thai === 'Het_hang'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              ⚡ Mua ngay
            </button>
          </div>
        </div>
      </div>

      {/* Product Reviews */}
      <ProductReviews productId={product.products_id} />
    </div>
  )
}
