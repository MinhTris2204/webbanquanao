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
        "content": """**Chào mừng đến với Fashion Store!**

**Về chúng tôi**
Fashion Store được thành lập năm 2020, là cửa hàng thời trang trực tuyến chuyên cung cấp các sản phẩm quần áo chất lượng cao dành cho nam và nữ. Với hơn 4 năm kinh nghiệm trong ngành thời trang, chúng tôi tự hào mang đến cho khách hàng những sản phẩm đẹp, chất lượng với giá cả hợp lý.

**Sứ mệnh**
Mang đến cho khách hàng những sản phẩm thời trang đẹp, chất lượng và phong cách với trải nghiệm mua sắm tuyệt vời nhất. Chúng tôi cam kết luôn lắng nghe và đáp ứng nhu cầu của khách hàng.

**Tầm nhìn**
Trở thành thương hiệu thời trang được yêu thích nhất tại Việt Nam, nơi mọi người đều có thể tìm thấy phong cách riêng của mình với mức giá phù hợp.

**Giá trị cốt lõi**
- **Chất lượng**: Cam kết 100% sản phẩm chính hãng, chất liệu tốt
- **Uy tín**: Luôn đặt lợi ích khách hàng lên hàng đầu
- **Sáng tạo**: Không ngừng cập nhật xu hướng thời trang mới nhất
- **Tận tâm**: Hỗ trợ khách hàng nhiệt tình 24/7

**Thành tựu**
- Top 10 cửa hàng thời trang online uy tín năm 2024
- Hơn 50,000 khách hàng tin tưởng và hài lòng
- Hơn 100,000 đơn hàng giao thành công
- Tỷ lệ khách hàng quay lại mua hàng đạt 85%

**Cam kết của chúng tôi**
- Sản phẩm giống hình 100%
- Hoàn tiền nếu phát hiện hàng giả
- Đổi trả miễn phí trong 7 ngày
- Giao hàng nhanh chóng toàn quốc
"""
    },
    {
        "key": "privacy_policy", 
        "title": "Chính sách bảo mật",
        "content": """**Chính sách bảo mật thông tin khách hàng**

Fashion Store cam kết bảo vệ thông tin cá nhân của khách hàng. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.

**1. Thông tin chúng tôi thu thập**
Khi bạn đăng ký tài khoản hoặc đặt hàng, chúng tôi thu thập:
- Họ và tên đầy đủ
- Địa chỉ email
- Số điện thoại liên hệ
- Địa chỉ giao hàng
- Lịch sử mua hàng và sản phẩm đã xem

**2. Mục đích sử dụng thông tin**
Thông tin của bạn được sử dụng để:
- Xử lý và giao đơn hàng
- Liên hệ xác nhận đơn hàng và hỗ trợ khách hàng
- Gửi thông tin khuyến mãi, ưu đãi (nếu bạn đồng ý nhận)
- Cải thiện chất lượng dịch vụ và trải nghiệm mua sắm
- Phân tích hành vi mua sắm để đề xuất sản phẩm phù hợp

**3. Bảo vệ thông tin**
Chúng tôi áp dụng các biện pháp bảo mật:
- Mã hóa SSL 256-bit cho tất cả giao dịch
- Không lưu trữ thông tin thẻ thanh toán
- Không chia sẻ thông tin với bên thứ ba khi chưa có sự đồng ý
- Hệ thống máy chủ được bảo vệ bởi tường lửa và phần mềm chống virus

**4. Quyền của khách hàng**
Bạn có quyền:
- Truy cập và xem thông tin cá nhân của mình
- Yêu cầu chỉnh sửa thông tin không chính xác
- Yêu cầu xóa tài khoản và dữ liệu cá nhân
- Từ chối nhận email marketing bất cứ lúc nào

**5. Cookie và công nghệ theo dõi**
Website sử dụng cookie để:
- Ghi nhớ thông tin đăng nhập
- Lưu sản phẩm trong giỏ hàng
- Cải thiện trải nghiệm duyệt web
Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể không hoạt động đầy đủ.

**6. Liên hệ về bảo mật**
Nếu có thắc mắc về chính sách bảo mật, vui lòng liên hệ:
- Email: baomat@fashionstore.vn
- Hotline: 1900 1234
"""
    },
    {
        "key": "terms",
        "title": "Điều khoản và điều kiện",
        "content": """**Điều khoản và điều kiện sử dụng**

Khi truy cập và sử dụng website Fashion Store, bạn đồng ý tuân thủ các điều khoản sau đây.

**1. Điều khoản chung**
- Bạn phải từ 18 tuổi trở lên hoặc có sự đồng ý của phụ huynh để mua hàng
- Cung cấp thông tin chính xác, đầy đủ khi đăng ký tài khoản
- Chịu trách nhiệm bảo mật thông tin tài khoản của mình
- Không sử dụng website cho mục đích bất hợp pháp hoặc gây hại

**2. Quy định đặt hàng**
- Đơn hàng được xác nhận qua email và SMS sau khi đặt thành công
- Giá sản phẩm có thể thay đổi mà không cần báo trước
- Chúng tôi có quyền từ chối hoặc hủy đơn hàng trong trường hợp:
  + Sản phẩm hết hàng
  + Thông tin đặt hàng không chính xác
  + Nghi ngờ gian lận

**3. Thanh toán**
- Chấp nhận thanh toán: COD, VNPay, chuyển khoản ngân hàng
- Tất cả giao dịch được mã hóa và bảo mật
- Hóa đơn điện tử được gửi qua email sau khi thanh toán thành công

**4. Giao hàng**
- Thời gian giao hàng từ 1-5 ngày tùy khu vực
- Phí vận chuyển được tính dựa trên địa chỉ giao hàng
- Miễn phí vận chuyển cho đơn hàng từ 500,000đ

**5. Đổi trả và hoàn tiền**
- Chấp nhận đổi trả trong vòng 7 ngày kể từ ngày nhận hàng
- Sản phẩm phải còn nguyên tem mác, chưa qua sử dụng
- Hoàn tiền trong 3-5 ngày làm việc sau khi xác nhận

**6. Quyền sở hữu trí tuệ**
- Tất cả nội dung, hình ảnh, logo trên website thuộc quyền sở hữu của Fashion Store
- Nghiêm cấm sao chép, sử dụng khi chưa được phép

**7. Giới hạn trách nhiệm**
- Chúng tôi không chịu trách nhiệm cho các thiệt hại gián tiếp phát sinh từ việc sử dụng website
- Không đảm bảo website hoạt động liên tục không gián đoạn

**8. Thay đổi điều khoản**
Chúng tôi có quyền cập nhật điều khoản bất cứ lúc nào. Việc tiếp tục sử dụng website đồng nghĩa với việc bạn chấp nhận các thay đổi.
"""
    },
    {
        "key": "shipping",
        "title": "Chính sách vận chuyển",
        "content": """**Chính sách vận chuyển**

Fashion Store giao hàng toàn quốc 63 tỉnh thành với dịch vụ nhanh chóng và đáng tin cậy.

**Thời gian giao hàng**

| Khu vực | Thời gian dự kiến |
|---------|-------------------|
| Nội thành TP.HCM, Hà Nội | 1-2 ngày làm việc |
| Các quận/huyện ngoại thành | 2-3 ngày làm việc |
| Các tỉnh thành khác | 3-5 ngày làm việc |
| Vùng sâu, vùng xa, hải đảo | 5-7 ngày làm việc |

**Phí vận chuyển**

| Khu vực | Phí ship |
|---------|----------|
| Nội thành TP.HCM, Hà Nội | 20,000đ |
| Ngoại thành | 30,000đ |
| Các tỉnh thành khác | 35,000đ |
| Vùng sâu, vùng xa | 45,000đ |

**Miễn phí vận chuyển** cho tất cả đơn hàng từ **500,000đ** trở lên.

**Đơn vị vận chuyển đối tác**
- Giao Hàng Nhanh (GHN)
- Giao Hàng Tiết Kiệm (GHTK)
- J&T Express
- Viettel Post
- Ninja Van

**Theo dõi đơn hàng**
- Mã vận đơn được gửi qua SMS và email ngay khi đơn hàng được giao cho đơn vị vận chuyển
- Theo dõi trạng thái đơn hàng trực tiếp trên website tại mục "Đơn hàng của tôi"
- Liên hệ hotline 1900 1234 nếu cần hỗ trợ

**Lưu ý quan trọng**
- Vui lòng kiểm tra kỹ sản phẩm trước khi nhận hàng
- Quay video khi mở hàng để làm bằng chứng nếu có vấn đề
- Từ chối nhận hàng nếu phát hiện hàng bị hư hỏng, móp méo
- Liên hệ ngay với chúng tôi trong vòng 24h nếu có vấn đề về đơn hàng

**Giao hàng vào ngày lễ**
Chúng tôi vẫn xử lý và giao hàng vào các ngày lễ, tuy nhiên thời gian có thể chậm hơn 1-2 ngày so với bình thường.
"""
    },
    {
        "key": "return_policy",
        "title": "Chính sách đổi trả",
        "content": """**Chính sách đổi trả sản phẩm**

Fashion Store cam kết mang đến sự hài lòng cho khách hàng với chính sách đổi trả linh hoạt.

**Thời gian đổi trả**
- Trong vòng **7 ngày** kể từ ngày nhận hàng

**Điều kiện đổi trả**
Sản phẩm được chấp nhận đổi trả khi:
- Còn nguyên tem mác, nhãn hiệu
- Chưa qua sử dụng, giặt ủi
- Còn nguyên bao bì, hộp đựng (nếu có)
- Có hóa đơn mua hàng hoặc mã đơn hàng

**Các trường hợp được đổi trả**
- Sản phẩm bị lỗi từ nhà sản xuất (đường may, vải bị rách, phai màu...)
- Giao sai sản phẩm so với đơn đặt hàng
- Giao sai size, sai màu sắc
- Sản phẩm không đúng với mô tả trên website

**Các trường hợp KHÔNG được đổi trả**
- Sản phẩm đã qua sử dụng, có dấu hiệu đã giặt
- Sản phẩm bị hư hỏng do lỗi của khách hàng
- Sản phẩm khuyến mãi, sale giảm giá từ 50% trở lên
- Sản phẩm đồ lót, đồ bơi, phụ kiện cá nhân
- Quá thời hạn 7 ngày đổi trả
- Không có hóa đơn hoặc không xác định được đơn hàng

**Quy trình đổi trả**
1. Liên hệ hotline 1900 1234 hoặc chat với nhân viên hỗ trợ
2. Cung cấp mã đơn hàng và lý do đổi trả
3. Chụp hình/quay video sản phẩm cần đổi trả
4. Nhận hướng dẫn gửi hàng về địa chỉ shop
5. Sau khi nhận và kiểm tra sản phẩm, chúng tôi sẽ:
   - Gửi sản phẩm mới (đổi hàng)
   - Hoặc hoàn tiền trong 3-5 ngày làm việc

**Phí đổi trả**
- **Miễn phí** nếu lỗi từ phía shop (giao sai, hàng lỗi)
- **Khách hàng chịu phí ship** nếu đổi do không vừa ý, đổi size

**Hoàn tiền**
- Hoàn tiền qua tài khoản ngân hàng đã đăng ký
- Thời gian xử lý: 3-5 ngày làm việc sau khi xác nhận đổi trả thành công
"""
    },
    {
        "key": "contact",
        "title": "Thông tin liên hệ",
        "content": """**Thông tin liên hệ Fashion Store**

**Công ty TNHH Thời Trang Fashion Store**

**Địa chỉ cửa hàng**

**Cửa hàng chính - TP. Hồ Chí Minh:**
123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
Giờ mở cửa: 8:00 - 21:00 (Thứ 2 - Chủ nhật)

**Chi nhánh Hà Nội:**
456 Phố Huế, Phường Ngô Thì Nhậm, Quận Hai Bà Trưng, Hà Nội
Giờ mở cửa: 8:00 - 21:00 (Thứ 2 - Chủ nhật)

**Chi nhánh Đà Nẵng:**
789 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng
Giờ mở cửa: 8:00 - 21:00 (Thứ 2 - Chủ nhật)

**Hotline**
- **Đặt hàng:** 1900 1234 (8:00 - 22:00 hàng ngày)
- **Chăm sóc khách hàng:** 1900 5678 (24/7)
- **Khiếu nại, góp ý:** 028 1234 5678

**Email**
- **Hỗ trợ khách hàng:** support@fashionstore.vn
- **Hợp tác kinh doanh:** business@fashionstore.vn
- **Tuyển dụng:** hr@fashionstore.vn

**Mạng xã hội**
- **Facebook:** facebook.com/fashionstore.vn
- **Instagram:** instagram.com/fashionstore.vn
- **TikTok:** tiktok.com/@fashionstore.vn
- **YouTube:** youtube.com/fashionstore
- **Zalo OA:** Fashion Store Official

**Giờ làm việc văn phòng**
- Thứ 2 - Thứ 6: 8:00 - 17:30
- Thứ 7: 8:00 - 12:00
- Chủ nhật và ngày lễ: Nghỉ

**Hỗ trợ trực tuyến**
Chat trực tiếp với nhân viên tư vấn 24/7 qua:
- Chat trên website
- Messenger Facebook
- Zalo

Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn!
"""
    },
    {
        "key": "payment",
        "title": "Phương thức thanh toán",
        "content": """**Các phương thức thanh toán**

Fashion Store hỗ trợ nhiều phương thức thanh toán linh hoạt, an toàn và tiện lợi.

**1. Thanh toán khi nhận hàng (COD)**
- Thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng
- Áp dụng cho tất cả đơn hàng trên toàn quốc
- Được kiểm tra hàng trước khi thanh toán
- Không mất phí giao dịch

**2. Thanh toán qua VNPay**
Hỗ trợ nhiều hình thức:
- **Quét mã QR VNPay** - Nhanh chóng, tiện lợi
- **Thẻ ATM nội địa** - Vietcombank, BIDV, Techcombank, Agribank, MB Bank, VPBank, ACB, Sacombank và 30+ ngân hàng khác
- **Thẻ quốc tế** - Visa, MasterCard, JCB, American Express
- **Ví VNPay** - Thanh toán trực tiếp từ ví điện tử

**3. Chuyển khoản ngân hàng**
Chuyển khoản trực tiếp đến tài khoản công ty:

**Ngân hàng Vietcombank:**
- Số tài khoản: 1234567890
- Chủ tài khoản: CONG TY TNHH THOI TRANG FASHION STORE
- Chi nhánh: Hồ Chí Minh

**Ngân hàng Techcombank:**
- Số tài khoản: 0987654321
- Chủ tài khoản: CONG TY TNHH THOI TRANG FASHION STORE
- Chi nhánh: Hồ Chí Minh

**Nội dung chuyển khoản:** [Mã đơn hàng] - [Số điện thoại]
Ví dụ: DH123456 - 0901234567

**4. Ví điện tử**
- MoMo
- ZaloPay
- ShopeePay

**Cam kết bảo mật thanh toán**
- Tất cả giao dịch được mã hóa SSL 256-bit
- Không lưu trữ thông tin thẻ của khách hàng
- Tuân thủ tiêu chuẩn bảo mật PCI DSS
- Hóa đơn điện tử được gửi qua email sau khi thanh toán

**Lưu ý**
- Kiểm tra kỹ thông tin đơn hàng trước khi thanh toán
- Liên hệ hotline 1900 1234 nếu gặp vấn đề trong quá trình thanh toán
- Giữ lại biên lai/xác nhận giao dịch để đối chiếu khi cần
"""
    },
    {
        "key": "warranty",
        "title": "Chính sách bảo hành",
        "content": """**Chính sách bảo hành sản phẩm**

Fashion Store cam kết bảo hành cho tất cả sản phẩm chính hãng được mua tại cửa hàng.

**Thời gian bảo hành**

| Loại sản phẩm | Thời gian bảo hành |
|---------------|-------------------|
| Áo thun, áo sơ mi | 30 ngày |
| Quần jean, quần kaki | 30 ngày |
| Áo khoác, áo blazer | 90 ngày |
| Đồ da (túi, ví, thắt lưng) | 6 tháng |
| Giày dép | 90 ngày |
| Phụ kiện (mũ, khăn, kính) | 30 ngày |

**Phạm vi bảo hành**
Chúng tôi bảo hành miễn phí cho các lỗi:
- Lỗi đường may, chỉ bung, chỉ lỏng
- Lỗi khóa kéo, nút bấm, móc cài
- Phai màu bất thường (không do giặt sai cách)
- Lỗi chất liệu từ nhà sản xuất
- Bong tróc, nứt vỡ do lỗi sản xuất

**Không áp dụng bảo hành**
- Hư hỏng do sử dụng sai cách, va đập mạnh
- Giặt, ủi không đúng hướng dẫn trên nhãn mác
- Tự ý sửa chữa, thay đổi sản phẩm
- Hư hỏng do thiên tai, hỏa hoạn
- Sản phẩm đã hết thời hạn bảo hành
- Không có hóa đơn mua hàng

**Quy trình bảo hành**
1. Liên hệ hotline 1900 1234 hoặc email warranty@fashionstore.vn
2. Cung cấp mã đơn hàng và mô tả lỗi sản phẩm
3. Gửi hình ảnh/video sản phẩm bị lỗi
4. Gửi sản phẩm về địa chỉ shop (miễn phí ship)
5. Chúng tôi kiểm tra và xử lý trong 3-5 ngày làm việc
6. Gửi trả sản phẩm đã sửa chữa hoặc thay mới

**Hình thức bảo hành**
- Sửa chữa miễn phí
- Thay thế sản phẩm mới cùng loại (nếu không sửa được)
- Hoàn tiền (nếu không có sản phẩm thay thế)

**Liên hệ bảo hành**
- Hotline: 1900 1234
- Email: warranty@fashionstore.vn
- Địa chỉ: 123 Nguyễn Huệ, Quận 1, TP.HCM
"""
    },
    {
        "key": "faq",
        "title": "Câu hỏi thường gặp",
        "content": """**Câu hỏi thường gặp (FAQ)**

**VỀ ĐẶT HÀNG**

**Làm sao để đặt hàng trên website?**
Bạn chọn sản phẩm muốn mua, chọn size và màu sắc, nhấn "Thêm vào giỏ hàng". Sau đó vào giỏ hàng, nhấn "Thanh toán", điền thông tin giao hàng và chọn phương thức thanh toán để hoàn tất đơn hàng.

**Tôi có thể đặt hàng qua điện thoại không?**
Có, bạn có thể gọi hotline 1900 1234 để đặt hàng trực tiếp với nhân viên tư vấn.

**Tôi có thể hủy đơn hàng không?**
Bạn có thể hủy đơn hàng khi đơn hàng chưa được giao cho đơn vị vận chuyển. Liên hệ hotline hoặc chat với nhân viên để được hỗ trợ hủy đơn.

**Đơn hàng tối thiểu là bao nhiêu?**
Không có giá trị đơn hàng tối thiểu. Bạn có thể mua từ 1 sản phẩm.

**VỀ GIAO HÀNG**

**Thời gian giao hàng bao lâu?**
- Nội thành TP.HCM, Hà Nội: 1-2 ngày
- Các tỉnh thành khác: 3-5 ngày
- Vùng sâu, vùng xa: 5-7 ngày

**Phí ship bao nhiêu?**
Phí ship từ 20,000đ - 45,000đ tùy khu vực. Miễn phí ship cho đơn hàng từ 500,000đ.

**Có giao hàng vào ngày lễ không?**
Có, chúng tôi vẫn giao hàng vào ngày lễ nhưng thời gian có thể chậm hơn 1-2 ngày.

**Làm sao để theo dõi đơn hàng?**
Bạn có thể theo dõi đơn hàng tại mục "Đơn hàng của tôi" trên website hoặc qua mã vận đơn được gửi qua SMS/email.

**VỀ THANH TOÁN**

**Có những hình thức thanh toán nào?**
Chúng tôi chấp nhận: COD (thanh toán khi nhận hàng), VNPay, chuyển khoản ngân hàng, ví điện tử (MoMo, ZaloPay).

**Thanh toán online có an toàn không?**
Tất cả giao dịch được mã hóa SSL 256-bit và tuân thủ tiêu chuẩn bảo mật quốc tế. Chúng tôi không lưu trữ thông tin thẻ của bạn.

**VỀ ĐỔI TRẢ**

**Thời gian đổi trả là bao lâu?**
7 ngày kể từ ngày nhận hàng.

**Sản phẩm sale có được đổi trả không?**
Sản phẩm sale giảm giá dưới 50% vẫn được đổi trả bình thường. Sản phẩm sale từ 50% trở lên không được đổi trả.

**Phí đổi trả như thế nào?**
Miễn phí nếu lỗi từ shop. Khách hàng chịu phí ship nếu đổi do không vừa ý.

**VỀ TÀI KHOẢN**

**Quên mật khẩu thì làm sao?**
Nhấn "Quên mật khẩu" ở trang đăng nhập, nhập email đã đăng ký để nhận link đặt lại mật khẩu.

**Làm sao để thay đổi thông tin tài khoản?**
Đăng nhập vào tài khoản, vào mục "Thông tin cá nhân" để cập nhật họ tên, số điện thoại, địa chỉ.

**VỀ KHUYẾN MÃI**

**Làm sao để nhận mã giảm giá?**
Theo dõi fanpage Facebook, đăng ký nhận email để cập nhật các chương trình khuyến mãi mới nhất.

**Mã giảm giá có thể dùng chung với khuyến mãi khác không?**
Mỗi đơn hàng chỉ áp dụng được 1 mã giảm giá. Mã giảm giá có thể kết hợp với sản phẩm đang sale.
"""
    },
    {
        "key": "size_guide",
        "title": "Hướng dẫn chọn size",
        "content": """**Hướng dẫn chọn size quần áo**

Để chọn được size phù hợp, bạn cần đo các số đo cơ thể và đối chiếu với bảng size bên dưới.

**CÁCH ĐO SIZE**

**Đo vòng ngực:**
Đo vòng quanh phần đầy đặn nhất của ngực, giữ thước dây ngang và không quá chặt.

**Đo vòng eo:**
Đo vòng quanh phần nhỏ nhất của eo, thường là trên rốn khoảng 2-3cm.

**Đo vòng hông:**
Đo vòng quanh phần đầy đặn nhất của hông và mông.

**Đo chiều dài:**
Đo từ vai xuống đến vị trí bạn muốn áo/quần dài tới.

---

**BẢNG SIZE ÁO NAM**

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng ngực (cm) |
|------|----------------|---------------|----------------|
| S | 160-165 | 50-55 | 86-90 |
| M | 165-170 | 55-62 | 90-94 |
| L | 170-175 | 62-70 | 94-98 |
| XL | 175-180 | 70-78 | 98-102 |
| XXL | 180-185 | 78-85 | 102-106 |

**BẢNG SIZE ÁO NỮ**

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng ngực (cm) |
|------|----------------|---------------|----------------|
| S | 150-155 | 42-48 | 80-84 |
| M | 155-160 | 48-54 | 84-88 |
| L | 160-165 | 54-60 | 88-92 |
| XL | 165-170 | 60-66 | 92-96 |

**BẢNG SIZE QUẦN NAM**

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng eo (cm) |
|------|----------------|---------------|--------------|
| 28 | 160-165 | 50-55 | 70-72 |
| 29 | 163-168 | 53-58 | 72-74 |
| 30 | 165-170 | 58-63 | 74-76 |
| 31 | 168-173 | 63-68 | 76-78 |
| 32 | 170-175 | 68-73 | 78-80 |
| 33 | 173-178 | 73-78 | 80-82 |
| 34 | 175-180 | 78-83 | 82-84 |
| 36 | 178-185 | 83-90 | 86-90 |

**BẢNG SIZE QUẦN NỮ**

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng eo (cm) |
|------|----------------|---------------|--------------|
| 26 | 150-155 | 42-47 | 62-64 |
| 27 | 153-158 | 47-50 | 64-66 |
| 28 | 155-160 | 50-54 | 66-68 |
| 29 | 158-163 | 54-58 | 68-70 |
| 30 | 160-165 | 58-62 | 70-72 |
| 31 | 163-168 | 62-66 | 72-74 |
| 32 | 165-170 | 66-70 | 74-76 |

---

**MẸO CHỌN SIZE**

- Nếu số đo của bạn nằm giữa 2 size, nên chọn size lớn hơn để thoải mái
- Quần jean co giãn (stretch) có thể chọn nhỏ hơn 1 size
- Áo form rộng (oversize) nên chọn đúng size hoặc nhỏ hơn 1 size
- Áo form ôm (slim fit) nên chọn đúng size hoặc lớn hơn 1 size nếu bạn thích thoải mái

**Cần tư vấn thêm?**
Liên hệ hotline 1900 1234 hoặc chat với nhân viên để được hỗ trợ chọn size phù hợp nhất.
"""
    }
]


def seed_store_info():
    app = create_app()
    with app.app_context():
        print("Bat dau nap du lieu thong tin cua hang...")
        
        for item in store_info_data:
            existing = StoreInfo.query.filter_by(key=item['key']).first()
            
            if existing:
                existing.title = item['title']
                existing.content = item['content']
                print(f"  Cap nhat: {item['title']}")
            else:
                store_info = StoreInfo(
                    key=item['key'],
                    title=item['title'],
                    content=item['content'],
                    is_active=True
                )
                db.session.add(store_info)
                print(f"  Them moi: {item['title']}")
        
        db.session.commit()
        print("\nHoan thanh nap du lieu thong tin cua hang!")
        print(f"Tong cong: {len(store_info_data)} muc")


if __name__ == '__main__':
    seed_store_info()
