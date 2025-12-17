import { useState, useEffect } from 'react'
import api, { getImageUrl } from '../../utils/api'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReviews, setTotalReviews] = useState(0)
  const [ratingFilter, setRatingFilter] = useState(0)
  const [replyFilter, setReplyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [editingReply, setEditingReply] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })
  const [alerts, setAlerts] = useState([])
  const [showFilters, setShowFilters] = useState(true)

  useEffect(() => {
    fetchReviews()
    fetchAlerts()
  }, [currentPage, ratingFilter, replyFilter, sortBy])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
  }

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        per_page: 20,
        sort_by: sortBy
      }
      if (ratingFilter > 0) params.rating = ratingFilter
      if (replyFilter !== 'all') params.has_reply = replyFilter

      const res = await api.get('/api/reviews/admin/all', { params })
      setReviews(res.data.reviews)
      setTotalPages(res.data.pages)
      setTotalReviews(res.data.total)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      showToast('Không thể tải đánh giá', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/api/reviews/admin/alerts')
      setAlerts(res.data.alerts)
    } catch (err) {
      console.error('Error fetching alerts:', err)
    }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Bạn có chắc muốn xóa đánh giá này? Hành động này không thể hoàn tác.')) return

    try {
      await api.delete(`/api/reviews/${reviewId}`)
      showToast('✅ Xóa đánh giá thành công!')
      fetchReviews()
      fetchAlerts()
    } catch (err) {
      showToast(err.response?.data?.error || 'Có lỗi xảy ra', 'error')
    }
  }

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) {
      showToast('Vui lòng nhập nội dung phản hồi', 'error')
      return
    }

    try {
      if (editingReply) {
        await api.put(`/api/reviews/${reviewId}/reply`, { reply: replyText })
        showToast('✅ Cập nhật phản hồi thành công!')
      } else {
        await api.post(`/api/reviews/${reviewId}/reply`, { reply: replyText })
        showToast('✅ Phản hồi đánh giá thành công!')
      }
      setReplyingTo(null)
      setEditingReply(null)
      setReplyText('')
      fetchReviews()
    } catch (err) {
      showToast(err.response?.data?.error || 'Có lỗi xảy ra', 'error')
    }
  }

  const handleDeleteReply = async (reviewId) => {
    if (!confirm('Bạn có chắc muốn xóa phản hồi này?')) return

    try {
      await api.delete(`/api/reviews/${reviewId}/reply`)
      showToast('✅ Xóa phản hồi thành công!')
      fetchReviews()
    } catch (err) {
      showToast(err.response?.data?.error || 'Có lỗi xảy ra', 'error')
    }
  }

  const startEdit = (review) => {
    setEditingReply(review.reply)
    setReplyingTo(review.id)
    setReplyText(review.reply.reply)
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setEditingReply(null)
    setReplyText('')
  }

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl animate-fade-in ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex gap-6">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{totalReviews}</div>
            <div className="text-sm text-blue-100">Tổng đánh giá</div>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">
              {reviews.filter(r => !r.reply).length}
            </div>
            <div className="text-sm text-blue-100">Chưa phản hồi</div>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">
              {reviews.filter(r => r.reply).length}
            </div>
            <div className="text-sm text-blue-100">Đã phản hồi</div>
          </div>
        </div>
      </div>

      {/* Alerts - Products with many 1-star reviews */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-xl font-bold text-red-800">Cảnh báo: Sản phẩm có nhiều đánh giá 1⭐</h3>
              <p className="text-red-600 text-sm">Các sản phẩm này cần được kiểm tra và xử lý ngay</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <div key={alert.product_id} className="bg-white rounded-lg p-4 border-2 border-red-300 hover:shadow-lg transition">
                <div className="flex gap-3">
                  {alert.product_image && (
                    <img 
                      src={alert.product_image} 
                      alt={alert.product_name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2">{alert.product_name}</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                        {alert.recent_one_star} đánh giá 1⭐ (7 ngày)
                      </span>
                      <span className="text-gray-500">
                        Tổng: {alert.total_one_star}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">🔍 Bộ lọc & Sắp xếp</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-semibold text-sm"
          >
            <span>{showFilters ? '👁️ Ẩn' : '👁️ Hiện'}</span>
            <span>{showFilters ? '▲' : '▼'}</span>
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">Lọc theo số sao</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setRatingFilter(0)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  ratingFilter === 0
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              {[5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    setRatingFilter(star)
                    setCurrentPage(1)
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    ratingFilter === star
                      ? 'bg-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {star}⭐
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">Lọc theo trạng thái phản hồi</label>
            <select
              value={replyFilter}
              onChange={(e) => {
                setReplyFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
            >
              <option value="all">📋 Tất cả đánh giá</option>
              <option value="false">⏳ Chưa phản hồi</option>
              <option value="true">✅ Đã phản hồi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">Sắp xếp theo</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-semibold"
            >
              <option value="newest">🕐 Mới nhất</option>
              <option value="oldest">🕑 Cũ nhất</option>
              <option value="highest">⭐ Đánh giá cao nhất</option>
              <option value="lowest">⭐ Đánh giá thấp nhất</option>
            </select>
          </div>
        </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải đánh giá...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Không có đánh giá nào</h3>
            <p className="text-gray-500">
              {ratingFilter > 0 || replyFilter !== 'all' 
                ? 'Thử thay đổi bộ lọc để xem thêm đánh giá'
                : 'Chưa có đánh giá nào từ khách hàng'}
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
              {/* Product Info */}
              {review.product && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                  <div className="flex gap-4">
                    {review.product.hinh_anh && (
                      <img 
                        src={getImageUrl(review.product.hinh_anh)} 
                        alt={review.product.ten_san_pham}
                        className="w-20 h-20 object-cover rounded-lg shadow-md"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800 mb-1">{review.product.ten_san_pham}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>Giá: {parseFloat(review.product.gia_ban).toLocaleString('vi-VN')}₫</span>
                            <span>•</span>
                            <span>Loại: {review.product.loai}</span>
                            {review.product.rating && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <span className="text-yellow-500">⭐</span>
                                  {review.product.rating.average_rating} ({review.product.rating.total_reviews} đánh giá)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                      {review.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{review.user_name}</div>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Delete Review Button - only show if review has comment */}
                {review.comment && review.comment.trim() && (
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 border-2 border-red-200"
                    title="Xóa bình luận tiêu cực"
                  >
                    <span>🗑️</span>
                    <span>Xóa bình luận</span>
                  </button>
                )}
              </div>

              {/* Review Comment */}
              {review.comment && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                </div>
              )}

              {/* Admin Reply Section */}
              {review.reply ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-5 mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        💬 PHẢN HỒI TỪ SHOP
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.reply.created_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {new Date(review.reply.updated_at).getTime() > new Date(review.reply.created_at).getTime() + 1000 && (
                        <span className="text-xs text-gray-500 italic">(đã chỉnh sửa)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(review)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition flex items-center gap-1"
                      >
                        <span>✏️</span>
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => handleDeleteReply(review.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition flex items-center gap-1"
                      >
                        <span>🗑️</span>
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 leading-relaxed font-medium">{review.reply.reply}</p>
                </div>
              ) : (
                !replyingTo || replyingTo !== review.id ? (
                  <div className="border-t pt-4">
                    <button
                      onClick={() => setReplyingTo(review.id)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold text-sm shadow-lg flex items-center gap-2"
                    >
                      <span>💬</span>
                      <span>Phản hồi đánh giá này</span>
                    </button>
                  </div>
                ) : null
              )}

              {/* Reply Form */}
              {replyingTo === review.id && (
                <div className="bg-gradient-to-r from-gray-50 to-cyan-50 rounded-lg p-5 mt-4 border-2 border-cyan-200">
                  <label className="block text-sm font-bold mb-3 text-gray-800 flex items-center gap-2">
                    <span>{editingReply ? '✏️' : '💬'}</span>
                    <span>{editingReply ? 'Chỉnh sửa phản hồi' : 'Viết phản hồi của bạn'}</span>
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    rows="4"
                    placeholder="Nhập phản hồi của bạn cho khách hàng..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReply(review.id)}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold shadow-lg flex items-center gap-2"
                    >
                      <span>{editingReply ? '✅' : '📤'}</span>
                      <span>{editingReply ? 'Cập nhật phản hồi' : 'Gửi phản hồi'}</span>
                    </button>
                    <button
                      onClick={cancelReply}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-semibold"
            >
              ← Trước
            </button>
            <div className="flex items-center gap-2">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="text-gray-400">...</span>
                }
                return null
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-semibold"
            >
              Sau →
            </button>
          </div>
          <div className="text-center mt-3 text-sm text-gray-600">
            Trang {currentPage} / {totalPages} • Tổng {totalReviews} đánh giá
          </div>
        </div>
      )}
    </div>
  )
}
