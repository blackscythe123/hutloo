from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from app import db
from models import User, Order, Driver, DeliveryStatus

# Create drivers blueprint
drivers_bp = Blueprint('drivers', __name__, url_prefix='/driver')

# Driver required decorator
def driver_required(f):
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_driver():
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return login_required(decorated_function)

@drivers_bp.route('/dashboard')
@driver_required
def dashboard():
    # Get the driver profile
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    
    # Get assigned orders
    assigned_orders = Order.query.filter_by(driver_id=driver.id, status='assigned').all()
    in_transit_orders = Order.query.filter_by(driver_id=driver.id, status='in_transit').all()
    completed_orders = Order.query.filter_by(driver_id=driver.id, status='delivered').limit(5).all()
    
    # Count statistics
    assigned_count = len(assigned_orders)
    in_transit_count = len(in_transit_orders)
    completed_count = Order.query.filter_by(driver_id=driver.id, status='delivered').count()
    
    return render_template('driver/dashboard.html', 
                           title='Driver Dashboard',
                           driver=driver,
                           assigned_orders=assigned_orders,
                           in_transit_orders=in_transit_orders,
                           completed_orders=completed_orders,
                           assigned_count=assigned_count,
                           in_transit_count=in_transit_count,
                           completed_count=completed_count)

@drivers_bp.route('/orders')
@driver_required
def orders():
    # Get the driver profile
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    
    # Get all orders for this driver
    orders = Order.query.filter_by(driver_id=driver.id).order_by(Order.created_at.desc()).all()
    
    return render_template('driver/orders.html', 
                           title='My Deliveries',
                           driver=driver,
                           orders=orders)

@drivers_bp.route('/update-status/<int:order_id>', methods=['POST'])
@driver_required
def update_status(order_id):
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    order = Order.query.get_or_404(order_id)
    
    # Verify this order belongs to the current driver
    if order.driver_id != driver.id:
        flash('You are not authorized to update this order', 'danger')
        return redirect(url_for('drivers.orders'))
    
    new_status = request.form.get('status')
    notes = request.form.get('notes', '')
    lat = request.form.get('lat', type=float)
    lng = request.form.get('lng', type=float)
    
    # Update order status
    order.status = new_status
    
    # Update pickup/delivery times if applicable
    if new_status == 'in_transit' and not order.actual_pickup:
        order.actual_pickup = datetime.utcnow()
    elif new_status == 'delivered' and not order.actual_delivery:
        order.actual_delivery = datetime.utcnow()
    
    # Create status update record
    status_update = DeliveryStatus(
        order_id=order.id,
        status=new_status,
        location_lat=lat,
        location_lng=lng,
        notes=notes
    )
    
    db.session.add(status_update)
    db.session.commit()
    
    flash(f'Order status updated to {new_status}', 'success')
    return redirect(url_for('drivers.orders'))

@drivers_bp.route('/update-location', methods=['POST'])
@driver_required
def update_location():
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    
    lat = request.form.get('lat', type=float)
    lng = request.form.get('lng', type=float)
    
    if lat and lng:
        driver.current_location_lat = lat
        driver.current_location_lng = lng
        db.session.commit()
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Invalid location data'}), 400
