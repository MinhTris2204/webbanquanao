import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'

export default function WeatherWidget() {
    const [weatherData, setWeatherData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [location, setLocation] = useState({ lat: null, lon: null })
    const [currentTime, setCurrentTime] = useState(new Date())

    // Update clock every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

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
                setWeatherData(res.data)
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
            <div className="bg-white/50 backdrop-blur-md rounded-3xl p-8 mb-12 flex items-center justify-center animate-pulse border border-white/20 shadow-xl h-64">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-gray-600 font-medium">Đang cập nhật thời tiết...</div>
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
        if (weather.includes('rain')) return 'from-slate-700 via-slate-600 to-slate-800'
        if (weather.includes('cloud')) return 'from-blue-400 via-slate-400 to-slate-500'
        if (weather.includes('clear')) return 'from-blue-400 via-sky-500 to-cyan-400'
        if (weather.includes('snow')) return 'from-slate-100 via-blue-100 to-slate-300 !text-slate-800'
        return 'from-blue-500 via-blue-600 to-indigo-700'
    }

    const bgClass = getBackgroundClass(weatherData.weather_main)
    const isLightBg = bgClass.includes('slate-100')
    const textColor = isLightBg ? 'text-slate-800' : 'text-white'
    const subTextColor = isLightBg ? 'text-slate-600' : 'text-white/80'

    return (
        <div className={`relative overflow-hidden rounded-3xl shadow-2xl mb-16 bg-gradient-to-br ${bgClass} ${textColor} transition-all duration-500`}>

            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-black/10 blur-3xl"></div>

            <div className="relative p-6 md:p-10 z-10">
                <div className="flex flex-col lg:flex-row gap-10 items-stretch">

                    {/* Left Column: Weather Info */}
                    <div className="flex-shrink-0 flex flex-col justify-between min-w-[300px]">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-lg font-medium tracking-wide uppercase">{weatherData.city}</span>
                            </div>
                            <div className={`text-sm ${subTextColor} font-medium`}>
                                {formatDate(currentTime)}
                            </div>
                        </div>

                        <div className="flex items-center my-6">
                            <div className="relative">
                                <img
                                    src={weatherData.icon_url}
                                    alt={weatherData.weather_main}
                                    className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl"
                                />
                            </div>
                            <div className="ml-4">
                                <div className="text-7xl md:text-8xl font-bold tracking-tighter">
                                    {Math.round(weatherData.temp)}°
                                </div>
                                <div className="text-xl md:text-2xl font-medium capitalize mt-[-10px] opacity-90">
                                    {weatherData.description}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-inner">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                💡 Lời khuyên hôm nay
                            </h3>
                            <ul className="space-y-2">
                                {weatherData.advice?.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm md:text-base leading-relaxed">
                                        <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-yellow-300 flex-shrink-0"></span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Suggested Products */}
                    <div className="flex-grow flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-2xl">✨</span> Gợi ý trang phục phù hợp
                            </h3>
                            <Link to="/products" className={`text-sm font-semibold hover:underline ${subTextColor}`}>
                                Xem tất cả &rarr;
                            </Link>
                        </div>

                        {weatherData.suggested_products?.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {weatherData.suggested_products.map((product) => (
                                    <Link
                                        key={product.products_id}
                                        to={`/products/${product.products_id}`}
                                        className="group bg-white rounded-2xl p-3 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 mb-3 relative">
                                            <img
                                                src={getImageUrl(product.hinh_anh)}
                                                alt={product.ten_san_pham}
                                                className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                                            />
                                            {/* Quick Buy Button Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="bg-white text-black text-xs font-bold px-3 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                    Xem ngay
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-gray-800 font-bold text-sm line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">
                                                {product.ten_san_pham}
                                            </h4>
                                            <div className="flex items-center justify-between">
                                                <p className="text-red-500 font-bold text-sm">
                                                    {product.gia_ban?.toLocaleString('vi-VN')} đ
                                                </p>
                                                {product.promotion && (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                                                        Sale
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm p-8 text-center">
                                <p className="opacity-80">Đang tìm trang phục phù hợp nhất cho bạn...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
