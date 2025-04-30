// Global variable to track if we're on the dashboard
let isDashboardPage = false;

// Check if we're on the dashboard page
function checkDashboardPage() {
    const currentPath = window.location.pathname;
    isDashboardPage = currentPath.endsWith('dashboard.html') || currentPath.endsWith('/');
    return isDashboardPage;
}

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', function() {
    if (checkDashboardPage()) {
        initializeDashboard();
    }
});

// Handle page navigation
window.addEventListener('popstate', function() {
    if (checkDashboardPage()) {
        initializeDashboard();
    }
});

// Initialize dashboard components
function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Refresh button
    const refreshButton = document.getElementById('refreshDashboard');
    if (refreshButton) {
        refreshButton.removeEventListener('click', loadDashboardData);
        refreshButton.addEventListener('click', loadDashboardData);
    }
    
    // Date range filter
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.removeEventListener('change', loadDashboardData);
        dateRange.addEventListener('change', loadDashboardData);
    }
}

async function loadDashboardData() {
    if (!isDashboardPage) return;
    
    console.log('Loading dashboard data...');
    
    try {
        // Get date range
        const dateRange = document.getElementById('dateRange')?.value || 'month';
        
        // Show loading state
        document.querySelectorAll('.stat-card .value').forEach(el => {
            el.textContent = '...';
        });
        
        // Load all data in parallel
        const [inventoryData, ordersData, suppliersData, warehousesData] = await Promise.all([
            fetch('/api/inventory').then(res => res.json()),
            fetch('/api/orders').then(res => res.json()),
            fetch('/api/suppliers').then(res => res.json()),
            fetch('/api/warehouses').then(res => res.json())
        ]);

        console.log('Data loaded:', {
            inventory: inventoryData.length,
            orders: ordersData.length,
            suppliers: suppliersData.length,
            warehouses: warehousesData.length
        });

        // Update statistics
        updateStatistics(inventoryData, ordersData, suppliersData, warehousesData);
        
        // Update charts
        updateCharts(inventoryData, ordersData);
        
        // Update recent activity
        updateRecentActivity(ordersData);
        
        // Update low stock alerts
        updateLowStockAlerts(inventoryData);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data. Please try again.');
    }
}

function updateStatistics(inventory, orders, suppliers, warehouses) {
    // Total Inventory Value
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const inventoryValueElement = document.getElementById('totalInventoryValue');
    if (inventoryValueElement) {
        inventoryValueElement.textContent = `$${totalInventoryValue.toFixed(2)}`;
    }
    
    // Total Orders
    const totalOrdersElement = document.getElementById('totalOrders');
    if (totalOrdersElement) {
        totalOrdersElement.textContent = orders.length;
    }
    
    // Pending Orders
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const pendingOrdersElement = document.getElementById('pendingOrders');
    if (pendingOrdersElement) {
        pendingOrdersElement.textContent = pendingOrders;
    }
    
    // Total Suppliers
    const totalSuppliersElement = document.getElementById('totalSuppliers');
    if (totalSuppliersElement) {
        totalSuppliersElement.textContent = suppliers.length;
    }
    
    // Warehouse Capacity
    const totalCapacity = warehouses.reduce((sum, wh) => sum + wh.capacity, 0);
    const usedCapacity = warehouses.reduce((sum, wh) => sum + wh.usedCapacity, 0);
    const capacityPercentage = totalCapacity > 0 ? (usedCapacity / totalCapacity * 100).toFixed(1) : '0';
    const warehouseCapacityElement = document.getElementById('warehouseCapacity');
    if (warehouseCapacityElement) {
        warehouseCapacityElement.textContent = `${capacityPercentage}%`;
    }
}

function updateCharts(inventory, orders) {
    console.log('Received inventory data:', inventory);
    
    // Update inventory by category chart
    const categoryData = {};
    
    // Initialize all known categories with 0
    const knownCategories = ['Electronics', 'Furniture', 'Sports', 'Office Supplies', 'Clothing'];
    knownCategories.forEach(category => {
        categoryData[category] = 0;
    });
    
    // Count items in each category
    inventory.forEach(item => {
        const category = item.category || 'Uncategorized';
        console.log('Processing item:', item.name, 'Category:', category);
        categoryData[category] = (categoryData[category] || 0) + item.quantity;
    });
    
    console.log('Category data after processing:', categoryData);
    
    // Update order trends chart
    const orderTrends = {};
    orders.forEach(order => {
        const date = new Date(order.date).toLocaleDateString();
        orderTrends[date] = (orderTrends[date] || 0) + 1;
    });

    // Sort dates for order trends
    const sortedDates = Object.keys(orderTrends).sort((a, b) => new Date(a) - new Date(b));
    const sortedOrderTrends = {};
    sortedDates.forEach(date => {
        sortedOrderTrends[date] = orderTrends[date];
    });
    
    // Initialize or update charts if they exist
    const inventoryChart = document.getElementById('inventoryChart');
    const orderTrendsChart = document.getElementById('orderTrendsChart');
    
    if (inventoryChart) {
        // Destroy existing chart if it exists
        if (window.inventoryChartInstance) {
            window.inventoryChartInstance.destroy();
        }
        
        // Create new chart
        const ctx = inventoryChart.getContext('2d');
        window.inventoryChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    label: 'Items by Category',
                    data: Object.values(categoryData),
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.5)',  // Electronics
                        'rgba(255, 99, 132, 0.5)',  // Furniture
                        'rgba(75, 192, 192, 0.5)',  // Sports
                        'rgba(255, 206, 86, 0.5)',  // Office Supplies
                        'rgba(153, 102, 255, 0.5)', // Clothing
                        'rgba(255, 159, 64, 0.5)'   // Uncategorized
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    
    if (orderTrendsChart) {
        // Destroy existing chart if it exists
        if (window.orderTrendsChartInstance) {
            window.orderTrendsChartInstance.destroy();
        }
        
        // Create new chart
        const ctx = orderTrendsChart.getContext('2d');
        window.orderTrendsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(sortedOrderTrends),
                datasets: [{
                    label: 'Orders by Date',
                    data: Object.values(sortedOrderTrends),
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
}

function updateRecentActivity(orders) {
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    // Sort orders by date, newest first
    const recentOrders = orders
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    recentOrders.forEach(order => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${order.customer}</strong>
                    <br>
                    <small class="text-muted">Order #${order.id} - ${order.status}</small>
                </div>
                <span class="badge bg-${getStatusBadgeColor(order.status)}">
                    ${order.status}
                </span>
            </div>
        `;
        activityList.appendChild(li);
    });
}

function updateLowStockAlerts(inventory) {
    const alertsList = document.getElementById('lowStockAlerts');
    if (!alertsList) return;
    
    alertsList.innerHTML = '';
    
    const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel);
    
    if (lowStockItems.length === 0) {
        alertsList.innerHTML = '<li class="list-group-item">No low stock alerts</li>';
        return;
    }
    
    lowStockItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${item.name}</strong>
                    <br>
                    <small class="text-muted">Current: ${item.quantity} | Reorder Level: ${item.reorderLevel}</small>
                </div>
                <span class="badge bg-warning">Low Stock</span>
            </div>
        `;
        alertsList.appendChild(li);
    });
}

function getStatusBadgeColor(status) {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'processing':
            return 'info';
        case 'cancelled':
            return 'danger';
        default:
            return 'secondary';
    }
}

function showError(message) {
    // You can implement a toast or alert system here
    alert(message);
} 