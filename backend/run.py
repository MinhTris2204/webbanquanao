from app import create_app
from socket_events import socketio
from models import db
import time
import os

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Wait for database to be ready
        max_retries = 30
        retry_count = 0
        while retry_count < max_retries:
            try:
                db.engine.connect()
                print("Database connected successfully!")
                break
            except Exception as e:
                retry_count += 1
                print(f"Database connection attempt {retry_count}/{max_retries} failed: {e}")
                time.sleep(2)
        
        # Enable pgvector extension
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text('CREATE EXTENSION IF NOT EXISTS vector'))
                conn.commit()
            print("pgvector extension enabled!")
        except Exception as e:
            print(f"Warning: Could not enable pgvector extension: {e}")
        
        # Create tables
        db.create_all()
        print("Database tables created!")
        
        # Create default admin user
        from models import User
        admin = User.query.filter_by(email='admin@example.com').first()
        if not admin:
            admin = User(
                taikhoan='admin',
                email='admin@example.com',
                hoten='Administrator',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("Default admin user created!")
    
    # Run with SocketIO
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
