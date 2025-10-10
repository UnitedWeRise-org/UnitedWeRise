/**
 * AdminAPI Module - Extracted from admin-dashboard.html
 * Handles all admin API communication with TOTP and error handling
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.2 of comprehensive modularization project
 */

import { getApiBaseUrl } from '../../../utils/environment.js';

class AdminAPI {
    constructor() {
        this.BACKEND_URL = this.getBackendUrl();

        // Bind methods to preserve context
        this.call = this.call.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.put = this.put.bind(this);
        this.delete = this.delete.bind(this);
    }

    /**
     * Get backend URL with centralized environment detection
     */
    getBackendUrl() {
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            return window.API_CONFIG.BASE_URL.replace(/\/api$/, '');
        }

        // Use centralized environment detection for API base URL
        return getApiBaseUrl().replace('/api', '');
    }

    /**
     * Enhanced API call function with TOTP support and comprehensive error handling
     * Core method extracted from adminApiCall in admin-dashboard.html
     */
    async call(url, options = {}) {
        const headers = {};

        // Only set Content-Type for non-FormData requests
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        // Merge with provided headers
        Object.assign(headers, options.headers);

        // Add CSRF token for state-changing requests
        if (window.csrfToken && options.method && options.method !== 'GET') {
            headers['X-CSRF-Token'] = window.csrfToken;
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
     * Returns parsed JSON response with { success, data, error } structure
     */
    async get(endpoint, params = {}) {
        let url = endpoint;

        // Add query parameters if provided
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        const response = await this.call(url, {
            method: 'GET'
        });

        const json = await response.json();
        return {
            success: response.ok,
            data: json.data || json,
            error: json.error || null,
            status: response.status
        };
    }

    /**
     * Convenience method for POST requests
     * Returns parsed JSON response with { success, data, error } structure
     */
    async post(endpoint, data = {}) {
        const response = await this.call(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        const json = await response.json();
        return {
            success: response.ok,
            data: json.data || json,
            error: json.error || null,
            status: response.status
        };
    }

    /**
     * Convenience method for POST requests with FormData (file uploads)
     * Returns parsed JSON response with { success, data, error } structure
     */
    async postFormData(endpoint, formData) {
        const response = await this.call(endpoint, {
            method: 'POST',
            body: formData
        });

        const json = await response.json();
        return {
            success: response.ok,
            data: json.data || json,
            error: json.error || null,
            status: response.status
        };
    }

    /**
     * Convenience method for PUT requests
     * Returns parsed JSON response with { success, data, error } structure
     */
    async put(endpoint, data = {}) {
        const response = await this.call(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        const json = await response.json();
        return {
            success: response.ok,
            data: json.data || json,
            error: json.error || null,
            status: response.status
        };
    }

    /**
     * Convenience method for DELETE requests
     * Returns parsed JSON response with { success, data, error } structure
     */
    async delete(endpoint) {
        const response = await this.call(endpoint, {
            method: 'DELETE'
        });

        const json = await response.json();
        return {
            success: response.ok,
            data: json.data || json,
            error: json.error || null,
            status: response.status
        };
    }

    /**
     * Admin-specific API endpoints with proper error handling
     * All methods work with normalized response structure: {success, data, error, status}
     */
    async getDashboardStats() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/dashboard`);
        if (!response.success) {
            throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
        }
        return response.data;
    }

    async getUsers(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/users`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch users: ${response.status}`);
        }
        return response.data;
    }

    async deleteUser(userId) {
        const response = await this.delete(`${this.BACKEND_URL}/api/admin/users/${userId}`);
        if (!response.success) {
            throw new Error(`Failed to delete user: ${response.status}`);
        }
        return response.data;
    }

    async updateUserRole(userId, isAdmin, isModerator, isSuperAdmin = false) {
        // Convert boolean flags to role string for backend API
        let role = 'user';
        if (isSuperAdmin) {
            role = 'super-admin';
        } else if (isAdmin) {
            role = 'admin';
        } else if (isModerator) {
            role = 'moderator';
        }

        const response = await this.post(`${this.BACKEND_URL}/api/admin/users/${userId}/role`, {
            role
        });
        if (!response.success) {
            throw new Error(`Failed to update user role: ${response.status}`);
        }
        return response.data;
    }

    async mergeAccounts(primaryAccountId, secondaryAccountId) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/merge-accounts`, {
            primaryAccountId,
            secondaryAccountId
        });
        if (!response.success) {
            throw new Error(`Failed to merge accounts: ${response.status}`);
        }
        return response.data;
    }

    async getPosts(params = {}) {
        // Use standard feed endpoint for admin post viewing
        const response = await this.get(`${this.BACKEND_URL}/api/feed`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch posts: ${response.status}`);
        }
        return response.data;
    }

    async deletePost(postId) {
        const response = await this.delete(`${this.BACKEND_URL}/api/admin/posts/${postId}`);
        if (!response.success) {
            throw new Error(`Failed to delete post: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get comments for admin moderation
     * @deprecated - Comments require postId parameter. Use getCommentsForPost(postId) instead.
     * @todo Implement proper admin comments endpoint or remove if not needed
     * @param {Object} params - Query parameters (currently unused)
     * @returns {Promise<{ok: boolean, comments: Array}>}
     */
    async getComments(params = {}) {
        console.warn('AdminAPI.getComments() is deprecated - requires redesign');
        await adminDebugLog('AdminAPI', 'DEPRECATED: getComments called without postId');
        return { ok: true, comments: [] };
    }

    async deleteComment(commentId) {
        const response = await this.delete(`${this.BACKEND_URL}/api/admin/comments/${commentId}`);
        if (!response.success) {
            throw new Error(`Failed to delete comment: ${response.status}`);
        }
        return response.data;
    }

    async getReports(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/moderation/reports`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch reports: ${response.status}`);
        }
        return response.data;
    }

    async updateReportStatus(reportId, status) {
        const response = await this.put(`${this.BACKEND_URL}/api/admin/reports/${reportId}`, {
            status
        });
        if (!response.success) {
            throw new Error(`Failed to update report status: ${response.status}`);
        }
        return response.data;
    }

    async getCandidateProfiles(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/candidates/profiles`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch candidate profiles: ${response.status}`);
        }
        return response.data;
    }

    async getCandidateReports(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/candidates/reports`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch candidate reports: ${response.status}`);
        }
        return response.data;
    }

    async getVerificationQueue(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/candidates/verification`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch verification queue: ${response.status}`);
        }
        return response.data;
    }

    async verifyCandidateProfile(profileId, verified) {
        const response = await this.put(`${this.BACKEND_URL}/api/admin/candidates/profiles/${profileId}/verify`, {
            verified
        });
        if (!response.success) {
            throw new Error(`Failed to update candidate verification: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get audit logs for admin actions
     * @stub Backend endpoint not yet implemented
     * @todo Implement backend endpoint: GET /api/admin/audit-logs
     * @param {Object} params - Query parameters (page, limit, action, userId, dateRange)
     * @returns {Promise<Object>} Mock data structure until backend ready
     */
    async getAuditLogs(params = {}) {
        await adminDebugLog('AdminAPI', 'STUB: getAuditLogs - awaiting backend implementation');

        // Return mock data for missing endpoint to prevent 404 network logs
        return {
            logs: [],
            total: 0,
            pagination: {
                page: parseInt(params.page) || 1,
                limit: parseInt(params.limit) || 50,
                total: 0,
                pages: 0
            },
            filters: {
                action: params.action || 'all',
                userId: params.userId || 'all',
                dateRange: params.dateRange || 'all'
            }
        };
    }

    async getPayments(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/payments`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch payments: ${response.status}`);
        }
        return response.data;
    }

    async refundPayment(paymentId, reason) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/payments/${paymentId}/refund`, {
            reason
        });
        if (!response.success) {
            throw new Error(`Failed to process refund: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get Message of the Day settings
     * @stub Backend endpoint not yet implemented
     * @todo Implement backend endpoint: GET /api/admin/motd
     * @returns {Promise<Object>} Mock MOTD data until backend ready
     */
    async getMOTDSettings() {
        await adminDebugLog('AdminAPI', 'STUB: getMOTDSettings - awaiting backend implementation');

        // Return mock data for missing endpoint to prevent 404 network logs
        return {
            id: 'default',
            title: 'Welcome to Admin Dashboard',
            content: 'System ready for administration.',
            isActive: false,
            priority: 'low',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    async updateMOTDSettings(settings) {
        const response = await this.put(`${this.BACKEND_URL}/api/admin/motd`, settings);
        if (!response.success) {
            throw new Error(`Failed to update MOTD settings: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Set TOTP verification status (called by authentication system)
     */
    async setTotpStatus(verified, token = null) {
        // TOTP status now handled entirely by secure httpOnly cookies
        // Backend reads from req.cookies.totpSessionToken
        await adminDebugLog('AdminAPI', 'TOTP managed via httpOnly cookies', {
            cookieBased: true,
            secure: true
        });
    }

    /**
     * Clear TOTP verification (called on logout)
     */
    clearTotpStatus() {
        // TOTP cleared server-side via logout endpoint
        // No client-side state to manage
    }

    /**
     * Health check for admin API
     */
    async healthCheck() {
        try {
            const response = await this.get(`${this.BACKEND_URL}/health`);
            return {
                healthy: response.success,
                status: response.status,
                data: response.success ? response.data : null
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
const adminAPI = new AdminAPI();

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = adminAPI;
}

// Global access for legacy code
window.AdminAPI = adminAPI;

// ES6 module export
export { adminAPI as AdminAPI };
export default adminAPI;

// Initialize admin debugging
if (typeof adminDebugLog === 'undefined') {
    console.warn('AdminAPI: adminDebugLog not available - some debug features disabled');
}