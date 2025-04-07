// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initDashboard();
    
    // Load data from JSON file
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Update dashboard with real data
            updateDashboard(data);
            
            // Initialize charts
            initCharts(data);
            
            // Populate recent activity
            populateActivity(data.activity);
        })
        .catch(error => console.error('Error loading data:', error));
});

// Initialize Dashboard
function initDashboard() {
    // Add event listeners
    document.querySelector('.notifications').addEventListener('click', showNotifications);
    
    // Initialize tooltips
    initTooltips();
}

// Update Dashboard with Data
function updateDashboard(data) {
    // Inventory Summary
    document.getElementById('total-items').textContent = data.inventory.length;
    document.getElementById('low-stock').textContent = data.inventory.filter(item => item.quantity < item.reorderLevel).length;
    document.getElementById('out-of-stock').textContent = data.inventory.filter(item => item.quantity === 0).length;
    
    // Orders Summary
    document.getElementById('pending-orders').textContent = data.orders.filter(order => order.status === 'pending').length;
    document.getElementById('completed-orders').textContent = data.orders.filter(order => order.status === 'completed').length;
    document.getElementById('cancelled-orders').textContent = data.orders.filter(order => order.status === 'cancelled').length;
}

// Initialize Charts
function initCharts(data) {
    const ctx = document.getElementById('inventoryChart').getContext('2d');
    
    // Prepare data for chart
    const categories = [...new Set(data.inventory.map(item => item.category))];
    const quantities = categories.map(category => {
        return data.inventory.filter(item => item.category === category)
            .reduce((sum, item) => sum + item.quantity, 0);
    });
    
    // Create chart
    const inventoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Inventory Quantity',
                data: quantities,
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(230, 126, 34, 0.7)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(230, 126, 34, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Update chart based on timeframe selection
    document.getElementById('chart-timeframe').addEventListener('change', function() {
        // In a real app, you would fetch different data based on the timeframe
        console.log('Timeframe changed to:', this.value);
    });
}

// Populate Recent Activity
function populateActivity(activities) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';
    
    // Show only the last 5 activities
    const recentActivities = activities.slice(0, 5);
    
    recentActivities.forEach(activity => {
        const li = document.createElement('li');
        
        // Determine icon based on activity type
        let iconClass = 'fas fa-info-circle';
        if (activity.type === 'order') iconClass = 'fas fa-clipboard-list';
        else if (activity.type === 'inventory') iconClass = 'fas fa-box-open';
        else if (activity.type === 'supplier') iconClass = 'fas fa-truck';
        
        li.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${activity.message}</span>
            <small class="activity-time">${formatTime(activity.timestamp)}</small>
        `;
        
        activityList.appendChild(li);
    });
}

// Format Timestamp
function formatTime(timestamp) {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diffInHours = (now - activityDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return activityDate.toLocaleTimeString();
    } else {
        return activityDate.toLocaleDateString();
    }
}

// Show Notifications
function showNotifications() {
    // In a real app, this would show a dropdown or modal with notifications
    alert('You have 3 new notifications');
}

// Initialize Tooltips
function initTooltips() {
    // This would initialize tooltips using a library like Tippy.js in a real app
    console.log('Tooltips initialized');
}

// Generate Report
function generateReport() {
    // In a real app, this would generate and download a report
    console.log('Generating report...');
    alert('Report generation started. You will receive it shortly.');
}

// Export functions needed in other files
window.utils = {
    formatTime,
    showNotifications
};