import { db } from '../../js/firebase-config.js'; // Adjusted path
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc,
    orderBy, // To order orders by timestamp
    query // To use orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ordersTableBody = document.getElementById('admin-orders-table-body');
const orderItemsModal = document.getElementById('order-items-modal');
const orderItemsModalContent = document.getElementById('modal-order-items-content');
const closeModalButton = document.querySelector('.order-modal-close'); // Assuming a class for the close button

// --- Display Orders ---
async function displayAdminOrders() {
    if (!ordersTableBody) {
        console.log("Orders table body not found on this page.");
        return;
    }
    ordersTableBody.innerHTML = '<tr><td colspan="6">Loading orders...</td></tr>';

    try {
        // Query orders, ordered by timestamp descending
        const ordersQuery = query(collection(db, "orders"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(ordersQuery);

        if (querySnapshot.empty) {
            ordersTableBody.innerHTML = '<tr><td colspan="6">No orders found.</td></tr>';
            return;
        }

        let ordersHtml = "";
        querySnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            const orderDate = order.timestamp && order.timestamp.toDate ? 
                              order.timestamp.toDate().toLocaleDateString() : 
                              'N/A';
            
            ordersHtml += `
                <tr>
                    <td>${orderId}</td>
                    <td>${order.userId || 'N/A'}</td> 
                    <td>${orderDate}</td>
                    <td>$${Number(order.totalPrice).toFixed(2)}</td>
                    <td>
                        <select class="order-status-select admin-form-select" data-order-id="${orderId}">
                            <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="shipped" ${order.orderStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="completed" ${order.orderStatus === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn view-items-btn" data-order-id="${orderId}">View Items</button>
                    </td>
                </tr>
            `;
        });
        ordersTableBody.innerHTML = ordersHtml;

        // Add event listeners for status dropdowns and view items buttons
        document.querySelectorAll('.order-status-select').forEach(select => {
            select.addEventListener('change', handleOrderStatusChange);
        });
        document.querySelectorAll('.view-items-btn').forEach(button => {
            button.addEventListener('click', () => showOrderItemsModal(button.dataset.orderId));
        });

    } catch (error) {
        console.error("Error fetching orders for admin: ", error);
        ordersTableBody.innerHTML = '<tr><td colspan="6">Error loading orders. Check console.</td></tr>';
    }
}

// --- Handle Order Status Change ---
async function handleOrderStatusChange(event) {
    const selectElement = event.target;
    const orderId = selectElement.dataset.orderId;
    const newStatus = selectElement.value;

    if (!orderId || !newStatus) {
        alert("Error: Missing order ID or new status.");
        return;
    }

    // Add some visual feedback to the select element or row
    selectElement.disabled = true;
    const originalBgColor = selectElement.style.backgroundColor;
    selectElement.style.backgroundColor = "var(--admin-accent-color)";


    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
            orderStatus: newStatus
        });
        alert(`Order ${orderId} status updated to ${newStatus}.`);
        // Optionally, refresh part of the row or just rely on next full load
        // For now, just visual feedback and it will be correct on next page load/refresh of table
        selectElement.style.backgroundColor = "lightgreen"; // Indicate success
        setTimeout(() => {
             selectElement.style.backgroundColor = originalBgColor; // Revert after a moment
        }, 1500);

    } catch (error) {
        console.error(`Error updating status for order ${orderId}: `, error);
        alert(`Failed to update status for order ${orderId}. Error: ${error.message}`);
        selectElement.value = selectElement.querySelector('option[selected]').value; // Revert to original status on error
        selectElement.style.backgroundColor = "lightcoral"; // Indicate error
         setTimeout(() => {
             selectElement.style.backgroundColor = originalBgColor; // Revert after a moment
        }, 1500);
    } finally {
        selectElement.disabled = false;
    }
}

// --- Show Order Items Modal ---
async function showOrderItemsModal(orderId) {
    if (!orderItemsModal || !orderItemsModalContent) {
        console.error("Order items modal elements not found.");
        return;
    }

    orderItemsModalContent.innerHTML = '<p>Loading items...</p>';
    orderItemsModal.style.display = 'block'; // Show modal

    try {
        const orderRef = doc(db, "orders", orderId);
        const docSnap = await getDoc(orderRef);

        if (docSnap.exists()) {
            const order = docSnap.data();
            if (order.items && order.items.length > 0) {
                let itemsHtml = `<h4>Items for Order ID: ${orderId}</h4><ul>`;
                order.items.forEach(item => {
                    itemsHtml += `
                        <li>
                            ${item.name} (ID: ${item.id || item.productId || 'N/A'}) - 
                            Quantity: ${item.quantity} - 
                            Price: $${Number(item.price).toFixed(2)} each
                        </li>`;
                });
                itemsHtml += `</ul>`;
                orderItemsModalContent.innerHTML = itemsHtml;
            } else {
                orderItemsModalContent.innerHTML = '<p>No items found for this order.</p>';
            }
        } else {
            orderItemsModalContent.innerHTML = '<p>Order details not found.</p>';
        }
    } catch (error) {
        console.error("Error fetching order items:", error);
        orderItemsModalContent.innerHTML = '<p>Error loading order items. Please try again.</p>';
    }
}

// --- Hide Order Items Modal ---
function hideOrderItemsModal() {
    if (orderItemsModal) {
        orderItemsModal.style.display = 'none';
    }
}


// --- Initialize Page ---
function initAdminOrdersPage() {
    console.log("Initializing Admin Orders Page...");
    displayAdminOrders();

    // Event listener for closing the modal
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideOrderItemsModal);
    }
    // Also close modal if user clicks outside the modal content (optional)
    if (orderItemsModal) {
        orderItemsModal.addEventListener('click', (event) => {
            if (event.target === orderItemsModal) { // Clicked on the backdrop
                hideOrderItemsModal();
            }
        });
    }
}

// Ensure this script runs after DOM is loaded and only on admin/orders.html
if (window.location.pathname.endsWith('/admin/orders.html')) {
    document.addEventListener('DOMContentLoaded', initAdminOrdersPage);
}

export { displayAdminOrders, handleOrderStatusChange, showOrderItemsModal };
// Exporting for potential direct calls or testing.
