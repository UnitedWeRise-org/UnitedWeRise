// Centralized API configuration for United We Rise Frontend
// This ensures all API calls use the correct backend URL

import { getApiBaseUrl, getEnvironment, isDevelopment, isProduction, logEnvironmentInfo } from '../utils/environment.js';

const API_CONFIG = {
    BASE_URL: getApiBaseUrl(),
    ENVIRONMENT: getEnvironment().toUpperCase(),

    // Helper method to build full API URLs
    url(endpoint) {
        // Remove leading slash if present to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.BASE_URL}/${cleanEndpoint}`;
    },

    // Helper to check environment
    isProduction() {
        return isProduction();
    },
    isDevelopment() {
        return isDevelopment();
    },
    // Legacy compatibility
    isStaging() {
        return isDevelopment();
    },
    isLocal() {
        return isDevelopment();
    }
};

// Make it globally available
window.API_CONFIG = API_CONFIG;

// Display environment banner in console
logEnvironmentInfo();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}