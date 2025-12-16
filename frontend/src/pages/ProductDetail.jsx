import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import ProductReviews from '../components/ProductReviews'
import RecommendedProducts from '../components/RecommendedProducts'

// Size Guide Component
function SizeGuide({ productType, gender }) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Determine if product uses number sizes (pants) or letter sizes (shirts, etc.)
  const isPants = productType === 'Quần'
  const isAccessory = productType === 'Phụ kiện'
  
  if (isAccessory) return null // No size guide for accessories
  
  const shirtSizesMale = [
    { size: 'S', height: '160-165', weight: '50-55' },
    { size: 'M', height: '165-170', weight: '55-62' },
    { size: 'L', height: '170-175', weight: '62-70' },
    { size: 'XL', height: '175-180', weight: '70-78' },
    { size: 'XXL', height: '180-185', weight: '78-85' },
  ]
  
  const shirtSizesFemale = [
    { size: 'S', height: '150-155', weight: '42-48' },
    { size: 'M', height: '155-160', weight: '48-54' },
    { size: 'L', height: '160-165', weight: '54-60' },
    { size: 'XL', height: '165-170', weight: '60-66' },
  ]
  
  const pantsSizesMale = [
    { size: '28', height: '160-165', weight: '50-55', waist: '70-72' },
    { size: '29', height: '163-168', weight: '53-58', waist: '72-74' },
    { size: '30', height: '165-170', weight: '58-63', waist: '74-76' },
    { size: '31', height: '168-173', weight: '63-68', waist: '76-78' },
    { size: '32', height: '170-175', weight: '68-73', waist: '78-80' },
    { size: '33', height: '173-178', weight: '73-78', waist: '80-82' },
    { size: '34', height: '175-180', weight: '78-83', waist: '82-84' },
    { size: '36', height: '178-185', weight: '83-90', waist: '86-90' },
  ]
  
  const pantsSizesFemale = [
    { size: '26', height: '150-155', weight: '42-47', waist: '62-64' },
    { size: '27', height: '153-158', weight: '47-50', waist: '64-66' },
    { size: '28', height: '155-160', weight: '50-54', waist: '66-68' },
    { size: '29', height: '158-163', weight: '54-58', waist: '68-70' },
    { size: '30', height: '160-165', weight: '58-62', waist: '70-72' },
    { size: '31', height: '163-168', weight: '62-66', waist: '72-74' },
    { size: '32', height: '165-170', weight: '66-70', waist: '74-76' },
  ]
  
  // Select appropriate size chart
  let sizeData = []
  let title = ''
  
  if (isPants) {
    if (gender === 'Nam') {
      sizeData = pantsSizesMale
      title = 'Bảng size quần Nam'
    } else if (gender === 'Nữ') {
      sizeData = pantsSizesFemale
      title = 'Bảng size quần Nữ'
    } else {
      // Unisex - show both
      sizeData = pantsSizesMale
      title = 'Bảng size quần'
    }
  } else {
    if (gender === 'Nam') {
      sizeData = shirtSizesMale
      title = 'Bảng size áo Nam'
    } else if (gender === 'Nữ') {
      sizeData = shirtSizesFemale
      title = 'Bảng size áo Nữ'
    } else {
      sizeData = shirtSizesMale
      title = 'Bảng size'
    }
  }
  
  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        📏 Hướng dẫn chọn size
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
          <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
            📐 {title}
          </h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-3 text-left rounded-tl-lg">Size</th>
                  <th className="px-4 py-3 text-left">Chiều cao (cm)</th>
                  <th className="px-4 py-3 text-left">Cân nặng (kg)</th>
                  {isPants && <th className="px-4 py-3 text-left rounded-tr-lg">Vòng eo (cm)</th>}
                </tr>
              </thead>
              <tbody>
                {sizeData.map((row, idx) => (
                  <tr key={row.size} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                    <td className="px-4 py-3 font-bold text-blue-600">{row.size}</td>
                    <td className="px-4 py-3 text-gray-700">{row.height}</td>
                    <td className="px-4 py-3 text-gray-700">{row.weight}</td>
                    {isPants && <td className="px-4 py-3 text-gray-700">{row.waist}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 <strong>Mẹo:</strong> Nếu bạn ở giữa 2 size, nên chọn size lớn hơn để thoải mái hơn.
              {isPants && ' Quần jean co giãn có thể chọn nhỏ hơn 1 size.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

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
    trackProductView()
  }, [id])

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/api/products/${id}`)
      setProduct(res.data)
      // Auto-select first size if available
      if (res.data.size) {
        const sizes = res.data.size.split(/,\s*/).map(s => s.trim()).filter(s => s)
        if (sizes.length > 0) {
          setSelectedSize(sizes[0])
        }
      }
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Không tìm thấy sản phẩm', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const trackProductView = async () => {
    try {
      await api.post('/api/recommendations/track-view', {
        product_id: parseInt(id)
      })
    } catch (err) {
      // Silently fail - tracking is not critical
      console.error('Failed to track view:', err)
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

  // Support both "S, M, L" and "28,29,30" formats
  const availableSizes = product.size ? product.size.split(/,\s*/).map(s => s.trim()).filter(s => s) : []

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
              <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-semibold">
                {product.loai}
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {product.gioi_tinh}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-2">Mã sản phẩm: #{product.products_id}</p>
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
              
              {/* Size Guide */}
              <SizeGuide productType={product.loai} gender={product.gioi_tinh} />
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

      {/* Recommended For You */}
      <div className="mt-16">
        <RecommendedProducts 
          title="🎯 Gợi ý dành cho bạn" 
          limit={8} 
          type="for-you"
        />
      </div>

      {/* Frequently Bought Together */}
      <div className="mt-16">
        <RecommendedProducts 
          title="🛒 Thường được mua cùng nhau" 
          limit={4} 
          type="frequently-bought" 
          productId={product.products_id}
        />
      </div>

      {/* Similar Products */}
      <div className="mt-16">
        <RecommendedProducts 
          title="🔍 Sản phẩm tương tự" 
          limit={8} 
          type="similar" 
          productId={product.products_id}
        />
      </div>
    </div>
  )
}
