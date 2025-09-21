// Frontend Performance Optimization Utilities
// Implements caching, retry mechanisms, and loading states

class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.loadingStates = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Smart caching with TTL
    setCache(key, data, ttl = this.cacheTimeout) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { data, expiry });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    // Enhanced API call with caching and retry
    async apiCallWithCache(apiCall, endpoint, options = {}) {
        const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
        const useCache = options.useCache !== false;
        const showLoading = options.showLoading !== false;

        // Check cache first
        if (useCache) {
            const cached = this.getCache(cacheKey);
            if (cached) {
                console.log(`📦 Cache hit for ${endpoint}`);
                return cached;
            }
        }

        // Check if already loading
        if (this.loadingStates.has(cacheKey)) {
            console.log(`⏳ Request already in progress for ${endpoint}`);
            return this.loadingStates.get(cacheKey);
        }

        // Show loading state
        if (showLoading && options.loadingElement) {
            this.showLoadingState(options.loadingElement);
        }

        // Create the request promise
        const requestPromise = this.executeWithRetry(apiCall, endpoint, options);

        // Store the promise to prevent duplicate requests
        this.loadingStates.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;

            // Cache successful results
            if (result && result.ok && useCache) {
                this.setCache(cacheKey, result, options.cacheTTL);
            }

            return result;

        } catch (error) {
            console.error(`❌ API call failed for ${endpoint}:`, error);
            throw error;

        } finally {
            // Clean up loading state
            this.loadingStates.delete(cacheKey);

            // Hide loading state
            if (showLoading && options.loadingElement) {
                this.hideLoadingState(options.loadingElement);
            }
        }
    }

    // Retry mechanism with exponential backoff
    async executeWithRetry(apiCall, endpoint, options) {
        const retryKey = endpoint;
        let attempts = this.retryAttempts.get(retryKey) || 0;

        try {
            const result = await apiCall(endpoint, options);

            // Reset retry count on success
            this.retryAttempts.delete(retryKey);

            return result;

        } catch (error) {
            attempts++;
            this.retryAttempts.set(retryKey, attempts);

            // Retry if under limit and error is retryable
            if (attempts < this.maxRetries && this.isRetryableError(error)) {
                const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
                console.log(`🔄 Retrying ${endpoint} in ${delay}ms (attempt ${attempts}/${this.maxRetries})`);

                await this.delay(delay);
                return this.executeWithRetry(apiCall, endpoint, options);
            }

            // Max retries reached or non-retryable error
            this.retryAttempts.delete(retryKey);
            throw error;
        }
    }

    // Determine if error is worth retrying
    isRetryableError(error) {
        // Network errors, timeouts, 5xx server errors
        if (!error.status) return true; // Network error
        return error.status >= 500 && error.status < 600;
    }

    // Loading state management
    showLoadingState(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (element) {
            element.classList.add('loading');

            // Add skeleton if not already present
            if (!element.querySelector('.skeleton-loader')) {
                const skeleton = document.createElement('div');
                skeleton.className = 'skeleton-loader';
                skeleton.innerHTML = `
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                `;
                element.appendChild(skeleton);
            }
        }
    }

    hideLoadingState(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (element) {
            element.classList.remove('loading');

            // Remove skeleton
            const skeleton = element.querySelector('.skeleton-loader');
            if (skeleton) {
                skeleton.remove();
            }
        }
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Preload critical content
    async preloadCriticalContent() {
        const criticalEndpoints = [
            '/auth/me',
            '/trending/topics',
            '/officials'
        ];

        console.log('🚀 Preloading critical content...');

        const preloadPromises = criticalEndpoints.map(async endpoint => {
            try {
                await this.apiCallWithCache(window.apiCall, endpoint, {
                    useCache: true,
                    showLoading: false,
                    cacheTTL: 10 * 60 * 1000 // 10 minutes for critical content
                });
                console.log(`✅ Preloaded ${endpoint}`);
            } catch (error) {
                console.warn(`⚠️ Failed to preload ${endpoint}:`, error);
            }
        });

        await Promise.allSettled(preloadPromises);
        console.log('🎉 Critical content preload complete');
    }

    // Cache warming for user-specific content
    async warmUserCache(userId) {
        if (!userId) return;

        const userEndpoints = [
            `/users/${userId}/complete`,
            `/feed`,
            `/notifications`
        ];

        console.log(`🔥 Warming cache for user ${userId}...`);

        userEndpoints.forEach(endpoint => {
            // Fire and forget - don't await these
            this.apiCallWithCache(window.apiCall, endpoint, {
                useCache: true,
                showLoading: false,
                cacheTTL: 3 * 60 * 1000 // 3 minutes for user content
            }).catch(error => {
                console.warn(`⚠️ Cache warming failed for ${endpoint}:`, error);
            });
        });
    }

    // Performance monitoring
    measurePerformance(name, fn) {
        return async function(...args) {
            const start = performance.now();
            try {
                const result = await fn.apply(this, args);
                const duration = performance.now() - start;

                console.log(`⏱️ ${name} took ${duration.toFixed(2)}ms`);

                // Log slow operations
                if (duration > 1000) {
                    console.warn(`🐌 Slow operation detected: ${name} (${duration.toFixed(2)}ms)`);
                }

                return result;
            } catch (error) {
                const duration = performance.now() - start;
                console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
                throw error;
            }
        };
    }

    // Clear cache (for logout, etc.)
    clearCache() {
        this.cache.clear();
        this.loadingStates.clear();
        this.retryAttempts.clear();
        console.log('🧹 Performance cache cleared');
    }

    // Cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            activeLoading: this.loadingStates.size,
            retryingRequests: this.retryAttempts.size
        };
    }
}

