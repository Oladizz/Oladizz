import { db } from '../../js/firebase-config.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { checkAdminAccess } from '../../js/auth.js'; // Assuming checkAdminAccess handles redirection or UI blocking

const categoriesTableBody = document.getElementById('categories-table-body');
const categoryForm = document.getElementById('category-form');
const categoryFormTitle = document.getElementById('category-form-title');
const categoryNameInput = document.getElementById('category-name');
const categoryDescriptionInput = document.getElementById('category-description');
const categoryIdInput = document.getElementById('category-id'); // Hidden input to store ID for updates
const saveCategoryButton = document.getElementById('save-category-button');
const cancelEditCategoryButton = document.getElementById('cancel-edit-category-button');

let editingCategoryId = null; // To keep track of the category being edited

// Ensure elements exist before proceeding
if (categoryForm) {
    // Check admin access when the script loads for an admin page
    checkAdminAccess();

    // Fetch and display categories
    const fetchCategories = async () => {
        if (!categoriesTableBody) {
            console.warn("categoriesTableBody not found. Skipping fetchCategories.");
            return;
        }
        categoriesTableBody.innerHTML = ''; // Clear existing rows
        try {
            const querySnapshot = await getDocs(collection(db, "categories"));
            if (querySnapshot.empty) {
                categoriesTableBody.innerHTML = '<tr><td colspan="3">No categories found.</td></tr>';
                return;
            }
            querySnapshot.forEach((doc) => {
                const category = doc.data();
                const row = categoriesTableBody.insertRow();
                row.setAttribute('data-id', doc.id); // For easier access if needed
                row.innerHTML = `
                    <td>${escapeHTML(category.name)}</td>
                    <td>${escapeHTML(category.description || '')}</td>
                    <td>
                        <button class="edit-category-button" data-id="${doc.id}">Edit</button>
                        <button class="delete-category-button" data-id="${doc.id}">Delete</button>
                    </td>
                `;
            });
            addEventListenersToButtons();
        } catch (error) {
            console.error("Error fetching categories: ", error);
            categoriesTableBody.innerHTML = '<tr><td colspan="3">Error loading categories.</td></tr>';
            // Consider user-friendly error display here
        }
    };

    // Add event listeners to dynamically created edit and delete buttons
    const addEventListenersToButtons = () => {
        document.querySelectorAll('.edit-category-button').forEach(button => {
            button.addEventListener('click', handleEditCategoryPrep);
        });
        document.querySelectorAll('.delete-category-button').forEach(button => {
            button.addEventListener('click', handleDeleteCategory);
        });
    };

    // Prepare form for editing a category
    const handleEditCategoryPrep = async (e) => {
        editingCategoryId = e.target.dataset.id;
        const categoryRef = doc(db, "categories", editingCategoryId);
        try {
            const docSnap = await getDoc(categoryRef);
            if (docSnap.exists()) {
                const category = docSnap.data();
                categoryFormTitle.textContent = 'Edit Category';
                categoryNameInput.value = category.name;
                categoryDescriptionInput.value = category.description || '';
                categoryIdInput.value = editingCategoryId; // Store ID in hidden field
                saveCategoryButton.textContent = 'Save Changes';
                cancelEditCategoryButton.style.display = 'inline-block';
                categoryNameInput.focus(); // Focus on the first field
                window.scrollTo({ top: categoryForm.offsetTop - 20, behavior: 'smooth' });


            } else {
                alert("Category not found for editing.");
                resetForm();
            }
        } catch (error) {
            console.error("Error fetching category for edit: ", error);
            alert("Error fetching category details. Check console.");
            resetForm();
        }
    };

    // Handle category form submission (for both add and update)
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = categoryNameInput.value.trim();
        const categoryDescription = categoryDescriptionInput.value.trim();

        if (!categoryName) {
            alert("Category name is required.");
            return;
        }

        saveCategoryButton.disabled = true;
        const originalButtonText = saveCategoryButton.textContent;
        saveCategoryButton.textContent = editingCategoryId ? 'Saving...' : 'Adding...';

        try {
            if (editingCategoryId) {
                // Update existing category
                const categoryRef = doc(db, "categories", editingCategoryId);
                await updateDoc(categoryRef, {
                    name: categoryName,
                    description: categoryDescription,
                    updatedAt: serverTimestamp()
                });
                alert("Category updated successfully!");
            } else {
                // Add new category
                await addDoc(collection(db, "categories"), {
                    name: categoryName,
                    description: categoryDescription,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                alert("Category added successfully!");
            }
            resetForm();
            fetchCategories(); // Refresh the list
        } catch (error) {
            console.error("Error saving category: ", error);
            alert(`Error saving category: ${error.message}. Check console for details.`);
        } finally {
            saveCategoryButton.disabled = false;
            saveCategoryButton.textContent = originalButtonText; // Restore original button text
             if(editingCategoryId) resetForm(); // Ensure form resets after editing too
        }
    });

    // Handle delete category button click
    const handleDeleteCategory = async (e) => {
        const categoryId = e.target.dataset.id;
        // Simple confirmation dialog
        if (confirm(`Are you sure you want to delete category ID: ${categoryId}? This action cannot be undone.`)) {
            try {
                await deleteDoc(doc(db, "categories", categoryId));
                alert("Category deleted successfully!");
                fetchCategories(); // Refresh the list
                if (editingCategoryId === categoryId) { // If deleting the category currently being edited
                    resetForm();
                }
            } catch (error) {
                console.error("Error deleting category: ", error);
                alert(`Error deleting category: ${error.message}. Check console for details.`);
            }
        }
    };

    // Reset form to its initial state (for adding new or canceling edit)
    const resetForm = () => {
        categoryForm.reset(); // Resets all form fields
        categoryFormTitle.textContent = 'Add New Category';
        saveCategoryButton.textContent = 'Save Category';
        cancelEditCategoryButton.style.display = 'none';
        editingCategoryId = null;
        categoryIdInput.value = ''; // Clear the hidden ID field
        saveCategoryButton.disabled = false; // Ensure button is enabled
    };

    // Event listener for the "Cancel Edit" button
    if (cancelEditCategoryButton) {
        cancelEditCategoryButton.addEventListener('click', () => {
            resetForm();
        });
    }

    // Utility to escape HTML to prevent XSS
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function (match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // Initial fetch of categories when the page loads
    // Ensure this runs only on categories.html or if relevant elements are present
    if (document.getElementById('categories-table-body') && document.getElementById('category-form')) {
         fetchCategories();
    }

} else {
    console.warn("Category management form or table not found on this page. admin-categories.js will not initialize fully.");
}

// Export functions if they need to be called from other modules (e.g., admin-common.js)
// For now, keeping it self-contained. If admin-common.js needs to trigger fetchCategories, export it.
// export { fetchCategories };
