"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                         CHATBOT AI - HỆ THỐNG TƯ VẤN SẢN PHẨM              ║
║                                                                              ║
║  Mô tả: API chatbot sử dụng AI (Gemini) kết hợp RAG (Retrieval-Augmented  ║
║         Generation) để tư vấn sản phẩm thời trang thông minh               ║
║                                                                              ║
║  Công nghệ:                                                                 ║
║  - Google Gemini AI: Xử lý ngôn ngữ tự nhiên và tạo câu trả lời           ║
║  - SentenceTransformer: Tạo embedding vector cho tìm kiếm ngữ nghĩa        ║
║  - PostgreSQL pgvector: Tìm kiếm sản phẩm dựa trên độ tương đồng vector   ║
║                                                                              ║
║  Tính năng chính:                                                           ║
║  - Tìm kiếm sản phẩm thông minh theo ngữ nghĩa                             ║
║  - Tư vấn sản phẩm khuyến mãi                                              ║
║  - Trả lời câu hỏi về chính sách cửa hàng                                  ║
║  - Hỗ trợ lịch sử hội thoại (context-aware)                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Product, StoreInfo, Promotion
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPICallError
from datetime import datetime
import numpy as np
import os

chatbot_bp = Blueprint('chatbot', __name__)

# ============================================================================
# PHẦN 1: KHỞI TẠO MÔ HÌNH EMBEDDING (LOCAL)
# ============================================================================
# Sử dụng SentenceTransformer để tạo vector embedding cho văn bản
# Model 'all-MiniLM-L6-v2': 
embedding_model = None

def get_embedding_model():
    """
    Lấy instance của model embedding (singleton pattern)
    Chỉ khởi tạo 1 lần để tiết kiệm bộ nhớ
    """
    global embedding_model
    if embedding_model is None:
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return embedding_model

# ============================================================================
# PHẦN 2: CẤU HÌNH GOOGLE GEMINI AI
# ============================================================================
# Gemini: Mô hình AI của Google để xử lý ngôn ngữ tự nhiên và tạo câu trả lời
# Hỗ trợ tự động chuyển đổi giữa các model khi gặp lỗi quota
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("[CẢNH BÁO] GEMINI_API_KEY chưa được thiết lập. Chatbot sẽ dùng chế độ dự phòng.")
    GEMINI_API_KEY = 'AIzaSyA2jCbDXWuKM56pD17SlBvx4Ni3AGT8WDA'  # API key dự phòng

# Cấu hình tham số sinh văn bản của Gemini
GENERATION_CONFIG = {
    "temperature": 0.6,      # Độ sáng tạo (0-1): 0.6 = cân bằng giữa chính xác và linh hoạt
    "top_p": 0.9,           # Nucleus sampling: chọn từ trong top 90% xác suất
    "top_k": 40,            # Chỉ xét 40 token có xác suất cao nhất
    "max_output_tokens": 1024,  # Giới hạn độ dài câu trả lời
}

# Cấu hình an toàn: Tắt tất cả bộ lọc nội dung để tránh bị chặn không cần thiết
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

# Biến toàn cục lưu trạng thái Gemini
_GEMINI = {"ready": False, "primary": None, "fallback": None}

def _ensure_gemini():
    """
    Khởi tạo Gemini với cơ chế tự động chuyển đổi model dự phòng
    Tìm và chọn model khả dụng từ danh sách ưu tiên
    """
    if _GEMINI["ready"]:
        return
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[GEMINI] Lỗi cấu hình: {e}")
        _GEMINI["ready"] = False
        return
    
    # Danh sách model ưu tiên (từ mạnh nhất đến nhẹ nhất, bao gồm Gemma làm dự phòng)
    preferred = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash-exp",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemma-3-27b-it",  # Gemma dự phòng - quota riêng biệt
        "gemma-3-12b-it",
        "gemma-3-4b-it",
    ]
    
    # Lấy danh sách model được hỗ trợ từ API
    supported_names = set()
    try:
        models = list(genai.list_models())
        for m in models:
            methods = set(getattr(m, "supported_generation_methods", []) or [])
            if "generateContent" in methods:
                supported_names.add(m.name)
                if m.name.startswith("models/"):
                    supported_names.add(m.name.split("models/", 1)[1])
        print(f"[GEMINI] Tìm thấy {len(supported_names)} model được hỗ trợ")
    except Exception as e:
        print(f"[GEMINI] Không thể liệt kê model: {e}, sử dụng mặc định")
        supported_names.update(preferred)
    
    def pick_first_available(cands):
        """Chọn model khả dụng đầu tiên từ danh sách ứng viên"""
        for name in cands:
            if name in supported_names or f"models/{name}" in supported_names:
                return f"models/{name}" if not name.startswith("models/") else name
        return None
    
    primary_name = pick_first_available(preferred)
    if not primary_name:
        print("[GEMINI] Không tìm thấy model được hỗ trợ!")
        _GEMINI["ready"] = False
        return
    
    fallback_name = pick_first_available([m for m in preferred if f"models/{m}" != primary_name])
    
    try:
        _GEMINI["primary"] = genai.GenerativeModel(
            primary_name, 
            generation_config=GENERATION_CONFIG, 
            safety_settings=SAFETY_SETTINGS
        )
        _GEMINI["fallback"] = genai.GenerativeModel(
            fallback_name, 
            generation_config=GENERATION_CONFIG, 
            safety_settings=SAFETY_SETTINGS
        ) if fallback_name else None
        _GEMINI["ready"] = True
        print(f"[GEMINI] Khởi tạo thành công - Chính: {primary_name}, Dự phòng: {fallback_name}")
    except Exception as e:
        print(f"[GEMINI] Lỗi khởi tạo: {e}")
        _GEMINI["ready"] = False

