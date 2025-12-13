import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/api/products/${id}`)
      setProduct(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      await api.post('/api/cart/add', {
        product_id: product.products_id,
        quantity
      })
      setMessage('Đã thêm vào giỏ hàng!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Có lỗi xảy ra')
    }
  }

  if (!product) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            src={product.hinh_anh || 'https://via.placeholder.com/500'}
            alt={product.ten_san_pham}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-4">{product.ten_san_pham}</h1>
          <p className="text-3xl text-blue-600 font-bold mb-4">
            {product.gia_ban?.toLocaleString('vi-VN')} đ
          </p>

          {product.mo_ta && (
            <div className="mb-4">
              <h3 className="font-bold mb-2">Mô tả:</h3>
              <p className="text-gray-700">{product.mo_ta}</p>
            </div>
          )}

          {product.size && (
            <p className="mb-2"><span className="font-bold">Size:</span> {product.size}</p>
          )}

          {product.chat_lieu && (
            <p className="mb-4"><span className="font-bold">Chất liệu:</span> {product.chat_lieu}</p>
          )}

          <div className="mb-4">
            <label className="block font-bold mb-2">Số lượng:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-20 px-3 py-2 border rounded"
            />
          </div>

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          <button
            onClick={handleAddToCart}
            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 w-full"
          >
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  )
}
