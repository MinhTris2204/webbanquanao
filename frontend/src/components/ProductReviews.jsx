import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function ProductReviews({ productId }) {
  const { isAuthenticated, user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [canReview, setCanReview] = useState(false)
  const [availableOrders, setAvailableOrders] = useState([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [formData, setFormData] = useState({
    order_id: '',
    rating: 5,
    comment: ''
  })
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    fetchReviews()
    if (isAuthenticated) {
      checkCanReview()
    }
  }, [productId, isAuthenticated])

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/api/reviews/product/${productId}`)
      setReviews(res.data.reviews || [])
      setAverageRating(res.data.average_rating || 0)
      setTotalReviews(res.data.total || 0)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setReviews([])
      setAverageRating(0)
      setTotalReviews(0)
    }
  }

  const checkCanReview = async () => {
    try {
      const res = await api.get(`/api/reviews/user/can-review/${productId}`)
      setCanReview(res.data.can_review)
      if (res.data.orders) {
        setAvailableOrders(res.data.orders)
        if (res.data.orders.length > 0) {
          setFormData({ ...formData, order_id: res.data.orders[0].id })
        }
      }
    } catch (err) {
      console.error('Error checking review permission:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingReview) {
        // Update existing review
        await api.put(`/api/reviews/${editingReview.id}`, {
          rating: formData.rating,
          comment: formData.comment
        })
        setMessage({ text: '✅ Cập nhật đánh giá thành công!', type: 'success' })
      } else {
        // Create new review
        await api.post(`/api/reviews/product/${productId}`, formData)
        setMessage({ text: '✅ Đánh giá thành công!', type: 'success' })
      }
      setShowReviewForm(false)
      setEditingReview(null)
      setFormData({ order_id: '', rating: 5, comment: '' })
      fetchReviews()
      checkCanReview()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (err) {
      setMessage({ text: err.response?.data?.error || '❌ Có lỗi xảy ra', type: 'error' })
    }
  }

  const handleEdit = (review) => {
    setEditingReview(review)
    setFormData({
      order_id: review.order_id,
      rating: review.rating,
      comment: review.comment || ''
    })
    setShowReviewForm(true)
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Bạn có chắc muốn xóa đánh giá này?')) return
    
    try {
      await api.delete(`/api/reviews/${reviewId}`)
      setMessage({ text: '✅ Xóa đánh giá thành công!', type: 'success' })
      fetchReviews()
      checkCanReview()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (err) {
      setMessage({ text: err.response?.data?.error || '❌ Có lỗi xảy ra', type: 'error' })
    }
  }

  const canEditReview = (review) => {
    if (!user || review.user_id !== user.user_id) return false
    
    // Allow edit within 24 hours
    const reviewDate = new Date(review.created_at)
    const now = new Date()
    const hoursDiff = (now - reviewDate) / (1000 * 60 * 60)
    return hoursDiff < 24
  }

  const handleCancelEdit = () => {
    setShowReviewForm(false)
    setEditingReview(null)
    setFormData({ order_id: '', rating: 5, comment: '' })
  }

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate && onRate(star)}
            className={`text-2xl ${interactive ? 'cursor-pointer hover:scale-110 transition' : ''} ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-8">
      {/* Rating Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">⭐ Đánh giá sản phẩm</h3>
        <div className="flex items-center gap-6 mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-yellow-500">{averageRating.toFixed(1)}</div>
            <div className="flex justify-center my-2">
              {renderStars(Math.round(averageRating))}
            </div>
            <div className="text-sm text-gray-600">{totalReviews} đánh giá</div>
          </div>
          
          {isAuthenticated && canReview && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="ml-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              ✍️ Viết đánh giá
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="font-bold text-lg mb-4">
              {editingReview ? '✏️ Chỉnh sửa đánh giá' : '✍️ Viết đánh giá của bạn'}
            </h4>
            
            {!editingReview && availableOrders.length > 1 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Chọn đơn hàng</label>
                <select
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  {availableOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      Đơn hàng #{order.id} - {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Đánh giá của bạn</label>
              {renderStars(formData.rating, true, (rating) => setFormData({ ...formData, rating }))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Nhận xét (tùy chọn)</label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg"
                rows="4"
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              />
            </div>

            {message.text && (
              <div className={`mb-4 p-3 rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                {editingReview ? 'Cập nhật' : 'Gửi đánh giá'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <p>Chưa có đánh giá nào cho sản phẩm này</p>
            {isAuthenticated && canReview && (
              <p className="text-sm mt-2">Hãy là người đầu tiên đánh giá!</p>
            )}
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-gray-800">{review.user_name}</div>
                    {new Date(review.updated_at).getTime() > new Date(review.created_at).getTime() + 1000 && (
                      <span className="text-xs text-gray-500 italic">(đã chỉnh sửa)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {renderStars(review.rating)}
                  {user && canEditReview(review) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(review)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                        title="Chỉnh sửa (trong 24h)"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-semibold"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="text-gray-700 leading-relaxed mb-3">{review.comment}</p>
              )}
              
              {/* Admin Reply */}
              {review.reply && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      💬 PHẢN HỒI TỪ SHOP
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.reply.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="text-gray-800 leading-relaxed font-medium">{review.reply.reply}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
