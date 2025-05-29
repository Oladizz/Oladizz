// Main application logic
import { handleSignUp, handleLogin, handleLogout, checkAdminAccess, observeAuthState } from './auth.js';
import { fetchAllProducts, fetchProductById } from './products.js';
import { 
    addToCart, 
    getCartItems, 
    getCartTotal, 
    updateCartItemQuantity, 
    removeFromCart, 
    updateCartCountDisplay,
    clearCart
} from './cart.js';
import { placeOrder, fetchUserOrders } from './orders.js';
import { db } from './firebase-config.js'; 
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    limit,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("app.js: Script loaded.");

// Initialize Firebase Functions (do this once)
const functions = getFunctions(); 
const setAdminClaimCallable = httpsCallable(functions, 'setAdminClaim');


document.addEventListener('DOMContentLoaded', () => {
    const loginErrorDebug = document.getElementById('login-error'); // For login page diagnostics
    
    // This is the VERY FIRST thing in the try block.
    if (loginErrorDebug && window.location.pathname.includes('login.html')) {
        loginErrorDebug.textContent = 'js/app.js DOMContentLoaded fired. Attempting to initialize...';
        loginErrorDebug.style.display = 'block';
        loginErrorDebug.style.color = 'blue';
    } else if (window.location.pathname.includes('login.html')) {
        // If on login page but loginErrorDebug is null
        alert("DEBUG: login-error element NOT FOUND by app.js!");
    } else {
        console.log("app.js: DOMContentLoaded on a page other than login.html or login-error element not present.");
    }

    try {
        console.log("app.js: DOMContentLoaded event fired. Initializing page-specific logic.");
        observeAuthState(); // Initialize auth state observation for header links
        updateCartCountDisplay(); // Initialize cart count on page load

        const pagePath = window.location.pathname;
        console.log(`app.js: Current page path: ${pagePath}`);

        // --- Auth Form Listeners (Signup, Login) ---
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            console.log("app.js: Signup form found, attaching listener.");
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                await handleSignUp(email, password);
            });
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            console.log("app.js: Login form found, attaching listener.");
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                await handleLogin(email, password);
            });
        }
        
        const googleSignInButtonLogin = document.getElementById('google-signin-btn-login');
        if (googleSignInButtonLogin) {
            googleSignInButtonLogin.addEventListener('click', () => handleLogin(null, null, true));
        }

        const googleSignInButtonSignup = document.getElementById('google-signin-btn-signup');
        if (googleSignInButtonSignup) {
            googleSignInButtonSignup.addEventListener('click', () => handleSignUp(null, null, true));
        }

        // General logout link for main site (now handled by observeAuthState)
        // Admin logout link is specific to admin pages, handled by admin-common.js

        // --- Page Specific Logic ---
        if (pagePath.endsWith("index.html") || pagePath === "/" || pagePath.endsWith("/my-project-env/")) {
            console.log("app.js: Initializing index.html specific logic.");
            displayFeaturedProducts();
            displayHomepageCategories();
            initCarousel('promotion-carousel');
        } else if (pagePath.includes("products.html") && !pagePath.includes("admin/")) {
            console.log("app.js: Initializing products.html specific logic.");
            renderProductListPage(); // Fetches and displays products
            displayCategoryFilters(); // Displays category filters
            setupProductPageListeners(); // Price, sort, and NEW search listeners
        } else if (pagePath.includes("product-detail.html")) {
            console.log("app.js: Initializing product-detail.html specific logic.");
            renderProductDetailPage();
        } else if (pagePath.includes("cart.html")) {
            console.log("app.js: Initializing cart.html specific logic.");
            renderCartPage();
            document.addEventListener('cartUpdated', renderCartPage); // Listen for custom event
        } else if (pagePath.includes("checkout.html")) {
            console.log("app.js: Initializing checkout.html specific logic.");
            renderCheckoutPage();
        } else if (pagePath.includes("order_confirmation.html")) {
            console.log("app.js: Initializing order_confirmation.html specific logic.");
            renderOrderConfirmationPage();
        } else if (pagePath.includes("profile.html")) {
            console.log("app.js: Initializing profile.html specific logic.");
            // Profile specific functions (e.g., displayUserInfo, displayUserOrders)
            // are called within js/profile.js, which should be linked in profile.html
        } else if (pagePath.includes("admin.html") && !pagePath.includes("admin/")) { // Root admin.html
            console.log("app.js: Initializing root admin.html specific logic.");
            handleRootAdminPageAccess();
            setupAdminFormListener(); // For the set admin tool
        }
        // Admin sub-pages (e.g., admin/dashboard.html, admin/products.html) have their own JS files.
        // Common admin functionality is in admin/js/admin-common.js

        // --- Event Delegation for "Add to Cart" buttons (globally) ---
        document.body.addEventListener('click', async (event) => {
            if (event.target && event.target.classList.contains('add-to-cart-btn')) {
                const button = event.target;
                const productId = button.dataset.productId;
                if (!productId) {
                    console.error("app.js: Add to cart button clicked, but no product ID found.", button);
                    return;
                }
                let quantity = 1;
                // For product detail page, check for quantity input
                if (pagePath.includes("product-detail.html")) {
                    const quantityInput = document.getElementById('quantity');
                    if (quantityInput) {
                        quantity = parseInt(quantityInput.value, 10) || 1;
                    }
                }
                console.log(`app.js: Add to cart: Product ID ${productId}, Quantity ${quantity}`);
                button.textContent = "Adding...";
                button.disabled = true;
                await addToCart(productId, quantity); // addToCart handles UI update via updateCartCountDisplay
                // Restore button text after a short delay or based on success/failure (optional)
                setTimeout(() => {
                    button.textContent = "Add to Cart";
                    button.disabled = false;
                }, 1000);
            }
        });

        // --- Mobile Menu Toggle ---
        console.log("app.js: Attempting to attach mobile menu toggle listener...");
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mainNavLinks = document.getElementById('main-nav-links');

        if (mobileMenuToggle && mainNavLinks) {
            console.log("app.js: Mobile menu toggle and nav links found. Attaching click listener.");
            mobileMenuToggle.addEventListener('click', () => {
                console.log('app.js: Mobile menu button clicked!');
                console.log('app.js: Nav links classList before toggle:', mainNavLinks.classList);
                mainNavLinks.classList.toggle('nav-open');
                console.log('app.js: Nav links classList after toggle:', mainNavLinks.classList);
                const isExpanded = mainNavLinks.classList.contains('nav-open');
                mobileMenuToggle.setAttribute('aria-expanded', isExpanded.toString());
                console.log(`app.js: aria-expanded set to: ${isExpanded}`);
            });
        } else {
            console.warn("app.js: Mobile menu toggle button or nav links element not found. Menu will not work.");
            if (!mobileMenuToggle) console.warn("app.js: #mobile-menu-toggle not found.");
            if (!mainNavLinks) console.warn("app.js: #main-nav-links not found.");
        }
        
        // Final diagnostic message for login page
        if (loginErrorDebug && window.location.pathname.includes('login.html')) {
            loginErrorDebug.textContent = 'js/app.js initialization attempt complete (check console for details).';
            loginErrorDebug.style.color = 'green'; // Assuming success if no error caught
        }

    } catch (error) {
        console.error("app.js: CRITICAL ERROR during DOMContentLoaded initialization:", error);
        if (loginErrorDebug && window.location.pathname.includes('login.html')) {
            loginErrorDebug.textContent = `JS INIT ERROR: ${error.message}. See console.`;
            loginErrorDebug.style.color = 'red';
        } else {
            // Fallback for other pages or if login-error itself is the issue
            alert(`Critical JS Error: ${error.name} - ${error.message}. Check console.`);
        }
    }
});

