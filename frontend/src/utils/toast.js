/**
 * Toast Notification Utilities
 * Migrated from index.html to modular system
 */

// Simple toast notification function
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification show';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ES6 Module Exports
export {
    showToast
};

// Global Exposure (Temporary for transition)
window.showToast = showToast;