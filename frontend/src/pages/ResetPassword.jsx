import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Trang này được giữ lại để tương thích ngược
// Luồng mới sử dụng OTP trong trang ForgotPassword
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  useEffect(() => {
    // Chuyển hướng đến trang quên mật khẩu
    // Các link dựa trên token cũ sẽ không còn hoạt động
    navigate('/forgot-password', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Đang chuyển hướng...</p>
      </div>
    </div>
  )
}
