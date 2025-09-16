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
                    this._setAuthenticatedState(result.user, result.csrfToken || window.csrfToken);
                    return { success: true, user: result.user };
                } else {
                    return { success: false, error: result.error || 'TOTP authentication failed' };
                }
            }
            
            // Handle successful login
            if ((response.success || response.message === 'Login successful') && response.user) {
                this._setAuthenticatedState(response.user, response.csrfToken);
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
    _setAuthenticatedState(user, csrfToken) {
        console.log('🔄 Setting authenticated state across ALL systems...');
        
        // Update internal state
        this._currentAuthState = {
            isAuthenticated: true,
            user: user,
            csrfToken: csrfToken,
            sessionValid: true
        };
        
        // SYNCHRONIZE ALL SYSTEMS
        this._syncAllSystems(user, csrfToken);
        
        // Notify all subscribers
        this._notifySubscribers();
        
        // Trigger app reinitialization
        this._triggerAppReinitialization();
        
        console.log('✅ All authentication systems synchronized');
    }

    /**
     * Synchronize authentication state across ALL systems
     */
    _syncAllSystems(user, csrfToken) {
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
        
        // 5. Update UI via session manager
        setUserLoggedIn(user);
        
        // 6. Dispatch events for legacy systems
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { authenticated: true, user, csrfToken } 
        }));
        
        console.log('✅ All systems synchronized with user:', user.username || user.email);
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
        
        console.log('✅ Logout completed across all systems');
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