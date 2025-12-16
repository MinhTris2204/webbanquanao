import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useToast } from '../../components/Toast'

export default function AdminStoreInfo() {
  const toast = useToast()
  const [storeInfos, setStoreInfos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingInfo, setEditingInfo] = useState(null)
  const [form, setForm] = useState({
    key: '',
    title: '',
    content: '',
    is_active: true
  })

  useEffect(() => {
    fetchStoreInfos()
  }, [])

  const fetchStoreInfos = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/store-info/admin/all')
      setStoreInfos(res.data)
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi tải thông tin cửa hàng')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingInfo(null)
    setForm({
      key: '',
      title: '',
      content: '',
      is_active: true
    })
    setShowModal(true)
  }

  const openEditModal = (info) => {
    setEditingInfo(info)
    setForm({
      key: info.key,
      title: info.title,
      content: info.content,
      is_active: info.is_active
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingInfo) {
        await api.put(`/api/store-info/admin/${editingInfo.id}`, form)
        toast.success('Cập nhật thông tin thành công!')
      } else {
        await api.post('/api/store-info/admin', form)
        toast.success('Tạo thông tin thành công!')
      }
      setShowModal(false)
      fetchStoreInfos()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra')
    }
  }

  const deleteInfo = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông tin này?')) return
    
    try {
      await api.delete(`/api/store-info/admin/${id}`)
      toast.success('Xóa thông tin thành công!')
      fetchStoreInfos()
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi xóa thông tin')
    }
  }

  const getKeyLabel = (key) => {
    const labels = {
      about_us: '📖 Giới thiệu',
      privacy_policy: '🔒 Chính sách bảo mật',
      terms_conditions: '📜 Điều khoản',
      shipping_policy: '🚚 Vận chuyển',
      return_policy: '↩️ Đổi trả',
      contact_info: '📞 Liên hệ',
      payment_methods: '💳 Thanh toán',
      warranty_policy: '🛡️ Bảo hành',
      faq: '❓ FAQ',
      size_guide: '📏 Hướng dẫn chọn size'
    }
    return labels[key] || key
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
        >
          ➕ Thêm thông tin mới
        </button>
      </div>

      {/* Store Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeInfos.map((info) => (
          <div key={info.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">{getKeyLabel(info.key)}</h3>
              <p className="text-blue-100 text-sm mt-1">{info.title}</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 line-clamp-4">{info.content}</p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  info.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {info.is_active ? '✅ Đang hiển thị' : '❌ Đã ẩn'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(info)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  ✏️ Sửa
                </button>
                <button
                  onClick={() => deleteInfo(info.id)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {storeInfos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg">Chưa có thông tin nào</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingInfo ? '✏️ Sửa thông tin' : '➕ Thêm thông tin mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Loại thông tin</label>
                  <select
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={editingInfo !== null}
                  >
                    <option value="">-- Chọn loại thông tin --</option>
                    <option value="about_us">📖 Giới thiệu về cửa hàng</option>
                    <option value="privacy_policy">🔒 Chính sách bảo mật</option>
                    <option value="terms_conditions">📜 Điều khoản và điều kiện</option>
                    <option value="shipping_policy">🚚 Chính sách vận chuyển</option>
                    <option value="return_policy">↩️ Chính sách đổi trả</option>
                    <option value="contact_info">📞 Thông tin liên hệ</option>
                    <option value="payment_methods">💳 Phương thức thanh toán</option>
                    <option value="warranty_policy">🛡️ Chính sách bảo hành</option>
                    <option value="faq">❓ Câu hỏi thường gặp</option>
                    <option value="size_guide">📏 Hướng dẫn chọn size</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Không thể thay đổi sau khi tạo</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tiêu đề</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập tiêu đề..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nội dung</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="10"
                    placeholder="Nhập nội dung..."
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-semibold text-gray-700">
                    Hiển thị công khai
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  💾 {editingInfo ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
