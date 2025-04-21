/**
 * Map functionality for Hatloo Logistics using Leaflet
 */

// Initialize map with default zoom
function initMap(containerId, centerLat = 40.7128, centerLng = -74.0060, zoom = 13) {
    // Create a map instance
    const map = L.map(containerId).setView([centerLat, centerLng], zoom);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    return map;
}

// Add a marker to the map
function addMarker(map, lat, lng, title, icon = null, popupContent = null) {
    let markerOptions = {};
    
    if (icon) {
        markerOptions.icon = icon;
    }
    
    const marker = L.marker([lat, lng], markerOptions).addTo(map);
    
    if (title) {
        marker.bindTooltip(title);
    }
    
    if (popupContent) {
        marker.bindPopup(popupContent);
    }
    
    return marker;
}

// Create custom icons for different marker types
function createIcon(type) {
    let iconUrl, iconSize, iconAnchor;
    
    switch(type) {
        case 'pickup':
            return L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #17a2b8; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display: flex; justify-content: center; align-items: center;">
                         <i class="fas fa-warehouse" style="color: white; font-size: 10px;"></i>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        case 'delivery':
            return L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #28a745; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display: flex; justify-content: center; align-items: center;">
                         <i class="fas fa-flag-checkered" style="color: white; font-size: 10px;"></i>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        case 'driver':
            return L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #007bff; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display: flex; justify-content: center; align-items: center;">
                         <i class="fas fa-truck" style="color: white; font-size: 10px;"></i>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        case 'status':
            return L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #ffc107; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display: flex; justify-content: center; align-items: center;">
                         <i class="fas fa-info" style="color: white; font-size: 10px;"></i>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        default:
            return L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #6c757d; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white;"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
    }
}

// Draw a route line between points
function drawRoute(map, points, options = {}) {
    const defaultOptions = {
        color: '#007bff',
        weight: 5,
        opacity: 0.7,
        dashArray: null
    };
    
    const routeOptions = { ...defaultOptions, ...options };
    
    const polyline = L.polyline(points, routeOptions).addTo(map);
    
    // Fit the map to the route bounds
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    
    return polyline;
}

// Load and display an order's tracking information on the map
function displayOrderTracking(map, orderData) {
    // Clear existing layers
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    // Add pickup and delivery markers
    const pickupMarker = addMarker(
        map, 
        orderData.pickup.lat, 
        orderData.pickup.lng, 
        'Pickup: ' + orderData.pickup.address,
        createIcon('pickup'),
        `<strong>Pickup Location</strong><br>${orderData.pickup.address}<br>
         Scheduled: ${orderData.pickup.scheduled || 'Not scheduled'}<br>
         Actual: ${orderData.pickup.actual || 'Pending'}`
    );
    
    const deliveryMarker = addMarker(
        map, 
        orderData.delivery.lat, 
        orderData.delivery.lng, 
        'Delivery: ' + orderData.delivery.address,
        createIcon('delivery'),
        `<strong>Delivery Location</strong><br>${orderData.delivery.address}<br>
         Scheduled: ${orderData.delivery.scheduled || 'Not scheduled'}<br>
         Actual: ${orderData.delivery.actual || 'Pending'}`
    );
    
    // Add status update markers
    orderData.statuses.forEach(status => {
        if (status.location && status.location.lat && status.location.lng) {
            addMarker(
                map,
                status.location.lat,
                status.location.lng,
                `Status: ${status.status}`,
                createIcon('status'),
                `<strong>Status Update</strong><br>
                 Status: ${status.status}<br>
                 Time: ${status.timestamp}<br>
                 Notes: ${status.notes || 'None'}`
            );
        }
    });
    
    // Draw route if available
    if (orderData.route && orderData.route.path) {
        // Parse the path from JSON string if needed
        let routePath;
        try {
            routePath = typeof orderData.route.path === 'string' 
                ? JSON.parse(orderData.route.path) 
                : orderData.route.path;
        } catch (e) {
            console.error('Error parsing route path:', e);
            routePath = [];
        }
        
        if (routePath.length > 0) {
            drawRoute(map, routePath);
        } else {
            // If no detailed path, draw direct line
            drawRoute(map, [
                [orderData.pickup.lat, orderData.pickup.lng],
                [orderData.delivery.lat, orderData.delivery.lng]
            ], { dashArray: '5, 10' });
        }
    } else {
        // Draw a simple line between pickup and delivery
        drawRoute(map, [
            [orderData.pickup.lat, orderData.pickup.lng],
            [orderData.delivery.lat, orderData.delivery.lng]
        ], { dashArray: '5, 10' });
    }
    
    // Fit bounds to see all markers
    const group = new L.featureGroup([pickupMarker, deliveryMarker]);
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
}

// Load driver's location and assigned orders
function displayDriverMap(map, driverId) {
    // Fetch driver data
    fetch(`/api/driver/${driverId}`)
        .then(response => response.json())
        .then(data => {
            // Add driver marker
            if (data.current_location) {
                addMarker(
                    map,
                    data.current_location.lat,
                    data.current_location.lng,
                    'Current Location',
                    createIcon('driver'),
                    `<strong>${data.name}</strong><br>Current Location`
                );
            }
            
            // Add assigned orders
            data.assigned_orders.forEach(order => {
                addMarker(
                    map,
                    order.pickup.lat,
                    order.pickup.lng,
                    `Pickup: ${order.order_number}`,
                    createIcon('pickup'),
                    `<strong>Order #${order.order_number}</strong><br>
                     Pickup: ${order.pickup.address}<br>
                     Status: ${order.status}`
                );
                
                addMarker(
                    map,
                    order.delivery.lat,
                    order.delivery.lng,
                    `Delivery: ${order.order_number}`,
                    createIcon('delivery'),
                    `<strong>Order #${order.order_number}</strong><br>
                     Delivery: ${order.delivery.address}<br>
                     Status: ${order.status}`
                );
                
                // Draw route
                drawRoute(map, [
                    [order.pickup.lat, order.pickup.lng],
                    [order.delivery.lat, order.delivery.lng]
                ], { color: getRandomColor(), dashArray: '5, 10' });
            });
        })
        .catch(error => {
            console.error('Error fetching driver data:', error);
        });
}

// Helper to generate random colors for multiple routes
function getRandomColor() {
    const colors = ['#007bff', '#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6f42c1'];
    return colors[Math.floor(Math.random() * colors.length)];
}
