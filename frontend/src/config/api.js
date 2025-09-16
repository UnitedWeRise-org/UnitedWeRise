// Centralized API configuration for United We Rise Frontend
// This ensures all API calls use the correct backend URL

// Detect environment and set appropriate backend URL
function getBackendURL() {
    const hostname = window.location.hostname;
    
    // Professional staging domain detection
    if (hostname === 'dev.unitedwerise.org') {
        return 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
    }
    
    // Fallback staging detection for Azure direct URLs (during DNS transition)
    if (hostname.includes('staging') || 
        hostname.includes('development') || 
        hostname.includes('dev') ||
        hostname.includes('delightful-smoke-097b2fa0f')) {
        return 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001/api'; // Use local backend for development
    }
    
    // Production (default)
    return 'https://api.unitedwerise.org/api';
}

const API_CONFIG = {
    BASE_URL: getBackendURL(),
    
    // Helper method to build full API URLs
    url(endpoint) {
        // Remove leading slash if present to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.BASE_URL}/${cleanEndpoint}`;
    }
};

// Make it globally available
window.API_CONFIG = API_CONFIG;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}