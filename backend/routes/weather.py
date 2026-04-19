from flask import Blueprint, request, jsonify
import requests
import os
from models import db, Product
from sqlalchemy.sql.expression import func

weather_bp = Blueprint('weather', __name__)

# ==================== CẤU HÌNH API THỜI TIẾT ====================
# Khóa API OpenWeather được lưu trong biến môi trường .env
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

def get_clothing_advice(temp_c, weather_main):
    """
    ==================== HÀM TƯ VẤN TRANG PHỤC ====================
    Tạo lời khuyên mặc quần áo dựa trên nhiệt độ và điều kiện thời tiết
    Trả về: (danh sách lời khuyên, danh sách loại sản phẩm gợi ý)
    """
    suggestions = []
    # Ánh xạ các loại sản phẩm từ Product.loai: ['Áo', 'Quần', 'Váy', 'Đầm', 'Áo khoác', 'Phụ kiện']
    product_types = []
    
    weather_main = weather_main.lower()
    
    # Kiểm tra mưa/tuyết
    if any(x in weather_main for x in ['rain', 'drizzle', 'thunderstorm', 'snow']):
        suggestions.append("Trời có mưa/tuyết, đừng quên mang ô hoặc áo mưa nhé!")
        product_types.append('Áo khoác')
    
    # Lời khuyên dựa trên nhiệt độ
    if temp_c < 15:
        suggestions.append(f"Trời lạnh ({round(temp_c)}°C), hãy mặc ấm với áo khoác dày.")
        product_types.extend(['Áo khoác', 'Áo'])
    elif temp_c < 22:
        suggestions.append(f"Trời se lạnh ({round(temp_c)}°C), một chiếc áo khoác nhẹ hoặc áo dài tay là lựa chọn tuyệt vời.")
        product_types.extend(['Áo khoác', 'Áo', 'Quần'])
    elif temp_c < 28:
        suggestions.append(f"Thời tiết mát mẻ ({round(temp_c)}°C), rất thoải mái để diện đồ đẹp xuống phố.")
        product_types.extend(['Áo', 'Quần', 'Váy', 'Đầm'])
    else:
        suggestions.append(f"Trời nóng ({round(temp_c)}°C), ưu tiên trang phục mỏng nhẹ, thoáng mát.")
        product_types.extend(['Áo', 'Quần', 'Váy', 'Đầm'])
        
    # Loại bỏ các loại sản phẩm trùng lặp
    return suggestions, list(set(product_types))

@weather_bp.route('/current', methods=['GET', 'OPTIONS'])
def get_current_weather():
    """
    ==================== LẤY THÔNG TIN THỜI TIẾT HIỆN TẠI ====================
    Lấy dữ liệu thời tiết từ OpenWeather API
    Tham số: lat, lon (mặc định: Hà Nội)
    Trả về: Thông tin thời tiết + lời khuyên mặc quần áo + sản phẩm gợi ý
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    # Cho phép truyền lat/lon, mặc định là Hà Nội
    lat = request.args.get('lat', '21.0285') 
    lon = request.args.get('lon', '105.8542')
    
    print(f"[WEATHER] Khóa API có sẵn: {'Có' if OPENWEATHER_API_KEY else 'Không'}")
    if OPENWEATHER_API_KEY:
        print(f"[WEATHER] Tiền tố khóa: {OPENWEATHER_API_KEY[:4]}...")

    if not OPENWEATHER_API_KEY:
        print("[WEATHER] Lỗi: Thiếu OPENWEATHER_API_KEY")
        return jsonify({
            'error': 'Thiếu OPENWEATHER_API_KEY trong biến môi trường server',
            'temp': 25,
            'description': 'chế độ demo (thiếu khóa)',
            'advice': ['Vui lòng cấu hình API Key để xem thời tiết thực tế.'],
            'suggested_products': []
        }), 500

    params = {
        'lat': lat,
        'lon': lon,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric',
        'lang': 'vi'
    }
    
    try:
        response = requests.get(BASE_URL, params=params)
        
        if response.status_code != 200:
             print(f"[WEATHER] Lỗi OWM: {response.status_code} - {response.text}")
             return jsonify({'error': 'Không thể lấy dữ liệu thời tiết từ nhà cung cấp'}), 502
            
        data = response.json()
            
        temp = data['main']['temp']
        weather_main = data['weather'][0]['main']
        description = data['weather'][0]['description']
        icon_code = data['weather'][0]['icon']
        city = data['name']
        
        advice, suggested_types = get_clothing_advice(temp, weather_main)
        
        # ==================== TÌM KIẾM SẢN PHẨM GỢI Ý ====================
        # Lấy 4 sản phẩm ngẫu nhiên phù hợp với loại được gợi ý
        products = []
        if suggested_types:
            query = Product.query.filter(
                Product.loai.in_(suggested_types),
                Product.trang_thai == 'Con_hang'
            ).order_by(func.random()).limit(4).all()
            
            products = [p.to_dict() for p in query]
            
        return jsonify({
            'city': city,
            'temp': round(temp, 1),
            'weather_main': weather_main,
            'description': description.capitalize(),
            'icon_url': f"https://openweathermap.org/img/wn/{icon_code}@2x.png",
            'advice': advice,
            'suggested_products': products
        })
        
    except Exception as e:
        print(f"Lỗi API Thời tiết: {e}")
        return jsonify({'error': 'Lỗi máy chủ khi xử lý dữ liệu thời tiết'}), 500
