// Optimized Application Initialization for United We Rise
// Reduces API calls on page load and implements smart caching
// Now integrated with unified authentication manager for perfect sync

import { adminDebugLog } from '../../js/adminDebugger.js';
import { isProduction } from '../utils/environment.js';

class AppInitializer {
    // Production logging helper - only shows important messages
    static log(message, dataOrType = 'info', typeOverride = null) {
        // Determine if second arg is data object or type string
        const isDataObject = typeof dataOrType === 'object' && dataOrType !== null;
        const type = typeOverride || (isDataObject ? 'info' : dataOrType);
        const data = isDataObject ? dataOrType : null;

        if (type === 'error') {
            console.error(message, ...(data ? [data] : [])); // Always show errors
        } else if (type === 'warn') {
            console.warn(message, ...(data ? [data] : [])); // Always show warnings
        } else if (!isProduction()) {
            // Use regular console.log in development - needs to show BEFORE auth completes
            // (adminDebugLog requires admin verification which creates circular dependency)
            console.log(`[AppInitializer] ${message}`, ...(data ? [data] : []));
        }
    }
    constructor() {
        this.initializationPromise = null;
        this.isInitialized = false;
        this.userData = null;
        this.unifiedAuthManager = null;
        
        // Import unified auth manager dynamically to avoid circular dependencies
        this.initUnifiedAuthManager();
    }
    
    async initUnifiedAuthManager() {
        try {
            const { unifiedAuthManager } = await import('../modules/core/auth/unified-manager.js');
            this.unifiedAuthManager = unifiedAuthManager;
            AppInitializer.log('🔧 AppInitializer: Connected to unified auth manager');
        } catch (error) {
            console.error('Failed to load unified auth manager:', error);
        }
    }

