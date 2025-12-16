from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Product, StoreInfo
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPICallError
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

# ============ Prompt Template ============
CHATBOT_PROMPT = """Bạn là trợ lý AI của cửa hàng thời trang Fashion Store. Nhiệm vụ của bạn là tư vấn sản phẩm, trả lời câu hỏi về cửa hàng.

**THÔNG TIN SẢN PHẨM CÓ SẴN:**
{product_context}

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
3. Nếu hỏi về cửa hàng/chính sách → trích dẫn thông tin liên quan
4. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn
5. KHÔNG bịa đặt thông tin không có trong dữ liệu
6. SỬ DỤNG LỊCH SỬ HỘI THOẠI để hiểu ngữ cảnh và trả lời phù hợp

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
            'response': 'Xin chào! 👋 Tôi là trợ lý AI của Fashion Store. Tôi có thể giúp bạn:\n• Tìm kiếm sản phẩm (áo, quần, váy, đầm...)\n• Thông tin cửa hàng, chính sách đổi trả, vận chuyển\n• Hướng dẫn chọn size\n\nBạn cần hỗ trợ gì ạ?',
            'products': [],
            'source': 'greeting'
        })
    
    try:
        products = []
        store_infos = []
        
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
        
        # Build context
        product_context = ""
        if products:
            for p in products[:10]:
                product_context += f"- [ID:{p['id']}] {p['ten_san_pham']}: {p['gia_ban']:,.0f}đ, Loại: {p['loai']}, Size: {p.get('size', 'N/A')}, Chất liệu: {p.get('chat_lieu', 'N/A')}\n"
            print(f"[CHAT] Product context built with {len(products)} products")
        else:
            product_context = "Không có sản phẩm"
            print("[CHAT] No products found!")
        
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
            if mentioned_ids and products:
                # Create a dict for quick lookup
                products_dict = {p['id']: p for p in products}
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
