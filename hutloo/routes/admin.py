from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from flask_mail import Message
from app import db, mail
from models import DeliveryStatus, User, Order, Driver, Vehicle, ROLE_DRIVER, ROLE_ADMIN
from forms import DriverForm, VehicleForm

# Create admin blueprint
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Admin required decorator
def admin_required(f):
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return login_required(decorated_function)

@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    # Get counts for dashboard
    orders_count = Order.query.count()
    drivers_count = Driver.query.count()
    vehicles_count = Vehicle.query.count()
    users_count = User.query.count()
    
    # Get recent orders
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    
    # Get order statuses for chart
    pending_count = Order.query.filter_by(status='pending').count()
    assigned_count = Order.query.filter_by(status='assigned').count()
    in_transit_count = Order.query.filter_by(status='in_transit').count()
    delivered_count = Order.query.filter_by(status='delivered').count()
    cancelled_count = Order.query.filter_by(status='cancelled').count()
    
    status_data = {
        'labels': ['Pending', 'Assigned', 'In Transit', 'Delivered', 'Cancelled'],
        'data': [pending_count, assigned_count, in_transit_count, delivered_count, cancelled_count]
    }
    
    return render_template('admin/dashboard.html', 
                           title='Admin Dashboard',
                           orders_count=orders_count,
                           drivers_count=drivers_count,
                           vehicles_count=vehicles_count,
                           users_count=users_count,
                           recent_orders=recent_orders,
                           status_data=status_data)

@admin_bp.route('/orders')
@admin_required
def orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    drivers = Driver.query.all()
    return render_template('admin/orders.html', title='Manage Orders', orders=orders, drivers=drivers)

@admin_bp.route('/drivers')
@admin_required
def drivers():
    drivers = Driver.query.all()
    form = DriverForm()
    vehicles = Vehicle.query.all()
    vehicle_form = VehicleForm()
    # Populate the drivers in the form select field for vehicle_form
    vehicle_form.driver_id.choices = [(d.id, d.user.username) for d in drivers]
    return render_template(
        'admin/drivers.html',
        title='Manage Drivers',
        drivers=drivers,
        form=form,
        vehicles=vehicles,
        vehicle_form=vehicle_form
    )

@admin_bp.route('/drivers/add', methods=['GET', 'POST'])
@admin_required
def add_driver():
    form = DriverForm()
    drivers = Driver.query.all()
    vehicles = Vehicle.query.all()
    vehicle_form = VehicleForm()
    # Populate the drivers in the form select field for vehicle_form
    vehicle_form.driver_id.choices = [(d.id, d.user.username) for d in drivers]
    if form.validate_on_submit():
        # Create new user with driver role
        user = User(
            username=form.username.data,
            email=form.email.data,
            role=ROLE_DRIVER
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.flush()  # Flush to get the user ID
        
        # Create driver profile
        driver = Driver(
            user_id=user.id,
            license_number=form.license_number.data,
            phone=form.phone.data,
            status='available'
        )
        db.session.add(driver)
        db.session.commit()
        
        flash('Driver added successfully', 'success')
        return redirect(url_for('admin.drivers'))
    
    return render_template(
        'admin/drivers.html',
        title='Add Driver',
        form=form,
        drivers=drivers,
        vehicles=vehicles,
        vehicle_form=vehicle_form
    )

@admin_bp.route('/vehicles')
@admin_required
def vehicles():
    vehicles = Vehicle.query.all()
    drivers = Driver.query.all()
    form = DriverForm()
    vehicle_form = VehicleForm()
    # Populate the drivers in the form select field
    vehicle_form.driver_id.choices = [(d.id, d.user.username) for d in drivers]
    return render_template(
        'admin/drivers.html',
        title='Manage Vehicles',
        vehicles=vehicles,
        drivers=drivers,
        form=form,
        vehicle_form=vehicle_form
    )

@admin_bp.route('/vehicles/add', methods=['POST'])
@admin_required
def add_vehicle():
    form = VehicleForm()
    
    # Populate the drivers in the form select field
    drivers = Driver.query.all()
    form.driver_id.choices = [(d.id, d.user.username) for d in drivers]
    
    if form.validate_on_submit():
        vehicle = Vehicle(
            driver_id=form.driver_id.data,
            type=form.type.data,
            license_plate=form.license_plate.data,
            capacity=form.capacity.data,
            status='available'
        )
        db.session.add(vehicle)
        db.session.commit()
        
        flash('Vehicle added successfully', 'success')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f"{getattr(form, field).label.text}: {error}", 'danger')
    
    return redirect(url_for('admin.vehicles'))

