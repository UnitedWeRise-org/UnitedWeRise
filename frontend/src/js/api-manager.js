/**
 * @module js/api-manager
 * @description Advanced API Request Manager with retry, deduplication, and caching
 *
 * Provides centralized API communication with:
 * - Automatic retry with exponential backoff
 * - Request deduplication (prevents duplicate simultaneous requests)
 * - Response caching
 * - Batch request support
 *
 * Migrated to ES6 modules: October 11, 2025 (Batch 3)
 * Bug fix: apiCall now uses apiManager.request() instead of raw fetch()
 */

// Advanced API Request Manager for United We Rise
// Implements request deduplication, caching, and intelligent batching

class APIRequestManager {
    constructor() {
        this.pendingRequests = new Map();
        this.cache = new Map();
        this.batchQueue = new Map();
        this.batchTimer = null;
        this.config = {
            cacheTimeout: 30000, // 30 seconds default cache
            batchDelay: 100, // 100ms batching window
            maxRetries: 3,
            retryDelay: 1000
        };
        
        // Track request frequency for smart rate limiting
        this.requestHistory = new Map();
        this.burstTracker = {
            count: 0,
            windowStart: Date.now(),
            windowSize: 60000 // 1 minute windows
        };
    }

    // Main request method with deduplication and caching
    async request(endpoint, options = {}) {
        const key = this.createRequestKey(endpoint, options);

        // Check if request is already pending (silent deduplication)
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Check cache if not bypassed (silent cache hit)
        if (!options.bypassCache) {
            const cached = this.getFromCache(key);
            if (cached) {
                return cached;
            }
        }
        
        // Track request frequency
        this.trackRequest(endpoint);
        
        // Create and track the request
        const promise = this.executeRequest(endpoint, options);
        this.pendingRequests.set(key, promise);
        
        try {
            const result = await promise;
            this.setCache(key, result, options.cacheTimeout);
            return result;
        } catch (error) {
            // Don't cache errors
            throw error;
        } finally {
            this.pendingRequests.delete(key);
        }
    }

    // Batch multiple requests together
    async batchRequest(requests) {
        // Silent batching of multiple requests

        const batchKey = `batch_${Date.now()}`;

        // Check cache for individual requests first
        const results = new Map();
        const uncachedRequests = [];

        for (const req of requests) {
            const key = this.createRequestKey(req.endpoint, req.options);
            const cached = this.getFromCache(key);
            if (cached && !req.options?.bypassCache) {
                results.set(req.id || req.endpoint, cached);
            } else {
                uncachedRequests.push(req);
            }
        }

        // If all requests were cached, return immediately (silent cache hit)
        if (uncachedRequests.length === 0) {
            return results;
        }
        
        // Execute remaining requests
        try {
            const batchResults = await Promise.allSettled(
                uncachedRequests.map(req => this.executeRequest(req.endpoint, req.options))
            );
            
            // Process results and update cache
            batchResults.forEach((result, index) => {
                const req = uncachedRequests[index];
                const key = this.createRequestKey(req.endpoint, req.options);
                
                if (result.status === 'fulfilled') {
                    this.setCache(key, result.value, req.options?.cacheTimeout);
                    results.set(req.id || req.endpoint, result.value);
                } else {
                    adminDebugError('APIManager', `Batch request failed: ${req.endpoint}`, result.reason);
                    results.set(req.id || req.endpoint, { error: result.reason });
                }
            });
            
            return results;
        } catch (error) {
            adminDebugError('APIManager', 'Batch request failed', error);
            throw error;
        }
    }

