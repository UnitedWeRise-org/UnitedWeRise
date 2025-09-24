/**
 * AdminGlobalUtils - Global utilities and error handling for admin dashboard
 * Extracted from inline HTML scripts for proper ES6 module architecture
 *
 * Provides error handling, initialization status, and global utilities
 */

import { getEnvironment, getApiBaseUrl } from '../../../utils/environment.js';

class AdminGlobalUtils {
    constructor() {
        this.isInitialized = false;
        this.errorHandlers = new Map();

        // Bind methods
        this.init = this.init.bind(this);
        this.setupErrorHandling = this.setupErrorHandling.bind(this);
        this.setupLegacyCompatibility = this.setupLegacyCompatibility.bind(this);
        this.getAPIConfig = this.getAPIConfig.bind(this);
        this.logInitializationStatus = this.logInitializationStatus.bind(this);
        this.handleGlobalError = this.handleGlobalError.bind(this);
    }

    /**
     * Initialize global utilities
     */
    init() {
        if (this.isInitialized) return;

        try {
            this.setupAPIConfig();
            this.setupErrorHandling();
            this.setupLegacyCompatibility();
            this.logInitializationStatus();

            this.isInitialized = true;
            console.log('✅ AdminGlobalUtils initialized');
        } catch (error) {
            console.error('❌ AdminGlobalUtils initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup API configuration using environment utilities
     * Replaces the inline API_CONFIG setup
     */
    setupAPIConfig() {
        // Use the centralized environment detection instead of duplicate logic
        window.API_CONFIG = {
            BASE_URL: getApiBaseUrl(),
            ENVIRONMENT: getEnvironment()
        };

        console.log('✅ API Configuration setup:', window.API_CONFIG);
    }

    /**
     * Setup global error handling
     * Replaces the inline error handler
     */
    setupErrorHandling() {
        // Global error handler for unhandled errors
        window.addEventListener('error', this.handleGlobalError);

        // Global promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (typeof adminDebugError === 'function') {
                adminDebugError('GlobalPromiseRejection', 'Unhandled promise rejection', {
                    reason: event.reason?.toString(),
                    stack: event.reason?.stack
                });
            }
        });

        console.log('✅ Global error handling setup');
    }

    /**
     * Handle global errors
     */
    handleGlobalError(event) {
        console.error('Global error:', event.error);

        if (typeof adminDebugError === 'function') {
            adminDebugError('GlobalError', 'Unhandled error occurred', {
                message: event.error?.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        }

        // Prevent error from bubbling to console if we're handling it
        if (this.shouldSuppressError(event.error)) {
            event.preventDefault();
        }
    }

    /**
     * Check if error should be suppressed from console
     */
    shouldSuppressError(error) {
        // Suppress known non-critical errors
        const suppressedPatterns = [
            /Script error/i,
            /Non-Error promise rejection captured/i,
            /Loading chunk \d+ failed/i
        ];

        return suppressedPatterns.some(pattern =>
            pattern.test(error?.message || '')
        );
    }

    /**
     * Setup legacy compatibility functions
     * Replaces inline legacy compatibility code
     */
    setupLegacyCompatibility() {
        // Legacy logout function
        window.logout = function() {
            if (window.adminAuth) {
                window.adminAuth.logout();
            } else {
                console.warn('adminAuth not available for logout');
                // Fallback logout
                localStorage.removeItem('adminAuthToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin-dashboard.html';
            }
        };

        // Legacy showSection function (will be overridden by AdminModuleLoader)
        if (!window.showSection) {
            window.showSection = function(sectionId) {
                console.warn('showSection called before AdminModuleLoader initialization');
                // Basic fallback implementation
                document.querySelectorAll('.dashboard-section').forEach(section => {
                    section.classList.remove('active');
                });
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            };
        }

        console.log('✅ Legacy compatibility functions setup');
    }

    /**
     * Get API configuration
     */
    getAPIConfig() {
        return window.API_CONFIG;
    }

    /**
     * Log initialization status
     * Replaces inline initialization logging
     */
    logInitializationStatus() {
        console.log('🚀 Modular Admin Dashboard loading...');
        console.log('📦 Core dependencies:', {
            adminDebugger: typeof adminDebugLog === 'function',
            unifiedAuth: typeof unifiedLogin === 'function',
            environment: getEnvironment(),
            apiBaseUrl: getApiBaseUrl(),
            adminTOTPModal: typeof window.requestTOTPConfirmation === 'function'
        });
    }

    /**
     * Register custom error handler
     */
    registerErrorHandler(name, handler) {
        this.errorHandlers.set(name, handler);
    }

    /**
     * Remove custom error handler
     */
    removeErrorHandler(name) {
        this.errorHandlers.delete(name);
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            apiConfig: window.API_CONFIG,
            environment: getEnvironment(),
            errorHandlers: Array.from(this.errorHandlers.keys())
        };
    }

    /**
     * Cleanup method
     */
    destroy() {
        // Remove error listeners
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handleGlobalError);

        // Clear error handlers
        this.errorHandlers.clear();

        this.isInitialized = false;
        console.log('AdminGlobalUtils destroyed');
    }
}

// Create global instance
const adminGlobalUtils = new AdminGlobalUtils();

// Export as ES6 module
export { AdminGlobalUtils, adminGlobalUtils };

// Global compatibility
window.AdminGlobalUtils = AdminGlobalUtils;

// Auto-initialize
adminGlobalUtils.init();