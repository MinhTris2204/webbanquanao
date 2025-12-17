import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../utils/api'

export default function AutocompleteDropdown({ 
  suggestions, 
  isLoading, 
  selectedIndex, 
  onSuggestionClick,
  searchTerm 
}) {
  const navigate = useNavigate()

  const highlightMatch = (text, query) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span>
      ) : (
        <span key={index}>{part}</span>
      )
    )
  }

  const handleClick = (productId) => {
    onSuggestionClick(productId)
    navigate(`/products/${productId}`)
  }

  if (isLoading) {
    return (
      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
        <div className="p-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-sm text-gray-600">Đang tìm kiếm...</p>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
        <div className="p-4 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Không tìm thấy sản phẩm</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.products_id}
          onClick={() => handleClick(suggestion.products_id)}
          className={`flex items-center p-3 cursor-pointer transition ${
            index === selectedIndex 
              ? 'bg-blue-50 border-l-4 border-blue-500' 
              : 'hover:bg-gray-50'
          } ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
        >
          <img
            src={getImageUrl(suggestion.hinh_anh) || 'https://via.placeholder.com/60'}
            alt={suggestion.ten_san_pham}
            className="w-12 h-12 object-cover rounded mr-3"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-800">
              {highlightMatch(suggestion.ten_san_pham, searchTerm)}
            </p>
            <p className="text-sm text-blue-600 font-semibold">
              {suggestion.gia_ban?.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      ))}
    </div>
  )
}
