import { useState, useEffect, useCallback, useRef } from 'react'

// API từ VietnamLabs - Danh mục hành chính Việt Nam
const VN_ADMIN_API = 'https://vietnamlabs.com/api/vietnamprovince'

/**
 * AddressSelector Component
 * Cho phép người dùng chọn địa chỉ theo hệ thống 2 cấp: Tỉnh/Thành phố - Phường/Xã
 * Sử dụng API danh mục hành chính quốc gia từ VietnamLabs
 * 
 * @param {Object} props
 * @param {Function} props.onChange - Callback khi địa chỉ thay đổi, nhận object { province, ward, fullAddress, detail }
 * @param {Object} props.initialValue - Giá trị ban đầu { provinceName, wardName, detail }
 * @param {boolean} props.required - Trường bắt buộc
 * @param {string} props.className - Class CSS tùy chỉnh
 */
export default function AddressSelector({
    onChange,
    initialValue = {},
    required = false,
    className = ''
}) {
    // Danh sách tỉnh/thành phố
    const [provinces, setProvinces] = useState([])
    // Danh sách phường/xã
    const [wards, setWards] = useState([])

    // Giá trị đã chọn
    const [selectedProvince, setSelectedProvince] = useState(null)
    const [selectedWard, setSelectedWard] = useState(null)
    const [addressDetail, setAddressDetail] = useState('')

    // Loading states
    const [loadingProvinces, setLoadingProvinces] = useState(false)
    const [loadingWards, setLoadingWards] = useState(false)

    // Error states
    const [error, setError] = useState('')

    // Tìm kiếm
    const [provinceSearch, setProvinceSearch] = useState('')
    const [wardSearch, setWardSearch] = useState('')
    const [showProvinceDropdown, setShowProvinceDropdown] = useState(false)
    const [showWardDropdown, setShowWardDropdown] = useState(false)

    // Refs for dropdown containers
    const provinceRef = useRef(null)
    const wardRef = useRef(null)

    // Fetch danh sách tỉnh/thành phố
    const fetchProvinces = useCallback(async () => {
        setLoadingProvinces(true)
        setError('')
        try {
            const response = await fetch(VN_ADMIN_API)
            if (!response.ok) throw new Error('Không thể tải danh sách tỉnh/thành phố')
            const data = await response.json()

            if (data.success && data.data) {
                // Chuyển đổi dữ liệu API sang format cần dùng
                const formattedProvinces = data.data.map(item => ({
                    id: item.id,
                    name: item.province,
                    wards: item.wards || []
                }))
                setProvinces(formattedProvinces)
            } else {
                throw new Error('Dữ liệu không hợp lệ')
            }
        } catch (err) {
            console.error('Error fetching provinces:', err)
            setError('Không thể tải danh sách tỉnh/thành phố. Vui lòng thử lại sau.')
        } finally {
            setLoadingProvinces(false)
        }
    }, [])

    // Load tỉnh/thành phố khi mount
    useEffect(() => {
        fetchProvinces()
    }, [fetchProvinces])

    // Load phường/xã khi chọn tỉnh
    useEffect(() => {
        if (selectedProvince) {
            setWards(selectedProvince.wards || [])
        } else {
            setWards([])
        }
    }, [selectedProvince])

    // Xử lý giá trị ban đầu: Tự động phân tích chuỗi địa chỉ để fill vào dropdown
    useEffect(() => {
        if (provinces.length > 0 && initialValue.detail && !selectedProvince) {
            const fullAddress = initialValue.detail
            const parts = fullAddress.split(',').map(p => p.trim())

            if (parts.length >= 2) {
                // Thử khớp phần cuối với danh sách Tỉnh/Thành
                const potentialProvince = parts[parts.length - 1]
                const foundProvince = provinces.find(p =>
                    p.name.toLowerCase() === potentialProvince.toLowerCase() ||
                    p.name.toLowerCase().includes(potentialProvince.toLowerCase())
                )

                if (foundProvince) {
                    setSelectedProvince(foundProvince)
                    setProvinceSearch(foundProvince.name)

                    // Thử khớp phần áp chót với danh sách Phường/Xã của tỉnh đó
                    const potentialWard = parts[parts.length - 2]
                    const foundWard = foundProvince.wards?.find(w =>
                        w.name.toLowerCase() === potentialWard.toLowerCase() ||
                        w.name.toLowerCase().includes(potentialWard.toLowerCase())
                    )

                    if (foundWard) {
                        setSelectedWard(foundWard)
                        setWardSearch(foundWard.name)
                        // Phần còn lại là địa chỉ chi tiết
                        // Loại bỏ 2 phần cuối (Xã, Tỉnh)
                        const detailParts = parts.slice(0, parts.length - 2)
                        setAddressDetail(detailParts.join(', '))
                    } else {
                        // Tìm thấy tỉnh nhưng không thấy xã -> Lấy hết phần trước làm chi tiết
                        const detailParts = parts.slice(0, parts.length - 1)
                        setAddressDetail(detailParts.join(', '))
                    }
                } else {
                    // Không khớp tỉnh nào -> Coi tất cả là chi tiết
                    setAddressDetail(fullAddress)
                }
            } else {
                setAddressDetail(fullAddress)
            }
        } else if (initialValue.detail && !selectedProvince) {
            // Fallback nếu chưa load xong province hoặc format không khớp
            setAddressDetail(initialValue.detail)
        }
    }, [provinces, initialValue.detail])

    // Gọi onChange khi giá trị thay đổi
    useEffect(() => {
        if (onChange) {
            const fullAddress = buildFullAddress()
            onChange({
                province: selectedProvince,
                ward: selectedWard,
                detail: addressDetail,
                fullAddress: fullAddress
            })
        }
    }, [selectedProvince, selectedWard, addressDetail])

    // Xây dựng địa chỉ đầy đủ
    const buildFullAddress = () => {
        const parts = []
        if (addressDetail.trim()) parts.push(addressDetail.trim())
        if (selectedWard) parts.push(selectedWard.name)
        if (selectedProvince) parts.push(selectedProvince.name)
        return parts.join(', ')
    }

    // Lọc tỉnh theo từ khóa tìm kiếm
    const filteredProvinces = provinces.filter(p =>
        p.name.toLowerCase().includes(provinceSearch.toLowerCase())
    )

    // Lọc phường/xã theo từ khóa tìm kiếm
    const filteredWards = wards.filter(w =>
        w.name.toLowerCase().includes(wardSearch.toLowerCase())
    )

    // Xử lý chọn tỉnh
    const handleSelectProvince = (province) => {
        setSelectedProvince(province)
        setSelectedWard(null)
        setProvinceSearch(province.name) // Cập nhật ô input thành tên tỉnh đã chọn
        setWardSearch('')
        setShowProvinceDropdown(false)
    }

    // Xử lý chọn phường/xã
    const handleSelectWard = (ward) => {
        setSelectedWard(ward)
        setWardSearch(ward.name) // Cập nhật ô input thành tên phường đã chọn
        setShowWardDropdown(false)
    }

    // Xử lý click bên ngoài để đóng dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (provinceRef.current && !provinceRef.current.contains(e.target)) {
                setShowProvinceDropdown(false)
            }
            if (wardRef.current && !wardRef.current.contains(e.target)) {
                setShowWardDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={`address-selector ${className}`}>
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">
                    ⚠️ {error}
                    <button
                        onClick={fetchProvinces}
                        className="ml-2 underline hover:no-underline"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Chọn Tỉnh/Thành phố */}
                <div ref={provinceRef} className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tỉnh/Thành phố {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={loadingProvinces ? "Đang tải..." : "Chọn hoặc tìm kiếm tỉnh/thành phố"}
                            value={showProvinceDropdown ? provinceSearch : (selectedProvince?.name || '')}
                            onChange={(e) => {
                                setProvinceSearch(e.target.value)
                                if (!showProvinceDropdown) setShowProvinceDropdown(true)
                            }}
                            onFocus={() => setShowProvinceDropdown(true)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                            disabled={loadingProvinces}
                            required={required && !selectedProvince}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            {loadingProvinces ? (
                                <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            ) : (
                                <svg className={`h-5 w-5 text-gray-400 transition-transform ${showProvinceDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Dropdown danh sách tỉnh */}
                    {showProvinceDropdown && !loadingProvinces && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {filteredProvinces.length > 0 ? (
                                filteredProvinces.map((province) => (
                                    <div
                                        key={province.id}
                                        onClick={() => handleSelectProvince(province)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-100 last:border-b-0 ${selectedProvince?.id === province.id ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                                            }`}
                                    >
                                        📍 {province.name}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-gray-500 text-center">
                                    Không tìm thấy tỉnh/thành phố
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Chọn Phường/Xã */}
                <div ref={wardRef} className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phường/Xã {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={
                                !selectedProvince
                                    ? "Vui lòng chọn tỉnh/thành phố trước"
                                    : loadingWards
                                        ? "Đang tải..."
                                        : "Chọn hoặc tìm kiếm phường/xã"
                            }
                            value={showWardDropdown ? wardSearch : (selectedWard?.name || '')}
                            onChange={(e) => {
                                setWardSearch(e.target.value)
                                if (!showWardDropdown) setShowWardDropdown(true)
                            }}
                            onFocus={() => selectedProvince && setShowWardDropdown(true)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={!selectedProvince || loadingWards}
                            required={required && !selectedWard}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            {loadingWards ? (
                                <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            ) : (
                                <svg className={`h-5 w-5 text-gray-400 transition-transform ${showWardDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Dropdown danh sách phường/xã */}
                    {showWardDropdown && !loadingWards && selectedProvince && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {filteredWards.length > 0 ? (
                                filteredWards.map((ward, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleSelectWard(ward)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-100 last:border-b-0 ${selectedWard?.name === ward.name ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                                            }`}
                                    >
                                        🏘️ {ward.name}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-gray-500 text-center">
                                    Không tìm thấy phường/xã
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Địa chỉ chi tiết */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Địa chỉ chi tiết (Số nhà, tên đường...) {required && <span className="text-red-500">*</span>}
                </label>
                <input
                    type="text"
                    placeholder="Ví dụ: Số 123, Đường ABC, Tổ 5"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required={required}
                />
            </div>

            {/* Hiển thị địa chỉ đầy đủ */}
            {(selectedProvince || selectedWard || addressDetail) && (
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">📍 Địa chỉ đầy đủ:</p>
                    <p className="font-semibold text-gray-800">
                        {buildFullAddress() || 'Chưa có địa chỉ'}
                    </p>
                </div>
            )}
        </div>
    )
}
