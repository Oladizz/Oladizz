import { db } from '../../js/firebase-config.js'; // Adjusted path
import { 
    collection, 
    getDocs, 
    query, 
    where, // To filter for completed orders
    orderBy // To order orders by timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const totalGrossIncomeElement = document.getElementById('total-gross-income');
const completedOrdersTableBody = document.getElementById('completed-orders-table-body');

async function renderIncomePage() {
    if (!totalGrossIncomeElement || !completedOrdersTableBody) {
        console.log("Required elements for income page not found.");
        return;
    }

    totalGrossIncomeElement.textContent = 'Total Gross Income: Calculating...';
    completedOrdersTableBody.innerHTML = '<tr><td colspan="4">Loading completed orders...</td></tr>';

    let totalIncome = 0;
    let completedOrdersHtml = "";

    try {
        // Query for orders where orderStatus is 'completed'
        const ordersQuery = query(
            collection(db, "orders"), 
            where("orderStatus", "==", "completed"),
            orderBy("timestamp", "desc") // Optional: order by date
        );
        const querySnapshot = await getDocs(ordersQuery);

        if (querySnapshot.empty) {
            completedOrdersTableBody.innerHTML = '<tr><td colspan="4">No completed orders found.</td></tr>';
            totalGrossIncomeElement.textContent = 'Total Gross Income: $0.00';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            const completionDate = order.timestamp && order.timestamp.toDate ? 
                                   order.timestamp.toDate().toLocaleDateString() : 
                                   'N/A';
            
            totalIncome += Number(order.totalPrice);

            completedOrdersHtml += `
                <tr>
                    <td>${orderId}</td>
                    <td>${completionDate}</td>
                    <td>${order.userId || 'N/A'}</td>
                    <td>$${Number(order.totalPrice).toFixed(2)}</td>
                </tr>
            `;
        });

        completedOrdersTableBody.innerHTML = completedOrdersHtml;
        totalGrossIncomeElement.textContent = `Total Gross Income: $${totalIncome.toFixed(2)}`;

    } catch (error) {
        console.error("Error fetching completed orders for income report: ", error);
        completedOrdersTableBody.innerHTML = '<tr><td colspan="4">Error loading completed orders.</td></tr>';
        totalGrossIncomeElement.textContent = 'Total Gross Income: Error';
    }
}

// Ensure this script runs after DOM is loaded and only on admin/income.html
if (window.location.pathname.endsWith('/admin/income.html')) {
    document.addEventListener('DOMContentLoaded', renderIncomePage);
}

export { renderIncomePage }; // For potential manual refresh or testing.
