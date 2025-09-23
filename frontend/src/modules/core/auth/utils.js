/**
 * Unified Authentication Utilities
 *
 * Provides centralized authentication checking that works with both
 * legacy localStorage tokens and modern httpOnly cookie authentication.
 *
 * This solves the inconsistency where some components check localStorage
 * while the API client uses httpOnly cookies automatically.
 */

/**
 * Check if user is currently authenticated
 *
 * This function checks multiple authentication sources in order:
 * 1. Current user state (most reliable)
 * 2. Unified auth manager state
 * 3. Global user state
 * 4. Legacy localStorage fallback (deprecated)
 *
 * @returns {boolean} True if user is authenticated
 */
function isUserAuthenticated() {
    // Check current user from various sources
    if (window.currentUser) {
        return true;
    }

    // Check unified auth manager
    if (window.unifiedAuthManager && window.unifiedAuthManager.isAuthenticated && window.unifiedAuthManager.isAuthenticated()) {
        return true;
    }

    // Check user state management
    if (window.userState && window.userState.current) {
        return true;
    }

    // Legacy fallback - check localStorage token (deprecated but still used by some components)
    const legacyToken = localStorage.getItem('authToken');
    if (legacyToken && legacyToken !== 'None' && legacyToken !== 'null') {
        return true;
    }

    return false;
}

/**
 * Get current authenticated user information
 *
 * @returns {object|null} User object if authenticated, null otherwise
 */
function getCurrentUser() {
    if (window.currentUser) {
        return window.currentUser;
    }

    if (window.userState && window.userState.current) {
        return window.userState.current;
    }

    if (window.unifiedAuthManager && window.unifiedAuthManager.getCurrentUser) {
        return window.unifiedAuthManager.getCurrentUser();
    }

    return null;
}

/**
 * Get authentication token for API calls
 *
 * NOTE: This is deprecated for new code. New components should use
 * the apiClient which handles authentication automatically via cookies.
 *
 * @returns {string|null} Auth token if available
 * @deprecated Use apiClient.call() instead for new code
 */
function getAuthToken() {
    // For backward compatibility only
    return localStorage.getItem('authToken');
}

/**
 * Check if user has admin privileges
 *
 * @returns {boolean} True if user is admin
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && (user.isAdmin === true || user.role === 'admin');
}

/**
 * Wait for authentication system to be ready
 *
 * This is useful for components that need to wait for the authentication
 * system to fully initialize before checking authentication state.
 *
 * @returns {Promise<boolean>} Resolves when auth system is ready
 */
function waitForAuthReady() {
    return new Promise((resolve) => {
        // If already ready, resolve immediately
        if (window.unifiedAuthManager && window.unifiedAuthManager.isReady) {
            resolve(isUserAuthenticated());
            return;
        }

        // Wait for auth system ready event
        const checkAuth = () => {
            if (window.unifiedAuthManager && window.unifiedAuthManager.isReady) {
                document.removeEventListener('authSystemReady', checkAuth);
                resolve(isUserAuthenticated());
            }
        };

        document.addEventListener('authSystemReady', checkAuth);

        // Fallback timeout
        setTimeout(() => {
            document.removeEventListener('authSystemReady', checkAuth);
            resolve(isUserAuthenticated());
        }, 5000);
    });
}

/**
 * Get authentication state information for debugging
 *
 * @returns {object} Debug information about authentication state
 */
function getAuthDebugInfo() {
    return {
        currentUser: !!window.currentUser,
        userState: !!window.userState?.current,
        unifiedAuthManager: !!window.unifiedAuthManager?.isAuthenticated?.(),
        legacyToken: !!localStorage.getItem('authToken'),
        isAuthenticated: isUserAuthenticated(),
        user: getCurrentUser()
    };
}

// Export functions to global scope for immediate use
window.authUtils = {
    isUserAuthenticated,
    getCurrentUser,
    getAuthToken,
    isAdmin,
    waitForAuthReady,
    getAuthDebugInfo
};

// For ES6 module imports
export {
    isUserAuthenticated,
    getCurrentUser,
    getAuthToken,
    isAdmin,
    waitForAuthReady,
    getAuthDebugInfo
};

console.log('🔐 Unified authentication utilities loaded');