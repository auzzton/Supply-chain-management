// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Initialize Bootstrap modals
let supplierModal;
let viewSupplierModal;

// Fetch product categories from inventory
async function fetchProductCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`);
        if (!response.ok) {
            throw new Error('Failed to fetch product categories');
        }
        const inventory = await response.json();
        const categories = [...new Set(inventory.map(item => item.category))];
        return categories;
    } catch (error) {
        console.error('Error fetching product categories:', error);
        return [];
    }
}

// Populate product categories dropdown
async function populateProductCategories() {
    const categories = await fetchProductCategories();
    const categoryFilter = document.getElementById('product-category-filter');
    const supplierProducts = document.getElementById('supplier-products');

    // Clear existing options except the first one
    while (categoryFilter.options.length > 1) {
        categoryFilter.remove(1);
    }
    supplierProducts.innerHTML = '';

    // Add categories to both dropdowns
    categories.forEach(category => {
        // Add to filter dropdown
        const filterOption = document.createElement('option');
        filterOption.value = category;
        filterOption.textContent = category;
        categoryFilter.appendChild(filterOption);

        // Add to supplier products dropdown
        const productOption = document.createElement('option');
        productOption.value = category;
        productOption.textContent = category;
        supplierProducts.appendChild(productOption);
    });
}

// Fetch suppliers data from backend
async function fetchSuppliers() {
    try {
        const response = await fetch(`${API_BASE_URL}/suppliers`);
        if (!response.ok) {
            throw new Error('Failed to fetch suppliers data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return [];
    }
}

// Initialize suppliers table
async function initializeSuppliersTable() {
    const suppliers = await fetchSuppliers();
    const tableBody = document.getElementById('suppliers-table-body');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    tableBody.innerHTML = '';

    // Get filter values
    const categoryFilter = document.getElementById('product-category-filter').value;
    const ratingFilter = document.getElementById('rating-filter').value;
    const searchQuery = document.getElementById('suppliers-search').value.toLowerCase();

    // Filter suppliers
    const filteredSuppliers = suppliers.filter(supplier => {
        const matchesCategory = categoryFilter === 'all' || supplier.products.includes(categoryFilter);
        const matchesRating = ratingFilter === 'all' || supplier.rating >= parseInt(ratingFilter);
        const matchesSearch = searchQuery === '' || 
            supplier.name.toLowerCase().includes(searchQuery) ||
            supplier.contact.toLowerCase().includes(searchQuery) ||
            supplier.email.toLowerCase().includes(searchQuery);

        return matchesCategory && matchesRating && matchesSearch;
    });

    filteredSuppliers.forEach(supplier => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${supplier.id}</td>
            <td>${supplier.name}</td>
            <td>${supplier.contact}</td>
            <td>${supplier.email}</td>
            <td>${supplier.products.join(', ')}</td>
            <td>${'★'.repeat(supplier.rating)}${'☆'.repeat(5 - supplier.rating)}</td>
            <td><span class="badge bg-${supplier.status === 'active' ? 'success' : supplier.status === 'inactive' ? 'danger' : 'warning'}">${supplier.status}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewSupplierDetails(${supplier.id})">View</button>
                <button class="btn btn-info btn-sm" onclick="editSupplier(${supplier.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${supplier.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update stats
    updateSuppliersStats(filteredSuppliers);
}

// Update suppliers stats
function updateSuppliersStats(suppliers) {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const avgRating = totalSuppliers > 0 
        ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / totalSuppliers).toFixed(1)
        : 0;

    // Find top category
    const categoryCounts = {};
    suppliers.forEach(supplier => {
        supplier.products.forEach(category => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
    });
    const topCategory = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    document.getElementById('total-suppliers').textContent = totalSuppliers;
    document.getElementById('active-suppliers').textContent = activeSuppliers;
    document.getElementById('avg-rating').textContent = avgRating;
    document.getElementById('top-category').textContent = topCategory;
}

// Add new supplier
async function addNewSupplier() {
    const supplier = {
        name: document.getElementById('supplier-name').value,
        contact: document.getElementById('supplier-contact').value,
        email: document.getElementById('supplier-email').value,
        phone: document.getElementById('supplier-phone').value,
        address: document.getElementById('supplier-address').value,
        products: Array.from(document.getElementById('supplier-products').selectedOptions).map(opt => opt.value),
        rating: parseInt(document.getElementById('supplier-rating').value),
        status: document.getElementById('supplier-status').value,
        notes: document.getElementById('supplier-notes').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(supplier)
        });

        if (!response.ok) {
            throw new Error('Failed to add supplier');
        }

        alert('Supplier added successfully!');
        supplierModal.hide();
        await initializeSuppliersTable();
        document.getElementById('supplier-form').reset();
    } catch (error) {
        console.error('Error adding supplier:', error);
        alert('Failed to add supplier');
    }
}

// Edit supplier
async function editSupplier(id) {
    const suppliers = await fetchSuppliers();
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;

    document.getElementById('supplier-id').value = supplier.id;
    document.getElementById('supplier-name').value = supplier.name;
    document.getElementById('supplier-contact').value = supplier.contact;
    document.getElementById('supplier-email').value = supplier.email;
    document.getElementById('supplier-phone').value = supplier.phone;
    document.getElementById('supplier-address').value = supplier.address;
    document.getElementById('supplier-rating').value = supplier.rating;
    document.getElementById('supplier-status').value = supplier.status;
    document.getElementById('supplier-notes').value = supplier.notes;

    // Select products
    const productsSelect = document.getElementById('supplier-products');
    Array.from(productsSelect.options).forEach(option => {
        option.selected = supplier.products.includes(option.value);
    });

    supplierModal.show();
}

// Save edited supplier
async function saveEditedSupplier() {
    const id = document.getElementById('supplier-id').value;
    const supplier = {
        name: document.getElementById('supplier-name').value,
        contact: document.getElementById('supplier-contact').value,
        email: document.getElementById('supplier-email').value,
        phone: document.getElementById('supplier-phone').value,
        address: document.getElementById('supplier-address').value,
        products: Array.from(document.getElementById('supplier-products').selectedOptions).map(opt => opt.value),
        rating: parseInt(document.getElementById('supplier-rating').value),
        status: document.getElementById('supplier-status').value,
        notes: document.getElementById('supplier-notes').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(supplier)
        });

        if (!response.ok) {
            throw new Error('Failed to update supplier');
        }

        alert('Supplier updated successfully!');
        supplierModal.hide();
        await initializeSuppliersTable();
    } catch (error) {
        console.error('Error updating supplier:', error);
        alert('Failed to update supplier');
    }
}

// Delete supplier
async function deleteSupplier(id) {
    if (confirm('Are you sure you want to delete this supplier?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete supplier');
            }

            alert('Supplier deleted successfully!');
            await initializeSuppliersTable();
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert('Failed to delete supplier');
        }
    }
}

// View supplier details
async function viewSupplierDetails(id) {
    const suppliers = await fetchSuppliers();
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;

    document.getElementById('viewSupplierId').textContent = supplier.id;
    document.getElementById('viewSupplierName').textContent = supplier.name;
    document.getElementById('viewSupplierContact').textContent = supplier.contact;
    document.getElementById('viewSupplierEmail').textContent = supplier.email;
    document.getElementById('viewSupplierPhone').textContent = supplier.phone;
    document.getElementById('viewSupplierAddress').textContent = supplier.address;
    document.getElementById('viewSupplierProducts').textContent = supplier.products.join(', ');
    document.getElementById('viewSupplierRating').textContent = '★'.repeat(supplier.rating) + '☆'.repeat(5 - supplier.rating);
    document.getElementById('viewSupplierStatus').textContent = supplier.status;
    document.getElementById('viewSupplierNotes').textContent = supplier.notes;

    viewSupplierModal.show();
}

// Reset filters
function resetFilters() {
    document.getElementById('product-category-filter').value = 'all';
    document.getElementById('rating-filter').value = 'all';
    document.getElementById('suppliers-search').value = '';
    initializeSuppliersTable();
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modals
    supplierModal = new bootstrap.Modal(document.getElementById('supplier-modal'));
    viewSupplierModal = new bootstrap.Modal(document.getElementById('viewSupplierModal'));

    // Initialize table and populate categories
    initializeSuppliersTable();
    populateProductCategories();
    
    // Add event listeners
    document.getElementById('add-supplier-btn').addEventListener('click', () => {
        document.getElementById('supplier-form').reset();
        document.getElementById('supplier-id').value = '';
        supplierModal.show();
    });
    
    document.getElementById('reset-suppliers-filters').addEventListener('click', resetFilters);
    
    // Add filter change listeners
    document.getElementById('product-category-filter').addEventListener('change', initializeSuppliersTable);
    document.getElementById('rating-filter').addEventListener('change', initializeSuppliersTable);
    document.getElementById('suppliers-search').addEventListener('input', initializeSuppliersTable);

    // Add save button click handler
    document.getElementById('save-supplier').addEventListener('click', () => {
        if (document.getElementById('supplier-id').value) {
            saveEditedSupplier();
        } else {
            addNewSupplier();
        }
    });
});
