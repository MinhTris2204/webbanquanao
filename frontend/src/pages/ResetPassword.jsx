import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Trang nĂ y Ä‘Æ°á»£c giá»¯ láº¡i Ä‘á»ƒ tÆ°Æ¡ng thĂ­ch ngÆ°á»£c
// Luá»“ng má»›i sá»­ dá»¥ng OTP trong trang ForgotPassword
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  useEffect(() => {
    // Chuyá»ƒn hÆ°á»›ng Ä‘áº¿n trang quĂªn máº­t kháº©u
    // CĂ¡c link dá»±a trĂªn token cÅ© sáº½ khĂ´ng cĂ²n hoáº¡t Ä‘á»™ng
    navigate('/forgot-password', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Äang chuyá»ƒn hÆ°á»›ng...</p>
      </div>
    </div>
  )
}