    // Main initialization method - called once on page load
    async initialize() {
        // Prevent multiple simultaneous initializations
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    async performInitialization() {
        // Display version information for deployment tracking
        this.displayVersionInfo();
        
        AppInitializer.log('🚀 Starting optimized app initialization...');
        
        // Declare storedUser at function scope to avoid scoping issues
        const storedUser = localStorage.getItem('currentUser');

        // OPTIMIZATION: Early exit for logged-out users
        // If no cached user exists, skip all authenticated API calls
        // This prevents 3 unnecessary 401s on every page load for logged-out users
        if (!storedUser) {
            AppInitializer.log('🔓 No cached user - skipping authenticated API calls');
            this.setLoggedOutState();
            this.isInitialized = true;
            return { authenticated: false, reason: 'no_cached_user' };
        }

        try {
            // Step 1: Check for existing user data (httpOnly cookies handle authentication automatically)
            
            // If we have a stored user, restore it to window.currentUser for UI state
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    window.currentUser = parsedUser;
                    this.userData = parsedUser;
                    AppInitializer.log('📱 Restored user from localStorage for UI state');
                } catch (e) {
                    AppInitializer.log('⚠️ Failed to parse stored user data', e);
                    localStorage.removeItem('currentUser');
                }
            }

            // Step 2: Authentication is now handled via httpOnly cookies
            // No localStorage token needed - proceed directly to API call

            // Step 3: Try batch initialization to verify authentication and get fresh data
            AppInitializer.log('🔄 Fetching initialization data...');
            
            try {
                AppInitializer.log('🔄 About to call /batch/initialize with cookie authentication...');
                const initData = await window.apiClient.call('/batch/initialize', {
                    cacheTimeout: 60000, // Cache for 1 minute
                    retries: 1 // Only retry once to avoid cascading failures
                });
                AppInitializer.log('🔄 Received response from /batch/initialize:', {
                    hasInitData: !!initData,
                    hasSuccess: !!initData?.success,
                    hasData: !!initData?.data,
                    hasUser: !!initData?.data?.user,
                    error: initData?.error || 'none'
                });

                // API client returns raw data format: {success: true, data: {...}}
                if (initData && initData.success && initData.data) {
                    AppInitializer.log('✅ Batch initialization successful');

                    // Store fresh user data
                    this.userData = initData.data.user;
                    
                    // Use unified auth manager to set user data if available
                    if (this.unifiedAuthManager) {
                        AppInitializer.log('🔧 Setting user via unified auth manager');
                        this.unifiedAuthManager.setAuthenticatedUser(this.userData, initData.data.csrfToken);
                    } else {
                        // Fallback to direct setting
                        localStorage.setItem('currentUser', JSON.stringify(this.userData));
                        window.currentUser = this.userData;
                    }

                    // CACHE RELATIONSHIPS FOR ENTIRE SESSION - NO MORE INDIVIDUAL API CALLS!
                    if (initData.data.relationships) {
                        window.userRelationships = initData.data.relationships;
                        localStorage.setItem('userRelationships', JSON.stringify(window.userRelationships));
                        AppInitializer.log('✅ Cached user relationships:', {
                            friends: window.userRelationships.friends?.length || 0,
                            following: window.userRelationships.following?.length || 0,
                            followers: window.userRelationships.followers?.length || 0
                        });
                    }

                    // Set logged in state with all data
                    this.setLoggedInState(initData.data);

                    this.isInitialized = true;
                    return {
                        authenticated: true,
                        userData: this.userData,
                        initData: initData.data
                    };
                } else {
                    // Log why batch failed
                    AppInitializer.log('❌ Batch response structure issue:', {
                        hasInitData: !!initData,
                        hasSuccess: !!initData?.success,
                        hasData: !!initData?.data,
                        errorMessage: initData?.error
                    }, 'warn');

                    // If we got a response but it's not successful, throw an error to trigger fallback
                    if (initData && !initData.success) {
                        const error = new Error(initData.error || 'Batch initialization failed');
                        throw error;
                    }
                }
            } catch (batchError) {
                AppInitializer.log('📱 Batch endpoint error details:', {
                    message: batchError.message,
                    status: batchError.status,
                    code: batchError.code,
                    type: typeof batchError
                }, 'warn');
                
                // If it's a 401, this might be normal (user not logged in)
                if (batchError.message?.includes('401') || batchError.status === 401) {
                    AppInitializer.log('🔒 No authentication cookies found - user not logged in');
                    // Only clear auth state if we expected to be authenticated (had stored user data)
                    if (storedUser) {
                        AppInitializer.log('⚠️ Had stored user but no valid session - clearing stale data');
                        this.clearAuthAndSetLoggedOut();
                    }
                    return { authenticated: false, reason: 'not_authenticated' };
                }
                
                // For other errors (network, 500, etc), use cached data
                // OPTIMIZATION: Removed fallback cascade to /auth/me and /users/profile
                // If batch fails for non-auth reasons and we have cached user, use cached data
                AppInitializer.log('💾 Batch failed, checking for cached data...');

                // Use cached data if available
                if (storedUser) {
                    AppInitializer.log('📱 Using cached user data as final fallback', 'warn');
                    try {
                        const userData = JSON.parse(storedUser);
                        window.currentUser = userData;
                        this.setLoggedInState({ user: userData });
                        this.isInitialized = true;
                        return { authenticated: true, userData: userData, cached: true };
                    } catch (parseError) {
                        console.error('Failed to parse cached user data:', parseError);
                    }
                }
            }

        } catch (error) {
            console.error('💥 Outer initialization error:', error);
            
            // DON'T log out user for network/server errors - just use cached data
            if (storedUser) {
                AppInitializer.log('💾 Using cached user data due to server issues', 'warn');
                try {
                    const userData = JSON.parse(storedUser);
                    window.currentUser = userData;
                    this.setLoggedInState({ user: userData });
                    this.isInitialized = true;
                    return { authenticated: true, userData: userData, cached: true };
                } catch (parseError) {
                    console.error('Failed to parse cached user data:', parseError);
                }
            }
            
            // Only log out if we have no cached data AND confirmed token is invalid
            AppInitializer.log('🚫 No cached data available and server unreachable', 'error');
            return { authenticated: false, error: error.message };
        }
    }

    // Set the UI to logged in state with batch data
    setLoggedInState(initData) {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('AppInit', 'setLoggedInState called - checking user data');
        }
        const user = initData.user;
        if (typeof adminDebugSensitive !== 'undefined') {
            adminDebugSensitive('AppInit', 'User data details', user);
        }
        AppInitializer.log('🔍 setLoggedInState called with user:', user?.firstName || user?.username || 'Unknown');
        
        // Update UI elements
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('userSection').style.display = 'flex';
        
        // Set greeting
        const displayName = user.firstName || user.username || 'User';
        const greetingElement = document.getElementById('userGreeting');
        if (greetingElement) {
            greetingElement.textContent = `Hello, ${displayName}!`;
            greetingElement.style.display = 'inline';
        }
        
        // Show user-specific sidebar options
        const sidebarElements = ['messagesThumb', 'organizingThumb', 'profileThumb', 'feedThumb', 'logoutThumb'];
        sidebarElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'block';
        });

        // If we have profile data, update UI with address info
        if (initData.profile?.address) {
            this.updateAddressInfo(initData.profile);
        }

        // Update notification count if available
        if (typeof initData.unreadNotifications === 'number') {
            this.updateNotificationCount(initData.unreadNotifications);
        }

        // Initialize My Feed automatically on login (matching main setUserLoggedIn behavior)
        AppInitializer.log('🎯 Auto-initializing My Feed for logged in user...');
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('AppInit', 'About to check showMyFeedInMain function availability');
        }
        setTimeout(() => {
            if (typeof window.showMyFeedInMain === 'function') {
                window.showMyFeedInMain();
                AppInitializer.log('✅ My Feed auto-initialized');
            } else if (typeof showMyFeedInMain === 'function') {
                showMyFeedInMain();
                AppInitializer.log('✅ My Feed auto-initialized');
            } else {
                AppInitializer.log('⚠️ showMyFeedInMain function not available during initialization, trying again in 500ms...');
                // Try again with longer delay for DOM/scripts to load
                setTimeout(() => {
                    if (typeof showMyFeedInMain === 'function') {
                        showMyFeedInMain();
                        AppInitializer.log('✅ My Feed auto-initialized (delayed)');
                    } else {
                        AppInitializer.log('❌ showMyFeedInMain function still not available');
                    }
                }, 500);
            }
        }, 200); // Increased delay to ensure DOM and scripts are ready

        AppInitializer.log('✅ Logged in state set for:', displayName);
    }

    // Set the UI to logged out state
    setLoggedOutState() {
        window.currentUser = null;
        // httpOnly cookies are cleared server-side via logout endpoint
        
        // Update UI elements
        document.getElementById('authSection').style.display = 'flex';
        document.getElementById('userSection').style.display = 'none';
        
        const greetingElement = document.getElementById('userGreeting');
        if (greetingElement) {
            greetingElement.textContent = '';
            greetingElement.style.display = 'none';
        }
        
        // Hide user-specific sidebar options
        const sidebarElements = ['messagesThumb', 'organizingThumb', 'profileThumb', 'feedThumb', 'logoutThumb'];
        sidebarElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

        AppInitializer.log('📤 Logged out state set');
    }

    // Clear auth data and set logged out state
    clearAuthAndSetLoggedOut() {
        // Only clear user data - httpOnly cookies cleared server-side via logout endpoint
        localStorage.removeItem('currentUser');
        this.setLoggedOutState();
        
        // Clear API manager cache since auth changed
        if (window.apiManager) {
            window.apiManager.reset();
        }
    }

    // Update address info in UI
    updateAddressInfo(profile) {
        // Update address display if element exists
        const addressElement = document.getElementById('userAddress');
        if (addressElement && profile.address) {
            const addressText = `${profile.city}, ${profile.state}`;
            addressElement.textContent = addressText;
        }
    }

    // Update notification count
    updateNotificationCount(count) {
        const notificationBtn = document.querySelector('.notification-btn');
        const badge = document.querySelector('.notification-badge');
        
        if (notificationBtn) {
            if (count > 0) {
                if (!badge) {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'notification-badge';
                    notificationBtn.appendChild(newBadge);
                }
                document.querySelector('.notification-badge').textContent = count > 99 ? '99+' : count;
            } else if (badge) {
                badge.remove();
            }
        }
    }

    // Method to refresh user data without full reinitialization
    async refreshUserData() {
        // Authentication handled by httpOnly cookies automatically

        try {
            const userData = await window.apiClient.call('/batch/auth-status', {
                cacheTimeout: 10000 // Short cache for user data updates
            });

            if (userData.success && userData.user) {
                this.userData = userData.user;
                localStorage.setItem('currentUser', JSON.stringify(userData.user));
                window.currentUser = userData.user;
                
                // Update greeting
                const displayName = userData.user.firstName || userData.user.username || 'User';
                const greetingElement = document.getElementById('userGreeting');
                if (greetingElement) {
                    greetingElement.textContent = `Hello, ${displayName}!`;
                }
                
                return userData.user;
            }
        } catch (error) {
            console.warn('Failed to refresh user data:', error);
        }
        
        return null;
    }

    // Check if app is initialized
    isAppInitialized() {
        return this.isInitialized;
    }

    // Get current user data
    getCurrentUser() {
        return this.userData;
    }

    // Display version information for deployment tracking
    displayVersionInfo() {
        try {
            // Get frontend version from meta tags
            const buildTime = document.querySelector('meta[name="build-time"]')?.content || 'Unknown';
            const version = document.querySelector('meta[name="version"]')?.content || 'Unknown';
            const lastUpdated = document.querySelector('meta[name="last-updated"]')?.content || 'Unknown';
            
            // Format frontend version info
            const frontendTime = new Date(buildTime).toLocaleString();
            
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('DeploymentStatus', '================ DEPLOYMENT STATUS ================');
            }
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('DeploymentStatus', `Frontend Version: ${version}`);
            }
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('DeploymentStatus', `Frontend Build Time: ${frontendTime}`);
            }
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('DeploymentStatus', `Frontend Last Updated: ${new Date(lastUpdated).toLocaleString()}`);
            }
            
            // Check backend version asynchronously
            this.checkBackendVersion();
            
        } catch (error) {
            console.warn('Failed to display version info:', error);
        }
    }

    // Check backend version and display
    async checkBackendVersion() {
        try {
            const backendUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL.replace(/\/api$/, '') : 'https://api.unitedwerise.org';
            const response = await fetch(`${backendUrl}/health`);
            const healthData = await response.json();
            
            if (healthData.uptime) {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('BackendHealth', 'Backend version info', {
                        version: healthData.version || 'Unknown'
                    });
                }
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('BackendHealth', 'Backend uptime info', {
                        uptimeSeconds: healthData.uptime,
                        uptimeFormatted: `${Math.floor(healthData.uptime / 60)} minutes`
                    });
                }
                
                // Use deployedAt from backend if available, otherwise calculate
                if (healthData.deployedAt) {
                    if (typeof adminDebugLog !== 'undefined') {
                        adminDebugLog('BackendHealth', 'Backend deployment time', {
                            deployedAt: healthData.deployedAt,
                            deployedTime: new Date(healthData.deployedAt).toLocaleString()
                        });
                    }
                } else {
                    const uptimeMs = parseFloat(healthData.uptime) * 1000;
                    const deploymentTime = new Date(Date.now() - uptimeMs);
                    if (typeof adminDebugLog !== 'undefined') {
                        adminDebugLog('BackendHealth', 'Backend calculated deployment time', {
                            deploymentTime: deploymentTime.toLocaleString()
                        });
                    }
                }
                
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('BackendHealth', 'Backend status info', {
                        status: healthData.status || 'Healthy'
                    });
                }
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('BackendHealth', 'Database connection info', {
                        database: healthData.database
                    });
                }
            }

            await adminDebugLog('AppInitializer', '================================================');

        } catch (error) {
            await adminDebugLog('AppInitializer', `Backend Status: Unreachable (${error.message})`);
            await adminDebugLog('AppInitializer', '================================================');
        }
    }
}