def _gemini_text_and_reason(resp):
    """
    Trích xuất văn bản và lý do kết thúc từ response của Gemini
    Xử lý các trường hợp: blocked, finish_reason, empty response
    """
    try:
        txt = getattr(resp, "text", "") or ""
        reason = ""
        pf = getattr(resp, "prompt_feedback", None)
        if pf and getattr(pf, "block_reason", None):
            reason = f"bị chặn: {pf.block_reason}"
        cands = getattr(resp, "candidates", []) or []
        if cands:
            fr = getattr(cands[0], "finish_reason", None)
            if fr:
                reason = f"finish_reason={fr}" if not reason else f"{reason}; finish_reason={fr}"
        if not txt:
            try:
                parts = []
                content = getattr(cands[0], "content", None)
                for p in getattr(content, "parts", []) or []:
                    val = getattr(p, "text", None)
                    if isinstance(val, str):
                        parts.append(val)
                txt = "\n".join(parts)
            except Exception:
                pass
        return (txt or ""), reason
    except Exception:
        return "", ""

def _call_gemini_with_fallback(prompt: str) -> str:
    """
    Gọi Gemini với cơ chế tự động chuyển đổi qua tất cả model khả dụng
    Thử lần lượt các model cho đến khi có kết quả hoặc hết model
    
    Args:
        prompt: Câu hỏi/yêu cầu gửi đến AI
    
    Returns:
        str: Câu trả lời từ AI, hoặc None nếu tất cả model đều thất bại
    """
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[GEMINI] Lỗi cấu hình API: {e}")
        return None
    
    # Thử các model theo thứ tự ưu tiên
    models_to_try = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemma-3-27b-it",
        "gemma-3-12b-it",
        "gemma-3-4b-it",
    ]
    
    last_error = None
    for model_name in models_to_try:
        try:
            print(f"[GEMINI] Đang thử model: {model_name}")
            model = genai.GenerativeModel(
                model_name,
                generation_config=GENERATION_CONFIG,
                safety_settings=SAFETY_SETTINGS
            )
            # Gọi API (không dùng timeout parameter vì API không hỗ trợ)
            response = model.generate_content(prompt)
            text, reason = _gemini_text_and_reason(response)
            if text:
                print(f"[GEMINI] ✓ Thành công với {model_name}")
                return text
            else:
                print(f"[GEMINI] ✗ {model_name} trả về rỗng: {reason}")
                last_error = f"Response rỗng: {reason}"
        except ResourceExhausted as e:
            print(f"[GEMINI] ✗ {model_name} hết quota")
            last_error = "Hết quota"
            continue
        except GoogleAPICallError as e:
            error_msg = str(e)[:100]
            print(f"[GEMINI] ✗ {model_name} lỗi API: {error_msg}")
            last_error = f"Lỗi API: {error_msg}"
            continue
        except TimeoutError:
            print(f"[GEMINI] ✗ {model_name} timeout")
            last_error = "Timeout"
            continue
        except Exception as e:
            error_msg = str(e)[:100]
            print(f"[GEMINI] ✗ {model_name} lỗi: {error_msg}")
            last_error = f"Lỗi: {error_msg}"
            continue
    
    print(f"[GEMINI] ✗ Tất cả model đều thất bại. Lỗi cuối: {last_error}")
    return None


# ============================================================================
# PHẦN 3: HÀM TẠO EMBEDDING VÀ TÌM KIẾM VECTOR (RAG)
# ============================================================================
# RAG (Retrieval-Augmented Generation): Tìm kiếm thông tin liên quan trước,
# sau đó đưa vào AI để tạo câu trả lời chính xác hơn

def get_embedding(text):
    """
    Tạo vector embedding từ văn bản sử dụng SentenceTransformer local
    Vector này dùng để tính độ tương đồng ngữ nghĩa
    """
    model = get_embedding_model()
    embedding = model.encode(text)
    return embedding.tolist()

