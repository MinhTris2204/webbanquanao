# 🛍️ Website Bán Quần Áo - E-commerce Platform

Web bán quần áo với đầy đủ tính năng hiện đại, tích hợp AI chatbot, thanh toán online và nhiều tính năng khác.

## ✨ Tính năng chính

### 🛒 Khách hàng
- Xem và tìm kiếm sản phẩm
- Giỏ hàng và thanh toán
- Đánh giá sản phẩm
- Theo dõi đơn hàng
- Chat với admin
- AI Chatbot hỗ trợ 24/7

### 💳 Thanh toán
- **COD** (Thanh toán khi nhận hàng)
- **VNPay** (Thẻ ATM, Visa, MasterCard, QR Code)
- **MoMo** (Ví điện tử MoMo) - Mới! 🎉

### 👨‍💼 Admin
- Quản lý sản phẩm, đơn hàng, người dùng
- Quản lý khuyến mãi và voucher
- Chat với khách hàng
- Thống kê và báo cáo
- Phân tích hành vi khách hàng

## 🚀 Công nghệ sử dụng

### Backend
- **Flask** - Python web framework
- **PostgreSQL** - Database với pgvector
- **Flask-SocketIO** - Real-time chat
- **JWT** - Authentication
- **OpenAI/Gemini** - AI Chatbot

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Routing

### Payment Gateways
- **VNPay** - Cổng thanh toán Việt Nam
- **MoMo** - Ví điện tử MoMo

## 📦 Cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd <project-folder>
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Copy và cấu hình .env
cp .env.example .env
# Chỉnh sửa .env với thông tin database và API keys

# Chạy migrations
flask db upgrade

# Seed dữ liệu mẫu (optional)
python seed_data.py

# Chạy server
python run.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Chạy development server
npm run dev
```

### 4. Truy cập ứng dụng
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Admin: http://localhost:5173/admin

## 💳 Cấu hình thanh toán MoMo

Xem hướng dẫn chi tiết tại: [MOMO_INTEGRATION.md](./MOMO_INTEGRATION.md)

### Sandbox (Test)
Thông tin test đã được cấu hình sẵn trong `.env.example`:
```env
MOMO_PARTNER_CODE=MOMOBKUN20180529
MOMO_ACCESS_KEY=klm05TvNBzhg7h7j
MOMO_SECRET_KEY=at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa
MOMO_ENDPOINT=https://test-payment.momo.vn
```

### Production
1. Đăng ký tài khoản doanh nghiệp tại: https://business.momo.vn/
2. Lấy thông tin Partner Code, Access Key, Secret Key
3. Cập nhật vào file `.env`

## 🧪 Test thanh toán MoMo

1. Tải app MoMo test (sandbox)
2. Chọn sản phẩm và checkout
3. Chọn phương thức "Thanh toán MoMo"
4. Quét mã QR bằng app MoMo test
5. Xác nhận thanh toán

## 📝 License

MIT License

---

**Phát triển bởi**: Nhóm phát triển
**Version**: 2.0.0 (Đã tích hợp MoMo Payment)