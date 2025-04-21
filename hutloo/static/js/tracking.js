/**
 * Order tracking functionality for Hatloo Logistics
 */

// Initialize the tracking page
function initTracking(orderNumber = null) {
    // Initialize map
    const map = initMap('map-container');
    
    // If order number is provided, load order data
    if (orderNumber) {
        loadOrderData(orderNumber, map);
    }
    
    // Setup tracking form submission
    const trackingForm = document.getElementById('tracking-form');
    if (trackingForm) {
        trackingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const orderInput = document.getElementById('order_number');
            if (orderInput && orderInput.value) {
                loadOrderData(orderInput.value, map);
                
                // Update URL with the order number for bookmarking
                const url = new URL(window.location);
                url.searchParams.set('order_number', orderInput.value);
                window.history.pushState({}, '', url);
            }
        });
    }
}

// Load order data from API
function loadOrderData(orderNumber, map) {
    // Show loading indicator
    const trackingResult = document.getElementById('tracking-result');
    if (trackingResult) {
        trackingResult.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading order information...</p></div>';
    }
    
    fetch(`/orders/api/track/${orderNumber}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Order not found');
            }
            return response.json();
        })
        .then(data => {
            // Display order data on map
            displayOrderTracking(map, data);
            
            // Update tracking info in the UI
            updateTrackingInfo(data);
        })
        .catch(error => {
            if (trackingResult) {
                trackingResult.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <i class="fas fa-exclamation-circle me-2"></i> ${error.message}
                    </div>
                `;
            }
            
            // Clear the map
            map.eachLayer(layer => {
                if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                    map.removeLayer(layer);
                }
            });
        });
}

// Update tracking information in the UI
function updateTrackingInfo(orderData) {
    const trackingResult = document.getElementById('tracking-result');
    if (!trackingResult) return;
    
    // Format dates
    const scheduledPickup = orderData.pickup.scheduled ? new Date(orderData.pickup.scheduled).toLocaleString() : 'Not scheduled';
    const actualPickup = orderData.pickup.actual ? new Date(orderData.pickup.actual).toLocaleString() : 'Pending';
    const scheduledDelivery = orderData.delivery.scheduled ? new Date(orderData.delivery.scheduled).toLocaleString() : 'Not scheduled';
    const actualDelivery = orderData.delivery.actual ? new Date(orderData.delivery.actual).toLocaleString() : 'Pending';
    
    // Create status class
    const statusClass = `status-badge status-${orderData.status.toLowerCase().replace('_', '-')}`;
    
    // Build HTML
    let html = `
    <div class="content-card">
        <div class="row">
            <div class="col-md-6">
                <h3 class="mb-3">Order #${orderData.order_number}</h3>
                <div class="mb-3">
                    <span class="${statusClass}">${orderData.status}</span>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h5><i class="fas fa-arrow-circle-up me-2"></i>Pickup</h5>
                        <p class="mb-1">${orderData.pickup.address}</p>
                        <p class="mb-1"><strong>Scheduled:</strong> ${scheduledPickup}</p>
                        <p><strong>Actual:</strong> ${actualPickup}</p>
                    </div>
                    <div class="col-md-6">
                        <h5><i class="fas fa-arrow-circle-down me-2"></i>Delivery</h5>
                        <p class="mb-1">${orderData.delivery.address}</p>
                        <p class="mb-1"><strong>Scheduled:</strong> ${scheduledDelivery}</p>
                        <p><strong>Actual:</strong> ${actualDelivery}</p>
                    </div>
                </div>
                
                ${orderData.driver ? `<p><strong>Driver:</strong> ${orderData.driver}</p>` : ''}
                
                ${orderData.route ? `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>Distance:</strong> ${orderData.route.distance ? orderData.route.distance.toFixed(2) + ' km' : 'Calculating...'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Est. Time:</strong> ${orderData.route.estimated_time ? orderData.route.estimated_time + ' min' : 'Calculating...'}</p>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="col-md-6">
                <h4>Status Updates</h4>
                <ul class="timeline">
    `;
    
    // Add status updates to timeline
    if (orderData.statuses && orderData.statuses.length > 0) {
        orderData.statuses.forEach(status => {
            const statusTime = new Date(status.timestamp).toLocaleString();
            html += `
                <li class="timeline-item">
                    <div class="timeline-badge"></div>
                    <div class="timeline-panel">
                        <div class="timeline-title">${status.status.toUpperCase()}</div>
                        <div class="timeline-date">${statusTime}</div>
                        <div class="timeline-body">
                            ${status.notes || ''}
                        </div>
                    </div>
                </li>
            `;
        });
    } else {
        html += `
            <li class="timeline-item">
                <div class="timeline-badge"></div>
                <div class="timeline-panel">
                    <div class="timeline-title">No status updates available</div>
                </div>
            </li>
        `;
    }
    
    html += `
                </ul>
            </div>
        </div>
    </div>
    `;
    
    trackingResult.innerHTML = html;
}

// Live tracking update polling
function enableLiveTracking(orderNumber, intervalSeconds = 60) {
    // Initial load
    const map = document.getElementById('map-container') ? 
        initMap('map-container') : null;
    
    if (map && orderNumber) {
        loadOrderData(orderNumber, map);
        
        // Setup polling interval
        const intervalId = setInterval(() => {
            loadOrderData(orderNumber, map);
        }, intervalSeconds * 1000);
        
        // Store the interval ID for cleanup
        window.liveTrackingInterval = intervalId;
        
        // Create a status indicator
        const statusDiv = document.createElement('div');
        statusDiv.id = 'live-tracking-status';
        statusDiv.className = 'live-tracking-indicator';
        statusDiv.innerHTML = `
            <span class="badge bg-success">
                <i class="fas fa-satellite-dish me-1"></i> Live Tracking Active
            </span>
        `;
        
        // Add to the page
        const trackingResult = document.getElementById('tracking-result');
        if (trackingResult) {
            trackingResult.prepend(statusDiv);
        }
        
        return intervalId;
    }
    
    return null;
}

// Stop live tracking
function disableLiveTracking() {
    if (window.liveTrackingInterval) {
        clearInterval(window.liveTrackingInterval);
        window.liveTrackingInterval = null;
        
        // Remove the indicator
        const indicator = document.getElementById('live-tracking-status');
        if (indicator) {
            indicator.remove();
        }
        
        return true;
    }
    
    return false;
}
