import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Fetches all products from the Firestore 'products' collection.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of product objects.
 * Each product object includes its Firestore document ID as 'id'.
 */
async function fetchAllProducts() {
    try {
        const productsCollectionRef = collection(db, 'products');
        const querySnapshot = await getDocs(productsCollectionRef);
        const productsList = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id, // Use Firestore document ID as product.id
            ...docSnap.data()
        }));
        console.log("Fetched products:", productsList);
        return productsList;
    } catch (error) {
        console.error("Error fetching all products:", error);
        // In a real app, you might want to display a user-friendly message here
        return []; // Return empty array on error
    }
}

/**
 * Fetches a single product by its ID from the Firestore 'products' collection.
 * @param {string} productId The ID of the product to fetch.
 * @returns {Promise<Object|null>} A promise that resolves to the product object if found, otherwise null.
 * The product object includes its Firestore document ID as 'id'.
 */
async function fetchProductById(productId) {
    try {
        if (!productId) {
            console.error("Error: Product ID is undefined or null.");
            return null;
        }
        const productDocRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productDocRef);

        if (docSnap.exists()) {
            const productData = {
                id: docSnap.id, // Use Firestore document ID as product.id
                ...docSnap.data()
            };
            console.log("Fetched product by ID:", productId, productData);
            return productData;
        } else {
            console.log("No such product found with ID:", productId);
            return null;
        }
    } catch (error) {
        console.error("Error fetching product by ID:", productId, error);
        // In a real app, display a user-friendly message
        return null;
    }
}

export { fetchAllProducts, fetchProductById };