def search_products(query_embedding, top_k=5):
    """
    Tìm kiếm sản phẩm sử dụng pgvector similarity search
    So sánh vector của câu hỏi với vector của sản phẩm trong DB
    
    Args:
        query_embedding: Vector embedding của câu hỏi
        top_k: Số lượng sản phẩm trả về (mặc định 5)
    
    Returns:
        list: Danh sách sản phẩm có độ tương đồng cao nhất
    """
    try:
        embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
        
        # Sử dụng string formatting cho ::vector cast (SQLAlchemy xử lý không tốt với params)
        # Toán tử <=>: cosine distance trong pgvector (càng nhỏ càng giống)
        sql = f"""
            SELECT products_id, ten_san_pham, gia_ban, loai, mo_ta, size, chat_lieu, gioi_tinh, trang_thai, hinh_anh,
                   embedding <=> '{embedding_str}'::vector AS distance
            FROM products
            WHERE embedding IS NOT NULL AND trang_thai = 'Con_hang'
            ORDER BY embedding <=> '{embedding_str}'::vector
            LIMIT {top_k}
        """
        results = db.session.execute(db.text(sql)).fetchall()
        
        products = []
        for row in results:
            products.append({
                'id': row.products_id,
                'ten_san_pham': row.ten_san_pham,
                'gia_ban': float(row.gia_ban) if row.gia_ban else 0,
                'loai': row.loai,
                'mo_ta': row.mo_ta,
                'size': row.size,
                'chat_lieu': row.chat_lieu,
                'gioi_tinh': row.gioi_tinh,
                'hinh_anh': row.hinh_anh,
                'distance': float(row.distance)
            })
        return products
    except Exception as e:
        print(f"Lỗi tìm kiếm sản phẩm: {e}")
        return []

def search_store_info(query_embedding, top_k=3):
    """
    Tìm kiếm thông tin cửa hàng sử dụng pgvector similarity search
    Tìm các chính sách, hướng dẫn liên quan đến câu hỏi
    """
    try:
        embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
        
        sql = f"""
            SELECT id, key, title, content,
                   content_embedding <=> '{embedding_str}'::vector AS distance
            FROM store_info
            WHERE content_embedding IS NOT NULL AND is_active = true
            ORDER BY content_embedding <=> '{embedding_str}'::vector
            LIMIT {top_k}
        """
        results = db.session.execute(db.text(sql)).fetchall()
        
        infos = []
        for row in results:
            infos.append({
                'key': row.key,
                'title': row.title,
                'content': row.content,
                'distance': float(row.distance)
            })
        return infos
    except Exception as e:
        print(f"Lỗi tìm kiếm thông tin cửa hàng: {e}")
        return []

def get_all_products_simple():
    """
    Lấy tất cả sản phẩm không dùng embedding (dự phòng khi RAG lỗi)
    Trả về danh sách sản phẩm cơ bản để AI vẫn có thể tư vấn
    """
    try:
        results = db.session.execute(
            db.text("""
                SELECT products_id, ten_san_pham, gia_ban, loai, mo_ta, size, chat_lieu, gioi_tinh
                FROM products
                WHERE trang_thai = 'Con_hang'
                LIMIT 20
            """)
        ).fetchall()
        
        products = []
        for row in results:
            products.append({
                'id': row.products_id,
                'ten_san_pham': row.ten_san_pham,
                'gia_ban': float(row.gia_ban) if row.gia_ban else 0,
                'loai': row.loai,
                'mo_ta': row.mo_ta,
                'size': row.size,
                'chat_lieu': row.chat_lieu,
                'gioi_tinh': row.gioi_tinh
            })
        return products
    except Exception as e:
        print(f"Lỗi lấy danh sách sản phẩm: {e}")
        return []

def get_all_store_info_simple():
    """
    Lấy tất cả thông tin cửa hàng không dùng embedding (dự phòng)
    """
    try:
        results = db.session.execute(
            db.text("""
                SELECT key, title, content
                FROM store_info
                WHERE is_active = true
            """)
        ).fetchall()
        
        infos = []
        for row in results:
            infos.append({
                'key': row.key,
                'title': row.title,
                'content': row.content
            })
        return infos
    except Exception as e:
        print(f"Lỗi lấy thông tin cửa hàng: {e}")
        return []


# ============================================================================
# PHẦN 4: HÀM XỬ LÝ KHUYẾN MÃI VÀ GIÁ
# ============================================================================

