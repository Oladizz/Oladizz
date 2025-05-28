import { db } from '../../js/firebase-config.js'; // Adjusted path
import { 
    collection, 
    getDocs, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp // For created/updated timestamps if desired
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const productsTableBody = document.getElementById('admin-products-table-body');
const addProductForm = document.getElementById('add-product-form');
const formFeedback = document.getElementById('admin-product-form-feedback');
const editProductIdInput = document.getElementById('edit-product-id');
const formTitle = document.getElementById('admin-form-title'); // Assuming a title for the form section
const submitButton = addProductForm ? addProductForm.querySelector('button[type="submit"]') : null;

// --- Display Products ---
async function displayAdminProducts() {
    if (!productsTableBody) {
        console.log("Product table body not found on this page.");
        return;
    }
    productsTableBody.innerHTML = '<tr><td colspan="6">Loading products...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        if (querySnapshot.empty) {
            productsTableBody.innerHTML = '<tr><td colspan="6">No products found. Add some!</td></tr>';
            return;
        }

        let productsHtml = "";
        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const productId = docSnap.id;
            productsHtml += `
                <tr>
                    <td><img src="${product.imageUrl || 'https://via.placeholder.com/50x50.png?text=N/A'}" alt="${product.name}" style="width:50px; height:auto; border-radius:3px;"></td>
                    <td>${product.name}</td>
                    <td>$${Number(product.price).toFixed(2)}</td>
                    <td>${product.stock !== undefined ? product.stock : 'N/A'}</td>
                    <td>${product.description ? (product.description.substring(0, 50) + (product.description.length > 50 ? '...' : '')) : 'No description'}</td>
                    <td>
                        <button class="action-btn edit-btn" data-id="${productId}">Edit</button>
                        <button class="action-btn delete-btn" data-id="${productId}">Delete</button>
                    </td>
                </tr>
            `;
        });
        productsTableBody.innerHTML = productsHtml;

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => loadProductForEdit(button.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => handleDeleteProduct(button.dataset.id));
        });

    } catch (error) {
        console.error("Error fetching products for admin: ", error);
        productsTableBody.innerHTML = '<tr><td colspan="6">Error loading products. Check console.</td></tr>';
        if (formFeedback) formFeedback.textContent = "Error loading products.";
    }
}

// --- Add Product ---
async function handleAddOrUpdateProduct(e) {
    e.preventDefault();
    if (!addProductForm) return;

    const name = addProductForm.elements['product-name'].value.trim();
    const description = addProductForm.elements['product-description'].value.trim();
    const price = parseFloat(addProductForm.elements['product-price'].value);
    const imageUrl = addProductForm.elements['product-image-url'].value.trim();
    const stock = parseInt(addProductForm.elements['product-stock'].value, 10);
    const editingProductId = editProductIdInput.value;

    // Basic Validation
    if (!name || !description || isNaN(price) || !imageUrl || isNaN(stock)) {
        if (formFeedback) formFeedback.textContent = "Please fill all fields with valid data.";
        return;
    }
    if (price <= 0) {
        if (formFeedback) formFeedback.textContent = "Price must be greater than 0.";
        return;
    }
    if (stock < 0) {
        if (formFeedback) formFeedback.textContent = "Stock cannot be negative.";
        return;
    }

    const productData = {
        name,
        description,
        price,
        imageUrl,
        stock,
        // Can add timestamps if needed:
        // lastUpdated: serverTimestamp() 
    };

    if (editingProductId) {
        // --- Update Existing Product ---
        if (formFeedback) formFeedback.textContent = "Updating product...";
        try {
            const productRef = doc(db, "products", editingProductId);
            await updateDoc(productRef, productData);
            if (formFeedback) formFeedback.textContent = "Product updated successfully!";
            resetForm();
            await displayAdminProducts();
        } catch (error) {
            console.error("Error updating product: ", error);
            if (formFeedback) formFeedback.textContent = `Error updating product: ${error.message}`;
        }
    } else {
        // --- Add New Product ---
        // productData.createdAt = serverTimestamp(); // If adding createdAt
        if (formFeedback) formFeedback.textContent = "Adding product...";
        try {
            await addDoc(collection(db, "products"), productData);
            if (formFeedback) formFeedback.textContent = "Product added successfully!";
            resetForm(); // Clear form only after successful add
            await displayAdminProducts();
        } catch (error) {
            console.error("Error adding product: ", error);
            if (formFeedback) formFeedback.textContent = `Error adding product: ${error.message}`;
        }
    }
}

