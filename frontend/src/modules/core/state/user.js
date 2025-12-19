/**
 * @module core/state/user
 * @description Global user state management
 * Provides reactive user state with subscription support
 * 
 * @example
 * import { userState } from '@/modules/core/state/user';
 * 
 * // Get current user
 * const user = userState.current;
 * 
 * // Subscribe to changes
 * const unsubscribe = userState.subscribe((user) => {
 *   console.log('User changed:', user);
 * });
 */

/**
 * User state management class
 */
class UserState {
    constructor() {
        this._currentUser = null;
        this._listeners = new Set();
        this._initialized = false;
        
        // Load from localStorage if available
        this._loadFromStorage();
    }

    /**
     * Get current user
     * @returns {Object|null} Current user object or null
     */
    get current() {
        return this._currentUser;
    }

    /**
     * Set current user and notify listeners
     * @param {Object|null} user - User object or null for logout
     */
    set current(user) {
        const previousUser = this._currentUser;
        this._currentUser = user;

        // Save to localStorage
        this._saveToStorage();

        // Note: window.currentUser is now a getter that reads from userState.current
        // No need to set it directly - the getter handles backward compatibility

        // Notify listeners if user changed
        if (JSON.stringify(previousUser) !== JSON.stringify(user)) {
            this._notifyListeners();
            this._dispatchEvent(user);
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    get isAuthenticated() {
        return this._currentUser !== null && this._currentUser.id !== undefined;
    }

    /**
     * Check if user is admin
     * @returns {boolean}
     */
    get isAdmin() {
        return this._currentUser?.role === 'admin' || this._currentUser?.isAdmin === true;
    }

    /**
     * Check if user is verified
     * @returns {boolean}
     */
    get isVerified() {
        return this._currentUser?.verificationStatus === 'verified';
    }

    /**
     * Subscribe to user state changes
     * @param {Function} callback - Function to call when user changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this._listeners.add(callback);
        
        // Immediately call with current user
        callback(this._currentUser);
        
        // Return unsubscribe function
        return () => this._listeners.delete(callback);
    }

    /**
     * Update specific user properties
     * @param {Object} updates - Properties to update
     */
    update(updates) {
        if (!this._currentUser) return;
        
        this.current = {
            ...this._currentUser,
            ...updates
        };
    }

    /**
     * Clear user state (logout)
     */
    clear() {
        this.current = null;
    }

    /**
     * Refresh user data from server
     * @returns {Promise<Object|null>}
     */
    async refresh() {
        if (!this.isAuthenticated) return null;
        
        try {
            // Dynamic import to avoid circular dependency
            const { apiClient } = await import('../api/client.js');
            const response = await apiClient.call('/auth/me');
            
            if (response.success && response.user) {
                this.current = response.user;
                return response.user;
            }
        } catch (error) {
            console.error('Failed to refresh user data:', error);
        }
        
        return null;
    }

    /**
     * Load user from localStorage
     * @private
     */
    _loadFromStorage() {
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                // Don't trigger listeners on initial load
                this._currentUser = user;
                // Note: window.currentUser is now a getter - no need to set directly
            }
        } catch (error) {
            console.error('Failed to load user from storage:', error);
        }
    }

    /**
     * Save user to localStorage
     * @private
     */
    _saveToStorage() {
        try {
            if (this._currentUser) {
                localStorage.setItem('currentUser', JSON.stringify(this._currentUser));
            } else {
                localStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.error('Failed to save user to storage:', error);
        }
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    _notifyListeners() {
        this._listeners.forEach(callback => {
            try {
                callback(this._currentUser);
            } catch (error) {
                console.error('User state listener error:', error);
            }
        });
    }

    /**
     * Dispatch custom event for user state change
     * @private
     */
    _dispatchEvent(user) {
        const event = new CustomEvent('userStateChanged', {
            detail: { user }
        });
        window.dispatchEvent(event);
        
        // Also dispatch legacy event for backward compatibility
        if (user) {
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        } else {
            window.dispatchEvent(new CustomEvent('userLoggedOut'));
        }
    }

    /**
     * Get user display name
     */
    getDisplayName() {
        if (!this._currentUser) return 'Guest';
        
        return this._currentUser.firstName || 
               this._currentUser.username || 
               this._currentUser.email?.split('@')[0] || 
               'User';
    }

    /**
     * Get user avatar URL
     */
    getAvatarUrl() {
        if (!this._currentUser) return null;
        
        return this._currentUser.profileImageUrl || 
               this._currentUser.avatarUrl || 
               null;
    }

    /**
     * Check if user has permission
     * @param {string} permission - Permission to check
     * @returns {boolean}
     */
    hasPermission(permission) {
        if (!this._currentUser) return false;
        
        // Admin has all permissions
        if (this.isAdmin) return true;
        
        // Check specific permissions
        const permissions = this._currentUser.permissions || [];
        return permissions.includes(permission);
    }

    /**
     * Get user's location info
     */
    getLocation() {
        if (!this._currentUser) return null;
        
        return {
            city: this._currentUser.city,
            state: this._currentUser.state,
            zipCode: this._currentUser.zipCode,
            congressionalDistrict: this._currentUser.congressionalDistrict,
            stateDistrict: this._currentUser.stateDistrict,
            coordinates: this._currentUser.coordinates
        };
    }
}

// Create singleton instance
export const userState = new UserState();

// Maintain backward compatibility
if (typeof window !== 'undefined') {
    window.userState = userState;
}

/**
 * Define window.currentUser as a getter/setter that routes through userState.
 * This prevents bypassing the coordinator by directly setting window.currentUser.
 *
 * Call this early in app initialization to enforce single source of truth.
 *
 * @example
 * import { enforceCurrentUserGetter } from './modules/core/state/user.js';
 * enforceCurrentUserGetter();
 */
export function enforceCurrentUserGetter() {
    if (typeof window === 'undefined') return;

    // Only define if not already defined as getter
    const descriptor = Object.getOwnPropertyDescriptor(window, 'currentUser');
    if (descriptor && descriptor.get) return; // Already a getter

    // Store any existing value before redefining
    const existingValue = window.currentUser;

    Object.defineProperty(window, 'currentUser', {
        get: () => window.userState?.current,
        set: (value) => {
            if (value === null || value === undefined) {
                // Logout - route through userState
                if (window.userState) {
                    window.userState.clear();
                }
            } else if (value && typeof value === 'object') {
                // Login/update - route through userState
                if (window.userState) {
                    window.userState.current = value;
                }
            }
        },
        configurable: true,
        enumerable: true
    });

    // Restore existing value through the new setter (which routes to userState)
    if (existingValue && typeof existingValue === 'object') {
        window.currentUser = existingValue;
    }

    console.log('✅ window.currentUser getter/setter enforced - all access routes through userState');
}

export default userState;