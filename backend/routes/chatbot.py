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

# Initialize SentenceTransformer model (local, free)
embedding_model = None

def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return embedding_model

# ============ Gemini Config ============
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyA2jCbDXWuKM56pD17SlBvx4Ni3AGT8WDA')

GENERATION_CONFIG = {
    "temperature": 0.6,
    "top_p": 0.9,
    "top_k": 40,
    "max_output_tokens": 1024,
}

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

_GEMINI = {"ready": False, "primary": None, "fallback": None}

def _ensure_gemini():
    """Initialize Gemini with auto fallback."""
    if _GEMINI["ready"]:
        return
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Preferred models in order (including Gemma as fallback)
    preferred = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash-exp",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemma-3-27b-it",  # Gemma fallback - different quota
        "gemma-3-12b-it",
        "gemma-3-4b-it",
    ]
    
    # Get supported models
    supported_names = set()
    try:
        models = list(genai.list_models())
        for m in models:
            methods = set(getattr(m, "supported_generation_methods", []) or [])
            if "generateContent" in methods:
                supported_names.add(m.name)
                if m.name.startswith("models/"):
                    supported_names.add(m.name.split("models/", 1)[1])
    except Exception:
        supported_names.update(preferred)
    
    def pick_first_available(cands):
        for name in cands:
            if name in supported_names or f"models/{name}" in supported_names:
                return f"models/{name}" if not name.startswith("models/") else name
        return None
    
    primary_name = pick_first_available(preferred)
    if not primary_name:
        raise RuntimeError("No supported Gemini model found")
    
    fallback_name = pick_first_available([m for m in preferred if f"models/{m}" != primary_name])
    
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
    print(f"[GEMINI] Primary: {primary_name}, Fallback: {fallback_name}")

def _gemini_text_and_reason(resp):
    try:
        txt = getattr(resp, "text", "") or ""
        reason = ""
        pf = getattr(resp, "prompt_feedback", None)
        if pf and getattr(pf, "block_reason", None):
            reason = f"blocked: {pf.block_reason}"
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
    """Call Gemini with automatic fallback through all available models."""
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Try models in order until one works
    models_to_try = [
        "gemini-2.0-flash",
        "gemini-2.5-flash", 
        "gemma-3-27b-it",
        "gemma-3-12b-it",
        "gemma-3-4b-it",
    ]
    
    for model_name in models_to_try:
        try:
            print(f"[GEMINI] Trying model: {model_name}")
            model = genai.GenerativeModel(
                model_name,
                generation_config=GENERATION_CONFIG,
                safety_settings=SAFETY_SETTINGS
            )
            response = model.generate_content(prompt)
            text, reason = _gemini_text_and_reason(response)
            if text:
                print(f"[GEMINI] Success with {model_name}")
                return text
            else:
                print(f"[GEMINI] {model_name} returned empty: {reason}")
        except ResourceExhausted:
            print(f"[GEMINI] {model_name} quota exhausted, trying next...")
            continue
        except GoogleAPICallError as e:
            print(f"[GEMINI] {model_name} API error: {str(e)[:50]}, trying next...")
            continue
        except Exception as e:
            print(f"[GEMINI] {model_name} error: {str(e)[:50]}, trying next...")
            continue
    
    print("[GEMINI] All models failed")
    return ""

def get_embedding(text):
    """Generate embedding using local SentenceTransformer"""
    model = get_embedding_model()
    embedding = model.encode(text)
    return embedding.tolist()

def search_products(query_embedding, top_k=5):
    """Search products using pgvector similarity"""
    try:
        embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
        
        # Use string formatting for ::vector cast (SQLAlchemy doesn't handle it well with params)
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
        print(f"Error searching products: {e}")
        return []

def search_store_info(query_embedding, top_k=3):
    """Search store info using pgvector similarity"""
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
        print(f"Error searching store info: {e}")
        return []

def get_all_products_simple():
    """Get all products without embeddings for fallback"""
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
        print(f"Error getting products: {e}")
        return []

def get_all_store_info_simple():
    """Get all store info without embeddings for fallback"""
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
        print(f"Error getting store info: {e}")
        return []


def get_promotional_products():
    """Get all products currently on promotion"""
    try:
        now = datetime.utcnow()
        
        # Query products with active promotions
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
            
            # Calculate promotional price
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
        print(f"Error getting promotional products: {e}")
        return []


def get_product_promotion_info(product_id):
    """Get promotion info for a specific product"""
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
        print(f"Error getting product promotion: {e}")
        return None


