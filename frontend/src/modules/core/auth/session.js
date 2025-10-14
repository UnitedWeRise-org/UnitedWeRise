/**
 * @module core/auth/session
 * @description Session management and user verification
 * Extracted from index.html lines 1279-1600
 * 
 * @example
 * import { verifyAndSetUser, logout } from '@/modules/core/auth/session';
 * await verifyAndSetUser();
 */

import { apiClient } from '../api/client.js';
import { userState } from '../state/user.js';
import { unifiedAuthManager } from './unified-manager.js';

/**
 * Verify current user session and set user state
 * Now uses unified authentication manager for perfect synchronization
 */
export async function verifyAndSetUser() {
    try {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('Authentication', 'Verifying user with unified auth manager');
        }
        
        // Use unified auth manager for session verification
        const result = await unifiedAuthManager.verifySession();
        
        if (result.success && result.user?.id) {
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('Authentication', 'Auth verification successful via unified manager', {
                    userId: result.user.id,
                    username: result.user.username
                });
            }
            
            return result.user;
        } else {
            console.warn('Session verification failed:', result.error);
            return null;
        }
    } catch (error) {
        console.error('Auth verification failed:', error);
        return null;
    }
}

/**
 * Set UI to logged-in state
 * Extracted from index.html setUserLoggedIn function
 */
export function setUserLoggedIn(user) {
    // Update global user reference for backward compatibility
    window.currentUser = user;
    
    // Update UI elements
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const notificationSection = document.getElementById('notificationSection');
    const logoutThumb = document.getElementById('logoutThumb');
    
    if (authSection) authSection.style.display = 'none';
    
    if (userSection) {
        userSection.style.display = 'flex';
        const userGreeting = document.getElementById('userGreeting');
        if (userGreeting) {
            const displayName = user.firstName || user.username || 'User';
            userGreeting.textContent = `Hello, ${displayName}!`;
            userGreeting.style.display = 'inline'; // Make the greeting visible
        }
    }
    
    if (notificationSection) notificationSection.style.display = 'block';
    if (logoutThumb) logoutThumb.style.display = 'block';
    
    // Update radio button availability based on user location
    updateRadioButtonAvailability();
    
    // Dispatch events
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { authenticated: true, user } }));

    if (typeof adminDebugLog !== 'undefined') {
        adminDebugLog('Session', 'User logged in', { username: user.username || user.email });
    }
}

/**
 * Set UI to logged-out state
 * Extracted from index.html setUserLoggedOut function
 */
export function setUserLoggedOut() {
    // Clear global user reference
    window.currentUser = null;
    
    // Update UI elements
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const notificationSection = document.getElementById('notificationSection');
    const logoutThumb = document.getElementById('logoutThumb');
    
    if (authSection) authSection.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
    if (notificationSection) notificationSection.style.display = 'none';
    if (logoutThumb) logoutThumb.style.display = 'none';
    
    // Update radio button availability
    updateRadioButtonAvailability();
    
    // Dispatch events
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { authenticated: false, user: null } }));
    
    console.log('🔓 User logged out');
}

/**
 * Update radio button availability based on user location
 * Extracted from index.html updateRadioButtonAvailability function
 */
function updateRadioButtonAvailability() {
    const currentUser = userState.current;
    const stateRadio = document.getElementById('stateRadio');
    const districtRadio = document.getElementById('districtRadio');
    
    if (!currentUser) {
        if (stateRadio) {
            stateRadio.disabled = true;
            stateRadio.title = 'Login required for state view';
        }
        if (districtRadio) {
            districtRadio.disabled = true;
            districtRadio.title = 'Login required for district view';
        }
        return;
    }
    
    // Enable state radio if user has state
    if (stateRadio) {
        const hasState = currentUser.state;
        stateRadio.disabled = !hasState;
        stateRadio.title = hasState ? 'View your state' : 'State not set in profile';
    }
    
    // Enable district radio if user has congressional district
    if (districtRadio) {
        const hasDistrict = currentUser.congressionalDistrict;
        districtRadio.disabled = !hasDistrict;
        districtRadio.title = hasDistrict ? 'View your district' : 'Congressional district not set in profile';
    }
}

/**
 * Logout user and clear session
 * Now uses unified authentication manager for perfect synchronization
 */
export async function logout() {
    try {
        console.log('🔐 Session.js logout function called');
        console.log('🔐 Using unified auth manager for logout');

        // Use unified auth manager for logout
        const result = await unifiedAuthManager.logout();
        console.log('🔍 Unified auth manager result:', result);

        if (result && result.success) {
            console.log('✅ Logout successful via unified manager');
            // CRITICAL: 1000ms delay allows httpOnly cookies to fully clear
            // Browser needs time to: receive response → parse Clear-Cookie → commit to disk → be ready for redirect
            // Too short (<1000ms) = cookies not cleared on redirect = TOTP still valid, user appears logged in
            // Same timing issue as login - cookies need propagation time
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            console.error('Logout failed:', result);
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Redirect anyway for safety (with same delay)
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }
}

/**
 * Refresh user data if incomplete
 * Extracted from index.html refreshUserDataIfNeeded function
 */
export async function refreshUserDataIfNeeded(user) {
    if (!user) return null;
    
    // Check if user data is incomplete (missing key fields)
    const missingFields = [];
    if (!user.firstName && !user.username) missingFields.push('name');
    if (!user.email) missingFields.push('email');
    
    if (missingFields.length === 0) {
        return user; // User data is complete
    }
    
    try {
        console.log(`🔄 Refreshing user data (missing: ${missingFields.join(', ')})`);
        
        const response = await apiClient.call('/users/profile');
        
        if (response.success && response.user) {
            // Update user state with fresh data
            userState.current = response.user;
            return response.user;
        }
    } catch (error) {
        console.error('Failed to refresh user data:', error);
    }
    
    return user; // Return original user if refresh fails
}

// Maintain backward compatibility by exposing functions globally
if (typeof window !== 'undefined') {
    window.verifyAndSetUser = verifyAndSetUser;
    window.setUserLoggedIn = setUserLoggedIn;
    window.setUserLoggedOut = setUserLoggedOut;
    window.logout = logout;
    window.refreshUserDataIfNeeded = refreshUserDataIfNeeded;
}

export default {
    verifyAndSetUser,
    setUserLoggedIn,
    setUserLoggedOut,
    logout,
    refreshUserDataIfNeeded
};