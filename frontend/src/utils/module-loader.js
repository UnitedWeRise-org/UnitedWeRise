// Dynamic Module Loading and Code Splitting System
// Implements lazy loading, code splitting, and progressive module loading

class ModuleLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.criticalModules = new Set([
            'auth',
            'api',
            'config'
        ]);
        this.lazyModules = new Set([
            'admin',
            'payments',
            'candidate-system',
            'map',
            'photo-system',
            'messaging'
        ]);
    }

    // Load module dynamically with caching
    async loadModule(moduleName, force = false) {
        // Return cached module if already loaded
        if (!force && this.loadedModules.has(moduleName)) {
            console.log(`📦 Module '${moduleName}' loaded from cache`);
            return this.loadedModules.get(moduleName);
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(moduleName)) {
            console.log(`⏳ Module '${moduleName}' already loading...`);
            return this.loadingPromises.get(moduleName);
        }

        // Create loading promise
        const loadingPromise = this.loadModuleFromPath(moduleName);
        this.loadingPromises.set(moduleName, loadingPromise);

        try {
            const module = await loadingPromise;

            // Cache successful load
            this.loadedModules.set(moduleName, module);
            this.loadingPromises.delete(moduleName);

            console.log(`✅ Module '${moduleName}' loaded successfully`);
            return module;

        } catch (error) {
            // Clean up failed load
            this.loadingPromises.delete(moduleName);
            console.error(`❌ Failed to load module '${moduleName}':`, error);
            throw error;
        }
    }

    // Load module from file path
    async loadModuleFromPath(moduleName) {
        const moduleConfig = this.getModuleConfig(moduleName);

        if (!moduleConfig) {
            throw new Error(`Unknown module: ${moduleName}`);
        }

        // Show loading indicator for non-critical modules
        if (!this.criticalModules.has(moduleName)) {
            this.showModuleLoadingIndicator(moduleName);
        }

        try {
            // Load the module script
            if (moduleConfig.type === 'script') {
                await this.loadScript(moduleConfig.path);

                // Return the global object that the script creates
                const moduleObject = window[moduleConfig.globalName];
                if (!moduleObject) {
                    throw new Error(`Module ${moduleName} did not create expected global ${moduleConfig.globalName}`);
                }

                return moduleObject;
            }
            // Load as ES6 module (future enhancement)
            else if (moduleConfig.type === 'module') {
                const module = await import(moduleConfig.path);
                return module;
            }
            // Load as component
            else if (moduleConfig.type === 'component') {
                await this.loadScript(moduleConfig.path);
                return { loaded: true, name: moduleName };
            }

        } finally {
            // Hide loading indicator
            if (!this.criticalModules.has(moduleName)) {
                this.hideModuleLoadingIndicator(moduleName);
            }
        }
    }

    // Get module configuration
    getModuleConfig(moduleName) {
        const moduleConfigs = {
            // Core modules (always needed)
            'auth': {
                path: '/src/modules/core/auth/unified-manager.js',
                type: 'script',
                globalName: 'AuthManager',
                critical: true
            },
            'api': {
                path: '/src/modules/core/api/client.js',
                type: 'script',
                globalName: 'ApiClient',
                critical: true
            },

            // Feature modules (lazy loaded)
            'admin': {
                path: '/src/components/AdminSystem.js',
                type: 'component',
                dependencies: ['auth']
            },
            // 'payments' now handled by ES6 module system in main.js
            'candidate-system': {
                path: '/src/components/CandidateSystem.js',
                type: 'component',
                dependencies: ['auth']
            },
            'map': {
                path: '/src/js/map-maplibre.js',
                type: 'script',
                globalName: 'MapSystem'
            },
            'photo-system': {
                path: '/src/components/PhotoSystem.js',
                type: 'component',
                dependencies: ['auth']
            },
            'messaging': {
                path: '/src/components/MessagingSystem.js',
                type: 'component',
                dependencies: ['auth']
            },
            'search': {
                path: '/src/modules/features/search/global-search.js',
                type: 'script',
                globalName: 'GlobalSearch'
            },
            'feed': {
                path: '/src/modules/features/feed/my-feed.js',
                type: 'script',
                globalName: 'MyFeed',
                dependencies: ['auth']
            },
            'profile': {
                path: '/src/components/Profile.js',
                type: 'component',
                dependencies: ['auth']
            },
            'onboarding': {
                path: '/src/components/OnboardingFlow.js',
                type: 'component'
            }
        };

        return moduleConfigs[moduleName];
    }

    // Load JavaScript file dynamically
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            script.onload = () => {
                console.log(`📜 Script loaded: ${src}`);
                resolve();
            };

            script.onerror = () => {
                console.error(`❌ Failed to load script: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });
    }

    // Load module with dependencies
    async loadModuleWithDependencies(moduleName) {
        const moduleConfig = this.getModuleConfig(moduleName);

        if (!moduleConfig) {
            throw new Error(`Unknown module: ${moduleName}`);
        }

        // Load dependencies first
        if (moduleConfig.dependencies) {
            console.log(`🔗 Loading dependencies for ${moduleName}:`, moduleConfig.dependencies);

            const dependencyPromises = moduleConfig.dependencies.map(dep =>
                this.loadModule(dep)
            );

            await Promise.all(dependencyPromises);
        }

        // Load the main module
        return this.loadModule(moduleName);
    }

    // Preload critical modules
    async preloadCriticalModules() {
        console.log('🚀 Preloading critical modules...');

        const criticalModulePromises = Array.from(this.criticalModules).map(async moduleName => {
            try {
                await this.loadModule(moduleName);
                console.log(`✅ Critical module loaded: ${moduleName}`);
            } catch (error) {
                console.error(`❌ Failed to load critical module ${moduleName}:`, error);
            }
        });

        await Promise.allSettled(criticalModulePromises);
        console.log('🎉 Critical modules preload complete');
    }

    // Lazy load modules when needed
    async lazyLoadModulesForRoute(route) {
        const routeModules = this.getModulesForRoute(route);

        if (routeModules.length === 0) return;

        console.log(`🎯 Lazy loading modules for route '${route}':`, routeModules);

        const loadPromises = routeModules.map(moduleName =>
            this.loadModuleWithDependencies(moduleName)
        );

        try {
            await Promise.all(loadPromises);
            console.log(`✅ All modules loaded for route: ${route}`);
        } catch (error) {
            console.error(`❌ Failed to load modules for route ${route}:`, error);
            throw error;
        }
    }

    // Get modules needed for specific routes
    getModulesForRoute(route) {
        const routeToModules = {
            '/admin': ['admin'],
            '/admin-dashboard.html': ['admin'],
            // '/donate' - donation system now always available via ES6 modules
            '/candidate-registration': ['candidate-system'],
            '/candidate-profile': ['candidate-system'],
            '/map': ['map'],
            '/my-profile': ['profile', 'photo-system'],
            '/messaging': ['messaging'],
            '/search': ['search'],
            '/feed': ['feed'],
            '/onboarding': ['onboarding']
        };

        return routeToModules[route] || [];
    }

    // Show loading indicator for module
    showModuleLoadingIndicator(moduleName) {
        const indicator = document.createElement('div');
        indicator.id = `module-loading-${moduleName}`;
        indicator.className = 'module-loading-indicator';
        indicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading ${moduleName}...</div>
            </div>
        `;

        document.body.appendChild(indicator);
    }

    // Hide loading indicator
    hideModuleLoadingIndicator(moduleName) {
        const indicator = document.getElementById(`module-loading-${moduleName}`);
        if (indicator) {
            indicator.remove();
        }
    }

    // Get loading statistics
    getLoadingStats() {
        return {
            loadedModules: this.loadedModules.size,
            loadingModules: this.loadingPromises.size,
            loadedModuleNames: Array.from(this.loadedModules.keys()),
            loadingModuleNames: Array.from(this.loadingPromises.keys())
        };
    }

    // Clear module cache (for development)
    clearCache() {
        this.loadedModules.clear();
        this.loadingPromises.clear();
        console.log('🧹 Module cache cleared');
    }

    // Prefetch modules for better UX
    prefetchModulesForLikelyRoutes() {
        // Prefetch commonly accessed modules after initial load
        setTimeout(() => {
            const commonModules = ['search', 'profile'];
            commonModules.forEach(moduleName => {
                this.loadModule(moduleName).catch(error => {
                    console.warn(`⚠️ Prefetch failed for ${moduleName}:`, error);
                });
            });
        }, 2000);
    }
}

