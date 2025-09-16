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

/**
 * Verify current user session and set user state
 * Extracted from index.html line 1279
 */
export async function verifyAndSetUser() {
    try {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('Authentication', 'Verifying user with /auth/me');
        }
        
        const response = await apiClient.call('/auth/me');
        
        if (response.success && response.user?.id) {
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('Authentication', 'Auth verification successful', {
                    userId: response.user.id,
                    username: response.user.username
                });
            }
            
            // Set user state
            userState.current = response.user;
            setUserLoggedIn(response.user);
            
            return response.user;
        } else {
            console.warn('Invalid user data received:', response);
            // Clear invalid session
            userState.current = null;
            setUserLoggedOut();
            return null;
        }
    } catch (error) {
        console.error('Auth verification failed:', error);
        userState.current = null;
        setUserLoggedOut();
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
        }
    }
    
    if (notificationSection) notificationSection.style.display = 'block';
    if (logoutThumb) logoutThumb.style.display = 'block';
    
    // Update radio button availability based on user location
    updateRadioButtonAvailability();
    
    // Dispatch events
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { authenticated: true, user } }));
    
    console.log('✅ User logged in:', user.username || user.email);
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
 * Extracted from index.html logout function
 */
export async function logout() {
    try {
        // Call logout endpoint to clear server session
        await apiClient.call('/auth/logout', { method: 'POST' });
        
        console.log('✅ Logout successful');
    } catch (error) {
        console.error('Logout request failed:', error);
        // Continue with client-side logout even if server fails
    } finally {
        // Clear client-side state regardless of server response
        userState.current = null;
        setUserLoggedOut();
        
        // Redirect to home page
        window.location.href = '/';
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