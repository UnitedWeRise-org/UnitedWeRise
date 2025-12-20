/**
 * AdminAPI Module - Extracted from admin-dashboard.html
 * Handles all admin API communication with TOTP and error handling
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.2 of comprehensive modularization project
 */

import { getApiBaseUrl } from '../../../utils/environment.js';
import { COOKIE_NAMES } from '../../../utils/cookies.js';

class AdminAPI {
    constructor() {
        this.BACKEND_URL = this.getBackendUrl();

        // Bind methods to preserve context
        this.call = this.call.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.put = this.put.bind(this);
        this.delete = this.delete.bind(this);

        // Session verification mutex (prevents concurrent verify calls)
        this.isVerifyingSession = false;
        this.sessionVerificationPromise = null;

        // Logout guard (prevents multiple concurrent logouts)
        this.isLoggingOut = false;
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
     * Verify session with mutex - prevents multiple concurrent verification calls
     * Returns true if session is valid, false otherwise
     */
    async verifySessionOnce() {
        // If already verifying, wait for that result
        if (this.isVerifyingSession && this.sessionVerificationPromise) {
            console.log('⏸️ Session verification in progress, waiting...');
            return this.sessionVerificationPromise;
        }

        this.isVerifyingSession = true;
        this.sessionVerificationPromise = (async () => {
            try {
                const response = await fetch(`${this.BACKEND_URL}/api/auth/me`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                return response.ok;
            } catch (error) {
                console.warn('Session verification network error:', error);
                return false;
            } finally {
                this.isVerifyingSession = false;
                this.sessionVerificationPromise = null;
            }
        })();

        return this.sessionVerificationPromise;
    }

    /**
     * Trigger logout with guard - prevents multiple concurrent logout attempts
     */
    triggerLogout(reason) {
        if (this.isLoggingOut) {
            console.log('[AdminAPI] Logout already in progress, skipping duplicate');
            return;
        }

        this.isLoggingOut = true;
        console.error(`🔒 ${reason}`);
        window.currentUser = null;

        if (window.adminAuth) {
            window.adminAuth.showLogin();
        } else {
            window.location.href = '/admin-dashboard.html';
        }

        // Reset after brief delay to allow re-login attempts
        setTimeout(() => {
            this.isLoggingOut = false;
        }, 2000);
    }

    /**
     * Wait for any in-progress token refresh to complete
     * Prevents race condition where API call uses old token
     */
    async waitForTokenRefresh() {
        if (window.adminAuth && window.adminAuth.isRefreshingToken) {
            console.log('⏸️ Waiting for token refresh to complete...');
            const maxWait = 10000; // 10 seconds max
            const startTime = Date.now();

            while (window.adminAuth.isRefreshingToken && (Date.now() - startTime) < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
            }

            if (window.adminAuth.isRefreshingToken) {
                console.warn('⚠️ Token refresh taking too long, proceeding anyway');
            } else {
                console.log('✅ Token refresh complete, proceeding with API call');
            }
        }
    }

    /**
     * Enhanced API call function with TOTP support and comprehensive error handling
     * Core method extracted from adminApiCall in admin-dashboard.html
     */
    async call(url, options = {}, retryCount = 0) {
        // Wait for any in-progress token refresh before making API call
        await this.waitForTokenRefresh();

        const headers = {};

        // Only set Content-Type for non-FormData requests
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        // Merge with provided headers
        Object.assign(headers, options.headers);

        // Add CSRF token for state-changing requests
        // Fallback to reading from cookie if window.csrfToken not set
        const csrfToken = window.csrfToken || getCookie(COOKIE_NAMES.CSRF_TOKEN);
        if (csrfToken && options.method && options.method !== 'GET') {
            headers['X-CSRF-Token'] = csrfToken;
        }

        // ========== 🔍 REQUEST LOGGING START ==========
        const requestTimestamp = new Date().toISOString();
        const method = options.method || 'GET';

        console.group(`📤 API Request: ${method} ${url}`);
        console.log('🕐 Request Timestamp:', requestTimestamp);
        console.log('🔁 Retry Count:', retryCount);

        // Log all available cookies
        console.log('🍪 All Document Cookies:', document.cookie || '(empty)');

        // Parse and log specific cookies
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            if (key) acc[key] = value;
            return acc;
        }, {});
        console.log('🍪 Parsed Cookies:', cookies);

        // Highlight critical auth cookies
        const authToken = cookies['authToken'];
        // csrfToken already declared above at line 77
        const totpSessionToken = cookies['totpSessionToken'];

        console.group('🔑 Authentication Cookies:');
        // authToken is httpOnly - cannot be read by JavaScript (expected security behavior)
        // The cookie IS present and sent automatically by the browser with credentials: 'include'
        console.log('authToken:', '🔒 httpOnly (not readable by JS, sent automatically)');
        console.log('csrf-token:', csrfToken ? `✅ Present (${csrfToken.substring(0, 20)}...)` : '❌ Missing');
        console.log('totpSessionToken:', totpSessionToken ? `✅ Present (${totpSessionToken.substring(0, 20)}...)` : '❌ Missing');
        console.groupEnd();

        // Log headers being sent
        console.log('📋 Request Headers:', headers);
        console.log('🔐 Window CSRF Token:', window.csrfToken ? `Present (${window.csrfToken.substring(0, 20)}...)` : 'Missing');
        console.log('🔒 Credentials Mode:', 'include');

        // Log request body (if present and not FormData)
        if (options.body && !(options.body instanceof FormData)) {
            try {
                const bodyPreview = JSON.parse(options.body);
                console.log('📦 Request Body:', bodyPreview);
            } catch (e) {
                console.log('📦 Request Body:', '(unable to parse)');
            }
        } else if (options.body instanceof FormData) {
            console.log('📦 Request Body:', 'FormData (file upload)');
        }

        console.groupEnd();
        // ========== 🔍 REQUEST LOGGING END ==========

        // Retry configuration for network errors
        const maxNetworkRetries = 3;
        const networkRetryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
        let lastError = null;

        // Authentication handled by httpOnly cookies automatically
        for (let networkAttempt = 0; networkAttempt < maxNetworkRetries; networkAttempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers,
                    credentials: 'include' // Include cookies
                });

