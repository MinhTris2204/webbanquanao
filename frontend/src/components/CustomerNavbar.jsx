import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import LoginPrompt from './LoginPrompt'
import api from '../utils/api'

export default function CustomerNavbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const { cartCount } = useCart()
  const navigate = useNavigate()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')
  const [showProductMenu, setShowProductMenu] = useState(false)
  const productMenuRef = useRef(null)

  // Default categories - fallback if API doesn't return data
  const defaultCategories = ['Áo', 'Quần', 'Váy', 'Đầm', 'Áo khoác', 'Phụ kiện']
  const [categories, setCategories] = useState(defaultCategories)

  // Fetch product categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/api/products/categories')
        // Use API data if available, otherwise keep default categories
        if (res.data.categories && res.data.categories.length > 0) {
          setCategories(res.data.categories)
        }
      } catch (err) {
        console.error('Error fetching categories:', err)
        // Keep default categories on error
      }
    }
    fetchCategories()
  }, [])

  // Handle click outside for product menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productMenuRef.current && !productMenuRef.current.contains(e.target)) {
        setShowProductMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProtectedClick = (e, path, message) => {
    if (!isAuthenticated) {
      e.preventDefault()
      setPromptMessage(message)
      setShowLoginPrompt(true)
    } else {
      navigate(path)
    }
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-blue-600 flex items-center">
            <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Shop Quần Áo
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Trang chủ
            </Link>
            
            <div className="relative" ref={productMenuRef}>
              <button
                onClick={() => setShowProductMenu(!showProductMenu)}
                className="text-gray-700 hover:text-blue-600 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Sản phẩm
                <svg className={`w-4 h-4 ml-1 transition-transform ${showProductMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProductMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    to="/products"
                    onClick={() => setShowProductMenu(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    Tất cả sản phẩm
                  </Link>
                  <div className="border-t border-gray-200 my-2"></div>
                  {categories.map((category) => (
                    <Link
                      key={category}
                      to={`/products?category=${encodeURIComponent(category)}`}
                      onClick={() => setShowProductMenu(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/search" className="text-gray-700 hover:text-blue-600 flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Tìm kiếm
            </Link>
            
            <a
              href="#"
              onClick={(e) => handleProtectedClick(e, '/cart', 'Vui lòng đăng nhập để xem giỏ hàng')}
              className="text-gray-700 hover:text-blue-600 flex items-center cursor-pointer relative"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Giỏ hàng
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </a>
            
            <a
              href="#"
              onClick={(e) => handleProtectedClick(e, '/orders', 'Vui lòng đăng nhập để xem đơn hàng')}
              className="text-gray-700 hover:text-blue-600 flex items-center cursor-pointer"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Đơn hàng
            </a>

            {isAuthenticated ? (
              <>
                <Link to="/profile" className="text-gray-700 hover:text-blue-600 flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {user?.hoten}
                </Link>
                
                <button
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <LoginPrompt 
        isOpen={showLoginPrompt} 
        onClose={() => setShowLoginPrompt(false)}
        message={promptMessage}
      />
    </nav>
  )
}
