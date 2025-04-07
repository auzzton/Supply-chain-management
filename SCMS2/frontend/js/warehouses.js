document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const warehousesTableBody = document.getElementById('warehouses-table-body');
    const addWarehouseBtn = document.getElementById('add-warehouse-btn');
    const warehouseModal = document.getElementById('warehouse-modal');
    const warehouseDetailsModal = document.getElementById('warehouse-details-modal');
    const saveWarehouseBtn = document.getElementById('save-warehouse');
    const warehouseForm = document.getElementById('warehouse-form');
    const locationFilter = document.getElementById('location-filter');
    const capacityFilter = document.getElementById('capacity-filter');
    const warehousesSearch = document.getElementById('warehouses-search');
    const prevPageBtn = document.getElementById('warehouses-prev-page');
    const nextPageBtn = document.getElementById('warehouses-next-page');
    const pageInfo = document.getElementById('warehouses-page-info');

    // State variables
    let warehousesData = [];
    let inventoryData = [];
    let filteredWarehouses = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // Initialize the page
    initWarehouses();

    // Event Listeners
    addWarehouseBtn.addEventListener('click', () => openWarehouseModal('add'));
    Array.from(document.getElementsByClassName('close-modal')).forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    saveWarehouseBtn.addEventListener('click', saveWarehouse);
    locationFilter.addEventListener('change', filterWarehouses);
    capacityFilter.addEventListener('change', filterWarehouses);
    warehousesSearch.addEventListener('input', filterWarehouses);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    document.getElementById('reset-warehouses-filters').addEventListener('click', resetFilters);
    document.getElementById('print-warehouse-details').addEventListener('click', printWarehouseDetails);

    // Initialize Warehouses Page
    function initWarehouses() {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                warehousesData = data.warehouses;
                inventoryData = data.inventory;
                filteredWarehouses = [...warehousesData];
                
                // Populate location filter
                populateLocationFilter();
                
                // Update stats
                updateWarehousesStats();
                
                // Render table
                renderWarehousesTable();
                
                // In a real app, you would initialize the map here
                // initWarehouseMap();
            })
            .catch(error => console.error('Error loading warehouses data:', error));
    }

    // Populate Location Filter
    function populateLocationFilter() {
        const locations = [...new Set(warehousesData.map(warehouse => warehouse.location))];
        
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationFilter.appendChild(option);
        });
    }

    // Render Warehouses Table
    function renderWarehousesTable() {
        warehousesTableBody.innerHTML = '';
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredWarehouses.slice(startIndex, endIndex);
        
        if (paginatedData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="8" class="no-data">No warehouses found</td>`;
            warehousesTableBody.appendChild(row);
            return;
        }
        
        paginatedData.forEach(warehouse => {
            const row = document.createElement('tr');
            
            // Calculate utilization (random for demo, in real app would be based on inventory)
            const utilization = Math.floor(Math.random() * 100);
            let utilizationClass = 'low';
            if (utilization > 75) utilizationClass = 'high';
            else if (utilization > 50) utilizationClass = 'medium';
            
            row.innerHTML = `
                <td>${warehouse.id}</td>
                <td>${warehouse.name}</td>
                <td>${warehouse.location}</td>
                <td>${warehouse.capacity.toLocaleString()} sq ft</td>
                <td>
                    ${utilization}%
                    <div class="utilization-bar">
                        <div class="utilization-fill utilization-${utilizationClass}"></div>
                    </div>
                </td>
                <td>${warehouse.manager}</td>
                <td><span class="warehouse-status ${warehouse.status}">${warehouse.status.charAt(0).toUpperCase() + warehouse.status.slice(1)}</span></td>
                <td>
                    <div class="warehouse-actions">
                        <button class="btn-warehouse-action btn-view-warehouse" data-id="${warehouse.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-warehouse-action btn-edit-warehouse" data-id="${warehouse.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-warehouse-action btn-delete-warehouse" data-id="${warehouse.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            warehousesTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-view-warehouse').forEach(btn => {
            btn.addEventListener('click', () => viewWarehouseDetails(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-edit-warehouse').forEach(btn => {
            btn.addEventListener('click', () => openWarehouseModal('edit', btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete-warehouse').forEach(btn => {
            btn.addEventListener('click', () => deleteWarehouse(btn.dataset.id));
        });
        
        // Update pagination controls
        updatePaginationControls();
    }

    // Update Warehouses Stats
    function updateWarehousesStats() {
        const totalWarehouses = filteredWarehouses.length;
        const totalCapacity = filteredWarehouses.reduce((sum, warehouse) => sum + warehouse.capacity, 0);
        const avgUtilization = totalWarehouses > 0 ? 
            Math.floor(filteredWarehouses.reduce((sum, warehouse) => sum + Math.floor(Math.random() * 100), 0) / totalWarehouses) : 0;
        
        // Count items in warehouses (in a real app, this would be based on actual inventory data)
        let itemsInWarehouses = 0;
        filteredWarehouses.forEach(warehouse => {
            itemsInWarehouses += inventoryData.filter(item => item.warehouse === warehouse.name).length;
        });
        
        document.getElementById('total-warehouses').textContent = totalWarehouses;
        document.getElementById('total-capacity').textContent = totalCapacity.toLocaleString();
        document.getElementById('avg-utilization').textContent = `${avgUtilization.toFixed(0)}%`;
        document.getElementById('items-in-warehouses').textContent = itemsInWarehouses;
    }

    // Filter Warehouses
    function filterWarehouses() {
        const location = locationFilter.value;
        const capacity = capacityFilter.value;
        const searchTerm = warehousesSearch.value.toLowerCase();
        
        filteredWarehouses = warehousesData.filter(warehouse => {
            // Location filter
            if (location !== 'all' && warehouse.location !== location) return false;
            
            // Capacity filter (random utilization for demo)
            const utilization = Math.floor(Math.random() * 100);
            if (capacity !== 'all') {
                if (capacity === 'high' && utilization <= 75) return false;
                if (capacity === 'medium' && (utilization <= 50 || utilization > 75)) return false;
                if (capacity === 'low' && utilization > 50) return false;
            }
            
            // Search term
            if (searchTerm && !(
                warehouse.name.toLowerCase().includes(searchTerm) ||
                warehouse.location.toLowerCase().includes(searchTerm) ||
                warehouse.manager.toLowerCase().includes(searchTerm) ||
                warehouse.id.toString().includes(searchTerm)
            )) return false;
            
            return true;
        });
        
        // Reset to first page
        currentPage = 1;
        
        // Update table and stats
        renderWarehousesTable();
        updateWarehousesStats();
    }

    // Reset Filters
    function resetFilters() {
        locationFilter.value = 'all';
        capacityFilter.value = 'all';
        warehousesSearch.value = '';
        filterWarehouses();
    }

    // Open Warehouse Modal
    function openWarehouseModal(action, warehouseId = null) {
        const modalTitle = document.getElementById('warehouse-modal-title');
        const form = document.getElementById('warehouse-form');
        
        if (action === 'add') {
            modalTitle.textContent = 'Add New Warehouse';
            form.reset();
            document.getElementById('warehouse-id').value = '';
            document.getElementById('warehouse-status').value = 'active';
        } else if (action === 'edit' && warehouseId) {
            modalTitle.textContent = 'Edit Warehouse';
            const warehouse = warehousesData.find(w => w.id.toString() === warehouseId);
            if (warehouse) {
                document.getElementById('warehouse-id').value = warehouse.id;
                document.getElementById('warehouse-name').value = warehouse.name;
                document.getElementById('warehouse-location').value = warehouse.location;
                document.getElementById('warehouse-capacity').value = warehouse.capacity;
                document.getElementById('warehouse-manager').value = warehouse.manager;
                document.getElementById('warehouse-contact').value = warehouse.contact;
                document.getElementById('warehouse-status').value = warehouse.status;
                document.getElementById('warehouse-description').value = warehouse.description || '';
            }
        }
        
        warehouseModal.classList.add('active');
    }

    // View Warehouse Details
    function viewWarehouseDetails(warehouseId) {
        const warehouse = warehousesData.find(w => w.id.toString() === warehouseId);
        if (!warehouse) return;
        
        // Set warehouse details
        document.getElementById('detail-warehouse-id').textContent = warehouse.id;
        document.getElementById('detail-warehouse-name').textContent = warehouse.name;
        document.getElementById('detail-warehouse-location').textContent = warehouse.location;
        document.getElementById('detail-warehouse-status').textContent = warehouse.status.charAt(0).toUpperCase() + warehouse.status.slice(1);
        document.getElementById('detail-warehouse-capacity').textContent = warehouse.capacity.toLocaleString();
        
        // Random utilization for demo
        const utilization = Math.floor(Math.random() * 100);
        document.getElementById('detail-warehouse-utilization').textContent = `${utilization}%`;
        
        document.getElementById('detail-warehouse-manager').textContent = warehouse.manager;
        document.getElementById('detail-warehouse-contact').textContent = warehouse.contact;
        
        // Set inventory in this warehouse
        const warehouseInventoryBody = document.getElementById('warehouse-inventory-body');
        warehouseInventoryBody.innerHTML = '';
        
        const inventoryInWarehouse = inventoryData.filter(item => item.warehouse === warehouse.name);
        
        if (inventoryInWarehouse.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" class="no-data">No inventory in this warehouse</td>`;
            warehouseInventoryBody.appendChild(row);
        } else {
            inventoryInWarehouse.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.quantity}</td>
                    <td>$${(item.quantity * item.price).toFixed(2)}</td>
                `;
                warehouseInventoryBody.appendChild(row);
            });
        }
        
        // Open modal
        document.getElementById('warehouse-details-title').textContent = `${warehouse.name} Details`;
        warehouseDetailsModal.classList.add('active');
    }

    // Save Warehouse
    function saveWarehouse() {
        if (!warehouseForm.checkValidity()) {
            warehouseForm.reportValidity();
            return;
        }
        
        const warehouseId = document.getElementById('warehouse-id').value;
        
        const warehouseData = {
            id: warehouseId ? parseInt(warehouseId) : generateNewWarehouseId(),
            name: document.getElementById('warehouse-name').value,
            location: document.getElementById('warehouse-location').value,
            capacity: parseInt(document.getElementById('warehouse-capacity').value),
            manager: document.getElementById('warehouse-manager').value,
            contact: document.getElementById('warehouse-contact').value,
            status: document.getElementById('warehouse-status').value,
            description: document.getElementById('warehouse-description').value
        };
        
        if (warehouseId) {
            // Update existing warehouse
            const index = warehousesData.findIndex(w => w.id.toString() === warehouseId);
            if (index !== -1) {
                warehousesData[index] = warehouseData;
            }
        } else {
            // Add new warehouse
            warehousesData.unshift(warehouseData);
        }
        
        // Update UI
        filterWarehouses();
        closeModal();
    }

    // Delete Warehouse
    function deleteWarehouse(warehouseId) {
        if (confirm('Are you sure you want to delete this warehouse?')) {
            warehousesData = warehousesData.filter(w => w.id.toString() !== warehouseId);
            filterWarehouses();
        }
    }

    // Generate New Warehouse ID
    function generateNewWarehouseId() {
        return warehousesData.length > 0 ? Math.max(...warehousesData.map(w => w.id)) + 1 : 1;
    }

    // Print Warehouse Details
    function printWarehouseDetails() {
        window.print();
    }

    // Close Modal
    function closeModal() {
        warehouseModal.classList.remove('active');
        warehouseDetailsModal.classList.remove('active');
    }

    // Pagination Functions
    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
        
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderWarehousesTable();
        }
    }

    function goToNextPage() {
        const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderWarehousesTable();
        }
    }
});