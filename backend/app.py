from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from config import Config
from models import db
from socket_events import socketio

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Disable strict slashes to avoid redirects
    app.url_map.strict_slashes = False
    
    # Configure CORS properly
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        },
        r"/socket.io/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    db.init_app(app)
    JWTManager(app)
    Migrate(app, db)
    
    # Initialize SocketIO
    socketio.init_app(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.products import products_bp
    from routes.cart import cart_bp
    from routes.orders import orders_bp
    from routes.admin import admin_bp
    from routes.vouchers import vouchers_bp
    from routes.store_info import store_info_bp
    from routes.promotions import promotions_bp
    from routes.recommendations import recommendations_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(vouchers_bp, url_prefix='/api/vouchers')
    app.register_blueprint(store_info_bp, url_prefix='/api/store-info')
    app.register_blueprint(promotions_bp, url_prefix='/api/promotions')
    app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')
    
    # Import reviews blueprint if it exists
    try:
        from routes.reviews import reviews_bp
        app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    except ImportError:
        pass
    
    # Import chat blueprint
    from routes.chat import chat_bp
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    
    # Import chatbot blueprint
    from routes.chatbot import chatbot_bp
    app.register_blueprint(chatbot_bp, url_prefix='/api/chatbot')
    
    @app.route('/api/health')
    def health():
        return {'status': 'ok'}
    
    return app
