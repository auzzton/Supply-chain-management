// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Format price in rupees
function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(price);
}

// Update inventory statistics
function updateInventoryStats(inventory) {
    const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => item.quantity > 0 && item.quantity <= (item.reorderLevel || 10)).length;
    const outOfStock = inventory.filter(item => item.quantity === 0).length;

    document.getElementById('total-inventory-value').textContent = formatPrice(totalValue);
    document.getElementById('total-items-count').textContent = totalItems;
    document.getElementById('low-stock-count').textContent = lowStockItems;
    document.getElementById('out-of-stock-count').textContent = outOfStock;
}

// Fetch inventory data from backend
async function fetchInventory() {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`);
        if (!response.ok) {
            throw new Error('Failed to fetch inventory data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

// Populate filter dropdowns
async function populateFilters(inventory) {
    const categorySelect = document.getElementById('category-filter');
    const warehouseSelect = document.getElementById('warehouse-filter');
    
    // Get unique categories and warehouses
    const categories = [...new Set(inventory.map(item => item.category))];
    const warehouses = [...new Set(inventory.map(item => item.warehouse).filter(Boolean))];
    
    // Clear existing options except the first one
    while (categorySelect.options.length > 1) categorySelect.remove(1);
    while (warehouseSelect.options.length > 1) warehouseSelect.remove(1);
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Add warehouse options
    warehouses.forEach(warehouse => {
        const option = document.createElement('option');
        option.value = warehouse;
        option.textContent = warehouse;
        warehouseSelect.appendChild(option);
    });
}

// Filter inventory items
function filterInventory(inventory) {
    const categoryFilter = document.getElementById('category-filter').value;
    const warehouseFilter = document.getElementById('warehouse-filter').value;
    const stockFilter = document.getElementById('stock-filter').value;
    const searchQuery = document.getElementById('inventory-search').value.toLowerCase();

    return inventory.filter(item => {
        // Category filter
        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
            return false;
        }

        // Warehouse filter
        if (warehouseFilter !== 'all' && item.warehouse !== warehouseFilter) {
            return false;
        }

        // Stock status filter
        const isLowStock = item.quantity > 0 && item.quantity <= (item.reorderLevel || 10);
        const isOutOfStock = item.quantity === 0;
        
        if (stockFilter === 'low-stock' && !isLowStock) return false;
        if (stockFilter === 'out-of-stock' && !isOutOfStock) return false;
        if (stockFilter === 'in-stock' && (isLowStock || isOutOfStock)) return false;

        // Search filter
        if (searchQuery) {
            const searchableFields = [
                item.name,
                item.category,
                item.warehouse,
                item.id.toString()
            ];
            return searchableFields.some(field => 
                field && field.toLowerCase().includes(searchQuery)
            );
        }

        return true;
    });
}

// Initialize inventory table
async function initializeInventoryTable() {
    const inventory = await fetchInventory();
    const filteredInventory = filterInventory(inventory);
    const tableBody = document.getElementById('inventory-table-body');
    
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    tableBody.innerHTML = '';
    filteredInventory.forEach(item => {
        const row = document.createElement('tr');
        const itemValue = item.price * item.quantity;
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.price)}</td>
            <td>${formatPrice(itemValue)}</td>
            <td>${item.warehouse || '-'}</td>
            <td>${item.quantity === 0 ? 'Out of Stock' : item.quantity <= (item.reorderLevel || 10) ? 'Low Stock' : 'In Stock'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editInventoryItem(${item.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteInventoryItem(${item.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update inventory statistics
    updateInventoryStats(inventory);
    
    // Populate filter dropdowns
    await populateFilters(inventory);
}

// Add new inventory item
async function addNewInventoryItem(event) {
    event.preventDefault();
    const item = {
        name: document.getElementById('newItemName').value,
        category: document.getElementById('newItemCategory').value,
        quantity: parseInt(document.getElementById('newItemQuantity').value),
        price: parseFloat(document.getElementById('newItemPrice').value),
        reorderLevel: parseInt(document.getElementById('newItemReorderLevel').value),
        warehouse: document.getElementById('newItemWarehouse').value,
        supplier: document.getElementById('newItemSupplier').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item)
        });

        if (!response.ok) {
            throw new Error('Failed to add inventory item');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('addInventoryModal'));
        modal.hide();
        document.getElementById('addInventoryForm').reset();
        await initializeInventoryTable();
    } catch (error) {
        console.error('Error adding inventory item:', error);
        alert('Failed to add inventory item');
    }
}

// Edit inventory item
async function editInventoryItem(id) {
    const inventory = await fetchInventory();
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemCategory').value = item.category;
    document.getElementById('editItemQuantity').value = item.quantity;
    document.getElementById('editItemPrice').value = item.price;
    document.getElementById('editItemWarehouse').value = item.warehouse || '';
    document.getElementById('editItemSupplier').value = item.supplier || '';

    const modal = new bootstrap.Modal(document.getElementById('editInventoryModal'));
    modal.show();
}

// Save edited inventory item
async function saveEditedInventoryItem(event) {
    event.preventDefault();
    const id = document.getElementById('editItemId').value;
    const item = {
        name: document.getElementById('editItemName').value,
        category: document.getElementById('editItemCategory').value,
        quantity: parseInt(document.getElementById('editItemQuantity').value),
        price: parseFloat(document.getElementById('editItemPrice').value),
        warehouse: document.getElementById('editItemWarehouse').value,
        supplier: document.getElementById('editItemSupplier').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item)
        });

        if (!response.ok) {
            throw new Error('Failed to update inventory item');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('editInventoryModal'));
        modal.hide();
        await initializeInventoryTable();
    } catch (error) {
        console.error('Error updating inventory item:', error);
        alert('Failed to update inventory item');
    }
}

// Delete inventory item
async function deleteInventoryItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete inventory item');
            }

            await initializeInventoryTable();
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            alert('Failed to delete inventory item');
        }
    }
}

// Reset filters
function resetFilters() {
    document.getElementById('category-filter').value = 'all';
    document.getElementById('warehouse-filter').value = 'all';
    document.getElementById('stock-filter').value = 'all';
    document.getElementById('inventory-search').value = '';
    initializeInventoryTable();
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize inventory table
    initializeInventoryTable();
    
    // Add event listeners
    document.getElementById('add-inventory-btn').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('addInventoryModal'));
        modal.show();
    });

    document.getElementById('addInventoryForm').addEventListener('submit', addNewInventoryItem);
    document.getElementById('editInventoryForm').addEventListener('submit', saveEditedInventoryItem);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Add filter and search event listeners
    document.getElementById('category-filter').addEventListener('change', initializeInventoryTable);
    document.getElementById('warehouse-filter').addEventListener('change', initializeInventoryTable);
    document.getElementById('stock-filter').addEventListener('change', initializeInventoryTable);
    document.getElementById('inventory-search').addEventListener('input', initializeInventoryTable);
});