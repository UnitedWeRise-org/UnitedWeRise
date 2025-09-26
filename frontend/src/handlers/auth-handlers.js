/**
 * @module handlers/auth-handlers
 * @description OAuth authentication handlers and utilities
 * Extracted from index.html OAuth-specific functions
 *
 * This module handles:
 * - Google OAuth authentication
 * - Microsoft OAuth authentication
 * - Apple OAuth authentication
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

export class AuthHandlers {
    constructor() {
        this.googleClientId = '496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com';
        this.initialized = false;
        this.setupEventListeners();
        console.log('🔐 AuthHandlers initialized');
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

            if (event.target.matches('[data-auth-microsoft]') ||
                event.target.closest('[data-auth-microsoft]')) {
                event.preventDefault();
                this.handleMicrosoftLogin();
            }

            if (event.target.matches('[data-auth-apple]') ||
                event.target.closest('[data-auth-apple]')) {
                event.preventDefault();
                this.handleAppleLogin();
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
     * Extracted from index.html handleGoogleLogin function
     */
    async handleGoogleLogin() {
        try {
            console.log('🚀 Starting Google Sign-In process...');
            console.log('   Domain:', window.location.origin);

            // Initialize Google Sign-In if not already done
            if (!window.google?.accounts?.id) {
                console.log('📥 Google Sign-In not loaded, attempting to load...');
                try {
                    await this.loadGoogleSignIn();
                    console.log('✅ Google Sign-In loaded successfully');
                } catch (loadError) {
                    console.error('❌ Failed to load Google Sign-In:', loadError.message);

                    if (loadError.message.includes('domain authorization')) {
                        showAuthMessage('Google Sign-In is still initializing. Domain authorization may be propagating. Please try again in 15-30 minutes.', 'warning');
                        console.log('💡 Run testGoogleDomainAuth() to check status');
                    } else {
                        showAuthMessage('Google Sign-In is temporarily unavailable. Please try again later.', 'error');
                    }
                    return;
                }
            }

            console.log('🔧 Creating Google Sign-In button...');

            // Use the One Tap prompt with immediate fallback to button render
            const buttonContainer = document.createElement('div');
            buttonContainer.style.position = 'fixed';
            buttonContainer.style.top = '50%';
            buttonContainer.style.left = '50%';
            buttonContainer.style.transform = 'translate(-50%, -50%)';
            buttonContainer.style.zIndex = '10000';
            buttonContainer.style.display = 'none';
            document.body.appendChild(buttonContainer);

            // Render the Google Sign-In button
            google.accounts.id.renderButton(buttonContainer, {
                type: 'standard',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 250
            });

            console.log('🖱️  Triggering Google Sign-In dialog...');

            // Click the rendered button programmatically
            setTimeout(() => {
                const googleButton = buttonContainer.querySelector('[role="button"]');
                if (googleButton) {
                    console.log('✅ Google Sign-In button found, clicking...');
                    googleButton.click();
                } else {
                    console.error('❌ Google Sign-In button not found in container');
                    showAuthMessage('Google Sign-In button failed to load. Please try again.', 'error');
                }
                // Clean up
                setTimeout(() => {
                    if (document.body.contains(buttonContainer)) {
                        document.body.removeChild(buttonContainer);
                    }
                }, 100);
            }, 100);

        } catch (error) {
            console.error('❌ Google login error:', error);
            showAuthMessage('Google Sign-In encountered an error. Please try again later.', 'error');
        }
    }

    /**
     * Google Credential Response Handler
     * Extracted from index.html handleGoogleCredentialResponse function
     */
    async handleGoogleCredentialResponse(response) {
        try {
            console.log('Google credential response received');

            // Debug API configuration
            console.log('🔧 Debug - Current hostname:', window.location.hostname);
            console.log('🔧 Debug - window.API_CONFIG:', window.API_CONFIG);

            const apiBase = getApiBaseUrl();
            console.log('🔧 Debug - Using API base:', apiBase);

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
                // Store user data and CSRF token (authentication handled by httpOnly cookies)
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.csrfToken = data.csrfToken;

                // Close auth modal and set logged in state
                closeAuthModal();
                if (typeof setUserLoggedIn === 'function') {
                    setUserLoggedIn(data.user);
                }

                // Show welcome message for new users
                if (data.isNewUser) {
                    showAuthMessage('Welcome to United We Rise! Your account has been created.', 'success');
                } else {
                    showAuthMessage('Successfully signed in with Google!', 'success');
                }
            } else {
                showAuthMessage(data.error || 'Google sign-in failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Google login error:', error);
            showAuthMessage('Google sign-in failed. Please try again.', 'error');
        }
    }

    /**
     * Microsoft OAuth Login Handler
     * Extracted from index.html handleMicrosoftLogin function
     */
    async handleMicrosoftLogin() {
        try {
            // For Microsoft, we'll use MSAL.js (Microsoft Authentication Library)
            if (!window.msal) {
                await this.loadMicrosoftAuth();
            }

            const loginRequest = {
                scopes: ['User.Read']
            };

            const response = await window.msalInstance.loginPopup(loginRequest);

            const apiBase = getApiBaseUrl();
            const result = await fetch(`${apiBase}/oauth/microsoft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    accessToken: response.accessToken
                })
            });

            const data = await result.json();

            if (result.ok) {
                // Store user data for UI display (authentication handled by httpOnly cookies)
                localStorage.setItem('currentUser', JSON.stringify(data.user));

                // Close auth modal and set logged in state
                closeAuthModal();
                if (typeof setUserLoggedIn === 'function') {
                    setUserLoggedIn(data.user);
                }

                // Show welcome message
                if (data.isNewUser) {
                    showAuthMessage('Welcome to United We Rise! Your account has been created.', 'success');
                } else {
                    showAuthMessage('Successfully signed in with Microsoft!', 'success');
                }
            } else {
                showAuthMessage(data.error || 'Microsoft sign-in failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Microsoft login error:', error);
            showAuthMessage('Microsoft sign-in failed. Please try again.', 'error');
        }
    }

    /**
     * Apple OAuth Login Handler
     * Extracted from index.html handleAppleLogin function
     */
    async handleAppleLogin() {
        try {
            // For Apple Sign In, we'll use Apple's JS SDK
            if (!window.AppleID) {
                await this.loadAppleSignIn();
            }

            const response = await AppleID.auth.signIn();

            const apiBase = getApiBaseUrl();
            const result = await fetch(`${apiBase}/oauth/apple`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    identityToken: response.authorization.id_token,
                    user: response.user // Only provided on first sign in
                })
            });

            const data = await result.json();

            if (result.ok) {
                // Store user data for UI display (authentication handled by httpOnly cookies)
                localStorage.setItem('currentUser', JSON.stringify(data.user));

                // Close auth modal and set logged in state
                closeAuthModal();
                if (typeof setUserLoggedIn === 'function') {
                    setUserLoggedIn(data.user);
                }

                // Show welcome message
                if (data.isNewUser) {
                    showAuthMessage('Welcome to United We Rise! Your account has been created.', 'success');
                } else {
                    showAuthMessage('Successfully signed in with Apple!', 'success');
                }
            } else {
                showAuthMessage(data.error || 'Apple sign-in failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Apple login error:', error);
            showAuthMessage('Apple sign-in failed. Please try again.', 'error');
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

                console.log('🚀 Loading Google Sign-In...');
                console.log('   Client ID:', this.googleClientId);
                console.log('   Current domain:', currentDomain);
                console.log('   Expected authorized domain: https://www.unitedwerise.org');

                // Check if we're on the authorized domain
                if (currentDomain !== 'https://www.unitedwerise.org') {
                    console.warn('⚠️  Domain mismatch detected!');
                    console.log('   Current:', currentDomain);
                    console.log('   Authorized:', 'https://www.unitedwerise.org');
                }

                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    console.log('✅ Google Sign-In script loaded successfully');

                    // Add debugging for library availability
                    setTimeout(() => {
                        console.log('🔍 Checking Google library...');
                        console.log('   window.google exists:', !!window.google);
                        console.log('   window.google.accounts exists:', !!window.google?.accounts);
                        console.log('   window.google.accounts.id exists:', !!window.google?.accounts?.id);

                        if (!window.google?.accounts?.id) {
                            console.error('❌ Google Sign-In library not available after script load');
                            console.log('💡 This usually means:');
                            console.log('   1. Domain authorization still propagating (wait 15-30 more minutes)');
                            console.log('   2. CORS blocking the library (domain not authorized)');
                            console.log('   3. Network connectivity issues');
                            reject(new Error('Google Sign-In library failed to initialize - domain authorization may still be propagating'));
                            return;
                        }

                        try {
                            console.log('🔧 Initializing Google Sign-In...');
                            google.accounts.id.initialize({
                                client_id: this.googleClientId,
                                callback: this.handleGoogleCredentialResponse.bind(this),
                                auto_select: false,
                                cancel_on_tap_outside: false,
                                use_fedcm_for_prompt: false // Disable FedCM which can cause issues
                            });
                            console.log('✅ Google Sign-In initialized successfully');
                            console.log('💡 You can now test Google OAuth by clicking the Google Sign-In button');
                            resolve();
                        } catch (initError) {
                            console.error('❌ Error initializing Google Sign-In:', initError);
                            reject(initError);
                        }
                    }, 500);
                };
                script.onerror = (error) => {
                    console.error('❌ Failed to load Google Sign-In script:', error);
                    console.log('💡 This usually indicates CORS blocking due to unauthorized domain');
                    console.log('   Solution: Wait for Google domain authorization to propagate');
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
     * Load Microsoft Authentication SDK
     * Extracted from index.html loadMicrosoftAuth function
     */
    async loadMicrosoftAuth() {
        return new Promise(async (resolve, reject) => {
            try {
                // Fetch OAuth configuration from backend
                const apiBase = getApiBaseUrl();
                const configResponse = await fetch(`${apiBase}/oauth/config`);
                const config = await configResponse.json();

                if (!config.microsoft.enabled) {
                    throw new Error('Microsoft OAuth is not configured');
                }

                const script = document.createElement('script');
                script.src = 'https://alcdn.msauth.net/browser/2.38.1/js/msal-browser.min.js';
                script.onload = () => {
                    const msalConfig = {
                        auth: {
                            clientId: config.microsoft.clientId,
                            authority: 'https://login.microsoftonline.com/common'
                        }
                    };
                    window.msalInstance = new msal.PublicClientApplication(msalConfig);
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Load Apple Sign-In SDK
     * Extracted from index.html loadAppleSignIn function
     */
    async loadAppleSignIn() {
        return new Promise(async (resolve, reject) => {
            try {
                // Fetch OAuth configuration from backend
                const apiBase = getApiBaseUrl();
                const configResponse = await fetch(`${apiBase}/oauth/config`);
                const config = await configResponse.json();

                if (!config.apple.enabled) {
                    throw new Error('Apple OAuth is not configured');
                }

                const script = document.createElement('script');
                script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
                script.onload = () => {
                    AppleID.auth.init({
                        clientId: config.apple.clientId,
                        scope: 'name email',
                        redirectURI: window.location.origin + '/apple-callback',
                        state: 'signin',
                        usePopup: true
                    });
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            } catch (error) {
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
    fixAuthStorageIssues() {
        console.log('🔧 Fixing auth storage issues...');

        // Clear auth-related localStorage
        localStorage.removeItem('authToken'); // Clear any legacy tokens
        localStorage.removeItem('currentUser');

        // Reset global user variables
        if (typeof window.currentUser !== 'undefined') {
            window.currentUser = null;
        }

        // Reset UI to logged out state
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const userGreeting = document.getElementById('userGreeting');

        if (authSection) authSection.style.display = 'flex';
        if (userSection) userSection.style.display = 'none';
        if (userGreeting) userGreeting.textContent = '';

        console.log('✅ Auth storage cleared. Please refresh the page and log in again.');
        return 'Auth storage cleared. Please refresh the page and log in again.';
    }

    /**
     * Test Google domain authorization
     * Debugging utility extracted from index.html
     */
    async testGoogleDomainAuth() {
        console.log('🔍 Testing Google domain authorization...');
        console.log('   Current domain:', window.location.origin);
        console.log('   Time since domain added: ~45-60 minutes');

        try {
            const testResponse = await fetch('https://accounts.google.com/gsi/client', {
                method: 'HEAD',
                mode: 'cors'
            });
            console.log('✅ Google GSI client accessible (CORS allowed)');
            console.log('   Response status:', testResponse.status);
        } catch (corsError) {
            console.log('❌ CORS error still present:', corsError.message);
            console.log('💡 Domain authorization not yet propagated');
            return false;
        }

        // Try to load and test the library
        try {
            await this.loadGoogleSignIn();
            console.log('🎉 Google OAuth is now ready for testing!');
            return true;
        } catch (loadError) {
            console.log('❌ Library load failed:', loadError.message);
            return false;
        }
    }

    /**
     * Retry Google OAuth setup
     * Debugging utility extracted from index.html
     */
    async retryGoogleOAuth() {
        console.log('🔄 Retrying Google OAuth setup...');

        const isReady = await this.testGoogleDomainAuth();
        if (isReady) {
            console.log('✅ Google OAuth is ready! Try clicking the Google Sign-In button.');
            return true;
        } else {
            console.log('⏳ Still waiting for Google domain authorization to propagate...');
            console.log('💡 Try again in 15-30 minutes or run: retryGoogleOAuth()');
            return false;
        }
    }
}

// Create and export singleton instance
const authHandlers = new AuthHandlers();

// Maintain backward compatibility by exposing functions globally
if (typeof window !== 'undefined') {
    window.handleGoogleLogin = () => authHandlers.handleGoogleLogin();
    window.handleGoogleCredentialResponse = (response) => authHandlers.handleGoogleCredentialResponse(response);
    window.handleMicrosoftLogin = () => authHandlers.handleMicrosoftLogin();
    window.handleAppleLogin = () => authHandlers.handleAppleLogin();
    window.togglePasswordVisibility = (fieldId) => authHandlers.togglePasswordVisibility(fieldId);
    window.fixAuthStorageIssues = () => authHandlers.fixAuthStorageIssues();
    window.testGoogleDomainAuth = () => authHandlers.testGoogleDomainAuth();
    window.retryGoogleOAuth = () => authHandlers.retryGoogleOAuth();
}

export default authHandlers;