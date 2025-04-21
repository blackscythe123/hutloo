import os
import logging
from flask import Flask, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from flask_login import LoginManager, current_user

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create database base class
class Base(DeclarativeBase):
    pass

# Initialize SQLAlchemy with the base class
db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("SESSION_SECRET", "hatloo-super-secret-key")
    
    # Configure the SQLite database for MVP
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///hatloo.db")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'warning'
    
    with app.app_context():
        # Import models
        from models import User, Order, Vehicle, Driver, DeliveryStatus, Route
        
        # Create all database tables
        db.create_all()
        
        # Import routes
        from routes.auth import auth_bp
        from routes.orders import orders_bp
        from routes.admin import admin_bp
        from routes.drivers import drivers_bp
        from routes.analytics import analytics_bp
        
        # Register blueprints
        app.register_blueprint(auth_bp)
        app.register_blueprint(orders_bp)
        app.register_blueprint(admin_bp)
        app.register_blueprint(drivers_bp)
        app.register_blueprint(analytics_bp)
        
        # User loader for Flask-Login
        @login_manager.user_loader
        def load_user(user_id):
            return User.query.get(int(user_id))
        
        # Register the main route
        @app.route('/')
        def index():
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            if current_user.role == 'admin':
                return redirect(url_for('admin.dashboard'))
            elif current_user.role == 'driver':
                return redirect(url_for('driver.dashboard'))
            else:
                return redirect(url_for('orders.list'))
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)

# Import routes at the end to avoid circular imports
from routes import *
