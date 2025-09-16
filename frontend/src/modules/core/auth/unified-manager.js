/**
 * @module core/auth/unified-manager
 * @description Unified Authentication State Manager - ensures perfect synchronization
 * across all authentication systems in the application
 * 
 * This is the SINGLE source of truth for authentication state that ALL systems
 * must use to prevent the ping-pong between different broken states.
 * 
 * @example
 * import { unifiedAuthManager } from '@/modules/core/auth/unified-manager';
 * 
 * // Login
 * await unifiedAuthManager.login(email, password);
 * 
 * // Check auth status
 * if (unifiedAuthManager.isAuthenticated) {
 *   console.log('User:', unifiedAuthManager.user);
 * }
 * 
 * // Subscribe to auth changes
 * unifiedAuthManager.subscribe((authState) => {
 *   console.log('Auth changed:', authState);
 * });
 */

import { apiClient } from '../api/client.js';
import { userState } from '../state/user.js';

/**
 * Unified Authentication Manager Class
 * Centralizes all authentication operations and state management
 */
class UnifiedAuthManager {
    constructor() {
        this._user = null;
        this._isAuthenticated = false;
        this._csrfToken = null;
        this._listeners = new Set();
        this._initialized = false;
        
        // Bind methods to prevent context issues
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
        this.setAuthenticatedUser = this.setAuthenticatedUser.bind(this);
        this.clearAuthentication = this.clearAuthentication.bind(this);
        this.syncWithAllSystems = this.syncWithAllSystems.bind(this);
        
        this._initialize();
    }

    /**
     * Initialize the manager and sync with existing state
     * @private
     */
    _initialize() {
        console.log('🔧 UnifiedAuthManager: Initializing...');
        
        // Load from localStorage if available
        try {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                this._user = user;
                this._isAuthenticated = true;
                window.currentUser = user; // Ensure global state
            }
        } catch (error) {
            console.error('Failed to load stored user:', error);
            localStorage.removeItem('currentUser'); // Clear corrupted data
        }
        
        // Sync CSRF token from multiple sources
        this._csrfToken = window.csrfToken || apiClient.csrfToken || null;
        
        // Sync with userState if it exists
        if (userState.current && !this._user) {
            this._user = userState.current;
            this._isAuthenticated = true;
        }
        
