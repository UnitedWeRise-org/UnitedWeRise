/**
 * AdminAuth Module - Extracted from admin-dashboard.html
 * Handles all admin authentication and authorization logic
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.1 of comprehensive modularization project
 */

import { getApiBaseUrl } from '../../../utils/environment.js';

class AdminAuth {
    constructor() {
        // Singleton pattern - prevent duplicate instances
        if (AdminAuth.instance) {
            console.log('⚠️ AdminAuth singleton already exists, returning existing instance');
            return AdminAuth.instance;
        }
        AdminAuth.instance = this;

        // Note: currentUser is managed by userState via window.currentUser getter/setter
        this.totpVerified = false;
        this.autoRefreshInterval = null;
        this.lastTokenRefresh = new Date(); // Initialize to current time to prevent "Infinity minutes" bug
        this.isRefreshingToken = false; // Flag to prevent concurrent refreshes
        this.refreshPromise = null; // Shared promise for concurrent callers to await
        this.refreshPending = false; // Flag to signal refresh is about to start (during debounce)
        this.lastWakeTimestamp = null; // Timestamp of last visibility change (for race condition detection)
        this.lastHiddenTimestamp = null; // Timestamp of when tab was hidden (for extended absence detection)
        this.isRecovering = false; // Flag to suppress error displays during wake recovery
        this.visibilityChangeDebounceTimer = null; // Debounce timer for visibility changes
        this.recoveryBarrier = null; // Promise that API requests await during wake recovery
        this.recoveryBarrierResolver = null; // Resolver function for the recovery barrier
        this.API_BASE = this.getApiBase();
        this.BACKEND_URL = this.getBackendUrl();

        // Bind methods to preserve context
        this.checkAuthStatus = this.checkAuthStatus.bind(this);
        this.handleLogin = this.handleLogin.bind(this);
        this.logout = this.logout.bind(this);
        this.showLogin = this.showLogin.bind(this);
        this.showDashboard = this.showDashboard.bind(this);
        this.refreshToken = this.refreshToken.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

        // Load current user from localStorage on initialization
        this.loadCurrentUser();

        // Listen for visibility changes to refresh token when tab becomes visible
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /**
     * Get API base URL with centralized environment detection
     */
    getApiBase() {
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            return window.API_CONFIG.BASE_URL;
        }

        // Use centralized environment detection
        return getApiBaseUrl();
    }

    /**
     * Get backend URL (without /api suffix)
     */
    getBackendUrl() {
        return this.API_BASE.replace(/\/api$/, '');
    }

    /**
     * Wait for network to become available
     * Used during wake-from-sleep recovery to avoid "Load failed" errors
     * @param {number} maxWaitMs - Maximum time to wait for network (default 5000ms)
     * @returns {Promise<boolean>} True if network is available, false if timeout
     */
    async waitForNetworkReady(maxWaitMs = 5000) {
        // If already online, return immediately
        if (navigator.onLine) {
            return true;
        }

        console.log('⏳ Waiting for network to reconnect...');
        const startTime = Date.now();

        return new Promise(resolve => {
            let interval = null;

            const cleanup = () => {
                if (interval) clearInterval(interval);
                window.removeEventListener('online', handleOnline);
            };

            const handleOnline = () => {
                cleanup();
                console.log('✅ Network reconnected');
                resolve(true);
            };

            // Listen for online event
            window.addEventListener('online', handleOnline);

            // Also poll in case event doesn't fire (some browsers)
            interval = setInterval(() => {
                if (navigator.onLine) {
                    cleanup();
                    console.log('✅ Network ready (detected via polling)');
                    resolve(true);
                } else if (Date.now() - startTime > maxWaitMs) {
                    cleanup();
                    console.warn('⚠️ Network wait timeout - proceeding anyway');
                    resolve(false);
                }
            }, 200);
        });
    }

    /**
     * Load current user - now handled by userState via window.currentUser getter
     */
    loadCurrentUser() {
        // userState loads from localStorage on initialization
        // window.currentUser getter routes through userState
        return window.currentUser;
    }

