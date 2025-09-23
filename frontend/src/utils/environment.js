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
        // Check if running on localhost specifically
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        return 'https://dev-api.unitedwerise.org';
    }
    return 'https://api.unitedwerise.org';
}

/**
 * Log environment information to console
 */
export function logEnvironmentInfo() {
    const env = getEnvironment();
    const apiUrl = getApiBaseUrl();

    console.log(`🌍 ENVIRONMENT: ${env.toUpperCase()}`);
    console.log(`🔗 API Backend: ${apiUrl}`);
    console.log(`📍 Hostname: ${window.location.hostname}`);

    // Environment-specific banner
    console.log(`
╔════════════════════════════════════════════╗
║  🚀 United We Rise - ${env.toUpperCase().padEnd(11)} Environment  ║
║  Backend: ${apiUrl.padEnd(36)} ║
║  Database: ${isDevelopment() ? 'unitedwerise-db-dev (DEV)'.padEnd(30) : 'unitedwerise-db (PROD)'.padEnd(30)} ║
╚════════════════════════════════════════════╝
`);
}

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.getEnvironment = getEnvironment;
    window.isDevelopment = isDevelopment;
    window.isProduction = isProduction;
    window.getApiBaseUrl = getApiBaseUrl;
    window.getWebSocketUrl = getWebSocketUrl;
}

export default {
    getEnvironment,
    isDevelopment,
    isProduction,
    getApiBaseUrl,
    getWebSocketUrl,
    logEnvironmentInfo
};