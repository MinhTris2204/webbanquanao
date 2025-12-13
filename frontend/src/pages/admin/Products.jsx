import { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    ten_san_pham: '',
    gia_ban: '',
    mo_ta: '',
    size: '',
    chat_lieu: '',
    hinh_anh: '',
    trang_thai: 'available'
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data.products)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.products_id}`, formData)
      } else {
        await api.post('/admin/products', formData)
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
      mo_ta: product.mo_ta || '',
      size: product.size || '',
      chat_lieu: product.chat_lieu || '',
      hinh_anh: product.hinh_anh || '',
      trang_thai: product.trang_thai || 'available'
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      try {
        await api.delete(`/admin/products/${id}`)
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
      mo_ta: '',
      size: '',
      chat_lieu: '',
      hinh_anh: '',
      trang_thai: 'available'
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
              <label className="block text-gray-700 mb-2">Tên sản phẩm</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                value={formData.ten_san_pham}
                onChange={(e) => setFormData({ ...formData, ten_san_pham: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Giá bán</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded"
                value={formData.gia_ban}
                onChange={(e) => setFormData({ ...formData, gia_ban: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Size</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Chất liệu</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                value={formData.chat_lieu}
                onChange={(e) => setFormData({ ...formData, chat_lieu: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2">Mô tả</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows="3"
                value={formData.mo_ta}
                onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2">URL hình ảnh</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                value={formData.hinh_anh}
                onChange={(e) => setFormData({ ...formData, hinh_anh: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              >
                {editingProduct ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Tên sản phẩm</th>
              <th className="px-6 py-3 text-left">Giá</th>
              <th className="px-6 py-3 text-left">Size</th>
              <th className="px-6 py-3 text-left">Trạng thái</th>
              <th className="px-6 py-3 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.products_id} className="border-t">
                <td className="px-6 py-4">{product.products_id}</td>
                <td className="px-6 py-4">{product.ten_san_pham}</td>
                <td className="px-6 py-4">{product.gia_ban?.toLocaleString('vi-VN')} đ</td>
                <td className="px-6 py-4">{product.size}</td>
                <td className="px-6 py-4">{product.trang_thai}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-500 hover:underline mr-4"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(product.products_id)}
                    className="text-red-500 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