    /**
     * Refresh authentication token to prevent Azure 30-minute timeout
     * Called every 14 minutes to maintain session with dual redundancy (14, 28, 42...)
     *
     * IMPORTANT: Uses promise-based deduplication to handle concurrent 401s.
     * When multiple API calls get 401 simultaneously, all callers await the same
     * refresh promise instead of triggering multiple refresh attempts.
     */
    async refreshToken(forceRefresh = false) {
        // If refresh is already in progress, WAIT for it instead of returning false
        // This fixes the race condition where concurrent 401s would cause false "failures"
        if (this.isRefreshingToken && this.refreshPromise) {
            console.log('⏸️ Token refresh already in progress - waiting for completion...');
            return this.refreshPromise;
        }

        // Skip if tab is hidden (unless forced)
        if (!forceRefresh && document.hidden) {
            console.log('⏸️ Token refresh skipped (tab hidden) - will refresh when tab becomes visible');
            return false;
        }

        // Skip if not authenticated
        if (!this.isAuthenticated()) {
            console.log('⏸️ Token refresh skipped (not authenticated)');
            return false;
        }

        this.isRefreshingToken = true;

        // Create a shared promise that concurrent callers can await
        this.refreshPromise = this._doRefresh();

        try {
            return await this.refreshPromise;
        } finally {
            this.isRefreshingToken = false;
            this.refreshPromise = null;
        }
    }

