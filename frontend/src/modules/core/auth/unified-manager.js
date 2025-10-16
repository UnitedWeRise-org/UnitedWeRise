/**
 * @module core/auth/unified-manager
 * @description UNIFIED AUTHENTICATION MANAGER - Single source of truth for all auth systems
 *
 * This module ensures ALL authentication systems stay perfectly synchronized:
 * - Modular login system (modal.js)
 * - Legacy UI system (index.html)
 * - User state system (user.js)
 * - API client system (client.js)
 * - App initialization system (app-initialization.js)
 *
 * @example
 * import { unifiedAuthManager } from './unified-manager.js';
 *
 * // Login with perfect synchronization
 * await unifiedAuthManager.login(email, password);
 *
 * // Subscribe to auth changes
 * unifiedAuthManager.subscribe((authState) => {
 *   console.log('Auth state changed:', authState);
 * });
 */

import { adminDebugLog } from '../../../../js/adminDebugger.js';
import { userState } from '../state/user.js';
import { setUserLoggedIn, setUserLoggedOut } from './session.js';

class UnifiedAuthManager {
    constructor() {
        this._subscribers = new Set();
        this._isInitialized = false;
        this._isLoggingOut = false; // Prevent re-auth during logout
        this._tokenRefreshInterval = null; // Token refresh interval (14-min)
        this._lastTokenRefresh = null;
        this._currentAuthState = {
            isAuthenticated: false,
            user: null,
            csrfToken: null,
            sessionValid: false
        };

        // Note: constructor cannot be async, so we don't await here
        adminDebugLog('UnifiedAuthManager', 'Unified Authentication Manager initialized');
    }

    /**
     * Initialize the unified manager and sync all systems
     */
    async initialize() {
        if (this._isInitialized) return;

        await adminDebugLog('UnifiedAuthManager', 'Initializing unified authentication manager...');

        // Sync with existing user state
        this._syncFromExistingSystems();

        // Listen for external changes
        this._setupSystemListeners();

        this._isInitialized = true;
        await adminDebugLog('UnifiedAuthManager', 'Unified authentication manager ready');
    }

