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
        
        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            await adminDebugLog('APIManager', `Deduplicating request: ${endpoint}`);
            return this.pendingRequests.get(key);
        }
        
        // Check cache if not bypassed
        if (!options.bypassCache) {
            const cached = this.getFromCache(key);
            if (cached) {
                await adminDebugLog('APIManager', `Cache hit: ${endpoint}`);
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
        await adminDebugLog('APIManager', `Batching ${requests.length} requests`);
        
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
        
        // If all requests were cached, return immediately
        if (uncachedRequests.length === 0) {
            await adminDebugLog('APIManager', 'All batch requests cached');
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
                    await adminDebugError('APIManager', `Batch request failed: ${req.endpoint}`, result.reason);
                    results.set(req.id || req.endpoint, { error: result.reason });
                }
            });
            
            return results;
        } catch (error) {
            await adminDebugError('APIManager', 'Batch request failed', error);
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
                await adminDebugLog('APIManager', `API Request (attempt ${attempt + 1}): ${endpoint}`);
                
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
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }
                
                const data = await response.json();
                await adminDebugLog('APIManager', `API Success: ${endpoint}`);
                return data;
                
            } catch (error) {
                lastError = error;
                await adminDebugWarn('APIManager', `API Request failed (attempt ${attempt + 1}): ${endpoint}`, error.message);
                
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
            await adminDebugWarn('APIManager', `High request frequency detected: ${this.burstTracker.count} requests in 1 minute`);
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
        const API_BASE = (window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.protocol === 'file:')
            ? 'http://localhost:3001/api' 
            : 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
        
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
        
        // FALLBACK: Add auth token if available (for transition period)
        if (window.authToken) {
            headers['Authorization'] = `Bearer ${window.authToken}`;
        }
        
        return {
            method: options.method || 'GET',
            headers,
            credentials: 'include', // CRITICAL: Include cookies
            body: options.body instanceof FormData ? options.body : 
                  (options.body ? JSON.stringify(options.body) : undefined),
            ...options
        };
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
        await adminDebugLog('APIManager', 'API Manager reset');
    }
}

// Create global instance
window.apiManager = new APIRequestManager();

// Enhanced apiCall function for backward compatibility
window.apiCall = async (endpoint, options = {}) => {
    return window.apiManager.request(endpoint, options);
};

// Batch API call function
window.apiBatch = async (requests) => {
    return window.apiManager.batchRequest(requests);
};

if (typeof adminDebugLog !== 'undefined') {
    adminDebugLog('APIManager', 'Advanced API Manager initialized');
}