# Test Reviews API Endpoints

## 1. Test lấy tất cả đánh giá (Admin)

```bash
# Lấy tất cả đánh giá
curl -X GET "http://localhost:5000/api/reviews/admin/all" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Lọc theo rating
curl -X GET "http://localhost:5000/api/reviews/admin/all?rating=1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Lọc theo trạng thái phản hồi
curl -X GET "http://localhost:5000/api/reviews/admin/all?has_reply=false" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Sắp xếp
curl -X GET "http://localhost:5000/api/reviews/admin/all?sort_by=lowest" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Phân trang
curl -X GET "http://localhost:5000/api/reviews/admin/all?page=2&per_page=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 2. Test lấy cảnh báo (Admin)

```bash
curl -X GET "http://localhost:5000/api/reviews/admin/alerts" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 3. Test tạo phản hồi (Admin)

```bash
curl -X POST "http://localhost:5000/api/reviews/1/reply" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reply": "Cảm ơn bạn đã đánh giá! Chúng tôi rất vui khi bạn hài lòng với sản phẩm."
  }'
```

## 4. Test cập nhật phản hồi (Admin)

```bash
curl -X PUT "http://localhost:5000/api/reviews/1/reply" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reply": "Cảm ơn bạn rất nhiều! Chúng tôi sẽ tiếp tục cải thiện chất lượng sản phẩm."
  }'
```

## 5. Test xóa phản hồi (Admin)

```bash
curl -X DELETE "http://localhost:5000/api/reviews/1/reply" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 6. Test xóa đánh giá (Admin)

```bash
curl -X DELETE "http://localhost:5000/api/reviews/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 7. Test lấy đánh giá sản phẩm (Public)

```bash
curl -X GET "http://localhost:5000/api/reviews/product/1"
```

## Expected Responses:

### Success Response (Get All Reviews):
```json
{
  "reviews": [
    {
      "id": 1,
      "product_id": 1,
      "user_id": 2,
      "order_id": 5,
      "rating": 5,
      "comment": "Sản phẩm rất tốt!",
      "user_name": "Nguyễn Văn A",
      "created_at": "2024-12-14T10:00:00",
      "updated_at": "2024-12-14T10:00:00",
      "product": {
        "products_id": 1,
        "ten_san_pham": "Áo thun nam",
        "gia_ban": 150000,
        "loai": "Áo",
        "hinh_anh": "...",
        "rating": {
          "average_rating": 4.5,
          "total_reviews": 10
        }
      },
      "reply": {
        "id": 1,
        "review_id": 1,
        "reply": "Cảm ơn bạn!",
        "created_at": "2024-12-14T11:00:00",
        "updated_at": "2024-12-14T11:00:00"
      }
    }
  ],
  "total": 50,
  "pages": 3,
  "current_page": 1
}
```

### Success Response (Alerts):
```json
{
  "alerts": [
    {
      "product_id": 5,
      "product_name": "Quần jean nam",
      "product_image": "...",
      "recent_one_star": 5,
      "total_one_star": 8
    }
  ]
}
```

### Error Responses:
```json
{
  "error": "Admin access required"
}
```

```json
{
  "error": "Reply already exists"
}
```

```json
{
  "error": "Reply does not exist"
}
```
