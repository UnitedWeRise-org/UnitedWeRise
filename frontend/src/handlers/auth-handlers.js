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
                    console.error('❌ Failed to load Google Sign-In:', loadError);

                    // Handle both Error objects and Event objects from script loading failures
                    const errorMessage = loadError?.message || loadError?.type || 'Unknown error';
                    if (errorMessage.includes('domain authorization')) {
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
                // Use unified auth manager for perfect state synchronization
                await unifiedAuthManager.setAuthenticatedUser(data.user, data.csrfToken);
                closeAuthModal();

                // Show welcome message for new users
                if (data.isNewUser) {
                    showAuthMessage('Welcome to United We Rise! Your account has been created.', 'success');
                } else {
                    showAuthMessage('Successfully signed in with Google!', 'success');
                }

                // unified-manager handles app reinitialization automatically
            } else {
                showAuthMessage(data.error || 'Google sign-in failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Google login error:', error);
            showAuthMessage('Google sign-in failed. Please try again.', 'error');
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
            console.log('Username check failed:', error);
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
            console.log('Email check failed:', error);
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
                messageElement.innerHTML = `<span style="color: #27ae60;">${validation.message}</span>`;
                messageElement.style.display = 'block';
            } else if (validation.type === 'error') {
                errorElement.style.display = 'block';
                messageElement.innerHTML = `<span style="color: #e74c3c;">${validation.message}</span>`;
                messageElement.style.display = 'block';
            }
        }
    }

    /**
     * Setup real-time validation for registration form
     * Migrated from index.html DOMContentLoaded handler line 3812
     */
    setupRealtimeValidation() {
        // Username field validation
        const usernameField = document.getElementById('registerUsername');
        if (usernameField) {
            let usernameCheckTimeout;
            usernameField.addEventListener('input', (event) => {
                clearTimeout(usernameCheckTimeout);
                usernameCheckTimeout = setTimeout(() => {
                    this.checkUsername(event.target.value);
                }, 500); // Debounce for 500ms
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