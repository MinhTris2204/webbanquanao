import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/webbanquanao')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'client_encoding': 'utf8'}
    }
    
    # Multiple database binds (disabled - not currently used)
    # SQLALCHEMY_BINDS = {
    #     'eadev': os.getenv('EADEV_DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/eadev')
    # }
    
    JWT_SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # MoMo Payment Configuration (Sandbox)
    MOMO_PARTNER_CODE = os.getenv('MOMO_PARTNER_CODE', 'MOMOBKUN20180529')
    MOMO_ACCESS_KEY = os.getenv('MOMO_ACCESS_KEY', 'klm05TvNBzhg7h7j')
    MOMO_SECRET_KEY = os.getenv('MOMO_SECRET_KEY', 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa')
    MOMO_ENDPOINT = os.getenv('MOMO_ENDPOINT', 'https://test-payment.momo.vn')
    MOMO_REDIRECT_URL = os.getenv('MOMO_REDIRECT_URL', 'http://localhost:5173/checkout/momo-return')
    MOMO_IPN_URL = os.getenv('MOMO_IPN_URL', 'http://localhost:5000/api/momo/ipn')
