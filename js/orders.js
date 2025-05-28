import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getCartItems, getCartTotal, clearCart } from './cart.js';

/**
 * Places an order by saving cart details to Firestore and clearing the cart.
 */
async function placeOrder() {
    // 1. Check user authentication
    const user = auth.currentUser;
    if (!user) {
        alert("Please login to place an order.");
        // Optionally redirect to login page. onAuthStateChanged might handle this too.
        // window.location.href = 'login.html'; 
        return; // Stop further execution
    }

    // 2. Get cart items
    const cartItems = getCartItems();
    if (cartItems.length === 0) {
        alert("Your cart is empty. Please add items to your cart before placing an order.");
        window.location.href = 'cart.html'; // Redirect to cart or products page
        return; // Stop further execution
    }

    // 3. Prepare order details
    const userId = user.uid;
    const totalPrice = getCartTotal();
    
    // Ensure items are deep copied if they are complex objects (though getCartItems() should return a fresh array)
    // For this structure, cartItems from getCartItems() is already a suitable copy.
    const orderDetails = {
        userId: userId,
        items: cartItems, // This is an array of objects from LocalStorage
        totalPrice: totalPrice,
        timestamp: serverTimestamp(), // Use Firestore server timestamp
        orderStatus: 'pending' // Default order status
    };

    // 4. Add order to Firestore
    try {
        const ordersCollectionRef = collection(db, 'orders');
        const newOrderRef = await addDoc(ordersCollectionRef, orderDetails);
        const newOrderId = newOrderRef.id;

        console.log("Order placed successfully. Order ID:", newOrderId);

        // 5. Clear the cart
        clearCart(); // This will also update the cart count display via its own logic

        // 6. Redirect to order confirmation page
        window.location.href = `order_confirmation.html?orderId=${newOrderId}`;

    } catch (error) {
        console.error("Error placing order:", error);
        alert(`Failed to place order: ${error.message}. Please try again.`);
        // Potentially disable the place order button temporarily here to prevent rapid retries
        const placeOrderBtn = document.getElementById('place-order-btn');
        if(placeOrderBtn) placeOrderBtn.disabled = false; // Re-enable if it was disabled
    }
}

export { placeOrder };
