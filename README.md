# Hatloo Logistics Tracker

Hatloo is a logistics optimization platform built with Flask. It provides real-time order tracking, driver and vehicle management, analytics, and role-based access for admins, drivers, and customers.

## Features

- User registration and login (Customer, Driver, Admin)
- Role-based dashboards and navigation
- Order creation, assignment, and real-time tracking
- Driver and vehicle management (admin)
- Analytics dashboard (admin)
- Responsive UI with Bootstrap 5 and Leaflet maps
- REST API endpoints for order tracking and analytics

## Project Structure

```
LogisticsTracker/
├── app.py
├── main.py
├── models.py
├── forms.py
├── routes/
│   ├── __init__.py
│   ├── admin.py
│   ├── analytics.py
│   ├── auth.py
│   ├── customer.py
│   ├── drivers.py
│   ├── orders.py
├── templates/
│   ├── layout.html
│   ├── auth/
│   ├── admin/
│   ├── driver/
│   ├── customer/
│   ├── orders/
│   ├── analytics/
├── static/
│   ├── css/
│   ├── js/
├── README.md

```

## Setup & Installation

1. **Clone the repository:**
    ```bash
    git clone <repo-url>
    cd LogisticsTracker
    ```

2. **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    Or use the dependencies listed in `pyproject.toml`.

3. **Set up environment variables (optional):**
    - `SESSION_SECRET`: Flask session secret key
    - `DATABASE_URL`: Database URI (default is SQLite)

4. **Run the application:**
    ```bash
    python main.py
    ```
    Or with Gunicorn (for production):
    ```bash
    gunicorn --bind 0.0.0.0:5000 main:app
    ```

5. **Access the app:**
    - Open [http://localhost:5000](http://localhost:5000) in your browser.

## User Roles

- **Customer:** Can create and track orders.
- **Driver:** Can view assigned deliveries, update status, and location.
- **Admin:** Can manage users, drivers, vehicles, orders, and view analytics.

## Development Notes

- Database tables are created automatically on first run.
- To register as an admin, select "Admin" during registration.
- The UI uses Bootstrap 5, Font Awesome, and Leaflet for maps.
- Analytics and tracking use AJAX/REST endpoints.

## License

MIT License

---

**Hatloo Logistics Tracker** &copy; 2023-present
