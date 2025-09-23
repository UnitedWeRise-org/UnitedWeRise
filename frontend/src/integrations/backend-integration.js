// Backend integration script for United We Rise Frontend
// This script enhances the existing frontend with new backend features
// 🔐 MIGRATION STATUS: Updated for httpOnly cookie authentication

import { getApiBaseUrl, isDevelopment } from '../utils/environment.js';

class BackendIntegration {
    constructor() {
        // Use centralized API configuration for environment detection
        this.API_BASE = window.API_CONFIG ? window.API_CONFIG.BASE_URL : getApiBaseUrl();
        
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('BackendIntegration', 'Backend Integration API Base: ' + this.API_BASE);
        }
        this.init();
    }

    init() {
        this.enhanceRegistrationForm();
        this.setupPostReporting();
        this.setupVerificationFlow();
        this.enhanceErrorHandling();
    }

    enhanceRegistrationForm() {
        // Find the existing registration handler and enhance it
        const originalHandleRegister = window.handleRegister;
        
        window.handleRegister = async () => {
            const email = document.getElementById('registerEmail').value;
            const username = document.getElementById('registerUsername').value;
            const password = document.getElementById('registerPassword').value;
            const firstName = document.getElementById('registerFirstName').value;
            const lastName = document.getElementById('registerLastName').value;
            const phoneNumber = document.getElementById('registerPhone')?.value; // If phone input exists

            // Check terms agreement
            const termsAgreement = document.getElementById('termsAgreement');
            if (!termsAgreement || !termsAgreement.checked) {
                showAuthMessage('You must agree to the Terms of Service and Privacy Policy to create an account', 'error');
                return;
            }

            // Add hCaptcha validation (skip for staging/dev environments)
            let hcaptchaToken = null;
            if (!isDevelopment()) {
                hcaptchaToken = this.getHCaptchaToken();
                if (!hcaptchaToken) {
                    showAuthMessage('Please complete the captcha verification', 'error');
                    return;
                }
            } else {
                console.log('🔧 Development environment detected: Bypassing hCaptcha validation');
            }

            if (!email || !username || !password) {
                showAuthMessage('Email, username, and password are required', 'error');
                return;
            }

            // Enhanced password validation
            if (!this.validatePassword(password)) {
                showAuthMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character', 'error');
                return;
            }

            try {
                // Generate device fingerprint for anti-bot protection
                let deviceData = null;
                if (window.deviceFingerprinting) {
                    try {
                        deviceData = await window.deviceFingerprinting.getFingerprintData();
                    } catch (e) {
                        if (typeof adminDebugWarn !== 'undefined') {
                            adminDebugWarn('BackendIntegration', 'Device fingerprinting failed', e);
                        }
                    }
                }

                const response = await fetch(`${this.API_BASE}/auth/register`, {
                    method: 'POST',
                    credentials: 'include', // Essential for cookie-based auth
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        username,
                        password,
                        firstName,
                        lastName,
                        phoneNumber,
                        hcaptchaToken,
                        deviceFingerprint: deviceData
                    })
                });

                const data = await response.json();

                if (response.ok && data.user) {
                    // Store CSRF token (auth token now in httpOnly cookie set by backend)
                    window.csrfToken = data.csrfToken;
                    // No longer store JWT token in localStorage - using httpOnly cookies

                    // Show verification modal instead of immediately logging in
                    if (data.user.requiresEmailVerification || data.user.requiresPhoneVerification) {
                        closeAuthModal();
                        verificationFlow.showVerificationModal(data.user);
                    } else {
                        setUserLoggedIn(data.user);
                        closeAuthModal();
                        showAuthMessage('Registration successful!', 'success');
                    }
                } else {
                    showAuthMessage(data.error || data.message || 'Registration failed', 'error');

                    // Reset hCaptcha
                    this.resetHCaptcha();
                }
            } catch (error) {
                if (typeof adminDebugError !== 'undefined') {
                    adminDebugError('BackendIntegration', 'Registration error', error);
                }
                showAuthMessage('Network error. Please try again.', 'error');
                this.resetHCaptcha();
            }
        };
    }

    setupPostReporting() {
        // Add report buttons to existing posts
        const postsObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Look for post elements and add report buttons
                        const posts = node.querySelectorAll ? node.querySelectorAll('.post, [data-post-id]') : [];
                        posts.forEach(post => this.addReportButtonToPost(post));
                        
                        // If this node is itself a post
                        if (node.classList && (node.classList.contains('post') || node.hasAttribute('data-post-id'))) {
                            this.addReportButtonToPost(node);
                        }
                    }
                });
            });
        });

        // Start observing
        postsObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Add to existing posts
        document.querySelectorAll('.post, [data-post-id]').forEach(post => {
            this.addReportButtonToPost(post);
        });
    }

    addReportButtonToPost(postElement) {
        // Avoid duplicate buttons
        if (postElement.querySelector('.report-button')) return;

        const postId = postElement.getAttribute('data-post-id') || 
                      postElement.id || 
                      postElement.querySelector('[data-id]')?.getAttribute('data-id');
        
        if (!postId) return;

        const actionsContainer = postElement.querySelector('.post-actions, .actions') || 
                               postElement.querySelector('.post-footer');
        
        if (actionsContainer) {
            const reportButton = contentReporting.addReportButton(
                postElement, 
                'POST', 
                postId, 
                'Post'
            );
            
            actionsContainer.appendChild(reportButton);
        }
    }

    setupVerificationFlow() {
        // DISABLED: This was causing race conditions with auth state
        // The verification flow override was interfering with the main login process
        // by calling non-existent /verification/status endpoint after 1 second delay
        
        // Set up verification completion callback
        window.onVerificationComplete = () => {
            showAuthMessage('Account verification completed!', 'success');
            // Refresh user data or redirect to onboarding
        };
    }

    async checkVerificationNeeded(user) {
        try {
            const response = await fetch(`${this.API_BASE}/verification/status`, {
                credentials: 'include' // Use cookies for auth
            });
            
            if (response.ok) {
                const status = await response.json();
                
                if (!status.email.verified || (!status.phone.verified && user.phoneNumber)) {
                    // Show verification modal
                    verificationFlow.showVerificationModal(user);
                }
            }
        } catch (error) {
            if (typeof adminDebugError !== 'undefined') {
                adminDebugError('BackendIntegration', 'Failed to check verification status', error);
            }
        }
    }

    enhanceErrorHandling() {
        // Enhance global error handling for backend errors
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // Handle authentication errors globally, but not during app initialization
                if (response.status === 401) {
                    // Don't interfere with app initialization flow - let it handle auth gracefully
                    const isInitializationCall = args[0] && (
                        args[0].includes('/batch/initialize') ||
                        args[0].includes('/auth/me') ||
                        args[0].includes('/users/profile')
                    );
                    
                    if (!isInitializationCall && window.appInitializer && window.appInitializer.isAppInitialized()) {
                        this.handleAuthError();
                    }
                    // Otherwise let the initialization system handle it with fallbacks
                }
                
                // Handle suspension errors
                if (response.status === 403) {
                    const data = await response.clone().json().catch(() => ({}));
                    if (data.error && data.error.includes('suspended')) {
                        this.handleSuspensionError(data);
                    }
                }
                
                // Handle rate limiting
                if (response.status === 429) {
                    const data = await response.clone().json().catch(() => ({}));
                    this.handleRateLimitError(data);
                }
                
                return response;
            } catch (error) {
                if (typeof adminDebugError !== 'undefined') {
                    adminDebugError('BackendIntegration', 'Network error', error);
                }
                throw error;
            }
        };
    }

    handleAuthError() {
        // Clear invalid session data
        window.csrfToken = null;
        if (typeof window.authToken !== 'undefined') {
            window.authToken = null;
        }
        
        if (window.setUserLoggedOut) {
            setUserLoggedOut();
        }
        
        // More user-friendly session expiry notification
        const expiredMsg = document.createElement('div');
        expiredMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; z-index: 10000; border: 1px solid #f5c6cb; max-width: 300px;';
        expiredMsg.innerHTML = '⏰ Your session has expired. Please log in again to continue.';
        document.body.appendChild(expiredMsg);
        
        setTimeout(() => {
            expiredMsg.remove();
            openAuthModal('login');
        }, 3000);
    }

    handleSuspensionError(errorData) {
        alert('Your account has been suspended.');
        
        if (errorData.suspension) {
            contentReporting.showModerationStatus({
                isSuspended: true,
                suspension: errorData.suspension
            });
        }
    }

    handleRateLimitError(errorData) {
        const retryAfter = errorData.retryAfter || 60;
        this.showMessage(`Too many requests. Please wait ${retryAfter} seconds before trying again.`, 'warning');
    }

    // Utility functions
    validatePassword(password) {
        const minLength = 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        return password.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    }

    getHCaptchaToken() {
        // First, try to get the token from the global variable set by callback
        if (window.hCaptchaToken) {
            return window.hCaptchaToken;
        }
        
        // Fallback: Get the hCaptcha token from the API
        if (window.hcaptcha && window.hcaptcha.getResponse) {
            const widget = document.getElementById('hcaptcha-register');
            if (widget && widget.querySelector('iframe')) {
                try {
                    // Try to get the widget ID from the data attribute
                    const widgetId = widget.getAttribute('data-hcaptcha-widget-id');
                    if (widgetId) {
                        return window.hcaptcha.getResponse(widgetId);
                    } else {
                        // Fallback: try without widget ID (works if there's only one widget)
                        return window.hcaptcha.getResponse();
                    }
                } catch (error) {
                    if (typeof adminDebugLog !== 'undefined') {
                        adminDebugLog('BackendIntegration', 'hCaptcha not ready yet', error.message);
                    }
                    return null;
                }
            }
        }
        return null;
    }

    resetHCaptcha() {
        // Clear the stored token
        window.hCaptchaToken = null;
        
        if (window.hcaptcha && window.hcaptcha.reset) {
            const widget = document.getElementById('hcaptcha-register');
            if (widget && widget.querySelector('iframe')) {
                try {
                    const widgetId = widget.getAttribute('data-hcaptcha-widget-id');
                    if (widgetId) {
                        window.hcaptcha.reset(widgetId);
                    } else {
                        window.hcaptcha.reset();
                    }
                } catch (error) {
                    if (typeof adminDebugLog !== 'undefined') {
                        adminDebugLog('BackendIntegration', 'Could not reset hCaptcha', error.message);
                    }
                }
            }
        }
    }

    // Helper function to show messages (uses existing showMessage or creates one)
    showMessage(text, type = 'info') {
        if (window.showMessage) {
            showMessage(text, type);
        } else if (window.showAuthMessage) {
            showAuthMessage(text, type);
        } else {
            // Fallback: create a simple notification
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = text;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 4px;
                color: white;
                z-index: 10000;
                transition: all 0.3s ease;
            `;
            
            const colors = {
                success: '#22c55e',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            
            notification.style.backgroundColor = colors[type] || colors.info;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 5000);
        }
    }
}

// Initialize backend integration
document.addEventListener('DOMContentLoaded', () => {
    const backendIntegration = new BackendIntegration();
    window.backendIntegration = backendIntegration;
});

// Add hCaptcha to registration form if not already present
function addHCaptchaToRegistration() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm && !document.querySelector('.h-captcha')) {
        const hcaptchaDiv = document.createElement('div');
        hcaptchaDiv.className = 'h-captcha';
        // Use production hCaptcha key for all environments
        hcaptchaDiv.setAttribute('data-sitekey', '9c5af3a8-5066-446c-970e-1c18d9fe8d9e');
        
        // Add before the register button
        const submitButton = registerForm.querySelector('button[type="submit"], .register-button');
        if (submitButton) {
            submitButton.parentNode.insertBefore(hcaptchaDiv, submitButton);
        } else {
            registerForm.appendChild(hcaptchaDiv);
        }
        
        // Load hCaptcha script if not already loaded
        if (!document.querySelector('script[src*="hcaptcha.com"]')) {
            const script = document.createElement('script');
            script.src = 'https://js.hcaptcha.com/1/api.js';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }
}

// Add hCaptcha when DOM is ready
document.addEventListener('DOMContentLoaded', addHCaptchaToRegistration);

// Also add when auth modal is opened (in case it's dynamically created)
document.addEventListener('authModalOpened', addHCaptchaToRegistration);

// Load components
document.addEventListener('DOMContentLoaded', () => {
    // Load device fingerprinting for anti-bot protection
    const fingerprintingScript = document.createElement('script');
    fingerprintingScript.src = '/src/services/deviceFingerprinting.js';
    fingerprintingScript.async = true;
    document.head.appendChild(fingerprintingScript);
    
    // Load onboarding flow script
    const onboardingScript = document.createElement('script');
    onboardingScript.src = '/src/components/OnboardingFlow.js';
    onboardingScript.async = true;
    document.head.appendChild(onboardingScript);
});

// Show onboarding for newly registered users
window.onVerificationComplete = () => {
    showMessage('Account verification completed!', 'success');
    
    // Show onboarding flow after verification
    setTimeout(() => {
        if (window.onboardingFlow) {
            onboardingFlow.show();
        }
    }, 1500);
};

// Handle successful login to check onboarding status
// DISABLED: This was causing issues with the login flow by using incorrect API_BASE
// const originalSetUserLoggedInEnhanced = window.setUserLoggedIn;
// if (originalSetUserLoggedInEnhanced) {
//     window.setUserLoggedIn = (user) => {
//         originalSetUserLoggedInEnhanced(user);
//         
//         // Check onboarding status after login
//         setTimeout(async () => {
//             try {
//                 // BUG: this.API_BASE doesn't exist here - this code is outside the class
//                 const response = await fetch(`${this.API_BASE}/onboarding/progress`, {
//                     headers: {
//                         'Authorization': `Bearer ${authToken}`
//                     }
//                 });
//                 
//                 if (response.ok) {
//                     const progress = await response.json();
//                     
//                     // Show onboarding if not complete and user has been registered for less than 7 days
//                     const userAge = Date.now() - new Date(user.createdAt).getTime();
//                     const weekInMs = 7 * 24 * 60 * 60 * 1000;
//                     
//                     if (!progress.isComplete && userAge < weekInMs && window.onboardingFlow) {
//                         onboardingFlow.show();
//                     }
//                 }
//             } catch (error) {
//                 console.error('Failed to check onboarding status:', error);
//             }
//         }, 2000);
//     };
// }

// Export the BackendIntegration class for ES6 module usage
export { BackendIntegration };

// Auto-initialize when module loads
const backendIntegration = new BackendIntegration();

// Make globally available for legacy compatibility
window.BackendIntegration = BackendIntegration;
window.backendIntegration = backendIntegration;

console.log('🔗 Backend Integration loaded via ES6 module');