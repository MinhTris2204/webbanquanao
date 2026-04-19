# 🛍️ Website Bán Quần Áo

Hệ thống thương mại điện tử bán quần áo với tích hợp AI Chatbot, thanh toán VNPay, và nhiều tính năng hiện đại.

## 🚀 Tính năng chính

### 👥 Khách hàng
- 🛒 Giỏ hàng và thanh toán
- 💳 Thanh toán VNPay (QR, ATM, Visa/Mastercard)
- 💰 Áp dụng voucher giảm giá
- ⭐ Đánh giá sản phẩm
- 🤖 AI Chatbot hỗ trợ 24/7
- 💬 Chat realtime với admin
- 📦 Theo dõi đơn hàng
- 🎯 Gợi ý sản phẩm thông minh

### 👨‍💼 Admin
- 📊 Dashboard thống kê
- 📦 Quản lý sản phẩm
- 🎫 Quản lý voucher
- 🎁 Quản lý khuyến mãi
- 👥 Quản lý người dùng
- ⭐ Quản lý đánh giá
- 💬 Chat với khách hàng
- 📈 Phân tích khách hàng

## 🛠️ Công nghệ sử dụng

### Frontend
- ⚛️ React 18
- 🎨 Tailwind CSS
- 🔄 React Router
- 🔌 Socket.IO Client
- 📡 Axios

### Backend
- 🐍 Python 3.11
- 🌶️ Flask
- 🗄️ PostgreSQL
- 🔌 Flask-SocketIO
- 🤖 Google Gemini AI
- 🧠 Sentence Transformers
- 📊 pgvector

### DevOps
- 🐳 Docker & Docker Compose
- 🔄 Hot reload (development)

## 📋 Yêu cầu hệ thống

- Docker Desktop
- Docker Compose
- 4GB RAM trở lên
- 10GB dung lượng trống

## 🚀 Cài đặt và chạy

### 1. Clone repository

```bash
git clone <repository-url>
cd webbanquanao
```

### 2. Cấu hình môi trường

Tạo file `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/webbanquanao
SECRET_KEY=your-secret-key-change-in-production
FLASK_ENV=development

# VNPay sandbox configuration
VNPAY_VERSION=2.1.0
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5000/api/vnpay/return
PUBLIC_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Gemini API Configuration
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 3. Khởi động ứng dụng

```bash
docker-compose up --build
```

### 4. Truy cập ứng dụng

- **Frontend (Khách hàng):** http://localhost:5173
- **Admin Panel:** http://localhost:5173/admin
- **Backend API:** http://localhost:5000

### 5. Tài khoản mặc định

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Khách hàng:**
- Email: `customer@example.com`
- Password: `customer123`

## 💳 Cấu hình VNPay Sandbox

### Bước 1: Đăng ký tài khoản VNPay Sandbox

1. Truy cập: https://sandbox.vnpayment.vn/devreg/
2. Điền thông tin:
   - **Tên merchant:** webquanaothoitrang (hoặc tên bạn muốn)
   - **Địa chỉ URL:** http://localhost:5173
   - **Email đăng ký:** email của bạn
   - **Mật khẩu:** tạo mật khẩu mạnh
   - **Nhập lại mật khẩu:** nhập lại
   - **Mã xác nhận:** nhập captcha
3. Nhấn **"Đăng ký"**

### Bước 2: Lấy thông tin cấu hình

Sau khi đăng ký thành công:
1. Đăng nhập vào: https://sandbox.vnpayment.vn/
2. Vào mục **"Thông tin tài khoản"**
3. Lấy:
   - **TMN Code** (Terminal Code)
   - **Hash Secret** (Secret Key)

### Bước 3: Cập nhật file .env

Mở `backend/.env` và cập nhật:

```env
VNPAY_TMN_CODE=YOUR_TMN_CODE_HERE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET_HERE
```

### Bước 4: Restart backend

```bash
docker-compose restart backend
```

### Bước 5: Test thanh toán

1. Truy cập: http://localhost:5173
2. Thêm sản phẩm vào giỏ hàng
3. Chọn thanh toán VNPay
4. Sử dụng thẻ test của VNPay:
   - **Số thẻ:** 9704198526191432198
   - **Tên chủ thẻ:** NGUYEN VAN A
   - **Ngày phát hành:** 07/15
   - **Mật khẩu OTP:** 123456

## 🤖 Cấu hình Google Gemini AI

### Bước 1: Lấy API Key

1. Truy cập: https://makersuite.google.com/app/apikey
2. Nhấn **"Create API Key"**
3. Copy API Key

### Bước 2: Cập nhật .env

```env
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