def get_products_by_price(order='desc', limit=5, category=None):
    """Get products sorted by price (highest or lowest)"""
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
        print(f"Error getting products by price: {e}")
        return []


def detect_price_query(query):
    """Detect if query is asking about highest/lowest price products"""
    ql = query.lower()
    
    # Detect highest price
    highest_keywords = ['đắt nhất', 'cao nhất', 'giá cao nhất', 'mắc nhất', 'đắt tiền nhất', 'giá đắt', 'cao giá']
    for kw in highest_keywords:
        if kw in ql:
            return 'highest'
    
    # Detect lowest price
    lowest_keywords = ['rẻ nhất', 'thấp nhất', 'giá thấp nhất', 'giá rẻ nhất', 'rẻ tiền nhất', 'giá rẻ', 'thấp giá']
    for kw in lowest_keywords:
        if kw in ql:
            return 'lowest'
    
    return None


def detect_category_in_query(query):
    """Detect product category mentioned in query"""
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

# ============ Prompt Template ============
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
5. Nếu hỏi về cửa hàng/chính sách → trích dẫn thông tin liên quan
6. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn
7. KHÔNG bịa đặt thông tin không có trong dữ liệu
8. SỬ DỤNG LỊCH SỬ HỘI THOẠI để hiểu ngữ cảnh và trả lời phù hợp

**BẮT BUỘC:** Ở DÒNG CUỐI CÙNG của câu trả lời, PHẢI ghi CHÍNH XÁC theo format:
[PRODUCTS: id1,id2] - chỉ ghi ID của sản phẩm bạn ĐÃ ĐỀ CẬP trong câu trả lời
[PRODUCTS: ] - nếu không đề cập sản phẩm nào

