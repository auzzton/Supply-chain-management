// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Format price in rupees
function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(price);
}

// Update order statistics
function updateOrderStats(orders) {
    const totalValue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    
    document.getElementById('total-orders-value').textContent = formatPrice(totalValue);
    document.getElementById('total-orders-count').textContent = totalOrders;
    document.getElementById('pending-orders-count').textContent = pendingOrders;
}

// Fetch orders from backend
async function fetchOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

// Fetch inventory items for order creation
async function fetchInventory() {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`);
        if (!response.ok) {
            throw new Error('Failed to fetch inventory');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

// Initialize orders table
async function initializeOrdersTable() {
    const orders = await fetchOrders();
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    tableBody.innerHTML = '';
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.date}</td>
            <td>${order.items.length}</td>
            <td>${formatPrice(order.total)}</td>
            <td>${order.status}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewOrder(${order.id})">View</button>
                <button class="btn btn-sm btn-primary" onclick="editOrder(${order.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update order statistics
    updateOrderStats(orders);
}

// Populate inventory items in the order form
async function populateInventoryItems() {
    const inventory = await fetchInventory();
    const itemSelect = document.getElementById('itemSelect');
    
    if (!itemSelect) return;
    
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    inventory.forEach(item => {
        if (item.quantity > 0) {  // Only show items with available stock
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${formatPrice(item.price)})`;
            option.dataset.price = item.price;
            option.dataset.name = item.name;
            option.dataset.available = item.quantity;
            itemSelect.appendChild(option);
        }
    });
}

// Add item to order
function addItemToOrder() {
    const itemSelect = document.getElementById('itemSelect');
    const quantity = document.getElementById('itemQuantity');
    const orderItems = document.getElementById('orderItems');
    
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    if (!selectedOption.value || !quantity.value) {
        alert('Please select an item and specify quantity');
        return;
    }

    const available = parseInt(selectedOption.dataset.available);
    const requestedQty = parseInt(quantity.value);
    
    if (requestedQty > available) {
        alert(`Only ${available} units available in stock`);
        return;
    }

    const itemId = parseInt(selectedOption.value);
    const itemName = selectedOption.dataset.name;
    const price = parseFloat(selectedOption.dataset.price);
    const total = price * requestedQty;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${itemName}</td>
        <td>${requestedQty}</td>
        <td>${formatPrice(price)}</td>
        <td>${formatPrice(total)}</td>
        <td>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); updateOrderTotal();">
                Remove
            </button>
        </td>
        <input type="hidden" name="items" value='${JSON.stringify({
            itemId: itemId,
            name: itemName,
            quantity: requestedQty,
            price: price
        })}'>
    `;
    orderItems.appendChild(row);
    
    // Reset inputs
    itemSelect.value = '';
    quantity.value = '';
    
    // Update total
    updateOrderTotal();
}

// Update order total
function updateOrderTotal() {
    const items = document.getElementsByName('items');
    const total = Array.from(items).reduce((sum, item) => {
        const itemData = JSON.parse(item.value);
        return sum + (itemData.price * itemData.quantity);
    }, 0);
    
    document.getElementById('orderTotal').textContent = formatPrice(total);
}

// Create new order
async function createOrder(event) {
    event.preventDefault();
    
    const items = Array.from(document.getElementsByName('items')).map(item => JSON.parse(item.value));
    if (items.length === 0) {
        alert('Please add at least one item to the order');
        return;
    }

    const customer = document.getElementById('customer').value;
    if (!customer) {
        alert('Please enter customer name');
        return;
    }

    const order = {
        customer: customer,
        status: 'pending',  // Default status for new orders
        items: items
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('createOrderModal'));
        modal.hide();
        document.getElementById('createOrderForm').reset();
        document.getElementById('orderItems').innerHTML = '';
        document.getElementById('orderTotal').textContent = formatPrice(0);
        await initializeOrdersTable();
        alert('Order created successfully!');
    } catch (error) {
        console.error('Error creating order:', error);
        alert('Failed to create order');
    }
}

// View order details
async function viewOrder(id) {
    const orders = await fetchOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const modal = new bootstrap.Modal(document.getElementById('viewOrderModal'));
    
    document.getElementById('viewOrderId').textContent = order.id;
    document.getElementById('viewOrderCustomer').textContent = order.customer;
    document.getElementById('viewOrderDate').textContent = order.date;
    document.getElementById('viewOrderStatus').textContent = order.status;
    
    const itemsTable = document.getElementById('viewOrderItems');
    itemsTable.innerHTML = '';
    order.items.forEach(item => {
        const row = document.createElement('tr');
        const total = item.unitPrice * item.quantity;
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.unitPrice)}</td>
            <td>${formatPrice(total)}</td>
        `;
        itemsTable.appendChild(row);
    });
    
    document.getElementById('viewOrderTotal').textContent = formatPrice(order.total);
    modal.show();
}

