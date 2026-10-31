/**
 * @module core/api/client
 * @description Unified API client for all backend communications
 * Handles authentication, caching, and error management
 *
 * @example
 * import { apiClient } from '@/modules/core/api/client';
 * const response = await apiClient.call('/users/profile');
 */

import { adminDebugLog } from '../../../../js/adminDebugger.js';
import { getCsrfToken } from '../../../utils/cookies.js';

const API_CONFIG = {
    get BASE_URL() {
        // CRITICAL FIX: Dynamic getter prevents Azure Static Web Apps interception
        // NEVER use '/api' fallback - always use direct backend URL
        return window.API_CONFIG?.BASE_URL || 'https://api.unitedwerise.org/api';
    },
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

/**
 * API Client class for handling all backend communications
 */
class APIClient {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this._refreshPromise = null;
    }

    /**
     * Make an API call with automatic retry and caching
     * @param {string} endpoint - API endpoint path
     * @param {Object} options - Fetch options plus custom options
     * @returns {Promise<Object>} API response data
     */
    async call(endpoint, options = {}) {
        // Build full URL
        const url = await this._buildURL(endpoint, options.params);

        // Check cache for GET requests (unless bypassCache is explicitly set)
        if ((!options.method || options.method === 'GET') && !options.bypassCache) {
            const cached = this._getFromCache(url);
            if (cached) return cached;
        }
        
        // Prevent duplicate concurrent requests
        if (this.pendingRequests.has(url)) {
            return this.pendingRequests.get(url);
        }
        
        // Create request promise
        const requestPromise = this._makeRequest(url, options);
        this.pendingRequests.set(url, requestPromise);
        
        try {
            const response = await requestPromise;
            
            // Cache successful GET responses
            if ((!options.method || options.method === 'GET') && response) {
                this._addToCache(url, response);
            }
            
            return response;
        } finally {
            this.pendingRequests.delete(url);
        }
    }

    /**
     * Make the actual HTTP request
     * @private
     */
    async _makeRequest(url, options = {}, attempt = 1) {
        try {
            // Prepare request options
            const fetchOptions = {
                ...options,
                credentials: 'include', // Include cookies
                headers: {
                    ...(options.skipContentType ? {} : { 'Content-Type': 'application/json' }),
                    ...options.headers
                }
            };

            // Handle body serialization to prevent "[object Object]" errors
            if (options.body) {
                if (options.body instanceof FormData) {
                    fetchOptions.body = options.body;
                    // Remove Content-Type to let browser set boundary for FormData
                    delete fetchOptions.headers['Content-Type'];
                } else if (typeof options.body === 'string') {
                    fetchOptions.body = options.body;
                } else {
                    // Serialize objects to JSON
                    fetchOptions.body = JSON.stringify(options.body);
                }
            }
            
            // Add CSRF token from cookie (single source of truth for double-submit pattern)
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                fetchOptions.headers['X-CSRF-Token'] = csrfToken;
            } else if (fetchOptions.method && fetchOptions.method !== 'GET' && fetchOptions.method !== 'OPTIONS') {
                console.warn(`⚠️ CSRF token missing for ${fetchOptions.method} request to ${url}`);
            }
            
            // Set timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            fetchOptions.signal = controller.signal;
            
            // Debug logging for FormData uploads
            if (options.body instanceof FormData) {
                console.log('🔧 Making FormData request to:', url);
                console.log('🔧 Fetch options:', {
                    method: fetchOptions.method,
                    headers: fetchOptions.headers,
                    bodyType: 'FormData'
                });
            }

            // Make request
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // Log FormData response details
            if (options.body instanceof FormData) {
                console.log('🔧 FormData response:', {
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });
            }
            
            // Handle response
            if (!response.ok) {
                if (response.status === 401) {
                    let errorData = null;
                    try {
                        errorData = await response.json();
                    } catch (_) {
                        // Non-JSON 401 body
                    }

                    // Never try to refresh credential flows (login/register/etc.).
                    const isAuthFlowEndpoint = /\/auth\/(login|register|refresh|logout|forgot-password|reset-password)\b/.test(url);

                    if (!options._retry && !isAuthFlowEndpoint) {
                        try {
                            // If the unified manager is already refreshing (tab wake), wait first.
                            if (window.unifiedAuthManager?.isRefreshPending?.()) {
                                await window.unifiedAuthManager.waitForPendingRefresh?.(5000);
                            }

                            await this._refreshAccessToken();

                            // Retry exactly once with the new access-token cookie.
                            return this._makeRequest(url, { ...options, _retry: true }, 1);
                        } catch (refreshError) {
                            console.warn('⚠️ Token refresh failed:', refreshError.message);
                            const hadSession = !!(window.currentUser || localStorage.getItem('currentUser'));
                            if (hadSession) {
                                await this._handleUnauthorized();
                            }
                            throw new Error('Session expired');
                        }
                    }

                    // A retry still failed (or this is a credential flow). Only clear
                    // an existing session; guest 401s should not trigger logout or
                    // revoke a refresh token.
                    if (!isAuthFlowEndpoint) {
                        const hadSession = !!(window.currentUser || localStorage.getItem('currentUser'));
                        if (hadSession) {
                            await this._handleUnauthorized();
                        }
                    }
                    throw new Error(errorData?.error || errorData?.message || 'Unauthorized');
                }

                // Retry on 5xx errors
                if (response.status >= 500 && attempt < API_CONFIG.RETRY_ATTEMPTS) {
                    await this._delay(1000 * attempt); // Exponential backoff
                    return this._makeRequest(url, options, attempt + 1);
                }

                // For client errors (4xx), try to parse the error response
                try {
                    const errorData = await response.json();
                    console.error(`API Error Response:`, errorData);
                    throw new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
                } catch (parseError) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }
            }
            
            // Parse response
            const data = await response.json();
            // CSRF token is automatically updated via Set-Cookie header (cookie is single source of truth)
            return data;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            // Retry on network errors
            if (attempt < API_CONFIG.RETRY_ATTEMPTS && this._isRetryableError(error)) {
                await this._delay(1000 * attempt);
                return this._makeRequest(url, options, attempt + 1);
            }
            
            console.error(`API call failed: ${url}`, error);
            throw error;
        }
    }

    /**
     * Build full URL with query parameters
     * @private
     */
    async _buildURL(endpoint, params) {
        const baseURL = endpoint.startsWith('http')
            ? endpoint
            : `${API_CONFIG.BASE_URL}${endpoint}`;

        await adminDebugLog('APIClient', 'Building URL', {
            endpoint,
            baseURL: API_CONFIG.BASE_URL,
            fullURL: baseURL
        });

        if (!params) return baseURL;

        const url = new URL(baseURL, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });

        return url.toString();
    }

    /**
     * Get cached response if available and not expired
     * @private
     */
    _getFromCache(url) {
        const cached = this.cache.get(url);
        if (!cached) return null;
        
        const isExpired = Date.now() - cached.timestamp > API_CONFIG.CACHE_DURATION;
        if (isExpired) {
            this.cache.delete(url);
            return null;
        }
        
        return cached.data;
    }

    /**
     * Add response to cache
     * @private
     */
    _addToCache(url, data) {
        this.cache.set(url, {
            data,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Refresh the access token using the httpOnly refresh-token cookie.
     * Coalesces concurrent 401 refreshes into one request.
     *
     * @returns {Promise<boolean>} True when new cookies were issued
     * @throws {Error} When the refresh token is invalid/expired
     * @private
     */
    async _refreshAccessToken() {
        if (this._refreshPromise) return this._refreshPromise;

        this._refreshPromise = (async () => {
            const refreshResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                cache: 'no-store'
            });

            if (!refreshResponse.ok) {
                throw new Error(`Token refresh failed (${refreshResponse.status})`);
            }

            // New auth + refresh + CSRF cookies are set by the response.
            await refreshResponse.json();
            console.log('✅ Token refreshed, retrying original request');
            return true;
        })().finally(() => {
            this._refreshPromise = null;
        });

        return this._refreshPromise;
    }

    /**
     * Handle unauthorized response - properly clear ALL auth state systems
     * @private
     */
    async _handleUnauthorized() {
        // Use the unified auth manager for complete logout:
        // - Clears window.currentUser (via getter/setter enforcement)
        // - Clears localStorage.currentUser (via userState._saveToStorage)
        // - Clears userState.current
        // - Clears httpOnly cookies (via backend logout endpoint)
        // - Dispatches userLoggedOut event
        // - Updates UI via session.setUserLoggedOut()
        if (window.unifiedAuthManager) {
            try {
                await window.unifiedAuthManager.logout();
            } catch (error) {
                console.error('❌ Unified logout failed, falling back to userState.clear():', error);
                // Fallback to clearing userState directly
                if (window.userState) {
                    window.userState.clear();
                }
            }
        } else if (window.userState) {
            // Fallback if unified auth manager not available
            window.userState.clear();
        }

        // Dispatch custom event for any remaining listeners
        window.dispatchEvent(new CustomEvent('unauthorized'));
    }

    /**
     * Check if error is retryable
     * @private
     */
    _isRetryableError(error) {
        return error.message.includes('fetch') || 
               error.message.includes('network') ||
               error.message.includes('timeout');
    }

    /**
     * Delay helper for retry backoff
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Invalidate cache for specific endpoint pattern
     * @param {string} pattern - URL pattern to match (supports wildcards)
     * @example invalidateCache('/posts/123$') // exact match
     * @example invalidateCache('/posts/.asterisk./comments') // wildcard match (replace .asterisk. with *)
     */
    invalidateCache(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const urlsToDelete = [];

        for (const [url, _] of this.cache) {
            if (regex.test(url)) {
                urlsToDelete.push(url);
            }
        }

        urlsToDelete.forEach(url => this.cache.delete(url));

        if (urlsToDelete.length > 0) {
            console.log(`🗑️ Cache invalidated: ${urlsToDelete.length} entries matching pattern: ${pattern}`);
        }
    }

    /**
     * Upload file with progress tracking
     */
    async upload(endpoint, file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);

        const url = await this._buildURL(endpoint);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid response'));
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', url);
            xhr.withCredentials = true;

            const csrfToken = getCsrfToken();
            if (csrfToken) {
                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
            }

            xhr.send(formData);
        });
    }
}

// Create singleton instance
export const apiClient = new APIClient();

// Make apiClient globally available for unified API system
if (typeof window !== 'undefined') {
    window.apiClient = apiClient;
    
    // Maintain backward compatibility with proper response wrapping
    window.apiCall = async (endpoint, options) => {
        try {
            const data = await apiClient.call(endpoint, options);

            // Wrap the response in the expected format
            // Since apiClient.call returns the data directly, we need to simulate the response structure
            return {
                ok: true,
                status: 200, // Assume success if we got data
                data: data
            };
        } catch (error) {
            // Handle errors consistently
            return {
                ok: false,
                status: error.message.includes('401') || error.message.includes('Unauthorized') ? 401 : 500,
                data: { error: error.message }
            };
        }
    };
}

export default apiClient;