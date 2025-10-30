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
        this.currentUser = null;
        this.totpVerified = false;
        this.autoRefreshInterval = null;
        this.tokenRefreshInterval = null; // Separate interval for token refresh (14-min)
        this.lastTokenRefresh = new Date(); // Initialize to current time to prevent "Infinity minutes" bug
        this.isRefreshingToken = false; // Flag to prevent concurrent refreshes
        this.visibilityChangeDebounceTimer = null; // Debounce timer for visibility changes
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
     * Load current user from localStorage
     */
    loadCurrentUser() {
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading user from localStorage:', error);
            localStorage.removeItem('currentUser');
        }
    }

    /**
     * Refresh authentication token to prevent Azure 30-minute timeout
     * Called every 14 minutes to maintain session with dual redundancy (14, 28, 42...)
     */
    async refreshToken(forceRefresh = false) {
        // Prevent concurrent refresh attempts
        if (this.isRefreshingToken) {
            console.log('⏸️ Token refresh already in progress');
            return false;
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
        const maxRetries = 3;
        const retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

        try {
            // Verify authToken cookie exists before attempting refresh
            const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('authToken='));
            if (!hasCookie) {
                console.error('🔒 No authToken cookie found - session expired');
                this.logout();
                this.isRefreshingToken = false;
                return false;
            }

            for (let attempt = 0; attempt < maxRetries; attempt++) {
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
                        console.log('⏳ Waiting for cookie propagation...');
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                        console.log('✅ Cookie propagation complete');

                        this.isRefreshingToken = false;
                        return true;
                    } else {
                        console.warn(`⚠️ Token refresh failed with status ${response.status} (attempt ${attempt + 1}/${maxRetries})`);

                        // If 401, session is invalid - don't retry
                        if (response.status === 401) {
                            console.error('🔒 Session invalid - logging out');
                            this.logout();
                            this.isRefreshingToken = false;
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
            this.isRefreshingToken = false;
            return false;
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            this.isRefreshingToken = false;
            return false;
        }
    }

    /**
     * Handle tab visibility change - refresh token when tab becomes visible after being hidden
     * Debounced to prevent rapid-fire refreshes from multiple visibility events
     */
    handleVisibilityChange() {
        // Clear any pending debounce timer
        if (this.visibilityChangeDebounceTimer) {
            clearTimeout(this.visibilityChangeDebounceTimer);
        }

        // Debounce visibility changes by 1 second to prevent rapid-fire refreshes
        this.visibilityChangeDebounceTimer = setTimeout(() => {
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
                    console.log(`🔄 Tab visible after ${Math.floor(timeSinceLastRefresh)} minutes - refreshing token`);
                    this.refreshToken(true); // Force refresh
                }
            }
        }, 1000); // 1 second debounce
    }

    /**
     * Check authentication status and admin privileges
     * Primary entry point for authentication flow
     */
    async checkAuthStatus() {
        if (this.currentUser) {
            // User already loaded from localStorage
            if (this.currentUser.isAdmin) {
                this.showDashboard();
                return;
            } else {
                this.showError('Admin access required. Please log in with an admin account.');
                this.showLogin();
                return;
            }
        }

        // No user in localStorage, try to authenticate via cookies
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
                    this.currentUser = userData.data;
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

                    if (this.currentUser.isAdmin) {
                        this.showDashboard();
                    } else {
                        this.showError('Admin access required. Please log in with an admin account.');
                        this.showLogin();
                    }
                } else {
                    this.showLogin();
                }
            } else {
                // Not authenticated via cookies
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showLogin();
        }
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
                this.currentUser = result.user;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

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
     */
    showDashboard() {
        console.log('showDashboard called');
        const loginSection = document.getElementById('loginSection');
        const dashboardMain = document.getElementById('dashboardMain');

        console.log('loginSection element:', loginSection);
        console.log('dashboardMain element:', dashboardMain);

        if (loginSection) loginSection.style.display = 'none';
        if (dashboardMain) dashboardMain.style.display = 'block';

        console.log('Dashboard elements toggled');

        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage && this.currentUser) {
            welcomeMessage.textContent = `Welcome back, ${this.currentUser.firstName || this.currentUser.username}`;
        }

        // Trigger dashboard data loading
        this.triggerDashboardLoad();

        // Set up auto-refresh every 5 minutes (less aggressive to avoid 404 spam)
        this.autoRefreshInterval = setInterval(() => {
            this.refreshAllData();
        }, 300000);

        // Set up token refresh every 14 minutes to prevent Azure 30-minute timeout
        // Dual redundancy: refreshes at 14, 28, 42... minutes
        this.tokenRefreshInterval = setInterval(() => {
            this.refreshToken();
        }, 14 * 60 * 1000); // 14 minutes in milliseconds
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

        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        this.currentUser = null;
        this.totpVerified = false;
        localStorage.removeItem('currentUser');

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
        return this.currentUser && this.currentUser.isAdmin;
    }

    /**
     * Get current admin user
     */
    getCurrentUser() {
        return this.currentUser;
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

        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        if (this.visibilityChangeDebounceTimer) {
            clearTimeout(this.visibilityChangeDebounceTimer);
        }

        // Remove event listeners
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.removeEventListener('submit', this.handleLogin);
        }

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
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