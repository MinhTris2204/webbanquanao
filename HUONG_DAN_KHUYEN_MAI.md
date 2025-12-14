# Hướng dẫn sử dụng tính năng Khuyến mãi

## Vấn đề: Không thấy khuyến mãi ở trang khách hàng

### Nguyên nhân
Trình duyệt đã cache (lưu tạm) dữ liệu cũ từ lần truy cập trước.

### Giải pháp

#### Cách 1: Hard Refresh (Khuyến nghị)
- **Windows/Linux**: Nhấn `Ctrl + Shift + R` hoặc `Ctrl + F5`
- **Mac**: Nhấn `Cmd + Shift + R`

#### Cách 2: Xóa cache trong DevTools
1. Nhấn `F12` để mở DevTools
2. Chọn tab **Network**
3. Tích chọn **Disable cache**
4. Refresh lại trang (`F5` hoặc `Ctrl + R`)

#### Cách 3: Xóa cache trình duyệt
1. Nhấn `Ctrl + Shift + Delete`
2. Chọn "Cached images and files"
3. Nhấn "Clear data"

## Hướng dẫn tạo khuyến mãi cho Admin

### Bước 1: Đăng nhập Admin
1. Truy cập `/admin`
2. Đăng nhập với tài khoản admin

### Bước 2: Tạo khuyến mãi
1. Vào menu **Khuyến mãi**
2. Nhấn nút **+ Tạo khuyến mãi**
3. Điền thông tin:
   - **Sản phẩm**: Chọn sản phẩm cần khuyến mãi
   - **Loại giảm giá**: 
     - Phần trăm (%): Giảm theo tỷ lệ phần trăm (1-99%)
     - Số tiền cố định (₫): Giảm một số tiền cụ thể
   - **Giá trị giảm**: Nhập số tiền hoặc phần trăm
   - **Ngày bắt đầu**: Thời điểm bắt đầu khuyến mãi
   - **Ngày kết thúc**: Thời điểm kết thúc khuyến mãi
   - **Kích hoạt ngay**: Tích để kích hoạt ngay lập tức

4. Nhấn **Tạo**

### Bước 3: Tạo khuyến mãi hàng loạt
1. Nhấn nút **Tạo hàng loạt**
2. Chọn nhiều sản phẩm cùng lúc
3. Điền thông tin khuyến mãi chung
4. Nhấn **Tạo hàng loạt**

### Lưu ý quan trọng
- ⏰ **Múi giờ**: Nhập thời gian theo giờ địa phương của bạn
- 📅 **Thời gian**: Ngày kết thúc phải sau ngày bắt đầu
- 🚫 **Trùng lặp**: Một sản phẩm không thể có 2 khuyến mãi cùng thời điểm
- 💰 **Giá trị**: 
  - Phần trăm: 1-99%
  - Cố định: Phải nhỏ hơn giá sản phẩm

## Kiểm tra khuyến mãi

### Tại trang Admin
1. Vào **Khuyến mãi**
2. Xem trạng thái:
   - 🟢 **Đang hoạt động**: Khuyến mãi đang có hiệu lực
   - 🔵 **Sắp diễn ra**: Chưa đến thời gian bắt đầu
   - ⚫ **Hết hạn**: Đã kết thúc hoặc bị tắt

### Tại trang khách hàng
1. Truy cập trang chủ hoặc trang sản phẩm
2. Sản phẩm có khuyến mãi sẽ hiển thị:
   - 🏷️ Badge giảm giá (ví dụ: -50%)
   - 💰 Giá khuyến mãi (màu đỏ)
   - 💸 Giá gốc (gạch ngang)

## Xử lý sự cố

### Khuyến mãi không hiển thị
1. ✅ Kiểm tra trạng thái khuyến mãi ở trang Admin
2. ✅ Đảm bảo thời gian hiện tại nằm trong khoảng thời gian khuyến mãi
3. ✅ Kiểm tra "Kích hoạt" có được bật không
4. ✅ Hard refresh trình duyệt (`Ctrl + Shift + R`)

### Không tạo được khuyến mãi
1. ✅ Kiểm tra giá trị giảm giá có hợp lệ không
2. ✅ Kiểm tra thời gian có hợp lệ không
3. ✅ Kiểm tra có khuyến mãi trùng thời gian không

## API Endpoints (Cho developers)

### Lấy danh sách sản phẩm có khuyến mãi
```bash
GET /api/products?on_sale=true
```

### Lấy chi tiết sản phẩm với khuyến mãi
```bash
GET /api/products/{product_id}
```

Response sẽ bao gồm:
```json
{
  "products_id": 1,
  "ten_san_pham": "Áo thun",
  "gia_ban": 200000,
  "promotion": {
    "id": 1,
    "discount_type": "percent",
    "discount_value": 50,
    "promotional_price": 100000
  }
}
```

## Liên hệ hỗ trợ
Nếu gặp vấn đề, vui lòng liên hệ team phát triển.