### Bước 3: Restart backend

```bash
docker-compose restart backend
```

## 📁 Cấu trúc thư mục

```
webbanquanao/
├── backend/
│   ├── routes/          # API endpoints
│   ├── migrations/      # Database migrations
│   ├── uploads/         # Uploaded files
│   ├── models.py        # Database models
│   ├── app.py          # Flask application
│   ├── config.py       # Configuration
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── context/    # React context
│   │   └── utils/      # Utilities
│   ├── public/         # Static files
│   └── package.json    # Node dependencies
├── docker-compose.yml  # Docker configuration
└── README.md          # This file
```

## 🔧 Các lệnh hữu ích

### Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Chỉ backend
docker-compose logs -f backend

# Chỉ frontend
docker-compose logs -f frontend
```

### Restart services

```bash
# Tất cả
docker-compose restart

# Chỉ backend
docker-compose restart backend

# Chỉ frontend
docker-compose restart frontend
```

### Dừng ứng dụng

```bash
docker-compose down
```

### Xóa dữ liệu và khởi động lại

```bash
docker-compose down -v
docker-compose up --build
```

## 🐛 Xử lý lỗi thường gặp

### Lỗi: Port đã được sử dụng

```bash
# Kiểm tra port đang sử dụng
netstat -ano | findstr :5000
netstat -ano | findstr :5173

# Dừng process
taskkill /PID <PID> /F
```

### Lỗi: Database connection failed

```bash
# Restart database
docker-compose restart db

# Xem logs
docker-compose logs db
```

### Lỗi: VNPay thanh toán thất bại

1. Kiểm tra `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` trong `.env`
2. Đảm bảo không có khoảng trắng thừa
3. Restart backend: `docker-compose restart backend`

### Lỗi JavaScript "timer is not defined" (VNPay)

- Đây là lỗi từ VNPay Sandbox, không phải lỗi của bạn
- Không ảnh hưởng đến chức năng thanh toán
- Chỉ hiện trong Console (F12)
- Giải pháp: Đóng Console để không thấy lỗi

## 📊 Database

### Seed data

Dữ liệu mẫu được tự động tạo khi khởi động lần đầu:
- 50+ sản phẩm
- 2 tài khoản (admin, customer)
- Vouchers mẫu
- Đánh giá mẫu

### Backup database

```bash
docker-compose exec db pg_dump -U postgres webbanquanao > backup.sql
```

### Restore database

```bash
docker-compose exec -T db psql -U postgres webbanquanao < backup.sql
```

## 🎨 Tính năng nổi bật

### 1. AI Chatbot thông minh
- Trả lời câu hỏi về sản phẩm
- Gợi ý sản phẩm phù hợp
- Hỗ trợ 24/7
- Sử dụng Google Gemini AI

### 2. Gợi ý sản phẩm
- Dựa trên lịch sử xem
- Sản phẩm tương tự
- Thường mua cùng
- Cá nhân hóa cho từng người dùng

### 3. Thanh toán VNPay
- Quét mã QR
- Thẻ ATM nội địa
- Visa/Mastercard
- Ví VNPay

### 4. Chat realtime
- Socket.IO
- Thông báo realtime
- Typing indicator
- Online status

## 📝 License

MIT License

## 👥 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request.

## 📞 Liên hệ

- Email: support@webquanaothoitrang.com
- Website: http://localhost:5173

---

**Phát triển bởi Nhóm 41** 🚀