// --- Product Page Specific Listeners (including new search) ---
function setupProductPageListeners() {
    console.log("app.js: Setting up product page listeners (price, sort, search).");
    const applyPriceFilterBtn = document.getElementById('apply-price-filter-btn');
    const clearPriceFilterBtn = document.getElementById('clear-price-filter-btn');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const sortOptionsSelect = document.getElementById('sort-options');
    const productPageSearchForm = document.getElementById('product-page-search-form'); // New search form

    if (applyPriceFilterBtn && minPriceInput && maxPriceInput) {
        applyPriceFilterBtn.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const minVal = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
            const maxVal = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

            if (minVal !== null && !isNaN(minVal)) urlParams.set('min_price', minVal.toString());
            else urlParams.delete('min_price');
            
            if (maxVal !== null && !isNaN(maxVal) && maxVal > 0) urlParams.set('max_price', maxVal.toString());
            else urlParams.delete('max_price');
            
            window.location.search = urlParams.toString();
        });
    }

    if (clearPriceFilterBtn) {
        clearPriceFilterBtn.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.delete('min_price');
            urlParams.delete('max_price');
            window.location.search = urlParams.toString();
        });
    }

    if (sortOptionsSelect) {
        sortOptionsSelect.addEventListener('change', () => {
            const selectedSortValue = sortOptionsSelect.value;
            const urlParams = new URLSearchParams(window.location.search);
            if (selectedSortValue) {
                urlParams.set('sort_by', selectedSortValue);
            } else {
                urlParams.delete('sort_by');
            }
            window.location.search = urlParams.toString();
        });
    }

    if (productPageSearchForm) {
        console.log("app.js: Product page search form found, attaching listener.");
        productPageSearchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const searchInput = document.getElementById('product-page-search-input');
            const query = searchInput.value.trim();
            
            const urlParams = new URLSearchParams(window.location.search);
            if (query) {
                urlParams.set('search', query);
            } else {
                urlParams.delete('search');
            }
            window.location.search = urlParams.toString(); 
        });
    } else {
        console.warn("app.js: Product page search form (#product-page-search-form) not found.");
    }
}

