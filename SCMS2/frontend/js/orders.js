document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const ordersTableBody = document.getElementById('orders-table-body');
    const addOrderBtn = document.getElementById('add-order-btn');
    const orderModal = document.getElementById('order-modal');
    const editOrderModal = document.getElementById('edit-order-modal');
    const saveOrderBtn = document.getElementById('save-order');
    const orderForm = document.getElementById('order-form');
    const statusFilter = document.getElementById('status-filter');
    const dateFromFilter = document.getElementById('date-from');
    const dateToFilter = document.getElementById('date-to');
    const customerFilter = document.getElementById('customer-filter');
    const ordersSearch = document.getElementById('orders-search');
    const prevPageBtn = document.getElementById('orders-prev-page');
    const nextPageBtn = document.getElementById('orders-next-page');
    const pageInfo = document.getElementById('orders-page-info');
    const addOrderItemBtn = document.getElementById('add-order-item');
    const orderItemSelect = document.getElementById('order-item-select');
    const orderItemQuantity = document.getElementById('order-item-quantity');
    const orderItemsEditBody = document.getElementById('order-items-edit-body');
    const printOrderBtn = document.getElementById('print-order');

    // State variables
    let ordersData = [];
    let inventoryData = [];
    let filteredOrders = [];
    let currentOrderItems = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentOrderId = null;

    // Initialize the page
    initOrders();

    // Event Listeners
    addOrderBtn.addEventListener('click', () => openEditModal('add'));
    Array.from(document.getElementsByClassName('close-modal')).forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    saveOrderBtn.addEventListener('click', saveOrder);
    statusFilter.addEventListener('change', filterOrders);
    customerFilter.addEventListener('input', filterOrders);
    ordersSearch.addEventListener('input', filterOrders);
    dateFromFilter.addEventListener('change', filterOrders);
    dateToFilter.addEventListener('change', filterOrders);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    addOrderItemBtn.addEventListener('click', addOrderItem);
    printOrderBtn.addEventListener('click', printOrder);

    // Initialize Orders Page
    function initOrders() {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                ordersData = data.orders;
                inventoryData = data.inventory;
                filteredOrders = [...ordersData];
                
                // Populate inventory items dropdown
                populateInventoryItems();
                
                // Set default dates
                setDefaultDates();
                
                // Update stats
                updateOrdersStats();
                
                // Render table
                renderOrdersTable();
            })
            .catch(error => console.error('Error loading orders data:', error));
    }

    // Populate Inventory Items Dropdown
    function populateInventoryItems() {
        orderItemSelect.innerHTML = '<option value="">Select an item</option>';
        
        inventoryData.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.category}) - $${item.price.toFixed(2)}`;
            orderItemSelect.appendChild(option);
        });
    }

    // Set Default Dates
    function setDefaultDates() {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);
        
        dateFromFilter.valueAsDate = oneMonthAgo;
        dateToFilter.valueAsDate = today;
    }

    // Render Orders Table
    function renderOrdersTable() {
        ordersTableBody.innerHTML = '';
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredOrders.slice(startIndex, endIndex);
        
        if (paginatedData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" class="no-data">No orders found</td>`;
            ordersTableBody.appendChild(row);
            return;
        }
        
        paginatedData.forEach(order => {
            const row = document.createElement('tr');
            
            // Calculate total items
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
            
            // Format date
            const orderDate = new Date(order.date);
            const formattedDate = orderDate.toLocaleDateString();
            
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customer}</td>
                <td>${formattedDate}</td>
                <td>${totalItems}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td><span class="order-status ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
                <td>
                    <div class="order-actions">
                        <button class="btn-order-action btn-view-order" data-id="${order.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-order-action btn-edit-order" data-id="${order.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-order-action btn-cancel-order" data-id="${order.id}" ${order.status === 'cancelled' ? 'disabled' : ''}>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            
            ordersTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-view-order').forEach(btn => {
            btn.addEventListener('click', () => viewOrderDetails(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-edit-order').forEach(btn => {
            btn.addEventListener('click', () => openEditModal('edit', btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-cancel-order').forEach(btn => {
            btn.addEventListener('click', () => cancelOrder(btn.dataset.id));
        });
        
        // Update pagination controls
        updatePaginationControls();
    }

    // Update Orders Stats
    function updateOrdersStats() {
        const totalValue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = filteredOrders.length;
        const pendingOrders = filteredOrders.filter(order => order.status === 'pending').length;
        const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
        
        document.getElementById('total-orders-value').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('total-orders-count').textContent = totalOrders;
        document.getElementById('pending-orders-count').textContent = pendingOrders;
        document.getElementById('avg-order-value').textContent = `$${avgOrderValue.toFixed(2)}`;
    }

    // Filter Orders
    function filterOrders() {
        const status = statusFilter.value;
        const customer = customerFilter.value.toLowerCase();
        const searchTerm = ordersSearch.value.toLowerCase();
        const dateFrom = dateFromFilter.value ? new Date(dateFromFilter.value) : null;
        const dateTo = dateToFilter.value ? new Date(dateToFilter.value) : null;
        
        filteredOrders = ordersData.filter(order => {
            // Status filter
            if (status !== 'all' && order.status !== status) return false;
            
            // Customer filter
            if (customer && !order.customer.toLowerCase().includes(customer)) return false;
            
            // Date range filter
            const orderDate = new Date(order.date);
            if (dateFrom && orderDate < dateFrom) return false;
            if (dateTo && orderDate > dateTo) return false;
            
            // Search term
            if (searchTerm && !(
                order.customer.toLowerCase().includes(searchTerm) ||
                order.id.toString().includes(searchTerm) ||
                order.date.includes(searchTerm)
            )) return false;
            
            return true;
        });
        
        // Reset to first page
        currentPage = 1;
        
        // Update table and stats
        renderOrdersTable();
        updateOrdersStats();
    }

    // View Order Details
    function viewOrderDetails(orderId) {
        const order = ordersData.find(o => o.id.toString() === orderId);
        if (!order) return;
        
        // Set order details
        document.getElementById('detail-order-id').textContent = order.id;
        document.getElementById('detail-order-date').textContent = new Date(order.date).toLocaleDateString();
        document.getElementById('detail-order-status').textContent = order.status.charAt(0).toUpperCase() + order.status.slice(1);
        document.getElementById('detail-customer').textContent = order.customer;
        document.getElementById('detail-contact').textContent = order.contact || 'N/A';
        document.getElementById('detail-email').textContent = order.email || 'N/A';
        
        // Set order items
        const orderItemsBody = document.getElementById('order-items-body');
        orderItemsBody.innerHTML = '';
        
        order.items.forEach(item => {
            const product = inventoryData.find(p => p.id === item.productId);
            if (product) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.name} (${product.category})</td>
                    <td>${item.quantity}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>$${(product.price * item.quantity).toFixed(2)}</td>
                `;
                orderItemsBody.appendChild(row);
            }
        });
        
        // Set totals
        document.getElementById('order-subtotal').textContent = `$${order.total.toFixed(2)}`;
        document.getElementById('order-tax').textContent = '$0.00'; // Assuming no tax for now
        document.getElementById('order-total').textContent = `$${order.total.toFixed(2)}`;
        
        // Set notes
        document.getElementById('order-notes-text').textContent = order.notes || 'No notes available for this order.';
        
        // Update status actions
        updateStatusActions(order);
        
        // Open modal
        document.getElementById('order-modal-title').textContent = `Order #${order.id} Details`;
        orderModal.classList.add('active');
    }

    // Update Status Actions
    function updateStatusActions(order) {
        const statusActions = document.getElementById('status-actions');
        statusActions.innerHTML = '';
        
        if (order.status === 'pending') {
            const processBtn = document.createElement('button');
            processBtn.className = 'btn btn-primary';
            processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Order';
            processBtn.addEventListener('click', () => updateOrderStatus(order.id, 'processing'));
            statusActions.appendChild(processBtn);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-danger';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Order';
            cancelBtn.addEventListener('click', () => updateOrderStatus(order.id, 'cancelled'));
            statusActions.appendChild(cancelBtn);
        } else if (order.status === 'processing') {
            const completeBtn = document.createElement('button');
            completeBtn.className = 'btn btn-success';
            completeBtn.innerHTML = '<i class="fas fa-check"></i> Complete Order';
            completeBtn.addEventListener('click', () => updateOrderStatus(order.id, 'completed'));
            statusActions.appendChild(completeBtn);
        }
    }

    // Update Order Status
    function updateOrderStatus(orderId, newStatus) {
        const orderIndex = ordersData.findIndex(o => o.id.toString() === orderId);
        if (orderIndex !== -1) {
            ordersData[orderIndex].status = newStatus;
            
            // Update inventory if order is completed
            if (newStatus === 'completed') {
                const order = ordersData[orderIndex];
                order.items.forEach(item => {
                    const productIndex = inventoryData.findIndex(p => p.id === item.productId);
                    if (productIndex !== -1) {
                        inventoryData[productIndex].quantity -= item.quantity;
                    }
                });
            }
            
            // Update UI
            filterOrders();
            closeModal();
        }
    }

    // Cancel Order
    function cancelOrder(orderId) {
        if (confirm('Are you sure you want to cancel this order?')) {
            updateOrderStatus(orderId, 'cancelled');
        }
    }

    // Open Edit Order Modal
    function openEditModal(action, orderId = null) {
        currentOrderId = orderId;
        currentOrderItems = [];
        
        if (action === 'add') {
            document.getElementById('edit-order-modal-title').textContent = 'Create New Order';
            orderForm.reset();
            document.getElementById('edit-order-id').value = '';
            
            // Set default date to today
            document.getElementById('order-date').valueAsDate = new Date();
        } else if (action === 'edit' && orderId) {
            document.getElementById('edit-order-modal-title').textContent = 'Edit Order';
            const order = ordersData.find(o => o.id.toString() === orderId);
            if (order) {
                document.getElementById('edit-order-id').value = order.id;
                document.getElementById('order-customer').value = order.customer;
                document.getElementById('order-contact').value = order.contact || '';
                document.getElementById('order-email').value = order.email || '';
                document.getElementById('order-phone').value = order.phone || '';
                document.getElementById('order-address').value = order.address || '';
                document.getElementById('order-notes').value = order.notes || '';
                
                // Set order items
                currentOrderItems = [...order.items];
                renderOrderItemsEditTable();
            }
        }
        
        editOrderModal.classList.add('active');
    }

    // Add Order Item
    function addOrderItem() {
        const itemId = parseInt(orderItemSelect.value);
        const quantity = parseInt(orderItemQuantity.value);
        
        if (!itemId || isNaN(quantity) || quantity < 1) {
            alert('Please select an item and enter a valid quantity');
            return;
        }
        
        const product = inventoryData.find(p => p.id === itemId);
        if (!product) return;
        
        // Check if item already exists in order
        const existingItemIndex = currentOrderItems.findIndex(i => i.productId === itemId);
        
        if (existingItemIndex !== -1) {
            // Update quantity
            currentOrderItems[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            currentOrderItems.push({
                productId: itemId,
                quantity: quantity
            });
        }
        
        // Reset inputs
        orderItemSelect.value = '';
        orderItemQuantity.value = '1';
        
        // Update table
        renderOrderItemsEditTable();
    }

    // Render Order Items Edit Table
    function renderOrderItemsEditTable() {
        orderItemsEditBody.innerHTML = '';
        
        let subtotal = 0;
        
        currentOrderItems.forEach((item, index) => {
            const product = inventoryData.find(p => p.id === item.productId);
            if (product) {
                const itemTotal = product.price * item.quantity;
                subtotal += itemTotal;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.name} (${product.category})</td>
                    <td>${item.quantity}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>$${itemTotal.toFixed(2)}</td>
                    <td>
                        <button class="btn-remove-item" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                orderItemsEditBody.appendChild(row);
            }
        });
        
        // Calculate totals
        const tax = subtotal * 0.10; // 10% tax for example
        const total = subtotal + tax;
        
        document.getElementById('edit-order-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('edit-order-tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('edit-order-total').textContent = `$${total.toFixed(2)}`;
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', () => removeOrderItem(btn.dataset.index));
        });
    }

    // Remove Order Item
    function removeOrderItem(index) {
        currentOrderItems.splice(index, 1);
        renderOrderItemsEditTable();
    }

    // Save Order
    function saveOrder() {
        if (currentOrderItems.length === 0) {
            alert('Please add at least one item to the order');
            return;
        }
        
        const orderId = document.getElementById('edit-order-id').value;
        const customer = document.getElementById('order-customer').value;
        
        if (!customer) {
            alert('Please enter customer name');
            return;
        }
        
        // Calculate totals
        let subtotal = 0;
        currentOrderItems.forEach(item => {
            const product = inventoryData.find(p => p.id === item.productId);
            if (product) {
                subtotal += product.price * item.quantity;
            }
        });
        
        const tax = subtotal * 0.10; // 10% tax for example
        const total = subtotal + tax;
        
        const orderData = {
            id: orderId ? parseInt(orderId) : generateNewOrderId(),
            customer: customer,
            contact: document.getElementById('order-contact').value,
            email: document.getElementById('order-email').value,
            phone: document.getElementById('order-phone').value,
            address: document.getElementById('order-address').value,
            items: [...currentOrderItems],
            total: total,
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            notes: document.getElementById('order-notes').value
        };
        
        if (orderId) {
            // Update existing order
            const index = ordersData.findIndex(o => o.id.toString() === orderId);
            if (index !== -1) {
                ordersData[index] = orderData;
            }
        } else {
            // Add new order
            ordersData.unshift(orderData);
        }
        
        // Update UI
        filterOrders();
        closeModal();
    }

    // Generate New Order ID
    function generateNewOrderId() {
        return ordersData.length > 0 ? Math.max(...ordersData.map(o => o.id)) + 1 : 1001;
    }

    // Print Order
    function printOrder() {
        window.print();
    }

    // Close Modal
    function closeModal() {
        orderModal.classList.remove('active');
        editOrderModal.classList.remove('active');
    }

    // Pagination Functions
    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
        
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderOrdersTable();
        }
    }

    function goToNextPage() {
        const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderOrdersTable();
        }
    }
});