// Edit order
async function editOrder(id) {
    const orders = await fetchOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    document.getElementById('editOrderId').value = order.id;
    document.getElementById('editOrderCustomer').value = order.customer;
    document.getElementById('editOrderStatus').value = order.status;

    const itemsTable = document.getElementById('editOrderItems');
    itemsTable.innerHTML = '';
    order.items.forEach(item => {
        const total = item.unitPrice * item.quantity;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.unitPrice)}</td>
            <td>${formatPrice(total)}</td>
            <input type="hidden" name="editItems" value='${JSON.stringify({
                itemId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.unitPrice
            })}'>
        `;
        itemsTable.appendChild(row);
    });

    const modal = new bootstrap.Modal(document.getElementById('editOrderModal'));
    modal.show();
}

// Save edited order
async function saveEditedOrder(event) {
    event.preventDefault();
    const id = document.getElementById('editOrderId').value;
    
    const items = Array.from(document.getElementsByName('editItems')).map(item => JSON.parse(item.value));
    const order = {
        customer: document.getElementById('editOrderCustomer').value,
        status: document.getElementById('editOrderStatus').value,
        items: items
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            throw new Error('Failed to update order');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('editOrderModal'));
        modal.hide();
        await initializeOrdersTable();
        alert('Order updated successfully!');
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Failed to update order');
    }
}

// Delete order
async function deleteOrder(id) {
    if (confirm('Are you sure you want to delete this order?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete order');
            }

            await initializeOrdersTable();
            alert('Order deleted successfully!');
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Failed to delete order');
        }
    }
}

// Filter orders
function filterOrders() {
    const status = document.getElementById('status-filter').value;
    const customer = document.getElementById('customer-filter').value.toLowerCase();
    const fromDate = document.getElementById('from-date').value;
    const toDate = document.getElementById('to-date').value;
    
    initializeOrdersTable().then(() => {
        const rows = document.getElementById('orders-table-body').getElementsByTagName('tr');
        
        Array.from(rows).forEach(row => {
            const orderStatus = row.cells[5].textContent;
            const orderCustomer = row.cells[1].textContent.toLowerCase();
            const orderDate = row.cells[2].textContent;
            
            let show = true;
            
            if (status !== 'all' && orderStatus !== status) show = false;
            if (customer && !orderCustomer.includes(customer)) show = false;
            if (fromDate && orderDate < fromDate) show = false;
            if (toDate && orderDate > toDate) show = false;
            
            row.style.display = show ? '' : 'none';
        });
    });
}

// Reset filters
function resetFilters() {
    document.getElementById('status-filter').value = 'all';
    document.getElementById('customer-filter').value = '';
    document.getElementById('from-date').value = '';
    document.getElementById('to-date').value = '';
    initializeOrdersTable();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize orders table
    await initializeOrdersTable();
    
    // Set up create order modal
    const createOrderBtn = document.getElementById('create-order-btn');
    const addItemBtn = document.getElementById('addItemBtn');
    const saveOrderBtn = document.getElementById('saveOrderBtn');
    
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', async () => {
            await populateInventoryItems();
            const modal = new bootstrap.Modal(document.getElementById('createOrderModal'));
            modal.show();
        });
    }
    
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addItemToOrder);
    }
    
    if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', createOrder);
    }
    
    // Set up filters
    const statusFilter = document.getElementById('status-filter');
    const fromDate = document.getElementById('from-date');
    const toDate = document.getElementById('to-date');
    const resetBtn = document.getElementById('reset-filters');
    
    [statusFilter, fromDate, toDate].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', filterOrders);
        }
    });
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
});