Ví dụ: Nếu bạn giới thiệu sản phẩm ID:5 và ID:8 thì ghi: [PRODUCTS: 5,8]"""


@chatbot_bp.route('/ask', methods=['POST'])
def ask_chatbot():
    """Main chatbot endpoint"""
    data = request.get_json()
    query = (data.get('query') or '').strip()
    chat_history = data.get('history', [])  # Get chat history from request
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    # Quick greeting response (only if no history)
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
        
        # Check if query is about promotions/sales
        promo_keywords = ['khuyến mãi', 'giảm giá', 'sale', 'ưu đãi', 'khuyến mại', 'giảm', 'tiết kiệm', 'deal', 'hot']
        is_promo_query = any(kw in ql for kw in promo_keywords)
        
        # Check if query is about price (highest/lowest)
        price_query_type = detect_price_query(query)
        category_in_query = detect_category_in_query(query)
        
        if price_query_type:
            order = 'desc' if price_query_type == 'highest' else 'asc'
            price_sorted_products = get_products_by_price(order=order, limit=5, category=category_in_query)
            print(f"[CHAT] Price query detected: {price_query_type}, found {len(price_sorted_products)} products")
        
        # Get promotional products
        promotional_products = get_promotional_products()
        print(f"[CHAT] Found {len(promotional_products)} promotional products")
        
        # Try RAG search with embeddings
        try:
            query_embedding = get_embedding(query)
            products = search_products(query_embedding, top_k=10)
            store_infos = search_store_info(query_embedding, top_k=3)
            print(f"[CHAT] RAG search: {len(products)} products, {len(store_infos)} store_infos")
        except Exception as e:
            print(f"[CHAT] RAG search error: {e}")
        
        # Fallback: get data without embeddings
        if not products:
            products = get_all_products_simple()
            print(f"[CHAT] Fallback: {len(products)} products")
        if not store_infos:
            store_infos = get_all_store_info_simple()
            print(f"[CHAT] Fallback: {len(store_infos)} store_infos")
        
        # Add promotion info to regular products
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
        
        # Build context
        product_context = ""
        
        # If price query, prioritize price-sorted products
        if price_sorted_products:
            price_label = "GIÁ CAO NHẤT" if price_query_type == 'highest' else "GIÁ THẤP NHẤT"
            category_label = f" ({category_in_query})" if category_in_query else ""
            product_context += f"**SẢN PHẨM {price_label}{category_label}:**\n"
            for i, p in enumerate(price_sorted_products, 1):
                product_context += f"- [ID:{p['id']}] #{i} {p['ten_san_pham']}: {p['gia_ban']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}\n"
            product_context += "\n**CÁC SẢN PHẨM KHÁC:**\n"
            # Add price_sorted_products to products for later lookup
            for p in price_sorted_products:
                if p not in products:
                    products.append(p)
        
        if products:
            for p in products[:10]:
                if p.get('is_promotional') and p.get('gia_khuyen_mai'):
                    product_context += f"- [ID:{p['id']}] {p['ten_san_pham']}: Giá gốc {p['gia_ban']:,.0f}đ → {p['discount_text']} → Còn {p['gia_khuyen_mai']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}\n"
                else:
                    product_context += f"- [ID:{p['id']}] {p['ten_san_pham']}: {p['gia_ban']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}, Chất liệu: {p.get('chat_lieu', 'N/A')}\n"
            print(f"[CHAT] Product context built with {len(products)} products")
        else:
            product_context = "Không có sản phẩm"
            print("[CHAT] No products found!")
        
        # Build promotion context
        promotion_context = ""
        if promotional_products:
            for p in promotional_products[:5]:
                promotion_context += f"- [ID:{p['id']}] {p['ten_san_pham']}: Giá gốc {p['gia_ban']:,.0f}đ → {p['discount_text']} → Chỉ còn {p['gia_khuyen_mai']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}\n"
            print(f"[CHAT] Promotion context built with {len(promotional_products)} products")
        else:
            promotion_context = "Hiện không có sản phẩm khuyến mãi"
        
        store_context = ""
        if store_infos:
            for info in store_infos[:3]:
                # Không cắt ngắn content để AI có đầy đủ thông tin
                store_context += f"- {info['title']}: {info['content']}\n"
        else:
            store_context = "Không có thông tin"
        
        # Build chat history context (last 6 messages max)
        history_context = ""
        if chat_history:
            recent_history = chat_history[-6:]  # Keep last 6 messages
            for msg in recent_history:
                role = "Khách" if msg.get('role') == 'user' else "Trợ lý"
                content = msg.get('content', '')[:200]  # Truncate long messages
                history_context += f"{role}: {content}\n"
        else:
            history_context = "(Đây là tin nhắn đầu tiên)"
        
        # Build prompt and call Gemini
        prompt = CHATBOT_PROMPT.format(
            product_context=product_context,
            promotion_context=promotion_context,
            store_context=store_context,
            chat_history=history_context,
            query=query
        )
        
        print(f"[CHAT] Calling Gemini with prompt length: {len(prompt)}")
        print(f"[CHAT] Product context preview: {product_context[:200]}...")
        
        response = _call_gemini_with_fallback(prompt)
        print(f"[CHAT] Gemini response length: {len(response) if response else 0}")
        
        if response:
            # Parse product IDs from response
            mentioned_ids = []
            clean_response = response
            
            import re
            # Try multiple patterns to catch the tag
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
            
            # Remove the [PRODUCTS: ...] tag from response (all variations)
            clean_response = re.sub(r'\s*\[?PRODUCTS:\s*[\d,\s]*\]?\s*', '', response, flags=re.IGNORECASE).strip()
            
            # Filter products to ONLY those mentioned in response
            filtered_products = []
            if mentioned_ids:
                # Create a dict for quick lookup - include both regular and promotional products
                products_dict = {p['id']: p for p in products}
                # Also add promotional products to dict
                for p in promotional_products:
                    if p['id'] not in products_dict:
                        products_dict[p['id']] = p
                
                # Keep order of mentioned_ids
                for pid in mentioned_ids:
                    if pid in products_dict:
                        filtered_products.append(products_dict[pid])
            
            print(f"[CHAT] Raw response ends with: ...{response[-100:] if len(response) > 100 else response}")
            print(f"[CHAT] Mentioned IDs: {mentioned_ids}, Filtered products: {len(filtered_products)}")
            
            return jsonify({
                'response': clean_response,
                'products': filtered_products,
                'source': 'gemini'
            })
        else:
            # Gemini failed - return error message (no fallback)
            return jsonify({
                'response': 'Xin lỗi, hệ thống AI đang bận. Vui lòng thử lại sau hoặc liên hệ hotline 1900 1234.',
                'products': [],
                'source': 'error'
            }), 503
            
    except Exception as e:
        print(f"[CHAT] Error: {e}")
        return jsonify({
            'response': 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
            'error': str(e)
        }), 500


@chatbot_bp.route('/update-embeddings', methods=['POST'])
@jwt_required()
def update_embeddings():
    """Update embeddings for all products and store info (admin only)"""
    from models import User
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        updated_products = 0
        updated_store_info = 0
        
        products = Product.query.all()
        for product in products:
            text = f"{product.ten_san_pham} {product.loai} {product.mo_ta or ''} {product.chat_lieu or ''} {product.gioi_tinh}"
            embedding = get_embedding(text)
            product.embedding = embedding
            updated_products += 1
        
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
