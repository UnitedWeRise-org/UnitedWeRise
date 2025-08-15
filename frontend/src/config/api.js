// Centralized API configuration for United We Rise Frontend
// This ensures all API calls use the correct backend URL

// Detect environment and set appropriate backend URL
function getBackendURL() {
    const hostname = window.location.hostname;
    
    // Staging environment detection
    if (hostname.includes('staging') || hostname.includes('development') || hostname.includes('dev')) {
        return 'https://unitedwerise-backend-staging.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'https://unitedwerise-backend-staging.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
    }
    
    // Production (default)
    return 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
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