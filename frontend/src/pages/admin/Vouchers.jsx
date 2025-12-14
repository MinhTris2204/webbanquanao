import { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    min_order_value: '0',
    max_discount: '',
    usage_limit: '',
    start_date: '',
    end_date: '',
    is_active: true
  })

  useEffect(() => {
    fetchVouchers()
  }, [])

  const fetchVouchers = async () => {
    try {
      const res = await api.get('/api/vouchers/admin')
      setVouchers(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingVoucher) {
        await api.put(`/api/vouchers/admin/${editingVoucher.id}`, formData)
      } else {
        await api.post('/api/vouchers/admin', formData)
      }
      setShowForm(false)
      setEditingVoucher(null)
      resetForm()
      fetchVouchers()
    } catch (err) {
      alert('Có lỗi xảy ra')
    }
  }

  const handleEdit = (voucher) => {
    setEditingVoucher(voucher)
    setFormData({
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      min_order_value: voucher.min_order_value || '0',
      max_discount: voucher.max_discount || '',
      usage_limit: voucher.usage_limit || '',
      start_date: voucher.start_date?.split('T')[0] || '',
      end_date: voucher.end_date?.split('T')[0] || '',
      is_active: voucher.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn xóa voucher này?')) {
      try {
        await api.delete(`/api/vouchers/admin/${id}`)
        fetchVouchers()
      } catch (err) {
        alert('Có lỗi xảy ra')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percent',
      discount_value: '',
      min_order_value: '0',
      max_discount: '',
      usage_limit: '',
      start_date: '',
      end_date: '',
      is_active: true
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => {
            setShowForm(true)
            setEditingVoucher(null)
            resetForm()
          }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
        >
          ➕ Thêm Voucher
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {editingVoucher ? '✏️ Sửa Voucher' : '➕ Thêm Voucher'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingVoucher(null)
                  resetForm()
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mã Voucher *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition uppercase"
                  placeholder="VD: GIAM50K"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Loại giảm giá *</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (₫)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Giá trị giảm *</label>
                  <input
                    type="number"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder={formData.discount_type === 'percent' ? '10' : '50000'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Đơn tối thiểu (₫)</label>
                  <input
                    type="number"
                    value={formData.min_order_value}
                    onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Giảm tối đa (₫)</label>
                  <input
                    type="number"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Không giới hạn"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượt sử dụng</label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Không giới hạn"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-semibold text-gray-700">Kích hoạt voucher</label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  {editingVoucher ? '💾 Cập nhật' : '➕ Thêm'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingVoucher(null)
                    resetForm()
                  }}
                  className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Mã</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Giảm giá</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Điều kiện</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Sử dụng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Thời gian</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Trạng thái</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vouchers.map((voucher) => (
                <tr key={voucher.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-blue-600 text-lg">{voucher.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-green-600">
                      {voucher.discount_type === 'percent' 
                        ? `${voucher.discount_value}%` 
                        : `${voucher.discount_value?.toLocaleString('vi-VN')}₫`}
                    </span>
                    {voucher.max_discount && (
                      <div className="text-xs text-gray-500">Tối đa: {voucher.max_discount?.toLocaleString('vi-VN')}₫</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Đơn tối thiểu: {voucher.min_order_value?.toLocaleString('vi-VN')}₫
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-semibold">{voucher.used_count}</span>
                    {voucher.usage_limit && ` / ${voucher.usage_limit}`}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    <div>{new Date(voucher.start_date).toLocaleDateString('vi-VN')}</div>
                    <div>→ {new Date(voucher.end_date).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      voucher.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {voucher.is_active ? '✅ Hoạt động' : '⛔ Tắt'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(voucher)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(voucher.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {vouchers.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎫</div>
            <p className="text-gray-500 text-lg font-medium">Chưa có voucher nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