    /**
     * Internal method that performs the actual token refresh
     * Separated from refreshToken() to enable promise-based deduplication
     * @private
     */
    async _doRefresh() {
        const maxRetries = 3;
        const retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

        try {
            // NOTE: Cannot check document.cookie for httpOnly cookies (security feature)
            // The authToken cookie is httpOnly and sent automatically by the browser
            // The refresh endpoint will return 401 if cookie is missing/invalid

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                // Wait for network before each attempt (helps with wake-from-sleep)
                if (!navigator.onLine) {
                    const networkAvailable = await this.waitForNetworkReady(5000);
                    if (!networkAvailable) {
                        console.warn(`⚠️ Network unavailable for attempt ${attempt + 1}, trying anyway...`);
                    }
                }

                try {
                    console.log(`🔄 Attempting token refresh (${attempt + 1}/${maxRetries})...`);

                    const response = await fetch(`${this.API_BASE}/auth/refresh`, {
                        method: 'POST',
                        credentials: 'include', // Include httpOnly cookies
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();

                        // Update CSRF token if provided
                        if (data.csrfToken) {
                            window.csrfToken = data.csrfToken;
                            if (window.AdminAPI) {
                                window.AdminAPI.csrfToken = data.csrfToken;
                            }
                        }

                        this.lastTokenRefresh = new Date();
                        console.log(`✅ Token refreshed successfully (attempt ${attempt + 1})`);

                        // CRITICAL: Wait for browser to process new cookies before making API calls
                        // This prevents race condition where API calls use old (expired) cookie
                        // IMPROVED: Increased from 500ms to 1000ms for slower devices/connections
                        console.log('⏳ Waiting for cookie propagation...');
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 1000ms delay
                        console.log('✅ Cookie propagation complete');

                        // Notify WebSocket and other components that tokens have been refreshed
                        window.dispatchEvent(new CustomEvent('authTokenRefreshed', {
                            detail: { timestamp: new Date().toISOString() }
                        }));

                        return true;
                    } else {
                        console.warn(`⚠️ Token refresh failed with status ${response.status} (attempt ${attempt + 1}/${maxRetries})`);

                        // If 401, session is invalid - don't retry
                        if (response.status === 401) {
                            // Parse error details for diagnostic logging
                            let errorData = {};
                            try {
                                errorData = await response.json();
                            } catch {
                                // Response may not be JSON
                            }

                            console.error('🔒 Session invalid - logging out', {
                                errorCode: errorData.code || 'UNKNOWN',
                                errorMessage: errorData.error || 'Unknown error',
                                diagnostic: errorData.diagnostic || 'No diagnostic info',
                                timestamp: new Date().toISOString(),
                                timeSinceLastRefresh: Math.round((Date.now() - this.lastTokenRefresh) / 1000 / 60) + ' minutes'
                            });

                            this.logout();
                            return false;
                        }
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
            return false;
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            return false;
        }
    }

    /**
     * Handle tab visibility change - refresh token when tab becomes visible after being hidden
     * Debounced to prevent rapid-fire refreshes from multiple visibility events
     * FIXED: Sets refreshPending immediately so API calls wait during debounce period
     * FIXED: Uses isRecovering flag to suppress error displays during wake recovery
     * FIXED: Extended absences (>5 min) skip debounce for immediate refresh
     */
    handleVisibilityChange() {
        const EXTENDED_ABSENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms

        // Clear any pending debounce timer and reset pending flag
        if (this.visibilityChangeDebounceTimer) {
            clearTimeout(this.visibilityChangeDebounceTimer);
            this.refreshPending = false;
        }

        // Track when tab becomes hidden for extended absence detection
        if (document.hidden) {
            this.lastHiddenTimestamp = Date.now();
            return; // Nothing more to do when tab is hidden
        }

        // Set lastWakeTimestamp IMMEDIATELY and unconditionally when tab becomes visible
        // This allows didJustWakeUp() to detect recent wake even if isAuthenticated() is false
        // due to race condition where API calls fire before visibility change
        this.lastWakeTimestamp = Date.now();

        // Calculate how long the tab was hidden
        const hiddenDuration = this.lastHiddenTimestamp
            ? Date.now() - this.lastHiddenTimestamp
            : 0;
        const isExtendedAbsence = hiddenDuration > EXTENDED_ABSENCE_THRESHOLD;

        // Set refreshPending and isRecovering IMMEDIATELY if refresh will be needed
        // This signals API calls to wait during the debounce period
        // and suppresses error displays until recovery completes
        // NOTE: We still check isAuthenticated() here for the refreshPending flag because
        // the time-based logic (5 min check) requires knowing if we were authenticated
        // The didJustWakeUp() fallback in AdminAPI.js handles the race condition case
        if (this.isAuthenticated()) {
            const now = new Date();
            const timeSinceLastRefresh = (now - this.lastTokenRefresh) / 1000 / 60; // minutes

            if (timeSinceLastRefresh > 5) {
                this.refreshPending = true;
                this.isRecovering = true; // Enter recovery mode - suppress error displays

                // Create recovery barrier BEFORE any refresh logic
                // All API requests will await this barrier until recovery completes
                this.recoveryBarrier = new Promise((resolve, reject) => {
                    this.recoveryBarrierResolver = { resolve, reject };
                });

                console.log(`⏳ Tab visible after ${Math.floor(hiddenDuration / 1000 / 60)} minutes (extended: ${isExtendedAbsence}) - entering recovery mode with barrier`);

                // Extended absence: Skip debounce and refresh immediately
                // This prevents API calls from firing during the 1-second debounce gap
                if (isExtendedAbsence) {
                    console.log('🚀 Extended absence detected - refreshing immediately (no debounce)');
                    this._performVisibilityRefresh();
                    return;
                }
            }
        }

        // Short absence: Debounce visibility changes by 1 second to prevent rapid-fire refreshes
        this.visibilityChangeDebounceTimer = setTimeout(() => {
            this._performVisibilityRefresh();
        }, 1000);
    }

    /**
     * Internal method to perform the actual visibility change refresh
     * Separated to allow both debounced and immediate refresh paths
     * IMPROVED: Now resolves/rejects recovery barrier after verification
     * @private
     */
    async _performVisibilityRefresh() {
        let refreshSucceeded = false;

        try {
            if (!document.hidden && this.isAuthenticated()) {
                // Prevent concurrent refreshes from visibility changes
                if (this.isRefreshingToken) {
                    console.log('⏸️ Visibility change refresh skipped (refresh already in progress)');
                    return;
                }

                // Tab became visible - check if token needs refresh
                const now = new Date();
                const timeSinceLastRefresh = (now - this.lastTokenRefresh) / 1000 / 60; // minutes

                // If more than 5 minutes since last refresh, refresh immediately
                // BUGFIX: Align threshold with 5-minute auto-refresh interval (was 10, caused 403s)
                if (timeSinceLastRefresh > 5) {
                    // Wait for network before attempting refresh (helps with wake-from-sleep)
                    await this.waitForNetworkReady(5000);

                    console.log(`🔄 Starting token refresh...`);
                    refreshSucceeded = await this.refreshToken(true); // Force refresh

                    if (refreshSucceeded) {
                        // Verify session is actually working after refresh
                        console.log('🔍 Verifying session after refresh...');
                        try {
                            const verifyResponse = await fetch(`${this.API_BASE}/auth/me`, {
                                method: 'GET',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            if (verifyResponse.ok) {
                                console.log('✅ Recovery mode complete - session verified');
                            } else {
                                console.warn('⚠️ Session verification failed after refresh');
                                refreshSucceeded = false;
                            }
                        } catch (verifyError) {
                            console.warn('⚠️ Session verification error:', verifyError);
                            refreshSucceeded = false;
                        }
                    }
                } else {
                    // No refresh needed - consider it successful
                    refreshSucceeded = true;
                }
            } else {
                // Not authenticated or tab hidden - no barrier to resolve
                refreshSucceeded = true;
            }
        } finally {
            // Resolve or reject the recovery barrier
            if (this.recoveryBarrierResolver) {
                if (refreshSucceeded) {
                    console.log('✅ Resolving recovery barrier - API requests may proceed');
                    this.recoveryBarrierResolver.resolve(true);
                } else {
                    console.log('❌ Rejecting recovery barrier - session invalid');
                    this.recoveryBarrierResolver.reject(new Error('Session recovery failed'));
                }
                this.recoveryBarrierResolver = null;
            }

            // Clear the barrier reference
            this.recoveryBarrier = null;

            // Always clear pending and recovery flags after refresh completes
            this.refreshPending = false;
            this.isRecovering = false;
        }
    }

    /**
     * Check authentication status and admin privileges
     * Primary entry point for authentication flow
     *
     * SECURITY: Always verifies admin status with server before showing admin UI.
     * Never trusts client-side state (localStorage) for admin access decisions.
     */
    async checkAuthStatus() {
        // SECURITY: Always verify with server first - never trust client-side state
        // Client-side localStorage can be manipulated by attackers
        try {
            const response = await fetch(`${this.API_BASE}/auth/me`, {
                method: 'GET',
                credentials: 'include', // Include httpOnly cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                if (userData.success && userData.data) {
                    // Update local state with server-verified data
                    // Set via window.currentUser - routes through userState → localStorage
                    window.currentUser = userData.data;

                    // SECURITY: Use server-verified isAdmin value, not cached value
                    if (userData.data.isAdmin) {
                        this.showDashboard();
                    } else {
                        this.showError('Admin access required. Please log in with an admin account.');
                        this.clearStoredUser();
                        this.showLogin();
                    }
                } else {
                    // Clear any stale cached user data
                    window.currentUser = null;
                    this.showLogin();
                }
            } else {
                // Not authenticated via cookies - clear any stale cached data
                window.currentUser = null;
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // On network error, clear cached data and show login
            // SECURITY: Don't fall back to cached admin status on errors
            window.currentUser = null;
            this.showLogin();
        }
    }

    /**
     * Clear stored user data from localStorage
     * Called when auth token is invalid/expired
     */
    clearStoredUser() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    /**
     * Handle admin login with TOTP verification
     */
    async handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            // Use unified login function for admin context
            const result = await unifiedLogin(email, password, 'admin-dashboard');

            if (result.success) {
                // Set via window.currentUser - routes through userState → localStorage
                window.currentUser = result.user;

                // Set TOTP status from secure cookie-based authentication
                if (result.totpVerified) {
                    this.totpVerified = true;
                    console.log('🔐 TOTP session established from secure httpOnly cookies');

                    // Brief delay to ensure backend session processing completes
                    console.log('⏳ Waiting for session establishment...');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                // Verify admin privileges
                console.log('Login successful, checking admin privileges...');

                try {
                    // Use the AdminAPI module for API calls
                    const adminCheckResponse = await window.AdminAPI.call(`${this.BACKEND_URL}/api/admin/dashboard`);

                    if (adminCheckResponse.ok) {
                        console.log('Admin verified, showing dashboard');

                        // Test admin-only debugging system
                        await adminDebugLog('AdminLogin', 'Admin dashboard access granted', {
                            user: result.user,
                            timestamp: new Date().toISOString(),
                            totpSession: !!result.totpSessionToken
                        });

                        this.showDashboard();
                    } else {
                        console.log('Admin check failed:', adminCheckResponse.status);
                        this.showError('Admin access required. This account does not have admin privileges.');
                    }
                } catch (adminError) {
                    console.error('Admin check error:', adminError);
                    this.showError('Unable to verify admin privileges. Please try again.');
                }
            } else {
                this.showError(result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please check your connection and try again.');
        }
    }

    /**
     * Show login form
     */
    showLogin() {
        const loginSection = document.getElementById('loginSection');
        const dashboardMain = document.getElementById('dashboardMain');

        if (loginSection) loginSection.style.display = 'block';
        if (dashboardMain) dashboardMain.style.display = 'none';
    }

    /**
     * Show admin dashboard
     * Proactively refreshes token if stale before loading data
     */
    async showDashboard() {
        console.log('showDashboard called');
        const loginSection = document.getElementById('loginSection');
        const dashboardMain = document.getElementById('dashboardMain');

        console.log('loginSection element:', loginSection);
        console.log('dashboardMain element:', dashboardMain);

        if (loginSection) loginSection.style.display = 'none';
        if (dashboardMain) dashboardMain.style.display = 'block';

        console.log('Dashboard elements toggled');

        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage && window.currentUser) {
            welcomeMessage.textContent = `Welcome back, ${window.currentUser.firstName || window.currentUser.username}`;
        }

        // Proactive token refresh if > 5 minutes old (matches refreshAllData threshold)
        // This prevents 401 cascade on initial dashboard load
        const now = new Date();
        const timeSinceLastRefresh = this.lastTokenRefresh
            ? (now - this.lastTokenRefresh) / (1000 * 60)
            : Infinity;

        if (timeSinceLastRefresh > 5) {
            console.log(`🔄 Proactive token refresh before dashboard load (${Math.floor(timeSinceLastRefresh)} minutes since last refresh)`);
            await this.refreshToken(true);
        }

        // Trigger dashboard data loading (now with fresh token)
        this.triggerDashboardLoad();

        // Set up auto-refresh every 5 minutes (less aggressive to avoid 404 spam)
        this.autoRefreshInterval = setInterval(() => {
            this.refreshAllData();
        }, 300000);
    }

    /**
     * Logout functionality
     */
    logout() {
        // Use unified logout function
        unifiedLogout('admin-dashboard');

        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        // Clear via window.currentUser - routes through userState.clear() → removes localStorage
        window.currentUser = null;
        this.totpVerified = false;

        // Redirect to login
        this.showLogin();
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('loginError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            alert(message);
        }
    }

    /**
     * Check if user is authenticated admin
     */
    isAuthenticated() {
        return window.currentUser && window.currentUser.isAdmin;
    }

    /**
     * Get the recovery barrier promise if one exists
     * API requests should await this barrier during wake recovery
     * @returns {Promise|null} The recovery barrier promise or null
     */
    getRecoveryBarrier() {
        return this.recoveryBarrier;
    }

    /**
     * Check if the page just woke up (became visible recently)
     * Used as a fallback when refreshPending is false due to race conditions
     * IMPROVED: Uses longer window (10 seconds) for extended absences (>5 min)
     * @param {number} defaultMs - Default time window to consider "just woke" (default 3 seconds)
     * @returns {boolean} True if page became visible within threshold
     */
    didJustWakeUp(defaultMs = 3000) {
        if (!this.lastWakeTimestamp) {
            return false;
        }

        // Calculate how long the tab was hidden to determine appropriate threshold
        const EXTENDED_ABSENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms
        const hiddenDuration = this.lastHiddenTimestamp && this.lastWakeTimestamp > this.lastHiddenTimestamp
            ? this.lastWakeTimestamp - this.lastHiddenTimestamp
            : 0;

        // Use longer window (10 seconds) for extended absences to ensure
        // all API calls wait for refresh to complete
        const windowMs = hiddenDuration > EXTENDED_ABSENCE_THRESHOLD
            ? 10000  // 10 seconds for extended absences
            : defaultMs;

        return Date.now() - this.lastWakeTimestamp < windowMs;
    }

    /**
     * Get current admin user
     */
    getCurrentUser() {
        return window.currentUser;
    }

    /**
     * Check if TOTP is verified
     */
    isTotpVerified() {
        return this.totpVerified;
    }

    /**
     * Trigger dashboard data loading after authentication
     */
    async triggerDashboardLoad() {
        // First, load the admin modules if they weren't loaded yet
        if (window.adminModuleLoader && typeof window.adminModuleLoader.loadModulesAfterAuth === 'function') {
            await window.adminModuleLoader.loadModulesAfterAuth();
        }

        // Then trigger data loading (will be overridden by AdminState module)
        if (window.AdminState && window.AdminState.loadOverviewData) {
            window.AdminState.loadOverviewData();
        } else if (typeof loadOverviewData === 'function') {
            loadOverviewData();
        }
    }

    /**
     * Refresh all dashboard data (to be overridden by AdminState)
     * CRITICAL: Refreshes token if needed BEFORE fetching data to prevent 401 errors
     */
    async refreshAllData() {
        // Check if token needs refresh before fetching data
        const now = new Date();
        const timeSinceLastRefresh = (now - this.lastTokenRefresh) / 1000 / 60; // minutes

        // If more than 5 minutes since last refresh, refresh token first
        // BUGFIX: Align threshold with 5-minute auto-refresh interval (was 10, caused 403s)
        if (timeSinceLastRefresh > 5) {
            console.log(`🔄 Auto-refresh: Token needs refresh (${Math.floor(timeSinceLastRefresh)} minutes since last refresh)`);
            const refreshed = await this.refreshToken(true);
            if (!refreshed) {
                console.error('❌ Auto-refresh: Token refresh failed, skipping data refresh');
                return;
            }
        }

        // This will be overridden by AdminState module
        if (window.AdminState && window.AdminState.refreshAllData) {
            window.AdminState.refreshAllData();
        } else if (typeof refreshAllData === 'function') {
            refreshAllData();
        }
    }

    /**
     * Initialize authentication system
     */
    init() {
        // Set up login form event listener
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin);
        }

        // Check authentication status on initialization
        this.checkAuthStatus();
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        if (this.visibilityChangeDebounceTimer) {
            clearTimeout(this.visibilityChangeDebounceTimer);
        }

        // Clear refresh and recovery flags
        this.isRefreshingToken = false;
        this.refreshPromise = null;
        this.refreshPending = false;
        this.isRecovering = false;
        this.recoveryBarrier = null;
        this.recoveryBarrierResolver = null;

        // Remove event listeners
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.removeEventListener('submit', this.handleLogin);
        }

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        // Clear singleton instance to allow fresh initialization if needed
        AdminAuth.instance = null;
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminAuth;
} else {
    window.AdminAuth = AdminAuth;
}

// Auto-initialize if not in module environment
if (typeof module === 'undefined') {
    // Make sure dependencies are loaded first
    if (typeof unifiedLogin === 'function') {
        window.adminAuth = new AdminAuth();
    } else {
        // Wait for dependencies to load
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (typeof unifiedLogin === 'function') {
                    window.adminAuth = new AdminAuth();
                } else {
                    console.error('AdminAuth: Required dependencies (unifiedLogin) not loaded');
                }
            }, 100);
        });
    }
}