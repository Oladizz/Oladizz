import { db, app as firebaseApp } from '../../js/firebase-config.js'; // Adjusted path for firebaseApp
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const usersTableBody = document.getElementById('admin-users-table-body');
const manageUserRoleModal = document.getElementById('manage-user-role-modal');
const manageUserRoleForm = document.getElementById('manage-user-role-form');
const modalUserIdInput = document.getElementById('modal-user-id');
const modalUserEmailDisplay = document.getElementById('modal-user-email');
const modalIsAdminCheckbox = document.getElementById('modal-is-admin');
const modalRoleFeedback = document.getElementById('modal-role-feedback');
const closeModalButtons = document.querySelectorAll('.user-role-modal-close'); // For multiple close buttons

// Initialize Firebase Functions
const functions = getFunctions(firebaseApp);
const listAllUsersCallable = httpsCallable(functions, 'listAllUsers');
const setAdminClaimCallable = httpsCallable(functions, 'setAdminClaim'); // From previous setup
const removeAdminClaimCallable = httpsCallable(functions, 'removeAdminClaim'); // New function
const toggleUserDisabledStatusCallable = httpsCallable(functions, 'toggleUserDisabledStatus'); // New function

let nextPageToken = null; // For pagination if implemented fully
const usersPerPage = 50; // Example, can be adjusted

