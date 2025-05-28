import { db } from '../../js/firebase-config.js'; // Adjusted path
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc,
    orderBy, // To order reviews
    query // To use orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const reviewsTableBody = document.getElementById('admin-reviews-table-body');

// --- Display Reviews ---
async function renderReviewsPage() {
    if (!reviewsTableBody) {
        console.log("Reviews table body not found on this page.");
        return;
    }
    reviewsTableBody.innerHTML = '<tr><td colspan="7">Loading reviews...</td></tr>';

    try {
        // Query reviews, ordered by timestamp descending (or by status pending first)
        const reviewsQuery = query(
            collection(db, "reviews"), 
            orderBy("status", "asc"), // Show 'pending' first, then 'approved', then 'rejected'
            orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(reviewsQuery);

        if (querySnapshot.empty) {
            reviewsTableBody.innerHTML = '<tr><td colspan="7">No reviews found.</td></tr>';
            return;
        }

        let reviewsHtml = "";
        querySnapshot.forEach((docSnap) => {
            const review = docSnap.data();
            const reviewId = docSnap.id;
            const submissionDate = review.timestamp && review.timestamp.toDate ? 
                                   review.timestamp.toDate().toLocaleDateString() : 
                                   'N/A';
            const commentSnippet = review.comment ? (review.comment.substring(0, 70) + (review.comment.length > 70 ? '...' : '')) : 'No comment';
            
            reviewsHtml += `
                <tr class="review-row status-${review.status || 'unknown'}">
                    <td>${review.productName || review.productId || 'N/A'}</td>
                    <td>${review.userEmail || review.userId || 'N/A'}</td>
                    <td>${review.rating || 'N/A'} ★</td>
                    <td>${commentSnippet}</td>
                    <td>${submissionDate}</td>
                    <td>
                        <select class="review-status-select admin-form-select" data-review-id="${reviewId}">
                            <option value="pending" ${review.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${review.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${review.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td>
                        ${review.status !== 'approved' ? `<button class="action-btn approve-btn" data-id="${reviewId}">Approve</button>` : ''}
                        ${review.status !== 'rejected' ? `<button class="action-btn reject-btn" data-id="${reviewId}">Reject</button>` : ''}
                        <!-- Future: <button class="action-btn delete-review-btn" data-id="${reviewId}">Delete</button> -->
                    </td>
                </tr>
            `;
        });
        reviewsTableBody.innerHTML = reviewsHtml;

        // Add event listeners for status dropdowns and action buttons
        document.querySelectorAll('.review-status-select').forEach(select => {
            select.addEventListener('change', (e) => updateReviewStatus(e.target.dataset.reviewId, e.target.value, e.target));
        });
        document.querySelectorAll('.approve-btn').forEach(button => {
            button.addEventListener('click', () => updateReviewStatus(button.dataset.id, 'approved', button));
        });
        document.querySelectorAll('.reject-btn').forEach(button => {
            button.addEventListener('click', () => updateReviewStatus(button.dataset.id, 'rejected', button));
        });

    } catch (error) {
        console.error("Error fetching reviews for admin: ", error);
        reviewsTableBody.innerHTML = '<tr><td colspan="7">Error loading reviews. Check console.</td></tr>';
    }
}

// --- Update Review Status ---
async function updateReviewStatus(reviewId, newStatus, uiElement) {
    if (!reviewId || !newStatus) {
        alert("Error: Missing review ID or new status.");
        return;
    }

    const originalButtonText = uiElement && uiElement.tagName === 'BUTTON' ? uiElement.textContent : null;
    if (uiElement) uiElement.disabled = true;
    if (uiElement && uiElement.tagName === 'BUTTON') uiElement.textContent = 'Updating...';


    try {
        const reviewRef = doc(db, "reviews", reviewId);
        await updateDoc(reviewRef, {
            status: newStatus
        });
        alert(`Review ${reviewId} status updated to ${newStatus}.`);
        // Refresh the list to show changes and correct button states
        await renderReviewsPage(); 
    } catch (error) {
        console.error(`Error updating status for review ${reviewId}: `, error);
        alert(`Failed to update status for review ${reviewId}. Error: ${error.message}`);
        if (uiElement && uiElement.tagName === 'BUTTON' && originalButtonText) uiElement.textContent = originalButtonText;
    } finally {
        if (uiElement) uiElement.disabled = false;
    }
}


// --- Initialize Page ---
function initAdminReviewsPage() {
    console.log("Initializing Admin Reviews Page...");
    renderReviewsPage();
}

// Ensure this script runs after DOM is loaded and only on admin/reviews.html
if (window.location.pathname.endsWith('/admin/reviews.html')) {
    document.addEventListener('DOMContentLoaded', initAdminReviewsPage);
}

export { renderReviewsPage, updateReviewStatus }; // For potential manual refresh or testing.
