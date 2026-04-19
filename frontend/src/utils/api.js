import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // Gửi cookie (session_id) kèm mọi request
})

api.interceptors.request.use(config => {
  // Determine if we're in admin app or customer app
  // Check both pathname and the HTML file being served
  const isAdminApp = window.location.pathname.includes('admin.html') || 
                     window.location.href.includes('admin.html') ||
                     document.querySelector('title')?.textContent?.includes('Admin Panel')
  const tokenKey = isAdminApp ? 'admin_token' : 'customer_token'
  const token = localStorage.getItem(tokenKey)
  
  // Debug logging
  if (config.url?.includes('/api/admin/') || config.url?.includes('/api/promotions/') || config.url?.includes('/api/vouchers/')) {
    console.log('[API Debug]', {
      url: config.url,
      isAdminApp,
      tokenKey,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    })
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.error('[API 401 Error]', {
        url: error.config?.url,
        message: error.response?.data?.error || error.response?.data?.msg,
        hasAuthHeader: !!error.config?.headers?.Authorization
      })
      
      // If we're in admin app and get 401, redirect to login
      const isAdminApp = window.location.pathname.includes('admin.html') || 
                         window.location.href.includes('admin.html') ||
                         document.querySelector('title')?.textContent?.includes('Admin Panel')
      
      if (isAdminApp && !window.location.hash.includes('#/login')) {
        console.warn('[API] Redirecting to admin login due to 401')
        localStorage.removeItem('admin_token')
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api


// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null
  
  // If already a full URL or base64, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath
  }
  
  // If it's a relative path starting with /uploads/, prepend API base URL
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  if (imagePath.startsWith('/uploads/')) {
    return `${baseURL}${imagePath}`
  }
  
  // Otherwise, assume it's just a filename
  return `${baseURL}/uploads/${imagePath}`
}
