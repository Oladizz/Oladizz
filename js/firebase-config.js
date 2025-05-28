// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDz4F8DUJmOUSHnYkf6SaxAlCuNLY0pYtg",
  authDomain: "oladizz-phonetech-solution.firebaseapp.com",
  projectId: "oladizz-phonetech-solution",
  storageBucket: "oladizz-phonetech-solution.firebasestorage.app",
  messagingSenderId: "93831145868",
  appId: "1:93831145868:web:1762f8999c260851e68ea9",
  measurementId: "G-5ZRBDYZVP0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Optional, but included in user's config
const auth = getAuth(app); 
const db = getFirestore(app);
 
// Export the initialized app, auth, db for use in other modules
export { app, analytics, auth, db };
