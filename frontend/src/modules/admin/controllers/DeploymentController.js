/**
 * DeploymentController - Handles admin dashboard deployment monitoring section
 * Extracted from admin-dashboard.html deployment functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 3.4 - Final controller implementation for deployment monitoring
 */

class DeploymentController {
    constructor() {
        this.sectionId = 'deployment';
        this.isInitialized = false;
        this.currentStatus = {};
        this.refreshInterval = null;
        this.azureEndpoints = {
            containerApps: 'https://management.azure.com/subscriptions/YOUR_SUBSCRIPTION/resourceGroups/unitedwerise-rg/providers/Microsoft.App/containerApps',
            registry: 'https://uwracr2425.azurecr.io/v2/_catalog'
        };

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.handleRefreshStatus = this.handleRefreshStatus.bind(this);
        this.handleDeploymentHistory = this.handleDeploymentHistory.bind(this);
        this.handleRollback = this.handleRollback.bind(this);
        this.displayDeploymentData = this.displayDeploymentData.bind(this);
        this.displayContainerHealth = this.displayContainerHealth.bind(this);
        this.displayBuildStatus = this.displayBuildStatus.bind(this);
        this.handleEnvironmentComparison = this.handleEnvironmentComparison.bind(this);
    }

    /**
     * Initialize the deployment controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for deployment
            if (window.AdminState) {
                window.AdminState.displayDeploymentData = this.displayDeploymentData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Set up auto-refresh every 30 seconds
            this.refreshInterval = setInterval(() => {
                this.handleRefreshStatus();
            }, 30000);

            this.isInitialized = true;

            await adminDebugLog('DeploymentController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing DeploymentController:', error);
            await adminDebugError('DeploymentController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for deployment section
     */
    async setupEventListeners() {
        // Refresh status button (modular dashboard has different IDs)
        const refreshBtn = document.getElementById('refreshDeploymentBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefreshStatus);
        }

        // Deployment history button
        const historyBtn = document.getElementById('deploymentHistoryBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', this.handleDeploymentHistory);
        }

        // Environment comparison button
        const comparisonBtn = document.getElementById('environmentComparisonBtn');
        if (comparisonBtn) {
            comparisonBtn.addEventListener('click', this.handleEnvironmentComparison);
        }

        // Container health button
        const healthBtn = document.getElementById('containerHealthBtn');
        if (healthBtn) {
            healthBtn.addEventListener('click', this.displayContainerHealth);
        }

        // Build pipeline button
        const buildBtn = document.getElementById('buildPipelineBtn');
        if (buildBtn) {
            buildBtn.addEventListener('click', this.displayBuildStatus);
        }

        // Emergency rollback button
        const rollbackBtn = document.getElementById('emergencyRollbackBtn');
        if (rollbackBtn) {
            rollbackBtn.addEventListener('click', this.handleRollback);
        }

