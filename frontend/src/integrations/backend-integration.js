// Backend integration script for United We Rise Frontend
// This script enhances the existing frontend with new backend features
// 🔐 MIGRATION STATUS: Updated for httpOnly cookie authentication

import { getApiBaseUrl, isDevelopment } from '../utils/environment.js';
import { adminDebugLog } from '../../js/adminDebugger.js';

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
        // Registration is now handled by the modern modal.js handler
        // This method is kept empty for backwards compatibility
        // The modern handler in modal.js provides all registration functionality
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

    /**
     * Verify session with retry logic to handle transient network issues
     * @param {number} maxRetries - Maximum number of retry attempts
     * @returns {Promise<{valid: boolean, status?: number, error?: string}>}
     */
    async _verifySessionWithRetry(maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`${this.API_BASE}/auth/me`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    return { valid: true, status: response.status };
                }

                if (response.status === 401) {
                    // Token truly expired - no need to retry
                    return { valid: false, status: 401, expired: true };
                }

                // Server error (500, 503, etc) - retry if we have attempts left
                if (attempt < maxRetries) {
                    console.log(`⏳ Session verification returned ${response.status}, retrying (${attempt}/${maxRetries})...`);
                    await this._sleep(1000 * attempt); // Exponential backoff: 1s, 2s
                    continue;
                }

                // All retries exhausted with server errors - keep user logged in
                return { valid: true, status: response.status, uncertain: true };

            } catch (error) {
                // Network error - retry if we have attempts left
                if (attempt < maxRetries) {
                    console.log(`⏳ Session verification network error, retrying (${attempt}/${maxRetries})...`);
                    await this._sleep(1000 * attempt);
                    continue;
                }

                // All retries exhausted with network errors - keep user logged in
                return { valid: true, error: error.message, uncertain: true };
            }
        }

        // Should never reach here, but default to keeping user logged in
        return { valid: true, uncertain: true };
    }

    /**
     * Sleep helper for retry backoff
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    enhanceErrorHandling() {
        // Enhance global error handling for backend errors
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);

                // Handle authentication errors - but verify session first
                // (401 can be from connection timeout, not just JWT expiration)
                if (response.status === 401) {
                    // Don't interfere with app initialization flow - let it handle auth gracefully
                    const isInitializationCall = args[0] && (
                        args[0].includes('/batch/initialize') ||
                        args[0].includes('/auth/me') ||
                        args[0].includes('/auth/refresh') ||
                        args[0].includes('/users/profile')
                    );

                    if (!isInitializationCall && window.appInitializer && window.appInitializer.isAppInitialized()) {
                        // Check if token refresh is pending, just woke up, or just refreshed successfully
                        // The didJustWakeUp() check handles cases where:
                        // - Scheduled timers fire before visibility change event
                        // - The isRefreshPending flag wasn't set due to race condition
                        // The didJustRefreshSuccessfully() check handles the case where:
                        // - Refresh completed but old 401s are still being processed
                        // - Trust successful refresh (requires valid refresh token from database)
                        const manager = window.unifiedAuthManager;
                        const shouldWaitForRefresh = manager && (
                            manager.isRefreshPending() ||
                            manager.didJustWakeUp(3000) || // Within 3 seconds of tab becoming visible
                            manager.didJustRefreshSuccessfully(5000) // Within 5 seconds of successful refresh
                        );

                        if (shouldWaitForRefresh) {
                            console.log('⏳ Token refresh pending, just woke, or just refreshed - checking session...');
                            await manager.waitForPendingRefresh(5000);

                            // After refresh completes, check if user is still authenticated
                            if (window.unifiedAuthManager.isAuthenticated()) {
                                console.log('✅ Token refresh completed - user still authenticated, skipping logout');
                                if (typeof adminDebugLog !== 'undefined') {
                                    adminDebugLog('BackendIntegration', 'Token refresh completed after 401 - session restored', {
                                        originalUrl: args[0]
                                    });
                                }
                                // Don't logout - the original request failed but session is now valid
                                return response;
                            }
                        }

                        // Verify session with retry logic before logging out
                        console.warn('⚠️ Received 401 - verifying session with retry...');

                        const verifyResult = await this._verifySessionWithRetry(2);

                        if (verifyResult.valid) {
                            if (verifyResult.uncertain) {
                                // Uncertain result (server errors or network issues) - keep user logged in
                                console.warn('⚠️ Session verification uncertain (server/network issues) - keeping user logged in');
                                if (typeof adminDebugWarn !== 'undefined') {
                                    adminDebugWarn('BackendIntegration', 'Session verification uncertain - not logging out', {
                                        result: verifyResult,
                                        originalUrl: args[0]
                                    });
                                }
                            } else {
                                // Session confirmed valid
                                console.log('✅ Session verified valid - 401 was likely connection error');
                                if (typeof adminDebugLog !== 'undefined') {
                                    adminDebugLog('BackendIntegration', '401 error but session valid - connection timeout suspected', {
                                        originalUrl: args[0],
                                        method: args[1]?.method || 'GET'
                                    });
                                }
                            }
                            // Don't call handleAuthError - keep user logged in
                        } else if (verifyResult.expired) {
                            // Token truly expired (401 from /auth/me) - log out silently
                            console.log('🔒 Session verification confirmed token expired - updating UI');
                            if (typeof adminDebugLog !== 'undefined') {
                                adminDebugLog('BackendIntegration', 'Token confirmed expired - silent logout', {
                                    verifyStatus: verifyResult.status
                                });
                            }
                            this.handleAuthError();
                        }
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
        // Prevent infinite loops - only handle once every 5 seconds
        if (this._lastAuthErrorHandled && Date.now() - this._lastAuthErrorHandled < 5000) {
            console.warn('⚠️ Auth error handler called too soon, skipping to prevent loop');
            return;
        }
        this._lastAuthErrorHandled = Date.now();

        // Clear invalid session data
        window.csrfToken = null;
        if (typeof window.authToken !== 'undefined') {
            window.authToken = null;
        }

        // Disconnect WebSocket to prevent reconnection with stale auth
        // WebSocket has its own refresh token that can reconnect even after logout cleared UI state,
        // which causes confusing behavior where the socket reconnects after the user is "logged out"
        if (window.socketService && typeof window.socketService.disconnect === 'function') {
            console.log('🔌 Disconnecting WebSocket on auth error');
            window.socketService.disconnect();
        }

        // Silent logout - update UI to logged-out state without popup
        // User can click login when they're ready
        if (window.setUserLoggedOut) {
            setUserLoggedOut();
        }

        // Log for debugging but don't show popup to user
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('BackendIntegration', 'Session expired - UI updated silently');
        }
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

// Handle successful login to check onboarding status - FIXED VERSION
class OnboardingTrigger {
    constructor() {
        this.initializeOnboardingTriggers();
    }

    async initializeOnboardingTriggers() {
        // Listen for authentication events from unified auth manager
        if (window.unifiedAuthManager) {
            window.unifiedAuthManager.subscribe((authState) => {
                if (authState.isAuthenticated && authState.user) {
                    this.checkOnboardingStatus(authState.user);
                }
            });
        }

        // Also listen for direct login events as fallback
        window.addEventListener('userLoggedIn', (event) => {
            if (event.detail && event.detail.user) {
                // Delay onboarding check to allow cookies to propagate after login
                setTimeout(() => {
                    this.checkOnboardingStatus(event.detail.user);
                }, 500); // 500ms delay for cookie propagation
            }
        });

        // Listen for app initialization complete event (ensures onboarding triggers after full app load)
        window.addEventListener('appInitializationComplete', async (event) => {
            if (event.detail && event.detail.user) {
                await adminDebugLog('BackendIntegration', 'App initialization complete, checking onboarding...');
                // Delay onboarding check to allow cookies to propagate
                setTimeout(() => {
                    this.checkOnboardingStatus(event.detail.user);
                }, 500); // 500ms delay for cookie propagation
            }
        });
    }

    async checkOnboardingStatus(user) {
        try {
            // Use environment-aware API client with cookie authentication
            const progress = await window.apiClient.call('/onboarding/progress');

            // Calculate user age safely with null check
            const createdDate = user?.createdAt ? new Date(user.createdAt) : null;
            const userAge = createdDate && !isNaN(createdDate.getTime())
                ? Date.now() - createdDate.getTime()
                : Infinity; // Very old if no date (skip onboarding)

            // Show onboarding if not complete and user has been registered for less than 7 days
            const weekInMs = 7 * 24 * 60 * 60 * 1000;
            const shouldShowOnboarding = !progress.isComplete && userAge < weekInMs;

            if (shouldShowOnboarding && window.onboardingFlow) {
                console.log('🎯 Triggering onboarding flow for user:', user.firstName || user.username);
                // Small delay to let the page finish loading
                setTimeout(() => {
                    window.onboardingFlow.show();
                }, 1500);
            } else if (shouldShowOnboarding) {
                console.warn('⚠️ Should show onboarding but OnboardingFlow not available');
            }
            // Silently skip onboarding if not needed (reduces console noise)
        } catch (error) {
            console.error('Failed to check onboarding status:', error);

            // Fallback: Show onboarding for very new users (created in last hour)
            // This covers edge cases where API might fail
            const createdDate = user?.createdAt ? new Date(user.createdAt) : null;
            const userAge = createdDate && !isNaN(createdDate.getTime())
                ? Date.now() - createdDate.getTime()
                : Infinity; // Very old if no date (skip onboarding)
            const oneHourMs = 60 * 60 * 1000;

            if (userAge < oneHourMs && window.onboardingFlow) {
                console.log('🔄 API failed, showing onboarding for very new user');
                setTimeout(() => {
                    window.onboardingFlow.show();
                }, 2000);
            }
        }
    }
}

// Initialize the onboarding trigger system
const onboardingTrigger = new OnboardingTrigger();

// Export the BackendIntegration class for ES6 module usage
export { BackendIntegration };

// Auto-initialize when module loads
const backendIntegration = new BackendIntegration();

// Make globally available for legacy compatibility
window.BackendIntegration = BackendIntegration;
window.backendIntegration = backendIntegration;