        this._initialized = true;
        console.log('✅ UnifiedAuthManager: Initialized with user:', this._user?.username || 'none');
    }

    /**
     * Get current user
     * @returns {Object|null}
     */
    get user() {
        return this._user;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    get isAuthenticated() {
        return this._isAuthenticated && this._user !== null;
    }

    /**
     * Get current CSRF token
     * @returns {string|null}
     */
    get csrfToken() {
        return this._csrfToken;
    }

    /**
     * Subscribe to authentication state changes
     * @param {Function} callback - Function to call when auth state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this._listeners.add(callback);
        
        // Immediately call with current state
        callback({
            user: this._user,
            isAuthenticated: this._isAuthenticated,
            csrfToken: this._csrfToken
        });
        
        return () => this._listeners.delete(callback);
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    _notifyListeners() {
        const authState = {
            user: this._user,
            isAuthenticated: this._isAuthenticated,
            csrfToken: this._csrfToken
        };
        
        this._listeners.forEach(callback => {
            try {
                callback(authState);
            } catch (error) {
                console.error('Auth listener error:', error);
            }
        });
    }

    /**
     * Set authenticated user and sync with ALL systems
     * @param {Object} user - User object
     * @param {string} csrfToken - CSRF token from login response
     */
    setAuthenticatedUser(user, csrfToken = null) {
        console.log('🔧 UnifiedAuthManager: Setting authenticated user:', user.username || user.email);
        
        // Update internal state
        this._user = user;
        this._isAuthenticated = true;
        
        // Update CSRF token if provided
        if (csrfToken) {
            this._csrfToken = csrfToken;
        }
        
        // Sync with ALL systems immediately
        this.syncWithAllSystems();
        
        // Notify listeners
        this._notifyListeners();
        
        console.log('✅ UnifiedAuthManager: User authentication synchronized across all systems');
    }

    /**
     * Clear authentication and sync with ALL systems
     */
    clearAuthentication() {
        console.log('🔧 UnifiedAuthManager: Clearing authentication');
        
        // Update internal state
        this._user = null;
        this._isAuthenticated = false;
        this._csrfToken = null;
        
        // Sync with ALL systems immediately
        this.syncWithAllSystems();
        
        // Notify listeners
        this._notifyListeners();
        
        console.log('✅ UnifiedAuthManager: Authentication cleared across all systems');
    }

    /**
     * Synchronize authentication state with ALL systems in the application
     * This is the CRITICAL function that ensures perfect synchronization
     */
    syncWithAllSystems() {
        console.log('🔄 UnifiedAuthManager: Synchronizing with all systems...');
        
        try {
            // 1. Sync with global window state (for backward compatibility)
            window.currentUser = this._user;
            
            // 2. Sync CSRF tokens everywhere
            if (this._csrfToken) {
                window.csrfToken = this._csrfToken;
                if (apiClient) {
                    apiClient.csrfToken = this._csrfToken;
                }
                if (window.apiClient) {
                    window.apiClient.csrfToken = this._csrfToken;
                }
            }
            
            // 3. Sync with userState module
            if (userState) {
                userState.current = this._user;
            }
            
            // 4. Sync with localStorage
            if (this._user) {
                localStorage.setItem('currentUser', JSON.stringify(this._user));
            } else {
                localStorage.removeItem('currentUser');
            }
            
            // 5. Update UI elements directly
            this._updateUIElements();
            
            // 6. Dispatch events for any listening systems
            this._dispatchEvents();
            
            // 7. Trigger app reinitialization if needed
            if (this._isAuthenticated && this._user) {
                setTimeout(() => this._triggerAppReinitialization(), 100);
            }
            
            console.log('✅ UnifiedAuthManager: System synchronization complete');
            
        } catch (error) {
            console.error('❌ UnifiedAuthManager: Error during system sync:', error);
        }
    }

    /**
     * Update UI elements based on authentication state
     * @private
     */
    _updateUIElements() {
        console.log('🔧 UnifiedAuthManager: Updating UI elements...');
        
        try {
            const authSection = document.getElementById('authSection');
            const userSection = document.getElementById('userSection');
            const userGreeting = document.getElementById('userGreeting');
            const notificationSection = document.getElementById('notificationSection');
            const logoutThumb = document.getElementById('logoutThumb');
            
            if (this._isAuthenticated && this._user) {
                // Show authenticated UI
                if (authSection) authSection.style.display = 'none';
                if (userSection) userSection.style.display = 'flex';
                if (notificationSection) notificationSection.style.display = 'block';
                if (logoutThumb) logoutThumb.style.display = 'block';
                
                // Update greeting
                if (userGreeting) {
                    const displayName = this._user.firstName || this._user.username || 'User';
                    userGreeting.textContent = `Hello, ${displayName}!`;
                }
                
                // Show user-specific sidebar options
                const sidebarElements = ['messagesThumb', 'organizingThumb', 'profileThumb', 'feedThumb'];
                sidebarElements.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.style.display = 'block';
                });
                
            } else {
                // Show unauthenticated UI
                if (authSection) authSection.style.display = 'block';
                if (userSection) userSection.style.display = 'none';
                if (notificationSection) notificationSection.style.display = 'none';
                if (logoutThumb) logoutThumb.style.display = 'none';
                
                // Clear greeting
                if (userGreeting) userGreeting.textContent = '';
                
                // Hide user-specific sidebar options
                const sidebarElements = ['messagesThumb', 'organizingThumb', 'profileThumb', 'feedThumb'];
                sidebarElements.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.style.display = 'none';
                });
            }
            
            console.log('✅ UnifiedAuthManager: UI elements updated');
            
        } catch (error) {
            console.error('❌ UnifiedAuthManager: Error updating UI:', error);
        }
    }

    /**
     * Dispatch authentication events for listening systems
     * @private
     */
    _dispatchEvents() {
        try {
            if (this._isAuthenticated && this._user) {
                // Authenticated events
                window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                    detail: { user: this._user } 
                }));
                window.dispatchEvent(new CustomEvent('authStateChanged', { 
                    detail: { authenticated: true, user: this._user } 
                }));
                window.dispatchEvent(new CustomEvent('userStateChanged', { 
                    detail: { user: this._user } 
                }));
            } else {
                // Unauthenticated events
                window.dispatchEvent(new CustomEvent('userLoggedOut'));
                window.dispatchEvent(new CustomEvent('authStateChanged', { 
                    detail: { authenticated: false, user: null } 
                }));
                window.dispatchEvent(new CustomEvent('userStateChanged', { 
                    detail: { user: null } 
                }));
            }
        } catch (error) {
            console.error('❌ UnifiedAuthManager: Error dispatching events:', error);
        }
    }

    /**
     * Trigger app reinitialization after login
     * @private
     */
    _triggerAppReinitialization() {
        console.log('🔄 UnifiedAuthManager: Triggering app reinitialization...');
        
        try {
            // Call app initialization if available
            if (typeof window.initializeApp === 'function') {
                console.log('📱 Calling window.initializeApp()...');
                window.initializeApp();
            }
            
            // Initialize My Feed if available
            if (typeof window.showMyFeedInMain === 'function') {
                console.log('📱 Calling window.showMyFeedInMain()...');
                setTimeout(() => window.showMyFeedInMain(), 200);
            }
            
            // Update radio button availability
            if (typeof window.updateRadioButtonAvailability === 'function') {
                window.updateRadioButtonAvailability();
            }
            
            console.log('✅ UnifiedAuthManager: App reinitialization triggered');
            
        } catch (error) {
            console.error('❌ UnifiedAuthManager: Error during app reinitialization:', error);
        }
    }

    /**
     * Enhanced login method with perfect synchronization
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} totpCode - TOTP code (optional)
     * @returns {Promise<Object>} Login result
     */
    async login(email, password, totpCode = null) {
        console.log('🔐 UnifiedAuthManager: Starting login process...');
        
        try {
            const payload = { email, password };
            if (totpCode) {
                payload.totpCode = totpCode;
            }
            
            const response = await apiClient.call('/auth/login', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            console.log('📡 UnifiedAuthManager: Login response:', response);
            
            if (response.success && response.user) {
                // Successful login
                this.setAuthenticatedUser(response.user, response.csrfToken);
                
                return {
                    success: true,
                    user: response.user,
                    requiresTOTP: false
                };
                
            } else if (response.requiresTOTP) {
                // TOTP required
                return {
                    success: false,
                    requiresTOTP: true,
                    tempSession: response.tempSession
                };
                
            } else {
                // Login failed
                return {
                    success: false,
                    error: response.message || 'Login failed',
                    requiresTOTP: false
                };
            }
            
        } catch (error) {
            console.error('❌ UnifiedAuthManager: Login error:', error);
            return {
                success: false,
                error: error.message || 'Login failed',
                requiresTOTP: false
            };
        }
    }

    /**
     * Enhanced logout method with perfect synchronization
     * @returns {Promise<Object>} Logout result
     */
    async logout() {
        console.log('🔐 UnifiedAuthManager: Starting logout process...');
        
        try {
            // Call logout endpoint to clear server session
            await apiClient.call('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with client-side logout even if server fails
        }
        
        // Clear authentication state
        this.clearAuthentication();
        
        return { success: true };
    }

    /**
     * Verify current session and sync user data
     * @returns {Promise<Object>} Verification result
     */
    async verifySession() {
        console.log('🔐 UnifiedAuthManager: Verifying session...');
        
        try {
            const response = await apiClient.call('/auth/me');
            
            if (response.success && response.user?.id) {
                this.setAuthenticatedUser(response.user, response.csrfToken);
                return { success: true, user: response.user };
            } else {
                this.clearAuthentication();
                return { success: false, error: 'Invalid session' };
            }
            
        } catch (error) {
            console.error('❌ UnifiedAuthManager: Session verification failed:', error);
            this.clearAuthentication();
            return { success: false, error: error.message };
        }
    }

    /**
     * Refresh user data without re-authentication
     * @returns {Promise<Object>} Refresh result
     */
    async refreshUserData() {
        if (!this._isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }
        
        try {
            const response = await apiClient.call('/users/profile');
            
            if (response.success && response.user) {
                this.setAuthenticatedUser(response.user, this._csrfToken);
                return { success: true, user: response.user };
            } else {
                return { success: false, error: 'Failed to refresh user data' };
            }
            
        } catch (error) {
            console.error('❌ UnifiedAuthManager: User data refresh failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Initialize the manager after page load
     */
    async initializeAfterPageLoad() {
        if (this._initialized) {
            // If we have stored user data, verify the session
            if (this._user) {
                console.log('🔄 UnifiedAuthManager: Verifying stored session...');
                await this.verifySession();
            }
            
            // Sync with all systems one final time
            this.syncWithAllSystems();
        }
    }
}

// Create singleton instance
export const unifiedAuthManager = new UnifiedAuthManager();

// Make globally available for debugging and backward compatibility
if (typeof window !== 'undefined') {
    window.unifiedAuthManager = unifiedAuthManager;
    
    // Enhanced global login function
    window.unifiedLogin = async (email, password, context = 'main-site', totpCode = null) => {
        return await unifiedAuthManager.login(email, password, totpCode);
    };
    
    // Enhanced global logout function
    window.unifiedLogout = async () => {
        const result = await unifiedAuthManager.logout();
        if (result.success) {
            // Redirect to home page
            window.location.href = '/';
        }
        return result;
    };
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => unifiedAuthManager.initializeAfterPageLoad(), 100);
    });
} else {
    setTimeout(() => unifiedAuthManager.initializeAfterPageLoad(), 100);
}

export default unifiedAuthManager;