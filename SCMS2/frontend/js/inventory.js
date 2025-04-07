document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const addInventoryBtn = document.getElementById('add-inventory-btn');
    const inventoryModal = document.getElementById('inventory-modal');
    const deleteModal = document.getElementById('delete-modal');
    const saveInventoryBtn = document.getElementById('save-inventory');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const inventoryForm = document.getElementById('inventory-form');
    const categoryFilter = document.getElementById('category-filter');
    const warehouseFilter = document.getElementById('warehouse-filter');
    const stockFilter = document.getElementById('stock-filter');
    const inventorySearch = document.getElementById('inventory-search');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    // State variables
    let inventoryData = [];
    let filteredData = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let itemToDelete = null;
    
    // Initialize the page
    initInventory();
    
    // Event Listeners
    addInventoryBtn.addEventListener('click', () => openModal('add'));
    Array.from(document.getElementsByClassName('close-modal')).forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    saveInventoryBtn.addEventListener('click', saveInventoryItem);
    confirmDeleteBtn.addEventListener('click', deleteInventoryItem);
    categoryFilter.addEventListener('change', filterInventory);
    warehouseFilter.addEventListener('change', filterInventory);
    stockFilter.addEventListener('change', filterInventory);
    inventorySearch.addEventListener('input', filterInventory);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    
    // Initialize Inventory Page
    function initInventory() {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                inventoryData = data.inventory;
                filteredData = [...inventoryData];
                
                // Populate filters
                populateFilters(data);
                
                // Update stats
                updateInventoryStats();
                
                // Render table
                renderInventoryTable();
            })
            .catch(error => console.error('Error loading inventory data:', error));
    }
    
    // Populate Filter Dropdowns
    function populateFilters(data) {
        // Categories
        const categories = [...new Set(data.inventory.map(item => item.category))];
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
            
            // Also add to modal category dropdown
            const modalOption = document.createElement('option');
            modalOption.value = category;
            modalOption.textContent = category;
            document.getElementById('item-category').appendChild(modalOption);
        });
        
        // Warehouses
        const warehouses = [...new Set(data.inventory.map(item => item.warehouse))];
        warehouses.forEach(warehouse => {
            const option = document.createElement('option');
            option.value = warehouse;
            option.textContent = warehouse;
            warehouseFilter.appendChild(option);
            
            // Also add to modal warehouse dropdown
            const modalOption = document.createElement('option');
            modalOption.value = warehouse;
            modalOption.textContent = warehouse;
            document.getElementById('item-warehouse').appendChild(modalOption);
        });
    }
    
    // Render Inventory Table
    function renderInventoryTable() {
        inventoryTableBody.innerHTML = '';
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        if (paginatedData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="9" class="no-data">No inventory items found</td>`;
            inventoryTableBody.appendChild(row);
            return;
        }
        
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            
            // Determine stock status
            let statusClass, statusText;
            if (item.quantity === 0) {
                statusClass = 'out-of-stock';
                statusText = 'Out of Stock';
            } else if (item.quantity < item.reorderLevel) {
                statusClass = 'low-stock';
                statusText = 'Low Stock';
            } else {
                statusClass = 'in-stock';
                statusText = 'In Stock';
            }
            
            // Calculate total value
            const totalValue = item.quantity * item.price;
            
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${totalValue.toFixed(2)}</td>
                <td>${item.warehouse}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-table btn-edit" data-id="${item.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-table btn-delete" data-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            inventoryTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openModal('edit', btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
        });
        
        // Update pagination controls
        updatePaginationControls();
    }
    
    // Update Inventory Stats
    function updateInventoryStats() {
        const totalValue = filteredData.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const totalItems = filteredData.length;
        const lowStockItems = filteredData.filter(item => item.quantity > 0 && item.quantity < item.reorderLevel).length;
        const outOfStockItems = filteredData.filter(item => item.quantity === 0).length;
        
        document.getElementById('total-inventory-value').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('total-items-count').textContent = totalItems;
        document.getElementById('low-stock-count').textContent = lowStockItems;
        document.getElementById('out-of-stock-count').textContent = outOfStockItems;
    }
    
    // Filter Inventory
    function filterInventory() {
        const category = categoryFilter.value;
        const warehouse = warehouseFilter.value;
        const stockStatus = stockFilter.value;
        const searchTerm = inventorySearch.value.toLowerCase();
        
        filteredData = inventoryData.filter(item => {
            // Category filter
            if (category !== 'all' && item.category !== category) return false;
            
            // Warehouse filter
            if (warehouse !== 'all' && item.warehouse !== warehouse) return false;
            
            // Stock status filter
            if (stockStatus !== 'all') {
                if (stockStatus === 'in-stock' && (item.quantity === 0 || item.quantity < item.reorderLevel)) return false;
                if (stockStatus === 'low-stock' && (item.quantity === 0 || item.quantity >= item.reorderLevel)) return false;
                if (stockStatus === 'out-of-stock' && item.quantity !== 0) return false;
            }
            
            // Search term
            if (searchTerm && !(
                item.name.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm) ||
                item.warehouse.toLowerCase().includes(searchTerm) ||
                item.id.toString().includes(searchTerm)
            )) return false;
            
            return true;
        });
        
        // Reset to first page
        currentPage = 1;
        
        // Update table and stats
        renderInventoryTable();
        updateInventoryStats();
    }
    
    // Open Modal
    function openModal(action, itemId = null) {
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('inventory-form');
        
        if (action === 'add') {
            modalTitle.textContent = 'Add New Inventory Item';
            form.reset();
            document.getElementById('item-id').value = '';
        } else if (action === 'edit' && itemId) {
            modalTitle.textContent = 'Edit Inventory Item';
            const item = inventoryData.find(i => i.id.toString() === itemId);
            if (item) {
                document.getElementById('item-id').value = item.id;
                document.getElementById('item-name').value = item.name;
                document.getElementById('item-category').value = item.category;
                document.getElementById('item-quantity').value = item.quantity;
                document.getElementById('item-price').value = item.price;
                document.getElementById('item-reorder').value = item.reorderLevel;
                document.getElementById('item-warehouse').value = item.warehouse;
                document.getElementById('item-description').value = item.description || '';
            }
        }
        
        inventoryModal.classList.add('active');
    }
    
    // Close Modal
    function closeModal() {
        inventoryModal.classList.remove('active');
        deleteModal.classList.remove('active');
    }
    
    // Confirm Delete
    function confirmDelete(itemId) {
        itemToDelete = itemId;
        deleteModal.classList.add('active');
    }
    
    // Save Inventory Item
    function saveInventoryItem() {
        if (!inventoryForm.checkValidity()) {
            inventoryForm.reportValidity();
            return;
        }
        
        const itemId = document.getElementById('item-id').value;
        const itemData = {
            id: itemId ? parseInt(itemId) : generateNewId(),
            name: document.getElementById('item-name').value,
            category: document.getElementById('item-category').value,
            quantity: parseInt(document.getElementById('item-quantity').value),
            price: parseFloat(document.getElementById('item-price').value),
            reorderLevel: parseInt(document.getElementById('item-reorder').value),
            warehouse: document.getElementById('item-warehouse').value,
            description: document.getElementById('item-description').value
        };
        
        if (itemId) {
            // Update existing item
            const index = inventoryData.findIndex(item => item.id.toString() === itemId);
            if (index !== -1) {
                inventoryData[index] = itemData;
            }
        } else {
            // Add new item
            inventoryData.unshift(itemData);
        }
        
        // Update filtered data and UI
        filterInventory();
        closeModal();
    }
    
    // Delete Inventory Item
    function deleteInventoryItem() {
        if (itemToDelete) {
            inventoryData = inventoryData.filter(item => item.id.toString() !== itemToDelete);
            filterInventory();
            closeModal();
            itemToDelete = null;
        }
    }
    
    // Generate New ID
    function generateNewId() {
        return inventoryData.length > 0 ? Math.max(...inventoryData.map(item => item.id)) + 1 : 1;
    }
    
    // Pagination Functions
    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
    
    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderInventoryTable();
        }
    }
    
    function goToNextPage() {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderInventoryTable();
        }
    }
});