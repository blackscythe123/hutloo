from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

# Role choices
ROLE_ADMIN = 'admin'
ROLE_DRIVER = 'driver'
ROLE_CUSTOMER = 'customer'

# Order status choices
STATUS_PENDING = 'pending'
STATUS_ASSIGNED = 'assigned'
STATUS_IN_TRANSIT = 'in_transit'
STATUS_DELIVERED = 'delivered'
STATUS_CANCELLED = 'cancelled'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_CUSTOMER)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    orders = db.relationship('Order', backref='customer', lazy='dynamic',
                            foreign_keys='Order.customer_id')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def is_admin(self):
        return self.role == ROLE_ADMIN
        
    def is_driver(self):
        return self.role == ROLE_DRIVER
    
    def __repr__(self):
        return f'<User {self.username}>'

class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='available')  # available, busy, offline
    current_location_lat = db.Column(db.Float, nullable=True)
    current_location_lng = db.Column(db.Float, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('driver_profile', uselist=False))
    vehicle = db.relationship('Vehicle', backref='driver', uselist=False)
    orders = db.relationship('Order', backref='assigned_driver', lazy='dynamic',
                           foreign_keys='Order.driver_id')
    
    def __repr__(self):
        return f'<Driver {self.user.username}>'

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # truck, van, car
    license_plate = db.Column(db.String(20), unique=True, nullable=False)
    capacity = db.Column(db.Float, nullable=False)  # in weight units
    status = db.Column(db.String(20), default='available')  # available, in_use, maintenance
    
    def __repr__(self):
        return f'<Vehicle {self.license_plate}>'

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    pickup_address = db.Column(db.String(255), nullable=False)
    pickup_lat = db.Column(db.Float, nullable=False)
    pickup_lng = db.Column(db.Float, nullable=False)
    delivery_address = db.Column(db.String(255), nullable=False)
    delivery_lat = db.Column(db.Float, nullable=False)
    delivery_lng = db.Column(db.Float, nullable=False)
    package_weight = db.Column(db.Float, nullable=False)
    package_description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default=STATUS_PENDING)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    scheduled_pickup = db.Column(db.DateTime, nullable=True)
    scheduled_delivery = db.Column(db.DateTime, nullable=True)
    actual_pickup = db.Column(db.DateTime, nullable=True)
    actual_delivery = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    statuses = db.relationship('DeliveryStatus', backref='order', lazy='dynamic')
    route = db.relationship('Route', backref='order', uselist=False)
    
    def __repr__(self):
        return f'<Order {self.order_number}>'

class DeliveryStatus(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    location_lat = db.Column(db.Float, nullable=True)
    location_lng = db.Column(db.Float, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f'<DeliveryStatus {self.status} for Order {self.order_id}>'

class Route(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    path = db.Column(db.Text, nullable=True)  # JSON string of coordinates
    distance = db.Column(db.Float, nullable=True)  # in km
    estimated_time = db.Column(db.Integer, nullable=True)  # in minutes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Route for Order {self.order_id}>'
