// Optimized Application Initialization for United We Rise
// Reduces API calls on page load and implements smart caching

class AppInitializer {
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
        console.log('🚀 Starting optimized app initialization...');

        try {
            // Step 1: Check if we have a stored auth token
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('currentUser');

            if (!storedToken) {
                console.log('📝 No auth token found - user not logged in');
                this.setLoggedOutState();
                return { authenticated: false };
            }

            // Step 2: Set the global auth token (both window and global scope)
            window.authToken = storedToken;
            if (typeof authToken !== 'undefined') {
                authToken = storedToken;
            }

            // Step 3: Try batch initialization first, fall back to individual calls
            console.log('🔄 Fetching initialization data...');
            
            try {
                console.log('🔄 About to call /batch/initialize with token:', window.authToken ? 'EXISTS' : 'MISSING');
                const initData = await window.apiCall('/batch/initialize', {
                    cacheTimeout: 60000 // Cache for 1 minute
                });
                console.log('🔄 Received response from /batch/initialize:', initData);

                if (initData.ok && initData.data && initData.data.success) {
                    console.log('✅ Batch initialization successful');
                    
                    // Store fresh user data
                    this.userData = initData.data.data.user;
                    localStorage.setItem('currentUser', JSON.stringify(this.userData));
                    window.currentUser = this.userData;

                    // Set logged in state with all data
                    this.setLoggedInState(initData.data.data);
                    
                    this.isInitialized = true;
                    return { 
                        authenticated: true, 
                        userData: this.userData,
                        initData: initData.data.data
                    };
                }
            } catch (batchError) {
                console.log('📱 Batch endpoint returned error:', batchError.message || batchError);
                
                // Don't treat 401 from batch as fatal - it just means we need auth
                // Fallback to individual API calls
                console.log('🔄 Trying individual auth verification...');
                
                try {
                    // First try auth/me for authentication check
                    const authData = await window.apiCall('/auth/me');
                    
                    if (authData && authData.user) {
                        console.log('✅ Auth/me fallback successful');
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
                        console.log('❌ Auth/me returned no user data');
                    }
                } catch (authError) {
                    console.log('🔄 Auth/me failed:', authError.message || authError);
                    
                    try {
                        // Get user profile data as final fallback
                        const userProfile = await window.apiCall('/users/profile');
                        
                        if (userProfile) {
                            console.log('✅ Users/profile fallback successful');
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
                            console.log('❌ Users/profile returned no data');
                        }
                    } catch (profileError) {
                        console.log('🔄 Users/profile failed:', profileError.message || profileError);
                        console.log('💾 All API calls failed, checking for cached data...');
                    }
                }
                
                // If we get here, all API calls failed - try cached data
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    console.log('📱 Using cached user data as final fallback');
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
                console.log('💾 Using cached user data due to server issues');
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
            console.log('🚫 No cached data available and server unreachable');
            return { authenticated: false, error: error.message };
        }
    }

    // Set the UI to logged in state with batch data
    setLoggedInState(initData) {
        const user = initData.user;
        
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
        const sidebarElements = ['messagesThumb', 'profileThumb', 'feedThumb', 'logoutThumb'];
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

        console.log('✅ Logged in state set for:', displayName);
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
        const sidebarElements = ['messagesThumb', 'profileThumb', 'feedThumb', 'logoutThumb'];
        sidebarElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

        console.log('📤 Logged out state set');
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

console.log('🎯 App Initializer ready');