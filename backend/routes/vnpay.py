# ==================== TÍCH HỢP THANH TOÁN VNPAY ====================
# File: routes/vnpay.py - Xử lý thanh toán qua cổng VNPay
from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, urlencode, quote_plus
import os
import hmac
import hashlib

# Múi giờ Việt Nam (UTC+7)
VN_TZ = timezone(timedelta(hours=7))

vnpay_bp = Blueprint("vnpay", __name__)


# ==================== LỚP HỖ TRỢ VNPAY ====================
# Dựa trên mã demo chính thức của VNPay
class VNPayHelper:
    @staticmethod
    def hmac_sha512(key: str, data: str) -> str:
        """Tạo hash HMAC SHA512"""
        byteKey = key.encode('utf-8')
        byteData = data.encode('utf-8')
        return hmac.new(byteKey, byteData, hashlib.sha512).hexdigest()
    
    @staticmethod
    def build_payment_url(params: dict, secret_key: str, payment_url: str) -> str:
        """
        Xây dựng URL thanh toán VNPay với hash bảo mật
        Dựa trên mã demo chính thức của VNPay
        """
        # Sắp xếp các tham số theo thứ tự bảng chữ cái
        sorted_params = sorted(params.items())
        
        # Xây dựng chuỗi truy vấn để tính hash (mã hóa URL)
        # VNPay yêu cầu hash được tính từ chuỗi truy vấn được mã hóa URL
        query_parts = []
        for key, val in sorted_params:
            if val is not None and str(val) != "":
                # Sử dụng quote_plus để mã hóa URL đúng cách (khoảng trắng thành +)
                encoded_val = quote_plus(str(val))
                query_parts.append(f"{key}={encoded_val}")
        
        hash_data = "&".join(query_parts)
        
        # Tính hash bảo mật
        secure_hash = VNPayHelper.hmac_sha512(secret_key, hash_data)
        
        # Xây dựng URL cuối cùng
        final_url = f"{payment_url}?{hash_data}&vnp_SecureHash={secure_hash}"
        
        return final_url, hash_data, secure_hash
    
    @staticmethod
    def verify_checksum(params: dict, secret_key: str) -> bool:
        """Xác thực checksum phản hồi từ VNPay"""
        vnp_secure_hash = params.get("vnp_SecureHash", "")
        
        # Loại bỏ các trường hash khỏi tham số
        input_data = {k: v for k, v in params.items() 
                      if k not in ("vnp_SecureHash", "vnp_SecureHashType") and v}
        
        # Sắp xếp và xây dựng dữ liệu hash
        sorted_params = sorted(input_data.items())
        query_parts = []
        for key, val in sorted_params:
            if val is not None and str(val) != "":
                encoded_val = quote_plus(str(val))
                query_parts.append(f"{key}={encoded_val}")
        
        hash_data = "&".join(query_parts)
        calc_hash = VNPayHelper.hmac_sha512(secret_key, hash_data)
        
        return calc_hash.upper() == vnp_secure_hash.upper()


# ==================== CẤU HÌNH MÔI TRƯỜNG ====================
def get_vnpay_config():
    """Lấy cấu hình VNPay từ biến môi trường"""
    return {
        "PUBLIC_BASE_URL": os.getenv("PUBLIC_BASE_URL", "").rstrip("/"),
        "VNPAY_RETURN_URL": os.getenv("VNPAY_RETURN_URL", "").strip(),
        "VNPAY_TMN_CODE": os.getenv("VNPAY_TMN_CODE", "").strip(),
        "VNPAY_HASH_SECRET": os.getenv("VNPAY_HASH_SECRET", "").strip(),
        "VNPAY_PAYMENT_URL": os.getenv("VNPAY_PAYMENT_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html").strip(),
        "VNPAY_VERSION": os.getenv("VNPAY_VERSION", "2.1.0"),
        "FRONTEND_URL": os.getenv("FRONTEND_URL", "http://localhost:5173").strip(),
    }


# ==================== HỖ TRỢ URL ====================
def _public_base_url():
    """Lấy URL cơ sở công khai"""
    cfg = get_vnpay_config()
    if cfg["PUBLIC_BASE_URL"]:
        return cfg["PUBLIC_BASE_URL"]
    
    if cfg["VNPAY_RETURN_URL"]:
        try:
            p = urlparse(cfg["VNPAY_RETURN_URL"])
            if p.scheme and p.netloc:
                return f"{p.scheme}://{p.netloc}".rstrip("/")
        except Exception:
            pass
    
    scheme = request.headers.get("X-Forwarded-Proto", request.scheme)
    host = request.headers.get("X-Forwarded-Host", request.host)
    return f"{scheme}://{host}".rstrip("/")


def get_vnpay_return_url():
    """Trả về return_url hợp lệ"""
    cfg = get_vnpay_config()
    if cfg["VNPAY_RETURN_URL"]:
        return cfg["VNPAY_RETURN_URL"]
    base = _public_base_url()
    return f"{base}/api/vnpay/return"