// --- Product Listing Page (products.html) ---
async function renderProductListPage() {
    console.log("app.js: renderProductListPage called.");
    const productListContainer = document.getElementById('product-list');
    if (!productListContainer) {
        console.warn("app.js: Product list container not found in renderProductListPage.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const categoryId = urlParams.get('category');
    const minPriceStr = urlParams.get('min_price');
    const maxPriceStr = urlParams.get('max_price');
    const sortBy = urlParams.get('sort_by');

    // Populate search input on products page if param exists
    const productPageSearchInput = document.getElementById('product-page-search-input');
    if (productPageSearchInput && searchQuery) {
        productPageSearchInput.value = searchQuery;
    }

    const minPrice = minPriceStr ? parseFloat(minPriceStr) : null;
    const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : null;

    const minPriceInput = document.getElementById('min-price');
    const maxPriceInputEl = document.getElementById('max-price'); // Renamed to avoid conflict
    const sortOptionsSelect = document.getElementById('sort-options');

    if (minPriceInput && minPrice !== null) minPriceInput.value = minPrice.toString();
    if (maxPriceInputEl && maxPrice !== null) maxPriceInputEl.value = maxPrice.toString();
    if (sortOptionsSelect && sortBy) sortOptionsSelect.value = sortBy;
    
    let pageTitle = "Our Products"; 
    const pageTitleElement = document.querySelector('main.container > h2'); // More specific selector
    
    // Update title based on filters
    let titleParts = [];
    if (searchQuery) titleParts.push(`Search: "${searchQuery}"`);
    if (categoryId) { // Fetch category name for title
        try {
            const catDoc = await getDoc(doc(db, "categories", categoryId));
            if (catDoc.exists()) {
                titleParts.push(`Category: "${catDoc.data().name}"`);
            } else {
                titleParts.push("Category");
            }
        } catch (err) {
            console.error("Error fetching category name for title:", err);
            titleParts.push("Category");
        }
    }
    if (minPrice !== null || maxPrice !== null) {
        let priceRange = "";
        if (minPrice !== null && maxPrice !== null) priceRange = `$${minPrice} - $${maxPrice}`;
        else if (minPrice !== null) priceRange = `From $${minPrice}`;
        else if (maxPrice !== null) priceRange = `Up to $${maxPrice}`;
        if (priceRange) titleParts.push(priceRange);
    }
    if (titleParts.length > 0) pageTitle = titleParts.join(' | ');
    
    if (pageTitleElement) pageTitleElement.textContent = pageTitle;
    else console.warn("app.js: Page title element not found for products page.");

    productListContainer.innerHTML = '<p class="loading-message">Loading products...</p>';

    try {
        const products = await fetchAllProducts({ 
            searchQuery: searchQuery, 
            categoryId: categoryId,
            minPrice: (minPrice !== null && !isNaN(minPrice)) ? minPrice : undefined,
            maxPrice: (maxPrice !== null && !isNaN(maxPrice) && maxPrice > 0) ? maxPrice : undefined,
            sortBy: sortBy
        });

        if (products.length === 0) {
            let noProductsMessage = '<p>No products found. Check back later!</p>';
            if (searchQuery || categoryId || minPrice !== null || maxPrice !== null || sortBy) {
                noProductsMessage = `<p>No products found matching your current filter and sort criteria.</p>`;
            }
            productListContainer.innerHTML = noProductsMessage;
            return;
        }
        productListContainer.innerHTML = ''; 
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            // Ensure product.imageUrl is defined or provide a fallback
            const imageUrl = product.imageUrl || 'https://via.placeholder.com/200x150.png?text=No+Image';
            productCard.innerHTML = `
                <a href="product-detail.html?id=${product.id}">
                    <img src="${imageUrl}" alt="${escapeHTML(product.name)}">
                    <h3>${escapeHTML(product.name)}</h3>
                </a>
                <p class="price">$${Number(product.price).toFixed(2)}</p>
                <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button> 
            `;
            productListContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error("app.js: Error rendering product list:", error);
        productListContainer.innerHTML = '<p>Error loading products. Please try refreshing the page.</p>';
    }
}

// --- Product Detail Page (product-detail.html) ---
async function renderProductDetailPage() {
    console.log("app.js: renderProductDetailPage called.");
    const productDetailContainer = document.getElementById('product-detail-content');
    if (!productDetailContainer) {
        console.warn("app.js: Product detail container not found.");
        return;
    }
    productDetailContainer.innerHTML = '<p class="loading-message">Loading product details...</p>';
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
        
        productDetailContainer.innerHTML = ''; 

        const imageSectionWrapper = document.createElement('div');
        imageSectionWrapper.className = 'product-image-section-wrapper';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'img-zoom-container';
        const imageUrl = product.imageUrl || 'https://via.placeholder.com/400x300.png?text=No+Image';
        imageContainer.innerHTML = `<img src="${imageUrl}" alt="${escapeHTML(product.name)}" class="product-image-large" id="product-main-image">`;
        imageSectionWrapper.appendChild(imageContainer);

        const zoomResultPane = document.createElement('div');
        zoomResultPane.id = 'img-zoom-result-pane';
        zoomResultPane.className = 'img-zoom-result';
        imageSectionWrapper.appendChild(zoomResultPane);
        
        productDetailContainer.appendChild(imageSectionWrapper);

        const productInfoContainer = document.createElement('div');
        productInfoContainer.className = 'product-info-container';
        productInfoContainer.innerHTML = `
            <h2>${escapeHTML(product.name)}</h2>
            <p class="description">${escapeHTML(product.description || '')}</p>
            <p class="price">$${Number(product.price).toFixed(2)}</p>
            <div class="stock-status-container"></div> 
            <div class="quantity-selector">
                <label for="quantity">Quantity:</label>
                <input type="number" id="quantity" name="quantity" value="1" min="1" style="width: 60px;">
            </div>
            <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
        `;
        productDetailContainer.appendChild(productInfoContainer);

        const mainImage = document.getElementById('product-main-image');
        if (mainImage) {
            mainImage.onload = () => {
                if (typeof initImageZoom === 'function') initImageZoom(mainImage, 'img-zoom-result-pane');
            };
            if (mainImage.complete && typeof initImageZoom === 'function') {
                 initImageZoom(mainImage, 'img-zoom-result-pane');
            }
        }
            
        const stockStatusContainer = productInfoContainer.querySelector('.stock-status-container');
        const addToCartButton = productInfoContainer.querySelector('.add-to-cart-btn');
        const stockStatusElement = document.createElement('p');
        stockStatusElement.classList.add('stock-status');

        if (product.stock === undefined) { 
            stockStatusElement.textContent = 'Stock information unavailable';
            stockStatusElement.classList.add('unavailable-stock');
        } else if (product.stock > 5) {
            stockStatusElement.textContent = `In Stock (${product.stock} available)`; 
            if (addToCartButton) addToCartButton.disabled = false;
        } else if (product.stock >= 1 && product.stock <= 5) {
            stockStatusElement.textContent = `Only ${product.stock} left!`;
            stockStatusElement.classList.add('low-stock');
            if (addToCartButton) addToCartButton.disabled = false;
        } else { 
            stockStatusElement.textContent = 'Out of Stock';
            stockStatusElement.classList.add('out-of-stock');
            if (addToCartButton) {
                addToCartButton.disabled = true;
                addToCartButton.textContent = 'Out of Stock';
            }
        }
        stockStatusContainer.appendChild(stockStatusElement);

    } catch (error) {
        console.error("app.js: Error rendering product details:", error);
        productDetailContainer.innerHTML = '<p>Error loading product details. Please try again.</p>';
    }
}

// --- Cart Page (cart.html) ---
function renderCartPage() {
    console.log("app.js: renderCartPage called.");
    const cartItemsContainer = document.getElementById('cart-items-container'); 
    const cartTotalElement = document.getElementById('cart-total'); 
    const checkoutButtonLink = document.querySelector('a.button[href="checkout.html"]');

    if (!cartItemsContainer || !cartTotalElement) {
        console.warn("app.js: Cart items container or total element not found.");
        return;
    }

    const items = getCartItems();
    const total = getCartTotal();
    cartItemsContainer.innerHTML = ''; 

    if (items.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty. <a href="products.html">Continue shopping!</a></p>';
        cartTotalElement.innerHTML = '';
        if(checkoutButtonLink) checkoutButtonLink.style.display = 'none'; 
        return;
    }
    if(checkoutButtonLink) checkoutButtonLink.style.display = 'inline-block'; 

    const table = document.createElement('table');
    table.className = 'cart-table'; 
    table.innerHTML = `
        <thead><tr><th>Image</th><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th>Action</th></tr></thead>
        <tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    items.forEach(item => {
        const row = tbody.insertRow();
        const imageUrl = item.imageUrl || 'https://via.placeholder.com/50x50.png?text=N/A';
        row.innerHTML = `
            <td><img src="${imageUrl}" alt="${escapeHTML(item.name)}" style="width:50px; height:auto;"></td>
            <td><a href="product-detail.html?id=${item.id}">${escapeHTML(item.name)}</a></td>
            <td>$${Number(item.price).toFixed(2)}</td>
            <td><input type="number" class="quantity-input" value="${item.quantity}" min="1" data-product-id="${item.id}" style="width: 60px;"></td>
            <td>$${(Number(item.price) * item.quantity).toFixed(2)}</td>
            <td><button class="remove-item-btn button" data-product-id="${item.id}">Remove</button></td>`;
        
        const quantityInput = row.querySelector('.quantity-input');
        quantityInput.addEventListener('change', (e) => {
            const newQuantity = parseInt(e.target.value, 10);
            if (!isNaN(newQuantity) && newQuantity > 0) {
                updateCartItemQuantity(item.id, newQuantity);
            } else if (!isNaN(newQuantity) && newQuantity <= 0) { // Auto-remove if quantity is 0 or less
                if (confirm(`Remove ${item.name} from cart?`)) removeFromCart(item.id);
                else quantityInput.value = item.quantity.toString(); // Revert if cancelled
            }
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
    console.log("app.js: renderCheckoutPage called.");
    const orderSummaryContainer = document.getElementById('checkout-order-summary-container'); 
    const mainCheckoutContainer = document.getElementById('checkout-form-container'); 
    const placeOrderBtn = document.getElementById('place-order-btn'); 
    const checkoutForm = document.getElementById('checkout-process-form');

    if (!orderSummaryContainer || !mainCheckoutContainer || !checkoutForm || !placeOrderBtn) {
        console.warn("app.js: One or more checkout page elements not found.");
        if (mainCheckoutContainer) mainCheckoutContainer.innerHTML = "<p>Checkout system error. Please try again later.</p>";
        return;
    }

    const cartItems = getCartItems();
    const cartTotal = getCartTotal();

    if (cartItems.length === 0) {
        mainCheckoutContainer.innerHTML = '<p>Your cart is empty. Add items to your cart to proceed to checkout. <a href="products.html" class="button">Go to Products</a></p>';
        placeOrderBtn.style.display = 'none';
        return;
    }
    
    let summaryHtml = '<h3>Order Summary</h3><ul class="checkout-summary-list">';
    cartItems.forEach(item => {
        summaryHtml += `<li>${escapeHTML(item.name)} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`;
    });
    summaryHtml += `</ul><p class="checkout-total"><strong>Grand Total: $${cartTotal.toFixed(2)}</strong></p>`;
    orderSummaryContainer.innerHTML = summaryHtml; 

    placeOrderBtn.style.display = 'block'; 
    if (!placeOrderBtn.dataset.listenerAttached) { 
        placeOrderBtn.addEventListener('click', async () => {
            if (!checkoutForm.checkValidity()) {
                checkoutForm.reportValidity();
                alert("Please fill out all required shipping address fields correctly.");
                return; 
            }
            placeOrderBtn.textContent = 'Placing Order...';
            placeOrderBtn.disabled = true;
            try {
                await placeOrder(); // placeOrder now reads from form directly
            } catch (error) {
                console.error("app.js: Error during placeOrder call:", error);
                alert(`An unexpected error occurred while placing your order: ${error.message}. Please try again.`);
                placeOrderBtn.textContent = 'Place Order';
                placeOrderBtn.disabled = false;
            }
        });
        placeOrderBtn.dataset.listenerAttached = 'true';
    }
}

// --- Order Confirmation Page (order_confirmation.html) ---
function renderOrderConfirmationPage() {
    console.log("app.js: renderOrderConfirmationPage called.");
    const orderDetailsContainer = document.getElementById('order-details-container'); 
    if (!orderDetailsContainer) {
        console.warn("app.js: Order details container not found.");
        return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (orderId) {
        orderDetailsContainer.innerHTML = `
            <h2>Thank You For Your Order!</h2>
            <p>Your order has been placed successfully.</p>
            <p>Your Order ID is: <strong>${escapeHTML(orderId)}</strong></p>
            <p>You will receive an email confirmation shortly (feature not implemented).</p>
            <div class="confirmation-actions">
                <a href="products.html" class="button">Continue Shopping</a>
                <a href="profile.html" class="button">View Order History</a>
            </div>
        `;
    } else {
        orderDetailsContainer.innerHTML = `
            <h2>Order Confirmation Error</h2>
            <p>Order ID not found. If you just placed an order, please check your email or contact support.</p>
            <a href="index.html" class="button">Back to Homepage</a>
        `;
    }
}

// --- Admin Page Gatekeeper (root admin.html) & Set Admin Tool ---
function handleRootAdminPageAccess() {
    console.log("app.js: handleRootAdminPageAccess called.");
    const accessMessageElement = document.getElementById('admin-access-message');
    const setAdminToolContainer = document.getElementById('set-admin-tool-container');

    // Listener is set by observeAuthState, this function just updates UI based on current user state
    const user = firebaseAuth.currentUser; 
    if (user && user.customClaims && user.customClaims.isAdmin === true) {
        if (accessMessageElement) accessMessageElement.textContent = "Admin access confirmed. Redirecting to dashboard...";
        if (setAdminToolContainer) setAdminToolContainer.style.display = 'block'; 
        // Redirect after a short delay to allow message to be read, or if tool is not present
        if(!setAdminToolContainer || setAdminToolContainer.style.display === 'none') {
             setTimeout(() => window.location.href = 'admin/dashboard.html', 1000);
        }
    } else if (user) {
        if (accessMessageElement) accessMessageElement.textContent = "Access Denied. You are not an authorized administrator. If you believe this is an error, contact support or use the tool below if you are the first admin.";
        if (setAdminToolContainer) setAdminToolContainer.style.display = 'block'; // Allow attempt to set first admin
    } else { // No user
        if (accessMessageElement) accessMessageElement.textContent = "Please login to access admin functionalities.";
        if (setAdminToolContainer) setAdminToolContainer.style.display = 'none';
    }
}

function setupAdminFormListener() {
    console.log("app.js: setupAdminFormListener called.");
    const setAdminForm = document.getElementById('set-admin-form');
    const feedbackElement = document.getElementById('set-admin-feedback');

    if (setAdminForm && feedbackElement) {
        console.log("app.js: Set admin form found, attaching listener.");
        if (!setAdminForm.dataset.listenerAttached) { 
            setAdminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebaseAuth.currentUser;
                if (!user) {
                    feedbackElement.textContent = 'Error: You are not logged in.'; return;
                }
                // No need to check isAdmin here, function is callable by anyone, but secured server-side.
                // The primary check is that only an admin can *see* the tool to make another user admin later.
                // For the *first* admin, this tool is essential.

                const userIdToMakeAdmin = document.getElementById('set-admin-userId').value.trim();
                feedbackElement.textContent = 'Processing...';
                setAdminForm.querySelector('button').disabled = true;

                if (!userIdToMakeAdmin) {
                    feedbackElement.textContent = 'Please enter a User ID (UID).';
                    setAdminForm.querySelector('button').disabled = false;
                    return;
                }

                try {
                    console.log(`app.js: Calling setAdminClaim Firebase Function for UID: ${userIdToMakeAdmin}`);
                    const result = await setAdminClaimCallable({ userId: userIdToMakeAdmin });
                    feedbackElement.textContent = result.data.message || 'Success! Refresh to see changes.';
                    console.log("app.js: Set admin claim result:", result);
                    alert(result.data.message || 'Admin claim set successfully. Please re-login or refresh the page if you are the target user.');
                } catch (error) {
                    console.error("app.js: Error calling setAdminClaim Firebase Function:", error);
                    feedbackElement.textContent = `Error: ${error.message || 'Could not set admin claim. Check console and Firebase Function logs.'}`;
                } finally {
                    setAdminForm.querySelector('button').disabled = false;
                }
            });
            setAdminForm.dataset.listenerAttached = 'true';
        }
    } else {
        console.warn("app.js: Set admin form or feedback element not found.");
    }
}

// --- Featured Products on Homepage (index.html) ---
async function displayFeaturedProducts() {
    console.log("app.js: displayFeaturedProducts called.");
    const featuredProductListContainer = document.getElementById('featured-product-list');
    if (!featuredProductListContainer) {
        console.warn("app.js: Featured product list container not found.");
        return;
    }
    featuredProductListContainer.innerHTML = '<p class="loading-message">Loading featured products...</p>';

    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("isFeatured", "==", true), limit(4)); 
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            featuredProductListContainer.innerHTML = '<p>No featured products at the moment. Check back soon!</p>';
            return;
        }

        featuredProductListContainer.innerHTML = ''; 
        querySnapshot.forEach((docSnap) => {
            const product = { id: docSnap.id, ...docSnap.data() };
            const productCard = document.createElement('div');
            productCard.className = 'product-card'; 
            const imageUrl = product.imageUrl || 'https://via.placeholder.com/200x150.png?text=No+Image';
            productCard.innerHTML = `
                <a href="product-detail.html?id=${product.id}">
                    <img src="${imageUrl}" alt="${escapeHTML(product.name)}">
                    <h3>${escapeHTML(product.name)}</h3>
                </a>
                <p class="price">$${Number(product.price).toFixed(2)}</p>
                <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button> 
            `;
            featuredProductListContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error("app.js: Error fetching featured products: ", error);
        featuredProductListContainer.innerHTML = '<p>Error loading featured products. Please try again later.</p>';
    }
}

// --- Homepage Categories Display (index.html) ---
async function displayHomepageCategories() {
    console.log("app.js: displayHomepageCategories called.");
    const homeCategoryListContainer = document.getElementById('home-category-list');
    if (!homeCategoryListContainer) {
        console.warn("app.js: Home category list container not found.");
        return;
    }
    homeCategoryListContainer.innerHTML = '<p class="loading-message">Loading categories...</p>';

    try {
        const categoriesCollectionRef = collection(db, "categories");
        const q = query(categoriesCollectionRef, limit(6)); // Limit categories on homepage
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            homeCategoryListContainer.innerHTML = '<p>No categories available yet. Stay tuned!</p>';
            return;
        }

        homeCategoryListContainer.innerHTML = ''; 
        querySnapshot.forEach((docSnap) => {
            const category = { id: docSnap.id, ...docSnap.data() };
            const categoryElement = document.createElement('a');
            categoryElement.href = `products.html?category=${category.id}`;
            categoryElement.className = 'category-card button'; 
            categoryElement.textContent = escapeHTML(category.name);
            homeCategoryListContainer.appendChild(categoryElement);
        });
    } catch (error) {
        console.error("app.js: Error fetching categories for homepage: ", error);
        homeCategoryListContainer.innerHTML = '<p>Error loading categories. Please try refreshing.</p>';
    }
}

// --- Category Filters on Products Page (products.html) ---
async function displayCategoryFilters() {
    console.log("app.js: displayCategoryFilters called.");
    const categoryFilterListContainer = document.getElementById('category-filter-list');
    if (!categoryFilterListContainer) {
        console.warn("app.js: Category filter list container not found.");
        return;
    }
    categoryFilterListContainer.innerHTML = '<p class="loading-message">Loading filters...</p>';

    try {
        const categoriesCollectionRef = collection(db, "categories");
        const querySnapshot = await getDocs(categoriesCollectionRef);

        const currentUrlParams = new URLSearchParams(window.location.search);
        
        categoryFilterListContainer.innerHTML = ''; 

        const allCategoriesLink = document.createElement('a');
        const allCatParams = new URLSearchParams(currentUrlParams); // Preserve other params
        allCatParams.delete('category'); // Remove category for "All"
        allCategoriesLink.href = `products.html${allCatParams.toString() ? '?' + allCatParams.toString() : ''}`;
        allCategoriesLink.textContent = 'All Categories';
        allCategoriesLink.className = 'category-filter-link button'; 
        if (!currentUrlParams.has('category')) {
            allCategoriesLink.classList.add('active-filter');
        }
        categoryFilterListContainer.appendChild(allCategoriesLink);

        if (querySnapshot.empty) {
            // No specific message needed if "All Categories" is present
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const category = { id: docSnap.id, ...docSnap.data() };
            const categoryLink = document.createElement('a');
            const catParams = new URLSearchParams(currentUrlParams); // Preserve other params
            catParams.set('category', category.id);
            
            categoryLink.href = `products.html?${catParams.toString()}`;
            categoryLink.textContent = escapeHTML(category.name);
            categoryLink.className = 'category-filter-link button'; 

            if (currentUrlParams.get('category') === category.id) {
                categoryLink.classList.add('active-filter');
            }
            categoryFilterListContainer.appendChild(categoryLink);
        });

    } catch (error) {
        console.error("app.js: Error fetching categories for filters: ", error);
        categoryFilterListContainer.innerHTML = '<p>Error loading category filters.</p>';
    }
}

// --- Homepage Carousel Functionality ---
function initCarousel(carouselId) {
    console.log(`app.js: Initializing carousel "${carouselId}".`);
    const carousel = document.getElementById(carouselId);
    if (!carousel) {
        console.warn(`app.js: Carousel with ID "${carouselId}" not found.`);
        return;
    }

    const slidesContainer = carousel.querySelector('.carousel-slides');
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const prevButton = carousel.querySelector('.carousel-control.prev');
    const nextButton = carousel.querySelector('.carousel-control.next');
    const indicatorsContainer = carousel.querySelector('.carousel-indicators');
    
    if (!slidesContainer || slides.length === 0 || !prevButton || !nextButton || !indicatorsContainer) {
        console.warn(`app.js: Carousel "${carouselId}" is missing required elements.`);
        return;
    }

    let currentSlide = 0;
    let autoPlayInterval = null;
    const autoPlayDelay = 5000;

    function createIndicators() {
        indicatorsContainer.innerHTML = '';
        slides.forEach((_, index) => {
            const indicator = document.createElement('button');
            indicator.setAttribute('type', 'button'); // Good practice
            indicator.classList.add('carousel-indicator');
            indicator.dataset.slideTo = index.toString();
            indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
            if (index === currentSlide) indicator.classList.add('active');
            indicator.addEventListener('click', () => showSlide(index, true));
            indicatorsContainer.appendChild(indicator);
        });
    }
    
    function updateIndicators() {
        const indicators = indicatorsContainer.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator, index) => {
            if (index === currentSlide) indicator.classList.add('active');
            else indicator.classList.remove('active');
        });
    }

    function showSlide(index, isManual = false) {
        if (slides[currentSlide]) slides[currentSlide].classList.remove('active-slide');
        else console.warn("app.js: Current slide element not found in showSlide for index", currentSlide);
        
        currentSlide = (index + slides.length) % slides.length; // Loop robustly
        
        if (slides[currentSlide]) slides[currentSlide].classList.add('active-slide');
        else console.warn("app.js: New current slide element not found in showSlide for index", currentSlide);

        updateIndicators();

        if (isManual && autoPlayInterval) {
            clearInterval(autoPlayInterval);
            startAutoPlay();
        }
    }

    prevButton.addEventListener('click', () => showSlide(currentSlide - 1, true));
    nextButton.addEventListener('click', () => showSlide(currentSlide + 1, true));

    function startAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(() => showSlide(currentSlide + 1), autoPlayDelay);
    }

    if (slides.length > 0) {
        createIndicators();
        if (slides[0]) slides[0].classList.add('active-slide'); // Ensure first slide is active
        else console.warn("app.js: First slide for carousel not found.");
        updateIndicators();
        startAutoPlay();
    }
}

// --- Image Zoom Functionality ---
function initImageZoom(imgElement, resultPaneId) {
    console.log(`app.js: Initializing image zoom for image:`, imgElement);
    if (!imgElement) { console.error("app.js: Image element for zoom is null."); return; }

    const imgContainer = imgElement.parentElement;
    if (!imgContainer || !imgContainer.classList.contains('img-zoom-container')) {
        console.error("app.js: Image for zoom is not wrapped in .img-zoom-container.");
        return;
    }
    imgContainer.style.position = "relative"; // Crucial for lens positioning

    const resultPane = document.getElementById(resultPaneId);
    if (!resultPane) {
        console.error(`app.js: Zoom result pane with ID "${resultPaneId}" not found.`);
        return;
    }

    // Remove any existing lens if re-initializing
    let lens = imgContainer.querySelector(".img-zoom-lens");
    if (lens) lens.remove();

    lens = document.createElement("DIV");
    lens.setAttribute("class", "img-zoom-lens");
    imgContainer.appendChild(lens);

    // Calculate ratio after lens and resultPane are in DOM and styled (offsetWidth/Height are available)
    let cx = resultPane.offsetWidth / lens.offsetWidth;
    let cy = resultPane.offsetHeight / lens.offsetHeight;

    resultPane.style.backgroundImage = "url('" + imgElement.src + "')";
    resultPane.style.backgroundSize = (imgElement.width * cx) + "px " + (imgElement.height * cy) + "px";

    const moveLens = (e) => {
        e.preventDefault();
        const pos = getCursorPos(e);
        let x = pos.x - (lens.offsetWidth / 2);
        let y = pos.y - (lens.offsetHeight / 2);

        if (x > imgElement.width - lens.offsetWidth) x = imgElement.width - lens.offsetWidth;
        if (x < 0) x = 0;
        if (y > imgElement.height - lens.offsetHeight) y = imgElement.height - lens.offsetHeight;
        if (y < 0) y = 0;

        lens.style.left = x + "px";
        lens.style.top = y + "px";
        resultPane.style.backgroundPosition = "-" + (x * cx) + "px -" + (y * cy) + "px";
    };

    const getCursorPos = (e) => {
        const a = imgElement.getBoundingClientRect();
        const pageX = e.touches ? e.touches[0].pageX : e.pageX;
        const pageY = e.touches ? e.touches[0].pageY : e.pageY;
        let x = pageX - a.left - window.pageXOffset;
        let y = pageY - a.top - window.pageYOffset;
        return { x: x, y: y };
    };
    
    // Event listeners
    const events = ["mousemove", "touchmove"];
    events.forEach(event => lens.addEventListener(event, moveLens));
    events.forEach(event => imgContainer.addEventListener(event, moveLens)); // Also listen on container

    imgContainer.addEventListener("mouseenter", () => {
        // Recalculate cx, cy if resultPane was hidden and dimensions might have changed
        // This is important if the resultPane's display was 'none' and becomes 'block'
        cx = resultPane.offsetWidth / lens.offsetWidth;
        cy = resultPane.offsetHeight / lens.offsetHeight;
        resultPane.style.backgroundSize = (imgElement.width * cx) + "px " + (imgElement.height * cy) + "px";

        lens.style.display = "block";
        resultPane.style.display = "block";
    });

    imgContainer.addEventListener("mouseleave", () => {
        lens.style.display = "none";
        resultPane.style.display = "none";
    });
}

// --- Utility Functions ---
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

// Make sure this is the last part of app.js if other modules might need to import from it,
// though typically app.js is an entry point and doesn't export much.
console.log("app.js: Script execution finished at the bottom.");
