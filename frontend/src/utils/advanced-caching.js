/**
 * @module utils/advanced-caching
 * @description Advanced client-side caching system for modules, API responses, and user data
 * Migrated to ES6 modules: October 11, 2025 (Batch 1)
 */

// Advanced Client-Side Caching System
// Cache modules, API responses, and user data locally for faster performance

class AdvancedCaching {
    constructor() {
        this.cacheVersion = '1.0.0';
        this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.userCacheAge = 1 * 60 * 60 * 1000; // 1 hour for user data

        // Different storage types
        this.storage = {
            localStorage: window.localStorage,
            sessionStorage: window.sessionStorage,
            indexedDB: null, // We'll initialize this
            cache: null      // Service Worker cache
        };

        this.initializeAdvancedStorage();
    }

    async initializeAdvancedStorage() {
        // Initialize IndexedDB for large data
        try {
            this.storage.indexedDB = await this.openIndexedDB();
        } catch (error) {
            console.warn('IndexedDB not available:', error);
        }

        // Initialize Cache API for scripts and assets
        if ('caches' in window) {
            this.storage.cache = await caches.open(`uwr-cache-${this.cacheVersion}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🚀 MODULE CACHING (Your original idea - cache JavaScript files)
    // ═══════════════════════════════════════════════════════════════

    async cacheModule(moduleUrl, moduleCode) {
        try {
            // Cache in browser's Cache API (best for scripts)
            if (this.storage.cache) {
                const response = new Response(moduleCode, {
                    headers: {
                        'Content-Type': 'application/javascript',
                        'Cache-Control': 'max-age=604800' // 7 days
                    }
                });
                await this.storage.cache.put(moduleUrl, response);
                console.log(`📦 Cached module: ${moduleUrl}`);
            }

            // Fallback to localStorage for smaller modules
            if (moduleCode.length < 1000000) { // < 1MB
                const cacheItem = {
                    code: moduleCode,
                    cached: Date.now(),
                    version: this.cacheVersion
                };
                this.storage.localStorage.setItem(`module:${moduleUrl}`, JSON.stringify(cacheItem));
            }

        } catch (error) {
            console.warn(`Failed to cache module ${moduleUrl}:`, error);
        }
    }

    async getCachedModule(moduleUrl) {
        try {
            // Check Cache API first
            if (this.storage.cache) {
                const response = await this.storage.cache.match(moduleUrl);
                if (response) {
                    console.log(`🎯 Found cached module: ${moduleUrl}`);
                    return await response.text();
                }
            }

            // Fallback to localStorage
            const cached = this.storage.localStorage.getItem(`module:${moduleUrl}`);
            if (cached) {
                const cacheItem = JSON.parse(cached);

                // Check if cache is still valid
                if (Date.now() - cacheItem.cached < this.maxCacheAge &&
                    cacheItem.version === this.cacheVersion) {
                    console.log(`📂 Found cached module in localStorage: ${moduleUrl}`);
                    return cacheItem.code;
                }
            }

        } catch (error) {
            console.warn(`Failed to get cached module ${moduleUrl}:`, error);
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // 👤 USER DATA CACHING (Profile, preferences, etc.)
    // ═══════════════════════════════════════════════════════════════

    cacheUserData(userId, dataType, data) {
        try {
            const cacheKey = `user:${userId}:${dataType}`;
            const cacheItem = {
                data: data,
                cached: Date.now(),
                userId: userId,
                type: dataType
            };

            // Use sessionStorage for sensitive data (cleared when browser closes)
            if (dataType === 'profile' || dataType === 'preferences') {
                this.storage.sessionStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            }
            // Use localStorage for less sensitive data
            else {
                this.storage.localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            }

            console.log(`👤 Cached user data: ${dataType} for user ${userId}`);

        } catch (error) {
            console.warn('Failed to cache user data:', error);
        }
    }

    getCachedUserData(userId, dataType) {
        try {
            const cacheKey = `user:${userId}:${dataType}`;

            // Check sessionStorage first
            let cached = this.storage.sessionStorage.getItem(cacheKey);
            if (!cached) {
                cached = this.storage.localStorage.getItem(cacheKey);
            }

            if (cached) {
                const cacheItem = JSON.parse(cached);

                // Check if cache is still valid (shorter time for user data)
                if (Date.now() - cacheItem.cached < this.userCacheAge) {
                    console.log(`👤 Found cached user data: ${dataType}`);
                    return cacheItem.data;
                }
            }

        } catch (error) {
            console.warn('Failed to get cached user data:', error);
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🌐 API RESPONSE CACHING
    // ═══════════════════════════════════════════════════════════════

    cacheApiResponse(endpoint, response, ttl = 5 * 60 * 1000) { // 5 minutes default
        try {
            const cacheKey = `api:${endpoint}`;
            const cacheItem = {
                response: response,
                cached: Date.now(),
                ttl: ttl
            };

            this.storage.localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            console.log(`🌐 Cached API response: ${endpoint}`);

        } catch (error) {
            console.warn('Failed to cache API response:', error);
        }
    }

    getCachedApiResponse(endpoint) {
        try {
            const cacheKey = `api:${endpoint}`;
            const cached = this.storage.localStorage.getItem(cacheKey);

            if (cached) {
                const cacheItem = JSON.parse(cached);

                // Check if cache is still valid
                if (Date.now() - cacheItem.cached < cacheItem.ttl) {
                    console.log(`🌐 Found cached API response: ${endpoint}`);
                    return cacheItem.response;
                }
            }

        } catch (error) {
            console.warn('Failed to get cached API response:', error);
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // 📦 SMART MODULE LOADING WITH CACHING
    // ═══════════════════════════════════════════════════════════════

    async loadModuleWithCache(moduleUrl) {
        // Try to get from cache first
        let moduleCode = await this.getCachedModule(moduleUrl);

        if (moduleCode) {
            // Execute cached module
            console.log(`⚡ Using cached module: ${moduleUrl}`);
            this.executeModule(moduleCode);
            return;
        }

        // Not in cache, fetch from server
        console.log(`🌐 Fetching module: ${moduleUrl}`);
        try {
            const response = await fetch(moduleUrl);
            moduleCode = await response.text();

            // Cache for next time
            await this.cacheModule(moduleUrl, moduleCode);

            // Execute module
            this.executeModule(moduleCode);

        } catch (error) {
            console.error(`Failed to load module ${moduleUrl}:`, error);
            throw error;
        }
    }

    executeModule(moduleCode) {
        try {
            // Safely execute the module code
            const script = document.createElement('script');
            script.textContent = moduleCode;
            document.head.appendChild(script);
        } catch (error) {
            console.error('Failed to execute module:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🧹 CACHE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    clearExpiredCache() {
        const now = Date.now();
        const keysToRemove = [];

        // Check localStorage
        for (let i = 0; i < this.storage.localStorage.length; i++) {
            const key = this.storage.localStorage.key(i);

            try {
                const item = JSON.parse(this.storage.localStorage.getItem(key));

                // Remove if expired
                if (item.cached && (now - item.cached > this.maxCacheAge)) {
                    keysToRemove.push(key);
                }
            } catch (error) {
                // Invalid JSON, remove it
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            this.storage.localStorage.removeItem(key);
            console.log(`🗑️ Removed expired cache: ${key}`);
        });

        console.log(`🧹 Cache cleanup complete. Removed ${keysToRemove.length} expired items.`);
    }

    clearUserCache(userId) {
        const keysToRemove = [];

        for (let i = 0; i < this.storage.localStorage.length; i++) {
            const key = this.storage.localStorage.key(i);
            if (key.startsWith(`user:${userId}:`)) {
                keysToRemove.push(key);
            }
        }

        // Also clear sessionStorage
        for (let i = 0; i < this.storage.sessionStorage.length; i++) {
            const key = this.storage.sessionStorage.key(i);
            if (key.startsWith(`user:${userId}:`)) {
                this.storage.sessionStorage.removeItem(key);
            }
        }

        keysToRemove.forEach(key => {
            this.storage.localStorage.removeItem(key);
        });

        console.log(`🧹 Cleared cache for user ${userId}`);
    }

    getCacheStats() {
        const stats = {
            localStorage: {
                used: 0,
                items: 0
            },
            sessionStorage: {
                used: 0,
                items: 0
            },
            modules: 0,
            userData: 0,
            apiResponses: 0
        };

        // Analyze localStorage
        for (let i = 0; i < this.storage.localStorage.length; i++) {
            const key = this.storage.localStorage.key(i);
            const value = this.storage.localStorage.getItem(key);

            stats.localStorage.used += key.length + value.length;
            stats.localStorage.items++;

            if (key.startsWith('module:')) stats.modules++;
            if (key.startsWith('user:')) stats.userData++;
            if (key.startsWith('api:')) stats.apiResponses++;
        }

        // Analyze sessionStorage
        for (let i = 0; i < this.storage.sessionStorage.length; i++) {
            const key = this.storage.sessionStorage.key(i);
            const value = this.storage.sessionStorage.getItem(key);

            stats.sessionStorage.used += key.length + value.length;
            stats.sessionStorage.items++;
        }

        return stats;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔧 INDEXEDDB SETUP (for large data)
    // ═══════════════════════════════════════════════════════════════

    openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('UnitedWeRiseCache', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create stores for different types of data
                if (!db.objectStoreNames.contains('modules')) {
                    db.createObjectStore('modules', { keyPath: 'url' });
                }

                if (!db.objectStoreNames.contains('userData')) {
                    db.createObjectStore('userData', { keyPath: 'id' });
                }
            };
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 PRACTICAL USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════

// Initialize the caching system
const advancedCache = new AdvancedCaching();

// Example 1: Cache user profile when they log in
function cacheUserProfile(user) {
    advancedCache.cacheUserData(user.id, 'profile', {
        name: user.firstName + ' ' + user.lastName,
        email: user.email,
        avatar: user.avatarUrl,
        preferences: user.preferences
    });
}

// Example 2: Load modules with caching
async function loadMapWithCache() {
    await advancedCache.loadModuleWithCache('/src/js/map-maplibre.js');
    // Map loads instantly if cached, or downloads and caches if not
}

// Example 3: Cache API responses
async function getCachedPosts() {
    // Try cache first
    let posts = advancedCache.getCachedApiResponse('/api/feed');

    if (!posts) {
        // Not cached, fetch from server
        const response = await apiCall('/api/feed');
        posts = response.data;

        // Cache for 10 minutes
        advancedCache.cacheApiResponse('/api/feed', posts, 10 * 60 * 1000);
    }

    return posts;
}

// Example 4: Clear cache when user logs out
function handleLogout(userId) {
    advancedCache.clearUserCache(userId);
    // User's sensitive data is cleared from cache
}

// Automatic cache cleanup on startup
advancedCache.clearExpiredCache();

// ES6 Module Exports
export { AdvancedCaching, advancedCache };
export default advancedCache;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.advancedCache = advancedCache;
}

console.log('🚀 Advanced caching system loaded!');
console.log('📊 Cache stats:', advancedCache.getCacheStats());