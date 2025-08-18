// Stripe Configuration
// This file handles environment-specific Stripe settings

const STRIPE_CONFIG = {
    // Development/Staging
    development: {
        publishableKey: 'pk_test_51Rv6pdI45l290VNE3IrROlFx1JCh1znoFWqq34KuetkH9pMbx8RlTVnaC6GEYpedlGlJlVFAK3twKALiOqsDsR9T00XoQnM76E',
        backendUrl: 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api'
    },
    
    // Production
    production: {
        publishableKey: 'pk_live_YOUR_LIVE_PUBLISHABLE_KEY', // Update when ready for production
        backendUrl: 'https://www.unitedwerise.org/api' // Production backend URL
    }
};

// Detect environment
function getEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
        return 'development';
    }
    
    if (hostname.includes('azurestaticapps.net')) {
        return 'development'; // Staging environment
    }
    
    if (hostname === 'www.unitedwerise.org' || hostname === 'unitedwerise.org') {
        return 'production';
    }
    
    // Default to development for safety
    return 'development';
}

// Export configuration
const env = getEnvironment();
export const stripeConfig = STRIPE_CONFIG[env];

// Helper function to initialize Stripe
export async function initializeStripe() {
    if (typeof Stripe === 'undefined') {
        console.error('Stripe.js not loaded');
        return null;
    }
    
    return Stripe(stripeConfig.publishableKey);
}

// API helper for payment endpoints
export function getPaymentApiUrl(endpoint) {
    return `${stripeConfig.backendUrl}/payments/${endpoint}`;
}

console.log(`🔧 Stripe configured for ${env} environment`);