// CSS for module loading indicators
const moduleLoadingCSS = `
    .module-loading-indicator {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        backdrop-filter: blur(5px);
    }

    .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #2196F3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-text {
        color: #666;
        font-weight: 500;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Hide content while critical modules load */
    body.modules-loading .main-content {
        opacity: 0.3;
        pointer-events: none;
    }

    body.modules-ready .main-content {
        opacity: 1;
        pointer-events: auto;
        transition: opacity 0.3s ease;
    }
`;

// Route-based module loading
class RouteBasedLoader {
    constructor(moduleLoader) {
        this.moduleLoader = moduleLoader;
        this.currentRoute = window.location.pathname;
        this.setupRouteHandling();
    }

    setupRouteHandling() {
        // Handle initial route
        this.handleRouteChange(this.currentRoute);

        // Handle browser navigation
        window.addEventListener('popstate', () => {
            const newRoute = window.location.pathname;
            if (newRoute !== this.currentRoute) {
                this.currentRoute = newRoute;
                this.handleRouteChange(newRoute);
            }
        });

        // Handle link clicks for SPA navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.isInternalLink(link.href)) {
                const route = new URL(link.href).pathname;
                if (route !== this.currentRoute) {
                    // Preload modules for the destination route
                    this.moduleLoader.lazyLoadModulesForRoute(route).catch(error => {
                        console.warn('Failed to preload modules for route:', error);
                    });
                }
            }
        });
    }

    handleRouteChange(route) {
        console.log(`🗺️ Route changed to: ${route}`);

        // Load modules for this route
        this.moduleLoader.lazyLoadModulesForRoute(route).catch(error => {
            console.error('Failed to load modules for route:', error);
        });
    }

    isInternalLink(href) {
        try {
            const url = new URL(href);
            return url.hostname === window.location.hostname;
        } catch {
            return true; // Relative URLs
        }
    }
}