    /**
     * Refresh authentication token to prevent Azure 30-minute timeout
     * Called every 14 minutes to maintain session with dual redundancy (14, 28, 42...)
     */
    async refreshToken() {
        // Skip if tab is hidden (browser throttles background tabs)
        if (document.hidden) {
            console.log('⏸️ Token refresh skipped (tab hidden)');
            return;
        }

        // Skip if not authenticated
        if (!this.isAuthenticated()) {
            console.log('⏸️ Token refresh skipped (not authenticated)');
            return;
        }

        // Skip if logging out
        if (this._isLoggingOut) {
            console.log('⏸️ Token refresh skipped (logout in progress)');
            return;
        }

        const maxRetries = 3;
        const retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempting token refresh (${attempt + 1}/${maxRetries})...`);

                const response = await window.apiClient.call('/auth/refresh', {
                    method: 'POST'
                });

                if (response.success || response.csrfToken) {
                    // Update CSRF token if provided
                    if (response.csrfToken) {
                        window.csrfToken = response.csrfToken;
                        if (window.apiClient) {
                            window.apiClient.csrfToken = response.csrfToken;
                        }
                        this._currentAuthState.csrfToken = response.csrfToken;
                    }

                    this._lastTokenRefresh = new Date();
                    console.log(`✅ Token refreshed successfully (attempt ${attempt + 1})`);
                    return;
                } else {
                    console.warn(`⚠️ Token refresh failed with response (attempt ${attempt + 1}/${maxRetries}):`, response);
                }
            } catch (error) {
                console.warn(`⚠️ Token refresh failed (attempt ${attempt + 1}/${maxRetries}):`, error);
            }

            // Wait before retry (unless this was the last attempt)
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            }
        }

        console.error('❌ All token refresh attempts failed - session may expire');
    }

    /**
     * Start token refresh interval (called when user becomes authenticated)
     */
    _startTokenRefresh() {
        // Clear any existing interval first
        if (this._tokenRefreshInterval) {
            clearInterval(this._tokenRefreshInterval);
        }

        // Set up token refresh every 14 minutes
        this._tokenRefreshInterval = setInterval(() => {
            this.refreshToken();
        }, 14 * 60 * 1000); // 14 minutes in milliseconds

        console.log('✅ Token auto-refresh started (14-minute interval)');
    }

    /**
     * Stop token refresh interval (called when user logs out)
     */
    _stopTokenRefresh() {
        if (this._tokenRefreshInterval) {
            clearInterval(this._tokenRefreshInterval);
            this._tokenRefreshInterval = null;
            console.log('⏹️ Token auto-refresh stopped');
        }
    }

    /**
     * Perform login with COMPLETE system synchronization
     */
    async login(email, password, totpToken = null) {
        await adminDebugLog('UnifiedAuthManager', 'Unified login starting...');

        try {
            // Use the existing API client for consistency
            const loginData = { email, password };
            if (totpToken) loginData.totpToken = totpToken;

            const response = await window.apiClient.call('/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });

            await adminDebugLog('UnifiedAuthManager', 'Unified login response', response);

            // Handle TOTP requirement
            if (response.requiresTOTP) {
                await adminDebugLog('UnifiedAuthManager', 'TOTP required, delegating to unified auth system');

                // Use the existing unifiedLogin for TOTP handling
                const result = await window.unifiedLogin(email, password, 'main-site');
                if (result.success) {
                    await this._setAuthenticatedState(result.user, result.csrfToken || window.csrfToken);
                    return { success: true, user: result.user };
                } else {
                    return { success: false, error: result.error || 'TOTP authentication failed' };
                }
            }

            // Handle successful login
            if ((response.success || response.message === 'Login successful') && response.user) {
                await this._setAuthenticatedState(response.user, response.csrfToken);
                return { success: true, user: response.user };
            } else {
                return { success: false, error: response.message || 'Login failed' };
            }

        } catch (error) {
            console.error('❌ Unified login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set authenticated state and sync ALL systems
     */
    async _setAuthenticatedState(user, csrfToken) {
        // Update internal state (silent during normal login)
        this._currentAuthState = {
            isAuthenticated: true,
            user: user,
            csrfToken: csrfToken,
            sessionValid: true
        };

        // SYNCHRONIZE ALL SYSTEMS
        await this._syncAllSystems(user, csrfToken);

        // Start token auto-refresh to prevent 30-minute timeout
        this._startTokenRefresh();

        // Notify all subscribers
        this._notifySubscribers();

        // Trigger app reinitialization
        this._triggerAppReinitialization();
    }

    /**
     * Synchronize authentication state across ALL systems
     */
    async _syncAllSystems(user, csrfToken) {
        // Synchronize all systems (silent during normal login)

        // 1. Update user state module
        if (window.userState) {
            window.userState.current = user;
        }

        // 2. Update legacy global user
        window.currentUser = user;

        // 3. Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));

        // 4. Synchronize CSRF tokens everywhere
        if (csrfToken) {
            window.csrfToken = csrfToken;
            if (window.apiClient) {
                window.apiClient.csrfToken = csrfToken;
            }
        }

        // 5. Update UI - prefer legacy function if available, fallback to modular
        if (window.setUserLoggedIn && typeof window.setUserLoggedIn === 'function') {
            await window.setUserLoggedIn(user);
        } else {
            setUserLoggedIn(user);
        }

        // 7. Dispatch events for other systems
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: true, user, csrfToken }
        }));
    }

    /**
     * Synchronous version of _syncAllSystems for initialization
     */
    _syncAllSystemsSync(user, csrfToken) {
        // Synchronize all systems during initialization (silent during normal operation)

        // 1. Update user state module
        if (window.userState) {
            window.userState.current = user;
        }

        // 2. Update legacy global user - THIS IS THE CRITICAL FIX
        window.currentUser = user;

        // DIAGNOSTIC: Show what's actually in window.currentUser (including admin flags)
        console.log('🔍 UnifiedAuthManager: window.currentUser set', {
            username: user?.username || user?.email,
            hasIsAdmin: !!user?.isAdmin,
            hasIsSuperAdmin: !!user?.isSuperAdmin,
            isAdminValue: user?.isAdmin,
            isSuperAdminValue: user?.isSuperAdmin,
            allKeys: Object.keys(user || {})
        });

        // CRITICAL FIX: Clear admin verification cache so adminDebugLog re-checks with new user
        if (window.adminDebugger && typeof window.adminDebugger.clearCache === 'function') {
            window.adminDebugger.clearCache();
            console.log('✅ Admin verification cache cleared - will re-check with new user data');
        }

        // 3. Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));

        // 4. Synchronize CSRF tokens everywhere
        if (csrfToken) {
            window.csrfToken = csrfToken;
            if (window.apiClient) {
                window.apiClient.csrfToken = csrfToken;
            }
        }

        // 5. Update UI - prefer legacy function if available, fallback to modular
        if (window.setUserLoggedIn && typeof window.setUserLoggedIn === 'function') {
            window.setUserLoggedIn(user);
        } else {
            setUserLoggedIn(user);
        }

        // 6. Update the local currentUser variable in index.html
        // This is the variable that showMyFeedInMain() checks
        if (window.setCurrentUser && typeof window.setCurrentUser === 'function') {
            window.setCurrentUser(user);
        } else {
            console.warn('⚠️ window.setCurrentUser function not available during sync');
        }

        // 7. Dispatch events for other systems
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: true, user, csrfToken }
        }));
    }

    /**
     * Show post-login loading overlay
     */
    _showPostLoginLoading() {
        const overlay = document.getElementById('post-login-loading-overlay');
        if (!overlay) {
            // Create post-login loading overlay if it doesn't exist
            const postLoginOverlay = document.createElement('div');
            postLoginOverlay.id = 'post-login-loading-overlay';
            postLoginOverlay.className = 'post-login-loading-overlay';
            postLoginOverlay.innerHTML = `
                <div class="post-login-loading-content">
                    <div class="post-login-loading-spinner"></div>
                    <p class="post-login-loading-text">Loading your content...</p>
                </div>
            `;
            document.body.appendChild(postLoginOverlay);
        }

        const newOverlay = document.getElementById('post-login-loading-overlay');
        if (newOverlay) {
            newOverlay.style.display = 'flex';
            // Use setTimeout to ensure the element is rendered before applying the show class
            setTimeout(() => {
                newOverlay.classList.add('show');
            }, 10);
        }
    }

    /**
     * Hide post-login loading overlay
     */
    _hidePostLoginLoading() {
        const overlay = document.getElementById('post-login-loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            // Wait for transition to complete before hiding
            setTimeout(() => {
                overlay.style.display = 'none'; // Clear inline style that overrides CSS
                overlay.classList.add('hidden');
            }, 300);
        }
    }

    /**
     * Trigger app reinitialization with proper error handling
     */
    _triggerAppReinitialization() {
        // Trigger app reinitialization after login (silent during normal operation)

        // Show post-login loading immediately
        this._showPostLoginLoading();

        setTimeout(async () => {
            try {
                if (window.initializeApp && typeof window.initializeApp === 'function') {
                    await window.initializeApp();
                } else {
                    console.warn('⚠️ initializeApp() function not available');
                }

                // Trigger onboarding check after app initialization completes
                if (this._currentAuthState.isAuthenticated && this._currentAuthState.user) {
                    // Dispatch event to trigger onboarding check
                    window.dispatchEvent(new CustomEvent('appInitializationComplete', {
                        detail: { user: this._currentAuthState.user }
                    }));
                }
            } catch (error) {
                console.error('❌ App reinitialization failed:', error);
            } finally {
                // Hide post-login loading after app initialization
                this._hidePostLoginLoading();
            }
        }, 1000);
    }

    /**
     * Logout and clear ALL systems
     */
    async logout() {
        await adminDebugLog('UnifiedAuthManager', 'Unified logout starting...');

        // Set logout flag to prevent re-authentication
        this._isLoggingOut = true;

        // Stop token auto-refresh
        this._stopTokenRefresh();

        // Call backend logout endpoint to clear httpOnly cookies
        try {
            await window.apiClient.call('/auth/logout', {
                method: 'POST'
            });
            await adminDebugLog('UnifiedAuthManager', 'Backend logout endpoint called successfully');
        } catch (error) {
            console.warn('⚠️ Backend logout endpoint failed:', error);
            // Continue with frontend logout even if backend fails
        }

        // Update internal state
        this._currentAuthState = {
            isAuthenticated: false,
            user: null,
            csrfToken: null,
            sessionValid: false
        };

        // Clear all systems
        this._clearAllSystems();

        // Notify subscribers
        this._notifySubscribers();

        // Reset logout flag after a delay
        setTimeout(async () => {
            this._isLoggingOut = false;
            await adminDebugLog('UnifiedAuthManager', 'Logout flag cleared, re-authentication allowed');
        }, 2000); // 2 second delay

        await adminDebugLog('UnifiedAuthManager', 'Logout completed across all systems');
        return { success: true };
    }

    /**
     * Missing methods that other systems call
     */
    async setAuthenticatedUser(user, csrfToken = null) {
        await adminDebugLog('UnifiedAuthManager', 'Setting authenticated user via unified manager...');
        await this._setAuthenticatedState(user, csrfToken || window.csrfToken);
    }

    async verifySession() {
        await adminDebugLog('UnifiedAuthManager', 'Verifying session via unified manager...');

        // Don't verify session if we're in the middle of logging out
        if (this._isLoggingOut) {
            await adminDebugLog('UnifiedAuthManager', 'Skipping session verification during logout');
            return { success: false, error: 'Logout in progress' };
        }

        try {
            if (!window.apiCall) {
                return { success: false, error: 'API not available' };
            }

            const response = await window.apiCall('/auth/me');
            if (response.ok && response.data) {
                return { success: true, user: response.data };
            }
            return { success: false, error: 'No user session' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async clearAuthentication() {
        await adminDebugLog('UnifiedAuthManager', 'Clearing authentication via unified manager...');
        await this.logout();
    }

    /**
     * Clear authentication from ALL systems
     */
    _clearAllSystems() {
        // Stop token auto-refresh (safety measure in case called directly)
        this._stopTokenRefresh();

        // Clear user state module
        if (window.userState) {
            window.userState.current = null;
        }

        // Clear legacy global user
        window.currentUser = null;

        // Clear localStorage
        localStorage.removeItem('currentUser');

        // Call legacy setUserLoggedOut if available
        if (window.setUserLoggedOut && typeof window.setUserLoggedOut === 'function') {
            adminDebugLog('UnifiedAuthManager', 'Calling legacy setUserLoggedOut...');
            window.setUserLoggedOut();
        }

        // Clear CSRF tokens
        window.csrfToken = null;
        if (window.apiClient) {
            window.apiClient.csrfToken = null;
        }

        // Update UI
        setUserLoggedOut();

        // Dispatch events
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: false, user: null }
        }));
    }

    /**
     * Subscribe to authentication state changes
     */
    subscribe(callback) {
        this._subscribers.add(callback);
        
        // Immediately call with current state
        callback(this._currentAuthState);
        
        // Return unsubscribe function
        return () => this._subscribers.delete(callback);
    }

    /**
     * Get current authentication state
     */
    getAuthState() {
        return { ...this._currentAuthState };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this._currentAuthState.isAuthenticated;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this._currentAuthState.user;
    }

    /**
     * Sync from existing systems on initialization
     */
    _syncFromExistingSystems() {
        // Check if user is already logged in
        const existingUser = window.currentUser ||
                           (window.userState && window.userState.current) ||
                           (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null);

        const existingToken = window.csrfToken ||
                            (window.apiClient && window.apiClient.csrfToken);

        if (existingUser) {
            adminDebugLog('UnifiedAuthManager', 'Syncing from existing user session', existingUser.username || existingUser.email);
            this._currentAuthState = {
                isAuthenticated: true,
                user: existingUser,
                csrfToken: existingToken,
                sessionValid: true
            };

            // CRITICAL: Sync this user to ALL systems, including legacy
            // Note: Can't await here since _syncFromExistingSystems is not async
            // But we need to sync immediately to prevent race conditions
            this._syncAllSystemsSync(existingUser, existingToken);

            // Start token auto-refresh for existing sessions
            this._startTokenRefresh();
        }
    }

    /**
     * Setup listeners for external system changes
     */
    _setupSystemListeners() {
        // Listen for user state changes
        if (window.userState && typeof window.userState.subscribe === 'function') {
            // Flag to ignore the immediate callback from subscribe()
            // The subscribe() method fires immediately with current value,
            // but we've already synced in _syncFromExistingSystems()
            let isFirstCall = true;

            window.userState.subscribe((user) => {
                // Skip the immediate callback to prevent false logout during initialization
                if (isFirstCall) {
                    isFirstCall = false;
                    adminDebugLog('UnifiedAuthManager', 'Ignoring initial userState callback (already synced)');
                    return;
                }

                if (this._currentAuthState.user !== user) {
                    adminDebugLog('UnifiedAuthManager', 'External user state change detected');
                    if (user) {
                        this._currentAuthState.user = user;
                        this._currentAuthState.isAuthenticated = true;
                    } else {
                        this._currentAuthState.user = null;
                        this._currentAuthState.isAuthenticated = false;
                    }
                    this._notifySubscribers();
                }
            });
        }
    }

    /**
     * Notify all subscribers of state changes
     */
    _notifySubscribers() {
        this._subscribers.forEach(callback => {
            try {
                callback(this._currentAuthState);
            } catch (error) {
                console.error('❌ Unified auth subscriber error:', error);
            }
        });
    }
}

// Create singleton instance
export const unifiedAuthManager = new UnifiedAuthManager();

// Maintain backward compatibility
if (typeof window !== 'undefined') {
    window.unifiedAuthManager = unifiedAuthManager;
    
    // Initialize automatically
    unifiedAuthManager.initialize();
}

export default unifiedAuthManager;