def get_promotional_products():
    """
    Lấy tất cả sản phẩm đang có khuyến mãi
    
    """
    try:
        now = datetime.utcnow()
        
        # Query sản phẩm có khuyến mãi đang hoạt động
        results = db.session.execute(
            db.text("""
                SELECT p.products_id, p.ten_san_pham, p.gia_ban, p.loai, p.mo_ta, 
                       p.size, p.chat_lieu, p.gioi_tinh, p.hinh_anh,
                       pr.discount_type, pr.discount_value, pr.end_date
                FROM products p
                INNER JOIN promotions pr ON p.products_id = pr.product_id
                WHERE p.trang_thai = 'Con_hang'
                  AND pr.is_active = true
                  AND pr.start_date <= :now
                  AND pr.end_date >= :now
                ORDER BY pr.discount_value DESC
                LIMIT 10
            """),
            {'now': now}
        ).fetchall()
        
        products = []
        for row in results:
            original_price = float(row.gia_ban) if row.gia_ban else 0
            discount_value = float(row.discount_value) if row.discount_value else 0
            
            # Tính giá khuyến mãi
            if row.discount_type == 'percent':
                promotional_price = original_price * (1 - discount_value / 100)
                discount_text = f"Giảm {int(discount_value)}%"
            else:
                promotional_price = original_price - discount_value
                discount_text = f"Giảm {discount_value:,.0f}đ"
            
            products.append({
                'id': row.products_id,
                'ten_san_pham': row.ten_san_pham,
                'gia_ban': original_price,
                'gia_khuyen_mai': max(promotional_price, 0),
                'discount_text': discount_text,
                'discount_type': row.discount_type,
                'discount_value': discount_value,
                'loai': row.loai,
                'mo_ta': row.mo_ta,
                'size': row.size,
                'chat_lieu': row.chat_lieu,
                'gioi_tinh': row.gioi_tinh,
                'hinh_anh': row.hinh_anh,
                'end_date': row.end_date.isoformat() if row.end_date else None,
                'is_promotional': True
            })
        return products
    except Exception as e:
        print(f"Lỗi lấy sản phẩm khuyến mãi: {e}")
        return []


def get_product_promotion_info(product_id):
    """
    Lấy thông tin khuyến mãi cho 1 sản phẩm cụ thể
    """
    try:
        now = datetime.utcnow()
        result = db.session.execute(
            db.text("""
                SELECT discount_type, discount_value, end_date
                FROM promotions
                WHERE product_id = :product_id
                  AND is_active = true
                  AND start_date <= :now
                  AND end_date >= :now
                LIMIT 1
            """),
            {'product_id': product_id, 'now': now}
        ).first()
        
        if result:
            return {
                'discount_type': result.discount_type,
                'discount_value': float(result.discount_value),
                'end_date': result.end_date.isoformat() if result.end_date else None
            }
        return None
    except Exception as e:
        print(f"Lỗi lấy thông tin khuyến mãi: {e}")
        return None


def get_products_by_price(order='desc', limit=5, category=None):
    """
    Lấy sản phẩm sắp xếp theo giá (cao nhất hoặc thấp nhất)
    Dùng để trả lời câu hỏi "sản phẩm đắt nhất", "sản phẩm rẻ nhất"
    """
    try:
        order_clause = "DESC" if order == 'desc' else "ASC"
        category_filter = f"AND loai = '{category}'" if category else ""
        
        results = db.session.execute(
            db.text(f"""
                SELECT products_id, ten_san_pham, gia_ban, loai, mo_ta, size, chat_lieu, gioi_tinh, hinh_anh
                FROM products
                WHERE trang_thai = 'Con_hang' {category_filter}
                ORDER BY gia_ban {order_clause}
                LIMIT {limit}
            """)
        ).fetchall()
        
        products = []
        for row in results:
            products.append({
                'id': row.products_id,
                'ten_san_pham': row.ten_san_pham,
                'gia_ban': float(row.gia_ban) if row.gia_ban else 0,
                'loai': row.loai,
                'mo_ta': row.mo_ta,
                'size': row.size,
                'chat_lieu': row.chat_lieu,
                'gioi_tinh': row.gioi_tinh,
                'hinh_anh': row.hinh_anh
            })
        return products
    except Exception as e:
        print(f"Lỗi lấy sản phẩm theo giá: {e}")
        return []


# ============================================================================
# PHẦN 5: HÀM PHÁT HIỆN Ý ĐỊNH CỦA KHÁCH HÀNG
# ============================================================================

def detect_price_query(query):
    """
    Phát hiện câu hỏi về giá cao nhất/thấp nhất
    Ví dụ: "sản phẩm đắt nhất", "áo rẻ nhất"
    """
    ql = query.lower()
    
    # Phát hiện giá cao nhất
    highest_keywords = ['đắt nhất', 'cao nhất', 'giá cao nhất', 'mắc nhất', 'đắt tiền nhất', 'giá đắt', 'cao giá']
    for kw in highest_keywords:
        if kw in ql:
            return 'highest'
    
    # Phát hiện giá thấp nhất
    lowest_keywords = ['rẻ nhất', 'thấp nhất', 'giá thấp nhất', 'giá rẻ nhất', 'rẻ tiền nhất', 'giá rẻ', 'thấp giá']
    for kw in lowest_keywords:
        if kw in ql:
            return 'lowest'
    
    return None


def detect_category_in_query(query):
    """
    Phát hiện loại sản phẩm được nhắc đến trong câu hỏi
    Ví dụ: "áo đắt nhất" → category = "Áo"
    """
    ql = query.lower()
    categories = {
        'áo': 'Áo',
        'quần': 'Quần',
        'váy': 'Váy',
        'đầm': 'Đầm',
        'áo khoác': 'Áo khoác',
        'phụ kiện': 'Phụ kiện'
    }
    
    for keyword, category in categories.items():
        if keyword in ql:
            return category
    return None

