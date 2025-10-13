/**
 * CRITICAL FUNCTIONS SCRIPT BLOCK
 * Phase 4D-2: Final Migration Completion
 *
 * This file contains the 4 essential functions that must remain in the main script block
 * after the massive inline code elimination project. These functions provide core
 * infrastructure that cannot be moved to ES6 modules due to their fundamental nature.
 *
 * CRITICAL FUNCTIONS (MUST REMAIN IN MAIN SCRIPT BLOCK):
 * 1. window.setCurrentUser - Authentication state management
 * 2. apiCall - Core API communication wrapper
 * 3. window.togglePanel - Navigation system integration
 * 4. window.onHCaptchaCallback - CAPTCHA functionality
 *
 * DO NOT MOVE THESE FUNCTIONS TO MODULES - They are required to be global
 * and accessible immediately when the page loads.
 */

console.log('🔧 Loading critical functions for Phase 4D-2 minimal script block...');

// ============================================================================
// ESSENTIAL GLOBAL VARIABLES AND CONFIGURATION
// ============================================================================

// API Configuration - Use centralized config
const API_BASE = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://api.unitedwerise.org/api';
let currentUser = null;

// API Response Cache
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for general API calls
const REPRESENTATIVES_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for representatives

// ============================================================================
// CRITICAL FUNCTION #1: AUTHENTICATION STATE MANAGEMENT
// ============================================================================

/**
 * Set the local currentUser variable from external systems
 * CRITICAL: This function must remain global for auth system integration
 */
window.setCurrentUser = function(user) {
    console.log('🔧 setCurrentUser called with:', user?.username || user?.email || 'null user');
    currentUser = user;
    window.currentUser = user;
    console.log('🔧 Local currentUser now set to:', currentUser?.username || 'null');
};

// ============================================================================
// CRITICAL FUNCTION #2: CORE API COMMUNICATION
// ============================================================================

/**
 * API Helper Function - Wrapper for legacy caching
 * CRITICAL: This function must remain global as the primary API interface
 */