            // ========== 🔍 RESPONSE LOGGING START ==========
            const responseTimestamp = new Date().toISOString();
            const is403 = response.status === 403;

            if (is403) {
                console.group(`🚨 403 FORBIDDEN DETECTED 🚨`);
            } else {
                console.group(`📥 API Response: ${method} ${url}`);
            }

            console.log('🕐 Response Timestamp:', responseTimestamp);
            console.log('📊 Status Code:', response.status);
            console.log('📊 Status Text:', response.statusText);
            console.log('✅ Response OK:', response.ok);
            console.log('🌐 Response Type:', response.type);
            console.log('🔗 Response URL:', response.url);

            // Log response headers (if available)
            try {
                const responseHeaders = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                console.log('📋 Response Headers:', responseHeaders);
            } catch (e) {
                console.log('📋 Response Headers:', '(unable to read)');
            }

            // For 403 responses, log additional context
            if (is403) {
                console.group('🔍 403 Diagnostic Context:');
                console.log('🔑 Auth cookies at time of 403:', {
                    authToken: authToken ? 'Present' : 'Missing',
                    csrfToken: csrfToken ? 'Present' : 'Missing',
                    totpSessionToken: totpSessionToken ? 'Present' : 'Missing'
                });
                console.log('🔄 Was this a retry?:', retryCount > 0);
                console.log('⏰ Time since request:', new Date(responseTimestamp) - new Date(requestTimestamp), 'ms');
                console.groupEnd();
            }

            console.groupEnd();
            // ========== 🔍 RESPONSE LOGGING END ==========

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

                    // Clear all auth data via userState (httpOnly cookies cleared server-side)
                    window.currentUser = null;  // Routes through userState.clear() → removes localStorage
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

            // Handle authentication errors with automatic token refresh
            if (response.status === 401) {
                console.warn('⚠️ Admin API: Received 401 - checking for token expiration...');

                // If this is a retry, don't retry again
                if (retryCount > 0) {
                    console.error('🔒 401 after retry - session is invalid');
                    await adminDebugError('AdminAPI', '401 error persists after retry - logging out', {
                        url: url,
                        retryCount: retryCount
                    });

                    // Clear auth data via userState and redirect to login
                    window.currentUser = null;  // Routes through userState.clear() → removes localStorage

                    if (window.adminAuth) {
                        window.adminAuth.showLogin();
                    } else {
                        window.location.href = '/admin-dashboard.html';
                    }

                    return response;
                }

                // Check if this is an access token expiration error
                try {
                    const errorData = await response.clone().json().catch(() => ({}));

                    if (errorData.code === 'ACCESS_TOKEN_EXPIRED') {
                        console.log('🔄 Access token expired - attempting refresh...');
                        await adminDebugLog('AdminAPI', 'Access token expired - refreshing', {
                            originalUrl: url,
                            method: options.method || 'GET'
                        });

                        // Attempt to refresh token
                        try {
                            const refreshResponse = await fetch(`${this.BACKEND_URL}/api/auth/refresh`, {
                                method: 'POST',
                                credentials: 'include'
                            });

                            if (refreshResponse.ok) {
                                const refreshData = await refreshResponse.json();

                                // Update CSRF token if provided
                                if (refreshData.csrfToken) {
                                    window.csrfToken = refreshData.csrfToken;
                                }

                                console.log('✅ Token refreshed successfully - retrying request');
                                await adminDebugLog('AdminAPI', 'Token refresh successful - retrying original request');

                                // Wait for cookie propagation
                                await new Promise(resolve => setTimeout(resolve, 300));

                                // Retry original request with incremented retry count
                                return this.call(url, options, retryCount + 1);
                            } else {
                                console.error('🔒 Token refresh failed - logging out');
                                await adminDebugError('AdminAPI', 'Token refresh failed', {
                                    refreshStatus: refreshResponse.status
                                });

                                // Clear auth data via userState and redirect to login
                                window.currentUser = null;  // Routes through userState.clear() → removes localStorage

                                if (window.adminAuth) {
                                    window.adminAuth.showLogin();
                                } else {
                                    window.location.href = '/admin-dashboard.html';
                                }

                                return response;
                            }
                        } catch (refreshError) {
                            console.error('🔒 Token refresh error:', refreshError);
                            await adminDebugError('AdminAPI', 'Token refresh exception', {
                                error: refreshError.message
                            });

                            // Network error during refresh - keep user logged in
                            return response;
                        }
                    } else {
                        // Not a token expiration - verify session with mutex
                        console.warn('⚠️ 401 without ACCESS_TOKEN_EXPIRED code - verifying session...');

                        const sessionValid = await this.verifySessionOnce();

                        if (sessionValid) {
                            // Session is still valid - 401 was likely timing issue
                            console.log('✅ Session verified valid - 401 was likely timing issue, retrying...');
                            await adminDebugLog('AdminAPI', '401 error but session valid - retrying request', {
                                originalUrl: url,
                                method: options.method || 'GET'
                            });

                            // Wait a moment for cookies to propagate, then retry
                            await new Promise(resolve => setTimeout(resolve, 300));
                            return this.call(url, options, retryCount + 1);
                        } else {
                            // Session is truly invalid - log out (guarded)
                            await adminDebugError('AdminAPI', 'Authentication failed - session invalid');
                            this.triggerLogout('Session verification failed - logging out');
                            return response;
                        }
                    }
                } catch (verifyError) {
                    // Network error during verification - don't log out
                    console.warn('⚠️ Could not handle 401 due to error - keeping user logged in');
                    await adminDebugWarn('AdminAPI', '401 handling error', {
                        error: verifyError.message
                    });

                    return response;
                }
            }

