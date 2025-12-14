import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Form data
  const [formData, setFormData] = useState({
    product_id: '',
    discount_type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: '',
    is_active: true
  });
  
  // Bulk form data
  const [bulkFormData, setBulkFormData] = useState({
    product_ids: [],
    discount_type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
    fetchStats();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/promotions/', {
        params: {
          page: currentPage,
          per_page: 20,
          search: searchTerm,
          status: statusFilter
        }
      });
      setPromotions(response.data.promotions);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products/', { params: { per_page: 1000 } });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/promotions/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        await api.put(`/api/promotions/${editingPromotion.id}`, formData);
        alert('Cập nhật khuyến mãi thành công!');
      } else {
        await api.post('/api/promotions/', formData);
        alert('Tạo khuyến mãi thành công!');
      }
      setShowModal(false);
      resetForm();
      fetchPromotions();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkFormData.product_ids.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }
    
    try {
      const response = await api.post('/api/promotions/bulk', bulkFormData);
      alert(response.data.message);
      setShowBulkModal(false);
      resetBulkForm();
      fetchPromotions();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa khuyến mãi này?')) return;
    
    try {
      await api.delete(`/api/promotions/${id}`);
      alert('Xóa khuyến mãi thành công!');
      fetchPromotions();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      product_id: promotion.product_id,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      start_date: promotion.start_date.slice(0, 16),
      end_date: promotion.end_date.slice(0, 16),
      is_active: promotion.is_active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      discount_type: 'percent',
      discount_value: '',
      start_date: '',
      end_date: '',
      is_active: true
    });
    setEditingPromotion(null);
  };

  const resetBulkForm = () => {
    setBulkFormData({
      product_ids: [],
      discount_type: 'percent',
      discount_value: '',
      start_date: '',
      end_date: ''
    });
  };

  const getStatusBadge = (promotion) => {
    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    
    if (!promotion.is_active || end < now) {
      return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">Hết hạn</span>;
    } else if (start > now) {
      return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Sắp diễn ra</span>;
    } else {
      return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Đang hoạt động</span>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const toggleProductSelection = (productId) => {
    setBulkFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý khuyến mãi</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Tạo khuyến mãi
          </button>
          <button
            onClick={() => { resetBulkForm(); setShowBulkModal(true); }}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Tạo hàng loạt
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Đang hoạt động</div>
            <div className="text-2xl font-bold text-green-600">{stats.active_count}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Sắp diễn ra</div>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming_count}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Đã hết hạn</div>
            <div className="text-2xl font-bold text-gray-600">{stats.expired_count}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Tổng cộng</div>
            <div className="text-2xl font-bold">{stats.total_count}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="border rounded px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="border rounded px-3 py-2"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Đang tải...</div>
        ) : promotions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có khuyến mãi nào</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giảm giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{promotion.product?.ten_san_pham}</div>
                    <div className="text-sm text-gray-500">
                      Giá gốc: {promotion.product?.gia_ban?.toLocaleString()}₫
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {promotion.discount_type === 'percent' ? (
                      <span className="font-semibold text-red-600">-{promotion.discount_value}%</span>
                    ) : (
                      <span className="font-semibold text-red-600">-{promotion.discount_value?.toLocaleString()}₫</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>Từ: {formatDate(promotion.start_date)}</div>
                    <div>Đến: {formatDate(promotion.end_date)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(promotion)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(promotion)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(promotion.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Trước
          </button>
          <span className="px-4 py-2">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPromotion ? 'Sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sản phẩm</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                    disabled={editingPromotion}
                  >
                    <option value="">Chọn sản phẩm</option>
                    {products.map(product => (
                      <option key={product.products_id} value={product.products_id}>
                        {product.ten_san_pham} - {product.gia_ban?.toLocaleString()}₫
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Loại giảm giá</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (₫)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá trị giảm {formData.discount_type === 'percent' ? '(%)' : '(₫)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                    min="1"
                    step={formData.discount_type === 'percent' ? '1' : '1000'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Lưu ý: Nhập theo giờ địa phương của bạn</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Lưu ý: Nhập theo giờ địa phương của bạn</p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm">Kích hoạt ngay</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingPromotion ? 'Cập nhật' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-xl font-bold mb-4">Tạo khuyến mãi hàng loạt</h2>
            <form onSubmit={handleBulkSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chọn sản phẩm ({bulkFormData.product_ids.length} đã chọn)
                  </label>
                  <div className="border rounded p-3 max-h-60 overflow-y-auto">
                    {products.map(product => (
                      <label key={product.products_id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkFormData.product_ids.includes(product.products_id)}
                          onChange={() => toggleProductSelection(product.products_id)}
                          className="mr-3"
                        />
                        <span>{product.ten_san_pham} - {product.gia_ban?.toLocaleString()}₫</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Loại giảm giá</label>
                    <select
                      value={bulkFormData.discount_type}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, discount_type: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="percent">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (₫)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Giá trị giảm {bulkFormData.discount_type === 'percent' ? '(%)' : '(₫)'}
                    </label>
                    <input
                      type="number"
                      value={bulkFormData.discount_value}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, discount_value: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                      min="1"
                      step={bulkFormData.discount_type === 'percent' ? '1' : '1000'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                    <input
                      type="datetime-local"
                      value={bulkFormData.start_date}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, start_date: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                    <input
                      type="datetime-local"
                      value={bulkFormData.end_date}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, end_date: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowBulkModal(false); resetBulkForm(); }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Tạo hàng loạt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
