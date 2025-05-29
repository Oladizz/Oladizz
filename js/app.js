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
import { app as firebaseApp, auth as firebaseAuth, db } from './firebase-config.js'; // Import Firebase app, auth instance, and db
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; // Firestore specific imports

console.log("app.js loaded");

// Initialize Firebase Functions
const functions = getFunctions(firebaseApp);
const setAdminClaimCallable = httpsCallable(functions, 'setAdminClaim');


document.addEventListener('DOMContentLoaded', () => {
    // Purpose: Extremely basic test to see if app.js is running and can modify login.html
    const loginPageHeading = document.querySelector('main.container h2'); // Targets the "Login" heading
    if (loginPageHeading && window.location.pathname.endsWith('/login.html')) {
        loginPageHeading.textContent = 'LOGIN PAGE JS TEST OK';
        loginPageHeading.style.color = 'purple'; 
    } else if (window.location.pathname.endsWith('/login.html')) {
        // If heading not found, use an alert for visibility on phone
        alert('LOGIN PAGE JS TEST: Heading not found by app.js!');
    }

    /*
    const loginErrorDebugForOuter = document.getElementById('login-error'); 
    if (loginErrorDebugForOuter) {
        loginErrorDebugForOuter.textContent = 'JS DOMContentLoaded fired. app.js is running.';
        loginErrorDebugForOuter.style.display = 'block';
        loginErrorDebugForOuter.style.color = 'blue'; 
    } else {
        console.log('app.js DOMContentLoaded fired (outer), not on login page for debug.');
    }

    try {
        console.log('DOM fully loaded and parsed - inside try block');

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
        const featuredProductListContainer = document.getElementById('featured-product-list');
        const homeCategoryListContainer = document.getElementById('home-category-list');
        const categoryFilterListContainer = document.getElementById('category-filter-list'); 

        if (pagePath.endsWith("index.html") || pagePath === "/") { 
            if (featuredProductListContainer) {
                displayFeaturedProducts();
            }
            if (homeCategoryListContainer) { 
                displayHomepageCategories();
            }
        } else if (pagePath.endsWith("products.html") && !pagePath.includes("admin/")) {
            renderProductListPage();
            if (categoryFilterListContainer) { 
                displayCategoryFilters();
            }
        } else if (pagePath.endsWith("product-detail.html")) {
            renderProductDetailPage();
        } else if (pagePath.endsWith("cart.html")) {
            renderCartPage();
            document.addEventListener('cartUpdated', renderCartPage);
        } else if (pagePath.endsWith("checkout.html")) {
            renderCheckoutPage();
        } else if (pagePath.endsWith("order_confirmation.html")) {
            renderOrderConfirmationPage();
        } else if (pagePath.endsWith("admin.html") && !pagePath.includes("admin/")) { 
            handleRootAdminPageAccess(); 
            setupAdminFormListener(); 
        } else if (pagePath.startsWith("/admin/")) { 
            firebaseAuth.onAuthStateChanged(async user => { 
                if (user) {
                    const idTokenResult = await user.getIdTokenResult(true); 
                    if (idTokenResult.claims.isAdmin === true) {
                        console.log("Admin user confirmed for /admin/ page:", pagePath);
                        const adminUserEmailElement = document.getElementById('admin-user-email');
                        if (adminUserEmailElement) {
                            adminUserEmailElement.textContent = user.email;
                        }
                    } else {
                        console.warn("Access Denied: Non-admin user attempting to access /admin/ page. Redirecting to main site homepage.");
                        alert("Access Denied. You are not authorized to view this page.");
                        window.location.href = '../index.html'; 
                    }
                } else {
                    console.warn("Access Denied: No user logged in. Redirecting from /admin/ page to login.");
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

        // --- Search Form Listener ---
        const searchForm = document.getElementById('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const searchInput = document.getElementById('search-input');
                const query = searchInput.value.trim();
                
                const currentUrlParams = new URLSearchParams(window.location.search);
                if (query) {
                    currentUrlParams.set('search', query);
                } else {
                    currentUrlParams.delete('search');
                }
                window.location.href = `products.html?${currentUrlParams.toString()}`;
            });
        }

        // --- Price Filter & Sort Listeners (only on products.html) ---
        if (pagePath.endsWith("products.html")) {
            setupProductPageListeners(); 
        }

        // --- Initialize Carousel (only on index.html) ---
        if (pagePath.endsWith("index.html") || pagePath === "/") {
            const carouselElement = document.getElementById('promotion-carousel');
            if (carouselElement) {
                initCarousel('promotion-carousel');
            }
        }

        // --- Mobile Menu Toggle ---
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mainNavLinks = document.getElementById('main-nav-links');

        if (mobileMenuToggle && mainNavLinks) {
            mobileMenuToggle.addEventListener('click', () => {
                mainNavLinks.classList.toggle('nav-open');
                const isExpanded = mainNavLinks.classList.contains('nav-open');
                mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
            });
        }

        // At the end of the try block, if on login page, change message:
        if (loginErrorDebugForOuter) {
             loginErrorDebugForOuter.textContent = 'app.js initial setup complete (no errors in try block).';
             loginErrorDebugForOuter.style.color = 'green';
        }

    } catch (e) {
        // If ANY error occurs during initial setup, display it
        if (loginErrorDebugForOuter) {
            loginErrorDebugForOuter.textContent = `ERROR in app.js setup: ${e.name} - ${e.message}`;
            loginErrorDebugForOuter.style.color = 'red';
            loginErrorDebugForOuter.style.display = 'block';
        } else {
            // Fallback for other pages or if login-error itself is an issue
            alert(`Critical JS Error: ${e.name} - ${e.message}`);
        }
        console.error("Critical error in app.js DOMContentLoaded:", e);
    }
    */
});