def send_email(subject, recipients, body):
    msg = Message(subject, recipients=recipients, body=body)
    mail.send(msg)

@admin_bp.route('/assign-order/<int:order_id>/<int:driver_id>', methods=['POST'])
@admin_required
def assign_order(order_id, driver_id):
    order = Order.query.get_or_404(order_id)
    driver = Driver.query.get_or_404(driver_id)
    
    order.driver_id = driver.id
    order.status = 'assigned'
    
    # Add status update
    status = DeliveryStatus(
        order_id=order.id,
        status='assigned',
        notes=f'Order assigned to {driver.user.username}'
    )
    db.session.add(status)
    db.session.commit()
    
    # --- Email notifications ---
    # Email to driver
    driver_email = driver.user.email
    driver_msg = (
        f"Dear {driver.user.username},\n\n"
        f"You have been assigned a new delivery (Order #{order.order_number}).\n"
        f"Pickup: {order.pickup_address}\n"
        f"Delivery: {order.delivery_address}\n"
        f"Please check your dashboard for details.\n\n"
        f"Hatloo Logistics"
    )
    send_email(
        subject=f"New Delivery Assigned: Order #{order.order_number}",
        recipients=[driver_email],
        body=driver_msg
    )

    # Email to customer
    customer_email = order.customer.email
    if driver.vehicle:
        vehicle_info = f"Vehicle: {driver.vehicle.type.capitalize()} ({driver.vehicle.license_plate})\n"
    else:
        vehicle_info = "Vehicle: Not assigned yet\n"
    customer_msg = (
        f"Dear {order.customer.username},\n\n"
        f"Your order (Order #{order.order_number}) has been assigned to a driver.\n"
        f"Driver Name: {driver.user.username}\n"
        f"Phone: {driver.phone}\n"
        f"{vehicle_info}"
        f"You can track your order in real-time from your dashboard.\n\n"
        f"Hatloo Logistics"
    )
    send_email(
        subject=f"Driver Assigned for Your Order #{order.order_number}",
        recipients=[customer_email],
        body=customer_msg
    )
    # --- End email notifications ---

    flash(f'Order {order.order_number} assigned to {driver.user.username}', 'success')
    return redirect(url_for('admin.orders'))

@admin_bp.route('/update-status/<int:order_id>', methods=['POST'])
@admin_required
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    new_status = request.form.get('status')
    notes = request.form.get('notes', '')
    if new_status and new_status != order.status:
        order.status = new_status
        # Add status update
        status_update = DeliveryStatus(
            order_id=order.id,
            status=new_status,
            notes=notes or f"Status changed to {new_status} by admin"
        )
        db.session.add(status_update)
        db.session.commit()
        flash(f"Order status updated to {new_status}", "success")
    else:
        flash("Invalid status or no change made.", "warning")
    return redirect(url_for('admin.orders'))

@admin_bp.route('/api/driver/<int:driver_id>')
@admin_required
def api_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id)
    data = {
        'username': driver.user.username,
        'email': driver.user.email,
        'license_number': driver.license_number,
        'phone': driver.phone,
        'status': driver.status,
        'vehicle': f"{driver.vehicle.type.capitalize()} ({driver.vehicle.license_plate})" if driver.vehicle else None,
        'current_location_lat': driver.current_location_lat,
        'current_location_lng': driver.current_location_lng,
        'created_at': driver.user.created_at.strftime('%Y-%m-%d %H:%M') if hasattr(driver.user, 'created_at') else '',
    }
    return jsonify(data)
