/**
 * @module handlers/auth-handlers
 * @description OAuth authentication handlers and utilities
 * Extracted from index.html OAuth-specific functions
 *
 * This module handles:
 * - Google OAuth authentication
 * - OAuth SDK loading and initialization
 * - Password visibility utilities
 * - Auth storage management
 *
 * @example
 * import AuthHandlers from './src/handlers/auth-handlers.js';
 * const authHandlers = new AuthHandlers();
 */

import { getApiBaseUrl, isDevelopment } from '../utils/environment.js';
import { closeAuthModal, showAuthMessage } from '../modules/core/auth/modal.js';
import { unifiedAuthManager } from '../modules/core/auth/unified-manager.js';
import { usernameModal } from '../modules/core/auth/username-modal.js';
import { adminDebugLog } from '../../js/adminDebugger.js';
import { escapeHTML } from '../utils/security.js';

export class AuthHandlers {
    constructor() {
        this.googleClientId = '496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com';
        this.initialized = false;
        this.setupEventListeners();
    }

    /**
     * Setup event delegation for authentication handlers
     */
    setupEventListeners() {
        // Event delegation for OAuth buttons
        document.addEventListener('click', (event) => {
            if (event.target.matches('[data-auth-google]') ||
                event.target.closest('[data-auth-google]')) {
                event.preventDefault();
                this.handleGoogleLogin();
            }

            if (event.target.matches('[data-password-toggle]')) {
                event.preventDefault();
                const fieldId = event.target.getAttribute('data-target');
                if (fieldId) {
                    this.togglePasswordVisibility(fieldId);
                }
            }
        });

        this.initialized = true;
    }

    /**
     * Google OAuth Login Handler
     * Fixed for iOS Safari compatibility - uses prompt() instead of programmatic click
     */
    async handleGoogleLogin() {
        try {
            await adminDebugLog('AuthHandlers', 'Starting Google Sign-In process');
            await adminDebugLog('AuthHandlers', 'Domain', { origin: window.location.origin });

            // Initialize Google Sign-In if not already done
            if (!window.google?.accounts?.id) {
                await adminDebugLog('AuthHandlers', 'Google Sign-In not loaded, attempting to load');
                try {
                    await this.loadGoogleSignIn();
                    await adminDebugLog('AuthHandlers', 'Google Sign-In loaded successfully');
                } catch (loadError) {
                    console.error('❌ Failed to load Google Sign-In:', loadError);

                    // Handle both Error objects and Event objects from script loading failures
                    const errorMessage = loadError?.message || loadError?.type || 'Unknown error';
                    if (errorMessage.includes('domain authorization')) {
                        showAuthMessage('Google Sign-In is still initializing. Domain authorization may be propagating. Please try again in 15-30 minutes.', 'warning');
                        await adminDebugLog('AuthHandlers', 'Run testGoogleDomainAuth() to check status');
                    } else {
                        showAuthMessage('Google Sign-In is temporarily unavailable. Please try again later.', 'error');
                    }
                    // Report error to backend for admin visibility
                    this.reportOAuthError('google', 'sdk_load_failed', errorMessage);
                    return;
                }
            }

            await adminDebugLog('AuthHandlers', 'Triggering Google Sign-In prompt');

            // Use Google One Tap prompt - works on iOS Safari unlike programmatic click
            // The prompt() method opens the account chooser dialog
            try {
                google.accounts.id.prompt((notification) => {
                    this.handleGooglePromptNotification(notification);
                });
                await adminDebugLog('AuthHandlers', 'Google prompt triggered successfully');
            } catch (promptError) {
                await adminDebugLog('AuthHandlers', 'Prompt failed, trying fallback', { error: promptError?.message });
                // Fallback: show a visible button for user to click (required for iOS)
                this.showGoogleSignInFallback();
            }

        } catch (error) {
            console.error('❌ Google login error:', error);
            showAuthMessage('Google Sign-In encountered an error. Please try again later.', 'error');
            this.reportOAuthError('google', 'login_error', error?.message || 'Unknown error');
        }
    }

