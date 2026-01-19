from flask import Blueprint, request, jsonify
import requests
import os
from models import db, Product
from sqlalchemy.sql.expression import func
# from flask_cors import cross_origin # Optional if global CORS works, but let's try relying on global first, or debug.

weather_bp = Blueprint('weather', __name__)

# API Key should be in .env
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

def get_clothing_advice(temp_c, weather_main):
    """
    Generate clothing advice based on temperature and weather condition.
    Returns: (list of advice strings, list of product types to suggest)
    """
    suggestions = []
    # Map common product types from Product.loai: ['Áo', 'Quần', 'Váy', 'Đầm', 'Áo khoác', 'Phụ kiện']
    product_types = []
    
    weather_main = weather_main.lower()
    
    # Check rain/snow
    if any(x in weather_main for x in ['rain', 'drizzle', 'thunderstorm', 'snow']):
        suggestions.append("Trời có mưa/tuyết, đừng quên mang ô hoặc áo mưa nhé!")
        product_types.append('Áo khoác')
    
    # Temperature based advice
    if temp_c < 15:
        suggestions.append(f"Trời lạnh ({round(temp_c)}°C), hãy mặc ấm với áo khoác dày.")
        product_types.extend(['Áo khoác', 'Áo']) # Sweater/Hoodie categorized as Áo or Áo khoác
    elif temp_c < 22:
        suggestions.append(f"Trời se lạnh ({round(temp_c)}°C), một chiếc áo khoác nhẹ hoặc áo dài tay là lựa chọn tuyệt vời.")
        product_types.extend(['Áo khoác', 'Áo', 'Quần'])
    elif temp_c < 28:
        suggestions.append(f"Thời tiết mát mẻ ({round(temp_c)}°C), rất thoải mái để diện đồ đẹp xuống phố.")
        product_types.extend(['Áo', 'Quần', 'Váy', 'Đầm'])
    else:
        suggestions.append(f"Trời nóng ({round(temp_c)}°C), ưu tiên trang phục mỏng nhẹ, thoáng mát.")
        product_types.extend(['Áo', 'Quần', 'Váy', 'Đầm']) # T-shirt, Short
        
    # Remove duplicates
    return suggestions, list(set(product_types))

@weather_bp.route('/current', methods=['GET', 'OPTIONS'])
def get_current_weather():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    # Allow passing lat/lon, default to Hanoi
    lat = request.args.get('lat', '21.0285') 
    lon = request.args.get('lon', '105.8542')
    
    print(f"[WEATHER] Key available: {'Yes' if OPENWEATHER_API_KEY else 'No'}")
    if OPENWEATHER_API_KEY:
        print(f"[WEATHER] Key prefix: {OPENWEATHER_API_KEY[:4]}...")

    if not OPENWEATHER_API_KEY:
        print("[WEATHER] Error: Missing API Key")
        return jsonify({
            'error': 'Missing OPENWEATHER_API_KEY in server environment',
            'temp': 25,
            'description': 'demo mode (missing key)',
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
             print(f"[WEATHER] OWM Error: {response.status_code} - {response.text}")
             return jsonify({'error': 'Failed to fetch weather data from provider'}), 502
            
        data = response.json()
            
        temp = data['main']['temp']
        weather_main = data['weather'][0]['main']
        description = data['weather'][0]['description']
        icon_code = data['weather'][0]['icon']
        city = data['name']
        
        advice, suggested_types = get_clothing_advice(temp, weather_main)
        
        # Query recommended products based on types
        products = []
        if suggested_types:
            # Get random 4 products matching the types
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
        print(f"Weather API Error: {e}")
        return jsonify({'error': 'Internal server error processing weather data'}), 500
