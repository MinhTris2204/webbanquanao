import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Kiểm tra xem người dùng đã chấp nhận cookie chưa
    const consent = localStorage.getItem('cookieConsent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                🍪 Chúng tôi sử dụng Cookie
              </h3>
              <p className="text-sm text-gray-600">
                Website này sử dụng cookie để cải thiện trải nghiệm của bạn, phân tích lưu lượng truy cập và cá nhân hóa nội dung. 
                Bằng cách nhấp "Chấp nhận", bạn đồng ý với việc sử dụng cookie của chúng tôi.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleDecline}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Từ chối
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Chấp nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
