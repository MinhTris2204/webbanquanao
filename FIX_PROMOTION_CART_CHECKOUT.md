# Fix: Áp dụng giá khuyến mãi vào giỏ hàng và đơn hàng

## Vấn đề
Khi thêm sản phẩm khuyến mãi vào giỏ hàng và thanh toán, hệ thống vẫn tính theo giá gốc thay vì giá khuyến mãi.

## Nguyên nhân
- Backend tính tổng tiền dựa trên `product.gia_ban` (giá gốc)
- Không kiểm tra xem sản phẩm có khuyến mãi đang hoạt động hay không
- Frontend hiển thị giá gốc thay vì giá khuyến mãi

## Giải pháp đã thực hiện

### 1. Backend - Cart API (`backend/routes/cart.py`)

**Trước:**
```python
item_total = float(product.gia_ban) * item.quantity
```

**Sau:**
```python
product_dict = product.to_dict()

# Use promotional price if available, otherwise use regular price
if product_dict.get('promotion') and product_dict['promotion'].get('promotional_price'):
    unit_price = product_dict['promotion']['promotional_price']
else:
    unit_price = float(product.gia_ban)

item_total = unit_price * item.quantity
```

**Thay đổi:**
- ✅ Kiểm tra sản phẩm có khuyến mãi không
- ✅ Sử dụng `promotional_price` nếu có
- ✅ Trả về `unit_price` trong response để frontend biết giá đang dùng

### 2. Backend - Orders API (`backend/routes/orders.py`)

**Cập nhật 2 chỗ:**

#### a) Tính tổng tiền đơn hàng
```python
# Calculate total first (with promotional prices if available)
total = 0
for item in cart.cart_items:
    product = item.product
    product_dict = product.to_dict()
    
    # Use promotional price if available
    if product_dict.get('promotion') and product_dict['promotion'].get('promotional_price'):
        unit_price = product_dict['promotion']['promotional_price']
    else:
        unit_price = float(product.gia_ban)
    
    line_total = unit_price * item.quantity
    total += line_total
```

#### b) Tạo OrderDetail
```python
# Create order details (with promotional prices if available)
for item in cart.cart_items:
    product = item.product
    product_dict = product.to_dict()
    
    # Use promotional price if available
    if product_dict.get('promotion') and product_dict['promotion'].get('promotional_price'):
        unit_price = product_dict['promotion']['promotional_price']
    else:
        unit_price = float(product.gia_ban)
    
    line_total = unit_price * item.quantity
    
    order_detail = OrderDetail(
        order_id=order.id,
        product_id=item.products_id,
        unit_price=unit_price,  # Lưu giá khuyến mãi
        quantity=item.quantity,
        ...
    )
```

### 3. Frontend - Cart Page (`frontend/src/pages/Cart.jsx`)

**Trước:**
```jsx
<p className="text-2xl font-bold text-blue-600 mt-3">
  {item.product.gia_ban?.toLocaleString('vi-VN')}₫
</p>
```

**Sau:**
```jsx
{item.product.promotion ? (
  <div className="mt-3">
    <div className="flex items-center gap-2">
      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
        -{Math.round(((item.product.gia_ban - item.product.promotion.promotional_price) / item.product.gia_ban) * 100)}%
      </span>
    </div>
    <p className="text-2xl font-bold text-red-600 mt-1">
      {item.unit_price?.toLocaleString('vi-VN')}₫
    </p>
    <p className="text-sm text-gray-500 line-through">
      {item.product.gia_ban?.toLocaleString('vi-VN')}₫
    </p>
  </div>
) : (
  <p className="text-2xl font-bold text-blue-600 mt-3">
    {item.product.gia_ban?.toLocaleString('vi-VN')}₫
  </p>
)}
```

**Thay đổi:**
- ✅ Hiển thị badge giảm giá
- ✅ Hiển thị giá khuyến mãi (màu đỏ)
- ✅ Hiển thị giá gốc gạch ngang

## Kết quả

### Trước khi sửa
- ❌ Giỏ hàng hiển thị giá gốc: 200,000₫
- ❌ Tổng tiền: 200,000₫
- ❌ Đơn hàng lưu giá gốc: 200,000₫

