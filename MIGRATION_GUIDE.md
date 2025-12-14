# Hướng dẫn Migration cho Review Replies

## Các bước thực hiện:

### 1. Chạy migration để tạo bảng review_replies

```bash
cd backend
flask db upgrade
```

Hoặc nếu bạn đang dùng Docker:

```bash
docker-compose exec backend flask db upgrade
```

### 2. Kiểm tra bảng đã được tạo

Kết nối vào PostgreSQL và kiểm tra:

```sql
\d review_replies
```

Bảng `review_replies` sẽ có cấu trúc:
- `id` (Primary Key)
- `review_id` (Foreign Key to reviews.id, UNIQUE)
- `reply` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### 3. Khởi động lại backend (nếu cần)

```bash
docker-compose restart backend
```

## Tính năng mới:

### Admin có thể:
1. ✅ Xem tất cả đánh giá với bộ lọc:
   - Lọc theo số sao (1-5⭐)
   - Lọc theo trạng thái phản hồi (đã/chưa phản hồi)
   - Sắp xếp theo ngày, đánh giá cao/thấp
   - Lọc theo khoảng thời gian

2. 💬 Phản hồi đánh giá:
   - Trả lời trực tiếp từng review
   - Chỉnh sửa phản hồi
   - Xóa phản hồi

3. 🗑️ Xóa đánh giá tiêu cực:
   - Xóa các bình luận không phù hợp

4. ⚠️ Nhận cảnh báo:
   - Sản phẩm có nhiều đánh giá 1⭐ trong 7 ngày gần đây (≥3 đánh giá)
   - Hiển thị thông tin sản phẩm cần xử lý

### Khách hàng có thể:
1. ✅ Xem phản hồi từ shop trên trang sản phẩm
2. 💬 Phản hồi được hiển thị với badge "PHẢN HỒI TỪ SHOP"

## API Endpoints mới:

### Admin Routes:
- `GET /api/reviews/admin/all` - Lấy tất cả đánh giá với bộ lọc
- `GET /api/reviews/admin/alerts` - Lấy cảnh báo sản phẩm có nhiều 1⭐
- `POST /api/reviews/{review_id}/reply` - Tạo phản hồi
- `PUT /api/reviews/{review_id}/reply` - Cập nhật phản hồi
- `DELETE /api/reviews/{review_id}/reply` - Xóa phản hồi
- `DELETE /api/reviews/{review_id}` - Xóa đánh giá (Admin hoặc chủ review)

## Truy cập trang quản lý:

Sau khi đăng nhập admin, vào:
**Admin Panel → Đánh giá** (Reviews)

URL: `http://localhost:5173/admin.html#/reviews`
