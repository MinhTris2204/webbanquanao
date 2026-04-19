import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'

export default function WeatherWidget() {
    const [weatherData, setWeatherData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [location, setLocation] = useState({ lat: null, lon: null })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isVisible, setIsVisible] = useState(false)
    const [iconError, setIconError] = useState(false)

    // Update clock every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    // Fade in animation
    useEffect(() => {
        if (weatherData) {
            setTimeout(() => setIsVisible(true), 100)
        }
    }, [weatherData])

    useEffect(() => {
        // Try to get user location with high accuracy
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    })
                },
                (err) => {
                    console.log("Geolocation permission denied or error", err)
                    // Default to Hanoi
                    setLocation({ lat: 21.0285, lon: 105.8542 })
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            )
        } else {
            setLocation({ lat: 21.0285, lon: 105.8542 })
        }
    }, [])

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                setLoading(true)
                const params = {}
                if (location.lat && location.lon) {
                    params.lat = location.lat
                    params.lon = location.lon
                }

                const res = await api.get('/api/weather/current', { params })
                console.log('Weather data received:', res.data)
                console.log('Icon URL:', res.data.icon_url)
                setWeatherData(res.data)
                setIconError(false) // Reset icon error state
                setError(null)
            } catch (err) {
                console.error('Error fetching weather:', err)
                setError('Không thể tải thông tin thời tiết. Vui lòng kiểm tra kết nối.')
            } finally {
                setLoading(false)
            }
        }

        if (location.lat) {
            fetchWeather()
        }
    }, [location])

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
    }

    if (loading && !weatherData) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8 mb-12 flex items-center justify-center border border-blue-200/50 shadow-2xl h-64">
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-300 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                    </div>
                    <div className="text-gray-700 font-semibold mt-6 text-lg">Đang cập nhật thời tiết...</div>
                    <div className="text-gray-500 text-sm mt-2">Vui lòng chờ trong giây lát</div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50/90 backdrop-blur-sm text-red-600 rounded-3xl p-6 mb-12 text-center border border-red-200 shadow-lg">
                <span className="text-2xl block mb-2">⚠️</span>
                {error}
            </div>
        )
    }

    if (!weatherData) return null

    // Determine background gradient based on weather main
    const getBackgroundClass = (main) => {
        const weather = main?.toLowerCase() || ''
        if (weather.includes('rain')) return 'from-slate-600 via-slate-700 to-gray-800'
        if (weather.includes('cloud')) return 'from-blue-500 via-sky-600 to-cyan-700'
        if (weather.includes('clear')) return 'from-amber-400 via-yellow-500 to-orange-500'
        if (weather.includes('snow')) return 'from-blue-50 via-slate-100 to-blue-200 !text-slate-800'
        if (weather.includes('thunder')) return 'from-slate-700 via-gray-800 to-slate-900'
        return 'from-blue-500 via-cyan-600 to-teal-600'
    }

    const bgClass = getBackgroundClass(weatherData.weather_main)
    const isLightBg = bgClass.includes('blue-50')
    const textColor = isLightBg ? 'text-slate-800' : 'text-white'
    const subTextColor = isLightBg ? 'text-slate-600' : 'text-white/90'

    // Get weather emoji for fallback
    const getWeatherEmoji = (weatherMain) => {
        const weatherEmojis = {
            'clear': '☀️',
            'clouds': '☁️',
            'rain': '🌧️',
            'drizzle': '🌦️',
            'thunderstorm': '⛈️',
            'snow': '❄️',
            'mist': '🌫️',
            'fog': '🌫️',
            'haze': '🌫️'
        }
        const weather = weatherMain?.toLowerCase() || 'clear'
        return weatherEmojis[weather] || '🌤️'
    }

    return (
        <div className={`relative overflow-hidden rounded-3xl shadow-2xl mb-16 bg-gradient-to-br ${bgClass} ${textColor} transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative p-6 md:p-10 z-10">
                <div className="flex flex-col lg:flex-row gap-10 items-stretch">

                    {/* Left Column: Weather Info */}
                    <div className="flex-shrink-0 flex flex-col justify-between min-w-[320px]">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-xl font-bold tracking-wide">{weatherData.city}</span>
                                    <div className={`text-sm ${subTextColor} font-medium mt-0.5`}>
                                        {formatDate(currentTime)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center my-8 animate-fade-in">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl"></div>
                                {!iconError ? (
                                    <img
                                        src={weatherData.icon_url}
                                        alt={weatherData.weather_main}
                                        className="relative w-36 h-36 md:w-44 md:h-44 object-contain drop-shadow-2xl animate-bounce-slow"
                                        onError={() => setIconError(true)}
                                    />
                                ) : (
                                    <div className="relative text-8xl md:text-9xl animate-bounce-slow drop-shadow-2xl">
                                        {getWeatherEmoji(weatherData.weather_main)}
                                    </div>
                                )}
                            </div>
                            <div className="ml-6">
                                <div className="text-7xl md:text-8xl font-black tracking-tighter drop-shadow-lg">
                                    {Math.round(weatherData.temp)}°
                                </div>
                                <div className="text-xl md:text-2xl font-semibold capitalize mt-1 opacity-95">
                                    {weatherData.description}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/25 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/30 transition-all duration-300">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="text-2xl animate-pulse">💡</span> 
                                <span>Lời khuyên hôm nay</span>
                            </h3>
                            <ul className="space-y-2.5">
                                {weatherData.advice?.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm md:text-base leading-relaxed animate-slide-in" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <span className="mt-1.5 block w-2 h-2 rounded-full bg-yellow-300 flex-shrink-0 shadow-lg"></span>
                                        <span className="flex-1">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Suggested Products */}
                    <div className="flex-grow flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h3 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                                <span className="text-3xl animate-pulse">✨</span> 
                                <span>Gợi ý trang phục</span>
                            </h3>
                            <Link 
                                to="/products" 
                                className={`text-sm font-bold hover:underline ${subTextColor} hover:scale-105 transition-transform flex items-center gap-1 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm`}
                            >
                                Xem tất cả 
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>

                        {weatherData.suggested_products?.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {weatherData.suggested_products.map((product, idx) => (
                                    <Link
                                        key={product.products_id}
                                        to={`/products/${product.products_id}`}
                                        className="group bg-white rounded-2xl p-3 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 animate-scale-in"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 mb-3 relative">
                                            <img
                                                src={getImageUrl(product.hinh_anh)}
                                                alt={product.ten_san_pham}
                                                className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                                            />
                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            {/* Quick Buy Button */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-white text-gray-900 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Xem ngay
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-gray-800 font-bold text-sm line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors leading-tight">
                                                {product.ten_san_pham}
                                            </h4>
                                            <div className="flex items-center justify-between">
                                                <p className="text-red-600 font-bold text-base">
                                                    {product.gia_ban?.toLocaleString('vi-VN')}đ
                                                </p>
                                                {product.promotion && (
                                                    <span className="text-[10px] bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-1 rounded-full font-bold shadow-md">
                                                        SALE
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-white/15 rounded-2xl border border-white/20 backdrop-blur-sm p-8 text-center">
                                <div className="animate-pulse">
                                    <div className="text-4xl mb-3">🔍</div>
                                    <p className="opacity-90 font-medium">Đang tìm trang phục phù hợp nhất cho bạn...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        </div>
    )
}