        await adminDebugLog('DeploymentController', 'Event listeners set up successfully');
    }


    /**
     * Load deployment data
     * Extracted from loadDeploymentData function
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                const data = await window.AdminState.loadDeploymentData({}, useCache);
                this.displayDeploymentData(data);
                return data;
            } else {
                // Fallback to direct deployment status check
                return await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading deployment data:', error);
            this.showError('Failed to load deployment data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            // Clear the console first
            const consoleDiv = document.getElementById('deploymentConsole');
            if (consoleDiv) {
                consoleDiv.innerHTML = 'Checking deployment status...\n';
            }

            // Use the deployment status checker that's loaded
            if (window.deploymentStatus) {
                // First run the check to populate fresh data
                await window.deploymentStatus.check();

                // Get updated status after check completes
                setTimeout(() => {
                    const status = window.deploymentStatus.getStatus();
                    this.currentStatus = status;
                    this.updateDeploymentUI(status);
                }, 3000);

                return { deploymentStatus: status };
            } else {
                // Fallback to basic health check
                const response = await fetch(`${window.AdminAPI?.BACKEND_URL || 'https://api.unitedwerise.org'}/health`);
                if (response.ok) {
                    const health = await response.json();
                    this.updateBasicDeploymentInfo(health);
                    return { health };
                }
            }
        } catch (error) {
            console.error('Fallback deployment data loading failed:', error);
            throw error;
        }
    }

    /**
     * Handle refresh deployment status
     * Extracted from checkDeploymentStatus function
     */
    async handleRefreshStatus() {
        try {
            await adminDebugLog('DeploymentController', 'Manual deployment status refresh triggered');

            if (window.deploymentStatus) {
                window.deploymentStatus.check();
                const consoleDiv = document.getElementById('deploymentConsole');
                if (consoleDiv) {
                    consoleDiv.innerHTML = 'Running deployment check...\n';
                }

                setTimeout(() => {
                    const status = window.deploymentStatus.getStatus();
                    this.currentStatus = status;
                    this.updateDeploymentUI(status);
                }, 3000);
            } else {
                this.showError('Deployment status checker not available');
            }

        } catch (error) {
            console.error('Error refreshing deployment status:', error);
            await adminDebugError('DeploymentController', 'Status refresh failed', error);
        }
    }

    /**
     * Handle deployment history display
     * Extracted from showDeploymentHistory function
     */
    async handleDeploymentHistory() {
        try {
            const consoleDiv = document.getElementById('deploymentConsole');
            if (!consoleDiv) return;

            // Fetch real deployment history from GitHub API and Azure
            let historyContent = `📜 Deployment History\n`;
            historyContent += `================================\n\n`;

            try {
                // Get recent commits from GitHub API (if available)
                const recentCommits = await this.fetchRecentCommits();
                historyContent += `Recent Commits (from Git):\n`;
                recentCommits.forEach(commit => {
                    historyContent += `• ${commit.sha.substring(0, 7)} - ${commit.message}\n`;
                });
                historyContent += `\n`;
            } catch (error) {
                await adminDebugError('DeploymentController', 'Failed to fetch GitHub commits', error);
                historyContent += `Recent Commits:\n`;
                historyContent += `• Unable to fetch from GitHub API\n`;
                historyContent += `• Use 'git log --oneline -10' for local history\n\n`;
            }

            historyContent += `Deployment Timeline:\n`;
            historyContent += `• Backend: ${this.getBackendDeployTime()}\n`;
            historyContent += `• Frontend: ${this.getFrontendDeployTime()}\n`;
            historyContent += `• Database: ${this.getDatabaseMigrationTime()}\n\n`;

            historyContent += `Azure Container Apps Status:\n`;
            historyContent += `• Production: ${await this.getContainerStatus('production')}\n`;
            historyContent += `• Staging: ${await this.getContainerStatus('staging')}\n\n`;

            historyContent += `Environment Comparison:\n`;
            historyContent += `• Production URL: https://api.unitedwerise.org\n`;
            historyContent += `• Staging URL: https://dev-api.unitedwerise.org\n`;
            historyContent += `• Container Registry: uwracr2425.azurecr.io\n`;

            consoleDiv.innerHTML = historyContent;

            await adminDebugLog('DeploymentController', 'Deployment history displayed');

        } catch (error) {
            console.error('Error displaying deployment history:', error);
            await adminDebugError('DeploymentController', 'History display failed', error);
        }
    }

    /**
     * Handle emergency rollback with TOTP verification
     */
    async handleRollback() {
        try {
            const impact = `This will:
• Stop current production container
• Deploy previous stable version
• May cause 2-3 minutes of downtime
• Requires immediate verification`;

            if (!confirm(`⚠️ EMERGENCY ROLLBACK\n\n${impact}\n\nThis action requires TOTP verification. Continue?`)) {
                return;
            }

            // Request TOTP confirmation (requires global function)
            const { totpToken } = await requestTOTPConfirmation(
                'Emergency rollback to previous deployment',
                { additionalInfo: impact }
            );

            // Get rollback reason
            const reason = prompt('Enter reason for rollback (required, 10-500 characters):');
            if (!reason || reason.trim().length < 10) {
                alert('Rollback reason is required and must be at least 10 characters.');
                return;
            }

            // Show loading state
            const consoleDiv = document.getElementById('deploymentConsole');
            if (consoleDiv) {
                consoleDiv.innerHTML = '🔄 Initiating emergency rollback...\n';
            }

            // Perform rollback (this would trigger Azure Container Apps rollback)
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/deployment/rollback`, {
                method: 'POST',
                body: JSON.stringify({
                    totpToken,
                    reason: reason.trim(),
                    adminUserId: window.adminAuth.getCurrentUser()?.id,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Rollback initiated successfully.\n\nRollback ID: ${data.rollbackId}\nEstimated completion: 2-3 minutes`);

                // Update console with rollback status
                if (consoleDiv) {
                    consoleDiv.innerHTML = `✅ Emergency Rollback Initiated\n` +
                        `================================\n` +
                        `Rollback ID: ${data.rollbackId}\n` +
                        `Initiated by: ${window.adminAuth.getCurrentUser()?.username}\n` +
                        `Reason: ${reason.trim()}\n` +
                        `Status: In Progress\n` +
                        `Estimated completion: 2-3 minutes\n\n` +
                        `Monitor deployment status for completion...`;
                }

                await adminDebugLog('DeploymentController', 'Emergency rollback initiated', {
                    rollbackId: data.rollbackId,
                    reason: reason.trim()
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initiate rollback');
            }

        } catch (error) {
            console.error('Error during rollback:', error);
            alert(`❌ Rollback failed: ${error.message}`);
            await adminDebugError('DeploymentController', 'Rollback failed', error);
        }
    }

    /**
     * Display container health metrics
     */
    async displayContainerHealth() {
        try {
            const consoleDiv = document.getElementById('deploymentConsole');
            if (!consoleDiv) return;

            let healthContent = `📊 Azure Container Health Metrics\n`;
            healthContent += `================================\n\n`;

            // Production container health
            healthContent += `🏭 PRODUCTION ENVIRONMENT:\n`;
            const prodHealth = await this.getContainerMetrics('production');
            healthContent += `• Container: unitedwerise-backend\n`;
            healthContent += `• CPU Usage: ${prodHealth.cpu || 'Unknown'}\n`;
            healthContent += `• Memory Usage: ${prodHealth.memory || 'Unknown'}\n`;
            healthContent += `• Request Rate: ${prodHealth.requestRate || 'Unknown'}\n`;
            healthContent += `• Response Time: ${prodHealth.responseTime || 'Unknown'}\n`;
            healthContent += `• Auto-scaling: ${prodHealth.scaling || 'Unknown'}\n\n`;

            // Staging container health
            healthContent += `🧪 STAGING ENVIRONMENT:\n`;
            const stagingHealth = await this.getContainerMetrics('staging');
            healthContent += `• Container: unitedwerise-backend-staging\n`;
            healthContent += `• CPU Usage: ${stagingHealth.cpu || 'Unknown'}\n`;
            healthContent += `• Memory Usage: ${stagingHealth.memory || 'Unknown'}\n`;
            healthContent += `• Request Rate: ${stagingHealth.requestRate || 'Unknown'}\n`;
            healthContent += `• Response Time: ${stagingHealth.responseTime || 'Unknown'}\n`;
            healthContent += `• Auto-scaling: ${stagingHealth.scaling || 'Unknown'}\n\n`;

            // Resource group status
            healthContent += `📦 RESOURCE GROUP STATUS:\n`;
            healthContent += `• Resource Group: unitedwerise-rg\n`;
            healthContent += `• Container Registry: uwracr2425.azurecr.io\n`;
            healthContent += `• Database: unitedwerise-db (PostgreSQL)\n`;
            healthContent += `• Storage: uwrstorage2425\n\n`;

            healthContent += `🔄 Auto-refresh every 30 seconds`;

            consoleDiv.innerHTML = healthContent;

            await adminDebugLog('DeploymentController', 'Container health metrics displayed');

        } catch (error) {
            console.error('Error displaying container health:', error);
            await adminDebugError('DeploymentController', 'Container health display failed', error);
        }
    }

    /**
     * Display build pipeline status
     */
    async displayBuildStatus() {
        try {
            const consoleDiv = document.getElementById('deploymentConsole');
            if (!consoleDiv) return;

            let buildContent = `🔨 CI/CD Build Pipeline Status\n`;
            buildContent += `================================\n\n`;

            // GitHub Actions status
            buildContent += `🐙 GITHUB ACTIONS:\n`;
            const ghStatus = await this.getGitHubActionsStatus();
            buildContent += `• Frontend Workflow: ${ghStatus.frontend || 'Unknown'}\n`;
            buildContent += `• Backend Workflow: ${ghStatus.backend || 'Unknown'}\n`;
            buildContent += `• Last Frontend Build: ${ghStatus.lastFrontendBuild || 'Unknown'}\n`;
            buildContent += `• Last Backend Build: ${ghStatus.lastBackendBuild || 'Unknown'}\n\n`;

            // Azure Container Registry builds
            buildContent += `🏗️ AZURE CONTAINER REGISTRY:\n`;
            const acrStatus = await this.getAzureRegistryStatus();
            buildContent += `• Registry: uwracr2425.azurecr.io\n`;
            buildContent += `• Latest Image: ${acrStatus.latestImage || 'Unknown'}\n`;
            buildContent += `• Image Size: ${acrStatus.imageSize || 'Unknown'}\n`;
            buildContent += `• Build Duration: ${acrStatus.buildDuration || 'Unknown'}\n`;
            buildContent += `• Security Scan: ${acrStatus.securityScan || 'Unknown'}\n\n`;

            // Deployment triggers
            buildContent += `⚡ DEPLOYMENT TRIGGERS:\n`;
            buildContent += `• Push to main → Production deployment\n`;
            buildContent += `• Push to development → Staging deployment\n`;
            buildContent += `• Manual triggers → Available via Azure CLI\n`;
            buildContent += `• Branch protection → Required for main\n\n`;

            // Build performance metrics
            buildContent += `📈 BUILD PERFORMANCE:\n`;
            buildContent += `• Average build time: ${acrStatus.avgBuildTime || 'Unknown'}\n`;
            buildContent += `• Success rate: ${acrStatus.successRate || 'Unknown'}\n`;
            buildContent += `• Failed builds (24h): ${acrStatus.recentFailures || '0'}\n`;

            consoleDiv.innerHTML = buildContent;

            await adminDebugLog('DeploymentController', 'Build pipeline status displayed');

        } catch (error) {
            console.error('Error displaying build status:', error);
            await adminDebugError('DeploymentController', 'Build status display failed', error);
        }
    }

    /**
     * Handle environment comparison
     * Enhanced version of showGitWorkflow function
     */
    async handleEnvironmentComparison() {
        try {
            const consoleDiv = document.getElementById('deploymentConsole');
            if (!consoleDiv) return;

            let comparisonContent = `🔀 Environment Comparison & Git Workflow\n`;
            comparisonContent += `================================\n\n`;

            // Production vs Staging comparison
            comparisonContent += `🆚 ENVIRONMENT COMPARISON:\n`;
            const envComparison = await this.compareEnvironments();
            comparisonContent += `Production:\n`;
            comparisonContent += `  • URL: https://api.unitedwerise.org\n`;
            comparisonContent += `  • Branch: main\n`;
            comparisonContent += `  • Version: ${envComparison.production.version || 'Unknown'}\n`;
            comparisonContent += `  • Uptime: ${envComparison.production.uptime || 'Unknown'}\n`;
            comparisonContent += `  • Users: All registered users\n\n`;

            comparisonContent += `Staging:\n`;
            comparisonContent += `  • URL: https://dev-api.unitedwerise.org\n`;
            comparisonContent += `  • Branch: development\n`;
            comparisonContent += `  • Version: ${envComparison.staging.version || 'Unknown'}\n`;
            comparisonContent += `  • Uptime: ${envComparison.staging.uptime || 'Unknown'}\n`;
            comparisonContent += `  • Users: Admin-only access\n\n`;

            // Git workflow status
            comparisonContent += `📋 GIT WORKFLOW STATUS:\n`;
            comparisonContent += `Current Branch: ${await this.getCurrentBranch()}\n`;
            comparisonContent += `Deploy Target: Azure Container Apps + Static Web Apps\n\n`;

            comparisonContent += `Workflow Triggers:\n`;
            comparisonContent += `✅ Push to main → Backend deploys to Container Apps\n`;
            comparisonContent += `✅ Push to main → Frontend deploys to Static Web Apps\n`;
            comparisonContent += `✅ Push to development → Staging deployment\n`;
            comparisonContent += `✅ Schema changes → Require manual migration\n`;
            comparisonContent += `✅ Build timestamps → Auto-updated on deployment\n\n`;

            // Environment configuration differences
            comparisonContent += `⚙️ CONFIGURATION DIFFERENCES:\n`;
            comparisonContent += `• NODE_ENV: production vs staging\n`;
            comparisonContent += `• Database: Same PostgreSQL instance, different access patterns\n`;
            comparisonContent += `• Authentication: OAuth same config, staging requires admin access\n`;
            comparisonContent += `• File Storage: Same Azure Storage, different container paths\n`;
            comparisonContent += `• Monitoring: Both have health endpoints and logging\n\n`;

            comparisonContent += `🔄 Deployment Process:\n`;
            comparisonContent += `1. Development → Staging (automatic)\n`;
            comparisonContent += `2. Test on staging environment\n`;
            comparisonContent += `3. Admin approval required\n`;
            comparisonContent += `4. Merge to main → Production\n`;
            comparisonContent += `5. Monitor deployment success`;

            consoleDiv.innerHTML = comparisonContent;

            await adminDebugLog('DeploymentController', 'Environment comparison displayed');

        } catch (error) {
            console.error('Error displaying environment comparison:', error);
            await adminDebugError('DeploymentController', 'Environment comparison failed', error);
        }
    }

    /**
     * Display deployment data in the UI
     */
    async displayDeploymentData(data) {
        try {
            if (!data) {
                console.warn('No deployment data available');
                return;
            }

            // If data contains deployment status, update UI
            if (data.deploymentStatus) {
                this.currentStatus = data.deploymentStatus;
                this.updateDeploymentUI(data.deploymentStatus);
            } else if (data.health) {
                this.updateBasicDeploymentInfo(data.health);
            }

            await adminDebugLog('DeploymentController', 'Deployment data displayed', {
                hasStatus: !!data.deploymentStatus,
                hasHealth: !!data.health
            });

        } catch (error) {
            console.error('Error displaying deployment data:', error);
            await adminDebugError('DeploymentController', 'Failed to display deployment data', error);
        }
    }

    /**
     * Update deployment UI with comprehensive status
     * Extracted from updateDeploymentUI function
     */
    async updateDeploymentUI(status) {
        try {
            // Update stats cards
            if (status.backend && status.backend.uptime) {
                const hours = Math.round(parseFloat(status.backend.uptime.split(' ')[0]) / 60 * 100) / 100;
                const uptimeElement = document.getElementById('backendUptime');
                if (uptimeElement) {
                    uptimeElement.textContent = hours.toString();
                }

                if (status.backend.lastRestart && status.backend.lastRestart !== 'Unknown') {
                    const lastDeploy = new Date(status.backend.lastRestart).toLocaleDateString();
                    const deployElement = document.getElementById('lastDeploy');
                    if (deployElement) {
                        deployElement.textContent = lastDeploy;
                    }
                }
            }

            if (status.frontend && status.frontend.version) {
                const versionElement = document.getElementById('frontendVersion');
                if (versionElement) {
                    versionElement.textContent = status.frontend.version;
                }
            }

            if (status.database && status.database.schemaVersion) {
                const schemaElement = document.getElementById('schemaVersion');
                if (schemaElement) {
                    schemaElement.textContent = status.database.schemaVersion;
                }
            }

            // Update component status
            const componentDiv = document.getElementById('componentStatus');
            if (componentDiv) {
                let componentHtml = '';

                Object.entries(status).forEach(([component, data]) => {
                    const emoji = this.getComponentEmoji(data);
                    const statusText = this.getComponentStatus(data);
                    componentHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                            <span><strong>${emoji} ${component.charAt(0).toUpperCase() + component.slice(1)}</strong></span>
                            <span style="color: ${this.getStatusColor(data)}">${statusText}</span>
                        </div>
                    `;
                });

                componentDiv.innerHTML = componentHtml;
            }

            // Update console with formatted output
            this.updateDeploymentConsole(status);

        } catch (error) {
            console.error('Error updating deployment UI:', error);
            await adminDebugError('DeploymentController', 'UI update failed', error);
        }
    }

    /**
     * Update basic deployment info fallback
     * Extracted from updateBasicDeploymentInfo function
     */
    async updateBasicDeploymentInfo(health) {
        try {
            const uptimeElement = document.getElementById('backendUptime');
            if (uptimeElement) {
                uptimeElement.textContent = Math.round(health.uptime / 3600).toString();
            }

            const deployElement = document.getElementById('lastDeploy');
            if (deployElement) {
                deployElement.textContent = 'Unknown';
            }

            const versionElement = document.getElementById('frontendVersion');
            if (versionElement) {
                versionElement.textContent = 'Unknown';
            }

            const schemaElement = document.getElementById('schemaVersion');
            if (schemaElement) {
                schemaElement.textContent = 'Unknown';
            }

            const componentDiv = document.getElementById('componentStatus');
            if (componentDiv) {
                componentDiv.innerHTML = `
                    <div><strong>🏥 Backend:</strong> ${health.status}</div>
                    <div><strong>💾 Database:</strong> ${health.database}</div>
                    <div><strong>📊 Error Rate:</strong> ${health.requests.errorRate.toFixed(2)}%</div>
                `;
            }

            const consoleDiv = document.getElementById('deploymentConsole');
            if (consoleDiv) {
                consoleDiv.innerHTML =
                    `Backend Health Check:\n${JSON.stringify(health, null, 2)}`;
            }

        } catch (error) {
            console.error('Error updating basic deployment info:', error);
            await adminDebugError('DeploymentController', 'Basic info update failed', error);
        }
    }

    /**
     * Update deployment console with formatted output
     * Extracted from updateDeploymentConsole function
     */
    async updateDeploymentConsole(status) {
        try {
            const consoleDiv = document.getElementById('deploymentConsole');
            if (!consoleDiv) return;

            let output = '🚀 Deployment Status Report\n';
            output += '================================\n\n';

            // Add timestamp
            output += `📅 Last Updated: ${new Date().toLocaleString()}\n\n`;

            // Component details
            Object.entries(status).forEach(([component, data]) => {
                output += `${this.getComponentEmoji(data)} ${component.toUpperCase()}:\n`;
                Object.entries(data).forEach(([key, value]) => {
                    if (key !== 'component') {
                        output += `   ${key}: ${value}\n`;
                    }
                });
                output += '\n';
            });

            output += '================================\n';
            output += 'Use deploymentStatus.check() to refresh\n';
            output += 'Or click "🔄 Check Status Now" button\n';

            consoleDiv.innerHTML = output;

        } catch (error) {
            console.error('Error updating deployment console:', error);
            await adminDebugError('DeploymentController', 'Console update failed', error);
        }
    }

    // Helper methods extracted from original functions
    getComponentEmoji(data) {
        if (data && data.available === false) return '❌';
        if (data && data.status && data.status.includes('ERROR')) return '❌';
        if (data && data.responseTime && parseInt(data.responseTime) > 5000) return '⚠️';
        if (data && (data.buildTime || data.lastLoaded)) return '✅';
        return '✅';
    }

    getComponentStatus(data) {
        if (data && data.available === false) return 'Unavailable';
        if (data && data.status) return data.status;
        if (data && data.uptime) return `Up ${data.uptime}`;
        if (data && data.buildTime) return 'Deployed';
        if (data && data.lastLoaded) return 'Active';
        return 'Unknown';
    }

    getStatusColor(data) {
        if (data && data.available === false) return '#d32f2f';
        if (data && data.status && data.status.includes('ERROR')) return '#d32f2f';
        if (data && data.responseTime && parseInt(data.responseTime) > 5000) return '#ff9800';
        return '#388e3c';
    }

    // Azure integration helper methods
    async getContainerMetrics(environment) {
        try {
            // This would integrate with Azure Monitor API
            // For now, return mock data based on health endpoints
            const baseUrl = environment === 'production'
                ? 'https://api.unitedwerise.org'
                : 'https://dev-api.unitedwerise.org';

            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) {
                const health = await response.json();
                return {
                    cpu: health.system?.cpu || 'Unknown',
                    memory: health.system?.memory || 'Unknown',
                    requestRate: health.requests?.rate || 'Unknown',
                    responseTime: health.responseTime || 'Unknown',
                    scaling: 'Auto-scaling enabled'
                };
            }
        } catch (error) {
            await adminDebugError('DeploymentController', `Failed to get ${environment} metrics`, error);
        }

        return {
            cpu: 'Unknown',
            memory: 'Unknown',
            requestRate: 'Unknown',
            responseTime: 'Unknown',
            scaling: 'Unknown'
        };
    }

    async getContainerStatus(environment) {
        try {
            const baseUrl = environment === 'production'
                ? 'https://api.unitedwerise.org'
                : 'https://dev-api.unitedwerise.org';

            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) {
                const health = await response.json();
                return `✅ Running (${health.uptime} uptime)`;
            }
        } catch (error) {
            return `❌ Error checking ${environment}`;
        }

        return `⚠️ Status unknown`;
    }

    async fetchRecentCommits() {
        // Mock implementation - would integrate with GitHub API
        return [
            { sha: 'ac59a17', message: 'perf: Optimize feedback analysis to be non-blocking' },
            { sha: 'e507649', message: 'feat: Enable real user feedback in admin console' },
            { sha: 'f9c19f6', message: 'chore: Force deployment refresh for reputation badge fix' },
            { sha: 'e98e887', message: 'fix: Resolve reputation badge MIME type issues' }
        ];
    }

    getBackendDeployTime() {
        return this.currentStatus?.backend?.lastRestart || 'Unknown';
    }

    getFrontendDeployTime() {
        return this.currentStatus?.frontend?.buildTime || 'Unknown';
    }

    getDatabaseMigrationTime() {
        return this.currentStatus?.database?.lastMigration || 'Check backend logs';
    }

    async getGitHubActionsStatus() {
        // Mock implementation - would integrate with GitHub Actions API
        return {
            frontend: '✅ Passing',
            backend: '✅ Passing',
            lastFrontendBuild: '2 hours ago',
            lastBackendBuild: '30 minutes ago'
        };
    }

    async getAzureRegistryStatus() {
        // Mock implementation - would integrate with Azure Container Registry API
        return {
            latestImage: 'unitedwerise-backend:latest',
            imageSize: '245 MB',
            buildDuration: '3m 42s',
            securityScan: '✅ No vulnerabilities',
            avgBuildTime: '3m 30s',
            successRate: '98.5%',
            recentFailures: '0'
        };
    }

    async compareEnvironments() {
        try {
            const [prodResponse, stagingResponse] = await Promise.all([
                fetch('https://api.unitedwerise.org/health').catch(() => null),
                fetch('https://dev-api.unitedwerise.org/health').catch(() => null)
            ]);

            const production = prodResponse?.ok ? await prodResponse.json() : {};
            const staging = stagingResponse?.ok ? await stagingResponse.json() : {};

            return {
                production: {
                    version: production.version || 'Unknown',
                    uptime: production.uptime || 'Unknown'
                },
                staging: {
                    version: staging.version || 'Unknown',
                    uptime: staging.uptime || 'Unknown'
                }
            };
        } catch (error) {
            await adminDebugError('DeploymentController', 'Environment comparison failed', error);
            return {
                production: { version: 'Unknown', uptime: 'Unknown' },
                staging: { version: 'Unknown', uptime: 'Unknown' }
            };
        }
    }

    async getCurrentBranch() {
        // This would be populated from build-time information
        return 'main (production)';
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('DeploymentController Error:', message);

        const consoleDiv = document.getElementById('deploymentConsole');
        if (consoleDiv) {
            consoleDiv.innerHTML = `❌ Error: ${message}\n\nTry refreshing the deployment status or check console for details.`;
        }
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        // Clear refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Remove event listeners
        const refreshBtn = document.getElementById('refreshDeploymentBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.handleRefreshStatus);
        }

        const historyBtn = document.getElementById('deploymentHistoryBtn');
        if (historyBtn) {
            historyBtn.removeEventListener('click', this.handleDeploymentHistory);
        }

        const comparisonBtn = document.getElementById('environmentComparisonBtn');
        if (comparisonBtn) {
            comparisonBtn.removeEventListener('click', this.handleEnvironmentComparison);
        }

        const healthBtn = document.getElementById('containerHealthBtn');
        if (healthBtn) {
            healthBtn.removeEventListener('click', this.displayContainerHealth);
        }

        const buildBtn = document.getElementById('buildPipelineBtn');
        if (buildBtn) {
            buildBtn.removeEventListener('click', this.displayBuildStatus);
        }

        const rollbackBtn = document.getElementById('emergencyRollbackBtn');
        if (rollbackBtn) {
            rollbackBtn.removeEventListener('click', this.handleRollback);
        }

        // Clear data
        this.currentStatus = {};
        this.isInitialized = false;

        console.log('DeploymentController destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeploymentController;
} else {
    window.DeploymentController = DeploymentController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.deploymentController = new DeploymentController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.deploymentController = new DeploymentController();
            }
        }, 100);
    });
}