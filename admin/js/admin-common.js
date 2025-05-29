import { auth } from '../../js/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const adminUsernameDisplay = document.getElementById('admin-username-display');
    const adminLogoutLink = document.getElementById('admin-logout-link');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content'); // To potentially adjust margin

    // Check auth state to display username or redirect
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            if (adminUsernameDisplay) {
                adminUsernameDisplay.textContent = user.email || 'Admin'; // Display email or a generic 'Admin'
            }
            // Potentially check for admin custom claims here if not done by checkAdminAccess in specific admin JS files
        } else {
            // No user is signed in. Redirect to login page.
            // This is a basic check; more robust role-based access should be handled by checkAdminAccess
            // or a similar function on each admin page.
            console.log("User not logged in, redirecting from admin-common.");
            if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('signup.html')) {
                 // window.location.href = '/login.html'; // Or the correct path to your login page
            }
        }
    });

    // Logout functionality
    if (adminLogoutLink) {
        adminLogoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                alert('You have been logged out.');
                window.location.href = '../../login.html'; // Adjust path as needed
            } catch (error) {
                console.error('Logout Error:', error);
                alert('Failed to logout. Please try again.');
            }
        });
    }

    // Basic Sidebar Toggle (if a toggle button exists - example, not in current HTML)
    const sidebarToggle = document.getElementById('sidebar-toggle-button'); // Assuming you add such a button
    if (sidebarToggle && sidebar && mainContent) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded'); // Adjust main content margin/padding
        });
    }

    // Initialize sidebar state based on localStorage (optional)
    // if (sidebar && localStorage.getItem('sidebarCollapsed') === 'true') {
    //     sidebar.classList.add('collapsed');
    //     if (mainContent) mainContent.classList.add('expanded');
    // }


    // Sticky header (if applicable to admin panel)
    // const header = document.querySelector('.main-header');
    // if (header) {
    //     window.addEventListener('scroll', () => {
    //         if (window.scrollY > 50) { // Adjust scroll threshold as needed
    //             header.classList.add('sticky');
    //         } else {
    //             header.classList.remove('sticky');
    //         }
    //     });
    // }

    console.log("Admin common script loaded.");
});