// Create global instance
window.appInitializer = new AppInitializer();

// Enhanced initialization function for backward compatibility
window.initializeApp = async () => {
    return window.appInitializer.initialize();
};

// Quick user data refresh for when needed
window.refreshUserData = async () => {
    return window.appInitializer.refreshUserData();
};

// Global function to check deployment versions
window.checkVersions = () => {
    window.appInitializer.displayVersionInfo();
};

// ES6 Module Exports
export { AppInitializer };

// Auto-initialize when module loads
export async function initializeApp() {
    const result = await window.appInitializer.initialize();

    // Show auth modal for non-authenticated users
    if (!result?.authenticated) {
        AppInitializer.log('🔓 User not authenticated - showing auth modal');

        // Small delay to ensure DOM is fully ready and other modals (MOTD) have loaded
        // MOTD has z-index 9999, auth modal has z-index 10000, so auth modal appears on top
        setTimeout(() => {
            if (typeof window.openAuthModal === 'function') {
                window.openAuthModal('login'); // Default to login, users can switch to register
            } else {
                // Fallback: try to import and use the modal module
                import('../modules/core/auth/modal.js').then(({ openAuthModal }) => {
                    openAuthModal('login');
                }).catch(err => {
                    console.warn('Could not load auth modal:', err);
                });
            }
        }, 500); // 500ms delay allows MOTD to load first, appearing behind auth modal
    }

    return result;
}

// Auto-initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

AppInitializer.log('🎯 App Initializer loaded via ES6 module and ready for auto-initialization');