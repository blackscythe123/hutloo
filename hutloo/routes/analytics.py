from flask import Blueprint, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from sqlalchemy import func
from datetime import datetime, timedelta
from app import db
from models import Order, DeliveryStatus, Driver, Vehicle, User

# Create analytics blueprint
analytics_bp = Blueprint('analytics', __name__, url_prefix='/analytics')

# Admin required decorator
def admin_required(f):
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return login_required(decorated_function)

@analytics_bp.route('/dashboard')
@admin_required
def dashboard():
    # Get today and past 7 days date range
    today = datetime.utcnow().date()
    past_week = today - timedelta(days=7)
    
    # Get order statistics
    orders_today = Order.query.filter(func.date(Order.created_at) == today).count()
    orders_week = Order.query.filter(Order.created_at >= past_week).count()
    
    # Get delivery statistics
    deliveries_completed_today = Order.query.filter(
        func.date(Order.actual_delivery) == today,
        Order.status == 'delivered'
    ).count()
    
    deliveries_completed_week = Order.query.filter(
        Order.actual_delivery >= past_week,
        Order.status == 'delivered'
    ).count()
    
    # Get active drivers
    active_drivers = Driver.query.filter_by(status='available').count()
    
    # Get delivery times
    delivery_times = db.session.query(
        func.avg(func.julianday(Order.actual_delivery) - func.julianday(Order.actual_pickup)) * 24
    ).filter(
        Order.actual_pickup.isnot(None),
        Order.actual_delivery.isnot(None)
    ).scalar() or 0
    
    # Format as hours
    avg_delivery_time = round(delivery_times, 2)
    
    # Get data for weekly orders chart
    orders_by_day = []
    for i in range(7):
        date = today - timedelta(days=i)
        count = Order.query.filter(func.date(Order.created_at) == date).count()
        orders_by_day.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    
    # Reverse to get chronological order
    orders_by_day.reverse()
    
    # Get data for order status chart
    status_counts = db.session.query(
        Order.status, func.count(Order.id)
    ).group_by(Order.status).all()
    
    status_data = {
        'labels': [status for status, _ in status_counts],
        'data': [count for _, count in status_counts]
    }
    
    return render_template('analytics/dashboard.html',
                          title='Analytics Dashboard',
                          orders_today=orders_today,
                          orders_week=orders_week,
                          deliveries_completed_today=deliveries_completed_today,
                          deliveries_completed_week=deliveries_completed_week,
                          active_drivers=active_drivers,
                          avg_delivery_time=avg_delivery_time,
                          orders_by_day=orders_by_day,
                          status_data=status_data)

@analytics_bp.route('/api/orders-by-day')
@admin_required
def api_orders_by_day():
    # Get today and past 30 days
    today = datetime.utcnow().date()
    past_month = today - timedelta(days=30)
    
    # Query orders by day
    orders_by_day = db.session.query(
        func.date(Order.created_at).label('date'),
        func.count(Order.id).label('count')
    ).filter(
        Order.created_at >= past_month
    ).group_by(
        func.date(Order.created_at)
    ).all()
    
    # Format data for chart
    data = [{
        'date': str(date),
        'count': count
    } for date, count in orders_by_day]
    
    return jsonify(data)

@analytics_bp.route('/api/driver-performance')
@admin_required
def api_driver_performance():
    # Get driver performance data
    drivers = Driver.query.all()
    performance_data = []
    
    for driver in drivers:
        total_orders = Order.query.filter_by(driver_id=driver.id).count()
        completed_orders = Order.query.filter_by(
            driver_id=driver.id, status='delivered'
        ).count()
        
        # Calculate on-time delivery ratio
        on_time_deliveries = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status == 'delivered',
            Order.actual_delivery <= Order.scheduled_delivery
        ).count()
        
        on_time_ratio = 0
        if completed_orders > 0:
            on_time_ratio = round((on_time_deliveries / completed_orders) * 100, 2)
        
        # Calculate average delivery time
        avg_delivery_time = db.session.query(
            func.avg(func.julianday(Order.actual_delivery) - func.julianday(Order.actual_pickup)) * 24
        ).filter(
            Order.driver_id == driver.id,
            Order.actual_pickup.isnot(None),
            Order.actual_delivery.isnot(None)
        ).scalar() or 0
        
        performance_data.append({
            'driver_name': driver.user.username,
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'on_time_ratio': on_time_ratio,
            'avg_delivery_time': round(avg_delivery_time, 2)
        })
    
    return jsonify(performance_data)
