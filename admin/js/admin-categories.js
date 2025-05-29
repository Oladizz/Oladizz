import { db } from '../../js/firebase-config.js';
import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    getDoc // Added getDoc for loadCategoryForEdit
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const categoriesTableBody = document.getElementById('admin-categories-table-body');
const categoryForm = document.getElementById('add-category-form');
const categoryFormTitle = document.getElementById('admin-category-form-title');
const categoryNameInput = document.getElementById('category-name');
const categoryDescriptionInput = document.getElementById('category-description');
const editCategoryIdInput = document.getElementById('edit-category-id');
const formFeedback = document.getElementById('admin-category-form-feedback');
const submitButton = categoryForm.querySelector('button[type="submit"]');
const cancelEditBtn = categoryForm.querySelector('.cancel-edit-btn');

async function displayAdminCategories() {
    if (!categoriesTableBody) {
        console.warn('admin-categories-table-body not found. Skipping displayAdminCategories.');
        return;
    }
    categoriesTableBody.innerHTML = '<tr><td colspan="3">Loading categories...</td></tr>';
    try {
        const categoriesCollection = collection(db, "categories");
        const querySnapshot = await getDocs(categoriesCollection);

        if (querySnapshot.empty) {
            categoriesTableBody.innerHTML = '<tr><td colspan="3">No categories found.</td></tr>';
            return;
        }

        let tableRowsHtml = "";
        querySnapshot.forEach(doc => {
            const category = doc.data();
            const categoryId = doc.id;
            tableRowsHtml += `
                <tr>
                    <td>${category.name}</td>
                    <td>${category.description || 'N/A'}</td>
                    <td>
                        <button class="edit-category-btn admin-button-small" data-id="${categoryId}">Edit</button>
                        <button class="delete-category-btn admin-button-small admin-button-danger" data-id="${categoryId}">Delete</button>
                    </td>
                </tr>
            `;
        });
        categoriesTableBody.innerHTML = tableRowsHtml;

        // Add event listeners to new buttons
        document.querySelectorAll('.edit-category-btn').forEach(button => {
            button.addEventListener('click', (e) => loadCategoryForEdit(e.target.dataset.id));
        });
        document.querySelectorAll('.delete-category-btn').forEach(button => {
            button.addEventListener('click', (e) => handleDeleteCategory(e.target.dataset.id));
        });

    } catch (error) {
        console.error("Error fetching categories: ", error);
        categoriesTableBody.innerHTML = '<tr><td colspan="3">Error loading categories. Check console.</td></tr>';
        if (formFeedback) formFeedback.textContent = 'Error loading categories.';
    }
}

