"""
Seed data script for Products and Store Info
Run: docker exec -it webbanquanao-backend-1 python seed_data.py
"""
from app import create_app
from models import db, Product, StoreInfo

app = create_app()

# Sample Products Data - Categories match frontend: Áo, Quần, Váy, Đầm, Áo khoác, Phụ kiện
PRODUCTS = [
    # ÁO NAM
    {"ten_san_pham": "Áo Thun Nam Basic Cotton", "gia_ban": 199000, "loai": "Áo", "mo_ta": "Áo thun nam basic chất liệu cotton 100% mềm mại, thoáng mát. Phù hợp mặc hàng ngày, đi chơi, đi làm.", "size": "S,M,L,XL,XXL", "chat_lieu": "Cotton 100%", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"},
    {"ten_san_pham": "Áo Polo Nam Classic", "gia_ban": 299000, "loai": "Áo", "mo_ta": "Áo polo nam cổ bẻ thanh lịch, chất liệu cotton pha co giãn thoải mái. Thiết kế đơn giản, dễ phối đồ.", "size": "S,M,L,XL,XXL", "chat_lieu": "Cotton pha", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1625910513413-5fc45e80b5b7?w=500"},
    {"ten_san_pham": "Áo Thun Nam Oversize", "gia_ban": 249000, "loai": "Áo", "mo_ta": "Áo thun nam form oversize trẻ trung, năng động. Chất liệu cotton dày dặn, không xù lông.", "size": "M,L,XL", "chat_lieu": "Cotton", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500"},
    {"ten_san_pham": "Áo Sơ Mi Nam Trắng Công Sở", "gia_ban": 399000, "loai": "Áo", "mo_ta": "Áo sơ mi nam trắng form slim fit, chất liệu vải lụa cao cấp không nhăn. Phù hợp đi làm, dự tiệc.", "size": "S,M,L,XL,XXL", "chat_lieu": "Vải lụa", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500"},
    {"ten_san_pham": "Áo Sơ Mi Nam Kẻ Sọc", "gia_ban": 349000, "loai": "Áo", "mo_ta": "Áo sơ mi nam họa tiết kẻ sọc hiện đại, form regular fit thoải mái. Chất vải cotton thoáng mát.", "size": "S,M,L,XL", "chat_lieu": "Cotton", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500"},
    
    # QUẦN NAM (Size số: 28-36)
    {"ten_san_pham": "Quần Jean Nam Slim Fit", "gia_ban": 499000, "loai": "Quần", "mo_ta": "Quần jean nam form slim fit ôm vừa, chất liệu denim co giãn thoải mái. Màu xanh đậm classic.", "size": "28,29,30,31,32,33,34,36", "chat_lieu": "Denim", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500"},
    {"ten_san_pham": "Quần Kaki Nam Công Sở", "gia_ban": 399000, "loai": "Quần", "mo_ta": "Quần kaki nam form regular, chất liệu kaki cao cấp không nhăn. Phù hợp đi làm, đi chơi.", "size": "28,29,30,31,32,33,34,36", "chat_lieu": "Kaki", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500"},
    {"ten_san_pham": "Quần Short Nam Thể Thao", "gia_ban": 199000, "loai": "Quần", "mo_ta": "Quần short nam thể thao, chất liệu thun lạnh thoáng mát. Phù hợp tập gym, chạy bộ, mặc nhà.", "size": "28,29,30,31,32,34", "chat_lieu": "Thun lạnh", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500"},
    {"ten_san_pham": "Quần Jogger Nam", "gia_ban": 329000, "loai": "Quần", "mo_ta": "Quần jogger nam phong cách thể thao, bo chun ống. Chất liệu nỉ mềm mại, thoải mái vận động.", "size": "28,29,30,31,32,34", "chat_lieu": "Nỉ", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500"},
    
    # ÁO NỮ
    {"ten_san_pham": "Áo Thun Nữ Croptop", "gia_ban": 179000, "loai": "Áo", "mo_ta": "Áo thun nữ croptop trẻ trung, năng động. Chất liệu cotton mềm mại, co giãn tốt.", "size": "S,M,L", "chat_lieu": "Cotton", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500"},
    {"ten_san_pham": "Áo Sơ Mi Nữ Công Sở", "gia_ban": 329000, "loai": "Áo", "mo_ta": "Áo sơ mi nữ công sở thanh lịch, form slim fit tôn dáng. Chất liệu vải lụa mềm mại.", "size": "S,M,L,XL", "chat_lieu": "Vải lụa", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1551048632-24e444b48a3e?w=500"},
    {"ten_san_pham": "Áo Kiểu Nữ Cổ V", "gia_ban": 259000, "loai": "Áo", "mo_ta": "Áo kiểu nữ cổ V thanh lịch, thiết kế tay bồng nữ tính. Chất liệu voan nhẹ nhàng.", "size": "S,M,L", "chat_lieu": "Voan", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=500"},
    {"ten_san_pham": "Áo Len Nữ Cổ Tròn", "gia_ban": 359000, "loai": "Áo", "mo_ta": "Áo len nữ cổ tròn ấm áp, form regular fit. Chất liệu len mềm mại, không gây ngứa.", "size": "S,M,L,XL", "chat_lieu": "Len", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500"},
    
    # VÁY NỮ
    {"ten_san_pham": "Váy Midi Hoa Nhí", "gia_ban": 399000, "loai": "Váy", "mo_ta": "Váy midi họa tiết hoa nhí vintage, form xòe nhẹ nữ tính. Chất liệu vải tơ mềm mại.", "size": "S,M,L", "chat_lieu": "Vải tơ", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500"},
    {"ten_san_pham": "Chân Váy Công Sở", "gia_ban": 299000, "loai": "Váy", "mo_ta": "Chân váy công sở form chữ A, dài qua gối thanh lịch. Chất liệu kaki cao cấp.", "size": "S,M,L,XL", "chat_lieu": "Kaki", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500"},
    {"ten_san_pham": "Váy Jean Ngắn", "gia_ban": 279000, "loai": "Váy", "mo_ta": "Váy jean ngắn trẻ trung, năng động. Chất liệu denim co giãn thoải mái.", "size": "S,M,L", "chat_lieu": "Denim", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1592301933927-35b597393c0a?w=500"},
    
    # ĐẦM NỮ
    {"ten_san_pham": "Đầm Maxi Đi Biển", "gia_ban": 459000, "loai": "Đầm", "mo_ta": "Đầm maxi đi biển bay bổng, họa tiết tropical. Chất liệu voan nhẹ nhàng, thoáng mát.", "size": "S,M,L", "chat_lieu": "Voan", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500"},
    {"ten_san_pham": "Đầm Công Sở Thanh Lịch", "gia_ban": 529000, "loai": "Đầm", "mo_ta": "Đầm công sở form ôm thanh lịch, tôn dáng. Chất liệu vải cao cấp không nhăn.", "size": "S,M,L,XL", "chat_lieu": "Vải cao cấp", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=500"},
    {"ten_san_pham": "Đầm Dự Tiệc Sang Trọng", "gia_ban": 699000, "loai": "Đầm", "mo_ta": "Đầm dự tiệc sang trọng, thiết kế cổ V quyến rũ. Chất liệu lụa satin bóng mượt.", "size": "S,M,L", "chat_lieu": "Lụa satin", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500"},
    
    # QUẦN NỮ (Size số: 26-32)
    {"ten_san_pham": "Quần Jean Nữ Skinny", "gia_ban": 449000, "loai": "Quần", "mo_ta": "Quần jean nữ form skinny ôm sát, co giãn tốt tôn dáng. Màu xanh nhạt trẻ trung.", "size": "26,27,28,29,30,31,32", "chat_lieu": "Denim", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500"},
    {"ten_san_pham": "Quần Culottes Nữ", "gia_ban": 349000, "loai": "Quần", "mo_ta": "Quần culottes nữ ống rộng thoải mái, lưng cao tôn dáng. Chất liệu vải đũi mát mẻ.", "size": "26,27,28,29,30", "chat_lieu": "Vải đũi", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500"},
    {"ten_san_pham": "Quần Tây Nữ Công Sở", "gia_ban": 379000, "loai": "Quần", "mo_ta": "Quần tây nữ công sở form regular, chất liệu vải cao cấp không nhăn. Phù hợp đi làm.", "size": "26,27,28,29,30,31,32", "chat_lieu": "Vải cao cấp", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=500"},
    
    # ÁO KHOÁC
    {"ten_san_pham": "Áo Khoác Bomber Unisex", "gia_ban": 549000, "loai": "Áo khoác", "mo_ta": "Áo khoác bomber unisex phong cách streetwear, có lớp lót bên trong. Chất liệu dù chống nước nhẹ.", "size": "M,L,XL", "chat_lieu": "Vải dù", "gioi_tinh": "Unisex", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500"},
    {"ten_san_pham": "Áo Hoodie Unisex", "gia_ban": 399000, "loai": "Áo khoác", "mo_ta": "Áo hoodie unisex form rộng, có mũ và túi kangaroo. Chất liệu nỉ bông dày dặn, giữ ấm tốt.", "size": "M,L,XL,XXL", "chat_lieu": "Nỉ bông", "gioi_tinh": "Unisex", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500"},
    {"ten_san_pham": "Áo Khoác Jean Nam", "gia_ban": 599000, "loai": "Áo khoác", "mo_ta": "Áo khoác jean nam classic, form regular fit. Chất liệu denim dày dặn, bền đẹp.", "size": "M,L,XL", "chat_lieu": "Denim", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500"},
    {"ten_san_pham": "Áo Khoác Cardigan Nữ", "gia_ban": 429000, "loai": "Áo khoác", "mo_ta": "Áo khoác cardigan nữ len mỏng, form dài thanh lịch. Phù hợp mặc văn phòng điều hòa.", "size": "S,M,L", "chat_lieu": "Len", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500"},
    {"ten_san_pham": "Áo Khoác Blazer Nam", "gia_ban": 799000, "loai": "Áo khoác", "mo_ta": "Áo khoác blazer nam công sở, form slim fit lịch lãm. Chất liệu vải cao cấp không nhăn.", "size": "M,L,XL", "chat_lieu": "Vải cao cấp", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500"},
    
    # PHỤ KIỆN
    {"ten_san_pham": "Mũ Lưỡi Trai Unisex", "gia_ban": 129000, "loai": "Phụ kiện", "mo_ta": "Mũ lưỡi trai unisex phong cách thể thao, có khóa điều chỉnh size. Chất liệu cotton thoáng mát.", "size": "Free size", "chat_lieu": "Cotton", "gioi_tinh": "Unisex", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500"},
    {"ten_san_pham": "Túi Tote Canvas", "gia_ban": 199000, "loai": "Phụ kiện", "mo_ta": "Túi tote canvas unisex, thiết kế đơn giản tiện dụng. Chất liệu canvas dày dặn, bền đẹp.", "size": "Free size", "chat_lieu": "Canvas", "gioi_tinh": "Unisex", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500"},
    {"ten_san_pham": "Thắt Lưng Da Nam", "gia_ban": 249000, "loai": "Phụ kiện", "mo_ta": "Thắt lưng da nam cao cấp, khóa kim loại sáng bóng. Chất liệu da bò thật 100%.", "size": "Free size", "chat_lieu": "Da bò", "gioi_tinh": "Nam", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"},
    {"ten_san_pham": "Khăn Choàng Cổ Nữ", "gia_ban": 179000, "loai": "Phụ kiện", "mo_ta": "Khăn choàng cổ nữ họa tiết thanh lịch, chất liệu lụa mềm mại. Phù hợp đi làm, dự tiệc.", "size": "Free size", "chat_lieu": "Lụa", "gioi_tinh": "Nữ", "trang_thai": "Con_hang", "hinh_anh": "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500"},
]


# Sample Store Info Data
STORE_INFOS = [
    {
        "key": "about_us",
        "title": "Giới thiệu về cửa hàng",
        "content": """Shop Quần Áo là cửa hàng thời trang trực tuyến hàng đầu Việt Nam, được thành lập từ năm 2020. 
        
Chúng tôi chuyên cung cấp các sản phẩm thời trang nam nữ chất lượng cao với giá cả phải chăng. Với đội ngũ thiết kế trẻ trung, năng động, Shop Quần Áo luôn cập nhật những xu hướng thời trang mới nhất.

Sứ mệnh của chúng tôi là mang đến cho khách hàng những trải nghiệm mua sắm tuyệt vời nhất với sản phẩm chất lượng, dịch vụ tận tâm và giá cả hợp lý.

Tầm nhìn: Trở thành thương hiệu thời trang được yêu thích nhất Việt Nam."""
    },
    {
        "key": "contact",
        "title": "Thông tin liên hệ",
        "content": """📍 Địa chỉ: 123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh

📞 Hotline: 1900 1234 (8:00 - 22:00 hàng ngày)

📧 Email: support@fashionstore.vn

🌐 Website: www.fashionstore.vn

⏰ Giờ làm việc:
- Thứ 2 - Thứ 6: 8:00 - 21:00
- Thứ 7 - Chủ nhật: 9:00 - 20:00

Fanpage Facebook: facebook.com/shopquanao
Instagram: @shopquanao.vn
Zalo OA: Shop Quần Áo Official"""
    },
    {
        "key": "shipping_policy",
        "title": "Chính sách vận chuyển",
        "content": """🚚 CHÍNH SÁCH VẬN CHUYỂN

1. Phí vận chuyển:
- Miễn phí vận chuyển cho đơn hàng từ 500.000đ
- Đơn hàng dưới 500.000đ: phí ship 30.000đ (nội thành), 40.000đ (ngoại thành)

2. Thời gian giao hàng:
- Nội thành TP.HCM, Hà Nội: 1-2 ngày
- Các tỉnh thành khác: 3-5 ngày
- Vùng sâu vùng xa: 5-7 ngày

3. Đơn vị vận chuyển: GHN, GHTK, J&T Express, Viettel Post

4. Theo dõi đơn hàng: Quý khách có thể theo dõi đơn hàng qua mã vận đơn được gửi qua SMS/Email sau khi đơn hàng được giao cho đơn vị vận chuyển."""
    },
    {
        "key": "return_policy",
        "title": "Chính sách đổi trả",
        "content": """🔄 CHÍNH SÁCH ĐỔI TRẢ

1. Điều kiện đổi trả:
- Sản phẩm còn nguyên tem mác, chưa qua sử dụng
- Đổi trả trong vòng 7 ngày kể từ ngày nhận hàng
- Có hóa đơn mua hàng

2. Các trường hợp được đổi trả:
- Sản phẩm bị lỗi từ nhà sản xuất
- Giao sai sản phẩm, sai size, sai màu
- Sản phẩm không đúng mô tả

3. Quy trình đổi trả:
- Bước 1: Liên hệ hotline 1900 1234 hoặc inbox fanpage
- Bước 2: Gửi hình ảnh sản phẩm cần đổi trả
- Bước 3: Nhân viên xác nhận và hướng dẫn gửi hàng
- Bước 4: Nhận sản phẩm mới hoặc hoàn tiền trong 3-5 ngày

4. Lưu ý: Không áp dụng đổi trả với sản phẩm sale từ 50% trở lên."""
    },
    {
        "key": "payment_methods",
        "title": "Phương thức thanh toán",
        "content": """💳 PHƯƠNG THỨC THANH TOÁN

1. Thanh toán khi nhận hàng (COD):
- Thanh toán bằng tiền mặt khi nhận hàng
- Áp dụng toàn quốc

2. Chuyển khoản ngân hàng:
- Ngân hàng Vietcombank: 1234567890 - SHOP QUAN AO
- Ngân hàng Techcombank: 0987654321 - SHOP QUAN AO
- Nội dung: [Mã đơn hàng] - [Số điện thoại]

3. Ví điện tử:
- MoMo: 0909 123 456
- ZaloPay: 0909 123 456
- VNPay: Quét mã QR khi thanh toán

4. Thẻ tín dụng/ghi nợ:
- Visa, Mastercard, JCB
- Thanh toán an toàn qua cổng VNPay"""
    },
    {
        "key": "size_guide",
        "title": "Hướng dẫn chọn size",
        "content": """📏 HƯỚNG DẪN CHỌN SIZE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIZE ÁO NAM (theo chiều cao và cân nặng):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- S: Cao 160-165cm, Nặng 50-55kg
- M: Cao 165-170cm, Nặng 55-62kg
- L: Cao 170-175cm, Nặng 62-70kg
- XL: Cao 175-180cm, Nặng 70-78kg
- XXL: Cao 180-185cm, Nặng 78-85kg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIZE ÁO NỮ (theo chiều cao và cân nặng):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- S: Cao 150-155cm, Nặng 42-48kg
- M: Cao 155-160cm, Nặng 48-54kg
- L: Cao 160-165cm, Nặng 54-60kg
- XL: Cao 165-170cm, Nặng 60-66kg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIZE QUẦN NAM (size số theo chiều cao và cân nặng):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Size 28: Cao 160-165cm, Nặng 50-55kg, Vòng eo 70-72cm
- Size 29: Cao 163-168cm, Nặng 53-58kg, Vòng eo 72-74cm
- Size 30: Cao 165-170cm, Nặng 58-63kg, Vòng eo 74-76cm
- Size 31: Cao 168-173cm, Nặng 63-68kg, Vòng eo 76-78cm
- Size 32: Cao 170-175cm, Nặng 68-73kg, Vòng eo 78-80cm
- Size 33: Cao 173-178cm, Nặng 73-78kg, Vòng eo 80-82cm
- Size 34: Cao 175-180cm, Nặng 78-83kg, Vòng eo 82-84cm
- Size 36: Cao 178-185cm, Nặng 83-90kg, Vòng eo 86-90cm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIZE QUẦN NỮ (size số theo chiều cao và cân nặng):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Size 26: Cao 150-155cm, Nặng 42-47kg, Vòng eo 62-64cm
- Size 27: Cao 153-158cm, Nặng 47-50kg, Vòng eo 64-66cm
- Size 28: Cao 155-160cm, Nặng 50-54kg, Vòng eo 66-68cm
- Size 29: Cao 158-163cm, Nặng 54-58kg, Vòng eo 68-70cm
- Size 30: Cao 160-165cm, Nặng 58-62kg, Vòng eo 70-72cm
- Size 31: Cao 163-168cm, Nặng 62-66kg, Vòng eo 72-74cm
- Size 32: Cao 165-170cm, Nặng 66-70kg, Vòng eo 74-76cm

💡 Mẹo chọn size:
- Nếu bạn ở giữa 2 size, nên chọn size lớn hơn để thoải mái
- Quần jean co giãn có thể chọn size nhỏ hơn 1 size
- Quần kaki/tây nên chọn đúng size hoặc lớn hơn 1 size"""
    },
    {
        "key": "faq",
        "title": "Câu hỏi thường gặp",
        "content": """❓ CÂU HỎI THƯỜNG GẶP

1. Làm sao để đặt hàng?
- Chọn sản phẩm → Thêm vào giỏ hàng → Thanh toán → Điền thông tin giao hàng → Xác nhận đơn hàng

2. Tôi có thể hủy đơn hàng không?
- Có thể hủy đơn hàng trước khi đơn được giao cho đơn vị vận chuyển. Liên hệ hotline 1900 1234.

3. Làm sao để sử dụng mã giảm giá?
- Nhập mã giảm giá vào ô "Mã voucher" ở trang thanh toán và nhấn "Áp dụng".

4. Sản phẩm có bảo hành không?
- Sản phẩm được bảo hành lỗi kỹ thuật trong 30 ngày kể từ ngày mua.

5. Tôi có thể đổi size không?
- Có thể đổi size trong vòng 7 ngày nếu sản phẩm còn nguyên tem mác.

6. Khi nào tôi nhận được hàng?
- Nội thành: 1-2 ngày, Tỉnh khác: 3-5 ngày sau khi đặt hàng thành công."""
    },
    {
        "key": "membership",
        "title": "Chương trình thành viên",
        "content": """⭐ CHƯƠNG TRÌNH THÀNH VIÊN

1. Hạng Thành viên (Member):
- Tích lũy từ 0đ
- Ưu đãi: Giảm 5% tất cả sản phẩm

2. Hạng Bạc (Silver):
- Tích lũy từ 2.000.000đ
- Ưu đãi: Giảm 10% + Free ship đơn từ 300k

3. Hạng Vàng (Gold):
- Tích lũy từ 5.000.000đ
- Ưu đãi: Giảm 15% + Free ship mọi đơn + Quà sinh nhật

4. Hạng Kim Cương (Diamond):
- Tích lũy từ 10.000.000đ
- Ưu đãi: Giảm 20% + Free ship + Quà sinh nhật + Ưu tiên CSKH

Điểm tích lũy: 1.000đ = 1 điểm
100 điểm = 10.000đ giảm giá"""
    }
]


def seed_products():
    """Seed products data"""
    print("Seeding products...")
    count = 0
    for p in PRODUCTS:
        existing = Product.query.filter_by(ten_san_pham=p['ten_san_pham']).first()
        if not existing:
            product = Product(**p)
            db.session.add(product)
            count += 1
    db.session.commit()
    print(f"Added {count} products")
    return count


def seed_store_info():
    """Seed store info data"""
    print("Seeding store info...")
    count = 0
    for info in STORE_INFOS:
        existing = StoreInfo.query.filter_by(key=info['key']).first()
        if existing:
            existing.title = info['title']
            existing.content = info['content']
        else:
            store_info = StoreInfo(**info, is_active=True)
            db.session.add(store_info)
            count += 1
    db.session.commit()
    print(f"Added/Updated {count} store info entries")
    return count


def generate_embeddings():
    """Generate embeddings for all products and store info"""
    print("Generating embeddings...")
    try:
        from routes.chatbot import get_embedding
        
        # Products
        products = Product.query.all()
        for p in products:
            text = f"{p.ten_san_pham} {p.loai} {p.mo_ta or ''} {p.chat_lieu or ''} {p.gioi_tinh}"
            p.embedding = get_embedding(text)
        
        # Store info
        store_infos = StoreInfo.query.all()
        for info in store_infos:
            text = f"{info.title} {info.content}"
            info.content_embedding = get_embedding(text)
        
        db.session.commit()
        print(f"Generated embeddings for {len(products)} products and {len(store_infos)} store info")
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        db.session.rollback()


if __name__ == '__main__':
    with app.app_context():
        seed_products()
        seed_store_info()
        generate_embeddings()
        print("✅ Seed data completed!")
