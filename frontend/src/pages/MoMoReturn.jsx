import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../utils/api'

export default function MoMoReturn() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing') // processing, success, failed
  const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...')
  const [orderInfo, setOrderInfo] = useState(null)

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // Lấy các tham số từ URL
        const partnerCode = searchParams.get('partnerCode')
        const orderId = searchParams.get('orderId')
        const requestId = searchParams.get('requestId')
        const amount = searchParams.get('amount')
        const orderInfo = searchParams.get('orderInfo')
        const orderType = searchParams.get('orderType')
        const transId = searchParams.get('transId')
        const resultCode = parseInt(searchParams.get('resultCode'))
        const message = searchParams.get('message')
        const payType = searchParams.get('payType')
        const responseTime = searchParams.get('responseTime')
        const extraData = searchParams.get('extraData')
        const signature = searchParams.get('signature')

        console.log('MoMo Payment Result:', {
          orderId,
          resultCode,
          message,
          transId
        })

        // Kiểm tra kết quả thanh toán
        if (resultCode === 0) {
          // Thanh toán thành công - Cập nhật đơn hàng ngay
          try {
            // Extract original order ID
            let originalOrderId = orderId
            if (orderId && orderId.includes('_')) {
              originalOrderId = orderId.split('_')[0].replace('ORD', '')
            }
            
            // Gọi API để cập nhật trạng thái đơn hàng
            await api.post('/api/momo/update-order-status', {
              orderId: orderId,
              originalOrderId: originalOrderId,
              transId: transId,
              resultCode: resultCode
            })
          } catch (updateError) {
            console.error('Error updating order:', updateError)
          }
          
          // Thanh toán thành công
          setStatus('success')
          setMessage('Thanh toán thành công!')
          
          // Extract original order ID from MoMo orderId (format: ORD{id}_{timestamp})
          let displayOrderId = orderId
          try {
            if (orderId.includes('_')) {
              displayOrderId = orderId.split('_')[0].replace('ORD', '')
            }
          } catch (e) {
            console.log('Could not parse orderId:', e)
          }
          
          setOrderInfo({
            orderId: displayOrderId,
            transId,
            amount: parseInt(amount),
            orderInfo
          })

          // Chuyển hướng sau 3 giây
          setTimeout(() => {
            // Force reload để đảm bảo data mới nhất
            navigate('/orders?success=true', { replace: true })
            window.location.reload()
          }, 3000)
        } else {
          // Thanh toán thất bại - Cập nhật đơn hàng thành "huy"
          try {
            // Extract original order ID
            let originalOrderId = orderId
            if (orderId && orderId.includes('_')) {
              originalOrderId = orderId.split('_')[0].replace('ORD', '')
            }
            
            // Gọi API để cập nhật trạng thái đơn hàng thành "huy"
            await api.post('/api/momo/update-order-status', {
              orderId: orderId,
              originalOrderId: originalOrderId,
              transId: transId || '0',
              resultCode: resultCode
            })
          } catch (updateError) {
            console.error('Error updating order to cancelled:', updateError)
          }
          
          // Thanh toán thất bại
          setStatus('failed')
          setMessage(message || 'Thanh toán thất bại')
          
          // Chuyển hướng sau 5 giây
          setTimeout(() => {
            navigate('/checkout')
          }, 5000)
        }
      } catch (error) {
        console.error('Error processing MoMo payment result:', error)
        setStatus('failed')
        setMessage('Có lỗi xảy ra khi xử lý kết quả thanh toán')
        
        setTimeout(() => {
          navigate('/checkout')
        }, 5000)
      }
    }

    processPaymentResult()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-pink-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Đang xử lý...</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-green-600 mb-3">Thanh toán thành công!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            {orderInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mã đơn hàng:</span>
                    <span className="font-semibold text-gray-800">#{orderInfo.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mã giao dịch:</span>
                    <span className="font-semibold text-gray-800">{orderInfo.transId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-semibold text-green-600">
                      {orderInfo.amount.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center text-gray-500 mb-4">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Đang chuyển hướng đến trang đơn hàng...</span>
            </div>

            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Xem đơn hàng ngay
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-red-600 mb-3">Thanh toán thất bại</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Đơn hàng đã bị hủy.</strong> Bạn có thể đặt hàng lại hoặc chọn phương thức thanh toán khác.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center text-gray-500 mb-4">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Đang chuyển hướng về trang thanh toán...</span>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Thử lại thanh toán
              </button>
              <button
                onClick={() => navigate('/products')}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
