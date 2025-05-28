import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from './firebase-config.js';

// --- Global variable for admin status ---
// This is a simple way for this project. In larger apps, consider a state management solution.
window.currentUserIsAdmin = false;

// UI Elements - these could also be passed as parameters or handled in app.js
const loginLink = document.getElementById('login-link');
const signupLink = document.getElementById('signup-link');
const logoutLink = document.getElementById('logout-link');
const userEmailDisplay = document.getElementById('user-email');
const adminPanelLink = document.getElementById('admin-panel-link'); // Assuming this ID will be added to HTML

// --- Sign-up Function ---
async function handleSignUp(email, password) {
    const signupErrorElement = document.getElementById('signup-error');
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Successfully signed up:", userCredential.user);
        if (signupErrorElement) signupErrorElement.textContent = '';
        alert("Sign up successful! Please login.");
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Sign up error:", error);
        if (signupErrorElement) signupErrorElement.textContent = error.message;
        else alert(`Sign up failed: ${error.message}`);
    }
}

// --- Login Function ---
async function handleLogin(email, password) {
    const loginErrorElement = document.getElementById('login-error');
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Successfully logged in:", userCredential.user);
        if (loginErrorElement) loginErrorElement.textContent = '';
        // onAuthStateChanged will handle UI updates and redirects
    } catch (error) {
        console.error("Login error:", error);
        if (loginErrorElement) loginErrorElement.textContent = error.message;
        else alert(`Login failed: ${error.message}`);
    }
}

// --- Logout Function ---
async function handleLogout() {
    try {
        await signOut(auth);
        console.log("Successfully logged out.");
        // onAuthStateChanged will handle UI and redirect
        // Reset admin status on logout
        window.currentUserIsAdmin = false; 
        if (window.location.pathname.includes("admin.html") || window.location.pathname.includes("checkout.html") || window.location.pathname.includes("order_confirmation.html")){
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert(`Logout failed: ${error.message}`);
    }
}

// --- Authentication State Observer ---
onAuthStateChanged(auth, async (user) => {
    const loginPagePaths = ['/login.html', '/signup.html'];
    const isLoginPage = loginPagePaths.some(path => window.location.pathname.endsWith(path));

    if (user) {
        // User is signed in
        console.log("User is logged in:", user.email);
        
        // Force refresh ID token to get latest custom claims
        try {
            const idTokenResult = await user.getIdTokenResult(true); // true forces refresh
            window.currentUserIsAdmin = idTokenResult.claims.isAdmin === true;
            console.log("User isAdmin status:", window.currentUserIsAdmin);
        } catch (error) {
            console.error("Error fetching ID token or claims:", error);
            window.currentUserIsAdmin = false; // Default to false on error
        }

        // Update UI based on auth state and admin status
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        if (userEmailDisplay) userEmailDisplay.textContent = `Logged in as: ${user.email}`;
        
        if (adminPanelLink) {
            adminPanelLink.style.display = window.currentUserIsAdmin ? 'block' : 'none';
        }

        if (isLoginPage) {
            console.log("User is on login/signup page, redirecting to home.");
            window.location.href = 'index.html';
        }
    } else {
        // User is signed out
        console.log("User is logged out.");
        window.currentUserIsAdmin = false; // Reset admin status

        if (loginLink) loginLink.style.display = 'block';
        if (signupLink) signupLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
        if (userEmailDisplay) userEmailDisplay.textContent = '';
        if (adminPanelLink) adminPanelLink.style.display = 'none';

        const protectedPagePaths = ['/checkout.html', '/order_confirmation.html', '/admin.html'];
        const isProtectedPage = protectedPagePaths.some(path => window.location.pathname.endsWith(path));
        if (isProtectedPage) {
            console.log("User is on a protected page and logged out, redirecting to login.");
            window.location.href = 'login.html';
        }
    }
});

export { handleSignUp, handleLogin, handleLogout };
