import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'
import AutocompleteDropdown from '../components/AutocompleteDropdown'
import ProductRating from '../components/ProductRating'

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  // Autocomplete states
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  
  const searchRef = useRef(null)
  const dropdownRef = useRef(null)
  const debounceTimer = useRef(null)
  const abortController = useRef(null)

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (query) => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort()
    }

    abortController.current = new AbortController()
    setIsLoadingSuggestions(true)

    try {
      const res = await api.get('/api/products/autocomplete', {
        params: { q: query },
        signal: abortController.current.signal
      })
      setSuggestions(res.data.suggestions)
      setShowDropdown(true)
      setSelectedIndex(-1)
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('Autocomplete error:', err)
        setShowDropdown(false)
      }
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value
    setSearchTerm(value)

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowDropdown(false)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const productId = suggestions[selectedIndex].products_id
          window.location.href = `/products/${productId}`
        } else {
          handleSearch(e)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
      default:
        break
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setShowDropdown(false)
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get('/api/products', { params: { search: searchTerm } })
      setProducts(res.data.products)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = () => {
    setShowDropdown(false)
    setSuggestions([])
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tìm kiếm sản phẩm</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1 relative" ref={searchRef}>
            <input
              type="text"
              placeholder="Nhập tên hoặc ID sản phẩm (VD: #123)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {showDropdown && (
              <div ref={dropdownRef}>
                <AutocompleteDropdown
                  suggestions={suggestions}
                  isLoading={isLoadingSuggestions}
                  selectedIndex={selectedIndex}
                  onSuggestionClick={handleSuggestionClick}
                  searchTerm={searchTerm}
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Tìm kiếm
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Đang tìm kiếm...</p>
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="mb-4">
            <p className="text-gray-600">
              Tìm thấy <span className="font-bold text-blue-600">{products.length}</span> sản phẩm
              {searchTerm && ` cho "${searchTerm}"`}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.products_id}
                  to={`/products/${product.products_id}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={getImageUrl(product.hinh_anh) || 'https://via.placeholder.com/300'}
                      alt={product.ten_san_pham}
                      className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {product.promotion && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                        -{Math.round(((product.gia_ban - product.promotion.promotional_price) / product.gia_ban) * 100)}%
                      </div>
                    )}
                    {product.trang_thai === 'Het_hang' && (
                      <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">Hết hàng</span>
                      </div>
                    )}
                    {product.trang_thai === 'Con_hang' && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Còn hàng
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full font-semibold">
                        {product.loai}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                        {product.gioi_tinh}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">ID: #{product.products_id}</p>
                    <h3 className="font-bold text-lg mb-2 text-gray-800 line-clamp-2 group-hover:text-blue-600 transition">
                      {product.ten_san_pham}
                    </h3>
                    
                    {/* Rating */}
                    <div className="mb-2">
                      <ProductRating 
                        rating={product.rating?.average_rating || 0}
                        reviewCount={product.rating?.review_count || 0}
                        size="sm"
                      />
                    </div>
                    
                    {product.size && (
                      <p className="text-xs text-gray-500 mb-2">Size: {product.size}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {product.promotion ? (
                        <div className="space-y-1">
                          <p className="text-red-600 font-bold text-xl">
                            {product.promotion.promotional_price?.toLocaleString('vi-VN')}₫
                          </p>
                          <p className="text-gray-500 text-sm line-through">
                            {product.gia_ban?.toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      ) : (
                        <p className="text-blue-600 font-bold text-xl">
                          {product.gia_ban?.toLocaleString('vi-VN')}₫
                        </p>
                      )}
                      <button className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-600 transition">
                        Xem
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
              <p className="text-gray-400 mt-2">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </>
      )}

      {!searched && (
        <div className="text-center py-12">
          <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 text-lg">Nhập từ khóa để tìm kiếm sản phẩm</p>
        </div>
      )}
    </div>
  )
}
