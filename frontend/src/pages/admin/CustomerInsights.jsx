import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'

const ICONS = {
  crown: '\u{1F451}',
  fire: '\u{1F525}',
  bulb: '\u{1F4A1}',
  eye: '\u{1F441}',
  target: '\u{1F3AF}',
  gold: '\u{1F947}',
  silver: '\u{1F948}',
  bronze: '\u{1F949}',
  star: '\u{2B50}',
  sparkle: '\u{2728}',
  dong: '\u{20AB}',
  party: '\u{1F389}',
  cart: '\u{1F6D2}',
  chart: '\u{1F4CA}',
  camera: '\u{1F4F7}',
  check: '\u{2713}',
  green: '\u{1F7E2}',
  yellow: '\u{1F7E1}',
  red: '\u{1F534}',
  trophy: '\u{1F3C6}',
  greenHeart: '\u{1F49A}',
  blueHeart: '\u{1F499}',
  white: '\u{26AA}'
}

export default function CustomerInsights() {
  const [activeTab, setActiveTab] = useState('top-customers')
  const [loading, setLoading] = useState(true)
  const [topCustomers, setTopCustomers] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [promotionSuggestions, setPromotionSuggestions] = useState([])
  const [viewAnalytics, setViewAnalytics] = useState({ analytics: [], summary: {} })
  const [customerSegments, setCustomerSegments] = useState({ segments: [], total_customers: 0 })
  const [categories, setCategories] = useState([])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedCategory, setSelectedCategory] = useState('')
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    loadCategories()
    loadData()
  }, [activeTab])

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/analytics/product-categories')
      setCategories(res.data.categories || [])
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      switch (activeTab) {
        case 'top-customers': await loadTopCustomers(); break
        case 'top-products': await loadTopProducts(); break
        case 'promotion-suggestions': await loadPromotionSuggestions(); break
        case 'view-analytics': await loadViewAnalytics(); break
        case 'segments': await loadCustomerSegments(); break
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTopCustomers = async () => {
    const params = new URLSearchParams({ limit })
    if (dateRange.start) params.append('start_date', dateRange.start)
    if (dateRange.end) params.append('end_date', dateRange.end)
    const res = await api.get(`/api/analytics/top-customers?${params}`)
    setTopCustomers(res.data.customers || [])
  }

  const loadTopProducts = async () => {
    const params = new URLSearchParams({ limit })
    if (dateRange.start) params.append('start_date', dateRange.start)
    if (dateRange.end) params.append('end_date', dateRange.end)
    if (selectedCategory) params.append('category', selectedCategory)
    const res = await api.get(`/api/analytics/top-products?${params}`)
    setTopProducts(res.data.products || [])
  }

  const loadPromotionSuggestions = async () => {
    const res = await api.get('/api/analytics/promotion-suggestions')
    setPromotionSuggestions(res.data.suggestions || [])
  }

  const loadViewAnalytics = async () => {
    const res = await api.get(`/api/analytics/view-to-purchase?limit=${limit}`)
    setViewAnalytics(res.data)
  }

  const loadCustomerSegments = async () => {
    const res = await api.get('/api/analytics/customer-segments')
    setCustomerSegments(res.data)
  }

  const handleFilter = () => loadData()

  const tabs = [
    { id: 'top-customers', label: `${ICONS.crown} Top Kh\u00E1ch h\u00E0ng` },
    { id: 'top-products', label: `${ICONS.fire} S\u1EA3n ph\u1EA9m b\u00E1n ch\u1EA1y` },
    { id: 'promotion-suggestions', label: `${ICONS.bulb} G\u1EE3i \u00FD khuy\u1EBFn m\u00E3i` },
    { id: 'view-analytics', label: `${ICONS.eye} Ph\u00E2n t\u00EDch l\u01B0\u1EE3t xem` },
    { id: 'segments', label: `${ICONS.target} Ph\u00E2n kh\u00FAc KH` }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {(activeTab === 'top-customers' || activeTab === 'top-products') && (
          <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{`T\u1EEB ng\u00E0y`}</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{`\u0110\u1EBFn ng\u00E0y`}</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="border rounded-lg px-3 py-2" />
            </div>
            {activeTab === 'top-products' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{`Lo\u1EA1i SP`}</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border rounded-lg px-3 py-2">
                  <option value="">{`T\u1EA5t c\u1EA3`}</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{`S\u1ED1 l\u01B0\u1EE3ng`}</label>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border rounded-lg px-3 py-2">
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
            <button onClick={handleFilter} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{`L\u1ECDc d\u1EEF li\u1EC7u`}</button>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'top-customers' && <TopCustomersTable customers={topCustomers} />}
              {activeTab === 'top-products' && <TopProductsTable products={topProducts} />}
              {activeTab === 'promotion-suggestions' && <PromotionSuggestions suggestions={promotionSuggestions} />}
              {activeTab === 'view-analytics' && <ViewAnalytics data={viewAnalytics} />}
              {activeTab === 'segments' && <CustomerSegments data={customerSegments} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


function TopCustomersTable({ customers }) {
  if (customers.length === 0) return <div className="text-center py-8 text-gray-500">{`Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u kh\u00E1ch h\u00E0ng`}</div>
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0)
  const medals = [ICONS.gold, ICONS.silver, ICONS.bronze]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-sm text-yellow-700">{`T\u1ED5ng kh\u00E1ch h\u00E0ng`}</p>
          <p className="text-2xl font-bold text-yellow-800">{customers.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm text-green-700">{`T\u1ED5ng chi ti\u00EAu`}</p>
          <p className="text-2xl font-bold text-green-800">{totalSpent.toLocaleString()}{ICONS.dong}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-700">{`TB/kh\u00E1ch h\u00E0ng`}</p>
          <p className="text-2xl font-bold text-blue-800">{customers.length > 0 ? Math.round(totalSpent / customers.length).toLocaleString() : 0}{ICONS.dong}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
            <tr>
              <th className="px-4 py-3 text-left">{`H\u1EA1ng`}</th>
              <th className="px-4 py-3 text-left">{`Kh\u00E1ch h\u00E0ng`}</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">{`S\u0110T`}</th>
              <th className="px-4 py-3 text-right">{`S\u1ED1 \u0111\u01A1n`}</th>
              <th className="px-4 py-3 text-right">{`T\u1ED5ng chi ti\u00EAu`}</th>
              <th className="px-4 py-3 text-right">{`TB/\u0111\u01A1n`}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr key={customer.user_id} className={`border-b hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}>
                <td className="px-4 py-3">
                  {index < 3 ? <span className="text-2xl">{medals[index]}</span> : <span className="text-gray-500 font-semibold">#{index + 1}</span>}
                </td>
                <td className="px-4 py-3 font-semibold">{customer.hoten}</td>
                <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                <td className="px-4 py-3 text-gray-600">{customer.sdt || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold">{customer.total_orders}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">{customer.total_spent.toLocaleString()}{ICONS.dong}</td>
                <td className="px-4 py-3 text-right text-gray-600">{Math.round(customer.avg_order_value).toLocaleString()}{ICONS.dong}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


function TopProductsTable({ products }) {
  if (products.length === 0) return <div className="text-center py-8 text-gray-500">{`Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u s\u1EA3n ph\u1EA9m`}</div>
  const totalRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0)
  const totalSold = products.reduce((sum, p) => sum + p.total_sold, 0)
  const icons = [ICONS.fire, ICONS.star, ICONS.sparkle]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-sm text-red-700">{`T\u1ED5ng s\u1EA3n ph\u1EA9m`}</p>
          <p className="text-2xl font-bold text-red-800">{products.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm text-green-700">{`T\u1ED5ng doanh thu`}</p>
          <p className="text-2xl font-bold text-green-800">{totalRevenue.toLocaleString()}{ICONS.dong}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-700">{`T\u1ED5ng \u0111\u00E3 b\u00E1n`}</p>
          <p className="text-2xl font-bold text-blue-800">{totalSold} SP</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
            <tr>
              <th className="px-4 py-3 text-left">{`H\u1EA1ng`}</th>
              <th className="px-4 py-3 text-left">{`S\u1EA3n ph\u1EA9m`}</th>
              <th className="px-4 py-3 text-left">{`Lo\u1EA1i`}</th>
              <th className="px-4 py-3 text-right">{`Gi\u00E1`}</th>
              <th className="px-4 py-3 text-right">{`\u0110\u00E3 b\u00E1n`}</th>
              <th className="px-4 py-3 text-right">{`Doanh thu`}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={product.products_id} className={`border-b hover:bg-gray-50 ${index < 3 ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3">
                  {index < 3 ? <span className="text-2xl">{icons[index]}</span> : <span className="text-gray-500 font-semibold">#{index + 1}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    {product.hinh_anh && <img src={product.hinh_anh.startsWith('http') ? product.hinh_anh : `http://localhost:5000${product.hinh_anh}`} alt={product.ten_san_pham} className="w-12 h-12 object-cover rounded mr-3" />}
                    <span className="font-semibold">{product.ten_san_pham}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="bg-gray-100 px-2 py-1 rounded text-sm">{product.loai}</span></td>
                <td className="px-4 py-3 text-right">{product.gia_ban.toLocaleString()}{ICONS.dong}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">{product.total_sold}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">{product.total_revenue.toLocaleString()}{ICONS.dong}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


function PromotionSuggestions({ suggestions }) {
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('need') // 'all', 'need', 'has'
  const [filterCategory, setFilterCategory] = useState('')

  const priorityColors = {
    high: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-500' },
    medium: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-500' },
    low: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-500' }
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">{ICONS.party}</span>
        <p className="text-xl font-semibold text-gray-700">{`Tuy\u1EC7t v\u1EDDi!`}</p>
        <p className="text-gray-500 mt-2">{`T\u1EA5t c\u1EA3 s\u1EA3n ph\u1EA9m \u0111ang c\u00F3 hi\u1EC7u su\u1EA5t t\u1ED1t, kh\u00F4ng c\u1EA7n khuy\u1EBFn m\u00E3i th\u00EAm.`}</p>
      </div>
    )
  }

  // Lấy danh sách loại sản phẩm
  const categories = [...new Set(suggestions.map(s => s.loai).filter(Boolean))]

  // Lọc dữ liệu
  const filteredSuggestions = suggestions.filter(s => {
    if (filterPriority !== 'all' && s.priority !== filterPriority) return false
    if (filterStatus === 'need' && s.has_promotion) return false
    if (filterStatus === 'has' && !s.has_promotion) return false
    if (filterCategory && s.loai !== filterCategory) return false
    return true
  })

  const needPromotion = suggestions.filter(s => !s.has_promotion).length
  const highPriority = suggestions.filter(s => s.priority === 'high' && !s.has_promotion).length
  const mediumPriority = suggestions.filter(s => s.priority === 'medium' && !s.has_promotion).length

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-yellow-800 font-semibold">{ICONS.bulb} {`G\u1EE3i \u00FD khuy\u1EBFn m\u00E3i th\u00F4ng minh`}</p>
            <p className="text-yellow-700 text-sm">{`D\u1EF1a tr\u00EAn ph\u00E2n t\u00EDch d\u1EEF li\u1EC7u l\u01B0\u1EE3t xem v\u00E0 t\u1EF7 l\u1EC7 chuy\u1EC3n \u0111\u1ED5i`}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-yellow-800">{needPromotion}</p>
            <p className="text-sm text-yellow-700">{`SP c\u1EA7n khuy\u1EBFn m\u00E3i`}</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>{`\u01AFu ti\u00EAn cao: ${highPriority}`}</span>
          <span className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>{`Trung b\u00ECnh: ${mediumPriority}`}</span>
          <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>{`Th\u1EA5p: ${needPromotion - highPriority - mediumPriority}`}</span>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white p-4 rounded-lg border flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{`M\u1EE9c \u0111\u1ED9 \u01B0u ti\u00EAn`}</label>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="all">{`T\u1EA5t c\u1EA3`}</option>
            <option value="high">{`Cao`}</option>
            <option value="medium">{`Trung b\u00ECnh`}</option>
            <option value="low">{`Th\u1EA5p`}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{`Tr\u1EA1ng th\u00E1i`}</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="all">{`T\u1EA5t c\u1EA3`}</option>
            <option value="need">{`C\u1EA7n khuy\u1EBFn m\u00E3i`}</option>
            <option value="has">{`\u0110ang khuy\u1EBFn m\u00E3i`}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{`Lo\u1EA1i SP`}</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">{`T\u1EA5t c\u1EA3`}</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <button onClick={() => { setFilterPriority('all'); setFilterStatus('need'); setFilterCategory('') }} className="text-gray-500 hover:text-gray-700 px-3 py-2">
          {`\u0110\u1EB7t l\u1EA1i`}
        </button>
        <div className="ml-auto text-sm text-gray-500">
          {`Hi\u1EC3n th\u1ECB ${filteredSuggestions.length}/${suggestions.length} SP`}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSuggestions.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-gray-500">{`Kh\u00F4ng c\u00F3 s\u1EA3n ph\u1EA9m n\u00E0o ph\u00F9 h\u1EE3p v\u1EDBi b\u1ED9 l\u1ECDc`}</div>
        ) : filteredSuggestions.map(product => {
          const colors = priorityColors[product.priority] || priorityColors.low
          return (
            <div key={product.products_id} className={`border-2 rounded-lg p-4 hover:shadow-lg transition ${product.has_promotion ? 'bg-green-50 border-green-200' : `${colors.bg} ${colors.border}`}`}>
              <div className="flex items-start">
                {product.hinh_anh ? (
                  <img src={product.hinh_anh.startsWith('http') ? product.hinh_anh : `http://localhost:5000${product.hinh_anh}`} alt={product.ten_san_pham} className="w-20 h-20 object-cover rounded mr-4" />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded mr-4 flex items-center justify-center">
                    <span className="text-gray-400">{ICONS.camera}</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">ID: {product.products_id}</p>
                      <h4 className="font-semibold text-gray-800">{product.ten_san_pham}</h4>
                      <p className="text-sm text-gray-500">{product.loai}</p>
                    </div>
                    {!product.has_promotion && (
                      <span className={`${colors.badge} text-white text-xs px-2 py-1 rounded-full`}>
                        {product.priority_label || (product.priority === 'high' ? 'Cao' : product.priority === 'medium' ? 'TB' : `Th\u1EA5p`)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    {product.gia_khuyen_mai ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 line-through">{product.gia_ban.toLocaleString()}{ICONS.dong}</span>
                        <span className="text-lg font-bold text-red-600">{product.gia_khuyen_mai.toLocaleString()}{ICONS.dong}</span>
                        <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded">{product.promotion_info}</span>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-blue-600">{product.gia_ban.toLocaleString()}{ICONS.dong}</p>
                    )}
                  </div>
                  
                  <div className="mt-3 p-3 bg-white/70 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-center text-sm">
                      <div>
                        <p className="text-gray-500">{`L\u01B0\u1EE3t xem`}</p>
                        <p className="font-bold text-blue-600">{product.total_views}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{`\u0110\u00E3 b\u00E1n`}</p>
                        <p className="font-bold text-green-600">{product.total_sold}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-700">{product.reason}</p>
                      {product.suggested_discount && !product.has_promotion && (
                        <p className="text-xs mt-1"><span className="text-gray-500">{`G\u1EE3i \u00FD gi\u1EA3m: `}</span><span className="font-bold text-red-600">{product.suggested_discount}</span></p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    {product.has_promotion ? (
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">{ICONS.check} {`\u0110ang khuy\u1EBFn m\u00E3i`}</span>
                    ) : (
                      <Link to={`/promotions?product_id=${product.products_id}`} className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 inline-block">
                        + {`T\u1EA1o khuy\u1EBFn m\u00E3i`}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


function ViewAnalytics({ data }) {
  const { analytics, summary } = data

  if (!analytics || analytics.length === 0) {
    return <div className="text-center py-8 text-gray-500">{`Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u l\u01B0\u1EE3t xem s\u1EA3n ph\u1EA9m`}</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">{`T\u1ED5ng l\u01B0\u1EE3t xem`}</p>
          <p className="text-3xl font-bold">{(summary.total_views || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">{`T\u1ED5ng \u0111\u00E3 b\u00E1n`}</p>
          <p className="text-3xl font-bold">{(summary.total_sold || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">{`T\u1EF7 l\u1EC7 chuy\u1EC3n \u0111\u1ED5i TB`}</p>
          <p className="text-3xl font-bold">{summary.overall_conversion_rate || 0}%</p>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> {`T\u1ED1t (\u226510%)`}</span>
        <span className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span> {`Trung b\u00ECnh (5-10%)`}</span>
        <span className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span> {`Th\u1EA5p (<5%)`}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-teal-500 text-white">
            <tr>
              <th className="px-4 py-3 text-left">{`S\u1EA3n ph\u1EA9m`}</th>
              <th className="px-4 py-3 text-right">{`L\u01B0\u1EE3t xem`}</th>
              <th className="px-4 py-3 text-right">{`Ng\u01B0\u1EDDi xem`}</th>
              <th className="px-4 py-3 text-right">{`\u0110\u00E3 b\u00E1n`}</th>
              <th className="px-4 py-3 text-right">{`T\u1EF7 l\u1EC7 chuy\u1EC3n \u0111\u1ED5i`}</th>
              <th className="px-4 py-3 text-center">{`Tr\u1EA1ng th\u00E1i`}</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map(item => (
              <tr key={item.products_id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    {item.hinh_anh ? (
                      <img src={item.hinh_anh.startsWith('http') ? item.hinh_anh : `http://localhost:5000${item.hinh_anh}`} alt={item.ten_san_pham} className="w-10 h-10 object-cover rounded mr-3" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded mr-3"></div>
                    )}
                    <div>
                      <p className="font-semibold">{item.ten_san_pham}</p>
                      <p className="text-sm text-gray-500">{item.loai}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{item.total_views.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-600">{item.unique_viewers}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">{item.total_sold}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${item.conversion_rate >= 10 ? 'bg-green-100 text-green-700' : item.conversion_rate >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {item.conversion_rate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {item.conversion_rate >= 10 ? `${ICONS.green} T\u1ED1t` : item.conversion_rate >= 5 ? `${ICONS.yellow} TB` : `${ICONS.red} C\u1EA7n c\u1EA3i thi\u1EC7n`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


function CustomerSegments({ data }) {
  const { segments, total_customers } = data

  if (!segments || segments.length === 0) {
    return <div className="text-center py-8 text-gray-500">{`Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u ph\u00E2n kh\u00FAc kh\u00E1ch h\u00E0ng`}</div>
  }

  const maxCount = Math.max(...segments.map(s => s.count), 1)
  const hasCustomers = segments.filter(s => s.name !== 'Ch\u01B0a mua h\u00E0ng').reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl p-6 text-white">
          <p className="text-lg opacity-90">{`T\u1ED5ng s\u1ED1 kh\u00E1ch h\u00E0ng`}</p>
          <p className="text-5xl font-bold">{total_customers}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
          <p className="text-lg opacity-90">{`\u0110\u00E3 mua h\u00E0ng`}</p>
          <p className="text-5xl font-bold">{hasCustomers}</p>
          <p className="text-sm opacity-80 mt-1">{total_customers > 0 ? Math.round(hasCustomers / total_customers * 100) : 0}% {`t\u1ED5ng KH`}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-bold text-gray-800 mb-4">{ICONS.chart} {`Ph\u00E2n b\u1ED1 kh\u00E1ch h\u00E0ng theo gi\u00E1 tr\u1ECB`}</h3>
          <div className="space-y-4">
            {segments.map((segment, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{segment.name}</span>
                  <span className="text-sm font-bold">{segment.count} ({total_customers > 0 ? Math.round(segment.count / total_customers * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max((segment.count / maxCount) * 100, 5)}%`, backgroundColor: segment.color }}>
                    {segment.count > 0 && <span className="text-xs text-white font-semibold">{segment.count}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-bold text-gray-800 mb-4">{ICONS.target} {`Chi ti\u1EBFt ph\u00E2n kh\u00FAc`}</h3>
          <div className="space-y-3">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center p-3 rounded-lg hover:bg-gray-50 border">
                <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: segment.color }}></div>
                <div className="flex-1">
                  <span className="font-medium">{segment.name}</span>
                  <p className="text-xs text-gray-500">
                    {segment.name.includes('VIP') && `Chi ti\u00EAu tr\u00EAn 5 tri\u1EC7u`}
                    {segment.name.includes('Trung th\u00E0nh') && `Chi ti\u00EAu 2-5 tri\u1EC7u`}
                    {segment.name.includes('Th\u01B0\u1EDDng xuy\u00EAn') && `Chi ti\u00EAu 500k-2 tri\u1EC7u`}
                    {segment.name.includes('M\u1EDBi') && `Chi ti\u00EAu d\u01B0\u1EDBi 500k`}
                    {segment.name.includes('Ch\u01B0a mua') && `Ch\u01B0a c\u00F3 \u0111\u01A1n h\u00E0ng n\u00E0o`}
                  </p>
                </div>
                <span className="font-bold text-lg">{segment.count}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold text-gray-700 mb-3">{ICONS.bulb} {`G\u1EE3i \u00FD h\u00E0nh \u0111\u1ED9ng marketing:`}</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start"><span className="mr-2">{ICONS.trophy}</span> {`VIP: Ch\u01B0\u01A1ng tr\u00ECnh \u01B0u \u0111\u00E3i \u0111\u1EB7c bi\u1EC7t, qu\u00E0 t\u1EB7ng sinh nh\u1EADt`}</li>
              <li className="flex items-start"><span className="mr-2">{ICONS.greenHeart}</span> {`Trung th\u00E0nh: Voucher gi\u1EA3m gi\u00E1, t\u00EDch \u0111i\u1EC3m th\u01B0\u1EDFng`}</li>
              <li className="flex items-start"><span className="mr-2">{ICONS.blueHeart}</span> {`Th\u01B0\u1EDDng xuy\u00EAn: Email marketing, flash sale`}</li>
              <li className="flex items-start"><span className="mr-2">{ICONS.white}</span> {`M\u1EDBi: Welcome voucher, h\u01B0\u1EDBng d\u1EABn mua h\u00E0ng`}</li>
              <li className="flex items-start"><span className="mr-2">{ICONS.red}</span> {`Ch\u01B0a mua: Remarketing, khuy\u1EBFn m\u00E3i h\u1EA5p d\u1EABn`}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
