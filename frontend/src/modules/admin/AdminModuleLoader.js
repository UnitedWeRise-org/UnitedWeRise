/**
 * AdminModuleLoader - Orchestrates loading of all admin modules
 * Replaces the monolithic admin-dashboard.html structure
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.4 completion - Module coordination and initialization
 */

class AdminModuleLoader {
    constructor() {
        this.modules = new Map();
        this.loadOrder = [
            'AdminGlobalUtils',
            'AdminTOTPModal',
            'AdminTabsManager',
            'AdminAPI',
            'AdminAuth',
            'AdminState',
            'OverviewController',
            'UsersController',
            'ContentController',
            'SecurityController',
            'ReportsController',
            'CandidatesController',
            'AnalyticsController',
            'AIInsightsController',
            'MOTDController',
            'DeploymentController',
            'SystemController',
            'ErrorsController',
            'ExternalCandidatesController',
            'CivicEngagementController'
        ];
        this.isInitialized = false;
        this.dependencies = {
            'AdminGlobalUtils': [],
            'AdminTOTPModal': [],
            'AdminTabsManager': [],
            'AdminAuth': ['unifiedLogin', 'adminDebugLog'],
            'AdminAPI': ['adminDebugLog'],
            'AdminState': ['AdminAPI', 'adminDebugLog'],
            'OverviewController': ['AdminAPI', 'AdminState', 'adminDebugLog'],
            'UsersController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'ContentController': ['AdminAPI', 'AdminState', 'adminDebugLog'],
            'SecurityController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'ReportsController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'CandidatesController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'AnalyticsController': ['AdminAPI', 'AdminState', 'adminDebugLog'],
            'AIInsightsController': ['AdminAPI', 'AdminState', 'adminDebugLog'],
            'MOTDController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'DeploymentController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'SystemController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'ErrorsController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation'],
            'ExternalCandidatesController': ['AdminAPI', 'AdminState', 'adminDebugLog', 'requestTOTPConfirmation']
        };

        // Bind methods
        this.init = this.init.bind(this);
        this.loadModule = this.loadModule.bind(this);
        this.checkDependencies = this.checkDependencies.bind(this);
    }

    /**
     * Initialize the admin module system
     */
    async init() {
        if (this.isInitialized) {
            console.warn('AdminModuleLoader already initialized');
            return;
        }

        try {
            console.log('🚀 Starting AdminModuleLoader initialization...');

            // Wait for core dependencies
            await this.waitForCoreDependencies();

            // Load modules in dependency order
            await this.loadModulesInOrder();

            // Set up global event handlers
            this.setupGlobalHandlers();

            // Initialize authentication flow
            await this.initializeAuthFlow();

            this.isInitialized = true;

            console.log('✅ AdminModuleLoader initialization complete');
            await adminDebugLog('AdminModuleLoader', 'All modules loaded and initialized successfully', {
                loadedModules: Array.from(this.modules.keys()),
                initializationTime: performance.now()
            });

        } catch (error) {
            console.error('❌ AdminModuleLoader initialization failed:', error);
            await adminDebugError('AdminModuleLoader', 'Initialization failed', error);
            throw error;
        }
    }

    /**
     * Wait for core dependencies to be available
     */
    async waitForCoreDependencies() {
        const maxWait = 10000; // 10 seconds
        const checkInterval = 100;
        let waited = 0;

        const coreDeps = [
            'adminDebugLog',
            'unifiedLogin',
            'unifiedLogout'
        ];

        return new Promise((resolve, reject) => {
            const checkDeps = () => {
                const missing = coreDeps.filter(dep => typeof window[dep] !== 'function');

                if (missing.length === 0) {
                    console.log('✅ Core dependencies available');
                    resolve();
                } else if (waited >= maxWait) {
                    console.error('❌ Timeout waiting for dependencies:', missing);
                    reject(new Error(`Missing dependencies: ${missing.join(', ')}`));
                } else {
                    waited += checkInterval;
                    setTimeout(checkDeps, checkInterval);
                }
            };

            checkDeps();
        });
    }

    /**
     * Load modules in dependency order
     */
    async loadModulesInOrder() {
        for (const moduleName of this.loadOrder) {
            try {
                await this.loadModule(moduleName);
                console.log(`✅ ${moduleName} loaded successfully`);
            } catch (error) {
                console.error(`❌ Failed to load ${moduleName}:`, error);
                throw error;
            }
        }
    }

