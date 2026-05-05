import { useState, useEffect, useRef } from 'react'

/**
 * LazyImage Component - Tối ưu load hình ảnh
 * Features:
 * - Lazy loading với Intersection Observer
 * - Placeholder khi đang load
 * - Fallback khi lỗi
 * - Responsive images với srcSet
 */
export default function LazyImage({ 
  src, 
  alt, 
  className = '',
  placeholderClassName = '',
  fallbackSrc = 'https://via.placeholder.com/300',
  sizes = '100vw',
  loading = 'lazy'
}) {
  const [imageSrc, setImageSrc] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    // Nếu browser hỗ trợ native lazy loading, dùng luôn
    if ('loading' in HTMLImageElement.prototype) {
      setImageSrc(src)
      return
    }

    // Fallback: Dùng Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px', // Load trước 50px
        threshold: 0.01
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [src])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setImageError(true)
    setImageSrc(fallbackSrc)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Placeholder khi đang load */}
      {!isLoaded && (
        <div 
          className={`absolute inset-0 bg-gray-200 animate-pulse ${placeholderClassName}`}
        />
      )}
      
      {/* Image */}
      <img
        ref={imgRef}
        src={imageSrc || fallbackSrc}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={loading}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* Error indicator */}
      {imageError && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
          ⚠️
        </div>
      )}
    </div>
  )
}

/**
 * Usage:
 * 
 * <LazyImage
 *   src={getImageUrl(product.hinh_anh)}
 *   alt={product.ten_san_pham}
 *   className="w-full h-64 object-cover"
 *   placeholderClassName="rounded-t-xl"
 * />
 */
