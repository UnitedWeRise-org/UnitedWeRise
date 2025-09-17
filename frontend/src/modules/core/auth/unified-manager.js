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

import { userState } from '../state/user.js';
import { setUserLoggedIn, setUserLoggedOut } from './session.js';

class UnifiedAuthManager {
    constructor() {
        this._subscribers = new Set();
        this._isInitialized = false;
        this._isLoggingOut = false; // Prevent re-auth during logout
        this._currentAuthState = {
            isAuthenticated: false,
            user: null,
            csrfToken: null,
            sessionValid: false
        };

        console.log('🔧 Unified Authentication Manager initialized');
    }

    /**
     * Initialize the unified manager and sync all systems
     */
    async initialize() {
        if (this._isInitialized) return;
        
        console.log('🚀 Initializing unified authentication manager...');
        
        // Sync with existing user state
        this._syncFromExistingSystems();
        
        // Listen for external changes
        this._setupSystemListeners();
        
        this._isInitialized = true;
        console.log('✅ Unified authentication manager ready');
    }

    /**
     * Perform login with COMPLETE system synchronization
     */
    async login(email, password, totpToken = null) {
        console.log('🔐 Unified login starting...');
        
        try {
            // Use the existing API client for consistency
            const loginData = { email, password };
            if (totpToken) loginData.totpToken = totpToken;
            
            const response = await window.apiClient.call('/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });
            
            console.log('🔍 Unified login response:', response);
            
            // Handle TOTP requirement
            if (response.requiresTOTP) {
                console.log('🔐 TOTP required, delegating to unified auth system');
                
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
        console.log('🔄 Setting authenticated state across ALL systems...');
        
        // Update internal state
        this._currentAuthState = {
            isAuthenticated: true,
            user: user,
            csrfToken: csrfToken,
            sessionValid: true
        };
        
        // SYNCHRONIZE ALL SYSTEMS
        await this._syncAllSystems(user, csrfToken);
        
        // Notify all subscribers
        this._notifySubscribers();
        
        // Trigger app reinitialization
        this._triggerAppReinitialization();
        
        console.log('✅ All authentication systems synchronized');
    }

    /**
     * Synchronize authentication state across ALL systems
     */
    async _syncAllSystems(user, csrfToken) {
        console.log('🔧 Synchronizing all authentication systems...');
        
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
            console.log('🔑 CSRF token synchronized globally:', csrfToken.substring(0, 8) + '...');
        }
        
        // 5. Update UI - prefer legacy function if available, fallback to modular
        if (window.setUserLoggedIn && typeof window.setUserLoggedIn === 'function') {
            console.log('🔄 Calling legacy setUserLoggedIn...');
            await window.setUserLoggedIn(user);
        } else {
            console.log('🔄 Calling modular setUserLoggedIn...');
            setUserLoggedIn(user);
        }

        // 7. Dispatch events for other systems
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: true, user, csrfToken }
        }));

        console.log('✅ All systems synchronized with user:', user.username || user.email);
    }

    /**
     * Synchronous version of _syncAllSystems for initialization
     */
    _syncAllSystemsSync(user, csrfToken) {
        console.log('🔧 Synchronizing all authentication systems (sync)...');

        // 1. Update user state module
        if (window.userState) {
            window.userState.current = user;
        }

        // 2. Update legacy global user - THIS IS THE CRITICAL FIX
        window.currentUser = user;

        // 3. Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));

        // 4. Synchronize CSRF tokens everywhere
        if (csrfToken) {
            window.csrfToken = csrfToken;
            if (window.apiClient) {
                window.apiClient.csrfToken = csrfToken;
            }
            console.log('🔑 CSRF token synchronized globally:', csrfToken.substring(0, 8) + '...');
        }

        // 5. Update UI - prefer legacy function if available, fallback to modular
        if (window.setUserLoggedIn && typeof window.setUserLoggedIn === 'function') {
            console.log('🔄 Calling legacy setUserLoggedIn (sync)...');
            window.setUserLoggedIn(user);
        } else {
            console.log('🔄 Calling modular setUserLoggedIn (sync)...');
            setUserLoggedIn(user);
        }

        // 6. Update the local currentUser variable in index.html
        // This is the variable that showMyFeedInMain() checks
        if (window.setCurrentUser && typeof window.setCurrentUser === 'function') {
            console.log('🔧 Unified auth calling setCurrentUser for sync');
            window.setCurrentUser(user);
        } else {
            console.warn('⚠️ window.setCurrentUser function not available during sync');
        }

        // 7. Dispatch events for other systems
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: true, user, csrfToken }
        }));

        console.log('✅ All systems synchronized (sync) with user:', user.username || user.email);
    }

    /**
     * Trigger app reinitialization with proper error handling
     */
    _triggerAppReinitialization() {
        console.log('🔄 Triggering app reinitialization...');
        
        setTimeout(async () => {
            try {
                if (window.initializeApp && typeof window.initializeApp === 'function') {
                    console.log('🚀 Calling initializeApp()...');
                    await window.initializeApp();
                    console.log('✅ App reinitialization completed');
                } else {
                    console.warn('⚠️ initializeApp() function not available');
                }
            } catch (error) {
                console.error('❌ App reinitialization failed:', error);
            }
        }, 1000);
    }

    /**
     * Logout and clear ALL systems
     */
    async logout() {
        console.log('🚪 Unified logout starting...');

        // Set logout flag to prevent re-authentication
        this._isLoggingOut = true;

        // Call backend logout endpoint to clear httpOnly cookies
        try {
            await window.apiClient.call('/auth/logout', {
                method: 'POST'
            });
            console.log('✅ Backend logout endpoint called successfully');
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
        setTimeout(() => {
            this._isLoggingOut = false;
            console.log('🔓 Logout flag cleared, re-authentication allowed');
        }, 2000); // 2 second delay

        console.log('✅ Logout completed across all systems');
        return { success: true };
    }

    /**
     * Missing methods that other systems call
     */
    async setAuthenticatedUser(user, csrfToken = null) {
        console.log('🔧 Setting authenticated user via unified manager...');
        await this._setAuthenticatedState(user, csrfToken || window.csrfToken);
    }

    async verifySession() {
        console.log('🔍 Verifying session via unified manager...');

        // Don't verify session if we're in the middle of logging out
        if (this._isLoggingOut) {
            console.log('🚫 Skipping session verification during logout');
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
        console.log('🧹 Clearing authentication via unified manager...');
        await this.logout();
    }

    /**
     * Clear authentication from ALL systems
     */
    _clearAllSystems() {
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
            console.log('🔄 Calling legacy setUserLoggedOut...');
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
            console.log('🔄 Syncing from existing user session:', existingUser.username || existingUser.email);
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
        }
    }

    /**
     * Setup listeners for external system changes
     */
    _setupSystemListeners() {
        // Listen for user state changes
        if (window.userState && typeof window.userState.subscribe === 'function') {
            window.userState.subscribe((user) => {
                if (this._currentAuthState.user !== user) {
                    console.log('🔄 External user state change detected');
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