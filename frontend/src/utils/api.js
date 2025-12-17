import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(config => {
  // Determine if we're in admin app or customer app
  const isAdminApp = window.location.pathname.includes('admin.html')
  const tokenKey = isAdminApp ? 'admin_token' : 'customer_token'
  const token = localStorage.getItem(tokenKey)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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