async function handleAddOrUpdateCategory(event) {
    event.preventDefault();
    if (!categoryNameInput || !categoryDescriptionInput || !editCategoryIdInput || !formFeedback) {
        console.error('Form elements not found for handleAddOrUpdateCategory');
        return;
    }

    const categoryName = categoryNameInput.value.trim();
    const categoryDescription = categoryDescriptionInput.value.trim();
    const editingId = editCategoryIdInput.value;

    if (!categoryName) {
        formFeedback.textContent = 'Category name is required.';
        formFeedback.className = 'feedback-message error';
        return;
    }
    formFeedback.textContent = ''; // Clear previous feedback

    try {
        const categoriesCollection = collection(db, "categories");
        if (editingId) {
            // Update existing category
            const categoryRef = doc(db, "categories", editingId);
            await updateDoc(categoryRef, {
                name: categoryName,
                description: categoryDescription,
                lastUpdated: serverTimestamp()
            });
            formFeedback.textContent = 'Category updated successfully!';
            formFeedback.className = 'feedback-message success';
        } else {
            // Add new category
            await addDoc(categoriesCollection, {
                name: categoryName,
                description: categoryDescription,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
            formFeedback.textContent = 'Category added successfully!';
            formFeedback.className = 'feedback-message success';
        }
        resetCategoryForm();
        await displayAdminCategories(); // Refresh the list
    } catch (error) {
        console.error("Error saving category: ", error);
        formFeedback.textContent = 'Error saving category: ' + error.message;
        formFeedback.className = 'feedback-message error';
    }
}

async function loadCategoryForEdit(categoryId) {
    if (!categoryNameInput || !categoryDescriptionInput || !editCategoryIdInput || !categoryFormTitle || !submitButton || !cancelEditBtn || !formFeedback) {
        console.error('Form elements not found for loadCategoryForEdit');
        return;
    }
    formFeedback.textContent = ''; // Clear previous feedback
    try {
        const categoryRef = doc(db, "categories", categoryId);
        const docSnap = await getDoc(categoryRef);

        if (docSnap.exists()) {
            const category = docSnap.data();
            categoryNameInput.value = category.name;
            categoryDescriptionInput.value = category.description || '';
            editCategoryIdInput.value = categoryId;

            categoryFormTitle.textContent = 'Edit Category';
            submitButton.textContent = 'Update Category';
            if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';

            categoryForm.scrollIntoView({ behavior: 'smooth' });
            formFeedback.textContent = 'Editing category. Make your changes and click "Update Category".';
            formFeedback.className = 'feedback-message info';
        } else {
            console.error("No such category document!");
            formFeedback.textContent = 'Category not found for editing.';
            formFeedback.className = 'feedback-message error';
        }
    } catch (error) {
        console.error("Error fetching category for edit: ", error);
        formFeedback.textContent = 'Error fetching category data: ' + error.message;
        formFeedback.className = 'feedback-message error';
    }
}

async function handleDeleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
        return;
    }
    formFeedback.textContent = ''; // Clear previous feedback

    try {
        const categoryRef = doc(db, "categories", categoryId);
        await deleteDoc(categoryRef);

        formFeedback.textContent = 'Category deleted successfully.';
        formFeedback.className = 'feedback-message success';

        if (editCategoryIdInput && editCategoryIdInput.value === categoryId) {
            resetCategoryForm(); // Reset form if the deleted category was being edited
        }
        await displayAdminCategories(); // Refresh the list
    } catch (error) {
        console.error("Error deleting category: ", error);
        formFeedback.textContent = 'Error deleting category: ' + error.message;
        formFeedback.className = 'feedback-message error';
    }
}

function resetCategoryForm() {
    if (!categoryForm || !editCategoryIdInput || !categoryFormTitle || !submitButton || !cancelEditBtn || !formFeedback) {
        console.warn('Form elements not found for resetCategoryForm. Skipping reset.');
        return;
    }
    categoryForm.reset();
    editCategoryIdInput.value = '';
    categoryFormTitle.textContent = 'Add New Category';
    submitButton.textContent = 'Add Category';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    // Do not clear feedback here, let calling function decide if it should be cleared or set.
}

function initAdminCategoriesPage() {
    if (window.location.pathname.endsWith('/admin/categories.html')) {
        if (categoryForm) {
            categoryForm.addEventListener('submit', handleAddOrUpdateCategory);
        } else {
            console.error('#add-category-form not found.');
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                resetCategoryForm();
                if (formFeedback) {
                    formFeedback.textContent = ''; // Clear feedback on cancel
                    formFeedback.className = 'feedback-message';
                }
            });
        } else {
            console.warn('.cancel-edit-btn not found.');
        }
        
        displayAdminCategories(); // Initial display of categories
    }
}

// Initialize the page setup when DOM is ready
document.addEventListener('DOMContentLoaded', initAdminCategoriesPage);

// Export functions if needed (e.g., for testing or if other modules need them)
// For now, initAdminCategoriesPage handles setup, so direct exports might not be strictly necessary for page operation.
export { displayAdminCategories, handleAddOrUpdateCategory, loadCategoryForEdit, handleDeleteCategory, resetCategoryForm, initAdminCategoriesPage };