                // Log successful admin API calls for debugging
                if (response.ok) {
                    await adminDebugLog('AdminAPI', `Successful API call: ${options.method || 'GET'} ${url}`, {
                        status: response.status,
                        url: url
                    });
                    return response; // Success - exit retry loop
                } else {
                    await adminDebugWarn('AdminAPI', `API call failed: ${options.method || 'GET'} ${url}`, {
                        status: response.status,
                        statusText: response.statusText,
                        url: url
                    });
                }

                // Check if we should retry based on status code
                // Don't retry 4xx client errors (except 401 which is already handled above)
                if (response.status >= 400 && response.status < 500) {
                    return response; // Client error - don't retry
                }

                // Retry 5xx server errors
                if (response.status >= 500) {
                    lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
                    lastError.response = response;
                    lastError.status = response.status;

                    if (networkAttempt < maxNetworkRetries - 1) {
                        console.warn(`⚠️ Server error ${response.status} - retrying (${networkAttempt + 1}/${maxNetworkRetries})...`);
                        await new Promise(resolve => setTimeout(resolve, networkRetryDelays[networkAttempt]));
                        continue; // Retry
                    }
                }

                return response;

            } catch (error) {
                // Network error (ERR_INTERNET_DISCONNECTED, Failed to fetch, etc.)
                lastError = error;

                console.warn(`⚠️ Network error on attempt ${networkAttempt + 1}/${maxNetworkRetries}:`, error.message);

                await adminDebugWarn('AdminAPI', `Network error (attempt ${networkAttempt + 1}/${maxNetworkRetries}): ${options.method || 'GET'} ${url}`, {
                    error: error.message,
                    attempt: networkAttempt + 1,
                    maxRetries: maxNetworkRetries
                });

                // If this was the last attempt, exit loop and throw
                if (networkAttempt >= maxNetworkRetries - 1) {
                    break;
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, networkRetryDelays[networkAttempt]));
                // Continue to next retry attempt
            }
        }

        // All retries exhausted - throw the last error
        console.error('❌ All retry attempts exhausted');
        await adminDebugError('AdminAPI', `All retry attempts failed: ${options.method || 'GET'} ${url}`, {
            error: lastError?.message || 'Unknown error',
            url: url,
            attempts: maxNetworkRetries
        });
        throw lastError;
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

    /**
     * Fetch all dashboard initialization data in one batch request
     * Combines dashboard stats, recent users, posts, and reports into a single API call
     * @returns {Promise<Object>} Complete dashboard initialization data
     */
    async getDashboardBatch() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/batch/dashboard-init`);
        if (!response.success) {
            throw new Error(`Failed to fetch dashboard batch data: ${response.status}`);
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

    /**
     * Permanently delete a message (Super-Admin only with TOTP)
     * @param {string} messageId - The ID of the message to delete
     * @param {string} reason - Reason for deletion (10-500 characters, required)
     * @returns {Promise<Object>} Deletion audit data
     * @throws {Error} If deletion fails or user lacks super-admin privileges
     */
    async deleteMessage(messageId, reason) {
        if (!reason || reason.length < 10 || reason.length > 500) {
            throw new Error('Reason must be between 10 and 500 characters');
        }

        const response = await this.call(`${this.BACKEND_URL}/api/admin/messages/${messageId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason })
        });

        const json = await response.json();
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Super admin access required for message deletion');
            }
            throw new Error(json.error || 'Failed to delete message');
        }

        return json;
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

    /**
     * Get filtered reports queue
     * @param {Object} params - Filter parameters
     * @param {string} [params.status] - Filter by status (all, PENDING, IN_REVIEW, RESOLVED, DISMISSED)
     * @param {string} [params.type] - Filter by report type/reason
     * @param {string} [params.priority] - Filter by priority (all, LOW, MEDIUM, HIGH, URGENT)
     * @param {string} [params.dateRange] - Filter by date range (1, 7, 30, 90, all)
     * @param {number} [params.limit=50] - Number of reports to return
     * @param {number} [params.offset=0] - Offset for pagination
     * @returns {Promise<Object>} Reports queue with pagination
     */
    async getReportsQueue(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/reports/queue`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch reports queue: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get reports analytics and statistics
     * @param {string} [dateRange='30'] - Date range for analytics (1, 7, 30, 90, all)
     * @returns {Promise<Object>} Reports analytics including counts, trends, and breakdowns
     */
    async getReportsAnalytics(dateRange = '30') {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/reports/analytics`, { dateRange });
        if (!response.success) {
            throw new Error(`Failed to fetch reports analytics: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get available report types/reasons
     * @returns {Promise<Array>} List of report types with labels and descriptions
     */
    async getReportTypes() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/reports/types`);
        if (!response.success) {
            throw new Error(`Failed to fetch report types: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get full details for a specific report
     * @param {string} reportId - Report ID
     * @returns {Promise<Object>} Report details including target content and related reports
     */
    async getReportDetails(reportId) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/reports/${reportId}/details`);
        if (!response.success) {
            throw new Error(`Failed to fetch report details: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get action history for a report
     * @param {string} reportId - Report ID
     * @returns {Promise<Array>} Moderation action history
     */
    async getReportHistory(reportId) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/reports/${reportId}/history`);
        if (!response.success) {
            throw new Error(`Failed to fetch report history: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Take action on a report
     * @param {string} reportId - Report ID
     * @param {string} action - Action to take (dismiss, warn, suspend, delete, escalate, resolve)
     * @param {Object} data - Additional data
     * @param {string} [data.notes] - Moderator notes
     * @returns {Promise<Object>} Action result
     */
    async takeReportAction(reportId, action, data = {}) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/reports/${reportId}/action`, {
            action,
            notes: data.notes
        });
        if (!response.success) {
            throw new Error(`Failed to take report action: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Perform bulk action on multiple reports
     * @param {Array<string>} reportIds - Array of report IDs
     * @param {string} action - Action to take (dismiss, warn, suspend, escalate, resolve)
     * @param {Object} data - Additional data
     * @param {string} [data.notes] - Moderator notes
     * @returns {Promise<Object>} Bulk action result
     */
    async bulkReportAction(reportIds, action, data = {}) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/reports/bulk-action`, {
            reportIds,
            action,
            notes: data.notes
        });
        if (!response.success) {
            throw new Error(`Failed to perform bulk action: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Export reports as CSV or JSON
     * @param {Object} params - Export parameters
     * @param {string} [params.status='all'] - Filter by status
     * @param {string} [params.type='all'] - Filter by type
     * @param {string} [params.dateRange='30'] - Date range
     * @param {string} [params.format='csv'] - Export format (csv or json)
     * @returns {Promise<Blob|Object>} CSV blob or JSON data
     */
    async exportReports(params = {}) {
        const { status = 'all', type = 'all', dateRange = '30', format = 'csv' } = params;

        if (format === 'json') {
            const response = await this.get(`${this.BACKEND_URL}/api/admin/reports/export`, { ...params, format: 'json' });
            if (!response.success) {
                throw new Error(`Failed to export reports: ${response.status}`);
            }
            return response.data;
        }

        // For CSV, use direct fetch to get the blob
        const queryParams = new URLSearchParams({ status, type, dateRange, format: 'csv' });
        const response = await fetch(`${this.BACKEND_URL}/api/admin/reports/export?${queryParams}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to export reports: ${response.status}`);
        }

        return response.blob();
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

    /**
     * Get candidate verification details
     * @param {string} verificationId - Candidate registration ID
     * @returns {Promise<Object>} Verification details including documents and status
     */
    async getCandidateVerificationDetails(verificationId) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/candidates/${verificationId}`);
        if (!response.success) {
            throw new Error(`Failed to fetch candidate verification details: ${response.status}`);
        }
        return response;
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
     * @param {Object} params - Query parameters
     * @param {string} [params.adminId] - Filter by admin ID
     * @param {string} [params.action] - Filter by action type
     * @param {string} [params.targetType] - Filter by target type
     * @param {string} [params.targetId] - Filter by target ID
     * @param {string} [params.startDate] - Filter logs after this date (ISO 8601)
     * @param {string} [params.endDate] - Filter logs before this date (ISO 8601)
     * @param {number} [params.limit=50] - Number of logs to return (max 100)
     * @param {number} [params.offset=0] - Offset for pagination
     * @returns {Promise<Object>} Audit logs with pagination
     */
    async getAuditLogs(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/audit-logs`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch audit logs: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get audit log statistics for a time period
     * @param {Object} params - Query parameters
     * @param {string} [params.startDate] - Start date for statistics (ISO 8601)
     * @param {string} [params.endDate] - End date for statistics (ISO 8601)
     * @returns {Promise<Object>} Audit statistics including action counts and top admins
     */
    async getAuditLogStats(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/audit-logs/stats`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch audit log stats: ${response.status}`);
        }
        return response.data;
    }

    // ============================================================
    // ERROR TRACKING METHODS
    // ============================================================

    /**
     * Get errors list with stats
     * @param {Object} params - Query parameters
     * @param {string} [params.severity='all'] - Filter by severity (all, critical, error, warning)
     * @param {string} [params.timeframe='24h'] - Timeframe (1h, 24h, 7d)
     * @returns {Promise<Object>} Errors data with stats
     */
    async getErrors(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.severity) queryParams.append('severity', params.severity);
        if (params.timeframe) queryParams.append('timeframe', params.timeframe);

        const url = `${this.BACKEND_URL}/api/admin/errors${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await this.get(url);
        if (!response.success) {
            throw new Error(`Failed to get errors: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Mark errors as resolved
     * @param {Array<string>} errorIds - Array of error IDs to resolve
     * @param {string} [resolution] - Resolution notes
     * @returns {Promise<Object>} Resolution result
     */
    async resolveErrors(errorIds, resolution) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/errors/resolve`, {
            errorIds,
            resolution
        });
        if (!response.success) {
            throw new Error(`Failed to resolve errors: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Generate error analysis report
     * @param {Object} params - Report parameters
     * @param {string} [params.timeframe='7d'] - Timeframe (1d, 7d, 30d, 90d)
     * @param {string} [params.service] - Filter by service name
     * @returns {Promise<Object>} Error analysis report
     */
    async generateErrorReport(params = {}) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/errors/report`, params);
        if (!response.success) {
            throw new Error(`Failed to generate error report: ${response.status}`);
        }
        return response.data;
    }

    // ============================================================
    // CONTENT MANAGEMENT METHODS
    // ============================================================

    /**
     * Get AI-flagged content
     * @param {Object} params - Query parameters
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=50] - Results per page
     * @param {string} [params.flagType] - Filter by flag type
     * @param {number} [params.minConfidence] - Minimum confidence score
     * @returns {Promise<Object>} Flagged content with pagination
     */
    async getFlaggedContent(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.flagType) queryParams.append('flagType', params.flagType);
        if (params.minConfidence) queryParams.append('minConfidence', params.minConfidence.toString());
        const url = `${this.BACKEND_URL}/api/admin/content/flagged${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await this.get(url);
        if (!response.success) {
            throw new Error(`Failed to get flagged content: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Resolve a content flag
     * @param {string} flagId - Flag ID to resolve
     * @param {string} resolution - Resolution action (dismiss, warn, remove)
     * @returns {Promise<Object>} Resolution result
     */
    async resolveContentFlag(flagId, resolution) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/content/flags/${flagId}/resolve`, {
            resolution
        });
        if (!response.success) {
            throw new Error(`Failed to resolve content flag: ${response.status}`);
        }
        return response.data;
    }

    // ============================================================
    // SYSTEM CONFIGURATION METHODS
    // ============================================================

    /**
     * Get system configuration
     * @returns {Promise<Object>} System configuration settings
     */
    async getSystemConfig() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/system/config`);
        if (!response.success) {
            throw new Error(`Failed to get system config: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Toggle maintenance mode (super-admin only)
     * @param {boolean} enabled - Enable or disable maintenance mode
     * @param {string} [message] - Maintenance message
     * @returns {Promise<Object>} Maintenance mode result
     */
    async toggleMaintenanceMode(enabled, message) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/system/maintenance`, {
            enabled,
            message
        });
        if (!response.success) {
            throw new Error(`Failed to toggle maintenance mode: ${response.status}`);
        }
        return response.data;
    }

    // ============================================================
    // ANALYTICS METHODS
    // ============================================================

    /**
     * Get comprehensive analytics data
     * @param {Object} params - Query parameters
     * @param {number} [params.days=30] - Number of days for analytics (7, 30, 90)
     * @returns {Promise<Object>} Analytics data including user growth, engagement, civic metrics
     */
    async getAnalytics(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.days) queryParams.append('days', params.days.toString());

        const url = `${this.BACKEND_URL}/api/admin/analytics${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await this.get(url);
        if (!response.success) {
            throw new Error(`Failed to get analytics: ${response.status}`);
        }
        return response.data;
    }

    // ============================================================
    // ANALYTICS EXPORT METHODS
    // ============================================================

    /**
     * Generate custom analytics report
     * @param {Object} params - Report parameters
     * @param {Array<string>} params.metrics - Metrics to include (users, posts, reports, engagement)
     * @param {string} [params.startDate] - Start date (ISO 8601)
     * @param {string} [params.endDate] - End date (ISO 8601)
     * @param {string} [params.groupBy='day'] - Grouping (day, week, month)
     * @returns {Promise<Object>} Custom analytics report
     */
    async generateCustomReport(params) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/analytics/custom-report`, params);
        if (!response.success) {
            throw new Error(`Failed to generate custom report: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Export analytics data
     * @param {Object} params - Export parameters
     * @param {string} params.dataType - Data type (users, posts, reports, engagement)
     * @param {string} [params.format='csv'] - Export format (csv, json)
     * @param {string} [params.startDate] - Start date (ISO 8601)
     * @param {string} [params.endDate] - End date (ISO 8601)
     * @returns {Promise<Blob|Object>} Export data
     */
    async exportAnalytics(params) {
        const { dataType, format = 'csv', startDate, endDate } = params;

        if (format === 'json') {
            const response = await this.post(`${this.BACKEND_URL}/api/admin/analytics/export`, params);
            if (!response.success) {
                throw new Error(`Failed to export analytics: ${response.status}`);
            }
            return response.data;
        }

        // For CSV, use direct fetch
        const response = await fetch(`${this.BACKEND_URL}/api/admin/analytics/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ dataType, format: 'csv', startDate, endDate })
        });

        if (!response.ok) {
            throw new Error(`Failed to export analytics: ${response.status}`);
        }

        return response.blob();
    }

    // ============================================================
    // AI INSIGHTS METHODS
    // ============================================================

    /**
     * Get combined AI insights data (metrics + analysis + suggestions)
     * @returns {Promise<Object>} Combined AI insights data
     */
    async getAIInsights() {
        // Fetch metrics, analysis, and suggestions in parallel
        const [metricsResponse, analysisResponse, suggestionsResponse] = await Promise.all([
            this.get(`${this.BACKEND_URL}/api/admin/ai-insights/metrics`),
            this.get(`${this.BACKEND_URL}/api/admin/ai-insights/analysis`),
            this.get(`${this.BACKEND_URL}/api/admin/ai-insights/suggestions`)
        ]);

        return {
            metrics: metricsResponse.success ? metricsResponse.data : null,
            analysis: analysisResponse.success ? analysisResponse.data : null,
            suggestions: suggestionsResponse.success ? suggestionsResponse.data : null
        };
    }

    /**
     * Get AI system metrics
     * @returns {Promise<Object>} AI metrics including usage and status
     */
    async getAIMetrics() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/ai-insights/metrics`);
        if (!response.success) {
            throw new Error(`Failed to get AI metrics: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get AI analysis data
     * @returns {Promise<Object>} AI analysis data
     */
    async getAIAnalysis() {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/ai-insights/analysis`);
        if (!response.success) {
            throw new Error(`Failed to get AI analysis: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get AI suggestions
     * @param {Object} params - Filter parameters
     * @param {string} [params.category='all'] - Category filter
     * @param {string} [params.status='all'] - Status filter
     * @returns {Promise<Object>} AI suggestions
     */
    async getAISuggestions(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.category) queryParams.append('category', params.category);
        if (params.status) queryParams.append('status', params.status);
        const url = `${this.BACKEND_URL}/api/admin/ai-insights/suggestions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await this.get(url);
        if (!response.success) {
            throw new Error(`Failed to get AI suggestions: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Trigger AI analysis
     * @param {Object} params - Analysis parameters
     * @param {string} params.analysisType - Type (content_moderation, trending_topics, user_engagement, sentiment)
     * @param {string} [params.scope='recent'] - Scope (recent, all)
     * @returns {Promise<Object>} Analysis job info
     */
    async runAIAnalysis(params) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/ai-insights/run-analysis`, params);
        if (!response.success) {
            throw new Error(`Failed to run AI analysis: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Generate AI insights report
     * @param {Object} params - Report parameters
     * @param {string} params.reportType - Type (weekly_summary, content_health, engagement_analysis, moderation_review)
     * @returns {Promise<Object>} AI insights report
     */
    async generateAIReport(params) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/ai-insights/generate-report`, params);
        if (!response.success) {
            throw new Error(`Failed to generate AI report: ${response.status}`);
        }
        return response.data;
    }

    // ============================================================
    // SECURITY METHODS
    // ============================================================

    /**
     * Get security events
     * @param {Object} params - Query parameters
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=50] - Results per page
     * @param {string} [params.eventType] - Filter by event type
     * @param {number} [params.minRiskScore=0] - Minimum risk score
     * @param {number} [params.days=7] - Days to look back
     * @returns {Promise<Object>} Security events with pagination
     */
    async getSecurityEvents(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.eventType) queryParams.append('eventType', params.eventType);
        if (params.minRiskScore) queryParams.append('minRiskScore', params.minRiskScore.toString());
        if (params.days) queryParams.append('days', params.days.toString());
        const url = `${this.BACKEND_URL}/api/admin/security/events${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await this.get(url);
        if (!response.success) {
            throw new Error(`Failed to get security events: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get security statistics
     * @param {string} [timeframe='24h'] - Timeframe (24h, 7d, 30d)
     * @returns {Promise<Object>} Security statistics
     */
    async getSecurityStats(timeframe = '24h') {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/security/stats?timeframe=${timeframe}`);
        if (!response.success) {
            throw new Error(`Failed to get security stats: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Get failed login attempts - uses security events endpoint filtered for login failures
     * @returns {Promise<Object>} Failed login data
     */
    async getFailedLogins() {
        const response = await this.getSecurityEvents({ eventType: 'LOGIN_FAILURE', days: 7, limit: 100 });
        return {
            success: true,
            failedLogins: response?.events || [],
            total: response?.total || 0,
            timeframe: '7 days'
        };
    }

    /**
     * Get suspicious activity - uses security events endpoint filtered for high risk
     * @returns {Promise<Object>} Suspicious activity data
     */
    async getSuspiciousActivity() {
        const response = await this.getSecurityEvents({ minRiskScore: 50, days: 7, limit: 100 });
        return {
            success: true,
            suspiciousActivity: response?.events || [],
            total: response?.total || 0,
            timeframe: '7 days'
        };
    }

    /**
     * Get security metrics - wraps security stats endpoint
     * @returns {Promise<Object>} Security metrics
     */
    async getSecurityMetrics() {
        const stats = await this.getSecurityStats('24h');
        return {
            success: true,
            metrics: stats || {},
            timeframe: '24h'
        };
    }

    /**
     * Get blocked IPs list
     * @param {Object} params - Query parameters
     * @param {boolean} [params.includeExpired=false] - Include expired blocks
     * @param {number} [params.limit=50] - Results per page
     * @param {number} [params.offset=0] - Pagination offset
     * @returns {Promise<Object>} Blocked IPs data with pagination
     */
    async getBlockedIPs(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/security/blocked-ips`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch blocked IPs: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Block an IP address (SuperAdmin only, requires TOTP)
     * @param {string} ipAddress - IP address to block (IPv4 or IPv6)
     * @param {Object} params - Block parameters
     * @param {string} params.reason - Reason for blocking (10-500 characters)
     * @param {string} [params.expiresAt] - Optional expiration date (ISO 8601)
     * @param {Object} [params.metadata] - Optional metadata
     * @returns {Promise<Object>} Block result with created block data
     */
    async blockIP(ipAddress, params = {}) {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/security/block-ip`, {
            ipAddress,
            reason: params.reason,
            expiresAt: params.expiresAt,
            metadata: params.metadata
        });
        if (!response.success) {
            throw new Error(response.error || `Failed to block IP: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Unblock an IP address (SuperAdmin only, requires TOTP)
     * @param {string} ipAddress - IP address to unblock
     * @returns {Promise<Object>} Unblock result
     */
    async unblockIP(ipAddress) {
        const response = await this.delete(`${this.BACKEND_URL}/api/admin/security/unblock-ip?ipAddress=${encodeURIComponent(ipAddress)}`);
        if (!response.success) {
            throw new Error(response.error || `Failed to unblock IP: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Clear all blocked IPs (SuperAdmin only, requires TOTP)
     * @returns {Promise<Object>} Clear result with count of cleared blocks
     */
    async clearBlockedIPs() {
        const response = await this.post(`${this.BACKEND_URL}/api/admin/security/clear-blocked-ips`, {});
        if (!response.success) {
            throw new Error(response.error || `Failed to clear blocked IPs: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Set login monitoring status (placeholder - full implementation in Phase 3)
     * @param {boolean} enabled - Enable or disable monitoring
     * @returns {Promise<Object>} Setting result
     */
    async setLoginMonitoring(enabled) {
        // TODO: Implement backend endpoint in Phase 3
        return {
            success: true,
            enabled,
            note: 'Login monitoring configuration coming soon'
        };
    }

    /**
     * Dismiss a security alert (placeholder - full implementation in Phase 3)
     * @param {string} alertId - Alert ID to dismiss
     * @returns {Promise<Object>} Dismiss result
     */
    async dismissSecurityAlert(alertId) {
        // TODO: Implement backend endpoint in Phase 3
        return {
            success: true,
            alertId,
            note: 'Alert dismissed (full implementation coming soon)'
        };
    }

    /**
     * Get activity details - uses security events endpoint
     * @param {string} activityId - Activity ID
     * @returns {Promise<Object>} Activity details
     */
    async getActivityDetails(activityId) {
        const response = await this.getSecurityEvents({ limit: 1 });
        // Find the specific event by ID from cached events or return placeholder
        const event = response?.events?.find(e => e.id === activityId);
        return {
            success: true,
            activity: event || { id: activityId, note: 'Details lookup coming soon' }
        };
    }

    // ============================================================
    // EXTERNAL CANDIDATES PLACEHOLDER METHODS
    // ============================================================

    /**
     * Get vote tracking data (Coming Soon)
     * @returns {Promise<Object>} Placeholder data
     */
    async getVoteTrackingData() {
        return {
            comingSoon: true,
            feature: 'Vote Tracking',
            message: 'Vote tracking integration is coming soon. This will provide real-time election results and voting pattern analysis.'
        };
    }

    /**
     * Get campaign finance data (Coming Soon)
     * @returns {Promise<Object>} Placeholder data
     */
    async getCampaignFinanceData() {
        return {
            comingSoon: true,
            feature: 'Campaign Finance',
            message: 'Campaign finance data integration is coming soon. This will provide FEC filing data and contribution tracking.'
        };
    }

    /**
     * Get news tracking data (Coming Soon)
     * @returns {Promise<Object>} Placeholder data
     */
    async getNewsTrackingData() {
        return {
            comingSoon: true,
            feature: 'News Tracking',
            message: 'Political news tracking is coming soon. This will aggregate and analyze news coverage of candidates.'
        };
    }

    /**
     * Get polling data (Coming Soon)
     * @returns {Promise<Object>} Placeholder data
     */
    async getPollingData() {
        return {
            comingSoon: true,
            feature: 'Polling Data',
            message: 'Polling data integration is coming soon. This will provide aggregated polling data and trend analysis.'
        };
    }

    /**
     * Get data source health (Coming Soon)
     * @returns {Promise<Object>} Placeholder data
     */
    async getDataSourceHealth() {
        return {
            comingSoon: true,
            feature: 'Data Sources',
            message: 'External data source management is coming soon. This will show integration status with FEC, news APIs, and polling sources.'
        };
    }

    /**
     * Get external candidates analytics (Coming Soon)
     * @returns {Promise<Object>} Placeholder data
     */
    async getExternalCandidatesAnalytics() {
        return {
            comingSoon: true,
            feature: 'External Analytics',
            message: 'External candidate analytics is coming soon. This will provide insights across vote tracking, finance, news, and polling data.'
        };
    }

    /**
     * Get payments list with filtering and pagination
     * @param {Object} params - Query parameters
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=50] - Results per page
     * @param {string} [params.status] - Filter by status (COMPLETED, PENDING, FAILED, etc.)
     * @param {string} [params.type] - Filter by type (DONATION, FEE)
     * @param {string} [params.search] - Search by user email or Stripe ID
     * @returns {Promise<Object>} Payments data with pagination and summary
     */
    async getPayments(params = {}) {
        const response = await this.get(`${this.BACKEND_URL}/api/admin/payments`, params);
        if (!response.success) {
            throw new Error(`Failed to fetch payments: ${response.status}`);
        }
        return response.data;
    }

    /**
     * Process a refund for a payment
     * @deprecated Refunds should be processed directly in the Stripe Dashboard.
     *             This method is disabled for security and audit trail purposes.
     *             Visit https://dashboard.stripe.com/payments to process refunds.
     * @param {string} paymentId - Payment ID
     * @param {string} reason - Refund reason
     * @returns {Promise<never>} Always throws an error directing to Stripe Dashboard
     * @throws {Error} Always throws - use Stripe Dashboard instead
     */
    async refundPayment(paymentId, reason) {
        await adminDebugWarn('AdminAPI', 'DEPRECATED: refundPayment called - refunds should be processed in Stripe Dashboard', {
            paymentId,
            reason
        });
        throw new Error(
            'Refunds are now processed directly in the Stripe Dashboard for better security and audit trails. ' +
            'Please visit https://dashboard.stripe.com/payments to process refunds.'
        );
    }

    /**
     * Get all MOTDs with analytics
     * @returns {Promise<Object>} MOTD list with engagement metrics: { motds: [...], analytics: {...} }
     */
    async getMOTDSettings() {
        await adminDebugLog('AdminAPI', 'Loading MOTD data from backend');

        try {
            const response = await this.call(
                `${this.BACKEND_URL}/api/motd/admin/list`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch MOTDs: ${response.status}`);
            }

            const result = await response.json();

            // Backend returns: { success: true, data: { motds: [...] } }
            // Extract the data object which contains the motds array
            if (result.success && result.data) {
                return result.data;  // Returns { motds: [...] }
            }

            throw new Error('Invalid response format from MOTD endpoint');

        } catch (error) {
            await adminDebugError('AdminAPI', 'Failed to load MOTDs', error);

            // Return empty data structure on error (not mock data)
            return {
                motds: [],
                analytics: {
                    totalMOTDs: 0,
                    activeMOTDs: 0,
                    totalViews: 0,
                    avgEngagement: 0
                }
            };
        }
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

/**
 * Helper function to get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
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