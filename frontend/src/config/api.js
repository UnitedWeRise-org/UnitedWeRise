// Centralized API configuration for United We Rise Frontend
// This ensures all API calls use the correct backend URL

// Detect environment and set appropriate backend URL
function getBackendURL() {
    const hostname = window.location.hostname;
    let environment = 'PRODUCTION';
    let apiUrl = 'https://api.unitedwerise.org/api';

    // Professional staging domain detection
    if (hostname === 'dev.unitedwerise.org') {
        environment = 'STAGING';
        apiUrl = 'https://dev-api.unitedwerise.org/api';
    }
    // Fallback staging detection for Azure direct URLs (during DNS transition)
    else if (hostname.includes('staging') ||
        hostname.includes('development') ||
        hostname.includes('dev') ||
        hostname.includes('delightful-smoke-097b2fa0f')) {
        environment = 'STAGING';
        apiUrl = 'https://dev-api.unitedwerise.org/api';
    }
    // Local development
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        environment = 'LOCAL';
        apiUrl = 'http://localhost:3001/api';
    }

    // Log environment detection
    console.log(`🌍 ENVIRONMENT: ${environment}`);
    console.log(`🔗 API Backend: ${apiUrl}`);
    console.log(`📍 Hostname: ${hostname}`);

    return apiUrl;
}

const API_CONFIG = {
    BASE_URL: getBackendURL(),
    ENVIRONMENT: window.location.hostname === 'dev.unitedwerise.org' ? 'STAGING' :
                  (window.location.hostname === 'localhost' ? 'LOCAL' : 'PRODUCTION'),

    // Helper method to build full API URLs
    url(endpoint) {
        // Remove leading slash if present to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.BASE_URL}/${cleanEndpoint}`;
    },

    // Helper to check environment
    isProduction() {
        return this.ENVIRONMENT === 'PRODUCTION';
    },
    isStaging() {
        return this.ENVIRONMENT === 'STAGING';
    },
    isLocal() {
        return this.ENVIRONMENT === 'LOCAL';
    }
};

// Make it globally available
window.API_CONFIG = API_CONFIG;

// Display environment banner in console
console.log(`
╔════════════════════════════════════════════╗
║  🚀 United We Rise - ${API_CONFIG.ENVIRONMENT.padEnd(10)} Environment  ║
║  Backend: ${API_CONFIG.BASE_URL.padEnd(32)} ║
║  Database: ${API_CONFIG.isProduction() ? 'unitedwerise-db (PROD)'.padEnd(30) :
              API_CONFIG.isStaging() ? 'unitedwerise-db-dev (DEV)'.padEnd(30) :
              'Local/Dev DB'.padEnd(30)} ║
╚════════════════════════════════════════════╝
`);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}