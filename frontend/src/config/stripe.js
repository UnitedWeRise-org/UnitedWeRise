// Stripe Configuration
// This file handles environment-specific Stripe settings

import { getEnvironment, getApiBaseUrl } from '../utils/environment.js';

const STRIPE_CONFIG = {
    // Development/Staging
    development: {
        publishableKey: 'pk_test_51Rv6pdI45l290VNE3IrROlFx1JCh1znoFWqq34KuetkH9pMbx8RlTVnaC6GEYpedlGlJlVFAK3twKALiOqsDsR9T00XoQnM76E',
        backendUrl: getApiBaseUrl()
    },

    // Production
    production: {
        publishableKey: 'pk_live_51Rv6pdI45l290VNEaZeT1tEHp0roeCyAVrQWNxpfjzaR1k3zxfWxp4Q6yrzbtriTPVohY9MiAXOjyrxasVevuJmX00Mwl1BcP1', // Live key
        backendUrl: getApiBaseUrl() // Production backend URL
    }
};

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