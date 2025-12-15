export default function ProductRating({ rating, reviewCount, showCount = true, size = 'sm' }) {
  // Nếu không có rating, hiển thị 5 sao xám
  const displayRating = rating || 0
  const hasReviews = reviewCount > 0
  
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const starSize = sizeClasses[size] || sizeClasses.sm

  const renderStars = () => {
    const stars = []
    const fullStars = Math.floor(displayRating)
    const hasHalfStar = displayRating % 1 >= 0.5
    
    // Sao đầy (màu vàng)
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} className={`${starSize} text-yellow-400 fill-current`} viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      )
    }
    
    // Sao nửa (nếu có)
    if (hasHalfStar && hasReviews) {
      stars.push(
        <svg key="half" className={`${starSize} text-yellow-400`} viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-gradient">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path fill="url(#half-gradient)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      )
    }
    
    // Sao rỗng (màu xám)
    const emptyStars = 5 - fullStars - (hasHalfStar && hasReviews ? 1 : 0)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className={`${starSize} ${hasReviews ? 'text-gray-300' : 'text-gray-300'} fill-current`} viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      )
    }
    
    return stars
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {renderStars()}
      </div>
      {showCount && (
        <span className="text-sm text-gray-600 ml-1">
          {hasReviews ? (
            <>
              <span className="font-medium">{displayRating.toFixed(1)}</span>
              <span className="text-gray-400"> ({reviewCount})</span>
            </>
          ) : (
            <span className="text-gray-400">(Chưa có đánh giá)</span>
          )}
        </span>
      )}
    </div>
  )
}
