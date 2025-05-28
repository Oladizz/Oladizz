// Main application logic
import { handleSignUp, handleLogin, handleLogout } from './auth.js';
import { fetchAllProducts, fetchProductById } from './products.js';
import { 
    addToCart, 
    getCartItems, 
    getCartTotal, 
    updateCartItemQuantity, 
    removeFromCart, 
    updateCartCountDisplay 
} from './cart.js';
import { placeOrder } from './orders.js';
import { app as firebaseApp, auth as firebaseAuth } from './firebase-config.js'; // Import Firebase app and auth instance
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

console.log("app.js loaded");

// Initialize Firebase Functions
const functions = getFunctions(firebaseApp);
const setAdminClaimCallable = httpsCallable(functions, 'setAdminClaim');


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // --- Initialize Cart Count Display ---
    updateCartCountDisplay(); 

    // --- Auth Form Listeners (Signup, Login, Logout) ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            if (email && password) await handleSignUp(email, password);
            else {
                const el = document.getElementById('signup-error');
                if (el) el.textContent = "Email and password are required.";
            }
        });
    }
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            if (email && password) await handleLogin(email, password);
            else {
                const el = document.getElementById('login-error');
                if (el) el.textContent = "Email and password are required.";
            }
        });
    }
    // General logout link for main site
    const logoutButton = document.getElementById('logout-link');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });
    }
    // Specific logout link for admin panel header
    const adminLogoutButton = document.getElementById('admin-logout-link');
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout(); 
        });
    }


    // --- Page Specific Logic ---
    const pagePath = window.location.pathname;

    if (pagePath.endsWith("products.html") && !pagePath.includes("admin/")) {
        renderProductListPage();
    } else if (pagePath.endsWith("product-detail.html")) {
        renderProductDetailPage();
    } else if (pagePath.endsWith("cart.html")) {
        renderCartPage();
        document.addEventListener('cartUpdated', renderCartPage);
    } else if (pagePath.endsWith("checkout.html")) {
        renderCheckoutPage();
    } else if (pagePath.endsWith("order_confirmation.html")) {
        renderOrderConfirmationPage();
    } else if (pagePath.endsWith("admin.html") && !pagePath.includes("admin/")) { // Root admin.html
        handleRootAdminPageAccess(); 
        setupAdminFormListener(); 
    } else if (pagePath.startsWith("/admin/")) { // For pages within admin/ directory
        // This is the guard for all pages under /admin/ (e.g., /admin/dashboard.html)
        firebaseAuth.onAuthStateChanged(async user => { 
            if (user) {
                const idTokenResult = await user.getIdTokenResult(true); // Force refresh for claims
                if (idTokenResult.claims.isAdmin === true) {
                    console.log("Admin user confirmed for /admin/ page:", pagePath);
                    // Update admin user email in the admin panel header
                    const adminUserEmailElement = document.getElementById('admin-user-email');
                    if (adminUserEmailElement) {
                        adminUserEmailElement.textContent = user.email;
                    }
                    // If specific page rendering functions for admin pages are needed, call them here
                    // For example, if on admin/products.html, call an adminRenderProductPage()
                } else {
                    // User is logged in but NOT an admin
                    console.warn("Access Denied: Non-admin user attempting to access /admin/ page. Redirecting to main site homepage.");
                    alert("Access Denied. You are not authorized to view this page.");
                    window.location.href = '../index.html'; // Redirect to main site home
                }
            } else {
                // No user is logged in
                console.warn("Access Denied: No user logged in. Redirecting from /admin/ page to login.");
                // Redirect to login, and then after login, onAuthStateChanged in auth.js will handle further redirection.
                // If they log in as non-admin, the check above will then redirect them to index.html.
                // If they log in as admin, they will be allowed (or redirected to admin dashboard by root admin.html logic).
                window.location.href = `../login.html?redirect=${encodeURIComponent(window.location.href)}`; 
            }
        });
    }


    // --- Event Delegation for "Add to Cart" buttons ---
    document.body.addEventListener('click', async (event) => {
        if (event.target && event.target.classList.contains('add-to-cart-btn')) {
            const button = event.target;
            const productId = button.dataset.productId;
            let quantity = 1;
            const quantityInput = document.getElementById('quantity'); 
            if (quantityInput && (window.location.pathname.includes("product-detail.html") || button.closest('#product-detail-content'))) {
                quantity = parseInt(quantityInput.value, 10) || 1;
            }
            if (productId) {
                button.textContent = "Adding..."; button.disabled = true;
                await addToCart(productId, quantity);
                button.textContent = "Add to Cart"; button.disabled = false;
            }
        }
    });
});

