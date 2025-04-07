document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const suppliersTableBody = document.getElementById('suppliers-table-body');
    const addSupplierBtn = document.getElementById('add-supplier-btn');
    const supplierModal = document.getElementById('supplier-modal');
    const saveSupplierBtn = document.getElementById('save-supplier');
    const supplierForm = document.getElementById('supplier-form');
    const productCategoryFilter = document.getElementById('product-category-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const suppliersSearch = document.getElementById('suppliers-search');
    const prevPageBtn = document.getElementById('suppliers-prev-page');
    const nextPageBtn = document.getElementById('suppliers-next-page');
    const pageInfo = document.getElementById('suppliers-page-info');

    // State variables
    let suppliersData = [];
    let inventoryData = [];
    let filteredSuppliers = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // Initialize the page
    initSuppliers();

    // Event Listeners
    addSupplierBtn.addEventListener('click', () => openSupplierModal('add'));
    Array.from(document.getElementsByClassName('close-modal')).forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    saveSupplierBtn.addEventListener('click', saveSupplier);
    productCategoryFilter.addEventListener('change', filterSuppliers);
    ratingFilter.addEventListener('change', filterSuppliers);
    suppliersSearch.addEventListener('input', filterSuppliers);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    document.getElementById('reset-suppliers-filters').addEventListener('click', resetFilters);

    // Initialize Suppliers Page
    function initSuppliers() {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                suppliersData = data.suppliers;
                inventoryData = data.inventory;
                filteredSuppliers = [...suppliersData];
                
                // Populate product categories
                populateProductCategories();
                
                // Update stats
                updateSuppliersStats();
                
                // Render table
                renderSuppliersTable();
            })
            .catch(error => console.error('Error loading suppliers data:', error));
    }

    // Populate Product Categories
    function populateProductCategories() {
        const categories = [...new Set(inventoryData.map(item => item.category))];
        
        // For filter dropdown
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            productCategoryFilter.appendChild(option);
        });
        
        // For supplier modal multi-select
        const supplierProductsSelect = document.getElementById('supplier-products');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            supplierProductsSelect.appendChild(option);
        });
    }

    // Render Suppliers Table
    function renderSuppliersTable() {
        suppliersTableBody.innerHTML = '';
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredSuppliers.slice(startIndex, endIndex);
        
        if (paginatedData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="8" class="no-data">No suppliers found</td>`;
            suppliersTableBody.appendChild(row);
            return;
        }
        
        paginatedData.forEach(supplier => {
            const row = document.createElement('tr');
            
            // Format rating as stars
            const ratingStars = '★'.repeat(supplier.rating) + '☆'.repeat(5 - supplier.rating);
            
            // Format products as tags
            const productsTags = supplier.products.map(product => 
                `<span class="product-tag">${product}</span>`
            ).join('');
            
            row.innerHTML = `
                <td>${supplier.id}</td>
                <td>${supplier.name}</td>
                <td>${supplier.contact}</td>
                <td>${supplier.email}</td>
                <td><div class="products-tags">${productsTags}</div></td>
                <td><span class="rating-stars">${ratingStars}</span></td>
                <td><span class="supplier-status ${supplier.status}">${supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}</span></td>
                <td>
                    <div class="supplier-actions">
                        <button class="btn-supplier-action btn-view-supplier" data-id="${supplier.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-supplier-action btn-edit-supplier" data-id="${supplier.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-supplier-action btn-delete-supplier" data-id="${supplier.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            suppliersTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-view-supplier').forEach(btn => {
            btn.addEventListener('click', () => viewSupplierDetails(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-edit-supplier').forEach(btn => {
            btn.addEventListener('click', () => openSupplierModal('edit', btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete-supplier').forEach(btn => {
            btn.addEventListener('click', () => deleteSupplier(btn.dataset.id));
        });
        
        // Update pagination controls
        updatePaginationControls();
    }

    // Update Suppliers Stats
    function updateSuppliersStats() {
        const totalSuppliers = filteredSuppliers.length;
        const activeSuppliers = filteredSuppliers.filter(s => s.status === 'active').length;
        
        // Calculate average rating
        const totalRating = filteredSuppliers.reduce((sum, supplier) => sum + supplier.rating, 0);
        const avgRating = totalSuppliers > 0 ? (totalRating / totalSuppliers).toFixed(1) : 0;
        
        // Find top category
        const categoryCounts = {};
        filteredSuppliers.forEach(supplier => {
            supplier.products.forEach(product => {
                categoryCounts[product] = (categoryCounts[product] || 0) + 1;
            });
        });
        
        let topCategory = '-';
        if (Object.keys(categoryCounts).length > 0) {
            topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0];
        }
        
        document.getElementById('total-suppliers').textContent = totalSuppliers;
        document.getElementById('active-suppliers').textContent = activeSuppliers;
        document.getElementById('avg-rating').textContent = avgRating;
        document.getElementById('top-category').textContent = topCategory;
    }

    // Filter Suppliers
    function filterSuppliers() {
        const category = productCategoryFilter.value;
        const rating = ratingFilter.value;
        const searchTerm = suppliersSearch.value.toLowerCase();
        
        filteredSuppliers = suppliersData.filter(supplier => {
            // Category filter
            if (category !== 'all' && !supplier.products.includes(category)) return false;
            
            // Rating filter
            if (rating !== 'all' && supplier.rating < parseInt(rating)) return false;
            
            // Search term
            if (searchTerm && !(
                supplier.name.toLowerCase().includes(searchTerm) ||
                supplier.contact.toLowerCase().includes(searchTerm) ||
                supplier.email.toLowerCase().includes(searchTerm) ||
                supplier.id.toString().includes(searchTerm)
            )) return false;
            
            return true;
        });
        
        // Reset to first page
        currentPage = 1;
        
        // Update table and stats
        renderSuppliersTable();
        updateSuppliersStats();
    }

    // Reset Filters
    function resetFilters() {
        productCategoryFilter.value = 'all';
        ratingFilter.value = 'all';
        suppliersSearch.value = '';
        filterSuppliers();
    }

    // Open Supplier Modal
    function openSupplierModal(action, supplierId = null) {
        const modalTitle = document.getElementById('supplier-modal-title');
        const form = document.getElementById('supplier-form');
        
        if (action === 'add') {
            modalTitle.textContent = 'Add New Supplier';
            form.reset();
            document.getElementById('supplier-id').value = '';
            document.getElementById('supplier-status').value = 'active';
            document.getElementById('supplier-rating').value = '5';
        } else if (action === 'edit' && supplierId) {
            modalTitle.textContent = 'Edit Supplier';
            const supplier = suppliersData.find(s => s.id.toString() === supplierId);
            if (supplier) {
                document.getElementById('supplier-id').value = supplier.id;
                document.getElementById('supplier-name').value = supplier.name;
                document.getElementById('supplier-contact').value = supplier.contact;
                document.getElementById('supplier-phone').value = supplier.phone;
                document.getElementById('supplier-email').value = supplier.email;
                document.getElementById('supplier-address').value = supplier.address || '';
                document.getElementById('supplier-rating').value = supplier.rating;
                document.getElementById('supplier-status').value = supplier.status;
                document.getElementById('supplier-notes').value = supplier.notes || '';
                
                // Select products
                const productsSelect = document.getElementById('supplier-products');
                Array.from(productsSelect.options).forEach(option => {
                    option.selected = supplier.products.includes(option.value);
                });
            }
        }
        
        supplierModal.classList.add('active');
    }

    // View Supplier Details
    function viewSupplierDetails(supplierId) {
        const supplier = suppliersData.find(s => s.id.toString() === supplierId);
        if (!supplier) return;
        
        // In a real application, this would open a detailed view modal
        alert(`Viewing details for supplier: ${supplier.name}\nContact: ${supplier.contact}\nEmail: ${supplier.email}`);
    }

    // Save Supplier
    function saveSupplier() {
        if (!supplierForm.checkValidity()) {
            supplierForm.reportValidity();
            return;
        }
        
        const supplierId = document.getElementById('supplier-id').value;
        const productsSelect = document.getElementById('supplier-products');
        const selectedProducts = Array.from(productsSelect.selectedOptions).map(option => option.value);
        
        if (selectedProducts.length === 0) {
            alert('Please select at least one product category');
            return;
        }
        
        const supplierData = {
            id: supplierId ? parseInt(supplierId) : generateNewSupplierId(),
            name: document.getElementById('supplier-name').value,
            contact: document.getElementById('supplier-contact').value,
            phone: document.getElementById('supplier-phone').value,
            email: document.getElementById('supplier-email').value,
            address: document.getElementById('supplier-address').value,
            rating: parseInt(document.getElementById('supplier-rating').value),
            status: document.getElementById('supplier-status').value,
            products: selectedProducts,
            notes: document.getElementById('supplier-notes').value
        };
        
        if (supplierId) {
            // Update existing supplier
            const index = suppliersData.findIndex(s => s.id.toString() === supplierId);
            if (index !== -1) {
                suppliersData[index] = supplierData;
            }
        } else {
            // Add new supplier
            suppliersData.unshift(supplierData);
        }
        
        // Update UI
        filterSuppliers();
        closeModal();
    }

    // Delete Supplier
    function deleteSupplier(supplierId) {
        if (confirm('Are you sure you want to delete this supplier?')) {
            suppliersData = suppliersData.filter(s => s.id.toString() !== supplierId);
            filterSuppliers();
        }
    }

    // Generate New Supplier ID
    function generateNewSupplierId() {
        return suppliersData.length > 0 ? Math.max(...suppliersData.map(s => s.id)) + 1 : 1;
    }

    // Close Modal
    function closeModal() {
        supplierModal.classList.remove('active');
    }

    // Pagination Functions
    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
        
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderSuppliersTable();
        }
    }

    function goToNextPage() {
        const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderSuppliersTable();
        }
    }
});
