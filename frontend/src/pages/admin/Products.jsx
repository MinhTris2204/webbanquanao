import { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
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

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products')
      setProducts(res.data.products)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await api.put(`/api/admin/products/${editingProduct.products_id}`, formData)
      } else {
        await api.post('/api/admin/products', formData)
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
    setShowForm(true)
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
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingProduct(null)
            resetForm()
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Đóng' : 'Thêm sản phẩm'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Tên sản phẩm *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={formData.ten_san_pham}
                onChange={(e) => setFormData({ ...formData, ten_san_pham: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Giá bán (VNĐ) *</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={formData.gia_ban}
                onChange={(e) => setFormData({ ...formData, gia_ban: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Loại sản phẩm *</label>
              <select
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
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

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Giới tính</label>
              <select
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={formData.gioi_tinh}
                onChange={(e) => setFormData({ ...formData, gioi_tinh: e.target.value })}
              >
                <option value="Unisex">Unisex</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Size</label>
              <input
                type="text"
                placeholder="S, M, L, XL"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Chất liệu</label>
              <input
                type="text"
                placeholder="Cotton, Polyester..."
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={formData.chat_lieu}
                onChange={(e) => setFormData({ ...formData, chat_lieu: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Trạng thái</label>
              <select
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={formData.trang_thai}
                onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
              >
                <option value="Con_hang">Còn hàng</option>
                <option value="Het_hang">Hết hàng</option>
                <option value="Ngung_ban">Ngừng bán</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2 font-semibold">URL hình ảnh</label>
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={formData.hinh_anh}
                onChange={(e) => setFormData({ ...formData, hinh_anh: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2 font-semibold">Mô tả</label>
              <textarea
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Mô tả chi tiết về sản phẩm..."
                value={formData.mo_ta}
                onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
              />
            </div>

            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition"
              >
                {editingProduct ? 'Cập nhật' : 'Thêm sản phẩm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingProduct(null)
                  resetForm()
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Hình ảnh</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Tên sản phẩm</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Loại</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Giá bán</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Size</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Giới tính</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Trạng thái</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.products_id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-4">{product.products_id}</td>
                <td className="px-4 py-4">
                  {product.hinh_anh ? (
                    <img src={product.hinh_anh} alt={product.ten_san_pham} className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                      No img
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 font-medium">{product.ten_san_pham}</td>
                <td className="px-4 py-4">{product.loai}</td>
                <td className="px-4 py-4 text-blue-600 font-semibold">{product.gia_ban?.toLocaleString('vi-VN')} đ</td>
                <td className="px-4 py-4">{product.size || '-'}</td>
                <td className="px-4 py-4">{product.gioi_tinh}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    product.trang_thai === 'Con_hang' ? 'bg-green-100 text-green-800' :
                    product.trang_thai === 'Het_hang' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {product.trang_thai === 'Con_hang' ? 'Còn hàng' :
                     product.trang_thai === 'Het_hang' ? 'Hết hàng' : 'Ngừng bán'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-500 hover:text-blue-700 mr-3 font-medium"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(product.products_id)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Chưa có sản phẩm nào
          </div>
        )}
      </div>
    </div>
  )
}