async function apiCall(endpoint, options = {}) {
    // Check if api-manager.js is loaded
    if (!window.apiManager || typeof window.apiManager.request !== 'function') {
        console.error('API Manager not loaded yet. Please ensure api-manager.js is loaded.');
        throw new Error('API Manager not initialized');
    }

    // Preserve legacy caching behavior for backward compatibility
    const isGet = !options.method || options.method === 'GET';
    const bypassCache = options.bypassCache;

    if (isGet && !bypassCache) {
        const cacheKey = `${endpoint}${currentUser ? `_${currentUser.id.substring(0, 10)}` : ''}`;
        const cached = apiCache.get(cacheKey);

        // Use longer cache duration for representatives data
        const cacheDuration = endpoint.includes('representatives') || endpoint.includes('officials')
            ? REPRESENTATIVES_CACHE_DURATION
            : CACHE_DURATION;

        if (cached && (Date.now() - cached.timestamp) < cacheDuration) {
            console.log(`Using cached API response for ${endpoint} (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
            return cached.data;
        }
    }

    try {
        // DELEGATE TO UNIFIED API CLIENT from api-manager.js
        const response = await window.apiManager.request(endpoint, options);

        // The apiClient already returns a structured response with parsed data
        // Transform it to match the legacy apiCall format for backward compatibility
        const result = {
            ok: response.ok || response.success || false,
            status: response.status || (response.ok ? 200 : 500),
            data: response.data || response || null
        };

        // Cache GET responses
        if (isGet && !bypassCache && result.ok) {
            const cacheKey = `${endpoint}${currentUser ? `_${currentUser.id.toString().substring(0, 10)}` : ''}`;
            apiCache.set(cacheKey, {
                timestamp: Date.now(),
                data: result
            });

            // Clean old cache entries periodically
            if (apiCache.size > 100) {
                const cutoff = Date.now() - Math.max(CACHE_DURATION, REPRESENTATIVES_CACHE_DURATION);
                for (const [key, value] of apiCache.entries()) {
                    if (value.timestamp < cutoff) {
                        apiCache.delete(key);
                    }
                }
            }
        }

        return result;
    } catch (networkError) {
        console.error('Network error:', networkError);
        return {
            ok: false,
            status: 0,
            data: { error: 'Network error. Please check your connection.' }
        };
    }
}

// Expose apiCall globally
window.apiCall = apiCall;

// ============================================================================
// CRITICAL FUNCTION #3: NAVIGATION SYSTEM INTEGRATION
// ============================================================================

/**
 * Override existing togglePanel to load live data
 * CRITICAL: This function must remain global for navigation system integration
 */
window.togglePanel = function(name) {
    // Get reference to original togglePanel from NavigationHandlers
    const originalTogglePanel = window.NavigationHandlers?.togglePanel || function(name) {
        console.warn('NavigationHandlers.togglePanel not available, using fallback');
        const panel = document.getElementById(`panel-${name}`);
        if (panel) {
            panel.classList.toggle('hidden');
        }
    };

    const panel = document.getElementById(`panel-${name}`);
    const wasHidden = panel ? panel.classList.contains('hidden') : false;

    // Call the original toggle function
    originalTogglePanel(name);

    // Load live data when panels are opened (not when closed)
    if (wasHidden && panel && !panel.classList.contains('hidden')) {
        if (name === 'trending') {
            // Use trending handlers if available
            if (window.TrendingHandlers?.loadTrendingPosts) {
                window.TrendingHandlers.loadTrendingPosts();
            } else if (typeof loadTrendingPosts === 'function') {
                loadTrendingPosts();
            }
        } else if (name === 'officials' && currentUser) {
            // Use officials handlers if available
            if (window.OfficialsHandlers?.loadUserContent) {
                window.OfficialsHandlers.loadUserContent();
            } else if (typeof loadUserContent === 'function') {
                loadUserContent();
            }
        }
    }
};

// ============================================================================
// CRITICAL FUNCTION #4: CAPTCHA FUNCTIONALITY
// ============================================================================

/**
 * Global hCaptcha callback function
 * CRITICAL: This function must remain global for hCaptcha integration
 */
window.onHCaptchaCallback = function(token) {
    console.log('hCaptcha completed successfully!', { tokenLength: token ? token.length : 0 });
    // Store the token in a global variable for easy access
    window.hCaptchaToken = token;
};

// ============================================================================
// ESSENTIAL INITIALIZATION
// ============================================================================

// Check for existing auth on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Critical functions DOMContentLoaded - initializing essential systems...');

    // Use new optimized initialization system if available
    if (typeof initializeApp !== 'undefined') {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('AppInit', 'Starting optimized app initialization...');
        }
        initializeApp().then(result => {
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('AppInit', 'App initialization complete', result);
            }

            // Setup civic organizing sidebar monitoring
            if (typeof setupCivicOrganizingSidebarMonitoring !== 'undefined') {
                setupCivicOrganizingSidebarMonitoring();
            }

            // OLD mobile navigation system DISABLED - replaced by new mobile UX components
            // (MobileBottomBar, TopBarController, FeedToggle)
            // DO NOT re-enable - causes conflicts with new system
            /*
            if (typeof initMobileNavigation !== 'undefined') {
                initMobileNavigation();
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('Mobile', 'Mobile navigation initialized');
                }
            }
            */
        }).catch(error => {
            console.error('💥 App initialization failed:', error);
        });
    }

    // Essential UI setup
    if (typeof setupCollapseButton !== 'undefined') {
        setupCollapseButton();
    }

    if (typeof setupCloseButton !== 'undefined') {
        setupCloseButton();
    }

    if (typeof setupSidebarMapButton !== 'undefined') {
        setupSidebarMapButton();
    }

    // Load and show MOTD if available
    if (typeof loadMOTD !== 'undefined') {
        loadMOTD();
    }

    // Start trending refresh interval if available
    if (typeof startTrendingRefresh !== 'undefined') {
        startTrendingRefresh();
    }
});

// Check hCaptcha after page load (let it auto-render)
window.addEventListener('load', function() {
    setTimeout(() => {
        if (typeof checkHCaptchaStatus !== 'undefined') {
            checkHCaptchaStatus();
        }
        // No manual rendering needed - hCaptcha script auto-renders widgets with data-sitekey
        console.log('Relying on hCaptcha auto-render via data-sitekey attribute');
    }, 2000);
});

console.log('✅ Critical functions loaded - Phase 4D-2 minimal script block complete!');