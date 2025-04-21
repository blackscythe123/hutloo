import uuid
from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from app import db
from models import Order, DeliveryStatus, Route, STATUS_PENDING
from forms import OrderForm, TrackOrderForm

# Create orders blueprint
orders_bp = Blueprint('orders', __name__, url_prefix='/orders')

@orders_bp.route('/')
@login_required
def list():
    if current_user.is_admin():
        # Admins can see all orders
        orders = Order.query.order_by(Order.created_at.desc()).all()
    else:
        # Regular users see only their orders
        orders = Order.query.filter_by(customer_id=current_user.id).order_by(Order.created_at.desc()).all()
    
    return render_template('orders/list.html', title='My Orders', orders=orders)

@orders_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create():
    form = OrderForm()
    if form.validate_on_submit():
        # Generate a unique order number
        order_number = 'ORD-' + str(uuid.uuid4())[:8].upper()
        
        # Create new order
        order = Order(
            customer_id=current_user.id,
            order_number=order_number,
            pickup_address=form.pickup_address.data,
            pickup_lat=form.pickup_lat.data,
            pickup_lng=form.pickup_lng.data,
            delivery_address=form.delivery_address.data,
            delivery_lat=form.delivery_lat.data,
            delivery_lng=form.delivery_lng.data,
            package_weight=form.package_weight.data,
            package_description=form.package_description.data,
            scheduled_pickup=form.scheduled_pickup.data,
            scheduled_delivery=form.scheduled_delivery.data,
            status=STATUS_PENDING
        )
        
        # Add initial status
        status = DeliveryStatus(
            status=STATUS_PENDING,
            notes="Order created and pending assignment"
        )
        order.statuses.append(status)
        
        # Create initial route plan
        route = Route(
            distance=0.0,  # Will be calculated later
            estimated_time=0  # Will be calculated later
        )
        order.route = route
        
        db.session.add(order)
        db.session.commit()
        
        flash(f'Order {order_number} created successfully!', 'success')
        return redirect(url_for('orders.track', order_number=order_number))
    
    return render_template('orders/create.html', title='Create Order', form=form)

@orders_bp.route('/track', methods=['GET', 'POST'])
def track():
    form = TrackOrderForm()
    order = None
    
    if form.validate_on_submit():
        order = Order.query.filter_by(order_number=form.order_number.data).first()
        if not order:
            flash('Order not found', 'danger')
    
    # If order number provided in URL
    order_number = request.args.get('order_number')
    if order_number:
        order = Order.query.filter_by(order_number=order_number).first()
        if not order:
            flash('Order not found', 'danger')
    
    return render_template('orders/track.html', title='Track Order', form=form, order=order)

@orders_bp.route('/api/track/<order_number>')
def api_track(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    statuses = []
    for status in order.statuses:
        statuses.append({
            'status': status.status,
            'timestamp': status.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'notes': status.notes,
            'location': {
                'lat': status.location_lat,
                'lng': status.location_lng
            } if status.location_lat and status.location_lng else None
        })
    
    route_data = None
    if order.route and order.route.path:
        route_data = {
            'path': order.route.path,
            'distance': order.route.distance,
            'estimated_time': order.route.estimated_time
        }
    
    data = {
        'order_number': order.order_number,
        'status': order.status,
        'pickup': {
            'address': order.pickup_address,
            'lat': order.pickup_lat,
            'lng': order.pickup_lng,
            'scheduled': order.scheduled_pickup.strftime('%Y-%m-%d %H:%M:%S') if order.scheduled_pickup else None,
            'actual': order.actual_pickup.strftime('%Y-%m-%d %H:%M:%S') if order.actual_pickup else None
        },
        'delivery': {
            'address': order.delivery_address,
            'lat': order.delivery_lat,
            'lng': order.delivery_lng,
            'scheduled': order.scheduled_delivery.strftime('%Y-%m-%d %H:%M:%S') if order.scheduled_delivery else None,
            'actual': order.actual_delivery.strftime('%Y-%m-%d %H:%M:%S') if order.actual_delivery else None
        },
        'driver': order.assigned_driver.user.username if order.assigned_driver else None,
        'statuses': statuses,
        'route': route_data
    }
    
    return jsonify(data)
