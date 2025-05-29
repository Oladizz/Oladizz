import { auth, db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function displayUserProfile() {
    const profileUserEmailElement = document.getElementById('profile-user-email');
    const pastOrdersListContainer = document.getElementById('past-orders-list');

    // Display User Email
    if (auth.currentUser) {
        if (profileUserEmailElement) {
            profileUserEmailElement.textContent = auth.currentUser.email;
        }
    } else {
        if (profileUserEmailElement) {
            profileUserEmailElement.textContent = 'Not logged in.';
        }
        if (pastOrdersListContainer) {
            pastOrdersListContainer.innerHTML = '<p>Please login to view your profile and past orders.</p>';
        }
        // Auth.js should handle redirecting from protected page if not logged in.
        return; 
    }

    // Fetch and Display Past Orders
    if (pastOrdersListContainer && auth.currentUser) {
        const userId = auth.currentUser.uid;
        pastOrdersListContainer.innerHTML = '<p>Loading your orders...</p>'; // Initial loading message

        try {
            const ordersRef = collection(db, "orders");
            const q = query(ordersRef, where("userId", "==", userId), orderBy("timestamp", "desc"));
            
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                pastOrdersListContainer.innerHTML = '<p>You have no past orders.</p>';
                return;
            }

            pastOrdersListContainer.innerHTML = ''; // Clear loading message
            querySnapshot.forEach((doc) => {
                const order = doc.data();
                const orderId = doc.id;

                const orderCard = document.createElement('div');
                orderCard.className = 'order-card'; // For CSS styling
                // Ensure timestamp exists and has seconds property
                let orderDate = 'N/A';
                if (order.timestamp && typeof order.timestamp.seconds === 'number') {
                    orderDate = new Date(order.timestamp.seconds * 1000).toLocaleDateString();
                } else {
                    console.warn(`Order ${orderId} is missing a valid timestamp.`);
                }
                
                let itemsHtml = '<ul class="order-items-summary">';
                if (order.items && order.items.length > 0) {
                    order.items.slice(0, 3).forEach(item => { // Show first 3 items as example
                        itemsHtml += `<li>${item.name} (x${item.quantity})</li>`;
                    });
                    if (order.items.length > 3) {
                        itemsHtml += `<li>...and ${order.items.length - 3} more item(s)</li>`;
                    }
                } else {
                    itemsHtml += '<li>No item details available.</li>';
                }
                itemsHtml += '</ul>';

                orderCard.innerHTML = `
                    <h4>Order ID: ${orderId}</h4>
                    <p><strong>Date:</strong> ${orderDate}</p>
                    <p><strong>Total:</strong> $${Number(order.totalPrice).toFixed(2)}</p>
                    <p><strong>Status:</strong> ${order.orderStatus || 'N/A'}</p>
                    <p><strong>Items:</strong></p>
                    ${itemsHtml}
                    <!-- <button class="button view-order-details-btn" data-order-id="${orderId}" style="margin-top:10px;">View Details</button> -->
                `;
                pastOrdersListContainer.appendChild(orderCard);
            });

        } catch (error) {
            console.error("Error fetching past orders: ", error);
            pastOrdersListContainer.innerHTML = '<p>Error loading your orders. Please try again later.</p>';
        }
    }
}

function initProfilePage() {
    // Check for user auth state before displaying profile. 
    // Auth.js already handles redirection if not logged in from protected page.
    // So, if we reach here on profile.html, user should be logged in.
    // However, a direct check is good practice.
    if (auth.currentUser) {
        displayUserProfile();
    } else {
        // This case should ideally be handled by auth.js redirecting to login
        // if profile.html is correctly added to protectedPagePaths.
        console.warn("Attempted to initialize profile page without a logged-in user.");
        const pastOrdersListContainer = document.getElementById('past-orders-list');
        if (pastOrdersListContainer) {
             pastOrdersListContainer.innerHTML = '<p>Please login to view your profile.</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('/profile.html') || window.location.pathname.endsWith('/profile')) {
        // A slight delay for auth state to be potentially picked up by auth.js first
        // This helps ensure auth.currentUser is populated if login state is fresh.
        setTimeout(() => {
            initProfilePage();
        }, 100); 
    }
});