// --- Display Users ---
async function displayAdminUsers(pageTokenForCall) {
    if (!usersTableBody) {
        console.log("Users table body not found on this page.");
        return;
    }
    usersTableBody.innerHTML = `<tr><td colspan="7">Loading users...</td></tr>`; // Adjusted colspan

    try {
        const result = await listAllUsersCallable({ pageToken: pageTokenForCall, maxResults: usersPerPage });
        const users = result.data.users;
        nextPageToken = result.data.nextPageToken; // Store for "Load More" button

        if (!users || users.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="7">No users found.</td></tr>`;
            // Hide "Load More" button if it exists
            const loadMoreBtn = document.getElementById('load-more-users-btn');
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        let usersHtml = "";
        users.forEach(user => {
            const creationDate = user.creationTime ? new Date(user.creationTime).toLocaleDateString() : 'N/A';
            const lastSignInDate = user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'N/A';
            usersHtml += `
                <tr>
                    <td>${user.uid}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.displayName || 'N/A'}</td>
                    <td>${creationDate}</td>
                    <td>${lastSignInDate}</td>
                    <td>
                        <button class="action-btn toggle-disabled-btn" data-uid="${user.uid}" data-current-disabled="${user.disabled}">
                            ${user.disabled ? 'Enable' : 'Disable'}
                        </button>
                        (${user.disabled ? 'Disabled' : 'Enabled'})
                    </td>
                    <td>${user.isAdmin ? 'Yes' : 'No'}</td>
                    <td>
                        <button class="action-btn manage-role-btn" data-uid="${user.uid}" data-email="${user.email || ''}" data-is-admin="${user.isAdmin}">Manage Role</button>
                        <a href="../admin/orders.html?userId=${user.uid}" class="action-btn view-orders-btn">View Orders</a>
                    </td>
                </tr>
            `;
        });
        
        if (pageTokenForCall) { // If appending
            usersTableBody.innerHTML += usersHtml;
        } else { // If first load
            usersTableBody.innerHTML = usersHtml;
        }
        

        // Add event listeners
        document.querySelectorAll('.manage-role-btn').forEach(button => {
            button.addEventListener('click', () => openManageRoleModal(
                button.dataset.uid, 
                button.dataset.email,
                button.dataset.isAdmin === 'true'
            ));
        });
        document.querySelectorAll('.toggle-disabled-btn').forEach(button => {
            button.addEventListener('click', () => handleToggleUserDisabled(
                button.dataset.uid,
                button.dataset.currentDisabled === 'true'
            ));
        });

        // Handle "Load More" button visibility
        const loadMoreBtn = document.getElementById('load-more-users-btn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = nextPageToken ? 'inline-block' : 'none';
        }

    } catch (error) {
        console.error("Error listing users:", error);
        usersTableBody.innerHTML = `<tr><td colspan="7">Error listing users: ${error.message}</td></tr>`;
    }
}

// --- Manage User Role Modal ---
function openManageRoleModal(uid, email, isAdmin) {
    if (!manageUserRoleModal || !modalUserIdInput || !modalUserEmailDisplay || !modalIsAdminCheckbox) return;
    
    modalUserIdInput.value = uid;
    modalUserEmailDisplay.textContent = email || 'N/A';
    modalIsAdminCheckbox.checked = isAdmin;
    if(modalRoleFeedback) modalRoleFeedback.textContent = ''; // Clear previous feedback
    manageUserRoleModal.style.display = 'block';
}

function closeManageRoleModal() {
    if (manageUserRoleModal) manageUserRoleModal.style.display = 'none';
}

async function handleManageUserRoleSubmit(event) {
    event.preventDefault();
    if (!manageUserRoleForm || !modalUserIdInput || !modalIsAdminCheckbox || !modalRoleFeedback) return;

    const userId = modalUserIdInput.value;
    const shouldBeAdmin = modalIsAdminCheckbox.checked;
    
    modalRoleFeedback.textContent = 'Processing...';
    manageUserRoleForm.querySelector('button[type="submit"]').disabled = true;

    try {
        let result;
        if (shouldBeAdmin) {
            result = await setAdminClaimCallable({ userId: userId });
        } else {
            result = await removeAdminClaimCallable({ userId: userId });
        }
        modalRoleFeedback.textContent = result.data.message || 'Role updated successfully!';
        await displayAdminUsers(); // Refresh user list to show new role
        setTimeout(closeManageRoleModal, 1500); // Close modal after a short delay
    } catch (error) {
        console.error("Error updating user role:", error);
        modalRoleFeedback.textContent = `Error: ${error.message || 'Could not update role.'}`;
    } finally {
        manageUserRoleForm.querySelector('button[type="submit"]').disabled = false;
    }
}

// --- Toggle User Disabled Status ---
async function handleToggleUserDisabled(userId, currentDisabledStatus) {
    const newDisabledStatus = !currentDisabledStatus;
    const action = newDisabledStatus ? 'disable' : 'enable';

    if (confirm(`Are you sure you want to ${action} user ${userId}?`)) {
        try {
            const result = await toggleUserDisabledStatusCallable({ userId: userId, disabled: newDisabledStatus });
            alert(result.data.message || `User ${action}d successfully.`);
            await displayAdminUsers(); // Refresh the list
        } catch (error) {
            console.error(`Error trying to ${action} user:`, error);
            alert(`Failed to ${action} user: ${error.message}`);
        }
    }
}


// --- Initialize Page ---
function initAdminUsersPage() {
    console.log("Initializing Admin Users Page...");
    displayAdminUsers(); // Initial load

    // Modal close buttons
    closeModalButtons.forEach(btn => btn.addEventListener('click', closeManageRoleModal));
    if (manageUserRoleModal) {
        manageUserRoleModal.addEventListener('click', (event) => {
            if (event.target === manageUserRoleModal) closeManageRoleModal(); // Click on backdrop
        });
    }
    // Form submission
    if (manageUserRoleForm) {
        manageUserRoleForm.addEventListener('submit', handleManageUserRoleSubmit);
    }

    // "Load More" button listener
    const loadMoreBtn = document.getElementById('load-more-users-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (nextPageToken) {
                displayAdminUsers(nextPageToken); // Pass current token to fetch next page
            }
        });
    }
}

if (window.location.pathname.endsWith('/admin/users.html')) {
    document.addEventListener('DOMContentLoaded', initAdminUsersPage);
}

export { displayAdminUsers }; // Export for potential manual refresh or testing.
