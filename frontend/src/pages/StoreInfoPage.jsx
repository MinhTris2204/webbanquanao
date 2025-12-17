import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../utils/api'

export default function StoreInfoPage() {
  const { key } = useParams()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (key) {
      setInfo(null) // Reset để hiển thị loading
      setLoading(true)
      window.scrollTo(0, 0) // Cuộn lên đầu khi key thay đổi
      fetchInfo()
    }
  }, [key])

  const fetchInfo = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/store-info/${key}`)
      setInfo(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (key) => {
    const icons = {
      about_us: '📖',
      privacy_policy: '🔒',
      terms_conditions: '📜',
      shipping_policy: '🚚',
      return_policy: '↩️',
      contact_info: '📞',
      payment_methods: '💳',
      warranty_policy: '🛡️',
      faq: '❓',
      size_guide: '📏'
    }
    return icons[key] || '📄'
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

  if (!info) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy thông tin</h2>
          <p className="text-gray-600">Thông tin bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center mb-4">
          <span className="text-5xl mr-4">{getIcon(info.key)}</span>
          <h1 className="text-3xl font-bold">{info.title}</h1>
        </div>
        <p className="text-blue-100">Cập nhật lần cuối: {new Date(info.updated_at).toLocaleDateString('vi-VN')}</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="prose max-w-none">
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {info.content}
          </div>
        </div>
      </div>

      {/* Size Guide Visual Tables */}
      {info.key === 'size_guide' && (
        <div className="mt-8 space-y-8">
          {/* Shirt Sizes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              👕 Bảng size Áo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Male */}
              <div>
                <h4 className="font-semibold text-blue-600 mb-3">👨 Nam</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-500 text-white">
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-left">Chiều cao</th>
                      <th className="px-3 py-2 text-left">Cân nặng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: 'S', height: '160-165cm', weight: '50-55kg' },
                      { size: 'M', height: '165-170cm', weight: '55-62kg' },
                      { size: 'L', height: '170-175cm', weight: '62-70kg' },
                      { size: 'XL', height: '175-180cm', weight: '70-78kg' },
                      { size: 'XXL', height: '180-185cm', weight: '78-85kg' },
                    ].map((row, idx) => (
                      <tr key={row.size} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-3 py-2 font-bold text-blue-600">{row.size}</td>
                        <td className="px-3 py-2">{row.height}</td>
                        <td className="px-3 py-2">{row.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Female */}
              <div>
                <h4 className="font-semibold text-rose-600 mb-3">👩 Nữ</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-rose-500 text-white">
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-left">Chiều cao</th>
                      <th className="px-3 py-2 text-left">Cân nặng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: 'S', height: '150-155cm', weight: '42-48kg' },
                      { size: 'M', height: '155-160cm', weight: '48-54kg' },
                      { size: 'L', height: '160-165cm', weight: '54-60kg' },
                      { size: 'XL', height: '165-170cm', weight: '60-66kg' },
                    ].map((row, idx) => (
                      <tr key={row.size} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-3 py-2 font-bold text-rose-600">{row.size}</td>
                        <td className="px-3 py-2">{row.height}</td>
                        <td className="px-3 py-2">{row.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pants Sizes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              👖 Bảng size Quần (Size số)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Male */}
              <div>
                <h4 className="font-semibold text-blue-600 mb-3">👨 Nam</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-500 text-white">
                      <th className="px-2 py-2 text-left">Size</th>
                      <th className="px-2 py-2 text-left">Cao</th>
                      <th className="px-2 py-2 text-left">Nặng</th>
                      <th className="px-2 py-2 text-left">Eo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: '28', height: '160-165', weight: '50-55', waist: '70-72' },
                      { size: '29', height: '163-168', weight: '53-58', waist: '72-74' },
                      { size: '30', height: '165-170', weight: '58-63', waist: '74-76' },
                      { size: '31', height: '168-173', weight: '63-68', waist: '76-78' },
                      { size: '32', height: '170-175', weight: '68-73', waist: '78-80' },
                      { size: '33', height: '173-178', weight: '73-78', waist: '80-82' },
                      { size: '34', height: '175-180', weight: '78-83', waist: '82-84' },
                      { size: '36', height: '178-185', weight: '83-90', waist: '86-90' },
                    ].map((row, idx) => (
                      <tr key={row.size} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-2 py-2 font-bold text-blue-600">{row.size}</td>
                        <td className="px-2 py-2 text-xs">{row.height}cm</td>
                        <td className="px-2 py-2 text-xs">{row.weight}kg</td>
                        <td className="px-2 py-2 text-xs">{row.waist}cm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Female */}
              <div>
                <h4 className="font-semibold text-rose-600 mb-3">👩 Nữ</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-rose-500 text-white">
                      <th className="px-2 py-2 text-left">Size</th>
                      <th className="px-2 py-2 text-left">Cao</th>
                      <th className="px-2 py-2 text-left">Nặng</th>
                      <th className="px-2 py-2 text-left">Eo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: '26', height: '150-155', weight: '42-47', waist: '62-64' },
                      { size: '27', height: '153-158', weight: '47-50', waist: '64-66' },
                      { size: '28', height: '155-160', weight: '50-54', waist: '66-68' },
                      { size: '29', height: '158-163', weight: '54-58', waist: '68-70' },
                      { size: '30', height: '160-165', weight: '58-62', waist: '70-72' },
                      { size: '31', height: '163-168', weight: '62-66', waist: '72-74' },
                      { size: '32', height: '165-170', weight: '66-70', waist: '74-76' },
                    ].map((row, idx) => (
                      <tr key={row.size} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-2 py-2 font-bold text-rose-600">{row.size}</td>
                        <td className="px-2 py-2 text-xs">{row.height}cm</td>
                        <td className="px-2 py-2 text-xs">{row.weight}kg</td>
                        <td className="px-2 py-2 text-xs">{row.waist}cm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-yellow-800 mb-3">💡 Mẹo chọn size</h3>
            <ul className="space-y-2 text-yellow-700">
              <li>• Nếu bạn ở giữa 2 size, nên chọn size lớn hơn để thoải mái hơn</li>
              <li>• Quần jean co giãn có thể chọn size nhỏ hơn 1 size</li>
              <li>• Quần kaki/tây nên chọn đúng size hoặc lớn hơn 1 size</li>
              <li>• Áo form oversize nên chọn đúng size, không cần tăng size</li>
            </ul>
          </div>
        </div>
      )}

      {/* Contact Section for contact_info */}
      {info.key === 'contact_info' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Điện thoại</h3>
            <p className="text-gray-600">Liên hệ qua số điện thoại</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Email</h3>
            <p className="text-gray-600">Gửi email cho chúng tôi</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Địa chỉ</h3>
            <p className="text-gray-600">Ghé thăm cửa hàng</p>
          </div>
        </div>
      )}
    </div>
  )
}