// --- Load Product for Editing ---
async function loadProductForEdit(productId) {
    if (!addProductForm || !editProductIdInput || !formTitle || !submitButton) return;
    
    if (formFeedback) formFeedback.textContent = "Loading product details for editing...";
    try {
        const productRef = doc(db, "products", productId);
        const docSnap = await getDoc(productRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            addProductForm.elements['product-name'].value = product.name;
            addProductForm.elements['product-description'].value = product.description;
            addProductForm.elements['product-price'].value = product.price;
            addProductForm.elements['product-image-url'].value = product.imageUrl;
            addProductForm.elements['product-stock'].value = product.stock;
            editProductIdInput.value = productId; // Set the hidden ID field

            if (formTitle) formTitle.textContent = "Edit Product";
            if (submitButton) submitButton.textContent = "Update Product";
            if (formFeedback) formFeedback.textContent = "Editing product. Make changes and click 'Update Product'.";
            addProductForm.scrollIntoView({ behavior: 'smooth' }); // Scroll to form
        } else {
            if (formFeedback) formFeedback.textContent = "Product not found for editing.";
        }
    } catch (error) {
        console.error("Error loading product for edit: ", error);
        if (formFeedback) formFeedback.textContent = "Error loading product details.";
    }
}

// --- Delete Product ---
async function handleDeleteProduct(productId) {
    if (!productId) return;

    if (confirm(`Are you sure you want to delete product ID: ${productId}? This action cannot be undone.`)) {
        if (formFeedback) formFeedback.textContent = "Deleting product...";
        try {
            await deleteDoc(doc(db, "products", productId));
            if (formFeedback) formFeedback.textContent = "Product deleted successfully!";
            resetForm(); // If a product was loaded in form for edit, reset form.
            await displayAdminProducts();
        } catch (error) {
            console.error("Error deleting product: ", error);
            if (formFeedback) formFeedback.textContent = `Error deleting product: ${error.message}`;
        }
    }
}

// --- Reset Form ---
function resetForm() {
    if (!addProductForm || !editProductIdInput || !formTitle || !submitButton) return;
    addProductForm.reset();
    editProductIdInput.value = ""; // Clear hidden ID
    if (formTitle) formTitle.textContent = "Add New Product"; // Reset title
    if (submitButton) submitButton.textContent = "Add Product"; // Reset button text
    // if (formFeedback) formFeedback.textContent = ""; // Optionally clear feedback
}


// --- Initialize Page ---
function initAdminProductsPage() {
    // This function is called when the admin/products.html page loads
    // It assumes that the user is already authenticated as an admin
    // (which should be handled by the main app.js routing/auth checks)
    
    console.log("Initializing Admin Products Page...");
    displayAdminProducts();

    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddOrUpdateProduct);
        // Add a cancel button listener if one exists to reset the form
        const cancelButton = addProductForm.querySelector('button[type="button"].cancel-edit-btn');
        if (cancelButton) {
            cancelButton.addEventListener('click', (e) => {
                e.preventDefault();
                resetForm();
                if (formFeedback) formFeedback.textContent = "";
            });
        }
    } else {
        console.error("Add product form not found!");
    }
}

// Ensure this script runs after DOM is loaded and only on admin/products.html
// We can use a specific ID on the body of admin/products.html or check path.
if (window.location.pathname.endsWith('/admin/products.html')) {
    document.addEventListener('DOMContentLoaded', initAdminProductsPage);
}

export { displayAdminProducts, handleAddOrUpdateProduct, loadProductForEdit, handleDeleteProduct, resetForm };
// Exporting for potential direct calls or testing, though initAdminProductsPage handles setup.