function setupProductPageListeners() {
    const applyPriceFilterBtn = document.getElementById('apply-price-filter-btn');
        const clearPriceFilterBtn = document.getElementById('clear-price-filter-btn');
        const minPriceInput = document.getElementById('min-price');
        const maxPriceInput = document.getElementById('max-price');
        const sortOptionsSelect = document.getElementById('sort-options');

        if (applyPriceFilterBtn) {
            applyPriceFilterBtn.addEventListener('click', () => {
                const currentUrlParams = new URLSearchParams(window.location.search);
                const minVal = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
                const maxVal = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

                if (minVal !== null && !isNaN(minVal)) currentUrlParams.set('min_price', minVal);
                else currentUrlParams.delete('min_price');
                
                if (maxVal !== null && !isNaN(maxVal) && maxVal > 0) currentUrlParams.set('max_price', maxVal);
                else currentUrlParams.delete('max_price');
                
                // Preserve other filters (search, category, sort_by)
                window.location.href = `products.html?${currentUrlParams.toString()}`;
            });
        }

        if (clearPriceFilterBtn) {
            clearPriceFilterBtn.addEventListener('click', () => {
                const currentUrlParams = new URLSearchParams(window.location.search);
                currentUrlParams.delete('min_price');
                currentUrlParams.delete('max_price');
                // Preserve other filters (search, category, sort_by)
                window.location.href = `products.html?${currentUrlParams.toString()}`;
            });
        }

        if (sortOptionsSelect) {
            sortOptionsSelect.addEventListener('change', () => {
                const selectedSortValue = sortOptionsSelect.value;
                const currentUrlParams = new URLSearchParams(window.location.search);
                if (selectedSortValue) {
                    currentUrlParams.set('sort_by', selectedSortValue);
                } else {
                    currentUrlParams.delete('sort_by'); // Remove for "Default"
                }
                // Preserve other filters (search, category, min_price, max_price)
                window.location.href = `products.html?${currentUrlParams.toString()}`;
            });
        }
    }
});