### Sau khi sửa
- ✅ Giỏ hàng hiển thị giá khuyến mãi: 100,000₫ (gạch ngang 200,000₫)
- ✅ Badge giảm giá: -50%
- ✅ Tổng tiền: 100,000₫
- ✅ Đơn hàng lưu giá khuyến mãi: 100,000₫

## Luồng hoạt động

1. **Khách hàng xem sản phẩm**
   - API `/api/products/{id}` trả về thông tin khuyến mãi
   - Frontend hiển thị giá khuyến mãi và badge

2. **Thêm vào giỏ hàng**
   - POST `/api/cart/add` với `product_id`
   - Backend lưu vào CartItem (chỉ lưu product_id, không lưu giá)

3. **Xem giỏ hàng**
   - GET `/api/cart` 
   - Backend tính giá real-time:
     - Kiểm tra sản phẩm có khuyến mãi đang active không
     - Dùng `promotional_price` nếu có
     - Dùng `gia_ban` nếu không có khuyến mãi
   - Frontend hiển thị giá đã tính

4. **Thanh toán**
   - POST `/api/orders/create`
   - Backend tính tổng tiền với giá khuyến mãi
   - Lưu `unit_price` (giá khuyến mãi) vào OrderDetail
   - Đơn hàng được tạo với giá đúng

## Lưu ý quan trọng

### Tại sao không lưu giá vào CartItem?
- ✅ **Giá được tính real-time**: Nếu admin thay đổi khuyến mãi, giỏ hàng tự động cập nhật
- ✅ **Tránh lỗi đồng bộ**: Không cần lo giá trong giỏ hàng khác với giá hiện tại
- ✅ **Linh hoạt**: Khuyến mãi có thể bắt đầu/kết thúc mà không ảnh hưởng giỏ hàng cũ

### Tại sao lưu giá vào OrderDetail?
- ✅ **Lưu trữ lịch sử**: Đơn hàng cần lưu giá tại thời điểm mua
- ✅ **Không thay đổi**: Sau khi đặt hàng, giá không được thay đổi dù khuyến mãi kết thúc
- ✅ **Báo cáo chính xác**: Admin có thể xem lại giá đã bán

## Testing

### Test Case 1: Sản phẩm có khuyến mãi
```bash
# 1. Kiểm tra API sản phẩm
curl http://localhost:5000/api/products/1

# Response:
{
  "products_id": 1,
  "ten_san_pham": "áo thun",
  "gia_ban": 200000,
  "promotion": {
    "discount_type": "percent",
    "discount_value": 50,
    "promotional_price": 100000
  }
}

# 2. Thêm vào giỏ hàng (cần token)
curl -X POST http://localhost:5000/api/cart/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 1}'

# 3. Xem giỏ hàng
curl http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "cart_items": [{
    "product": {
      "gia_ban": 200000,
      "promotion": {
        "promotional_price": 100000
      }
    },
    "quantity": 1,
    "unit_price": 100000,
    "item_total": 100000
  }],
  "total": 100000
}
```

### Test Case 2: Sản phẩm không có khuyến mãi
- Giá hiển thị: `gia_ban`
- Không có badge giảm giá
- Tổng tiền = `gia_ban * quantity`

### Test Case 3: Khuyến mãi hết hạn
- Sản phẩm trong giỏ tự động chuyển về giá gốc
- Không hiển thị badge giảm giá nữa

## Files đã thay đổi

1. `backend/routes/cart.py` - Tính giá khuyến mãi khi lấy giỏ hàng
2. `backend/routes/orders.py` - Tính giá khuyến mãi khi tạo đơn hàng
3. `frontend/src/pages/Cart.jsx` - Hiển thị giá khuyến mãi trong giỏ hàng

## Commit Message
```
fix: Apply promotional prices to cart and checkout

- Calculate promotional prices in cart API
- Save promotional prices in order details
- Display promotional prices with discount badges in cart
- Show original price with strikethrough
- Real-time price calculation based on active promotions
```
