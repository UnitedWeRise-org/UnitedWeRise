/**
 * AdminAPI Module - Extracted from admin-dashboard.html
 * Handles all admin API communication with TOTP and error handling
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.2 of comprehensive modularization project
 */

class AdminAPI {
    constructor() {
        this.totpVerified = false;
        this.totpToken = null;
        this.BACKEND_URL = this.getBackendUrl();

        // Bind methods to preserve context
        this.call = this.call.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.put = this.put.bind(this);
        this.delete = this.delete.bind(this);
    }

    /**
     * Get backend URL with environment detection
     */
    getBackendUrl() {
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            return window.API_CONFIG.BASE_URL.replace(/\/api$/, '');
        }

        // Environment-aware URL detection
        const hostname = window.location.hostname;
        if (hostname.includes('dev.unitedwerise.org')) {
            return 'https://dev-api.unitedwerise.org';
        } else if (hostname.includes('unitedwerise.org')) {
            return 'https://api.unitedwerise.org';
        } else {
            // Local development
            return 'http://localhost:3001';
        }
    }

    /**
     * Enhanced API call function with TOTP support and comprehensive error handling
     * Core method extracted from adminApiCall in admin-dashboard.html
     */
    async call(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add CSRF token for state-changing requests
        if (window.csrfToken && options.method && options.method !== 'GET') {
            headers['X-CSRF-Token'] = window.csrfToken;
        }

        // Add TOTP verification header if verified
        if (this.totpVerified && this.totpToken) {
            headers['x-totp-verified'] = 'true';
            headers['x-totp-token'] = this.totpToken;
        }

        // Authentication handled by httpOnly cookies automatically
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include' // Include cookies
            });

            // Handle TOTP verification required
            if (response.status === 403) {
                // Clone the response so we can read it without consuming the original
                const clonedResponse = response.clone();
                const errorData = await clonedResponse.json().catch(() => ({}));

                if (errorData.error === 'TOTP_VERIFICATION_REQUIRED' || errorData.error === 'TOTP_VERIFICATION_EXPIRED') {
                    console.log('🔒 TOTP verification required for admin access');

                    // TOTP session expired or invalid - need to re-login
                    console.error('🔒 TOTP verification expired - redirecting to login');
                    alert('Your security session has expired. Please log in again.');

                    // Clear all auth data (httpOnly cookies cleared server-side)
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    window.csrfToken = null;

                    // Redirect to login
                    window.location.href = '/admin-dashboard.html';
                    return response;
                }

                if (errorData.error === 'TOTP_REQUIRED') {
                    alert('Two-factor authentication must be enabled in your profile settings to access admin features.');
                    window.location.href = '/';
                    return response;
                }
            }

            // Handle authentication errors
            if (response.status === 401) {
                console.error('🔒 Admin API: Authentication failed');

                // Clear auth data and redirect to login
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');

                if (window.adminAuth) {
                    window.adminAuth.showLogin();
                } else {
                    window.location.href = '/admin-dashboard.html';
                }

                return response;
            }

            // Log successful admin API calls for debugging
            if (response.ok) {
                await adminDebugLog('AdminAPI', `Successful API call: ${options.method || 'GET'} ${url}`, {
                    status: response.status,
                    url: url
                });
            } else {
                await adminDebugWarn('AdminAPI', `API call failed: ${options.method || 'GET'} ${url}`, {
                    status: response.status,
                    statusText: response.statusText,
                    url: url
                });
            }

            return response;
        } catch (error) {
            console.error('Admin API call failed:', error);

            await adminDebugError('AdminAPI', `Network error: ${options.method || 'GET'} ${url}`, {
                error: error.message,
                url: url
            });

            throw error;
        }
    }

    /**
     * Convenience method for GET requests
     */
    async get(endpoint, params = {}) {
        let url = endpoint;

        // Add query parameters if provided
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        return this.call(url, {
            method: 'GET'
        });
    }

    /**
     * Convenience method for POST requests
     */
    async post(endpoint, data = {}) {
        return this.call(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Convenience method for PUT requests
     */
    async put(endpoint, data = {}) {
        return this.call(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Convenience method for DELETE requests
     */
    async delete(endpoint) {
        return this.call(endpoint, {
            method: 'DELETE'
        });
    }

    /**
     * Admin-specific API endpoints with proper error handling
     */
    async getDashboardStats() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/dashboard`);
        if (!response.ok) {
            throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
        }
        return response.json();
    }

    async getUsers(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/users`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status}`);
        }
        return response.json();
    }

    async deleteUser(userId) {
        const response = await this.delete(`${this.BACKEND_URL}/api/admin/users/${userId}`);
        if (!response.ok) {
            throw new Error(`Failed to delete user: ${response.status}`);
        }
        return response.json();
    }

    async updateUserRole(userId, isAdmin, isModerator) {
        const response = await this.put(`${this.BACKEND_URL}/api/admin/users/${userId}/role`, {
            isAdmin,
            isModerator
        });
        if (!response.ok) {
            throw new Error(`Failed to update user role: ${response.status}`);
        }
        return response.json();
    }

    async mergeAccounts(primaryAccountId, secondaryAccountId) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/merge-accounts`, {
            primaryAccountId,
            secondaryAccountId
        });
        if (!response.ok) {
            throw new Error(`Failed to merge accounts: ${response.status}`);
        }
        return response.json();
    }

    async getPosts(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/posts`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch posts: ${response.status}`);
        }
        return response.json();
    }

    async deletePost(postId) {
        const response = await this.delete(`${this.BACKEND_URL}/api/admin/posts/${postId}`);
        if (!response.ok) {
            throw new Error(`Failed to delete post: ${response.status}`);
        }
        return response.json();
    }

    async getComments(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/comments`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch comments: ${response.status}`);
        }
        return response.json();
    }

    async deleteComment(commentId) {
        const response = await this.delete(`${this.BACKEND_URL}/api/admin/comments/${commentId}`);
        if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.status}`);
        }
        return response.json();
    }

    async getReports(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/reports`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch reports: ${response.status}`);
        }
        return response.json();
    }

    async updateReportStatus(reportId, status) {
        const response = await this.put(`${this.BACKEND_URL}/api/admin/reports/${reportId}`, {
            status
        });
        if (!response.ok) {
            throw new Error(`Failed to update report status: ${response.status}`);
        }
        return response.json();
    }

    async getCandidateProfiles(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/candidates/profiles`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch candidate profiles: ${response.status}`);
        }
        return response.json();
    }

    async getCandidateReports(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/candidates/reports`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch candidate reports: ${response.status}`);
        }
        return response.json();
    }

    async getVerificationQueue(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/candidates/verification`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch verification queue: ${response.status}`);
        }
        return response.json();
    }

    async verifyCandidateProfile(profileId, verified) {
        const response = await this.put(`${this.BACKEND_URL}/api/admin/candidates/profiles/${profileId}/verify`, {
            verified
        });
        if (!response.ok) {
            throw new Error(`Failed to update candidate verification: ${response.status}`);
        }
        return response.json();
    }

    async getAuditLogs(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/audit`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch audit logs: ${response.status}`);
        }
        return response.json();
    }

    async getPayments(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/payments`, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch payments: ${response.status}`);
        }
        return response.json();
    }

    async refundPayment(paymentId, reason) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/payments/${paymentId}/refund`, {
            reason
        });
        if (!response.ok) {
            throw new Error(`Failed to process refund: ${response.status}`);
        }
        return response.json();
    }

    async getMOTDSettings() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/motd`);
        if (!response.ok) {
            throw new Error(`Failed to fetch MOTD settings: ${response.status}`);
        }
        return response.json();
    }

    async updateMOTDSettings(settings) {
        const response = await this.put(`${this.BACKEND_URL}/api/admin/motd`, settings);
        if (!response.ok) {
            throw new Error(`Failed to update MOTD settings: ${response.status}`);
        }
        return response.json();
    }

    /**
     * Set TOTP verification status (called by authentication system)
     */
    setTotpStatus(verified, token = null) {
        this.totpVerified = verified;
        this.totpToken = token;

        await adminDebugLog('AdminAPI', `TOTP status updated: ${verified ? 'verified' : 'unverified'}`, {
            hasToken: !!token
        });
    }

    /**
     * Clear TOTP verification (called on logout)
     */
    clearTotpStatus() {
        this.totpVerified = false;
        this.totpToken = null;
    }

    /**
     * Health check for admin API
     */
    async healthCheck() {
        try {
            const response = await this.get(`${this.BACKEND_URL}/api/health`);
            return {
                healthy: response.ok,
                status: response.status,
                data: response.ok ? await response.json() : null
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminAPI;
} else {
    window.AdminAPI = new AdminAPI(); // Singleton pattern for global access
}

// Initialize admin debugging
if (typeof adminDebugLog === 'undefined') {
    console.warn('AdminAPI: adminDebugLog not available - some debug features disabled');
}