import { db } from '../../js/firebase-config.js'; // Adjusted path
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, // Added getDoc for fetching single order for modal
    updateDoc,
    orderBy, 
    query,
    where // Added where for filtering
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ordersTableBody = document.getElementById('admin-orders-table-body');
const orderItemsModal = document.getElementById('order-items-modal');
const orderItemsModalContent = document.getElementById('modal-order-items-content');
const closeModalButton = document.querySelector('.order-modal-close'); 
const adminPageHeaderTitle = document.querySelector('.admin-main-content .admin-header h1'); // To update page title

// --- Display Orders ---
async function displayAdminOrders() {
    if (!ordersTableBody) {
        console.log("Orders table body not found on this page.");
        return;
    }
    ordersTableBody.innerHTML = '<tr><td colspan="6">Loading orders...</td></tr>';

    const urlParams = new URLSearchParams(window.location.search);
    const filterUserId = urlParams.get('userId');
    let originalPageTitle = "Manage Orders"; // Default title

    let ordersQuery;
    const ordersCollectionRef = collection(db, "orders");

    if (filterUserId) {
        console.log(`Filtering orders for userId: ${filterUserId}`);
        if (adminPageHeaderTitle) {
            originalPageTitle = adminPageHeaderTitle.textContent; // Store original if needed later
            adminPageHeaderTitle.textContent = `Orders for User: ${filterUserId.substring(0,10)}...`; // Show partial UID
        }
        ordersQuery = query(ordersCollectionRef, where('userId', '==', filterUserId), orderBy("timestamp", "desc"));
    } else {
        if (adminPageHeaderTitle && adminPageHeaderTitle.textContent !== originalPageTitle) {
             adminPageHeaderTitle.textContent = originalPageTitle; // Reset if no filter
        }
        ordersQuery = query(ordersCollectionRef, orderBy("timestamp", "desc"));
    }


    try {
        const querySnapshot = await getDocs(ordersQuery);

        if (querySnapshot.empty) {
            ordersTableBody.innerHTML = `<tr><td colspan="6">No orders found${filterUserId ? ' for this user' : ''}.</td></tr>`;
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
         if (adminPageHeaderTitle && filterUserId) { // Reset title on error if it was changed
            adminPageHeaderTitle.textContent = originalPageTitle;
        }
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

    selectElement.disabled = true;
    const originalBgColor = selectElement.style.backgroundColor;
    selectElement.style.backgroundColor = "var(--admin-accent-color)";


    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
            orderStatus: newStatus
        });
        alert(`Order ${orderId} status updated to ${newStatus}.`);
        selectElement.style.backgroundColor = "lightgreen"; 
        setTimeout(() => {
             selectElement.style.backgroundColor = originalBgColor; 
        }, 1500);

    } catch (error) {
        console.error(`Error updating status for order ${orderId}: `, error);
        alert(`Failed to update status for order ${orderId}. Error: ${error.message}`);
        // Find the previously selected option and revert
        const previouslySelectedOption = Array.from(selectElement.options).find(opt => opt.defaultSelected);
        if (previouslySelectedOption) selectElement.value = previouslySelectedOption.value;

        selectElement.style.backgroundColor = "lightcoral"; 
         setTimeout(() => {
             selectElement.style.backgroundColor = originalBgColor; 
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
    orderItemsModal.style.display = 'block'; 

    try {
        const orderRef = doc(db, "orders", orderId); // Need to import getDoc
        const docSnap = await getDoc(orderRef); // Make sure getDoc is imported

        if (docSnap.exists()) {
            const order = docSnap.data();
            if (order.items && order.items.length > 0) {
                let itemsHtml = `<h4>Items for Order ID: ${orderId}</h4><ul>`;
                order.items.forEach(item => {
                    itemsHtml += `
                        <li>
                            ${item.name} (ID: ${item.productId || item.id || 'N/A'}) - 
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
    displayAdminOrders(); // This will now check for userId in URL

    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideOrderItemsModal);
    }
    if (orderItemsModal) {
        orderItemsModal.addEventListener('click', (event) => {
            if (event.target === orderItemsModal) { 
                hideOrderItemsModal();
            }
        });
    }
}

if (window.location.pathname.endsWith('/admin/orders.html')) {
    document.addEventListener('DOMContentLoaded', initAdminOrdersPage);
}

export { displayAdminOrders, handleOrderStatusChange, showOrderItemsModal };