# ============================================================================
# PHẦN 6: PROMPT TEMPLATE CHO AI
# ============================================================================
# Đây là hướng dẫn chi tiết cho AI về cách trả lời khách hàng

CHATBOT_PROMPT = """Bạn là trợ lý AI của cửa hàng thời trang Shop Quần Áo. Nhiệm vụ của bạn là tư vấn sản phẩm, trả lời câu hỏi về cửa hàng.

**THÔNG TIN SẢN PHẨM CÓ SẴN:**
{product_context}

**SẢN PHẨM ĐANG KHUYẾN MÃI:**
{promotion_context}

**THÔNG TIN CỬA HÀNG:**
{store_context}

**LỊCH SỬ HỘI THOẠI:**
{chat_history}

**CÂU HỎI HIỆN TẠI CỦA KHÁCH:** {query}

**HƯỚNG DẪN TRẢ LỜI:**
1. Nếu khách chào hỏi → chào lại thân thiện, hỏi cần hỗ trợ gì
2. **QUAN TRỌNG - Khi gợi ý sản phẩm:**
   - Nếu khách hỏi "1 áo" → CHỈ gợi ý ĐÚNG 1 sản phẩm ÁO (không gợi ý quần, váy...)
   - Nếu khách hỏi "2 quần" → CHỈ gợi ý ĐÚNG 2 sản phẩm QUẦN
   - Nếu khách hỏi "3 sản phẩm" → gợi ý ĐÚNG 3 sản phẩm
   - LUÔN tuân thủ ĐÚNG số lượng và ĐÚNG loại sản phẩm khách yêu cầu
3. **GIÁ CAO NHẤT / THẤP NHẤT:**
   - Nếu khách hỏi "sản phẩm đắt nhất", "giá cao nhất" → Trả lời sản phẩm #1 trong danh sách GIÁ CAO NHẤT
   - Nếu khách hỏi "sản phẩm rẻ nhất", "giá thấp nhất" → Trả lời sản phẩm #1 trong danh sách GIÁ THẤP NHẤT
   - Nếu hỏi "top 3 đắt nhất" → Trả lời 3 sản phẩm đầu tiên trong danh sách GIÁ CAO NHẤT
   - PHẢI dùng đúng sản phẩm từ danh sách đã được sắp xếp theo giá
4. **KHUYẾN MÃI:**
   - Nếu khách hỏi về khuyến mãi, giảm giá, sale → ƯU TIÊN giới thiệu sản phẩm từ danh sách ĐANG KHUYẾN MÃI
   - Khi giới thiệu sản phẩm khuyến mãi, PHẢI nêu rõ: giá gốc, mức giảm, giá sau giảm
   - Ví dụ: "Áo ABC đang giảm 30%! Giá gốc 500.000đ → Chỉ còn 350.000đ"
5. **THÔNG TIN CỬA HÀNG - CỰC KỲ QUAN TRỌNG:**
   - CHỈ sử dụng CHÍNH XÁC thông tin từ phần "THÔNG TIN CỬA HÀNG" bên trên
   - TUYỆT ĐỐI KHÔNG tự bịa địa chỉ, số điện thoại, email, giờ mở cửa
   - Nếu thông tin không có trong dữ liệu → nói "Vui lòng liên hệ hotline để biết thêm chi tiết"
   - Khi trả lời về địa chỉ/liên hệ → COPY NGUYÊN VĂN từ dữ liệu, không thay đổi
6. **VẤN ĐỀ CẦN NHÂN VIÊN HỖ TRỢ:**
   - Nếu khách hỏi về: bảo mật tài khoản, mật khẩu, khiếu nại, hoàn tiền, lỗi thanh toán, tài khoản bị khóa, hàng bị hỏng, tranh chấp → trả lời ngắn gọn rằng vấn đề này cần nhân viên hỗ trợ trực tiếp, và gợi ý chuyển sang CSKH
   - Nếu khách hỏi về đơn hàng (kiểm tra đơn, trạng thái đơn, giao hàng, hủy đơn, đơn ở đâu, khi nào nhận được...) → trả lời ngắn gọn rằng cần nhân viên tra cứu đơn hàng trực tiếp, gợi ý chuyển sang CSKH
   - Kết thúc câu trả lời bằng: [SUGGEST_CSKH]
7. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn
8. KHÔNG bịa đặt thông tin không có trong dữ liệu
9. SỬ DỤNG LỊCH SỬ HỘI THOẠI để hiểu ngữ cảnh và trả lời phù hợp

**BẮT BUỘC:** Ở DÒNG CUỐI CÙNG của câu trả lời, PHẢI ghi CHÍNH XÁC theo format:
[PRODUCTS: id1,id2] - chỉ ghi ID của sản phẩm bạn ĐÃ ĐỀ CẬP trong câu trả lời
[PRODUCTS: ] - nếu không đề cập sản phẩm nào

Ví dụ: Nếu bạn giới thiệu sản phẩm ID:5 và ID:8 thì ghi: [PRODUCTS: 5,8]"""


