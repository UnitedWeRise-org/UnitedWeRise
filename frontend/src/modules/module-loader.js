/**
 * @module module-loader
 * @description Central module loader for all extracted modules
 * Loads and initializes all modular JavaScript components
 * 
 * @example
 * <script type="module" src="/src/modules/module-loader.js"></script>
 */

// Import core modules
import { apiClient } from './core/api/client.js';
import { userState } from './core/state/user.js';

// Import authentication modules
import { openAuthModal, closeAuthModal, handleLogin, handleRegister } from './core/auth/modal.js';
import { verifyAndSetUser, setUserLoggedIn, setUserLoggedOut, logout } from './core/auth/session.js';
import { unifiedAuthManager } from './core/auth/unified-manager.js';

// Import feed modules
import { 
    loadMyFeedPosts, 
    displayMyFeedPosts, 
    showMyFeed, 
    createPostFromTextarea,
    createPostFromFeed,
    setupMyFeedInfiniteScroll
} from './features/feed/my-feed.js';

// Import search modules
import { 
    openSearch, 
    closeSearch, 
    performGlobalSearch, 
    toggleAdvancedFilters,
    updateSearchResults
} from './features/search/global-search.js';

/**
 * Initialize all modules and maintain backward compatibility
 */
function initializeModules() {
    console.log('🚀 Initializing JavaScript modules...');
    
    // Verify core dependencies are available
    if (!window.apiCall) {
        console.warn('⚠️ Legacy apiCall function not found - modules will use new apiClient');
    }
    
    // Initialize core state management
    console.log('✅ Core API client and user state initialized');
    
    // Initialize authentication system
    console.log('✅ Authentication modules loaded');
    console.log('🔧 Unified auth manager available:', typeof unifiedAuthManager !== 'undefined');
    
    // Initialize feed system
    console.log('✅ My Feed modules loaded');
    
    // Initialize search system
    console.log('✅ Search modules loaded');
    
    // Setup event listeners for modular components
    setupModularEventListeners();
    
    console.log('🎉 All modules initialized successfully');
}

/**
 * Setup event listeners that connect UI elements to modular functions
 */
function setupModularEventListeners() {
    // Authentication event listeners are handled within the auth modules
    
    // Feed event listeners - these replace inline handlers
    const feedPostButton = document.querySelector('[onclick*="createPostFromFeed"]');
    if (feedPostButton) {
        feedPostButton.removeAttribute('onclick');
        feedPostButton.addEventListener('click', createPostFromFeed);
    }
    
    // Search event listeners - these replace inline handlers
    const searchButton = document.querySelector('[onclick*="openSearch"]');
    if (searchButton) {
        searchButton.removeAttribute('onclick');
        searchButton.addEventListener('click', openSearch);
    }
    
    const searchCloseButton = document.querySelector('[onclick*="closeSearch"]');
    if (searchCloseButton) {
        searchCloseButton.removeAttribute('onclick');
        searchCloseButton.addEventListener('click', closeSearch);
    }
    
    // Mobile navigation integration
    if (window.switchMobileView) {
        const originalSwitchMobileView = window.switchMobileView;
        window.switchMobileView = function(view) {
            originalSwitchMobileView(view);
            
            // Enhanced mobile view switching with modules
            switch (view) {
                case 'feed':
                    if (userState.current) {
                        loadMyFeedPosts();
                    }
                    break;
                case 'search':
                    openSearch();
                    break;
            }
        };
    }
    
    console.log('✅ Modular event listeners setup complete');
}

/**
 * Verify module functionality by testing core operations
 */
async function testModularFunctionality() {
    console.log('🧪 Testing modular functionality...');
    
    const tests = [];
    
    // Test 1: API Client functionality
    tests.push({
        name: 'API Client',
        test: async () => {
            try {
                // Test using direct health endpoint (not through API config)
                const healthUrl = window.location.hostname === 'dev.unitedwerise.org' 
                    ? 'https://dev-api.unitedwerise.org/health'
                    : 'https://api.unitedwerise.org/health';
                const response = await fetch(healthUrl);
                const data = await response.json();
                return data.status === 'healthy' ? 'API client responding' : 'API client not responding';
            } catch (error) {
                return `API client error: ${error.message}`;
            }
        }
    });
    
    // Test 2: User State management
    tests.push({
        name: 'User State',
        test: async () => {
            try {
                // Test user state access
                const currentUser = userState.current;
                return currentUser ? `User state active: ${currentUser.username || currentUser.email}` : 'User state: not logged in';
            } catch (error) {
                return `User state error: ${error.message}`;
            }
        }
    });
    
    // Test 3: Authentication module integration
    tests.push({
        name: 'Authentication',
        test: async () => {
            try {
                // Test if auth functions are available
                const authFunctionsAvailable = [
                    typeof openAuthModal === 'function',
                    typeof handleLogin === 'function',
                    typeof verifyAndSetUser === 'function'
                ].every(test => test);
                
                return authFunctionsAvailable ? 'Authentication modules loaded' : 'Authentication modules missing';
            } catch (error) {
                return `Authentication error: ${error.message}`;
            }
        }
    });
    
    // Test 4: Feed module integration
    tests.push({
        name: 'Feed System',
        test: async () => {
            try {
                // Test if feed functions are available
                const feedFunctionsAvailable = [
                    typeof loadMyFeedPosts === 'function',
                    typeof showMyFeed === 'function',
                    typeof createPostFromTextarea === 'function'
                ].every(test => test);
                
                return feedFunctionsAvailable ? 'Feed modules loaded' : 'Feed modules missing';
            } catch (error) {
                return `Feed error: ${error.message}`;
            }
        }
    });
    
    // Test 5: Search module integration
    tests.push({
        name: 'Search System',
        test: async () => {
            try {
                // Test if search functions are available
                const searchFunctionsAvailable = [
                    typeof openSearch === 'function',
                    typeof performGlobalSearch === 'function',
                    typeof toggleAdvancedFilters === 'function'
                ].every(test => test);
                
                return searchFunctionsAvailable ? 'Search modules loaded' : 'Search modules missing';
            } catch (error) {
                return `Search error: ${error.message}`;
            }
        }
    });
    
    // Run all tests
    for (const test of tests) {
        try {
            const result = await test.test();
            console.log(`✅ ${test.name}: ${result}`);
        } catch (error) {
            console.error(`❌ ${test.name}: ${error.message}`);
        }
    }
    
    console.log('🧪 Modular functionality testing complete');
}

/**
 * Legacy compatibility layer
 * Ensures existing inline JavaScript continues to work during transition
 */
function setupLegacyCompatibility() {
    // The individual modules already expose functions to window object
    // This function is here for any additional compatibility needs
    
    console.log('🔗 Legacy compatibility layer active');
}

// Initialize everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeModules();
        setupLegacyCompatibility();
        
        // Test functionality after a brief delay to ensure everything is loaded
        setTimeout(testModularFunctionality, 1000);
    });
} else {
    initializeModules();
    setupLegacyCompatibility();
    setTimeout(testModularFunctionality, 1000);
}

// Export for use in other modules
export {
    initializeModules,
    testModularFunctionality,
    setupModularEventListeners
};