from flask import Blueprint, request, jsonify
import hmac
import hashlib
import json
import requests
from datetime import datetime
from models import db, Order, OrderDetail
from config import Config

momo_bp = Blueprint('momo', __name__)

# MoMo Configuration - Sandbox Environment
MOMO_CONFIG = {
    'partnerCode': 'MOMOBKUN20180529',
    'accessKey': 'klm05TvNBzhg7h7j',
    'secretKey': 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa',
    'endpoint': 'https://test-payment.momo.vn',
    'redirectUrl': 'http://localhost:5173/checkout/momo-return',
    'ipnUrl': 'http://localhost:5000/api/momo/ipn'
}

def create_signature(data, secret_key):
    """
    Tạo chữ ký điện tử HMAC SHA256
    """
    message = '&'.join([f"{k}={v}" for k, v in sorted(data.items())])
    signature = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

@momo_bp.route('/create-payment', methods=['POST'])
def create_payment():
    """
    Tạo yêu cầu thanh toán MoMo
    """
    try:
        data = request.json
        
        # Lấy thông tin từ request
        original_order_id = data.get('orderId')
        amount = int(data.get('amount', 0))
        order_info = data.get('orderInfo', 'Thanh toán đơn hàng')
        payment_type = data.get('paymentType', 'captureWallet')  # captureWallet hoặc payWithATM
        
        # Tạo orderId và requestId duy nhất với timestamp để tránh trùng
        timestamp = int(datetime.now().timestamp() * 1000)
        order_id = f"ORD{original_order_id}_{timestamp}"
        request_id = f"MM{timestamp}"
        
        # Chuẩn bị dữ liệu để tạo signature
        raw_data = {
            'accessKey': MOMO_CONFIG['accessKey'],
            'amount': str(amount),
            'extraData': '',
            'ipnUrl': MOMO_CONFIG['ipnUrl'],
            'orderId': order_id,
            'orderInfo': order_info,
            'partnerCode': MOMO_CONFIG['partnerCode'],
            'redirectUrl': MOMO_CONFIG['redirectUrl'],
            'requestId': request_id,
            'requestType': payment_type
        }
        
        # Tạo signature
        signature = create_signature(raw_data, MOMO_CONFIG['secretKey'])
        
        # Chuẩn bị request body
        request_body = {
            'partnerCode': MOMO_CONFIG['partnerCode'],
            'accessKey': MOMO_CONFIG['accessKey'],
            'requestId': request_id,
            'amount': str(amount),
            'orderId': order_id,
            'orderInfo': order_info,
            'redirectUrl': MOMO_CONFIG['redirectUrl'],
            'ipnUrl': MOMO_CONFIG['ipnUrl'],
            'extraData': '',
            'requestType': payment_type,
            'signature': signature,
            'lang': 'vi'
        }
        
        # Gửi request đến MoMo
        response = requests.post(
            f"{MOMO_CONFIG['endpoint']}/v2/gateway/api/create",
            json=request_body,
            headers={'Content-Type': 'application/json'}
        )
        
        result = response.json()
        
        if result.get('resultCode') == 0:
            return jsonify({
                'success': True,
                'payUrl': result.get('payUrl'),
                'deeplink': result.get('deeplink'),
                'qrCodeUrl': result.get('qrCodeUrl'),
                'orderId': order_id,
                'requestId': request_id,
                'originalOrderId': original_order_id,
                'paymentType': payment_type,
                'message': 'Tạo yêu cầu thanh toán thành công'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result.get('message', 'Không thể tạo yêu cầu thanh toán'),
                'resultCode': result.get('resultCode')
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }), 500

@momo_bp.route('/ipn', methods=['POST'])
def ipn_handler():
    """
    IPN (Instant Payment Notification) - Nhận thông báo từ MoMo
    """
    try:
        data = request.json
        
        # Lấy thông tin từ IPN
        partner_code = data.get('partnerCode')
        order_id = data.get('orderId')
        request_id = data.get('requestId')
        amount = data.get('amount')
        order_info = data.get('orderInfo')
        order_type = data.get('orderType')
        trans_id = data.get('transId')
        result_code = data.get('resultCode')
        message = data.get('message')
        pay_type = data.get('payType')
        response_time = data.get('responseTime')
        extra_data = data.get('extraData')
        signature = data.get('signature')
        
        # Xác thực signature
        raw_data = {
            'accessKey': MOMO_CONFIG['accessKey'],
            'amount': str(amount),
            'extraData': extra_data or '',
            'message': message,
            'orderId': order_id,
            'orderInfo': order_info,
            'orderType': order_type,
            'partnerCode': partner_code,
            'payType': pay_type,
            'requestId': request_id,
            'responseTime': str(response_time),
            'resultCode': str(result_code),
            'transId': str(trans_id)
        }
        
        expected_signature = create_signature(raw_data, MOMO_CONFIG['secretKey'])
        
        if signature != expected_signature:
            return jsonify({
                'success': False,
                'message': 'Chữ ký không hợp lệ'
            }), 400
        
        # Cập nhật trạng thái đơn hàng
        if result_code == 0:
            # Thanh toán thành công
            # Extract original order ID from orderId (format: ORD{id}_{timestamp})
            try:
                original_order_id = order_id.split('_')[0].replace('ORD', '')
                order = Order.query.filter_by(id=int(original_order_id)).first()
                if order:
                    order.trangthai = 'cho_xac_nhan'
                    order.payment_token = str(trans_id)
                    db.session.commit()
                    
                    return jsonify({
                        'success': True,
                        'message': 'Cập nhật đơn hàng thành công'
                    }), 200
            except Exception as e:
                print(f"Error updating order: {e}")
                # Still return success to MoMo even if order update fails
                return jsonify({
                    'success': True,
                    'message': 'Đã nhận IPN'
                }), 200
        
        return jsonify({
            'success': True,
            'message': 'Đã nhận IPN'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }), 500