// CSS for loading states and skeletons
const performanceCSS = `
    .loading {
        position: relative;
        pointer-events: none;
        opacity: 0.7;
    }

    .skeleton-loader {
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        margin: 0.5rem 0;
    }

    .skeleton-line {
        height: 1rem;
        background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
        margin: 0.5rem 0;
    }

    .skeleton-line.short {
        width: 60%;
    }

    @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* Error retry notification */
    .retry-notification {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: #ff9800;
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slide-in 0.3s ease;
    }

    @keyframes slide-in {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }

    /* Performance debug panel */
    .perf-debug {
        position: fixed;
        bottom: 1rem;
        left: 1rem;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.75rem;
        z-index: 999;
        display: none;
    }

    .perf-debug.show {
        display: block;
    }
`;

// Add CSS to document
function addPerformanceCSS() {
    if (!document.getElementById('performance-styles')) {
        const style = document.createElement('style');
        style.id = 'performance-styles';
        style.textContent = performanceCSS;
        document.head.appendChild(style);
    }
}

// Initialize performance optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Enhanced window.apiCall that uses performance optimization
function createOptimizedApiCall(originalApiCall) {
    return async function(endpoint, options = {}) {
        return performanceOptimizer.apiCallWithCache(originalApiCall, endpoint, options);
    };
}

// Performance debug panel
function createPerformanceDebugPanel() {
    let debugPanel = document.getElementById('perf-debug');
    if (!debugPanel) {
        debugPanel = document.createElement('div');
        debugPanel.id = 'perf-debug';
        debugPanel.className = 'perf-debug';
        document.body.appendChild(debugPanel);
    }

    // Update debug info every 2 seconds
    setInterval(() => {
        const stats = performanceOptimizer.getCacheStats();
        debugPanel.innerHTML = `
            Cache: ${stats.size} | Loading: ${stats.activeLoading} | Retrying: ${stats.retryingRequests}
        `;
    }, 2000);

    // Toggle debug panel with Ctrl+Shift+P
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            debugPanel.classList.toggle('show');
        }
    });
}

// Export for use
window.performanceOptimizer = performanceOptimizer;
window.createOptimizedApiCall = createOptimizedApiCall;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    addPerformanceCSS();
    createPerformanceDebugPanel();

    // Preload critical content after a short delay
    setTimeout(() => {
        performanceOptimizer.preloadCriticalContent();
    }, 1000);
});

console.log('🚀 Performance optimization utilities loaded');