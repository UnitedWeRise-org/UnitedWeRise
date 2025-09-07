// Optimized Application Initialization for United We Rise
// Reduces API calls on page load and implements smart caching

class AppInitializer {
    // Production logging helper - only shows important messages
    static log(message, type = 'info') {
        const isProduction = window.location.hostname !== 'localhost';
        
        if (type === 'error') {
            console.error(message); // Always show errors
        } else if (type === 'warn') {
            console.warn(message); // Always show warnings
        } else if (!isProduction) {
            console.log(message); // Only show debug in development
        }
    }
    constructor() {
        this.initializationPromise = null;
        this.isInitialized = false;
        this.userData = null;
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

        try {
            // Step 1: Check if we have a stored auth token
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('currentUser');

            if (!storedToken) {
                AppInitializer.log('📝 No auth token found - user not logged in');
                this.setLoggedOutState();
                return { authenticated: false };
            }

            // Step 2: Set the global auth token (both window and global scope)
            window.authToken = storedToken;
            if (typeof authToken !== 'undefined') {
                authToken = storedToken;
            }

            // Step 3: Try batch initialization first, fall back to individual calls
            AppInitializer.log('🔄 Fetching initialization data...');
            
            try {
                AppInitializer.log('🔄 About to call /batch/initialize with token:', window.authToken ? `EXISTS (${window.authToken.slice(0,10)}...)` : 'MISSING');
                const initData = await window.apiCall('/batch/initialize', {
                    cacheTimeout: 60000, // Cache for 1 minute
                    retries: 1 // Only retry once to avoid cascading failures
                });
                AppInitializer.log('🔄 Received response from /batch/initialize:', {
                    ok: initData?.ok,
                    status: initData?.status,
                    hasData: !!initData?.data,
                    hasUser: !!initData?.data?.data?.user,
                    error: initData?.error || 'none'
                });

                if (initData && initData.ok && initData.data && initData.data.success) {
                    AppInitializer.log('✅ Batch initialization successful');
                    
                    // Store fresh user data
                    this.userData = initData.data.data.user;
                    localStorage.setItem('currentUser', JSON.stringify(this.userData));
                    window.currentUser = this.userData;

                    // CACHE RELATIONSHIPS FOR ENTIRE SESSION - NO MORE INDIVIDUAL API CALLS!
                    if (initData.data.data.relationships) {
                        window.userRelationships = initData.data.data.relationships;
                        localStorage.setItem('userRelationships', JSON.stringify(window.userRelationships));
                        AppInitializer.log('✅ Cached user relationships:', {
                            friends: window.userRelationships.friends?.length || 0,
                            following: window.userRelationships.following?.length || 0,
                            followers: window.userRelationships.followers?.length || 0
                        });
                    }

                    // Set logged in state with all data
                    this.setLoggedInState(initData.data.data);
                    
                    this.isInitialized = true;
                    return { 
                        authenticated: true, 
                        userData: this.userData,
                        initData: initData.data.data
                    };
                } else {
                    // Log why batch failed
                    AppInitializer.log('❌ Batch response structure issue:', {
                        hasInitData: !!initData,
                        hasOk: !!initData?.ok,
                        hasData: !!initData?.data,
                        hasSuccess: !!initData?.data?.success,
                        status: initData?.status,
                        errorMessage: initData?.data?.error
                    }, 'warn');
                    
                    // If we got a response but it's not successful, throw an error to trigger fallback
                    if (initData && !initData.ok) {
                        const error = new Error(initData.data?.error || `HTTP ${initData.status}`);
                        error.status = initData.status;
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
                
                // If it's a 401, clear invalid token and set logged out state
                if (batchError.message?.includes('401') || batchError.status === 401) {
                    AppInitializer.log('🔒 Authentication failed, clearing invalid token');
                    this.clearAuthAndSetLoggedOut();
                    return { authenticated: false, reason: 'invalid_token' };
                }
                
                // For other errors (network, 500, etc), try limited fallback
                AppInitializer.log('🔄 Trying minimal auth verification fallback...');
                
                try {
                    // First try auth/me for authentication check
                    const authData = await window.apiCall('/auth/me');
                    
                    if (authData && authData.user) {
                        AppInitializer.log('✅ Auth/me fallback successful');
                        this.userData = authData.user;
                        localStorage.setItem('currentUser', JSON.stringify(this.userData));
                        window.currentUser = this.userData;

                        // Set logged in state
                        this.setLoggedInState({ user: this.userData });
                        
                        this.isInitialized = true;
                        return { 
                            authenticated: true, 
                            userData: this.userData,
                            fallback: true
                        };
                    } else {
                        AppInitializer.log('❌ Auth/me returned no user data', 'warn');
                    }
                } catch (authError) {
                    AppInitializer.log('🔄 Auth/me failed:', authError.message || authError, 'warn');
                    
                    try {
                        // Get user profile data as final fallback
                        const userProfile = await window.apiCall('/users/profile');
                        
                        if (userProfile) {
                            AppInitializer.log('✅ Users/profile fallback successful');
                            this.userData = userProfile;
                            localStorage.setItem('currentUser', JSON.stringify(this.userData));
                            window.currentUser = this.userData;

                            // Set logged in state
                            this.setLoggedInState({ user: this.userData });
                            
                            this.isInitialized = true;
                            return { 
                                authenticated: true, 
                                userData: this.userData,
                                fallback: true
                            };
                        } else {
                            AppInitializer.log('❌ Users/profile returned no data', 'warn');
                        }
                    } catch (profileError) {
                        AppInitializer.log('🔄 Users/profile failed:', profileError.message || profileError, 'warn');
                        AppInitializer.log('💾 All API calls failed, checking for cached data...', 'warn');
                    }
                }
                
                // If we get here, all API calls failed - try cached data
                const storedUser = localStorage.getItem('currentUser');
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
            const storedUser = localStorage.getItem('currentUser');
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
        window.authToken = null;
        if (typeof authToken !== 'undefined') {
            authToken = null;
        }
        
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

    // Clear auth tokens and set logged out state
    clearAuthAndSetLoggedOut() {
        localStorage.removeItem('authToken');
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
        if (!window.authToken) return null;

        try {
            const userData = await window.apiCall('/batch/auth-status', {
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
            const response = await fetch(`${window.BACKEND_URL || 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io'}/health`);
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
            
            console.log('🏗️ ================================================');
            
        } catch (error) {
            console.log(`❌ Backend Status: Unreachable (${error.message})`);
            console.log('🏗️ ================================================');
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

AppInitializer.log('🎯 App Initializer ready');