// --- Product Listing Page (products.html) ---
async function renderProductListPage() {
    const productListContainer = document.getElementById('product-list');
    if (!productListContainer) return;
    productListContainer.innerHTML = '<p>Loading products...</p>';
    try {
        const products = await fetchAllProducts();
        if (products.length === 0) {
            productListContainer.innerHTML = '<p>No products found. Check back later!</p>';
            return;
        }
        productListContainer.innerHTML = '';
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <a href="product-detail.html?id=${product.id}">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/200x150.png?text=No+Image'}" alt="${product.name}">
                    <h3>${product.name}</h3>
                </a>
                <p class="price">$${Number(product.price).toFixed(2)}</p>
                <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button> 
            `;
            productListContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error("Error rendering product list:", error);
        productListContainer.innerHTML = '<p>Error loading products. Please try refreshing the page.</p>';
    }
}

// --- Product Detail Page (product-detail.html) ---
async function renderProductDetailPage() {
    const productDetailContainer = document.getElementById('product-detail-content');
    if (!productDetailContainer) return;
    productDetailContainer.innerHTML = '<p>Loading product details...</p>';
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) {
        productDetailContainer.innerHTML = '<p>No product ID provided in the URL.</p>';
        return;
    }
    try {
        const product = await fetchProductById(productId);
        if (!product) {
            productDetailContainer.innerHTML = '<p>Product not found.</p>';
            return;
        }
        productDetailContainer.innerHTML = `
            <img src="${product.imageUrl || 'https://via.placeholder.com/400x300.png?text=No+Image'}" alt="${product.name}" class="product-image-large">
            <h2>${product.name}</h2>
            <p class="description">${product.description}</p>
            <p class="price">$${Number(product.price).toFixed(2)}</p>
            <div class="quantity-selector">
                <label for="quantity">Quantity:</label>
                <input type="number" id="quantity" name="quantity" value="1" min="1" style="width: 60px;">
            </div>
            <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
        `;
    } catch (error) {
        console.error("Error rendering product details:", error);
        productDetailContainer.innerHTML = '<p>Error loading product details. Please try again.</p>';
    }
}

// --- Cart Page (cart.html) ---
function renderCartPage() {
    const cartItemsContainer = document.getElementById('cart-items-container'); 
    const cartTotalElement = document.getElementById('cart-total'); 
    const checkoutButton = document.querySelector('a.button[href="checkout.html"]'); 

    if (!cartItemsContainer || !cartTotalElement) return;

    const items = getCartItems();
    const total = getCartTotal();
    cartItemsContainer.innerHTML = ''; 

    if (items.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        cartTotalElement.innerHTML = '';
        if(checkoutButton) checkoutButton.style.display = 'none'; 
        return;
    }
    if(checkoutButton) checkoutButton.style.display = 'inline-block'; 

    const table = document.createElement('table');
    table.className = 'cart-table'; 
    table.innerHTML = `
        <thead><tr><th>Image</th><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th>Action</th></tr></thead>
        <tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    items.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><img src="${item.imageUrl || 'https://via.placeholder.com/50x50.png?text=N/A'}" alt="${item.name}" style="width:50px; height:auto;"></td>
            <td>${item.name}</td>
            <td>$${Number(item.price).toFixed(2)}</td>
            <td><input type="number" class="quantity-input" value="${item.quantity}" min="1" data-product-id="${item.id}" style="width: 60px;"></td>
            <td>$${(Number(item.price) * item.quantity).toFixed(2)}</td>
            <td><button class="remove-item-btn" data-product-id="${item.id}">Remove</button></td>`;
        const quantityInput = row.querySelector('.quantity-input');
        quantityInput.addEventListener('change', (e) => {
            const newQuantity = parseInt(e.target.value, 10);
            if (!isNaN(newQuantity)) updateCartItemQuantity(item.id, newQuantity);
        });
        const removeButton = row.querySelector('.remove-item-btn');
        removeButton.addEventListener('click', () => {
            if (confirm(`Remove ${item.name} from cart?`)) removeFromCart(item.id);
        });
    });
    cartItemsContainer.appendChild(table);
    cartTotalElement.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
}


// --- Checkout Page (checkout.html) ---
function renderCheckoutPage() {
    const checkoutFormContainer = document.getElementById('checkout-form-container'); 
    if (!checkoutFormContainer) return;

    const cartItems = getCartItems();
    const cartTotal = getCartTotal();

    if (cartItems.length === 0) {
        checkoutFormContainer.innerHTML = '<p>Your cart is empty. Add items to your cart to proceed to checkout.</p>';
        const placeOrderBtn = document.getElementById('place-order-btn'); 
        if (placeOrderBtn) placeOrderBtn.style.display = 'none';
        return;
    }
    
    let summaryHtml = '<h3>Order Summary</h3><ul class="checkout-summary-list">';
    cartItems.forEach(item => {
        summaryHtml += `<li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`;
    });
    summaryHtml += `</ul><p class="checkout-total"><strong>Grand Total: $${cartTotal.toFixed(2)}</strong></p>`;
    checkoutFormContainer.innerHTML = summaryHtml; 

    const placeOrderBtn = document.getElementById('place-order-btn'); 
    if (placeOrderBtn) {
        placeOrderBtn.style.display = 'block'; 
        if (!placeOrderBtn.dataset.listenerAttached) { 
            placeOrderBtn.addEventListener('click', async () => {
                placeOrderBtn.textContent = 'Placing Order...';
                placeOrderBtn.disabled = true;
                try {
                    await placeOrder(); 
                } catch (error) {
                    console.error("Error during placeOrder call from app.js:", error);
                    alert("An unexpected error occurred. Please try again.");
                    placeOrderBtn.textContent = 'Place Order';
                    placeOrderBtn.disabled = false;
                }
            });
            placeOrderBtn.dataset.listenerAttached = 'true';
        }
    } else {
        console.warn("Place Order button not found on checkout page.");
    }
}

// --- Order Confirmation Page (order_confirmation.html) ---
function renderOrderConfirmationPage() {
    const orderDetailsContainer = document.getElementById('order-details-container'); 
    if (!orderDetailsContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (orderId) {
        orderDetailsContainer.innerHTML = `
            <p>Thank you for your order!</p>
            <p>Your Order ID is: <strong>${orderId}</strong></p>
            <p><a href="index.html" class="button">Continue Shopping</a></p>
        `;
    } else {
        orderDetailsContainer.innerHTML = '<p>Order ID not found. If you just placed an order, please check your email or contact support.</p>';
    }
}

// --- Admin Page Gatekeeper (root admin.html) & Admin Section Logic ---
function handleRootAdminPageAccess() {
    const accessMessageElement = document.getElementById('admin-access-message');
    const setAdminToolContainer = document.getElementById('set-admin-tool-container');

    firebaseAuth.onAuthStateChanged(async user => { 
        if (user) {
            const idTokenResult = await user.getIdTokenResult(true); 
            if (idTokenResult.claims.isAdmin === true) {
                if (accessMessageElement) accessMessageElement.textContent = "Admin access confirmed. Redirecting to dashboard...";
                if (setAdminToolContainer) setAdminToolContainer.style.display = 'block'; 
                window.location.href = 'admin/dashboard.html'; 
            } else {
                if (accessMessageElement) accessMessageElement.textContent = "Access Denied. You are not an authorized administrator.";
                if (setAdminToolContainer) setAdminToolContainer.style.display = 'none';
            }
        } else {
            if (accessMessageElement) accessMessageElement.textContent = "Please login to access admin functionalities.";
            if (setAdminToolContainer) setAdminToolContainer.style.display = 'none';
        }
    });
}


function setupAdminFormListener() {
    const setAdminForm = document.getElementById('set-admin-form');
    const feedbackElement = document.getElementById('set-admin-feedback');

    if (setAdminForm && feedbackElement) {
        // This check relies on window.currentUserIsAdmin being set by auth.js's onAuthStateChanged
        // which runs after this script's DOMContentLoaded if auth.js is imported later or async.
        // For robustness, we should ideally check claims directly here if possible, or ensure auth.js has run.
        // However, handleRootAdminPageAccess above already manages visibility of setAdminToolContainer
        // based on fresh claim checks. So, if the form is visible, the user is likely an admin.
        
        if (!setAdminForm.dataset.listenerAttached) { 
            setAdminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                // Double check admin status before attempting to call a privileged function
                const user = firebaseAuth.currentUser;
                if (!user) {
                    feedbackElement.textContent = 'Error: You are not logged in.'; return;
                }
                const idTokenResult = await user.getIdTokenResult(true);
                if (idTokenResult.claims.isAdmin !== true) {
                    feedbackElement.textContent = 'Error: You are not authorized to perform this action.'; return;
                }

                const userIdToMakeAdmin = document.getElementById('set-admin-userId').value;
                feedbackElement.textContent = 'Processing...';
                setAdminForm.querySelector('button').disabled = true;

                if (!userIdToMakeAdmin) {
                    feedbackElement.textContent = 'Please enter a User ID.';
                    setAdminForm.querySelector('button').disabled = false;
                    return;
                }

                try {
                    const result = await setAdminClaimCallable({ userId: userIdToMakeAdmin });
                    feedbackElement.textContent = result.data.message || 'Success!';
                    console.log("Set admin claim result:", result);
                } catch (error) {
                    console.error("Error calling setAdminClaim Firebase Function:", error);
                    feedbackElement.textContent = `Error: ${error.message || 'Could not set admin claim.'}`;
                } finally {
                    setAdminForm.querySelector('button').disabled = false;
                }
            });
            setAdminForm.dataset.listenerAttached = 'true';
        }
    }
}
