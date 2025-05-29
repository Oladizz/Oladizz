import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider, // Added
    signInWithPopup     // Added
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
const adminPanelLink = document.getElementById('admin-panel-link');
const profileLink = document.getElementById('profile-link'); // Added Profile Link

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

    // Attach listeners for Google Sign-In buttons if they exist
    const googleSignInBtnLogin = document.getElementById('google-signin-btn-login');
    if (googleSignInBtnLogin) {
        // Check if listener already attached to prevent duplicates if script re-runs or DOM is manipulated
        if (!googleSignInBtnLogin.dataset.listenerAttached) {
            googleSignInBtnLogin.addEventListener('click', handleGoogleSignIn);
            googleSignInBtnLogin.dataset.listenerAttached = 'true';
        }
    }
    const googleSignInBtnSignup = document.getElementById('google-signin-btn-signup');
    if (googleSignInBtnSignup) {
        if (!googleSignInBtnSignup.dataset.listenerAttached) {
            googleSignInBtnSignup.addEventListener('click', handleGoogleSignIn);
            googleSignInBtnSignup.dataset.listenerAttached = 'true';
        }
    }

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
        // Update UI based on auth state and admin status
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        if (profileLink) profileLink.style.display = 'block'; // Show Profile link
        if (userEmailDisplay) {
            userEmailDisplay.textContent = user.email; // Just show email
            userEmailDisplay.style.display = 'inline'; // Ensure it's visible
        }
        
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
        if (profileLink) profileLink.style.display = 'none'; // Hide Profile link
        if (userEmailDisplay) {
            userEmailDisplay.textContent = '';
            userEmailDisplay.style.display = 'none'; // Hide if no user
        }
        if (adminPanelLink) adminPanelLink.style.display = 'none';

        // Added profile.html to protected pages
        const protectedPagePaths = ['/checkout.html', '/order_confirmation.html', '/admin.html', '/profile.html'];
        const isProtectedPage = protectedPagePaths.some(path => window.location.pathname.endsWith(path));
        if (isProtectedPage) {
            console.log("User is on a protected page and logged out, redirecting to login.");
            window.location.href = 'login.html';
        }
    }
});

// --- Google Sign-In Function ---
async function handleGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    // Ensure error elements exist or use alerts
    const loginErrorElement = document.getElementById('login-error');
    const signupErrorElement = document.getElementById('signup-error');
    const generalErrorElement = loginErrorElement || signupErrorElement; // Use whichever is available

    try {
        const result = await signInWithPopup(auth, provider);
        // This gives you a Google Access Token. You can use it to access the Google API.
        // const credential = GoogleAuthProvider.credentialFromResult(result);
        // const token = credential.accessToken;
        // The signed-in user info.
        const user = result.user;
        console.log("Successfully signed in with Google:", user);
        // The onAuthStateChanged observer will handle UI updates and redirection.
        // You could check getAdditionalUserInfo(result).isNewUser if you need to perform
        // specific actions for new users created via Google Sign-In.
    } catch (error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.customData?.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        
        console.error("Google Sign-In Error:", errorCode, errorMessage, email, credential);
        
        if (generalErrorElement) {
            generalErrorElement.textContent = `Google Sign-In Failed: ${errorMessage} (Code: ${errorCode})`;
            generalErrorElement.style.display = 'block';
        } else {
            alert(`Google Sign-In Failed: ${errorMessage} (Code: ${errorCode})`);
        }
    }
}


export { handleSignUp, handleLogin, handleLogout, handleGoogleSignIn };
