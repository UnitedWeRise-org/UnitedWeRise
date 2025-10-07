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
        this.API_BASE = this.getApiBase();
        this.BACKEND_URL = this.getBackendUrl();

        // Bind methods to preserve context
        this.checkAuthStatus = this.checkAuthStatus.bind(this);
        this.handleLogin = this.handleLogin.bind(this);
        this.logout = this.logout.bind(this);
        this.showLogin = this.showLogin.bind(this);
        this.showDashboard = this.showDashboard.bind(this);

        // Load current user from localStorage on initialization
        this.loadCurrentUser();
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
     */
    refreshAllData() {
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

        // Remove event listeners
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.removeEventListener('submit', this.handleLogin);
        }
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