# ==================== XÂY DỰNG URL THANH TOÁN ====================
def build_vnpay_payment_url(amount_vnd, order_id: str, order_info: str, ip_addr: str, return_url: str):
    """
    Xây dựng URL thanh toán VNPay
    amount_vnd: số tiền VND (ví dụ 1000000.00). Gửi cho VNPAY phải *100
    """
    cfg = get_vnpay_config()
    
    try:
        vnp_amount = int(round(float(amount_vnd) * 100))
    except Exception:
        vnp_amount = 0
    
    params = {
        "vnp_Version": cfg["VNPAY_VERSION"],
        "vnp_Command": "pay",
        "vnp_TmnCode": cfg["VNPAY_TMN_CODE"],
        "vnp_Amount": vnp_amount,
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": f"{order_id}_{datetime.now(VN_TZ).strftime('%H%M%S')}",
        "vnp_OrderInfo": order_info,
        "vnp_OrderType": "other",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": return_url,
        "vnp_IpAddr": ip_addr or "127.0.0.1",
        "vnp_CreateDate": datetime.now(VN_TZ).strftime("%Y%m%d%H%M%S"),
        "vnp_ExpireDate": (datetime.now(VN_TZ) + timedelta(minutes=15)).strftime("%Y%m%d%H%M%S"),
    }
    
    # Xây dựng URL thanh toán sử dụng VNPay helper
    final_url, hash_data, secure_hash = VNPayHelper.build_payment_url(
        params, 
        cfg["VNPAY_HASH_SECRET"], 
        cfg["VNPAY_PAYMENT_URL"]
    )
    
    # Ghi log debug
    print(f"[VNPAY] Mã TMN: {cfg['VNPAY_TMN_CODE']}", flush=True)
    print(f"[VNPAY] Dữ liệu hash: {hash_data}", flush=True)
    print(f"[VNPAY] SecureHash: {secure_hash}", flush=True)
    print(f"[VNPAY] URL thanh toán: {final_url}", flush=True)
    
    return final_url


# ==================== XÁC THỰC CHECKSUM ====================
def verify_vnp_checksum(params: dict) -> bool:
    """Xác thực checksum phản hồi từ VNPay"""
    cfg = get_vnpay_config()
    result = VNPayHelper.verify_checksum(params, cfg["VNPAY_HASH_SECRET"])
    print(f"[VNPAY-VERIFY] Checksum hợp lệ: {result}", flush=True)
    return result


# ==================== API: TẠO THANH TOÁN VNPAY ====================
@vnpay_bp.route('/create-payment/<int:order_id>', methods=['OPTIONS'])
def create_vnpay_payment_options(order_id):
    """Xử lý CORS preflight"""
    return '', 200


@vnpay_bp.route('/create-payment/<int:order_id>', methods=['POST'])
@jwt_required()
def create_vnpay_payment(order_id):
    """Tạo URL thanh toán VNPay cho đơn hàng đã tồn tại"""
    user_id = int(get_jwt_identity())
    cfg = get_vnpay_config()
    
    # Kiểm tra cấu hình VNPay
    if not cfg["VNPAY_TMN_CODE"] or not cfg["VNPAY_HASH_SECRET"]:
        return jsonify({"error": "VNPay chưa được cấu hình"}), 500
    
    # Lấy đơn hàng
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Không tìm thấy đơn hàng"}), 404
    
    if order.user_id != user_id:
        return jsonify({"error": "Không có quyền truy cập đơn hàng này"}), 403
    
    # Chỉ cho phép thanh toán đơn hàng chưa thanh toán (cho_xac_nhan)
    if order.trangthai != 'cho_xac_nhan':
        return jsonify({"error": "Đơn hàng không thể thanh toán"}), 400
    
    # Lấy IP client
    ip_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip_addr:
        ip_addr = ip_addr.split(',')[0].strip()
    
    return_url = get_vnpay_return_url()
    order_info = f"Thanh toan don hang {order.id}"
    
    payment_url = build_vnpay_payment_url(
        amount_vnd=float(order.tongtien),
        order_id=str(order.id),
        order_info=order_info,
        ip_addr=ip_addr,
        return_url=return_url
    )
    
    # Cập nhật phương thức thanh toán (giữ nguyên trangthai = cho_xac_nhan)
    order.payment_method = 'VNPAY'
    db.session.commit()
    
    return jsonify({
        "payment_url": payment_url,
        "order_id": order.id
    }), 200


