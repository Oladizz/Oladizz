import { db } from './firebase-config.js'; // To fetch product details
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CART_STORAGE_KEY = 'ecommerceCart';

/**
 * Loads the cart from Local Storage.
 * @returns {Array<Object>} The cart items array, or an empty array if no cart exists.
 */
function loadCart() {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    try {
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (e) {
        console.error("Error parsing cart from localStorage:", e);
        return []; // Return empty array on parsing error
    }
}

/**
 * Saves the cart to Local Storage.
 * @param {Array<Object>} cartArray The cart items array to save.
 */
function saveCart(cartArray) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartArray));
}

/**
 * Updates the cart item count display in the header.
 */
function updateCartCountDisplay() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const cart = loadCart();
        // Sum of quantities for a more accurate item count
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
    }
}

/**
 * Adds a product to the shopping cart.
 * @param {string} productId The ID of the product to add.
 * @param {number} [quantity=1] The quantity of the product to add.
 */
async function addToCart(productId, quantity = 1) {
    if (!productId) {
        console.error("Product ID is required to add to cart.");
        alert("Cannot add to cart: Product ID missing.");
        return;
    }
    if (quantity <= 0) {
        console.error("Quantity must be positive.");
        alert("Quantity must be greater than 0.");
        return;
    }

    try {
        // 1. Fetch product details from Firestore
        const productDocRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productDocRef);

        if (!docSnap.exists()) {
            console.error(`Product with ID ${productId} not found in Firestore.`);
            alert("Error: Product not found.");
            return;
        }
        const productData = docSnap.data();

        // 2. Load current cart
        let cart = loadCart();

        // 3. Check if product already exists
        const existingItemIndex = cart.findIndex(item => item.id === productId);

        if (existingItemIndex > -1) {
            // Product exists, update quantity
            cart[existingItemIndex].quantity += quantity;
        } else {
            // Product doesn't exist, add new item
            cart.push({
                id: productId,
                name: productData.name,
                price: productData.price,
                imageUrl: productData.imageUrl || '', // Use placeholder if no image
                quantity: quantity
            });
        }

        // 4. Save updated cart
        saveCart(cart);

        // 5. Update cart count display
        updateCartCountDisplay();

        // 6. User feedback
        console.log(`${productData.name} (x${quantity}) added/updated in cart.`);
        alert(`${productData.name} added to cart!`); // Simple feedback

    } catch (error) {
        console.error("Error adding product to cart:", error);
        alert("Failed to add product to cart. Please try again.");
    }
}

/**
 * Updates the quantity of an item in the cart. Removes if quantity <= 0.
 * @param {string} productId The ID of the product to update.
 * @param {number} newQuantity The new quantity.
 */
function updateCartItemQuantity(productId, newQuantity) {
    let cart = loadCart();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        if (newQuantity > 0) {
            cart[itemIndex].quantity = newQuantity;
        } else {
            // Remove item if quantity is 0 or less
            cart.splice(itemIndex, 1);
        }
        saveCart(cart);
        updateCartCountDisplay();
        
        // If on cart page, re-render (logic for this will be in app.js)
        if (window.location.pathname.includes("cart.html")) {
            // This is a bit of a hack; ideally app.js's renderCartPage would be callable
            // For now, we'll just reload if on cart page, or rely on app.js to handle it.
            // A better way is to have renderCartPage in app.js be accessible and call it.
            // For this step, we'll assume app.js will handle re-rendering if it's the current page.
            const event = new CustomEvent('cartUpdated');
            document.dispatchEvent(event);
        }
    } else {
        console.warn(`Item with ID ${productId} not found in cart for update.`);
    }
}

/**
 * Removes an item from the cart.
 * @param {string} productId The ID of the product to remove.
 */
function removeFromCart(productId) {
    let cart = loadCart();
    const updatedCart = cart.filter(item => item.id !== productId);

    if (cart.length !== updatedCart.length) {
        saveCart(updatedCart);
        updateCartCountDisplay();

        // If on cart page, re-render
         if (window.location.pathname.includes("cart.html")) {
            const event = new CustomEvent('cartUpdated');
            document.dispatchEvent(event);
        }
    } else {
        console.warn(`Item with ID ${productId} not found in cart for removal.`);
    }
}

/**
 * Retrieves all items from the cart.
 * @returns {Array<Object>} The cart items array.
 */
function getCartItems() {
    return loadCart();
}

/**
 * Calculates the total price of all items in the cart.
 * @returns {number} The total price.
 */
function getCartTotal() {
    const cart = loadCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Clears all items from the cart in Local Storage.
 */
function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartCountDisplay();
    
    // If on cart page, re-render
    if (window.location.pathname.includes("cart.html")) {
        const event = new CustomEvent('cartUpdated');
        document.dispatchEvent(event);
    }
    console.log("Cart cleared.");
}

export {
    loadCart,
    saveCart,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    getCartItems,
    getCartTotal,
    clearCart,
    updateCartCountDisplay
};