# ============================================================================
# PHẦN 7: API ENDPOINT CHÍNH - XỬ LÝ CÂU HỎI TỪ KHÁCH HÀNG
# ============================================================================

@chatbot_bp.route('/ask', methods=['POST'])
def ask_chatbot():
    """
    API endpoint chính để xử lý câu hỏi từ chatbot
    
    Flow:
    1. Nhận câu hỏi từ frontend
    2. Phát hiện ý định (khuyến mãi, giá cao/thấp, sản phẩm...)
    3. Tìm kiếm thông tin liên quan (RAG)
    4. Gửi prompt + context đến Gemini AI
    5. Parse kết quả và trả về frontend
    """
    data = request.get_json()
    query = (data.get('query') or '').strip()
    chat_history = data.get('history', [])  # Lấy lịch sử hội thoại từ request
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    # Phản hồi nhanh cho lời chào (chỉ khi chưa có lịch sử)
    ql = query.lower()
    if not chat_history and (len(ql) < 3 or ql in {'hi', 'hello', 'xin chào', 'chào', 'hey', 'alo'}):
        return jsonify({
            'response': 'Xin chào! 👋 Tôi là trợ lý AI của Shop Quần Áo. Tôi có thể giúp bạn:\n• Tìm kiếm sản phẩm (áo, quần, váy, đầm...)\n• Thông tin cửa hàng, chính sách đổi trả, vận chuyển\n• Hướng dẫn chọn size\n\nBạn cần hỗ trợ gì ạ?',
            'products': [],
            'source': 'greeting'
        })
    
    try:
        products = []
        store_infos = []
        promotional_products = []
        price_sorted_products = []
        
        # Kiểm tra câu hỏi có liên quan đến khuyến mãi không
        promo_keywords = ['khuyến mãi', 'giảm giá', 'sale', 'ưu đãi', 'khuyến mại', 'giảm', 'tiết kiệm', 'deal', 'hot']
        is_promo_query = any(kw in ql for kw in promo_keywords)
        
        # Kiểm tra câu hỏi về giá (cao nhất/thấp nhất)
        price_query_type = detect_price_query(query)
        category_in_query = detect_category_in_query(query)
        
        if price_query_type:
            order = 'desc' if price_query_type == 'highest' else 'asc'
            price_sorted_products = get_products_by_price(order=order, limit=5, category=category_in_query)
            print(f"[CHAT] Phát hiện câu hỏi về giá: {price_query_type}, tìm thấy {len(price_sorted_products)} sản phẩm")
        
        # Lấy sản phẩm khuyến mãi
        promotional_products = get_promotional_products()
        print(f"[CHAT] Tìm thấy {len(promotional_products)} sản phẩm khuyến mãi")
        
        # Thử tìm kiếm RAG với embeddings
        try:
            query_embedding = get_embedding(query)
            products = search_products(query_embedding, top_k=10)
            store_infos = search_store_info(query_embedding, top_k=3)
            print(f"[CHAT] Tìm kiếm RAG: {len(products)} sản phẩm, {len(store_infos)} thông tin cửa hàng")
        except Exception as e:
            print(f"[CHAT] Lỗi tìm kiếm RAG: {e}")
        
        # Dự phòng: lấy dữ liệu không dùng embeddings
        if not products:
            products = get_all_products_simple()
            print(f"[CHAT] Dự phòng: {len(products)} sản phẩm")
        if not store_infos:
            store_infos = get_all_store_info_simple()
            print(f"[CHAT] Dự phòng: {len(store_infos)} thông tin cửa hàng")
        
        # Thêm thông tin khuyến mãi vào sản phẩm thường
        for p in products:
            promo_info = get_product_promotion_info(p['id'])
            if promo_info:
                original_price = p['gia_ban']
                if promo_info['discount_type'] == 'percent':
                    p['gia_khuyen_mai'] = original_price * (1 - promo_info['discount_value'] / 100)
                    p['discount_text'] = f"Giảm {int(promo_info['discount_value'])}%"
                else:
                    p['gia_khuyen_mai'] = original_price - promo_info['discount_value']
                    p['discount_text'] = f"Giảm {promo_info['discount_value']:,.0f}đ"
                p['is_promotional'] = True
        
        # Xây dựng context cho AI
        product_context = ""
        
        # Nếu hỏi về giá, ưu tiên sản phẩm đã sắp xếp theo giá
        if price_sorted_products:
            price_label = "GIÁ CAO NHẤT" if price_query_type == 'highest' else "GIÁ THẤP NHẤT"
            category_label = f" ({category_in_query})" if category_in_query else ""
            product_context += f"**SẢN PHẨM {price_label}{category_label}:**\n"
            for i, p in enumerate(price_sorted_products, 1):
                product_context += f"- [ID:{p['id']}] #{i} {p['ten_san_pham']}: {p['gia_ban']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}\n"
            product_context += "\n**CÁC SẢN PHẨM KHÁC:**\n"
            # Thêm price_sorted_products vào products để tra cứu sau
            for p in price_sorted_products:
                if p not in products:
                    products.append(p)
        
        if products:
            for p in products[:10]:
                if p.get('is_promotional') and p.get('gia_khuyen_mai'):
                    product_context += f"- [ID:{p['id']}] {p['ten_san_pham']}: Giá gốc {p['gia_ban']:,.0f}đ → {p['discount_text']} → Còn {p['gia_khuyen_mai']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}\n"
                else:
                    product_context += f"- [ID:{p['id']}] {p['ten_san_pham']}: {p['gia_ban']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}, Chất liệu: {p.get('chat_lieu', 'N/A')}\n"
            print(f"[CHAT] Đã xây dựng context với {len(products)} sản phẩm")
        else:
            product_context = "Không có sản phẩm"
            print("[CHAT] Không tìm thấy sản phẩm!")
        
        # Xây dựng context khuyến mãi
        promotion_context = ""
        if promotional_products:
            for p in promotional_products[:5]:
                promotion_context += f"- [ID:{p['id']}] {p['ten_san_pham']}: Giá gốc {p['gia_ban']:,.0f}đ → {p['discount_text']} → Chỉ còn {p['gia_khuyen_mai']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}\n"
            print(f"[CHAT] Đã xây dựng context khuyến mãi với {len(promotional_products)} sản phẩm")
        else:
            promotion_context = "Hiện không có sản phẩm khuyến mãi"
        
        # Phát hiện câu hỏi về thông tin cửa hàng cụ thể
        store_info_keywords = {
            'liên hệ': 'contact_info',
            'lien he': 'contact_info',
            'địa chỉ': 'contact_info',
            'dia chi': 'contact_info',
            'hotline': 'contact_info',
            'số điện thoại': 'contact_info',
            'email': 'contact_info',
            'giờ mở cửa': 'contact_info',
            'chính sách bảo mật': 'privacy_policy',
            'bảo mật': 'privacy_policy',
            'điều khoản': 'terms_conditions',
            'dieu khoan': 'terms_conditions',
            'vận chuyển': 'shipping_policy',
            'van chuyen': 'shipping_policy',
            'giao hàng': 'shipping_policy',
            'đổi trả': 'return_policy',
            'doi tra': 'return_policy',
            'hoàn tiền': 'return_policy',
            'thanh toán': 'payment_methods',
            'phương thức thanh toán': 'payment_methods',
            'bảo hành': 'warranty_policy',
            'bao hanh': 'warranty_policy',
            'câu hỏi': 'faq',
            'faq': 'faq',
            'size': 'size_guide',
            'chọn size': 'size_guide',
            'giới thiệu': 'about_us',
            'về chúng tôi': 'about_us'
        }
        
        # Tìm key cụ thể trong câu hỏi
        specific_key = None
        for keyword, key in store_info_keywords.items():
            if keyword in ql:
                specific_key = key
                break
        
        store_context = ""
        
        # Nếu phát hiện câu hỏi cụ thể, lấy ĐÚNG thông tin từ database
        if specific_key:
            try:
                specific_info = StoreInfo.query.filter_by(key=specific_key, is_active=True).first()
                if specific_info:
                    store_context = f"**{specific_info.title}:**\n{specific_info.content}\n\n"
                    print(f"[CHAT] Phát hiện câu hỏi về {specific_key}, đã lấy thông tin chính xác")
            except Exception as e:
                print(f"[CHAT] Lỗi lấy thông tin cụ thể: {e}")
        
        # Thêm thông tin từ RAG search (nếu có)
        if store_infos:
            for info in store_infos[:2]:  # Giảm xuống 2 để tránh quá dài
                # Tránh trùng lặp với thông tin cụ thể đã lấy
                if not specific_key or info['key'] != specific_key:
                    store_context += f"- {info['title']}: {info['content'][:500]}...\n"
        
        if not store_context:
            store_context = "Không có thông tin"
        
        # Xây dựng context lịch sử hội thoại (tối đa 6 tin nhắn gần nhất)
        history_context = ""
        if chat_history:
            recent_history = chat_history[-6:]  # Giữ 6 tin nhắn cuối
            for msg in recent_history:
                role = "Khách" if msg.get('role') == 'user' else "Trợ lý"
                content = msg.get('content', '')[:200]  # Cắt ngắn tin nhắn dài
                history_context += f"{role}: {content}\n"
        else:
            history_context = "(Đây là tin nhắn đầu tiên)"
        
        # Xây dựng prompt và gọi Gemini
        prompt = CHATBOT_PROMPT.format(
            product_context=product_context,
            promotion_context=promotion_context,
            store_context=store_context,
            chat_history=history_context,
            query=query
        )
        
        print(f"[CHAT] Đang gọi Gemini với prompt dài: {len(prompt)} ký tự")
        print(f"[CHAT] Preview context sản phẩm: {product_context[:200]}...")
        
        response = _call_gemini_with_fallback(prompt)
        print(f"[CHAT] Gemini response: {response[:100] if response else 'None/Empty'}")
        
        if response:
            # Parse ID sản phẩm từ response
            mentioned_ids = []
            clean_response = response
            suggest_cskh = False
            
            import re
            
            # Kiểm tra tag gợi ý CSKH
            if '[SUGGEST_CSKH]' in response:
                suggest_cskh = True
                clean_response = clean_response.replace('[SUGGEST_CSKH]', '').strip()
            
            # Thử nhiều pattern để bắt tag [PRODUCTS: ...]
            patterns = [
                r'\[PRODUCTS:\s*([\d,\s]*)\]',
                r'\[PRODUCTS:([\d,\s]*)\]',
                r'PRODUCTS:\s*([\d,\s]+)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, response, re.IGNORECASE)
                if match:
                    ids_str = match.group(1).strip()
                    if ids_str:
                        mentioned_ids = [int(x.strip()) for x in ids_str.split(',') if x.strip().isdigit()]
                    break
            
            # Xóa tag [PRODUCTS: ...] khỏi response (tất cả biến thể)
            clean_response = re.sub(r'\s*\[?PRODUCTS:\s*[\d,\s]*\]?\s*', '', clean_response, flags=re.IGNORECASE).strip()
            
            # Lọc sản phẩm CHỈ những cái được đề cập trong response
            filtered_products = []
            if mentioned_ids:
                # Tạo dict để tra cứu nhanh - bao gồm cả sản phẩm thường và khuyến mãi
                products_dict = {p['id']: p for p in products}
                # Thêm sản phẩm khuyến mãi vào dict
                for p in promotional_products:
                    if p['id'] not in products_dict:
                        products_dict[p['id']] = p
                
                # Giữ thứ tự của mentioned_ids
                for pid in mentioned_ids:
                    if pid in products_dict:
                        filtered_products.append(products_dict[pid])
            
            print(f"[CHAT] Response kết thúc với: ...{response[-100:] if len(response) > 100 else response}")
            print(f"[CHAT] ID được đề cập: {mentioned_ids}, Sản phẩm đã lọc: {len(filtered_products)}, Suggest CSKH: {suggest_cskh}")
            
            return jsonify({
                'response': clean_response,
                'products': filtered_products,
                'suggest_cskh': suggest_cskh,
                'source': 'gemini'
            })
        else:
            # Gemini thất bại - cung cấp phản hồi dự phòng hữu ích
            fallback_response = "Xin lỗi, hệ thống AI đang bận. Tôi có thể giúp bạn:\n"
            
            # Gợi ý sản phẩm dựa trên query
            if products:
                fallback_response += f"\n📦 Sản phẩm liên quan:\n"
                for p in products[:3]:
                    fallback_response += f"• {p['ten_san_pham']}: {p['gia_ban']:,.0f}đ\n"
            
            if promotional_products:
                fallback_response += f"\n🎉 Sản phẩm đang khuyến mãi:\n"
                for p in promotional_products[:2]:
                    fallback_response += f"• {p['ten_san_pham']}: {p['gia_khuyen_mai']:,.0f}đ (giảm {p['discount_text']})\n"
            
            fallback_response += "\nVui lòng thử lại sau hoặc liên hệ hotline 1900 1234."
            
            return jsonify({
                'response': fallback_response,
                'products': products[:3] if products else [],
                'suggest_cskh': False,
                'source': 'fallback'
            })
            
    except Exception as e:
        print(f"[CHAT] Lỗi: {e}")
        return jsonify({
            'response': 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
            'error': str(e)
        }), 500


# ============================================================================
# PHẦN 8: API CẬP NHẬT EMBEDDINGS (ADMIN)
# ============================================================================

@chatbot_bp.route('/update-embeddings', methods=['POST'])
@jwt_required()
def update_embeddings():
    """
    Cập nhật embeddings cho tất cả sản phẩm và thông tin cửa hàng
    Chỉ admin mới có quyền thực hiện
    Chạy khi: thêm sản phẩm mới, cập nhật thông tin cửa hàng
    """
    from models import User
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        updated_products = 0
        updated_store_info = 0
        
        # Cập nhật embedding cho sản phẩm
        products = Product.query.all()
        for product in products:
            text = f"{product.ten_san_pham} {product.loai} {product.mo_ta or ''} {product.chat_lieu or ''} {product.gioi_tinh}"
            embedding = get_embedding(text)
            product.embedding = embedding
            updated_products += 1
        
        # Cập nhật embedding cho thông tin cửa hàng
        store_infos = StoreInfo.query.all()
        for info in store_infos:
            text = f"{info.title} {info.content}"
            embedding = get_embedding(text)
            info.content_embedding = embedding
            updated_store_info += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'updated_products': updated_products,
            'updated_store_info': updated_store_info
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
