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
import { placeOrder } from './orders.js'; // Import placeOrder

console.log("app.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // --- Initialize Cart Count Display ---
    updateCartCountDisplay(); 

    // --- Auth Form Listeners (Signup, Login, Logout) ---
    // (Code for these listeners remains the same as previous step)
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
    const logoutButton = document.getElementById('logout-link');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });
    }

    // --- Page Specific Logic ---
    const pagePath = window.location.pathname;

    if (pagePath.includes("products.html")) {
        renderProductListPage();
    } else if (pagePath.includes("product-detail.html")) {
        renderProductDetailPage();
    } else if (pagePath.includes("cart.html")) {
        renderCartPage();
        document.addEventListener('cartUpdated', renderCartPage);
    } else if (pagePath.includes("checkout.html")) {
        renderCheckoutPage();
    } else if (pagePath.includes("order_confirmation.html")) {
        renderOrderConfirmationPage();
    }


    // --- Event Delegation for "Add to Cart" buttons ---
    document.body.addEventListener('click', async (event) => {
        if (event.target && event.target.classList.contains('add-to-cart-btn')) {
            const button = event.target;
            const productId = button.dataset.productId;
            let quantity = 1;
            if (pagePath.includes("product-detail.html")) {
                const quantityInput = document.getElementById('quantity');
                if (quantityInput) quantity = parseInt(quantityInput.value, 10) || 1;
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
// (Function renderProductListPage remains the same as previous step)
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
// (Function renderProductDetailPage remains the same as previous step)
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
// (Function renderCartPage remains the same as previous step)
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
    // Auth check is implicitly handled by onAuthStateChanged in auth.js which redirects if not logged in.
    // However, an explicit check here before rendering sensitive data or actions is good practice.
    // For this project, auth.js handles the redirect if user tries to access checkout.html directly.

    const checkoutFormContainer = document.getElementById('checkout-form-container'); // From checkout.html
    if (!checkoutFormContainer) return;

    const cartItems = getCartItems();
    const cartTotal = getCartTotal();

    if (cartItems.length === 0) {
        checkoutFormContainer.innerHTML = '<p>Your cart is empty. Add items to your cart to proceed to checkout.</p>';
        const placeOrderBtn = document.getElementById('place-order-btn'); // Ensure button is not present or hidden
        if (placeOrderBtn) placeOrderBtn.style.display = 'none';
        return;
    }

    // Display Order Summary
    let summaryHtml = '<h3>Order Summary</h3><ul class="checkout-summary-list">';
    cartItems.forEach(item => {
        summaryHtml += `<li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`;
    });
    summaryHtml += `</ul><p class="checkout-total"><strong>Grand Total: $${cartTotal.toFixed(2)}</strong></p>`;
    
    // Add Place Order Button HTML if not already in checkout.html static markup
    // Assuming checkout.html has: <div id="checkout-form-container"></div>
    // and we add the button dynamically or it's part of static HTML.
    // For this example, let's assume checkout.html has:
    // <div id="checkout-form-container">
    //     <!-- Summary will be injected here -->
    // </div>
    // <button id="place-order-btn" class="button">Place Order</button>
    // If button is outside container, select it directly.
    
    checkoutFormContainer.innerHTML = summaryHtml; // Inject summary

    const placeOrderBtn = document.getElementById('place-order-btn'); // Assumed to be in checkout.html
    if (placeOrderBtn) {
        placeOrderBtn.style.display = 'block'; // Ensure it's visible
        placeOrderBtn.addEventListener('click', async () => {
            placeOrderBtn.textContent = 'Placing Order...';
            placeOrderBtn.disabled = true;
            try {
                await placeOrder(); // placeOrder handles redirect or error alerts
            } catch (error) {
                // placeOrder should handle its own errors, but just in case:
                console.error("Error during placeOrder call from app.js:", error);
                alert("An unexpected error occurred. Please try again.");
                placeOrderBtn.textContent = 'Place Order';
                placeOrderBtn.disabled = false;
            }
        });
    } else {
        console.warn("Place Order button not found on checkout page.");
    }
}

// --- Order Confirmation Page (order_confirmation.html) ---
function renderOrderConfirmationPage() {
    const orderDetailsContainer = document.getElementById('order-details-container'); // From order_confirmation.html
    const displayOrderIdElement = document.getElementById('display-order-id'); // Assumed to be in order_confirmation.html

    if (!orderDetailsContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (orderId) {
        if (displayOrderIdElement) {
             // If you have a specific span for order ID:
            displayOrderIdElement.textContent = orderId;
        } else {
            // Fallback to adding it to the container
            orderDetailsContainer.innerHTML = `
                <p>Thank you for your order!</p>
                <p>Your Order ID is: <strong>${orderId}</strong></p>
                <p><a href="index.html" class="button">Continue Shopping</a></p>
            `;
        }
        // If using a specific span, ensure the surrounding text is static in the HTML
        // e.g., order_confirmation.html: <p>Your Order ID is: <span id="display-order-id">LOADING...</span></p>
    } else {
        orderDetailsContainer.innerHTML = '<p>Order ID not found. If you just placed an order, please check your email or contact support.</p>';
    }
}
