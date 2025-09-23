/**
 * @module utils/environment
 * @description Centralized environment detection for frontend
 *
 * SINGLE SOURCE OF TRUTH for environment detection across the entire frontend.
 * All environment checks should use these functions instead of direct hostname/URL checks.
 */

/**
 * Get current environment based on hostname
 * @returns {'development' | 'production'} The current environment
 */
export function getEnvironment() {
    const hostname = window.location.hostname;

    // Development environments (staging domain + localhost)
    if (hostname === 'dev.unitedwerise.org' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1') {
        return 'development';
    }

    // Everything else defaults to production (secure fallback)
    return 'production';
}

/**
 * Check if running in development environment
 * @returns {boolean} True if development environment
 */
export function isDevelopment() {
    return getEnvironment() === 'development';
}

/**
 * Check if running in production environment
 * @returns {boolean} True if production environment
 */
export function isProduction() {
    return getEnvironment() === 'production';
}

/**
 * Get API base URL for current environment
 * @returns {string} The appropriate API base URL
 */
export function getApiBaseUrl() {
    if (isDevelopment()) {
        return 'https://dev-api.unitedwerise.org/api';
    }
    return 'https://api.unitedwerise.org/api';
}

/**
 * Get WebSocket URL for current environment
 * @returns {string} The appropriate WebSocket URL
 */
export function getWebSocketUrl() {
    if (isDevelopment()) {
        // Special localhost handling for local development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        return 'wss://dev-api.unitedwerise.org';
    }
    return 'wss://api.unitedwerise.org';
}

/**
 * Get admin dashboard URL for current environment
 * @returns {string} The appropriate admin dashboard URL
 */
export function getAdminDashboardUrl() {
    if (isDevelopment()) {
        // Special localhost handling for local development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '/admin-dashboard.html';
        }
        return 'https://dev.unitedwerise.org/admin-dashboard.html';
    }
    return 'https://www.unitedwerise.org/admin-dashboard.html';
}

/**
 * Log environment information to console (for debugging)
 */
export function logEnvironmentInfo() {
    const env = getEnvironment();
    console.log(`🌍 FRONTEND ENVIRONMENT: ${env.toUpperCase()}`);
    console.log(`📍 Hostname: ${window.location.hostname}`);
    console.log(`🔗 API Base URL: ${getApiBaseUrl()}`);
    console.log(`📡 WebSocket URL: ${getWebSocketUrl()}`);
    console.log(`👥 Admin Dashboard: ${getAdminDashboardUrl()}`);
}

// Auto-log environment info when loaded in development
if (isDevelopment()) {
    console.log('🌍 Environment detection system loaded');
    logEnvironmentInfo();
}