@momo_bp.route('/check-status', methods=['POST'])
def check_status():
    """
    Kiểm tra trạng thái giao dịch MoMo
    """
    try:
        data = request.json
        order_id = data.get('orderId')
        request_id = data.get('requestId')
        
        # Chuẩn bị dữ liệu để tạo signature
        raw_data = {
            'accessKey': MOMO_CONFIG['accessKey'],
            'orderId': order_id,
            'partnerCode': MOMO_CONFIG['partnerCode'],
            'requestId': request_id
        }
        
        # Tạo signature
        signature = create_signature(raw_data, MOMO_CONFIG['secretKey'])
        
        # Chuẩn bị request body
        request_body = {
            'partnerCode': MOMO_CONFIG['partnerCode'],
            'accessKey': MOMO_CONFIG['accessKey'],
            'requestId': request_id,
            'orderId': order_id,
            'signature': signature,
            'lang': 'vi'
        }
        
        # Gửi request đến MoMo
        response = requests.post(
            f"{MOMO_CONFIG['endpoint']}/v2/gateway/api/query",
            json=request_body,
            headers={'Content-Type': 'application/json'}
        )
        
        result = response.json()
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }), 500

@momo_bp.route('/refund', methods=['POST'])
def refund():
    """
    Hoàn tiền giao dịch MoMo
    """
    try:
        data = request.json
        
        order_id = data.get('orderId')
        trans_id = data.get('transId')
        amount = int(data.get('amount', 0))
        description = data.get('description', 'Hoàn tiền')
        
        # Tạo requestId duy nhất
        request_id = f"RF{int(datetime.now().timestamp() * 1000)}"
        
        # Chuẩn bị dữ liệu để tạo signature
        raw_data = {
            'accessKey': MOMO_CONFIG['accessKey'],
            'amount': str(amount),
            'description': description,
            'orderId': order_id,
            'partnerCode': MOMO_CONFIG['partnerCode'],
            'requestId': request_id,
            'transId': str(trans_id)
        }
        
        # Tạo signature
        signature = create_signature(raw_data, MOMO_CONFIG['secretKey'])
        
        # Chuẩn bị request body
        request_body = {
            'partnerCode': MOMO_CONFIG['partnerCode'],
            'accessKey': MOMO_CONFIG['accessKey'],
            'requestId': request_id,
            'amount': str(amount),
            'orderId': order_id,
            'transId': str(trans_id),
            'description': description,
            'signature': signature,
            'lang': 'vi'
        }
        
        # Gửi request đến MoMo
        response = requests.post(
            f"{MOMO_CONFIG['endpoint']}/v2/gateway/api/refund",
            json=request_body,
            headers={'Content-Type': 'application/json'}
        )
        
        result = response.json()
        
        if result.get('resultCode') == 0:
            return jsonify({
                'success': True,
                'message': 'Hoàn tiền thành công',
                'data': result
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result.get('message', 'Không thể hoàn tiền'),
                'resultCode': result.get('resultCode')
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }), 500

@momo_bp.route('/update-order-status', methods=['POST'])
def update_order_status():
    """
    Cập nhật trạng thái đơn hàng sau khi thanh toán
    (Dùng khi IPN không được gọi do localhost)
    """
    try:
        data = request.json
        order_id = data.get('orderId')
        original_order_id = data.get('originalOrderId')
        trans_id = data.get('transId')
        result_code = data.get('resultCode', 0)
        
        print(f"Updating order status: orderId={order_id}, originalOrderId={original_order_id}, transId={trans_id}, resultCode={result_code}")
        
        try:
            order = Order.query.filter_by(id=int(original_order_id)).first()
            if not order:
                print(f"Order {original_order_id} not found")
                return jsonify({
                    'success': False,
                    'message': 'Không tìm thấy đơn hàng'
                }), 404
            
            if result_code == 0:
                # Thanh toán thành công - Đặt thành "Hoàn thành" cho thanh toán online
                order.trangthai = 'hoan_thanh'
                order.payment_token = str(trans_id)
                db.session.commit()
                
                print(f"Order {original_order_id} updated to 'hoan_thanh' successfully")
                
                return jsonify({
                    'success': True,
                    'message': 'Cập nhật đơn hàng thành công',
                    'status': 'hoan_thanh'
                }), 200
            else:
                # Thanh toán thất bại hoặc bị hủy
                order.trangthai = 'huy'
                order.payment_token = f"FAILED_{result_code}"
                db.session.commit()
                
                print(f"Order {original_order_id} updated to 'huy' (resultCode={result_code})")
                
                return jsonify({
                    'success': True,
                    'message': 'Đơn hàng đã bị hủy do thanh toán thất bại',
                    'status': 'huy',
                    'resultCode': result_code
                }), 200
                
        except Exception as e:
            print(f"Error updating order: {e}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Lỗi cập nhật đơn hàng: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"Error in update_order_status: {e}")
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }), 500