# ==================== RETURN URL (NGƯỜI DÙNG REDIRECT SAU THANH TOÁN) ====================
@vnpay_bp.route('/return', methods=['GET'])
def vnpay_return():
    """Xử lý khi người dùng quay lại từ trang thanh toán VNPay"""
    cfg = get_vnpay_config()
    params = dict(request.args.items())
    frontend_url = cfg["FRONTEND_URL"]
    
    if not params:
        return redirect(f"{frontend_url}/orders?vnpay=error&message=missing_params")
    
    valid = verify_vnp_checksum(params) if cfg["VNPAY_HASH_SECRET"] else False
    resp_code = params.get("vnp_ResponseCode")
    trans_status = params.get("vnp_TransactionStatus")
    txn_ref_raw = params.get("vnp_TxnRef")
    txn_ref = txn_ref_raw.split('_')[0] if txn_ref_raw else None
    txn_no = params.get("vnp_TransactionNo")
    
    success = valid and resp_code == "00" and trans_status == "00"
    
    # Cập nhật đơn hàng
    if txn_ref:
        try:
            order_id = int(txn_ref)
            order = Order.query.get(order_id)
            
            if order:
                if success and order.trangthai != "hoan_thanh":
                    # Thanh toán online thành công - Đặt thành "Hoàn thành"
                    order.trangthai = "hoan_thanh"
                    order.payment_token = f"VNPAY_TXN:{txn_no or 'n/a'}"
                    db.session.commit()
                    print(f"[VNPAY-RETURN] ✅ Đã cập nhật đơn hàng #{txn_ref} thành 'hoan_thanh'")
                elif not success:
                    # Thanh toán thất bại hoặc bị hủy
                    order.trangthai = "huy"
                    order.payment_token = f"VNPAY_FAIL:{resp_code}"
                    db.session.commit()
                    print(f"[VNPAY-RETURN] ❌ Đơn hàng #{txn_ref} thanh toán thất bại")
        except Exception as e:
            print(f"[VNPAY-RETURN] ❌ Lỗi cập nhật đơn hàng: {e}")
    
    # Redirect về frontend
    if success:
        return redirect(f"{frontend_url}/orders?vnpay=success&order_id={txn_ref}")
    else:
        return redirect(f"{frontend_url}/orders?vnpay=failed&order_id={txn_ref}&code={resp_code}")


# ==================== IPN URL (CALLBACK TỪ SERVER VNPAY) ====================
@vnpay_bp.route('/ipn', methods=['GET'])
def vnpay_ipn():
    """Xử lý callback từ server VNPay (server-to-server)"""
    cfg = get_vnpay_config()
    params = dict(request.args.items())
    
    if not params:
        return jsonify({"RspCode": "99", "Message": "Yêu cầu không hợp lệ"})
    
    if not cfg["VNPAY_HASH_SECRET"]:
        return jsonify({"RspCode": "99", "Message": "Server chưa được cấu hình"})
    
    if not verify_vnp_checksum(params):
        return jsonify({"RspCode": "97", "Message": "Chữ ký không hợp lệ"})
    
    vnp_txnref = params.get("vnp_TxnRef")
    vnp_amount_raw = params.get("vnp_Amount")
    vnp_resp_code = params.get("vnp_ResponseCode")
    vnp_trans_status = params.get("vnp_TransactionStatus")
    vnp_trans_no = params.get("vnp_TransactionNo")
    
    try:
        # Định dạng TxnRef: order_id_HHMMSS
        order_id = int(vnp_txnref.split('_')[0])
    except:
        return jsonify({"RspCode": "01", "Message": "Không tìm thấy đơn hàng"})
    
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"RspCode": "01", "Message": "Không tìm thấy đơn hàng"})
    
    try:
        vnp_amount = int(vnp_amount_raw)
    except:
        return jsonify({"RspCode": "04", "Message": "Số tiền không hợp lệ"})
    
    expected = int(round(float(order.tongtien) * 100))
    if vnp_amount != expected:
        return jsonify({"RspCode": "04", "Message": "Số tiền không hợp lệ"})
    
    if order.trangthai == "hoan_thanh":
        return jsonify({"RspCode": "02", "Message": "Đơn hàng đã được cập nhật"})
    
    if vnp_resp_code == "00" and vnp_trans_status == "00":
        # Thanh toán online thành công - Đặt thành "Hoàn thành"
        order.trangthai = "hoan_thanh"
        order.payment_token = f"VNPAY_TXN:{vnp_trans_no}"
        db.session.commit()
        print(f"[VNPAY-IPN] ✅ Đã cập nhật đơn hàng #{order_id} thành 'hoan_thanh'")
        return jsonify({"RspCode": "00", "Message": "Xác nhận thành công"})
    else:
        # Thanh toán thất bại hoặc bị hủy
        order.trangthai = "huy"
        order.payment_token = f"VNPAY_FAIL:{vnp_resp_code}"
        db.session.commit()
        print(f"[VNPAY-IPN] ❌ Đơn hàng #{order_id} thanh toán thất bại")
        return jsonify({"RspCode": "00", "Message": "Xác nhận thành công"})


# ==================== API: KIỂM TRA TRẠNG THÁI CẤU HÌNH VNPAY ====================
@vnpay_bp.route('/config-status', methods=['GET'])
def vnpay_config_status():
    """Kiểm tra VNPay đã được cấu hình chưa"""
    cfg = get_vnpay_config()
    is_configured = bool(cfg["VNPAY_TMN_CODE"] and cfg["VNPAY_HASH_SECRET"])
    return jsonify({
        "configured": is_configured,
        "sandbox": "sandbox" in cfg["VNPAY_PAYMENT_URL"].lower()
    }), 200
