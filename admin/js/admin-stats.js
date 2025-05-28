import { db, app as firebaseApp } from '../../js/firebase-config.js'; // Adjusted path
import { collection, getDocs,getCountFromServer } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

// HTML Elements for displaying stats
const statsTotalUsersElement = document.getElementById('stats-total-users');
const statsTotalOrdersElement = document.getElementById('stats-total-orders');
const statsTotalProductsElement = document.getElementById('stats-total-products');

// Initialize Firebase Functions
const functions = getFunctions(firebaseApp);
// listAllUsersCallable was conceptualized in Subtask 13 for admin-users.js
// It might not return total count efficiently. For a basic stub, we'll use it.
// A dedicated countUsers function would be better in production.
const listAllUsersCallable = httpsCallable(functions, 'listAllUsers'); 

async function renderStatisticsPage() {
    if (!statsTotalUsersElement || !statsTotalOrdersElement || !statsTotalProductsElement) {
        console.log("Required elements for statistics page not found.");
        return;
    }

    // --- Total Registered Users ---
    statsTotalUsersElement.textContent = 'Loading...';
    try {
        // The listAllUsers function (as conceptualized) might return a paginated list.
        // For a simple count here, we'll take the length of the first page.
        // A production system would ideally have a dedicated count function or a more
        // efficient way to get total user count if listAllUsers is paginated.
        // Or, the listAllUsers function could be modified to return the total count.
        // For this stub, we assume the first page is representative or the function returns enough.
        // A more robust way for just count would be another cloud function like `getTotalUserCount`.
        // For now, we will call listAllUsers and assume it gives a count or we take first page length.
        // The conceptual listAllUsers function was designed to return users.length for the first page.
        // If the function is designed to return all users (up to a limit, e.g. 1000), then .length is the count up to that limit.
        
        // Let's assume listAllUsers returns all users for simplicity of this stub,
        // acknowledging the performance implications for very large user bases.
        // The conceptual function in admin-users.js returns a paginated list.
        // We'll just fetch the first page and use that length for the stub.
        const result = await listAllUsersCallable({ maxResults: 1 }); // Fetching just 1 to see if it works, ideally a count or a small first page
        
        // If listAllUsers returns a total count as part of its result:
        // statsTotalUsersElement.textContent = result.data.totalUsers || 'N/A';
        // If it returns a list of users for the first page:
        statsTotalUsersElement.textContent = result.data.users ? result.data.users.length + (result.data.nextPageToken ? '+' : '') : 'Error';
        // For a true total, a separate cloud function `countUsers` would be better.
        // As a fallback for this stub if the function is not deployed or fails, we'll use a placeholder.
        // For now, let's simulate getting just the length of the first page of users for the "basic stub".
        // This is a known limitation as per the task description.
        // To get a more accurate count, the 'listAllUsers' function itself should be modified
        // or a new cloud function `getUserCount` should be created.
        // For this step, we'll proceed with a placeholder or a very rough estimate.
        // Given the existing `listAllUsersCallable` structure, we'll assume it might not give a total.
        // A more robust solution for just a count is `(await getCountFromServer(collection(db, "users_profiles"))).data().count;`
        // if such a collection exists and is maintained. Since it doesn't, we will use a placeholder for users.
        statsTotalUsersElement.textContent = "N/A (Requires dedicated count function or full list)";
        console.warn("Total users count is a placeholder. `listAllUsersCallable` is for listing, not efficient counting of all users.");


    } catch (error) {
        console.error("Error fetching total users:", error);
        statsTotalUsersElement.textContent = 'Error';
    }

    // --- Total Orders ---
    statsTotalOrdersElement.textContent = 'Loading...';
    try {
        const ordersCollectionRef = collection(db, "orders");
        const ordersSnapshot = await getCountFromServer(ordersCollectionRef);
        statsTotalOrdersElement.textContent = ordersSnapshot.data().count.toString();
    } catch (error) {
        console.error("Error fetching total orders:", error);
        statsTotalOrdersElement.textContent = 'Error';
    }

    // --- Total Products ---
    statsTotalProductsElement.textContent = 'Loading...';
    try {
        const productsCollectionRef = collection(db, "products");
        const productsSnapshot = await getCountFromServer(productsCollectionRef);
        statsTotalProductsElement.textContent = productsSnapshot.data().count.toString();
    } catch (error) {
        console.error("Error fetching total products:", error);
        statsTotalProductsElement.textContent = 'Error';
    }
}

// Ensure this script runs after DOM is loaded and only on admin/statistics.html
if (window.location.pathname.endsWith('/admin/statistics.html')) {
    document.addEventListener('DOMContentLoaded', renderStatisticsPage);
}

export { renderStatisticsPage }; // For potential manual refresh or testing.
