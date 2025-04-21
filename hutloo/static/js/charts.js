/**
 * Charts functionality for Hatloo Logistics using Chart.js
 */

// Initialize and render a chart
function createChart(canvasId, config) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, config);
}

// Create a line chart for time series data
function createLineChart(canvasId, labels, datasets, title = '', xAxisLabel = '', yAxisLabel = '') {
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                borderColor: dataset.color || getRandomChartColor(),
                backgroundColor: dataset.backgroundColor || 'rgba(0, 0, 0, 0)',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.1
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: !!title,
                    text: title,
                    color: '#f8f9fa',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#f8f9fa'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: !!xAxisLabel,
                        text: xAxisLabel,
                        color: '#adb5bd'
                    },
                    ticks: {
                        color: '#adb5bd'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: !!yAxisLabel,
                        text: yAxisLabel,
                        color: '#adb5bd'
                    },
                    ticks: {
                        color: '#adb5bd'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    };
    
    return createChart(canvasId, config);
}

// Create a bar chart
function createBarChart(canvasId, labels, datasets, title = '', xAxisLabel = '', yAxisLabel = '') {
    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: dataset.backgroundColor || getRandomChartColor(0.7),
                borderColor: dataset.borderColor || getRandomChartColor(),
                borderWidth: 1
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: !!title,
                    text: title,
                    color: '#f8f9fa',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    labels: {
                        color: '#f8f9fa'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: !!xAxisLabel,
                        text: xAxisLabel,
                        color: '#adb5bd'
                    },
                    ticks: {
                        color: '#adb5bd'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: !!yAxisLabel,
                        text: yAxisLabel,
                        color: '#adb5bd'
                    },
                    ticks: {
                        color: '#adb5bd'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    };
    
    return createChart(canvasId, config);
}

// Create a doughnut/pie chart
function createDoughnutChart(canvasId, labels, data, title = '', colors = []) {
    // If colors not provided, generate random colors
    if (!colors || colors.length === 0) {
        colors = labels.map(() => getRandomChartColor(0.7));
    }
    
    const config = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#2a2e33',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: !!title,
                    text: title,
                    color: '#f8f9fa',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#f8f9fa',
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            },
            cutout: '50%'
        }
    };
    
    return createChart(canvasId, config);
}

// Generate random color for charts
function getRandomChartColor(alpha = 1) {
    // Predefined colors for consistency with the app's color scheme
    const colors = [
        `rgba(0, 123, 255, ${alpha})`,    // primary
        `rgba(40, 167, 69, ${alpha})`,    // success
        `rgba(23, 162, 184, ${alpha})`,   // info
        `rgba(255, 193, 7, ${alpha})`,    // warning
        `rgba(220, 53, 69, ${alpha})`,    // danger
        `rgba(111, 66, 193, ${alpha})`,   // purple
        `rgba(32, 201, 151, ${alpha})`,   // teal
        `rgba(253, 126, 20, ${alpha})`,   // orange
        `rgba(102, 16, 242, ${alpha})`,   // indigo
        `rgba(214, 51, 132, ${alpha})`    // pink
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
}

// Create a status distribution chart
function createStatusChart(canvasId, statusData) {
    // Define colors for each status
    const statusColors = {
        'pending': 'rgba(255, 193, 7, 0.7)',
        'assigned': 'rgba(23, 162, 184, 0.7)',
        'in_transit': 'rgba(0, 123, 255, 0.7)',
        'delivered': 'rgba(40, 167, 69, 0.7)',
        'cancelled': 'rgba(220, 53, 69, 0.7)'
    };
    
    // Map status labels to proper case
    const labels = statusData.labels.map(label => 
        label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
    );
    
    // Map colors based on status labels
    const colors = statusData.labels.map(label => 
        statusColors[label.toLowerCase()] || getRandomChartColor(0.7)
    );
    
    return createDoughnutChart(
        canvasId,
        labels,
        statusData.data,
        'Order Status Distribution',
        colors
    );
}

// Create a weekly orders chart
function createWeeklyOrdersChart(canvasId, ordersData) {
    // Extract dates and counts
    const labels = ordersData.map(item => item.date);
    const data = ordersData.map(item => item.count);
    
    return createBarChart(
        canvasId,
        labels,
        [{
            label: 'Orders',
            data: data,
            backgroundColor: 'rgba(0, 123, 255, 0.7)',
            borderColor: 'rgba(0, 123, 255, 1)'
        }],
        'Weekly Order Volume',
        'Date',
        'Number of Orders'
    );
}

// Create a driver performance chart
function createDriverPerformanceChart(canvasId, driversData) {
    // Extract driver names and metrics
    const labels = driversData.map(driver => driver.driver_name);
    const completedOrders = driversData.map(driver => driver.completed_orders);
    const onTimeRatios = driversData.map(driver => driver.on_time_ratio);
    
    return createBarChart(
        canvasId,
        labels,
        [
            {
                label: 'Completed Orders',
                data: completedOrders,
                backgroundColor: 'rgba(40, 167, 69, 0.7)',
                borderColor: 'rgba(40, 167, 69, 1)'
            },
            {
                label: 'On-Time Delivery %',
                data: onTimeRatios,
                backgroundColor: 'rgba(0, 123, 255, 0.7)',
                borderColor: 'rgba(0, 123, 255, 1)'
            }
        ],
        'Driver Performance',
        'Driver',
        'Count / Percentage'
    );
}

// Create a delivery time chart
function createDeliveryTimeChart(canvasId, timeData) {
    // Extract dates and times
    const labels = timeData.map(item => item.date);
    const avgTimes = timeData.map(item => item.avg_time);
    
    return createLineChart(
        canvasId,
        labels,
        [{
            label: 'Average Delivery Time (hours)',
            data: avgTimes,
            color: 'rgba(23, 162, 184, 1)',
            backgroundColor: 'rgba(23, 162, 184, 0.1)'
        }],
        'Average Delivery Times',
        'Date',
        'Hours'
    );
}
