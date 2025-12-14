# Tính năng Khuyến mãi Sản phẩm

## Tổng quan
Hệ thống khuyến mãi cho phép admin thiết lập giảm giá trực tiếp trên sản phẩm với thời gian có hiệu lực. Khách hàng có thể xem giá khuyến mãi và duyệt trang sale.

## Các tính năng chính

### 1. Admin - Quản lý khuyến mãi
- ✅ Tạo khuyến mãi cho sản phẩm (giảm theo % hoặc số tiền cố định)
- ✅ Xem danh sách khuyến mãi với bộ lọc (đang hoạt động, sắp diễn ra, đã hết hạn)
- ✅ Tìm kiếm khuyến mãi theo tên sản phẩm
- ✅ Sửa và xóa khuyến mãi
- ✅ Tạo khuyến mãi hàng loạt cho nhiều sản phẩm
- ✅ Xem thống kê khuyến mãi (số lượng active, upcoming, expired)
- ✅ Validation: không cho phép khuyến mãi trùng thời gian cho cùng sản phẩm

### 2. Khách hàng - Xem sản phẩm khuyến mãi
- ✅ Trang Sale riêng hiển thị tất cả sản phẩm đang giảm giá
- ✅ Badge giảm giá hiển thị trên sản phẩm
- ✅ Hiển thị giá gốc và giá khuyến mãi
- ✅ Lọc sản phẩm sale theo danh mục
- ✅ Sắp xếp theo giảm giá, giá, tên
- ✅ Link "🔥 SALE" nổi bật trên navbar

### 3. Hiển thị khuyến mãi
- ✅ Badge giảm giá trên product card (trang Products, Home)
- ✅ Hiển thị giá gốc gạch ngang và giá khuyến mãi màu đỏ
- ✅ Trang chi tiết sản phẩm hiển thị số tiền tiết kiệm
- ✅ Tự động tính toán % giảm giá

## Cấu trúc Database

### Bảng `promotions`
```sql
- id: Integer (Primary Key)
- product_id: Integer (Foreign Key -> products)
- discount_type: Enum ('percent', 'fixed')
- discount_value: Numeric(12,2)
- start_date: Timestamp
- end_date: Timestamp
- is_active: Boolean
- created_at: Timestamp
- updated_at: Timestamp
```

### Indexes
- idx_promotions_product_id
- idx_promotions_dates
- idx_promotions_active

## API Endpoints

### Admin Routes (Cần authentication)
- `GET /api/promotions/` - Lấy danh sách khuyến mãi (có filter, search, pagination)
- `GET /api/promotions/:id` - Lấy chi tiết khuyến mãi
- `POST /api/promotions/` - Tạo khuyến mãi mới
- `PUT /api/promotions/:id` - Cập nhật khuyến mãi
- `DELETE /api/promotions/:id` - Xóa khuyến mãi
- `POST /api/promotions/bulk` - Tạo khuyến mãi hàng loạt
- `GET /api/promotions/stats` - Lấy thống kê khuyến mãi

### Public Routes
- `GET /api/products/on-sale` - Lấy sản phẩm đang sale (có filter, sort, pagination)
- `GET /api/products/` - Đã cập nhật để bao gồm thông tin promotion

## Cách sử dụng

### 1. Chạy migration
```bash
cd backend
flask db upgrade
```

### 2. Truy cập trang admin
- Đăng nhập admin tại `/admin.html`
- Vào menu "Khuyến mãi"

### 3. Tạo khuyến mãi
- Click "Tạo khuyến mãi"
- Chọn sản phẩm
- Chọn loại giảm giá (% hoặc số tiền)
- Nhập giá trị giảm
- Chọn thời gian bắt đầu và kết thúc
- Click "Tạo"

### 4. Tạo khuyến mãi hàng loạt
- Click "Tạo hàng loạt"
- Chọn nhiều sản phẩm
- Nhập thông tin giảm giá chung
- Click "Tạo hàng loạt"

### 5. Khách hàng xem sale
- Truy cập trang chủ
- Click vào link "🔥 SALE" trên navbar
- Hoặc truy cập `/sale`

## Validation Rules

1. **Discount Value**
   - Percent: 1-99%
   - Fixed: Phải nhỏ hơn giá sản phẩm

2. **Dates**
   - End date phải sau start date
   - Không cho phép khuyến mãi trùng thời gian cho cùng sản phẩm

3. **Active Status**
   - Tự động kiểm tra thời gian hiện tại
   - Chỉ áp dụng khuyến mãi đang trong thời gian hiệu lực

## Files đã tạo/sửa

### Backend
- ✅ `backend/models.py` - Thêm model Promotion và method get_active_promotion
- ✅ `backend/routes/promotions.py` - API routes cho quản lý khuyến mãi
- ✅ `backend/routes/products.py` - Thêm endpoint /on-sale
- ✅ `backend/app.py` - Đăng ký promotions blueprint
- ✅ `backend/migrations/versions/add_promotions_table.py` - Migration file

### Frontend
- ✅ `frontend/src/pages/admin/Promotions.jsx` - Trang quản lý khuyến mãi admin
- ✅ `frontend/src/pages/Sale.jsx` - Trang sale cho khách hàng
- ✅ `frontend/src/AdminApp.jsx` - Thêm route /promotions
- ✅ `frontend/src/App.jsx` - Thêm route /sale
- ✅ `frontend/src/components/AdminSidebar.jsx` - Thêm menu Khuyến mãi
- ✅ `frontend/src/components/CustomerNavbar.jsx` - Thêm link SALE
- ✅ `frontend/src/pages/ProductDetail.jsx` - Hiển thị giá khuyến mãi
- ✅ `frontend/src/pages/Products.jsx` - Hiển thị badge và giá khuyến mãi
- ✅ `frontend/src/pages/Home.jsx` - Hiển thị badge và giá khuyến mãi

## Lưu ý
- Khuyến mãi sản phẩm khác với voucher: khuyến mãi áp dụng trực tiếp lên giá sản phẩm, voucher áp dụng lên tổng đơn hàng
- Một sản phẩm chỉ có thể có 1 khuyến mãi active tại một thời điểm
- Giá khuyến mãi được tính tự động khi khách hàng xem sản phẩm
- Admin có thể tạo khuyến mãi trước và hệ thống sẽ tự động kích hoạt khi đến thời gian
