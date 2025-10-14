/**
 * API Configuration - ES6 Module
 * Centralized API configuration with environment-specific settings
 * Modern ES6 module with proper imports/exports
 */

import { getApiBaseUrl, getEnvironment, isDevelopment, isProduction, logEnvironmentInfo } from '../utils/environment.js';

export const API_CONFIG = {
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

// Make it globally available for legacy compatibility during transition
window.API_CONFIG = API_CONFIG;

// Display environment banner in console
logEnvironmentInfo();