// Initialize module loading system
function initializeModuleLoading() {
    // Add CSS
    if (!document.getElementById('module-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'module-loading-styles';
        style.textContent = moduleLoadingCSS;
        document.head.appendChild(style);
    }

    // Create module loader
    const moduleLoader = new ModuleLoader();

    // Set loading state
    document.body.classList.add('modules-loading');

    // Load critical modules first
    moduleLoader.preloadCriticalModules().then(() => {
        document.body.classList.remove('modules-loading');
        document.body.classList.add('modules-ready');

        // Setup route-based loading
        new RouteBasedLoader(moduleLoader);

        // Start prefetching
        moduleLoader.prefetchModulesForLikelyRoutes();

    }).catch(error => {
        console.error('Failed to load critical modules:', error);
        document.body.classList.remove('modules-loading');
    });

    // Export for global access
    window.moduleLoader = moduleLoader;

    return moduleLoader;
}

// Utility functions for components
window.loadModule = async function(moduleName) {
    if (!window.moduleLoader) {
        console.error('Module loader not initialized');
        return null;
    }

    return window.moduleLoader.loadModuleWithDependencies(moduleName);
};

window.requireModule = function(moduleName) {
    return window.loadModule(moduleName);
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModuleLoading);
} else {
    initializeModuleLoading();
}

console.log('📦 Module loading system initialized');