    /**
     * Load and initialize a specific module
     */
    async loadModule(moduleName) {
        // Check if module dependencies are available
        if (!this.checkDependencies(moduleName)) {
            throw new Error(`Dependencies not available for ${moduleName}`);
        }

        // Module should already be loaded via script tags
        // We just need to initialize them
        switch (moduleName) {
            case 'AdminGlobalUtils':
                if (!window.AdminGlobalUtils) {
                    throw new Error('AdminGlobalUtils not found in global scope');
                }
                this.modules.set('AdminGlobalUtils', window.adminGlobalUtils);
                break;

            case 'AdminTOTPModal':
                if (!window.AdminTOTPModal) {
                    throw new Error('AdminTOTPModal not found in global scope');
                }
                this.modules.set('AdminTOTPModal', window.adminTOTPModal || new window.AdminTOTPModal());
                break;

            case 'AdminTabsManager':
                if (!window.AdminTabsManager) {
                    throw new Error('AdminTabsManager not found in global scope');
                }
                window.adminTabsManager = new window.AdminTabsManager();
                await window.adminTabsManager.init();
                this.modules.set('AdminTabsManager', window.adminTabsManager);
                break;

            case 'AdminAPI':
                if (!window.AdminAPI) {
                    throw new Error('AdminAPI not found in global scope');
                }
                this.modules.set('AdminAPI', window.AdminAPI);
                break;

            case 'AdminAuth':
                if (!window.AdminAuth) {
                    throw new Error('AdminAuth class not found in global scope');
                }
                window.adminAuth = new window.AdminAuth();
                this.modules.set('AdminAuth', window.adminAuth);
                break;

            case 'AdminState':
                if (!window.AdminState) {
                    throw new Error('AdminState not found in global scope');
                }
                this.modules.set('AdminState', window.AdminState);
                break;

            case 'OverviewController':
                if (!window.OverviewController) {
                    throw new Error('OverviewController class not found in global scope');
                }
                window.overviewController = new window.OverviewController();
                await window.overviewController.init();
                this.modules.set('OverviewController', window.overviewController);
                break;

            case 'UsersController':
                if (!window.UsersController) {
                    throw new Error('UsersController class not found in global scope');
                }
                window.usersController = new window.UsersController();
                await window.usersController.init();
                this.modules.set('UsersController', window.usersController);
                break;

            case 'ContentController':
                if (!window.ContentController) {
                    throw new Error('ContentController class not found in global scope');
                }
                window.contentController = new window.ContentController();
                await window.contentController.init();
                this.modules.set('ContentController', window.contentController);
                break;

            case 'SecurityController':
                if (!window.SecurityController) {
                    throw new Error('SecurityController class not found in global scope');
                }
                window.securityController = new window.SecurityController();
                await window.securityController.init();
                this.modules.set('SecurityController', window.securityController);
                break;

            case 'ReportsController':
                if (!window.ReportsController) {
                    throw new Error('ReportsController class not found in global scope');
                }
                window.reportsController = new window.ReportsController();
                await window.reportsController.init();
                this.modules.set('ReportsController', window.reportsController);
                break;

            case 'CandidatesController':
                if (!window.CandidatesController) {
                    throw new Error('CandidatesController class not found in global scope');
                }
                window.candidatesController = new window.CandidatesController();
                await window.candidatesController.init();
                this.modules.set('CandidatesController', window.candidatesController);
                break;

            case 'AnalyticsController':
                if (!window.AnalyticsController) {
                    throw new Error('AnalyticsController class not found in global scope');
                }
                window.analyticsController = new window.AnalyticsController();
                await window.analyticsController.init();
                this.modules.set('AnalyticsController', window.analyticsController);
                break;

            case 'AIInsightsController':
                if (!window.AIInsightsController) {
                    throw new Error('AIInsightsController class not found in global scope');
                }
                window.aiInsightsController = new window.AIInsightsController();
                await window.aiInsightsController.init();
                this.modules.set('AIInsightsController', window.aiInsightsController);
                break;

            case 'MOTDController':
                if (!window.MOTDController) {
                    throw new Error('MOTDController class not found in global scope');
                }
                window.motdController = new window.MOTDController();
                await window.motdController.init();
                this.modules.set('MOTDController', window.motdController);
                break;

            case 'DeploymentController':
                if (!window.DeploymentController) {
                    throw new Error('DeploymentController class not found in global scope');
                }
                window.deploymentController = new window.DeploymentController();
                await window.deploymentController.init();
                this.modules.set('DeploymentController', window.deploymentController);
                break;

            case 'SystemController':
                if (!window.SystemController) {
                    throw new Error('SystemController class not found in global scope');
                }
                window.systemController = new window.SystemController();
                await window.systemController.init();
                this.modules.set('SystemController', window.systemController);
                break;

            case 'ErrorsController':
                if (!window.ErrorsController) {
                    throw new Error('ErrorsController class not found in global scope');
                }
                window.errorsController = new window.ErrorsController();
                await window.errorsController.init();
                this.modules.set('ErrorsController', window.errorsController);
                break;

            case 'ExternalCandidatesController':
                if (!window.ExternalCandidatesController) {
                    throw new Error('ExternalCandidatesController class not found in global scope');
                }
                window.externalCandidatesController = new window.ExternalCandidatesController();
                await window.externalCandidatesController.init();
                this.modules.set('ExternalCandidatesController', window.externalCandidatesController);
                break;

            default:
                throw new Error(`Unknown module: ${moduleName}`);
        }
    }

