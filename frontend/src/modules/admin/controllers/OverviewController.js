/**
 * OverviewController - Handles admin dashboard overview section
 * Extracted from admin-dashboard.html overview functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.4 of comprehensive modularization project
 */

class OverviewController {
    constructor() {
        this.sectionId = 'overview';
        this.isInitialized = false;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.render = this.render.bind(this);
        this.displayPerformanceMetrics = this.displayPerformanceMetrics.bind(this);
        this.displayHealthStatus = this.displayHealthStatus.bind(this);
    }

    /**
     * Initialize the overview controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for overview
            if (window.AdminState) {
                window.AdminState.displayOverviewData = this.displayOverviewData.bind(this);
                window.AdminState.displayPerformanceMetrics = this.displayPerformanceMetrics.bind(this);
                window.AdminState.displayHealthStatus = this.displayHealthStatus.bind(this);
            }

            // Set up event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadData();

            this.isInitialized = true;

            await adminDebugLog('OverviewController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing OverviewController:', error);
            await adminDebugError('OverviewController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for overview section
     */
    setupEventListeners() {
        // Add refresh button handler if not already handled globally
        const refreshBtn = document.getElementById('refreshOverviewBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadData(false); // Force fresh data
            });
        }

        // Set up any other overview-specific interactions
        this.setupStatCardInteractions();
    }

    /**
     * Set up stat card interactions
     */
    setupStatCardInteractions() {
        const statCards = document.querySelectorAll('#overview .stat-card');
        statCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const cardType = card.dataset.type;
                if (cardType) {
                    this.handleStatCardClick(cardType);
                }
            });
        });
    }

    /**
     * Handle stat card clicks for navigation
     */
    handleStatCardClick(cardType) {
        switch(cardType) {
            case 'users':
                this.navigateToSection('users');
                break;
            case 'posts':
                this.navigateToSection('content');
                break;
            case 'reports':
                this.navigateToSection('reports');
                break;
            default:
                console.log(`Stat card clicked: ${cardType}`);
        }
    }

    /**
     * Navigate to another admin section
     */
    navigateToSection(sectionId) {
        if (typeof showSection === 'function') {
            showSection(sectionId);
        } else if (window.AdminNavigation) {
            window.AdminNavigation.showSection(sectionId);
        }
    }

    /**
     * Load overview data
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                await window.AdminState.loadOverviewData(useCache);
            } else {
                console.warn('AdminState not available, falling back to direct API calls');
                await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading overview data:', error);
            this.showError('Failed to load overview data');
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            const data = await window.AdminAPI.getDashboardStats();
            await this.displayOverviewData(data);

            const health = await window.AdminAPI.healthCheck();
            if (health.healthy) {
                this.displayHealthStatus(health.data);
            }
        } catch (error) {
            console.error('Fallback data loading failed:', error);
            throw error;
        }
    }

    /**
     * Display overview data in the UI
     */
    async displayOverviewData(data) {
        try {
            if (!data || !data.overview) {
                console.warn('No overview data available');
                return;
            }

            const overview = data.overview;

            // Update statistics cards
            this.updateStatCard('totalUsers', overview.totalUsers || 0);
            this.updateStatCard('activeUsers', overview.activeUsers || 0);
            this.updateStatCard('totalPosts', overview.totalPosts || 0);
            this.updateStatCard('pendingReports', overview.pendingReports || 0);

            // Display performance metrics if available
            if (data.performance) {
                await this.displayPerformanceMetrics(data.performance);
            }

            // Update last refresh time
            this.updateLastRefreshTime();

            await adminDebugLog('OverviewController', 'Overview data displayed', {
                totalUsers: overview.totalUsers,
                activeUsers: overview.activeUsers,
                totalPosts: overview.totalPosts,
                pendingReports: overview.pendingReports
            });

        } catch (error) {
            console.error('Error displaying overview data:', error);
            await adminDebugError('OverviewController', 'Failed to display overview data', error);
        }
    }

    /**
     * Update individual stat card
     */
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Add animation class
            element.classList.add('stat-updating');

            // Update value with number formatting
            element.textContent = this.formatNumber(value);

            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove('stat-updating');
            }, 300);
        } else {
            console.warn(`Stat card element not found: ${elementId}`);
        }
    }

    /**
     * Format numbers for display
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Display performance metrics
     */
    async displayPerformanceMetrics(metrics) {
        try {
            const metricsContainer = document.getElementById('performanceMetrics');
            if (!metricsContainer) {
                console.warn('Performance metrics container not found');
                return;
            }

            const metricsHtml = `
                <div class="metrics-grid">
                    <div class="metric-item">
                        <div class="metric-label">API Response Time</div>
                        <div class="metric-value">${metrics.avgResponseTime || 0}ms</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Active Sessions</div>
                        <div class="metric-value">${metrics.activeSessions || 0}</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Database Queries/min</div>
                        <div class="metric-value">${metrics.dbQueriesPerMin || 0}</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Memory Usage</div>
                        <div class="metric-value">${metrics.memoryUsage || 0}%</div>
                    </div>
                </div>
            `;

            metricsContainer.innerHTML = metricsHtml;

            await adminDebugLog('OverviewController', 'Performance metrics displayed', metrics);

        } catch (error) {
            console.error('Error displaying performance metrics:', error);
            await adminDebugError('OverviewController', 'Failed to display performance metrics', error);
        }
    }

    /**
     * Display health status
     */
    displayHealthStatus(health) {
        try {
            const healthContainer = document.getElementById('healthStatus');
            if (!healthContainer) {
                console.warn('Health status container not found');
                return;
            }

            const statusClass = health.status === 'healthy' ? 'status-healthy' : 'status-unhealthy';
            const uptimeFormatted = this.formatUptime(health.uptime || 0);

            const healthHtml = `
                <div class="health-status ${statusClass}">
                    <div class="health-indicator">
                        <div class="health-dot"></div>
                        <span class="health-text">${health.status || 'Unknown'}</span>
                    </div>
                    <div class="health-details">
                        <div class="health-item">
                            <span class="health-label">Uptime:</span>
                            <span class="health-value">${uptimeFormatted}</span>
                        </div>
                        <div class="health-item">
                            <span class="health-label">Version:</span>
                            <span class="health-value">${health.version || 'Unknown'}</span>
                        </div>
                        <div class="health-item">
                            <span class="health-label">Environment:</span>
                            <span class="health-value">${health.environment || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            `;

            healthContainer.innerHTML = healthHtml;

            await adminDebugLog('OverviewController', 'Health status displayed', {
                status: health.status,
                uptime: health.uptime,
                version: health.version
            });

        } catch (error) {
            console.error('Error displaying health status:', error);
            await adminDebugError('OverviewController', 'Failed to display health status', error);
        }
    }

    /**
     * Format uptime for display
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Update last refresh time display
     */
    updateLastRefreshTime() {
        const refreshTimeElement = document.getElementById('lastRefreshTime');
        if (refreshTimeElement) {
            const now = new Date();
            refreshTimeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('OverviewController Error:', message);

        const errorContainer = document.getElementById('overviewError');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Render the overview section (if building dynamically)
     */
    render() {
        // This method would be used if we were dynamically creating the HTML
        // For now, we assume the HTML exists and we're just managing the data
        console.log('OverviewController render called');
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        // Remove event listeners
        const refreshBtn = document.getElementById('refreshOverviewBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.loadData);
        }

        // Clear any intervals or timeouts
        // (None in this controller currently)

        this.isInitialized = false;

        console.log('OverviewController destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverviewController;
} else {
    window.OverviewController = OverviewController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.overviewController = new OverviewController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.overviewController = new OverviewController();
            }
        }, 100);
    });
}