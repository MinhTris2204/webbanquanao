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