    /**
     * Handle Google prompt notifications
     * Called when the One Tap prompt changes state
     */
    async handleGooglePromptNotification(notification) {
        await adminDebugLog('AuthHandlers', 'Google prompt notification', {
            momentType: notification.getMomentType(),
            isDismissedMoment: notification.isDismissedMoment?.(),
            isSkippedMoment: notification.isSkippedMoment?.(),
            isNotDisplayed: notification.isNotDisplayed?.()
        });

        if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            await adminDebugLog('AuthHandlers', 'Prompt not displayed', { reason });

            // If prompt can't display (e.g., browser blocks it), show fallback button
            if (reason === 'opt_out_or_no_session' || reason === 'suppressed_by_user') {
                // User has opted out or dismissed before - show fallback
                this.showGoogleSignInFallback();
            } else if (reason === 'browser_not_supported') {
                showAuthMessage('Your browser does not support Google Sign-In. Please try a different browser.', 'warning');
                this.reportOAuthError('google', 'browser_not_supported', reason);
            }
        } else if (notification.isDismissedMoment()) {
            const reason = notification.getDismissedReason();
            await adminDebugLog('AuthHandlers', 'Prompt dismissed', { reason });

            // User dismissed the prompt - they can try again if they want
            if (reason === 'credential_returned') {
                // Success - credential was returned, handleGoogleCredentialResponse will be called
                await adminDebugLog('AuthHandlers', 'Credential returned successfully');
            }
        } else if (notification.isSkippedMoment()) {
            await adminDebugLog('AuthHandlers', 'Prompt skipped');
            // Show fallback for manual selection
            this.showGoogleSignInFallback();
        }
    }

    /**
     * Show a visible Google Sign-In button as fallback
     * Required for iOS Safari and browsers that block automatic prompts
     */
    showGoogleSignInFallback() {
        adminDebugLog('AuthHandlers', 'Showing Google Sign-In fallback button');

        // Check if fallback already exists
        if (document.getElementById('google-signin-fallback-overlay')) {
            return;
        }

        // Create overlay for the fallback button
        const overlay = document.createElement('div');
        overlay.id = 'google-signin-fallback-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;

        // Create container for button and close option
        const container = document.createElement('div');
        container.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            max-width: 320px;
        `;

        // Add instruction text
        const instruction = document.createElement('p');
        instruction.textContent = 'Click below to sign in with Google:';
        instruction.style.cssText = 'margin: 0 0 16px 0; color: #333; font-size: 14px;';
        container.appendChild(instruction);

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'google-signin-fallback-button';
        buttonContainer.style.cssText = 'display: flex; justify-content: center; margin-bottom: 16px;';
        container.appendChild(buttonContainer);

        // Add cancel link
        const cancelLink = document.createElement('a');
        cancelLink.textContent = 'Cancel';
        cancelLink.href = '#';
        cancelLink.style.cssText = 'color: #666; font-size: 12px; text-decoration: none;';
        cancelLink.onclick = (e) => {
            e.preventDefault();
            overlay.remove();
        };
        container.appendChild(cancelLink);

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Close on overlay click (but not on container click)
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };

        // Render the actual Google Sign-In button - user must click this manually
        if (window.google?.accounts?.id) {
            google.accounts.id.renderButton(buttonContainer, {
                type: 'standard',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 280
            });
        } else {
            buttonContainer.innerHTML = '<p style="color: #c00;">Google Sign-In failed to load. Please refresh and try again.</p>';
        }
    }

    /**
     * Report OAuth errors to backend for admin visibility
     * @param {string} provider - OAuth provider (e.g., 'google')
     * @param {string} stage - Error stage (e.g., 'sdk_load_failed', 'login_error')
     * @param {string} message - Error message
     */
    async reportOAuthError(provider, stage, message) {
        try {
            const apiBase = getApiBaseUrl();
            await fetch(`${apiBase}/oauth/report-error`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    provider,
                    stage,
                    message,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) {
            // Silently fail - this is just telemetry
            console.warn('Failed to report OAuth error:', e);
        }
    }

    /**
     * Verify cookies were set after OAuth success
     * Detects third-party cookie blocking (common on iOS Safari)
     */
    async verifyCookiesSet() {
        try {
            const apiBase = getApiBaseUrl();
            const response = await fetch(`${apiBase}/auth/me`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                // Cookies weren't set - likely blocked by browser
                await adminDebugLog('AuthHandlers', 'Cookie verification failed - cookies may be blocked');
                return false;
            }
            return true;
        } catch (error) {
            await adminDebugLog('AuthHandlers', 'Cookie verification error', { error: error.message });
            return false;
        }
    }

    /**
     * Google Credential Response Handler
     * Extracted from index.html handleGoogleCredentialResponse function
     */
    async handleGoogleCredentialResponse(response) {
        try {
            await adminDebugLog('AuthHandlers', 'Google credential response received');

            // Remove fallback overlay if it exists
            const fallbackOverlay = document.getElementById('google-signin-fallback-overlay');
            if (fallbackOverlay) {
                fallbackOverlay.remove();
            }

            // Debug API configuration
            await adminDebugLog('AuthHandlers', 'Current hostname', { hostname: window.location.hostname });
            await adminDebugLog('AuthHandlers', 'window.API_CONFIG', window.API_CONFIG);

            const apiBase = getApiBaseUrl();
            await adminDebugLog('AuthHandlers', 'Using API base', { apiBase });

            const result = await fetch(`${apiBase}/oauth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Include cookies
                body: JSON.stringify({
                    idToken: response.credential
                })
            });

            const data = await result.json();

            if (result.ok) {
                // Verify cookies were actually set (detects third-party cookie blocking)
                const cookiesSet = await this.verifyCookiesSet();
                if (!cookiesSet) {
                    await adminDebugLog('AuthHandlers', 'Cookies blocked by browser');
                    showAuthMessage(
                        'Your browser is blocking cookies required for sign-in. ' +
                        'Please enable cookies for this site or try a different browser.',
                        'warning'
                    );
                    this.reportOAuthError('google', 'cookies_blocked', 'Third-party cookies blocked by browser');
                    return;
                }

                // Check if user needs to complete onboarding (select username)
                if (data.user && data.user.onboardingCompleted === false) {
                    await adminDebugLog('AuthHandlers', 'User needs to complete onboarding (select username)');

                    // Show username selection modal
                    usernameModal.show(data.user, data.csrfToken, async (updatedUser) => {
                        await adminDebugLog('AuthHandlers', 'Onboarding completed successfully');
                    });
                } else {
                    // User already has username, proceed normally
                    await unifiedAuthManager.setAuthenticatedUser(data.user, data.csrfToken);
                    closeAuthModal();

                    // Show welcome message for new users
                    if (data.isNewUser) {
                        showAuthMessage('Welcome to United We Rise! Your account has been created.', 'success');
                    } else {
                        showAuthMessage('Successfully signed in with Google!', 'success');
                    }

                    // unified-manager handles app reinitialization automatically
                }
            } else {
                // Show specific error code if available
                const errorMessage = data.error || 'Google sign-in failed. Please try again.';
                const errorCode = data.code || 'unknown';
                await adminDebugLog('AuthHandlers', 'OAuth error', { error: errorMessage, code: errorCode, errorId: data.errorId });
                showAuthMessage(errorMessage, 'error');
                this.reportOAuthError('google', 'backend_error', `${errorCode}: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Google login error:', error);
            showAuthMessage('Google sign-in failed. Please try again.', 'error');
            this.reportOAuthError('google', 'network_error', error?.message || 'Network error');
        }
    }


    /**
     * Load Google Sign-In SDK
     * Extracted from index.html loadGoogleSignIn function
     */
    async loadGoogleSignIn() {
        return new Promise(async (resolve, reject) => {
            try {
                const currentDomain = window.location.origin;

                await adminDebugLog('AuthHandlers', 'Loading Google Sign-In', {
                    clientId: this.googleClientId,
                    currentDomain,
                    expectedDomain: 'https://www.unitedwerise.org'
                });

                // Check if we're on the authorized domain
                if (currentDomain !== 'https://www.unitedwerise.org') {
                    await adminDebugLog('AuthHandlers', 'Domain mismatch detected', {
                        current: currentDomain,
                        authorized: 'https://www.unitedwerise.org'
                    });
                }

                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = async () => {
                    await adminDebugLog('AuthHandlers', 'Google Sign-In script loaded successfully');

                    // Add debugging for library availability
                    setTimeout(async () => {
                        await adminDebugLog('AuthHandlers', 'Checking Google library', {
                            googleExists: !!window.google,
                            accountsExists: !!window.google?.accounts,
                            idExists: !!window.google?.accounts?.id
                        });

                        if (!window.google?.accounts?.id) {
                            console.error('❌ Google Sign-In library not available after script load');
                            await adminDebugLog('AuthHandlers', 'Library not available - possible causes', {
                                reason1: 'Domain authorization still propagating (wait 15-30 more minutes)',
                                reason2: 'CORS blocking the library (domain not authorized)',
                                reason3: 'Network connectivity issues'
                            });
                            reject(new Error('Google Sign-In library failed to initialize - domain authorization may still be propagating'));
                            return;
                        }

                        try {
                            await adminDebugLog('AuthHandlers', 'Initializing Google Sign-In');
                            google.accounts.id.initialize({
                                client_id: this.googleClientId,
                                callback: this.handleGoogleCredentialResponse.bind(this),
                                auto_select: false,
                                cancel_on_tap_outside: false,
                                use_fedcm_for_prompt: false // Disable FedCM which can cause issues
                            });
                            await adminDebugLog('AuthHandlers', 'Google Sign-In initialized successfully');
                            await adminDebugLog('AuthHandlers', 'You can now test Google OAuth by clicking the Google Sign-In button');
                            resolve();
                        } catch (initError) {
                            console.error('❌ Error initializing Google Sign-In:', initError);
                            reject(initError);
                        }
                    }, 500);
                };
                script.onerror = async (error) => {
                    console.error('❌ Failed to load Google Sign-In script:', error);
                    await adminDebugLog('AuthHandlers', 'CORS blocking detected - unauthorized domain', {
                        solution: 'Wait for Google domain authorization to propagate'
                    });
                    reject(error);
                };
                document.head.appendChild(script);
            } catch (error) {
                console.error('❌ Error in loadGoogleSignIn:', error);
                reject(error);
            }
        });
    }


    /**
     * Toggle password field visibility
     * Extracted from index.html togglePasswordVisibility function
     */
    togglePasswordVisibility(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`Password field not found: ${fieldId}`);
            return;
        }

        const button = field.nextElementSibling;

        if (field.type === 'password') {
            field.type = 'text';
            if (button) button.textContent = '🙈';
        } else {
            field.type = 'password';
            if (button) button.textContent = '👁️';
        }
    }

    /**
     * Fix authentication storage issues
     * Extracted from index.html fixAuthStorageIssues function
     */
    async fixAuthStorageIssues() {
        await adminDebugLog('AuthHandlers', 'Fixing auth storage issues');

        // Clear auth-related localStorage
        localStorage.removeItem('authToken'); // Clear any legacy tokens
        // Note: currentUser localStorage is handled by userState via window.currentUser setter

        // Clear user state via userState (routes to localStorage automatically)
        window.currentUser = null;

        // Reset UI to logged out state
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const userGreeting = document.getElementById('userGreeting');

        if (authSection) authSection.style.display = 'flex';
        if (userSection) userSection.style.display = 'none';
        if (userGreeting) userGreeting.textContent = '';

        await adminDebugLog('AuthHandlers', 'Auth storage cleared. Please refresh the page and log in again');
        return 'Auth storage cleared. Please refresh the page and log in again.';
    }

    /**
     * Test Google domain authorization
     * Debugging utility extracted from index.html
     */
    async testGoogleDomainAuth() {
        await adminDebugLog('AuthHandlers', 'Testing Google domain authorization', {
            currentDomain: window.location.origin,
            timeSinceDomainAdded: '~45-60 minutes'
        });

        try {
            const testResponse = await fetch('https://accounts.google.com/gsi/client', {
                method: 'HEAD',
                mode: 'cors'
            });
            await adminDebugLog('AuthHandlers', 'Google GSI client accessible (CORS allowed)', {
                responseStatus: testResponse.status
            });
        } catch (corsError) {
            await adminDebugLog('AuthHandlers', 'CORS error still present - domain authorization not yet propagated', {
                error: corsError.message
            });
            return false;
        }

        // Try to load and test the library
        try {
            await this.loadGoogleSignIn();
            await adminDebugLog('AuthHandlers', 'Google OAuth is now ready for testing');
            return true;
        } catch (loadError) {
            await adminDebugLog('AuthHandlers', 'Library load failed', { error: loadError.message });
            return false;
        }
    }

    /**
     * Retry Google OAuth setup
     * Debugging utility extracted from index.html
     */
    async retryGoogleOAuth() {
        await adminDebugLog('AuthHandlers', 'Retrying Google OAuth setup');

        const isReady = await this.testGoogleDomainAuth();
        if (isReady) {
            await adminDebugLog('AuthHandlers', 'Google OAuth is ready! Try clicking the Google Sign-In button');
            return true;
        } else {
            await adminDebugLog('AuthHandlers', 'Still waiting for Google domain authorization to propagate. Try again in 15-30 minutes or run: retryGoogleOAuth()');
            return false;
        }
    }

    /**
     * Real-time username availability checking
     * Migrated from index.html line 3741
     */
    async checkUsername(username) {
        if (!username || username.length < 3) {
            this.updateValidationUI('username', null);
            return;
        }

        try {
            const API_BASE = getApiBaseUrl();
            const response = await fetch(`${API_BASE}/auth/check-username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();

            if (data.available) {
                this.updateValidationUI('username', {
                    type: 'success',
                    message: 'Username is available'
                });
            } else {
                this.updateValidationUI('username', {
                    type: 'error',
                    message: 'Username is already taken'
                });
            }
        } catch (error) {
            await adminDebugLog('AuthHandlers', 'Username check failed', { error: error.message });
            this.updateValidationUI('username', null);
        }
    }

    /**
     * Real-time email availability checking
     * Migrated from index.html line 3776
     */
    async checkEmail(email) {
        if (!email || !email.includes('@')) {
            this.updateValidationUI('email', null);
            return;
        }

        try {
            const API_BASE = getApiBaseUrl();
            const response = await fetch(`${API_BASE}/auth/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            if (data.available) {
                this.updateValidationUI('email', {
                    type: 'success',
                    message: 'Email is available'
                });
            } else {
                this.updateValidationUI('email', {
                    type: 'error',
                    message: 'Email is already registered'
                });
            }
        } catch (error) {
            await adminDebugLog('AuthHandlers', 'Email check failed', { error: error.message });
            this.updateValidationUI('email', null);
        }
    }

    /**
     * Update validation UI for username/email fields
     */
    updateValidationUI(fieldType, validation) {
        const statusElement = document.getElementById(`${fieldType}-status`);
        const errorElement = document.getElementById(`${fieldType}-error`);
        const messageElement = document.getElementById(`${fieldType}-message`);

        if (!statusElement || !errorElement || !messageElement) {
            return; // Elements don't exist on this page
        }

        // Hide all first
        statusElement.style.display = 'none';
        errorElement.style.display = 'none';
        messageElement.style.display = 'none';

        if (validation) {
            if (validation.type === 'success') {
                statusElement.style.display = 'block';
                messageElement.innerHTML = `<span style="color: #27ae60;">${escapeHTML(validation.message)}</span>`;
                messageElement.style.display = 'block';
            } else if (validation.type === 'error') {
                errorElement.style.display = 'block';
                messageElement.innerHTML = `<span style="color: #e74c3c;">${escapeHTML(validation.message)}</span>`;
                messageElement.style.display = 'block';
            }
        }
    }

    /**
     * Setup real-time validation for registration form
     * Migrated from index.html DOMContentLoaded handler line 3812
     */
    setupRealtimeValidation() {
        // Username field validation (availability check + format validation)
        const usernameField = document.getElementById('registerUsername');
        if (usernameField) {
            let usernameCheckTimeout;
            usernameField.addEventListener('input', (event) => {
                const value = event.target.value;

                // Real-time format validation (immediate feedback)
                if (typeof validateUsername === 'function') {
                    validateUsername(value);
                }

                // Debounced availability check (API call)
                clearTimeout(usernameCheckTimeout);
                usernameCheckTimeout = setTimeout(() => {
                    this.checkUsername(value);
                }, 500);
            });
        }

        // Email field validation
        const emailField = document.getElementById('registerEmail');
        if (emailField) {
            let emailCheckTimeout;
            emailField.addEventListener('input', (event) => {
                clearTimeout(emailCheckTimeout);
                emailCheckTimeout = setTimeout(() => {
                    this.checkEmail(event.target.value);
                }, 500); // Debounce for 500ms
            });
        }

        // Password field validation (if validation utility exists)
        const passwordField = document.getElementById('registerPassword');
        if (passwordField && typeof validatePassword === 'function') {
            passwordField.addEventListener('input', (event) => {
                validatePassword(event.target.value);
            });
        }
    }
}

// Create and export singleton instance
const authHandlers = new AuthHandlers();

// Maintain backward compatibility by exposing functions globally
if (typeof window !== 'undefined') {
    window.handleGoogleLogin = () => authHandlers.handleGoogleLogin();
    window.handleGoogleCredentialResponse = (response) => authHandlers.handleGoogleCredentialResponse(response);
    window.togglePasswordVisibility = (fieldId) => authHandlers.togglePasswordVisibility(fieldId);
    window.fixAuthStorageIssues = () => authHandlers.fixAuthStorageIssues();
    window.testGoogleDomainAuth = () => authHandlers.testGoogleDomainAuth();
    window.retryGoogleOAuth = () => authHandlers.retryGoogleOAuth();
    window.checkUsername = (username) => authHandlers.checkUsername(username);
    window.checkEmail = (email) => authHandlers.checkEmail(email);
    window.setupRealtimeValidation = () => authHandlers.setupRealtimeValidation();

    // Setup real-time validation when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            authHandlers.setupRealtimeValidation();
        });
    } else {
        // DOM already loaded
        authHandlers.setupRealtimeValidation();
    }
}

export default authHandlers;