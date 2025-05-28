import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from './firebase-config.js';

// UI Elements - these could also be passed as parameters or handled in app.js
const loginLink = document.getElementById('login-link');
const signupLink = document.getElementById('signup-link');
const logoutLink = document.getElementById('logout-link');
const userEmailDisplay = document.getElementById('user-email'); // Assuming an element with this ID exists

// --- Sign-up Function ---
async function handleSignUp(email, password) {
    const signupErrorElement = document.getElementById('signup-error'); // Specific to signup page
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Successfully signed up:", userCredential.user);
        if (signupErrorElement) signupErrorElement.textContent = ''; // Clear any previous errors
        alert("Sign up successful! Please login."); // Simple feedback
        window.location.href = 'login.html'; // Redirect to login page
    } catch (error) {
        console.error("Sign up error:", error);
        if (signupErrorElement) signupErrorElement.textContent = error.message;
        else alert(`Sign up failed: ${error.message}`);
    }
}

// --- Login Function ---
async function handleLogin(email, password) {
    const loginErrorElement = document.getElementById('login-error'); // Specific to login page
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Successfully logged in:", userCredential.user);
        if (loginErrorElement) loginErrorElement.textContent = '';
        // alert("Login successful!"); // onAuthStateChanged will handle UI and redirect
        // Redirect is handled by onAuthStateChanged if user is on login page
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
        // alert("Logged out successfully."); // onAuthStateChanged will handle UI and redirect
        // No explicit redirect here, onAuthStateChanged will update UI,
        // and if on a protected page, a check should redirect.
        // For now, if on index, it will just update header.
        if (window.location.pathname.includes("checkout.html") || window.location.pathname.includes("order_confirmation.html")){
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert(`Logout failed: ${error.message}`);
    }
}

// --- Authentication State Observer ---
onAuthStateChanged(auth, (user) => {
    const loginPagePaths = ['/login.html', '/signup.html'];
    const isLoginPage = loginPagePaths.some(path => window.location.pathname.endsWith(path));

    if (user) {
        // User is signed in
        console.log("User is logged in:", user);
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block'; // Or 'inline' or ''
        if (userEmailDisplay) userEmailDisplay.textContent = `Logged in as: ${user.email}`;

        // If on login/signup page and logged in, redirect to home
        if (isLoginPage) {
            console.log("User is on login/signup page, redirecting to home.");
            window.location.href = 'index.html';
        }
    } else {
        // User is signed out
        console.log("User is logged out.");
        if (loginLink) loginLink.style.display = 'block';
        if (signupLink) signupLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
        if (userEmailDisplay) userEmailDisplay.textContent = '';

        // If on a page that requires auth (e.g. checkout) and user is logged out, redirect to login
        // This is a basic example; more robust routing might be needed for complex apps
        const protectedPagePaths = ['/checkout.html', '/order_confirmation.html']; // Add other protected pages
        const isProtectedPage = protectedPagePaths.some(path => window.location.pathname.endsWith(path));
        if (isProtectedPage) {
            console.log("User is on a protected page and logged out, redirecting to login.");
            window.location.href = 'login.html';
        }
    }
});

// Export functions to be used in app.js or directly by event listeners
export { handleSignUp, handleLogin, handleLogout };
