/**
 * @module js/critical-functions
 * @description Critical functions maintained during ES6 migration
 *
 * MIGRATION STATUS (Batch 3 - October 11, 2025):
 * ✅ REMOVED: window.apiCall → api-compatibility-shim.js
 * ✅ REMOVED: window.togglePanel → navigation-handlers.js
 * ✅ REMOVED: window.onHCaptchaCallback → hcaptcha-integration.js
 * ⏸️ REMAINING: window.setCurrentUser (pending Batch 4+)
 *
 * This file will be deleted once all critical functions are migrated.
 */

// NOTE: This file is loaded as non-module script, cannot use ES6 imports
// Use conditional adminDebugLog availability check instead

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
window.setCurrentUser = async function(user) {
    if (typeof adminDebugLog !== 'undefined') {
        await adminDebugLog('CriticalFunctions', 'setCurrentUser called', { username: user?.username || user?.email || 'null user' });
    }
    currentUser = user;
    window.currentUser = user;
    if (typeof adminDebugLog !== 'undefined') {
        await adminDebugLog('CriticalFunctions', 'Local currentUser set', { username: currentUser?.username || 'null' });
    }
};

// ============================================================================
// CRITICAL FUNCTION #2: CORE API COMMUNICATION
// ============================================================================

// ✅ window.apiCall removed - now provided by api-compatibility-shim.js (Batch 3)
// Source: frontend/src/js/api-manager.js (via reputation-integration.js)
// The shim maintains window.apiCall during transition while 165+ call sites migrate to ES6 imports

// ============================================================================
// CRITICAL FUNCTION #3: NAVIGATION SYSTEM INTEGRATION
// ============================================================================

// ✅ window.togglePanel removed - now provided by navigation-handlers.js (Batch 3)
// Source: frontend/src/handlers/navigation-handlers.js
// Enhanced version includes live data loading for trending and officials panels

// ============================================================================
// CRITICAL FUNCTION #4: CAPTCHA FUNCTIONALITY
// ============================================================================

// ✅ window.onHCaptchaCallback removed - now provided by hcaptcha-integration.js (Batch 3)
// Source: frontend/src/integrations/hcaptcha-integration.js
// Global callback maintained for hCaptcha external script integration

// ============================================================================
// ESSENTIAL INITIALIZATION
// ============================================================================

// Check for existing auth on page load
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof adminDebugLog !== 'undefined') {
        await adminDebugLog('CriticalFunctions', 'DOMContentLoaded - initializing essential systems');
    }

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
    }, 2000);
});

console.log('✅ Critical functions loaded - Phase 4D-2 minimal script block complete!');