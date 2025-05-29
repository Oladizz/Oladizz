import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Fetches all products from the Firestore 'products' collection.
 * @param {object} [options={}] - An optional object for filtering.
 * @param {string} [options.searchQuery] - An optional search query to filter products by name.
 * @param {string} [options.categoryId] - An optional category ID to filter products by.
 * @param {number} [options.minPrice] - An optional minimum price to filter products by.
 * @param {number} [options.maxPrice] - An optional maximum price to filter products by.
 * @param {string} [options.sortBy] - An optional sort key (e.g., 'price_asc', 'name_desc').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of product objects.
 * Each product object includes its Firestore document ID as 'id'.
 */
async function fetchAllProducts(options = {}) {
    try {
        let productsCollectionRef = collection(db, 'products');
        let firestoreQuery; 

        if (options.categoryId) {
            console.log(`Filtering by categoryId: ${options.categoryId}`);
            firestoreQuery = query(productsCollectionRef, where("categoryId", "==", options.categoryId));
        } else {
            firestoreQuery = query(productsCollectionRef); // Default query
        }

        const querySnapshot = await getDocs(firestoreQuery);
        const productsList = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        // Client-side price filtering (applied after category filtering, before search)
        if (typeof options.minPrice === 'number' && !isNaN(options.minPrice)) {
            productsList = productsList.filter(product => product.price >= options.minPrice);
            console.log(`Filtered products by minPrice >= ${options.minPrice}:`, productsList.length);
        }
        if (typeof options.maxPrice === 'number' && !isNaN(options.maxPrice) && options.maxPrice > 0) {
            productsList = productsList.filter(product => product.price <= options.maxPrice);
            console.log(`Filtered products by maxPrice <= ${options.maxPrice}:`, productsList.length);
        }

        // Client-side search filtering (applied after potential category and price filtering)
        if (options.searchQuery) {
            const lowerCaseQuery = options.searchQuery.toLowerCase();
            productsList = productsList.filter(product => 
                product.name.toLowerCase().includes(lowerCaseQuery)
                // Optionally, extend to search description:
                // || (product.description && product.description.toLowerCase().includes(lowerCaseQuery))
            );
            console.log(`Filtered products for query "${options.searchQuery}" (after other filters):`, productsList.length);
        }

        // Client-side sorting
        if (options.sortBy) {
            console.log(`Sorting products by: ${options.sortBy}`);
            switch (options.sortBy) {
                case 'price_asc':
                    productsList.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    productsList.sort((a, b) => b.price - a.price);
                    break;
                case 'name_asc':
                    productsList.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name_desc':
                    productsList.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                // case 'featured': // Uncomment and implement if isFeatured field exists
                //    productsList.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
                //    break;
                default:
                    console.log(`Unknown sort option: ${options.sortBy}`);
                    break;
            }
        }
        
        console.log("Final product list count after all filters and sorting:", productsList.length);
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