    // Execute the actual HTTP request with retry logic
    async executeRequest(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const fetchOptions = this.buildFetchOptions(options);
        
        let lastError;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                // Execute request (silent during normal operation)
                const response = await fetch(url, fetchOptions);

                if (!response.ok) {
                    // Handle rate limiting with exponential backoff
                    if (response.status === 429) {
                        const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
                        await adminDebugWarn('APIManager', `Rate limited, backing off for ${retryAfter}s`);

                        if (attempt < this.config.maxRetries) {
                            await this.delay(retryAfter * 1000);
                            continue;
                        }
                    }

                    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
                    const error = new Error(errorData.error || `HTTP ${response.status}`);
                    error.status = response.status; // Attach status code for retry logic
                    throw error;
                }

                const data = await response.json();
                return data;

            } catch (error) {
                lastError = error;
                await adminDebugWarn('APIManager', `API Request failed (attempt ${attempt + 1}): ${endpoint}`, error.message);

                // Don't retry 4xx client errors (400-499) - these will never succeed on retry
                // Only retry network errors (no status) or 5xx server errors (500-599)
                if (error.status && error.status >= 400 && error.status < 500) {
                    break; // Exit retry loop immediately for client errors (silent)
                }

                if (attempt < this.config.maxRetries) {
                    await this.delay(this.config.retryDelay * Math.pow(2, attempt));
                }
            }
        }
        
        throw lastError;
    }

    // Smart request frequency tracking
    trackRequest(endpoint) {
        const now = Date.now();
        
        // Reset burst window if needed
        if (now - this.burstTracker.windowStart > this.burstTracker.windowSize) {
            this.burstTracker.count = 0;
            this.burstTracker.windowStart = now;
        }
        
        this.burstTracker.count++;
        
        // Track per-endpoint frequency
        if (!this.requestHistory.has(endpoint)) {
            this.requestHistory.set(endpoint, []);
        }
        
        const history = this.requestHistory.get(endpoint);
        history.push(now);
        
        // Keep only last 10 minutes of history
        const tenMinutesAgo = now - 600000;
        this.requestHistory.set(endpoint, history.filter(time => time > tenMinutesAgo));
        
        // Log potential excessive usage
        if (this.burstTracker.count > 20) {
            if (typeof adminDebugWarn !== 'undefined') {
                adminDebugWarn('APIManager', `High request frequency detected: ${this.burstTracker.count} requests in 1 minute`);
            }
        }
    }

    // Cache management
    createRequestKey(endpoint, options) {
        const keyParts = [endpoint];
        if (options.method) keyParts.push(options.method);
        if (options.body) keyParts.push(btoa(JSON.stringify(options.body)).slice(0, 20));
        return keyParts.join('_');
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.timeout) {
            return cached.data;
        }
        if (cached) {
            this.cache.delete(key); // Remove expired cache
        }
        return null;
    }

    setCache(key, data, timeout = this.config.cacheTimeout) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            timeout: timeout
        });
        
        // Clean old cache entries periodically
        if (this.cache.size > 100) {
            this.cleanExpiredCache();
        }
    }

    cleanExpiredCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > cached.timeout) {
                this.cache.delete(key);
            }
        }
    }

    // Helper methods
    buildURL(endpoint) {
        const API_BASE = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://api.unitedwerise.org/api';
        
        return endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    }

    buildFetchOptions(options) {
        const headers = {
            ...options.headers
        };

        // Only set Content-Type for JSON requests (not multipart uploads)
        if (!options.skipContentType && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        // NEW: Add CSRF token for state-changing requests
        const csrfToken = this.getCSRFToken();
        if (csrfToken && options.method && options.method !== 'GET') {
            headers['X-CSRF-Token'] = csrfToken;
        }

        // Authentication handled by httpOnly cookies automatically

        // Build the fetch options object
        // IMPORTANT: Don't spread ...options at the end to avoid overriding the stringified body
        const fetchOptions = {
            method: options.method || 'GET',
            headers,
            credentials: 'include', // CRITICAL: Include cookies
        };

        // Add body if present, ensuring proper JSON stringification
        if (options.body) {
            fetchOptions.body = options.body instanceof FormData
                ? options.body
                // Only stringify if not already a string (prevent double-stringification)
                : typeof options.body === 'string'
                    ? options.body
                    : JSON.stringify(options.body);
        }

        // Add any other options that aren't method, headers, credentials, or body
        const { method, headers: _h, credentials, body, ...otherOptions } = options;
        Object.assign(fetchOptions, otherOptions);

        return fetchOptions;
    }

    // Get CSRF token from memory or cookie
    getCSRFToken() {
        // Try memory first
        if (window.csrfToken) return window.csrfToken;
        
        // Try cookie (non-httpOnly)
        const match = document.cookie.match(/csrf-token=([^;]+)/);
        return match ? match[1] : null;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get request statistics
    getStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const fiveMinutesAgo = now - 300000;
        
        let recentRequests = 0;
        let veryRecentRequests = 0;
        
        for (const history of this.requestHistory.values()) {
            recentRequests += history.filter(time => time > fiveMinutesAgo).length;
            veryRecentRequests += history.filter(time => time > oneMinuteAgo).length;
        }
        
        return {
            cacheSize: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            recentRequests: recentRequests,
            veryRecentRequests: veryRecentRequests,
            burstCount: this.burstTracker.count
        };
    }

    // Clear all caches and pending requests
    reset() {
        this.cache.clear();
        this.pendingRequests.clear();
        this.requestHistory.clear();
        this.burstTracker = {
            count: 0,
            windowStart: Date.now(),
            windowSize: 60000
        };
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('APIManager', 'API Manager reset');
        }
    }
}

// Create global instance
window.apiManager = new APIRequestManager();

// Enhanced apiCall function for backward compatibility
// Wraps the response in the expected format: {ok, status, data}
// BUG FIX (Oct 11, 2025): Now uses apiManager.request() instead of raw fetch()
// This enables retry logic, request deduplication, and caching
async function apiCall(endpoint, options = {}) {
    try {
        // Use the apiManager's advanced request method (retry, dedup, cache)
        const response = await window.apiManager.request(endpoint, {
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body,
            bypassCache: options.bypassCache,
            cacheTimeout: options.cacheTimeout,
            skipContentType: options.skipContentType
        });

        // apiManager.request() returns parsed JSON data directly
        // Wrap it in the expected {ok, status, data} format
        return {
            ok: true,
            status: 200,
            data: response
        };
    } catch (error) {
        // Return error in consistent format
        console.error('apiCall error:', error);
        return {
            ok: false,
            status: error.status || 500,
            data: null,
            error: error.message
        };
    }
}

// Batch API call function
async function apiBatch(requests) {
    return window.apiManager.batchRequest(requests);
}

if (typeof adminDebugLog !== 'undefined') {
    adminDebugLog('APIManager', 'Advanced API Manager initialized');
}

/**
 * ES6 Module Exports
 * Migrated to ES6 modules: October 11, 2025 (Batch 3)
 */

// Export the apiCall function
export { apiCall };

// Export batch function
export { apiBatch };

// Export the APIRequestManager class
export { APIRequestManager };

// Export singleton instance
const apiManager = window.apiManager;
export { apiManager };

// Default export
export default apiManager;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.apiCall = apiCall;
    window.apiBatch = apiBatch;
    window.apiManager = apiManager;
}