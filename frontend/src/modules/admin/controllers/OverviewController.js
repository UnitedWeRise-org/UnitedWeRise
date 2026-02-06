/**
 * OverviewController - Handles admin dashboard overview section
 * Extracted from admin-dashboard.html overview functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.4 of comprehensive modularization project
 */

import { getEnvironment } from '../../../utils/environment.js';
import { validateEnvironmentConsistency } from '../../../js/deployment-status.js';

class OverviewController {
    constructor() {
        this.sectionId = 'overview';
        this.isInitialized = false;
        this.healthCheckInterval = null;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.render = this.render.bind(this);
        this.displayPerformanceMetrics = this.displayPerformanceMetrics.bind(this);
        this.displayHealthStatus = this.displayHealthStatus.bind(this);
        this.loadEnvironmentHealth = this.loadEnvironmentHealth.bind(this);
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

            // Load environment health
            await this.loadEnvironmentHealth();

            // Set up auto-refresh for environment health (every 30 seconds)
            this.healthCheckInterval = setInterval(() => {
                this.loadEnvironmentHealth();
            }, 30000);

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
     * Load comprehensive environment health information
     */
    async loadEnvironmentHealth() {
        try {
            // Get API base URL (without /api suffix for health endpoint)
            // Use regex to match only trailing /api, not /api in subdomain (e.g., dev-api)
            const apiBase = window.API_CONFIG?.BASE_URL?.replace(/\/api$/, '') || 'https://api.unitedwerise.org';
            const healthUrl = `${apiBase}/health`;

            console.log('🏥 Loading environment health from:', healthUrl);
            console.log('   API_CONFIG.BASE_URL:', window.API_CONFIG?.BASE_URL);
            console.log('   Computed apiBase:', apiBase);

            // Fetch health data from backend
            const response = await fetch(healthUrl, {
                headers: { 'Accept': 'application/json' },
                mode: 'cors'
            });

            console.log('   Response status:', response.status);
            console.log('   Response headers:', {
                contentType: response.headers.get('content-type'),
                cacheControl: response.headers.get('cache-control')
            });

            if (!response.ok) {
                throw new Error(`Health check failed: HTTP ${response.status}`);
            }

            // Get response text first to debug what we're actually receiving
            const responseText = await response.text();
            console.log('   Response text (first 200 chars):', responseText.substring(0, 200));

            let healthData;
            try {
                healthData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('   Failed to parse response as JSON:', parseError);
                console.error('   Full response:', responseText);
                throw new Error(`Health endpoint returned invalid JSON: ${parseError.message}`);
            }

            // Get frontend environment
            const frontendEnv = getEnvironment();

            // Validate consistency
            const issues = validateEnvironmentConsistency(healthData);

            // Update UI
            this.updateHealthStatusDisplay(frontendEnv, healthData, issues);

            await adminDebugLog('OverviewController', 'Environment health loaded', {
                frontendEnv,
                backendEnv: healthData.environment,
                issuesCount: issues.length
            });

        } catch (error) {
            console.error('Error loading environment health:', error);
            await adminDebugError('OverviewController', 'Failed to load environment health', error);
            this.displayHealthError(error);
        }
    }

    /**
     * Update health status display with comprehensive environment info
     */
    updateHealthStatusDisplay(frontendEnv, healthData, issues) {
        try {
            const healthContainer = document.getElementById('healthStatus');
            if (!healthContainer) {
                console.warn('Health status container not found');
                return;
            }

            // Get replica info (new structure) or fall back to legacy uptime
            const replicaInfo = healthData.replica || {};
            const replicaUptime = replicaInfo.uptime || healthData.uptime || 0;
            const replicaId = replicaInfo.id || 'unknown';
            const replicaStartedAt = replicaInfo.startedAt ? new Date(replicaInfo.startedAt) : null;

            const uptimeFormatted = this.formatUptime(replicaUptime);
            const startedAtFormatted = replicaStartedAt
                ? replicaStartedAt.toLocaleString()
                : 'Unknown';
            const apiBase = window.API_CONFIG?.BASE_URL || 'Unknown';

            // Format replica ID for display (truncate if too long)
            const replicaIdDisplay = replicaId !== 'unknown'
                ? (replicaId.length > 20 ? replicaId.substring(0, 20) + '...' : replicaId)
                : 'Single instance';

            let html = `
                <div class="environment-health">
                    <div class="env-section">
                        <h4>Frontend Environment</h4>
                        <div class="env-detail">
                            <span class="env-label">Environment:</span>
                            <span class="env-value"><strong>${frontendEnv}</strong></span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">Hostname:</span>
                            <span class="env-value">${window.location.hostname}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">API Base:</span>
                            <span class="env-value">${apiBase}</span>
                        </div>
                    </div>

                    <div class="env-section">
                        <h4>Backend Environment</h4>
                        <div class="env-detail">
                            <span class="env-label">Environment:</span>
                            <span class="env-value"><strong>${healthData.environment || 'Unknown'}</strong></span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">NODE_ENV:</span>
                            <span class="env-value">${healthData.nodeEnv || 'Unknown'}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">Status:</span>
                            <span class="env-value status-${healthData.status}">${healthData.status || 'Unknown'}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">Branch:</span>
                            <span class="env-value">${healthData.githubBranch || 'Unknown'}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">SHA:</span>
                            <span class="env-value" style="font-family: monospace; font-size: 0.9em;">${healthData.releaseSha || 'Unknown'}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">Revision:</span>
                            <span class="env-value" style="font-family: monospace; font-size: 0.85em;">${healthData.revisionSuffix || healthData.revision || 'Unknown'}</span>
                        </div>
                    </div>

                    <div class="env-section">
                        <h4>Container Replica</h4>
                        <div class="env-detail">
                            <span class="env-label">Replica ID:</span>
                            <span class="env-value" style="font-family: monospace; font-size: 0.85em;" title="${replicaId}">${replicaIdDisplay}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">Started At:</span>
                            <span class="env-value">${startedAtFormatted}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">Instance Uptime:</span>
                            <span class="env-value">${uptimeFormatted}</span>
                        </div>
                        <div class="env-detail env-note">
                            <small>Note: Multiple replicas may be running for high availability. Each has its own uptime.</small>
                        </div>
                    </div>

                    <div class="env-section">
                        <h4>Database</h4>
                        <div class="env-detail">
                            <span class="env-label">Host:</span>
                            <span class="env-value" style="font-size: 0.85em;">${healthData.databaseHost || 'Unknown'}</span>
                        </div>
                        <div class="env-detail">
                            <span class="env-label">Status:</span>
                            <span class="env-value status-${healthData.database}">${healthData.database || 'Unknown'}</span>
                        </div>
                    </div>
            `;

            if (issues.length > 0) {
                html += `
                    <div class="env-issues">
                        <h4>⚠️ Issues Detected</h4>
                        <ul class="issues-list">
                `;
                issues.forEach(issue => {
                    const icon = issue.severity === 'critical' ? '🔴' : '🟠';
                    html += `<li class="issue-${issue.severity}">${icon} ${issue.message}</li>`;
                });
                html += `</ul></div>`;
            } else {
                html += `<div class="env-success">✅ All environment checks passed</div>`;
            }

            html += `
                    <div class="env-footer">
                        <small>Last checked: ${new Date().toLocaleTimeString()} • Auto-refresh every 30s</small>
                    </div>
                </div>
            `;

            healthContainer.innerHTML = html;

        } catch (error) {
            console.error('Error updating health status display:', error);
            adminDebugError('OverviewController', 'Failed to update health display', error);
        }
    }

    /**
     * Display error in health status section
     */
    displayHealthError(error) {
        const healthContainer = document.getElementById('healthStatus');
        if (!healthContainer) return;

        healthContainer.innerHTML = `
            <div class="environment-health">
                <div class="env-error">
                    <h4>❌ Health Check Failed</h4>
                    <p>${error.message || 'Unknown error'}</p>
                    <p><small>The backend health endpoint may be unavailable.</small></p>
                </div>
            </div>
        `;
    }

    /**
     * Display health status (legacy compatibility)
     */
    async displayHealthStatus(health) {
        // This method is kept for backward compatibility
        // New code should use loadEnvironmentHealth instead
        await this.loadEnvironmentHealth();
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
     * Suppresses errors during wake-from-sleep recovery to prevent transient error popups
     */
    showError(message) {
        // Suppress errors when session is ending (logout, recovery, or expired)
        if (window.AdminAPI?.isLoggingOut || window.adminAuth?.isRecovering ||
            (window.adminAuth && !window.adminAuth.isAuthenticated())) {
            console.warn('OverviewController: Error suppressed (session ending):', message);
            return;
        }

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

        // Clear health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

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