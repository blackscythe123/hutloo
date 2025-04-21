/**
 * Main JavaScript functionality for the Hatloo Logistics app
 */

// Initialize the application when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Setup dark mode switch
    setupDarkModeSwitch();
    
    // Initialize page-specific functionality
    initPageFunctionality();
    
    // Setup driver location tracking if applicable
    setupDriverLocationTracking();
});

// Set up theme mode switch
function setupDarkModeSwitch() {
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) {
        // Check for saved theme preference or prefer-color-scheme
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-mode');
            darkModeSwitch.checked = false;
        } else if (savedTheme === 'dark' || prefersDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeSwitch.checked = true;
        }
        
        // Add change event listener
        darkModeSwitch.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }
}

// Initialize page-specific functionality based on current page
function initPageFunctionality() {
    // Track order page
    if (document.getElementById('tracking-form')) {
        const urlParams = new URLSearchParams(window.location.search);
        const orderNumber = urlParams.get('order_number');
        
        initTracking(orderNumber);
        
        // If order number is provided, enable live tracking
        if (orderNumber) {
            enableLiveTracking(orderNumber, 30); // Update every 30 seconds
        }
    }
    
    // Create order page with map for route planning
    if (document.getElementById('route-planning-map')) {
        const routePlanningState = initRoutePlanning('route-planning-map');
        
        // Store in global scope to be accessed by address search
        window.routePlanningState = routePlanningState;
        
        // Initialize address search functionality
        initAddressSearch();
    }
    
    // Admin dashboard with charts
    if (document.getElementById('orders-chart')) {
        initAdminDashboardCharts();
    }
    
    // Driver dashboard with map
    if (document.getElementById('driver-map')) {
        const driverId = document.getElementById('driver-map').getAttribute('data-driver-id');
        const map = initMap('driver-map');
        
        if (driverId) {
            displayDriverMap(map, driverId);
        }
    }
    
    // Analytics dashboard
    if (document.getElementById('analytics-dashboard')) {
        initAnalyticsDashboard();
    }
}

// Initialize admin dashboard charts
function initAdminDashboardCharts() {
    // Get status distribution data from the page
    const statusDataElem = document.getElementById('status-data');
    if (statusDataElem) {
        try {
            const statusData = JSON.parse(statusDataElem.textContent);
            createStatusChart('orders-chart', statusData);
        } catch (e) {
            console.error('Error parsing status data:', e);
        }
    }
    
    // Fetch and render weekly orders chart
    fetch('/analytics/api/orders-by-day')
        .then(response => response.json())
        .then(data => {
            // Prepare data for chart
            const dates = data.map(item => item.date);
            const counts = data.map(item => item.count);
            
            createBarChart(
                'weekly-orders-chart',
                dates,
                [{
                    label: 'Orders',
                    data: counts,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)'
                }],
                'Weekly Order Volume',
                'Date',
                'Number of Orders'
            );
        })
        .catch(error => {
            console.error('Error fetching weekly orders data:', error);
        });
}

// Initialize analytics dashboard
function initAnalyticsDashboard() {
    // Initialize charts from data provided in the template
    
    // Orders by day chart
    const ordersByDayElem = document.getElementById('orders-by-day-data');
    if (ordersByDayElem) {
        try {
            const ordersByDay = JSON.parse(ordersByDayElem.textContent);
            createWeeklyOrdersChart('orders-by-day-chart', ordersByDay);
        } catch (e) {
            console.error('Error parsing orders by day data:', e);
        }
    }
    
    // Order status chart
    const statusDataElem = document.getElementById('status-data');
    if (statusDataElem) {
        try {
            const statusData = JSON.parse(statusDataElem.textContent);
            createStatusChart('status-distribution-chart', statusData);
        } catch (e) {
            console.error('Error parsing status data:', e);
        }
    }
    
    // Fetch and render driver performance chart
    fetch('/analytics/api/driver-performance')
        .then(response => response.json())
        .then(data => {
            createDriverPerformanceChart('driver-performance-chart', data);
        })
        .catch(error => {
            console.error('Error fetching driver performance data:', error);
        });
}

// Setup driver location tracking
function setupDriverLocationTracking() {
    const isDriverPage = document.getElementById('driver-dashboard');
    
    if (isDriverPage) {
        // Check if geolocation is available
        if ('geolocation' in navigator) {
            // Start tracking location
            const trackingIntervalId = setInterval(() => {
                navigator.geolocation.getCurrentPosition(position => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Send location update to server
                    updateDriverLocation(lat, lng);
                    
                    // Update position on map if exists
                    const map = window.driverMap;
                    const driverMarker = window.driverMarker;
                    
                    if (map && driverMarker) {
                        driverMarker.setLatLng([lat, lng]);
                    }
                }, error => {
                    console.error('Error getting location:', error.message);
                });
            }, 60000); // Update every minute
            
            // Store interval ID for cleanup
            window.locationTrackingInterval = trackingIntervalId;
            
            // Initial location check
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                updateDriverLocation(lat, lng);
            });
        } else {
            console.warn('Geolocation is not available in this browser');
            // Show warning to driver
            const alertContainer = document.getElementById('alerts-container');
            if (alertContainer) {
                alertContainer.innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Location tracking is not available in your browser. Some features may not work correctly.
                    </div>
                `;
            }
        }
    }
}

// Update driver location on the server
function updateDriverLocation(lat, lng) {
    const formData = new FormData();
    formData.append('lat', lat);
    formData.append('lng', lng);
    
    fetch('/driver/update-location', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Error updating location:', data.error);
        }
    })
    .catch(error => {
        console.error('Error sending location update:', error);
    });
}
