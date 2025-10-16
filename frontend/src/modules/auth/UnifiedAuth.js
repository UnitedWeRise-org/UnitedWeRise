/**
 * @module auth/UnifiedAuth
 * @description Unified Authentication System for United We Rise (Layer 1 of 3)
 *
 * Handles login/logout for both main site and admin dashboard with TOTP support.
 * Part of 3-layer complementary auth architecture:
 *   - Layer 1 (this): UnifiedAuth.js - Auth flows and UI
 *   - Layer 2: critical-functions.js - Backward-compatible globals (window.setCurrentUser, window.apiCall)
 *   - Layer 3: unified-manager.js - State synchronization coordinator
 *
 * Migration from legacy js/unifiedAuth.js completed September 2025.
 * Enterprise-grade modular authentication system.
 */

import { getApiBaseUrl } from '../../utils/environment.js';

class UnifiedAuth {
    constructor() {
        this.BACKEND_URL = this.getBackendUrl();

        // Bind methods to preserve context
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
        this.showTOTPModal = this.showTOTPModal.bind(this);
        this.hasValidTOTPSession = this.hasValidTOTPSession.bind(this);
        this.clearTOTPSession = this.clearTOTPSession.bind(this);
    }

    /**
     * Get backend URL with proper environment detection
     */
    getBackendUrl() {
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            return window.API_CONFIG.BASE_URL.replace(/\/api$/, '');
        }