// --- Product Listing Page (products.html) ---
async function renderProductListPage() {
    const productListContainer = document.getElementById('product-list');
    if (!productListContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const categoryId = urlParams.get('category');
    const minPriceStr = urlParams.get('min_price');
    const maxPriceStr = urlParams.get('max_price');
    const sortBy = urlParams.get('sort_by'); // New: Get sortBy from URL

    const minPrice = minPriceStr ? parseFloat(minPriceStr) : null;
    const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : null;

    // Populate input fields and sort dropdown with URL values
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const sortOptionsSelect = document.getElementById('sort-options');

    if (minPriceInput && minPrice !== null) minPriceInput.value = minPrice;
    if (maxPriceInput && maxPrice !== null) maxPriceInput.value = maxPrice;
    if (sortOptionsSelect && sortBy) sortOptionsSelect.value = sortBy;


    let loadingMessage = '<p>Loading products...</p>';
    let pageTitle = "Our Products"; 
    const pageTitleElement = document.querySelector('.container h2'); 

    let titleParts = [];
    if (searchQuery) titleParts.push(`Search: "${searchQuery}"`);
    if (categoryId) titleParts.push(`Category`); // Placeholder
    if (minPrice !== null || maxPrice !== null) {
        let priceRange = "";
        if (minPrice !== null && maxPrice !== null) priceRange = `$${minPrice} - $${maxPrice}`;
        else if (minPrice !== null) priceRange = `From $${minPrice}`;
        else if (maxPrice !== null) priceRange = `Up to $${maxPrice}`;
        if (priceRange) titleParts.push(priceRange);
    }
    // Sort by is not usually part of the main title

    if (titleParts.length > 0) pageTitle = titleParts.join(' | ');
    
    if (pageTitleElement) pageTitleElement.textContent = pageTitle;
    else {
        const titleElement = document.createElement('h2');
        titleElement.textContent = pageTitle;
        titleElement.style.marginBottom = '1rem';
        if (productListContainer.parentNode && productListContainer.parentNode !== document.body) {
            productListContainer.parentNode.insertBefore(titleElement, productListContainer);
        } else {
            const tempWrapper = document.createElement('div');
            tempWrapper.appendChild(titleElement);
            productListContainer.insertAdjacentHTML('beforebegin', tempWrapper.innerHTML);
        }
    }
    
    productListContainer.innerHTML = loadingMessage;

    try {
        const products = await fetchAllProducts({ 
            searchQuery: searchQuery, 
            categoryId: categoryId,
            minPrice: (minPrice !== null && !isNaN(minPrice)) ? minPrice : undefined,
            maxPrice: (maxPrice !== null && !isNaN(maxPrice) && maxPrice > 0) ? maxPrice : undefined,
            sortBy: sortBy // New: Pass sortBy
        });

        if (products.length === 0) {
            let noProductsMessage = '<p>No products found. Check back later!</p>';
            if (searchQuery || categoryId || minPrice !== null || maxPrice !== null || sortBy) { // Added sortBy
                noProductsMessage = `<p>No products found matching your current filter and sort criteria.</p>`;
            }
            productListContainer.innerHTML = noProductsMessage;
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
        
        // Clear previous content and prepare for new structure
        productDetailContainer.innerHTML = ''; 

        // Create a wrapper for the image and its zoom result pane
        const imageSectionWrapper = document.createElement('div');
        imageSectionWrapper.className = 'product-image-section-wrapper'; // For potential flex styling

        // Original product image container (will become zoom container)
        const imageContainer = document.createElement('div');
        imageContainer.className = 'img-zoom-container'; // Will be targeted by initImageZoom
        imageContainer.innerHTML = `<img src="${product.imageUrl || 'https://via.placeholder.com/400x300.png?text=No+Image'}" alt="${product.name}" class="product-image-large" id="product-main-image">`;
        
        imageSectionWrapper.appendChild(imageContainer);

        // Create the zoom result pane placeholder next to the image container
        const zoomResultPane = document.createElement('div');
        zoomResultPane.id = 'img-zoom-result-pane'; // initImageZoom will use this
        zoomResultPane.className = 'img-zoom-result'; // For CSS styling
        imageSectionWrapper.appendChild(zoomResultPane);
        
        productDetailContainer.appendChild(imageSectionWrapper);

        // Product Info Container
        const productInfoContainer = document.createElement('div');
        productInfoContainer.className = 'product-info-container';
        productInfoContainer.innerHTML = `
            <h2>${product.name}</h2>
            <p class="description">${product.description}</p>
            <p class="price">$${Number(product.price).toFixed(2)}</p>
            {/* Stock status will be inserted here by JS */}
            <div class="quantity-selector">
                <label for="quantity">Quantity:</label>
                <input type="number" id="quantity" name="quantity" value="1" min="1" style="width: 60px;">
            </div>
            <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
        `;
        productDetailContainer.appendChild(productInfoContainer);

        // Initialize image zoom
        const mainImage = document.getElementById('product-main-image');
        if (mainImage) {
            // Ensure image is loaded before initializing zoom to get correct dimensions
            mainImage.onload = () => {
                initImageZoom(mainImage, 'img-zoom-result-pane');
            };
            // If image is already cached/loaded, onload might not fire, so call directly too
            if (mainImage.complete) {
                 initImageZoom(mainImage, 'img-zoom-result-pane');
            }
        }
            {/* Stock status will be inserted here by JS */}
            <div class="quantity-selector">
                <label for="quantity">Quantity:</label>
                <input type="number" id="quantity" name="quantity" value="1" min="1" style="width: 60px;">
            </div>
            <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
        `;

        // --- Stock Display and Button State Logic (within productInfoContainer) ---
        const stockStatusElement = document.createElement('p');
        stockStatusElement.classList.add('stock-status');

        const addToCartButton = productInfoContainer.querySelector('.add-to-cart-btn');
        const quantitySelectorDiv = productInfoContainer.querySelector('.quantity-selector');

        if (product.stock === undefined) { 
            stockStatusElement.textContent = 'Stock information unavailable';
            stockStatusElement.classList.add('unavailable-stock');
        } else if (product.stock > 5) {
            stockStatusElement.textContent = `In Stock`; 
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
        
        if (quantitySelectorDiv) {
            productInfoContainer.insertBefore(stockStatusElement, quantitySelectorDiv);
        } else if (addToCartButton) {
            productInfoContainer.insertBefore(stockStatusElement, addToCartButton);
        } else {
            productInfoContainer.appendChild(stockStatusElement);
        }

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
    // The main form container is now #checkout-process-form, which includes shipping.
    // We only need to populate the summary section.
    const orderSummaryContainer = document.getElementById('checkout-order-summary-container'); 
    const mainCheckoutContainer = document.getElementById('checkout-form-container'); // Parent container
    const orderSummaryContainer = document.getElementById('checkout-order-summary-container'); 
    const mainCheckoutContainer = document.getElementById('checkout-form-container'); 
    const placeOrderBtn = document.getElementById('place-order-btn'); 
    const checkoutForm = document.getElementById('checkout-process-form'); // Get the form

    if (!orderSummaryContainer || !mainCheckoutContainer || !checkoutForm) {
        console.warn("Checkout summary, main container, or form not found on page.");
        return;
    }

    const cartItems = getCartItems();
    const cartTotal = getCartTotal();

    if (cartItems.length === 0) {
        mainCheckoutContainer.innerHTML = '<p>Your cart is empty. Add items to your cart to proceed to checkout.</p>';
        if (placeOrderBtn) placeOrderBtn.style.display = 'none';
        return;
    }
    
    let summaryHtml = '<h3>Order Summary</h3><ul class="checkout-summary-list">';
    cartItems.forEach(item => {
        summaryHtml += `<li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`;
    });
    summaryHtml += `</ul><p class="checkout-total"><strong>Grand Total: $${cartTotal.toFixed(2)}</strong></p>`;
    
    orderSummaryContainer.innerHTML = summaryHtml; 

    if (placeOrderBtn) {
        placeOrderBtn.style.display = 'block'; 
        if (!placeOrderBtn.dataset.listenerAttached) { 
            placeOrderBtn.addEventListener('click', async () => {
                // Validate the form first
                if (!checkoutForm.checkValidity()) {
                    // checkoutForm.reportValidity(); // Shows browser default error bubbles
                    alert("Please fill out all required shipping address fields correctly.");
                    // Optionally, find the first invalid field and focus it.
                    // Example: checkoutForm.querySelector(':invalid')?.focus();
                    return; 
                }

                placeOrderBtn.textContent = 'Placing Order...';
                placeOrderBtn.disabled = true;
                try {
                    // placeOrder() in orders.js will now read the form values directly
                    await placeOrder(); 
                } catch (error) {
                    console.error("Error during placeOrder call from app.js:", error);
                    alert(`An unexpected error occurred: ${error.message}. Please try again.`);
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

// --- Featured Products on Homepage (index.html) ---
async function displayFeaturedProducts() {
    const featuredProductListContainer = document.getElementById('featured-product-list');
    if (!featuredProductListContainer) {
        console.log("Featured product list container not found on this page.");
        return;
    }
    featuredProductListContainer.innerHTML = '<p>Loading featured products...</p>';

    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("isFeatured", "==", true), limit(4)); // Get up to 4 featured products
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            featuredProductListContainer.innerHTML = '<p>No featured products at the moment. Check back soon!</p>';
            return;
        }

        featuredProductListContainer.innerHTML = ''; // Clear loading message
        querySnapshot.forEach((docSnap) => {
            const product = { id: docSnap.id, ...docSnap.data() }; // Combine ID and data
            const productCard = document.createElement('div');
            productCard.className = 'product-card'; // Use the same class as in products.html for styling
            productCard.innerHTML = `
                <a href="product-detail.html?id=${product.id}">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/200x150.png?text=No+Image'}" alt="${product.name}">
                    <h3>${product.name}</h3>
                </a>
                <p class="price">$${Number(product.price).toFixed(2)}</p>
                <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button> 
            `;
            featuredProductListContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error("Error fetching featured products: ", error);
        featuredProductListContainer.innerHTML = '<p>Error loading featured products. Please try again later.</p>';
    }
}

// --- Homepage Categories Display (index.html) ---
async function displayHomepageCategories() {
    const homeCategoryListContainer = document.getElementById('home-category-list');
    if (!homeCategoryListContainer) {
        console.log("Home category list container not found on this page.");
        return;
    }
    homeCategoryListContainer.innerHTML = '<p>Loading categories...</p>';

    try {
        const categoriesCollectionRef = collection(db, "categories");
        const querySnapshot = await getDocs(categoriesCollectionRef);

        if (querySnapshot.empty) {
            homeCategoryListContainer.innerHTML = '<p>No categories available yet. Stay tuned!</p>';
            return;
        }

        homeCategoryListContainer.innerHTML = ''; // Clear loading message
        querySnapshot.forEach((docSnap) => {
            const category = { id: docSnap.id, ...docSnap.data() };
            const categoryElement = document.createElement('a');
            categoryElement.href = `products.html?category=${category.id}`;
            categoryElement.className = 'category-card'; // For styling
            categoryElement.textContent = category.name;
            // Optionally add an image or more structure if desired later:
            // categoryElement.innerHTML = `<img src="${category.imageUrl || 'https://via.placeholder.com/150x100.png?text='+category.name}" alt="${category.name}"><span>${category.name}</span>`;
            homeCategoryListContainer.appendChild(categoryElement);
        });
    } catch (error) {
        console.error("Error fetching categories for homepage: ", error);
        homeCategoryListContainer.innerHTML = '<p>Error loading categories. Please try refreshing.</p>';
    }
}

// --- Category Filters on Products Page (products.html) ---
async function displayCategoryFilters() {
    const categoryFilterListContainer = document.getElementById('category-filter-list');
    if (!categoryFilterListContainer) {
        console.log("Category filter list container not found on products.html.");
        return;
    }
    categoryFilterListContainer.innerHTML = '<p>Loading filters...</p>';

    try {
        const categoriesCollectionRef = collection(db, "categories");
        const querySnapshot = await getDocs(categoriesCollectionRef);

        // Get current URL parameters to preserve them
        const currentUrlParams = new URLSearchParams(window.location.search);
        const currentSearchQuery = currentUrlParams.get('search');
        const currentMinPrice = currentUrlParams.get('min_price');
        const currentMaxPrice = currentUrlParams.get('max_price');
        const currentSortBy = currentUrlParams.get('sort_by'); // New: Get current sort_by

        categoryFilterListContainer.innerHTML = ''; 

        // Create "All Categories" link
        const allCategoriesLink = document.createElement('a');
        const allCatParams = new URLSearchParams();
        if (currentSearchQuery) allCatParams.set('search', currentSearchQuery);
        if (currentMinPrice) allCatParams.set('min_price', currentMinPrice);
        if (currentMaxPrice) allCatParams.set('max_price', currentMaxPrice);
        if (currentSortBy) allCatParams.set('sort_by', currentSortBy); // New: Preserve sort_by
        // No 'category' param for "All Categories"
        allCategoriesLink.href = `products.html${allCatParams.toString() ? '?' + allCatParams.toString() : ''}`;
        allCategoriesLink.textContent = 'All Categories';
        allCategoriesLink.className = 'category-filter-link button'; 
        if (!currentUrlParams.has('category')) {
            allCategoriesLink.classList.add('active-filter');
        }
        categoryFilterListContainer.appendChild(allCategoriesLink);

        if (querySnapshot.empty) {
            const noCategoriesMsg = document.createElement('p');
            noCategoriesMsg.textContent = 'No categories to filter by.';
            noCategoriesMsg.style.marginLeft = '10px'; 
            categoryFilterListContainer.appendChild(noCategoriesMsg);
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const category = { id: docSnap.id, ...docSnap.data() };
            const categoryLink = document.createElement('a');
            const catParams = new URLSearchParams();
            catParams.set('category', category.id);
            if (currentSearchQuery) catParams.set('search', currentSearchQuery);
            if (currentMinPrice) catParams.set('min_price', currentMinPrice);
            if (currentMaxPrice) catParams.set('max_price', currentMaxPrice);
            if (currentSortBy) catParams.set('sort_by', currentSortBy); // New: Preserve sort_by
            
            categoryLink.href = `products.html?${catParams.toString()}`;
            categoryLink.textContent = category.name;
            categoryLink.className = 'category-filter-link button'; 

            if (currentUrlParams.get('category') === category.id) {
                categoryLink.classList.add('active-filter');
            }
            categoryFilterListContainer.appendChild(categoryLink);
        });

    } catch (error) {
        console.error("Error fetching categories for filters: ", error);
        categoryFilterListContainer.innerHTML = '<p>Error loading category filters.</p>';
    }
}

// --- Homepage Carousel Functionality ---
function initCarousel(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) {
        console.warn(`Carousel with ID "${carouselId}" not found.`);
        return;
    }

    const slidesContainer = carousel.querySelector('.carousel-slides');
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const prevButton = carousel.querySelector('.carousel-control.prev');
    const nextButton = carousel.querySelector('.carousel-control.next');
    const indicatorsContainer = carousel.querySelector('.carousel-indicators');
    
    if (!slidesContainer || slides.length === 0 || !prevButton || !nextButton || !indicatorsContainer) {
        console.warn(`Carousel "${carouselId}" is missing some required elements (slides, controls, or indicators container).`);
        return;
    }

    let currentSlide = 0;
    let autoPlayInterval = null;
    const autoPlayDelay = 5000; // 5 seconds

    function createIndicators() {
        indicatorsContainer.innerHTML = ''; // Clear existing (if any)
        slides.forEach((_, index) => {
            const indicator = document.createElement('button');
            indicator.classList.add('carousel-indicator');
            indicator.dataset.slideTo = index;
            if (index === currentSlide) {
                indicator.classList.add('active');
            }
            indicator.addEventListener('click', () => {
                showSlide(index, true); // Manual navigation
            });
            indicatorsContainer.appendChild(indicator);
        });
    }
    
    function updateIndicators() {
        const indicators = indicatorsContainer.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator, index) => {
            if (index === currentSlide) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    function showSlide(index, isManual = false) {
        slides[currentSlide].classList.remove('active-slide');
        
        currentSlide = index;
        if (currentSlide >= slides.length) {
            currentSlide = 0;
        } else if (currentSlide < 0) {
            currentSlide = slides.length - 1;
        }
        
        slides[currentSlide].classList.add('active-slide');
        updateIndicators();

        if (isManual && autoPlayInterval) { // Reset autoplay on manual interaction
            clearInterval(autoPlayInterval);
            startAutoPlay();
        }
    }

    prevButton.addEventListener('click', () => {
        showSlide(currentSlide - 1, true);
    });

    nextButton.addEventListener('click', () => {
        showSlide(currentSlide + 1, true);
    });

    function startAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval); // Clear existing before starting
        autoPlayInterval = setInterval(() => {
            showSlide(currentSlide + 1);
        }, autoPlayDelay);
    }

    // Initialize
    if (slides.length > 0) {
        createIndicators();
        showSlide(0); // Show the first slide
        startAutoPlay(); // Start auto-play
    }
}


// --- Image Zoom Functionality ---
function initImageZoom(img, resultPaneId) {
    let lens, resultPane, cx, cy;

    // Ensure the image's parent has relative positioning for the lens
    const imgContainer = img.parentElement; // This should be .img-zoom-container
    if (!imgContainer || !imgContainer.classList.contains('img-zoom-container')) {
        console.error("Image zoom: Image is not wrapped in .img-zoom-container.");
        // Wrap it now if not already wrapped (this part might be better done in renderProductDetailPage)
        // For simplicity, we'll assume renderProductDetailPage sets up .img-zoom-container
        // img.outerHTML = `<div class="img-zoom-container">${img.outerHTML}</div>`;
        // imgContainer = img.parentElement;
        // imgContainer.style.position = "relative"; // Ensure it's relative
    }
     // If renderProductDetailPage isn't creating it, this would be a fallback.
    // But the plan is for renderProductDetailPage to create .img-zoom-container.
    imgContainer.style.position = "relative";


    resultPane = document.getElementById(resultPaneId);
    if (!resultPane) {
        console.error(`Zoom result pane with ID "${resultPaneId}" not found.`);
        return;
    }
    
    // Create lens:
    lens = document.createElement("DIV");
    lens.setAttribute("class", "img-zoom-lens");
    imgContainer.appendChild(lens); // Insert lens into the image's container

    // Calculate the ratio between resultPane display size and lens size
    // For this example, let's assume lens is 100x100 and resultPane is 300x300, so zoom factor = 3
    // These dimensions should ideally come from CSS or be configurable
    const lensWidth = 100; 
    const lensHeight = 100; 
    lens.style.width = `${lensWidth}px`;
    lens.style.height = `${lensHeight}px`;

    // Set resultPane dimensions if not already set by CSS (CSS is preferred)
    // const resultWidth = 300; 
    // const resultHeight = 300;
    // resultPane.style.width = `${resultWidth}px`;
    // resultPane.style.height = `${resultHeight}px`;


    // Must ensure resultPane is visible to get its dimensions if not fixed by CSS
    // This is tricky if CSS hides it initially. For now, assume CSS gives it dimensions.
    cx = resultPane.offsetWidth / lens.offsetWidth;
    cy = resultPane.offsetHeight / lens.offsetHeight;

    // Set background properties for the resultPane:
    resultPane.style.backgroundImage = "url('" + img.src + "')";
    resultPane.style.backgroundSize = (img.width * cx) + "px " + (img.height * cy) + "px";

    // Execute a function when someone moves the cursor over the image, or the lens:
    lens.addEventListener("mousemove", moveLens);
    imgContainer.addEventListener("mousemove", moveLens); // Listen on container to catch mouseenter/leave for lens visibility

    // And also for touch screens:
    lens.addEventListener("touchmove", moveLens);
    imgContainer.addEventListener("touchmove", moveLens);

    imgContainer.addEventListener("mouseenter", () => {
        lens.style.display = "block";
        resultPane.style.display = "block";
        // Recalculate cx, cy if resultPane was hidden and dimensions changed
        cx = resultPane.offsetWidth / lens.offsetWidth;
        cy = resultPane.offsetHeight / lens.offsetHeight;
        resultPane.style.backgroundSize = (img.width * cx) + "px " + (img.height * cy) + "px";
    });

    imgContainer.addEventListener("mouseleave", () => {
        lens.style.display = "none";
        resultPane.style.display = "none";
    });

    function moveLens(e) {
        let pos, x, y;
        // Prevent any other actions that may occur when moving over the image
        e.preventDefault();
        // Get the cursor's x and y positions:
        pos = getCursorPos(e);
        // Calculate the position of the lens:
        x = pos.x - (lens.offsetWidth / 2);
        y = pos.y - (lens.offsetHeight / 2);
        // Prevent the lens from being positioned outside the image:
        if (x > img.width - lens.offsetWidth) { x = img.width - lens.offsetWidth; }
        if (x < 0) { x = 0; }
        if (y > img.height - lens.offsetHeight) { y = img.height - lens.offsetHeight; }
        if (y < 0) { y = 0; }
        // Set the position of the lens:
        lens.style.left = x + "px";
        lens.style.top = y + "px";
        // Display what the lens "sees":
        resultPane.style.backgroundPosition = "-" + (x * cx) + "px -" + (y * cy) + "px";
    }

    function getCursorPos(e) {
        let a, x = 0, y = 0;
        e = e || window.event;
        // Get the x and y positions of the image:
        a = img.getBoundingClientRect();
        // Calculate the cursor's x and y coordinates, relative to the image:
        x = e.pageX - a.left;
        y = e.pageY - a.top;
        // Consider any page scrolling:
        x = x - window.pageXOffset;
        y = y - window.pageYOffset;
        return { x: x, y: y };
    }
}
