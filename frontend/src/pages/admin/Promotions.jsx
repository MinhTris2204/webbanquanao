import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import api from '../../utils/api';

export default function Promotions() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [stats, setStats] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    confirmColor: 'red',
    onConfirm: null
  });

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dữ liệu form
  const [formData, setFormData] = useState({
    product_id: '',
    discount_type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Product search in modal
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Bulk form data
  const [bulkFormData, setBulkFormData] = useState({
    product_ids: [],
    discount_type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: ''
  });

  // Kiểm tra URL có product_id để tự động mở modal
  useEffect(() => {
    const productIdFromUrl = searchParams.get('product_id');
    if (productIdFromUrl && products.length > 0) {
      const product = products.find(p => p.products_id === parseInt(productIdFromUrl));
      if (product) {
        setFormData(prev => ({ ...prev, product_id: parseInt(productIdFromUrl) }));
        setShowModal(true);
        // Xóa param khỏi URL
        setSearchParams({});
      }
    }
  }, [searchParams, products]);

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
    setSubmitting(true);
    try {
      // Convert local datetime to ISO string (UTC)
      const submitData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      if (editingPromotion) {
        await api.put(`/api/promotions/${editingPromotion.id}`, submitData);
        toast.success('Cập nhật khuyến mãi thành công!');
      } else {
        await api.post('/api/promotions/', submitData);
        toast.success('Tạo khuyến mãi thành công!');
      }
      setShowModal(false);
      resetForm();
      fetchPromotions();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkFormData.product_ids.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    setSubmitting(true);
    try {
      // Convert local datetime to ISO string (UTC)
      const submitData = {
        ...bulkFormData,
        start_date: new Date(bulkFormData.start_date).toISOString(),
        end_date: new Date(bulkFormData.end_date).toISOString()
      };

      const response = await api.post('/api/promotions/bulk', submitData);
      toast.success(response.data.message);
      setShowBulkModal(false);
      resetBulkForm();
      fetchPromotions();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa khuyến mãi',
      message: 'Bạn có chắc muốn xóa khuyến mãi này?',
      confirmText: 'Xóa khuyến mãi',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await api.delete(`/api/promotions/${id}`);
          toast.success('Xóa khuyến mãi thành công!');
          fetchPromotions();
          fetchStats();
        } catch (error) {
          toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);

    // Convert UTC datetime to local datetime for editing
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    // Định dạng cho input datetime-local (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      product_id: promotion.product_id,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      start_date: formatDateTimeLocal(startDate),
      end_date: formatDateTimeLocal(endDate),
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
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const filteredProductsForModal = products.filter(product =>
    product.ten_san_pham.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.products_id.toString().includes(productSearch)
  );

  const selectedProduct = products.find(p => p.products_id === parseInt(formData.product_id));

  const calculatePreviewPrice = () => {
    if (!selectedProduct || !formData.discount_value) return null;
    const originalPrice = parseFloat(selectedProduct.gia_ban);
    const discountValue = parseFloat(formData.discount_value);

    if (formData.discount_type === 'percent') {
      return originalPrice - (originalPrice * discountValue / 100);
    } else {
      return originalPrice - discountValue;
    }
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
      <div className="flex justify-end items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Tạo khuyến mãi
          </button>
          <button
            onClick={() => { resetBulkForm(); setShowBulkModal(true); }}
            className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {editingPromotion ? '✏️ Sửa khuyến mãi' : '✨ Tạo khuyến mãi mới'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {editingPromotion ? 'Cập nhật thông tin khuyến mãi' : 'Điền thông tin để tạo khuyến mãi cho sản phẩm'}
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {/* Product Selection with Search */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      🏷️ Sản phẩm <span className="text-red-500">*</span>
                    </label>
                    {editingPromotion ? (
                      <div className="w-full border rounded-lg px-4 py-3 bg-gray-50">
                        <div className="font-medium">{selectedProduct?.ten_san_pham}</div>
                        <div className="text-sm text-gray-500">
                          Giá: {selectedProduct?.gia_ban?.toLocaleString()}₫
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="🔍 Tìm kiếm sản phẩm theo tên hoặc ID..."
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setShowProductDropdown(true);
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />

                        {/* Selected Product Display */}
                        {selectedProduct && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-medium text-blue-900">{selectedProduct.ten_san_pham}</div>
                              <div className="text-sm text-blue-700">
                                ID: {selectedProduct.products_id} | Giá: {selectedProduct.gia_ban?.toLocaleString()}₫
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, product_id: '' });
                                setProductSearch('');
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Dropdown List */}
                        {showProductDropdown && !selectedProduct && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredProductsForModal.length === 0 ? (
                              <div className="p-4 text-center text-gray-500">
                                Không tìm thấy sản phẩm
                              </div>
                            ) : (
                              filteredProductsForModal.map(product => (
                                <button
                                  key={product.products_id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, product_id: product.products_id });
                                    setShowProductDropdown(false);
                                    setProductSearch('');
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition"
                                >
                                  <div className="font-medium">{product.ten_san_pham}</div>
                                  <div className="text-sm text-gray-500">
                                    ID: {product.products_id} | Giá: {product.gia_ban?.toLocaleString()}₫
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discount Type and Value */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        💰 Loại giảm giá <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.discount_type}
                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="percent">📊 Phần trăm (%)</option>
                        <option value="fixed">💵 Số tiền cố định (₫)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        {formData.discount_type === 'percent' ? '📊 Giá trị (%)' : '💵 Giá trị (₫)'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        min="1"
                        max={formData.discount_type === 'percent' ? '99' : undefined}
                        step={formData.discount_type === 'percent' ? '1' : '1000'}
                        placeholder={formData.discount_type === 'percent' ? 'Ví dụ: 50' : 'Ví dụ: 100000'}
                      />
                    </div>
                  </div>

                  {/* Price Preview */}
                  {selectedProduct && formData.discount_value && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">📊 Xem trước giá:</div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-gray-500 text-sm line-through">
                            Giá gốc: {selectedProduct.gia_ban?.toLocaleString()}₫
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            Giá sale: {calculatePreviewPrice()?.toLocaleString()}₫
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Tiết kiệm</div>
                          <div className="text-xl font-bold text-red-600">
                            {(selectedProduct.gia_ban - calculatePreviewPrice())?.toLocaleString()}₫
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        📅 Ngày bắt đầu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">⏰ Nhập theo giờ địa phương</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        📅 Ngày kết thúc <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">⏰ Nhập theo giờ địa phương</p>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        ✅ Kích hoạt khuyến mãi ngay lập tức
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-2 ml-8">
                      Nếu bỏ chọn, khuyến mãi sẽ ở trạng thái tạm dừng
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    disabled={submitting}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition disabled:opacity-50"
                  >
                    ❌ Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.product_id || submitting}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? '⏳ Đang xử lý...' : (editingPromotion ? '✏️ Cập nhật' : '✨ Tạo khuyến mãi')}
                  </button>
                </div>
              </form>
            </div>
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
                  disabled={submitting}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '⏳ Đang xử lý...' : 'Tạo hàng loạt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className={`px-6 py-4 rounded-t-xl ${confirmModal.confirmColor === 'red' ? 'bg-red-500' : 'bg-blue-600'}`}>
              <h3 className="text-xl font-bold text-white mb-0">{confirmModal.title}</h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 text-lg mb-6">
                {confirmModal.message}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 text-white px-4 py-2 rounded-lg font-semibold transition shadow-md ${confirmModal.confirmColor === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {confirmModal.confirmText}
                </button>
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
