import { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [selectedSizes, setSelectedSizes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [formData, setFormData] = useState({
    ten_san_pham: '',
    gia_ban: '',
    loai: '',
    mo_ta: '',
    size: '',
    chat_lieu: '',
    gioi_tinh: 'Unisex',
    hinh_anh: '',
    trang_thai: 'Con_hang'
  })

  const letterSizes = ['S', 'M', 'L', 'XL', 'XXL']
  const numberSizes = ['26', '27', '28', '29', '30', '31', '32', '33', '34', '36']
  const specialSizes = ['Free size']

  useEffect(() => {
    fetchProducts()
  }, [currentPage, searchTerm])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products', {
        params: {
          page: currentPage,
          per_page: 10,
          search: searchTerm
        }
      })
      setProducts(res.data.products)
      setTotalPages(res.data.pages)
      setTotalProducts(res.data.total)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Convert selected sizes array to string (use comma without space for consistency)
      const dataToSubmit = {
        ...formData,
        size: selectedSizes.join(',')
      }
      
      if (editingProduct) {
        await api.put(`/api/admin/products/${editingProduct.products_id}`, dataToSubmit)
      } else {
        await api.post('/api/admin/products', dataToSubmit)
      }
      setShowForm(false)
      setEditingProduct(null)
      resetForm()
      fetchProducts()
    } catch (err) {
      alert('Có lỗi xảy ra')
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      ten_san_pham: product.ten_san_pham,
      gia_ban: product.gia_ban,
      loai: product.loai || '',
      mo_ta: product.mo_ta || '',
      size: product.size || '',
      chat_lieu: product.chat_lieu || '',
      gioi_tinh: product.gioi_tinh || 'Unisex',
      hinh_anh: product.hinh_anh || '',
      trang_thai: product.trang_thai || 'Con_hang'
    })
    // Parse sizes from string to array (handle both ", " and "," separators)
    const sizes = product.size ? product.size.split(/,\s*/).map(s => s.trim()).filter(s => s) : []
    setSelectedSizes(sizes)
    setImagePreview(product.hinh_anh || '')
    setShowForm(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setFormData({ ...formData, hinh_anh: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const formatPrice = (value) => {
    const number = value.replace(/\D/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/\./g, '')
    setFormData({ ...formData, gia_ban: rawValue })
  }

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      try {
        await api.delete(`/api/admin/products/${id}`)
        fetchProducts()
      } catch (err) {
        alert('Có lỗi xảy ra')
      }
    }
  }

  const handleSizeToggle = (size) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  const resetForm = () => {
    setFormData({
      ten_san_pham: '',
      gia_ban: '',
      loai: '',
      mo_ta: '',
      size: '',
      chat_lieu: '',
      gioi_tinh: 'Unisex',
      hinh_anh: '',
      trang_thai: 'Con_hang'
    })
    setSelectedSizes([])
    setImagePreview('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => {
            setShowForm(true)
            setEditingProduct(null)
            resetForm()
          }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm sản phẩm
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm sản phẩm theo tên..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <svg 
            className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-sm text-gray-600 bg-gray-100 px-4 py-3 rounded-lg">
          Tổng: <span className="font-bold text-blue-600">{totalProducts}</span> sản phẩm
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {editingProduct ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm mới'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingProduct(null)
                  resetForm()
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tên sản phẩm */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">
                    Tên sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Nhập tên sản phẩm..."
                    value={formData.ten_san_pham}
                    onChange={(e) => setFormData({ ...formData, ten_san_pham: e.target.value })}
                    required
                  />
                </div>

                {/* Giá bán */}
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">
                    Giá bán (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="0"
                    value={formatPrice(formData.gia_ban.toString())}
                    onChange={handlePriceChange}
                    required
                  />
                </div>

                {/* Loại sản phẩm */}
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">
                    Loại sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={formData.loai}
                    onChange={(e) => setFormData({ ...formData, loai: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn loại --</option>
                    <option value="Áo">Áo</option>
                    <option value="Quần">Quần</option>
                    <option value="Váy">Váy</option>
                    <option value="Đầm">Đầm</option>
                    <option value="Áo khoác">Áo khoác</option>
                    <option value="Phụ kiện">Phụ kiện</option>
                  </select>
                </div>

                {/* Giới tính */}
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">Giới tính</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={formData.gioi_tinh}
                    onChange={(e) => setFormData({ ...formData, gioi_tinh: e.target.value })}
                  >
                    <option value="Unisex">🚻 Unisex</option>
                    <option value="Nam">👨 Nam</option>
                    <option value="Nữ">👩 Nữ</option>
                  </select>
                </div>

                {/* Size */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">Size (có thể chọn nhiều)</label>
                  <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 space-y-4">
                    {/* Size chữ - cho Áo, Váy, Đầm, Áo khoác */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Size chữ (Áo, Váy, Đầm, Áo khoác):</p>
                      <div className="flex flex-wrap gap-3">
                        {letterSizes.map(size => (
                          <label key={size} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSizes.includes(size)}
                              onChange={() => handleSizeToggle(size)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">{size}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Size số - cho Quần */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Size số (Quần):</p>
                      <div className="flex flex-wrap gap-3">
                        {numberSizes.map(size => (
                          <label key={size} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSizes.includes(size)}
                              onChange={() => handleSizeToggle(size)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">{size}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Free size - cho Phụ kiện */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Khác (Phụ kiện):</p>
                      <div className="flex flex-wrap gap-3">
                        {specialSizes.map(size => (
                          <label key={size} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSizes.includes(size)}
                              onChange={() => handleSizeToggle(size)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">{size}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  {selectedSizes.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                      Đã chọn: {selectedSizes.join(', ')}
                    </p>
                  )}
                </div>

                {/* Chất liệu */}
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">Chất liệu</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={formData.chat_lieu}
                    onChange={(e) => setFormData({ ...formData, chat_lieu: e.target.value })}
                  >
                    <option value="">-- Chọn chất liệu --</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Polyester">Polyester</option>
                    <option value="Linen">Linen</option>
                    <option value="Denim">Denim</option>
                    <option value="Silk">Silk</option>
                    <option value="Wool">Wool</option>
                    <option value="Nylon">Nylon</option>
                    <option value="Spandex">Spandex</option>
                    <option value="Cotton blend">Cotton blend</option>
                    <option value="Vải thun">Vải thun</option>
                  </select>
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">Trạng thái</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={formData.trang_thai}
                    onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                  >
                    <option value="Con_hang">✅ Còn hàng</option>
                    <option value="Het_hang">❌ Hết hàng</option>
                    <option value="Ngung_ban">⛔ Ngừng bán</option>
                  </select>
                </div>

                {/* Hình ảnh */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">Hình ảnh sản phẩm</label>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-gray-500 mt-2">Chọn file ảnh từ máy tính (JPG, PNG, GIF)</p>
                    </div>
                    {imagePreview && (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('')
                            setFormData({ ...formData, hinh_anh: '' })
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mô tả */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">Mô tả</label>
                  <textarea
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    rows="4"
                    placeholder="Mô tả chi tiết về sản phẩm..."
                    value={formData.mo_ta}
                    onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  {editingProduct ? '💾 Cập nhật' : '➕ Thêm sản phẩm'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingProduct(null)
                    resetForm()
                  }}
                  className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Hình ảnh</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tên sản phẩm</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Giá bán</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Size</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Giới tính</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.products_id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">#{product.products_id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.hinh_anh ? (
                      <img 
                        src={product.hinh_anh} 
                        alt={product.ten_san_pham} 
                        className="w-20 h-20 object-cover rounded-lg shadow-md border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs font-semibold shadow-md">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{product.ten_san_pham}</div>
                    {product.chat_lieu && (
                      <div className="text-xs text-gray-500 mt-1">Chất liệu: {product.chat_lieu}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                      {product.loai}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-bold text-blue-600">
                      {product.gia_ban?.toLocaleString('vi-VN')}₫
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 font-medium">{product.size || '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      product.gioi_tinh === 'Nam' ? 'bg-blue-100 text-blue-800' :
                      product.gioi_tinh === 'Nữ' ? 'bg-rose-100 text-rose-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {product.gioi_tinh === 'Nam' ? '👨 Nam' :
                       product.gioi_tinh === 'Nữ' ? '👩 Nữ' : '🚻 Unisex'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                      product.trang_thai === 'Con_hang' ? 'bg-green-100 text-green-800' :
                      product.trang_thai === 'Het_hang' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {product.trang_thai === 'Con_hang' ? '✅ Còn hàng' :
                       product.trang_thai === 'Het_hang' ? '❌ Hết hàng' : '⛔ Ngừng bán'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(product.products_id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg font-medium">
              {searchTerm ? 'Không tìm thấy sản phẩm nào' : 'Chưa có sản phẩm nào'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn nút "Thêm sản phẩm" để bắt đầu'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600">
            Trang <span className="font-bold text-blue-600">{currentPage}</span> / {totalPages}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
              }`}
            >
              ← Trước
            </button>
            
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="px-2 py-2 text-gray-400">...</span>
                }
                return null
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
              }`}
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
