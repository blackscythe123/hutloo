/**
 * Route planning functionality for Hatloo Logistics
 */

// Initialize route planning
function initRoutePlanning(containerId = 'route-planning-map') {
    // Initialize map
    const map = initMap(containerId);
    
    // Create bounds for map to zoom to a specific area initially
    const defaultBounds = L.latLngBounds(
        L.latLng(40.6, -74.1),  // Southwest corner
        L.latLng(40.8, -73.9)   // Northeast corner
    );
    map.fitBounds(defaultBounds);
    
    // Initialize route markers
    const markers = {
        pickup: null,
        delivery: null
    };
    
    // Add click handlers to set pickup/delivery points
    setupMapClickHandlers(map, markers);
    
    return { map, markers };
}

// Setup click handlers for map
function setupMapClickHandlers(map, markers) {
    // Get the active point type (pickup or delivery)
    const getActivePointType = () => {
        const pickupRadio = document.getElementById('point-type-pickup');
        return pickupRadio && pickupRadio.checked ? 'pickup' : 'delivery';
    };
    
    // Map click handler
    map.on('click', function(e) {
        const pointType = getActivePointType();
        setMarkerPosition(map, markers, pointType, e.latlng.lat, e.latlng.lng);
        
        // Update form fields with coordinates
        updateCoordinateFields(pointType, e.latlng.lat, e.latlng.lng);
        
        // Reverse geocode to get address
        reverseGeocode(e.latlng.lat, e.latlng.lng, pointType);
    });
    
    // Set up radio button listeners to switch between pickup/delivery
    const radioButtons = document.querySelectorAll('input[name="point-type"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            // Highlight active marker
            if (markers.pickup) {
                markers.pickup.setOpacity(this.value === 'pickup' ? 1.0 : 0.6);
            }
            if (markers.delivery) {
                markers.delivery.setOpacity(this.value === 'delivery' ? 1.0 : 0.6);
            }
        });
    });
}

// Set marker position for pickup or delivery
function setMarkerPosition(map, markers, pointType, lat, lng) {
    // Remove existing marker if any
    if (markers[pointType]) {
        map.removeLayer(markers[pointType]);
    }
    
    // Create appropriate icon
    const icon = createIcon(pointType);
    
    // Create marker with popup
    markers[pointType] = addMarker(
        map,
        lat,
        lng,
        pointType === 'pickup' ? 'Pickup Location' : 'Delivery Location',
        icon,
        `<strong>${pointType === 'pickup' ? 'Pickup' : 'Delivery'} Location</strong><br>
         Latitude: ${lat.toFixed(6)}<br>
         Longitude: ${lng.toFixed(6)}`
    );
    
    // If both markers are set, draw a route line
    if (markers.pickup && markers.delivery) {
        drawRouteBetweenMarkers(map, markers);
    }
}

// Draw route between pickup and delivery
function drawRouteBetweenMarkers(map, markers) {
    // Get coordinates
    const pickupCoords = markers.pickup.getLatLng();
    const deliveryCoords = markers.delivery.getLatLng();
    
    // Remove existing route if any
    if (map.routeLine) {
        map.removeLayer(map.routeLine);
    }
    
    // Draw direct line for basic route
    map.routeLine = drawRoute(map, [
        [pickupCoords.lat, pickupCoords.lng],
        [deliveryCoords.lat, deliveryCoords.lng]
    ], { dashArray: '5, 10' });
    
    // Calculate straight-line distance
    const distance = pickupCoords.distanceTo(deliveryCoords) / 1000; // convert to km
    
    // Update distance display
    const distanceDisplay = document.getElementById('route-distance');
    if (distanceDisplay) {
        distanceDisplay.textContent = `${distance.toFixed(2)} km`;
    }
    
    // Update estimated time (assuming 50 km/h average speed)
    const estimatedTime = (distance / 50) * 60; // minutes
    const timeDisplay = document.getElementById('route-time');
    if (timeDisplay) {
        timeDisplay.textContent = `${Math.round(estimatedTime)} min`;
    }
}

// Update coordinate form fields
function updateCoordinateFields(pointType, lat, lng) {
    const latField = document.getElementById(`${pointType}_lat`);
    const lngField = document.getElementById(`${pointType}_lng`);
    
    if (latField) latField.value = lat;
    if (lngField) lngField.value = lng;
}

// Reverse geocode coordinates to address
function reverseGeocode(lat, lng, pointType) {
    // Use Nominatim for reverse geocoding (free and doesn't require API key)
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                const addressField = document.getElementById(`${pointType}_address`);
                if (addressField) {
                    addressField.value = data.display_name;
                }
            }
        })
        .catch(error => {
            console.error('Error reverse geocoding:', error);
        });
}

// Search for address and place marker
function searchAddress(pointType, address) {
    if (!address) return;
    
    // Use Nominatim for geocoding
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                // Get the map and markers from global state (this should be improved in a real app)
                const map = window.routePlanningState?.map;
                const markers = window.routePlanningState?.markers;
                
                if (map && markers) {
                    setMarkerPosition(map, markers, pointType, lat, lng);
                    updateCoordinateFields(pointType, lat, lng);
                    
                    // Center map on the result
                    map.setView([lat, lng], 14);
                }
            } else {
                // Address not found
                alert('Address not found. Please try a different search term.');
            }
        })
        .catch(error => {
            console.error('Error geocoding address:', error);
            alert('Error searching for address. Please try again.');
        });
}

// Initialize address search functionality
function initAddressSearch() {
    const pickupSearchBtn = document.getElementById('pickup-search-btn');
    const deliverySearchBtn = document.getElementById('delivery-search-btn');
    
    if (pickupSearchBtn) {
        pickupSearchBtn.addEventListener('click', function() {
            const addressInput = document.getElementById('pickup_address');
            if (addressInput && addressInput.value) {
                searchAddress('pickup', addressInput.value);
            }
        });
    }
    
    if (deliverySearchBtn) {
        deliverySearchBtn.addEventListener('click', function() {
            const addressInput = document.getElementById('delivery_address');
            if (addressInput && addressInput.value) {
                searchAddress('delivery', addressInput.value);
            }
        });
    }
}