    /**
     * Check if dependencies are available for a module
     */
    checkDependencies(moduleName) {
        const deps = this.dependencies[moduleName] || [];

        for (const dep of deps) {
            // Check if it's a module dependency
            if (this.modules.has(dep)) {
                continue;
            }

            // Check if it's a global function/object
            if (typeof window[dep] !== 'undefined') {
                continue;
            }

            console.warn(`Missing dependency for ${moduleName}: ${dep}`);
            return false;
        }

        return true;
    }

    /**
     * Set up global event handlers for admin dashboard
     */
    setupGlobalHandlers() {
        // Global refresh button
        const refreshBtn = document.getElementById('refreshAllBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (window.AdminState) {
                    window.AdminState.refreshAllData();
                }
            });
        }

        // Global logout button
        const logoutBtn = document.querySelector('button[data-action="logout"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.adminAuth) {
                    window.adminAuth.logout();
                }
            });
        }

        // Modal close buttons
        this.setupModalHandlers();

        // Section navigation
        this.setupSectionNavigation();

        console.log('✅ Global handlers set up');
    }

    /**
     * Set up modal handlers
     */
    setupModalHandlers() {
        // MOTD Editor close buttons
        const motdCloseButtons = document.querySelectorAll('[data-action="close-motd-editor"], [data-action="cancel-motd-editor"]');
        motdCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (window.motdController && window.motdController.hideMOTDEditor) {
                    window.motdController.hideMOTDEditor();
                }
            });
        });

        // Schedule modal close buttons
        const scheduleCloseButtons = document.querySelectorAll('[data-action="close-schedule-modal"], [data-action="cancel-schedule-modal"]');
        scheduleCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                const scheduleModal = document.getElementById('scheduleModal');
                if (scheduleModal) {
                    scheduleModal.style.display = 'none';
                }
            });
        });

        console.log('✅ Modal handlers set up');
    }

    /**
     * Set up section navigation handlers
     */
    setupSectionNavigation() {
        const navButtons = document.querySelectorAll('.nav-button[data-section]');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.dataset.section;
                this.showSection(sectionId);
            });
        });

        // Also handle legacy onclick attributes
        const legacyButtons = document.querySelectorAll('.nav-button[onclick*="showSection"]');
        legacyButtons.forEach(button => {
            const onclick = button.getAttribute('onclick');
            const match = onclick.match(/showSection\(['"]([^'"]+)['"]\)/);
            if (match) {
                const sectionId = match[1];
                button.removeAttribute('onclick');
                button.dataset.section = sectionId;
                button.addEventListener('click', () => {
                    this.showSection(sectionId);
                });
            }
        });
    }

    /**
     * Show a specific admin section
     */
    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation active state
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.section === sectionId ||
                button.getAttribute('onclick')?.includes(sectionId)) {
                button.classList.add('active');
            }
        });

        // Load data for the section
        if (window.AdminState) {
            window.AdminState.loadSectionData(sectionId);
        }

        // Make showSection available globally for legacy compatibility
        window.showSection = this.showSection.bind(this);

        console.log(`Switched to section: ${sectionId}`);
    }

    /**
     * Initialize authentication flow
     */
    async initializeAuthFlow() {
        if (window.adminAuth) {
            // Set up login form if not already done
            const loginForm = document.getElementById('loginForm');
            if (loginForm && !loginForm.dataset.listenerAttached) {
                loginForm.addEventListener('submit', window.adminAuth.handleLogin);
                loginForm.dataset.listenerAttached = 'true';
            }

            // Initialize authentication check
            await window.adminAuth.init();
        }
    }

    /**
     * Get a loaded module
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Check if all modules are loaded
     */
    isFullyLoaded() {
        return this.isInitialized && this.modules.size === this.loadOrder.length;
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            loadedModules: Array.from(this.modules.keys()),
            totalModules: this.loadOrder.length
        };
    }

    /**
     * Cleanup method for proper shutdown
     */
    destroy() {
        // Destroy all modules
        for (const [name, module] of this.modules) {
            if (module && typeof module.destroy === 'function') {
                try {
                    module.destroy();
                    console.log(`✅ ${name} destroyed`);
                } catch (error) {
                    console.error(`❌ Error destroying ${name}:`, error);
                }
            }
        }

        // Clear modules
        this.modules.clear();
        this.isInitialized = false;

        console.log('AdminModuleLoader destroyed');
    }
}

// Create global instance
window.AdminModuleLoader = AdminModuleLoader;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            window.adminModuleLoader = new AdminModuleLoader();
            await window.adminModuleLoader.init();
        } catch (error) {
            console.error('Failed to initialize admin modules:', error);
            alert('Admin dashboard failed to load. Please refresh the page.');
        }
    });
} else {
    // DOM already ready
    setTimeout(async () => {
        try {
            window.adminModuleLoader = new AdminModuleLoader();
            await window.adminModuleLoader.init();
        } catch (error) {
            console.error('Failed to initialize admin modules:', error);
            alert('Admin dashboard failed to load. Please refresh the page.');
        }
    }, 100);
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminModuleLoader;
}