        // Use centralized environment detection from ES6 module
        return getApiBaseUrl().replace(/\/api$/, '');
    }

    /**
     * Show TOTP verification modal
     * @param {string} context - 'main-site' or 'admin-dashboard'
     * @returns {Promise<string>} - Resolves with verification token
     */
    showTOTPModal(context = 'main-site') {
        return new Promise((resolve, reject) => {
            // Remove existing modal
            const existingModal = document.querySelector('.totp-unified-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'totp-unified-modal';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 999999 !important;
                font-family: Arial, sans-serif !important;
            `;

            const modalTitle = context === 'admin-dashboard'
                ? '🔒 Admin Access Verification'
                : '🔒 Two-Factor Authentication';

            const modalDescription = context === 'admin-dashboard'
                ? 'Enter your 6-digit authenticator code to access admin features:'
                : 'Enter your 6-digit authenticator code to complete login:';

            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <h3 style="margin: 0 0 20px 0; color: #333;">${modalTitle}</h3>
                    <p style="color: #666; margin-bottom: 20px;">${modalDescription}</p>
                    <input type="text" id="unifiedTotpCode" placeholder="000000" maxlength="6"
                           style="width: 100%; padding: 15px; font-size: 24px; text-align: center; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 20px; letter-spacing: 0.3em;">
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="unifiedVerifyTotpBtn"
                                style="background: #4b5c09; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            Verify & Continue
                        </button>
                        <button id="unifiedCancelTotpBtn"
                                style="background: #ccc; color: #333; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                    <p style="font-size: 12px; color: #888; margin-top: 15px;">This verification is required for security.</p>
                </div>
            `;

            document.body.appendChild(modal);

            const input = document.getElementById('unifiedTotpCode');
            const verifyBtn = document.getElementById('unifiedVerifyTotpBtn');
            const cancelBtn = document.getElementById('unifiedCancelTotpBtn');

            // Handle cancel button
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                reject(new Error('User cancelled TOTP verification'));
            });

            // Enforce numeric-only input
            input.addEventListener('input', () => {
                input.value = input.value.replace(/[^0-9]/g, '');

                // Auto-submit on 6 digits
                if (input.value.length === 6) {
                    verifyBtn.click();
                }
            });

            input.focus();

            verifyBtn.onclick = async () => {
                const code = input.value;
                if (code.length !== 6) {
                    alert('Please enter a 6-digit code');
                    return;
                }

                // Simply return the TOTP code - verification happens in login retry
                modal.remove();

                if (typeof adminDebugLog !== 'undefined') {
                    await adminDebugLog('UnifiedAuth', `TOTP code entered for ${context} - will verify via login endpoint`);
                }

                resolve(code);
            };

            // Allow Enter key to submit
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && input.value.length === 6) {
                    verifyBtn.click();
                }
            });
        });
    }

    /**
     * Unified login function that handles both main site and admin dashboard authentication
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} context - 'main-site' or 'admin-dashboard'
     * @param {string} totpSessionToken - Optional existing TOTP session token
     * @returns {Promise<Object>} - Login result with user data and tokens
     */
    async login(email, password, context = 'main-site', totpSessionToken = null) {
        try {
            if (typeof adminDebugLog !== 'undefined') {
                await adminDebugLog('UnifiedAuth', `Starting unified login for ${context}`);
            }

            // TOTP session tokens now handled by secure httpOnly cookies automatically
            // No need to manually include TOTP tokens - server will read from cookies

            // Initial login attempt
            const loginData = { email, password };

            const response = await fetch(`${this.BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // CRITICAL: Include cookies
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (typeof adminDebugSensitive !== 'undefined') {
                await adminDebugSensitive('UnifiedAuth', 'Login response', result);
            }

            // If TOTP is required
            if (result.requiresTOTP) {
                if (typeof adminDebugLog !== 'undefined') {
                    await adminDebugLog('UnifiedAuth', 'TOTP verification required');
                }

                // Show TOTP modal and get user's 6-digit code
                const verificationToken = await this.showTOTPModal(context);

                // Retry login with TOTP token
                const totpLoginResponse = await fetch(`${this.BACKEND_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // CRITICAL: Include cookies
                    body: JSON.stringify({
                        email,
                        password,
                        totpToken: verificationToken
                    })
                });

                const totpResult = await totpLoginResponse.json();

                if (typeof adminDebugSensitive !== 'undefined') {
                    await adminDebugSensitive('UnifiedAuth', 'TOTP login response', totpResult);
                }

                if (totpLoginResponse.ok && !totpResult.requiresTOTP) {
                    // Store CSRF token and user data only
                    window.csrfToken = totpResult.csrfToken;
                    localStorage.setItem('currentUser', JSON.stringify(totpResult.user));
                    window.currentUser = totpResult.user; // Sync with unified-manager state

                    // TOTP tokens now stored in secure httpOnly cookies (no localStorage needed)
                    // Token is now in httpOnly cookie

                    if (typeof adminDebugLog !== 'undefined') {
                        await adminDebugLog('UnifiedAuth', `Unified login successful for ${context} with TOTP`);
                    }

                    return {
                        success: true,
                        user: totpResult.user,
                        totpSessionToken: totpResult.totpSessionToken,
                        totpVerified: true
                    };
                } else {
                    // Check if TOTP is still required (invalid code)
                    if (totpResult.requiresTOTP) {
                        throw new Error('Invalid TOTP code. Please try again.');
                    } else {
                        throw new Error(totpResult.error || 'TOTP login failed');
                    }
                }
            }

            // Regular login (no TOTP required)
            if (response.ok) {
                // Store CSRF token and user data only
                window.csrfToken = result.csrfToken;
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                window.currentUser = result.user; // Sync with unified-manager state

                // Token is now in httpOnly cookie
                if (typeof adminDebugLog !== 'undefined') {
                    await adminDebugLog('UnifiedAuth', `Unified login successful for ${context} (no TOTP)`);
                }

                return {
                    success: true,
                    user: result.user
                };
            } else {
                throw new Error(result.error || 'Login failed');
            }

        } catch (error) {
            if (typeof adminDebugError !== 'undefined') {
                await adminDebugError('UnifiedAuth', 'Unified login error', error);
            }

            return {
                success: false,
                error: error.message || 'Login failed'
            };
        }
    }

    /**
     * Check if user has valid TOTP session for context
     * @param {string} context - 'main-site' or 'admin-dashboard'
     * @returns {boolean} - True if valid TOTP session exists
     */
    hasValidTOTPSession(context = 'main-site') {
        // TOTP tokens are now in secure httpOnly cookies - cannot check client-side
        // Instead, make API call to verify TOTP status or rely on server responses
        console.log('TOTP session status now handled by secure httpOnly cookies');
        return true; // Assume valid - server will reject if expired
    }

    /**
     * Clear TOTP session for context
     * @param {string} context - 'main-site' or 'admin-dashboard'
     */
    clearTOTPSession(context = 'main-site') {
        // TOTP tokens are now in secure httpOnly cookies - cleared server-side via logout
        console.log(`TOTP session cleared for ${context} via server-side cookie clearing`);
    }

    /**
     * Unified logout function
     * @param {string} context - 'main-site' or 'admin-dashboard'
     */
    async logout(context = 'main-site') {
        try {
            // Call logout endpoint to clear cookies - WAIT for it to complete
            const response = await fetch(`${this.BACKEND_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': window.csrfToken || '' // Empty string if undefined
                }
            });

            if (!response.ok) {
                console.warn('Logout endpoint returned error:', response.status);
            }
        } catch (error) {
            console.warn('Logout endpoint call failed:', error);
            // Continue with local cleanup even if API call fails
        }

        // Clear local data
        localStorage.removeItem('currentUser');
        window.csrfToken = null;
        window.currentUser = null;

        // Clear TOTP sessions for both contexts
        this.clearTOTPSession('main-site');
        this.clearTOTPSession('admin-dashboard');

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('UnifiedAuth', `Unified logout completed for ${context}`);
        }

        // Redirect based on context
        if (context === 'admin-dashboard') {
            window.location.href = '/admin-dashboard.html';
        } else {
            window.location.href = '/';
        }
    }
}

// Create singleton instance
const unifiedAuth = new UnifiedAuth();

// Export for ES6 modules
export default unifiedAuth;
export { unifiedAuth as UnifiedAuth };

// Also export individual functions for backward compatibility
export const unifiedLogin = unifiedAuth.login;
export const unifiedLogout = unifiedAuth.logout;
export const showTOTPModal = unifiedAuth.showTOTPModal;
export const hasValidTOTPSession = unifiedAuth.hasValidTOTPSession;
export const clearTOTPSession = unifiedAuth.clearTOTPSession;

// Global access for legacy code during migration
if (typeof window !== 'undefined') {
    window.unifiedAuth = unifiedAuth;
    window.unifiedLogin = unifiedAuth.login;
    window.unifiedLogout = unifiedAuth.logout;
    window.showTOTPModal = unifiedAuth.showTOTPModal;
    window.hasValidTOTPSession = unifiedAuth.hasValidTOTPSession;
    window.clearTOTPSession = unifiedAuth.clearTOTPSession;
}
