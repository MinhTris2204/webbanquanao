"""
Seed data cho thông tin cửa hàng
Chạy: python seed_store_info.py
"""

from app import create_app
from models import db, StoreInfo

store_info_data = [
    {
        "key": "about_us",
        "title": "Giới thiệu về cửa hàng",
        "content": """# Chào mừng đến với Fashion Store! 👋

## Về chúng tôi
Fashion Store là cửa hàng thời trang trực tuyến hàng đầu Việt Nam, chuyên cung cấp các sản phẩm quần áo chất lượng cao với giá cả phải chăng.

## Sứ mệnh
Mang đến cho khách hàng những sản phẩm thời trang đẹp, chất lượng và phong cách với trải nghiệm mua sắm tuyệt vời nhất.

## Tầm nhìn
Trở thành thương hiệu thời trang được yêu thích nhất tại Việt Nam, nơi mọi người đều có thể tìm thấy phong cách riêng của mình.

## Giá trị cốt lõi
- **Chất lượng**: Cam kết 100% sản phẩm chính hãng
- **Uy tín**: Luôn đặt lợi ích khách hàng lên hàng đầu
- **Sáng tạo**: Không ngừng cập nhật xu hướng mới
- **Tận tâm**: Hỗ trợ khách hàng 24/7

## Thành tựu
- 🏆 Top 10 cửa hàng thời trang online uy tín
- ⭐ 50,000+ khách hàng hài lòng
- 📦 100,000+ đơn hàng thành công
"""
    },
    {
        "key": "privacy_policy",
        "title": "Chính sách bảo mật",
        "content": """# Chính sách bảo mật 🔒

## 1. Thu thập thông tin
Chúng tôi thu thập các thông tin sau khi bạn đăng ký tài khoản hoặc đặt hàng:
- Họ tên, email, số điện thoại
- Địa chỉ giao hàng
- Lịch sử mua hàng

## 2. Sử dụng thông tin
Thông tin của bạn được sử dụng để:
- Xử lý đơn hàng và giao hàng
- Liên hệ khi cần thiết
- Gửi thông tin khuyến mãi (nếu bạn đồng ý)
- Cải thiện dịch vụ

## 3. Bảo vệ thông tin
- Mã hóa SSL cho tất cả giao dịch
- Không chia sẻ thông tin với bên thứ ba
- Lưu trữ an toàn trên hệ thống bảo mật cao

## 4. Quyền của bạn
- Truy cập và chỉnh sửa thông tin cá nhân
- Yêu cầu xóa tài khoản
- Từ chối nhận email marketing

## 5. Cookie
Website sử dụng cookie để cải thiện trải nghiệm. Bạn có thể tắt cookie trong trình duyệt.

## 6. Liên hệ
Nếu có thắc mắc về chính sách bảo mật, vui lòng liên hệ: support@fashionstore.vn
"""
    },
    {
        "key": "terms",
        "title": "Điều khoản và điều kiện",
        "content": """# Điều khoản và điều kiện 📋

## 1. Điều khoản chung
Khi sử dụng website, bạn đồng ý tuân thủ các điều khoản sau:
- Cung cấp thông tin chính xác khi đăng ký
- Không sử dụng website cho mục đích bất hợp pháp
- Bảo mật thông tin tài khoản của mình

## 2. Đặt hàng
- Đơn hàng được xác nhận qua email/SMS
- Giá sản phẩm có thể thay đổi mà không báo trước
- Chúng tôi có quyền từ chối đơn hàng trong trường hợp đặc biệt

## 3. Thanh toán
- Chấp nhận: COD, VNPay, chuyển khoản
- Thanh toán an toàn và bảo mật
- Hóa đơn điện tử được gửi qua email

## 4. Giao hàng
- Thời gian giao hàng: 2-5 ngày làm việc
- Phí ship tùy thuộc vào địa chỉ
- Miễn phí ship cho đơn từ 500,000đ

## 5. Đổi trả
- Đổi trả trong vòng 7 ngày
- Sản phẩm còn nguyên tem mác
- Không áp dụng cho sản phẩm sale

## 6. Bản quyền
Tất cả nội dung trên website thuộc quyền sở hữu của Fashion Store.
"""
    },
    {
        "key": "shipping",
        "title": "Chính sách vận chuyển",
        "content": """# Chính sách vận chuyển 🚚

## Phạm vi giao hàng
Giao hàng toàn quốc 63 tỉnh thành

## Thời gian giao hàng
| Khu vực | Thời gian |
|---------|-----------|
| Nội thành HCM, Hà Nội | 1-2 ngày |
| Các tỉnh lân cận | 2-3 ngày |
| Các tỉnh xa | 3-5 ngày |
| Vùng sâu, vùng xa | 5-7 ngày |

## Phí vận chuyển
- **Nội thành**: 20,000đ
- **Ngoại thành**: 30,000đ
- **Tỉnh khác**: 35,000đ
- **🎁 MIỄN PHÍ** cho đơn hàng từ 500,000đ

## Đơn vị vận chuyển
- Giao Hàng Nhanh (GHN)
- Giao Hàng Tiết Kiệm (GHTK)
- J&T Express
- Viettel Post

## Theo dõi đơn hàng
- Mã vận đơn được gửi qua SMS/Email
- Theo dõi trực tiếp trên website
- Hotline hỗ trợ: 1900 xxxx

## Lưu ý
- Kiểm tra hàng trước khi nhận
- Từ chối nhận nếu hàng bị hư hỏng
- Liên hệ ngay nếu có vấn đề
"""
    },
    {
        "key": "return_policy",
        "title": "Chính sách đổi trả",
        "content": """# Chính sách đổi trả 🔄

## Điều kiện đổi trả
✅ Trong vòng **7 ngày** kể từ ngày nhận hàng
✅ Sản phẩm còn **nguyên tem mác**, chưa qua sử dụng
✅ Còn **hóa đơn mua hàng**
✅ Không bị **hư hỏng** do lỗi người dùng

## Trường hợp được đổi trả
- Sản phẩm bị lỗi từ nhà sản xuất
- Giao sai sản phẩm, sai size, sai màu
- Sản phẩm không đúng mô tả

## Trường hợp KHÔNG được đổi trả
❌ Sản phẩm đã qua sử dụng, giặt
❌ Sản phẩm sale giảm giá trên 50%
❌ Sản phẩm đồ lót, đồ bơi
❌ Quá thời hạn 7 ngày

## Quy trình đổi trả
1. Liên hệ hotline hoặc chat với shop
2. Cung cấp mã đơn hàng và lý do
3. Gửi hàng về địa chỉ shop
4. Nhận hàng mới hoặc hoàn tiền trong 3-5 ngày

## Phí đổi trả
- **Miễn phí** nếu lỗi từ shop
- **Khách chịu phí ship** nếu đổi ý

## Hoàn tiền
- Hoàn về tài khoản ngân hàng
- Thời gian: 3-5 ngày làm việc
"""
    },
    {
        "key": "contact",
        "title": "Thông tin liên hệ",
        "content": """# Thông tin liên hệ 📞

## Fashion Store

### 📍 Địa chỉ
**Cửa hàng chính:** 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh

**Chi nhánh Hà Nội:** 456 Phố Huế, Quận Hai Bà Trưng, Hà Nội

### 📞 Hotline
- **Đặt hàng:** 1900 1234 (8h - 22h)
- **CSKH:** 1900 5678 (24/7)

### 📧 Email
- **Hỗ trợ:** support@fashionstore.vn
- **Hợp tác:** business@fashionstore.vn

### 🌐 Mạng xã hội
- **Facebook:** facebook.com/fashionstore
- **Instagram:** @fashionstore.vn
- **TikTok:** @fashionstore.vn
- **Zalo:** Fashion Store Official

### ⏰ Giờ làm việc
- **Thứ 2 - Thứ 6:** 8:00 - 21:00
- **Thứ 7 - Chủ nhật:** 9:00 - 20:00
- **Ngày lễ:** 9:00 - 18:00

### 💬 Chat trực tuyến
Hỗ trợ chat 24/7 trên website và Fanpage
"""
    },
    {
        "key": "payment",
        "title": "Phương thức thanh toán",
        "content": """# Phương thức thanh toán 💳

## 1. Thanh toán khi nhận hàng (COD)
- Thanh toán bằng tiền mặt khi nhận hàng
- Áp dụng toàn quốc
- Kiểm tra hàng trước khi thanh toán

## 2. Thanh toán VNPay
- Quét mã QR VNPay
- Thẻ ATM nội địa (Vietcombank, BIDV, Techcombank...)
- Thẻ quốc tế Visa, MasterCard, JCB
- Ví điện tử VNPay

## 3. Chuyển khoản ngân hàng
**Thông tin tài khoản:**
- **Ngân hàng:** Vietcombank
- **Số TK:** 1234567890
- **Chủ TK:** CONG TY FASHION STORE
- **Nội dung CK:** [Mã đơn hàng] - [SĐT]

## 4. Ví điện tử
- MoMo
- ZaloPay
- ShopeePay

## Lưu ý
- Tất cả giao dịch được mã hóa SSL
- Không lưu thông tin thẻ
- Hóa đơn điện tử gửi qua email
- Liên hệ ngay nếu gặp vấn đề thanh toán
"""
    },
    {
        "key": "warranty",
        "title": "Chính sách bảo hành",
        "content": """# Chính sách bảo hành 🛡️

## Thời gian bảo hành
- **Áo, quần thông thường:** 30 ngày
- **Áo khoác, đồ da:** 90 ngày
- **Phụ kiện (túi, ví):** 60 ngày

## Phạm vi bảo hành
✅ Lỗi đường may, chỉ bung
✅ Lỗi khóa kéo, nút bấm
✅ Phai màu bất thường (không do giặt sai cách)
✅ Lỗi chất liệu từ nhà sản xuất

## Không bảo hành
❌ Hư hỏng do sử dụng sai cách
❌ Giặt không đúng hướng dẫn
❌ Tự ý sửa chữa
❌ Hết thời hạn bảo hành

## Quy trình bảo hành
1. Liên hệ CSKH với mã đơn hàng
2. Gửi hình ảnh sản phẩm lỗi
3. Gửi sản phẩm về shop (miễn phí ship)
4. Kiểm tra và xử lý trong 3-5 ngày
5. Gửi trả sản phẩm đã sửa/thay mới

## Hỗ trợ
- Hotline: 1900 xxxx
- Email: warranty@fashionstore.vn
"""
    },
    {
        "key": "faq",
        "title": "Câu hỏi thường gặp",
        "content": """# Câu hỏi thường gặp ❓

## 🛒 Đặt hàng

**Q: Làm sao để đặt hàng?**
A: Chọn sản phẩm → Thêm vào giỏ → Thanh toán → Nhập thông tin → Xác nhận

**Q: Tôi có thể hủy đơn hàng không?**
A: Có thể hủy khi đơn hàng chưa được giao cho đơn vị vận chuyển.

**Q: Đơn hàng tối thiểu là bao nhiêu?**
A: Không có giá trị đơn hàng tối thiểu.

## 📦 Giao hàng

**Q: Thời gian giao hàng bao lâu?**
A: 1-2 ngày (nội thành), 3-5 ngày (tỉnh khác).

**Q: Phí ship bao nhiêu?**
A: 20,000đ - 35,000đ. Miễn phí cho đơn từ 500,000đ.

**Q: Có giao hàng ngày lễ không?**
A: Có, nhưng thời gian có thể chậm hơn.

## 💰 Thanh toán

**Q: Có những hình thức thanh toán nào?**
A: COD, VNPay, chuyển khoản, ví điện tử.

**Q: Thanh toán có an toàn không?**
A: Tất cả giao dịch được mã hóa SSL 256-bit.

## 🔄 Đổi trả

**Q: Thời gian đổi trả là bao lâu?**
A: 7 ngày kể từ ngày nhận hàng.

**Q: Sản phẩm sale có được đổi trả không?**
A: Sản phẩm sale trên 50% không được đổi trả.

## 👤 Tài khoản

**Q: Quên mật khẩu thì làm sao?**
A: Nhấn "Quên mật khẩu" ở trang đăng nhập để reset.

**Q: Làm sao để tích điểm?**
A: Mỗi 10,000đ mua hàng = 1 điểm. 100 điểm = 10,000đ giảm giá.
"""
    },
    {
        "key": "size_guide",
        "title": "Hướng dẫn chọn size",
        "content": """# Hướng dẫn chọn size 📏

## Cách đo size

### Đo vòng ngực
Đo vòng quanh phần đầy đặn nhất của ngực, giữ thước dây ngang.

### Đo vòng eo
Đo vòng quanh phần nhỏ nhất của eo, thường là trên rốn 2-3cm.

### Đo vòng hông
Đo vòng quanh phần đầy đặn nhất của hông.

---

## Bảng size ÁO NAM

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng ngực (cm) |
|------|----------------|---------------|----------------|
| S    | 160-165        | 50-55         | 86-90          |
| M    | 165-170        | 55-62         | 90-94          |
| L    | 170-175        | 62-70         | 94-98          |
| XL   | 175-180        | 70-78         | 98-102         |
| XXL  | 180-185        | 78-85         | 102-106        |

## Bảng size ÁO NỮ

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng ngực (cm) |
|------|----------------|---------------|----------------|
| S    | 150-155        | 42-48         | 80-84          |
| M    | 155-160        | 48-54         | 84-88          |
| L    | 160-165        | 54-60         | 88-92          |
| XL   | 165-170        | 60-66         | 92-96          |

## Bảng size QUẦN NAM

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng eo (cm) |
|------|----------------|---------------|--------------|
| 28   | 160-165        | 50-55         | 70-72        |
| 29   | 163-168        | 53-58         | 72-74        |
| 30   | 165-170        | 58-63         | 74-76        |
| 31   | 168-173        | 63-68         | 76-78        |
| 32   | 170-175        | 68-73         | 78-80        |
| 33   | 173-178        | 73-78         | 80-82        |
| 34   | 175-180        | 78-83         | 82-84        |

## Bảng size QUẦN NỮ

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng eo (cm) |
|------|----------------|---------------|--------------|
| 26   | 150-155        | 42-47         | 62-64        |
| 27   | 153-158        | 47-50         | 64-66        |
| 28   | 155-160        | 50-54         | 66-68        |
| 29   | 158-163        | 54-58         | 68-70        |
| 30   | 160-165        | 58-62         | 70-72        |

---

## 💡 Mẹo chọn size
- Nếu ở giữa 2 size, nên chọn size lớn hơn
- Quần jean co giãn có thể chọn nhỏ hơn 1 size
- Áo form rộng (oversize) nên chọn đúng size hoặc nhỏ hơn 1 size
- Liên hệ CSKH nếu cần tư vấn thêm
"""
    }
]


def seed_store_info():
    app = create_app()
    with app.app_context():
        print("🚀 Bắt đầu nạp dữ liệu thông tin cửa hàng...")
        
        for item in store_info_data:
            # Kiểm tra xem đã tồn tại chưa
            existing = StoreInfo.query.filter_by(key=item['key']).first()
            
            if existing:
                # Cập nhật nếu đã tồn tại
                existing.title = item['title']
                existing.content = item['content']
                print(f"  ✏️  Cập nhật: {item['title']}")
            else:
                # Tạo mới nếu chưa tồn tại
                store_info = StoreInfo(
                    key=item['key'],
                    title=item['title'],
                    content=item['content'],
                    is_active=True
                )
                db.session.add(store_info)
                print(f"  ✅ Thêm mới: {item['title']}")
        
        db.session.commit()
        print("\n🎉 Hoàn thành nạp dữ liệu thông tin cửa hàng!")
        print(f"   Tổng cộng: {len(store_info_data)} mục")


if __name__ == '__main__':
    seed_store_info()
