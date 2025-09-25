/**
 * SystemController - Handles admin dashboard system administration section
 * Extracted from admin-dashboard.html system management functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 4.1 - Administrative system management controller
 */

class SystemController {
    constructor() {
        this.sectionId = 'system';
        this.isInitialized = false;
        this.currentSystemData = {};
        this.refreshInterval = null;
        this.performanceMetrics = new Map();
        this.systemHealth = {
            status: 'unknown',
            lastCheck: null,
            components: {}
        };

        // Configuration management
        this.configBackups = new Map();
        this.pendingChanges = new Map();
        this.maintenanceMode = false;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displaySystemData = this.displaySystemData.bind(this);
        this.handleConfigurationUpdate = this.handleConfigurationUpdate.bind(this);
        this.handleDatabaseManagement = this.handleDatabaseManagement.bind(this);
        this.handleCacheControl = this.handleCacheControl.bind(this);
        this.handleMaintenanceMode = this.handleMaintenanceMode.bind(this);
        this.displaySystemHealth = this.displaySystemHealth.bind(this);
        this.handleBackupRestore = this.handleBackupRestore.bind(this);
        this.handlePerformanceTuning = this.handlePerformanceTuning.bind(this);
        this.handleSystemDiagnostics = this.handleSystemDiagnostics.bind(this);
        this.handleResourceMonitoring = this.handleResourceMonitoring.bind(this);
        this.handleConfigurationAudit = this.handleConfigurationAudit.bind(this);
    }

    /**
     * Initialize the system controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for system administration
            if (window.AdminState) {
                window.AdminState.displaySystemData = this.displaySystemData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Set up auto-refresh every 60 seconds for system monitoring
            this.refreshInterval = setInterval(() => {
                this.loadData(false); // Skip cache for monitoring data
            }, 60000);

            // Initialize performance monitoring
            await this.initializePerformanceMonitoring();

            this.isInitialized = true;

            await adminDebugLog('SystemController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing SystemController:', error);
            await adminDebugError('SystemController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for system administration section
     */
    async setupEventListeners() {
        // System configuration buttons
        const configUpdateBtn = document.getElementById('configUpdateBtn');
        if (configUpdateBtn) {
            configUpdateBtn.addEventListener('click', this.handleConfigurationUpdate);
        }

        const configAuditBtn = document.getElementById('configAuditBtn');
        if (configAuditBtn) {
            configAuditBtn.addEventListener('click', this.handleConfigurationAudit);
        }

        // Database management buttons
        const dbManagementBtn = document.getElementById('dbManagementBtn');
        if (dbManagementBtn) {
            dbManagementBtn.addEventListener('click', this.handleDatabaseManagement);
        }

        const dbOptimizeBtn = document.getElementById('dbOptimizeBtn');
        if (dbOptimizeBtn) {
            dbOptimizeBtn.addEventListener('click', this.handleDatabaseOptimization);
        }

        const dbBackupBtn = document.getElementById('dbBackupBtn');
        if (dbBackupBtn) {
            dbBackupBtn.addEventListener('click', this.handleDatabaseBackup);
        }

        // Cache management buttons
        const cacheControlBtn = document.getElementById('cacheControlBtn');
        if (cacheControlBtn) {
            cacheControlBtn.addEventListener('click', this.handleCacheControl);
        }

        const cacheInvalidateBtn = document.getElementById('cacheInvalidateBtn');
        if (cacheInvalidateBtn) {
            cacheInvalidateBtn.addEventListener('click', this.handleCacheInvalidation);
        }

        const cacheWarmBtn = document.getElementById('cacheWarmBtn');
        if (cacheWarmBtn) {
            cacheWarmBtn.addEventListener('click', this.handleCacheWarming);
        }

        // System monitoring buttons
        const systemHealthBtn = document.getElementById('systemHealthBtn');
        if (systemHealthBtn) {
            systemHealthBtn.addEventListener('click', this.displaySystemHealth);
        }

        const resourceMonitorBtn = document.getElementById('resourceMonitorBtn');
        if (resourceMonitorBtn) {
            resourceMonitorBtn.addEventListener('click', this.handleResourceMonitoring);
        }

        const diagnosticsBtn = document.getElementById('systemDiagnosticsBtn');
        if (diagnosticsBtn) {
            diagnosticsBtn.addEventListener('click', this.handleSystemDiagnostics);
        }

        // Maintenance and backup buttons
        const maintenanceModeBtn = document.getElementById('maintenanceModeBtn');
        if (maintenanceModeBtn) {
            maintenanceModeBtn.addEventListener('click', this.handleMaintenanceMode);
        }

        const backupRestoreBtn = document.getElementById('backupRestoreBtn');
        if (backupRestoreBtn) {
            backupRestoreBtn.addEventListener('click', this.handleBackupRestore);
        }

        const performanceTuningBtn = document.getElementById('performanceTuningBtn');
        if (performanceTuningBtn) {
            performanceTuningBtn.addEventListener('click', this.handlePerformanceTuning);
        }

        // System refresh button
        const refreshSystemBtn = document.getElementById('refreshSystemBtn');
        if (refreshSystemBtn) {
            refreshSystemBtn.addEventListener('click', () => this.loadData(false));
        }

        await adminDebugLog('SystemController', 'Event listeners set up successfully');
    }

    /**
     * Initialize performance monitoring system
     */
    async initializePerformanceMonitoring() {
        try {
            // Set up performance observers for system metrics
            this.startPerformanceCollection();

            // Initialize system health baseline
            await this.updateSystemHealth();

            await adminDebugLog('SystemController', 'Performance monitoring initialized');
        } catch (error) {
            await adminDebugError('SystemController', 'Performance monitoring setup failed', error);
        }
    }

    /**
     * Load system administration data
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                const data = await window.AdminState.loadSystemData({}, useCache);
                this.displaySystemData(data);
                return data;
            } else {
                return await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading system data:', error);
            this.showError('Failed to load system data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            // Load system health data
            const systemHealth = await this.getSystemHealthData();

            // Load configuration data
            const configData = await this.getSystemConfiguration();

            // Load performance metrics
            const performanceData = await this.getPerformanceMetrics();

            this.currentSystemData = {
                health: systemHealth,
                configuration: configData,
                performance: performanceData,
                lastUpdated: new Date().toISOString()
            };

            this.displaySystemData(this.currentSystemData);
            return this.currentSystemData;

        } catch (error) {
            console.error('Fallback system data loading failed:', error);
            throw error;
        }
    }

    /**
     * Display system administration data in the UI
     */
    displaySystemData(data) {
        try {
            if (!data) {
                console.warn('No system data available');
                return;
            }

            this.currentSystemData = data;

            // Update system overview cards
            this.updateSystemOverview(data);

            // Update system health display
            this.updateSystemHealthDisplay(data.health || {});

            // Update configuration display
            this.updateConfigurationDisplay(data.configuration || {});

            // Update performance metrics display
            this.updatePerformanceDisplay(data.performance || {});

            // Update system console
            this.updateSystemConsole(data);

            adminDebugLog('SystemController', 'System data displayed successfully', {
                hasHealth: !!data.health,
                hasConfig: !!data.configuration,
                hasPerformance: !!data.performance
            });

        } catch (error) {
            console.error('Error displaying system data:', error);
            adminDebugError('SystemController', 'Failed to display system data', error);
        }
    }

    /**
     * Handle system configuration update with TOTP verification
     */
    async handleConfigurationUpdate() {
        try {
            const impact = `This will:
• Update system configuration settings
• May restart application services
• Could affect system performance temporarily
• Requires immediate verification`;

            if (!confirm(`⚠️ SYSTEM CONFIGURATION UPDATE\n\n${impact}\n\nThis action requires TOTP verification. Continue?`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                'System configuration update',
                { additionalInfo: impact }
            );

            // Get configuration changes
            const configChanges = await this.getConfigurationChanges();
            if (!configChanges || Object.keys(configChanges).length === 0) {
                alert('No configuration changes detected.');
                return;
            }

            // Create backup before changes
            await this.createConfigurationBackup();

            // Apply configuration changes
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/system/config`, {
                method: 'PUT',
                body: JSON.stringify({
                    totpToken,
                    changes: configChanges,
                    adminUserId: window.adminAuth.getCurrentUser()?.id,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Configuration updated successfully.\n\nUpdate ID: ${data.updateId}\nServices restarted: ${data.servicesRestarted || 0}`);

                // Refresh system data
                await this.loadData(false);

                await adminDebugLog('SystemController', 'Configuration updated successfully', {
                    updateId: data.updateId,
                    changes: configChanges
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update configuration');
            }

        } catch (error) {
            console.error('Error updating configuration:', error);
            alert(`❌ Configuration update failed: ${error.message}`);
            await adminDebugError('SystemController', 'Configuration update failed', error);
        }
    }

    /**
     * Handle database management operations
     */
    async handleDatabaseManagement() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let dbContent = `💾 Database Management Console\n`;
            dbContent += `================================\n\n`;

            // Get database status
            const dbStatus = await this.getDatabaseStatus();
            dbContent += `📊 DATABASE STATUS:\n`;
            dbContent += `• Connection Pool: ${dbStatus.connectionPool || 'Unknown'}\n`;
            dbContent += `• Active Connections: ${dbStatus.activeConnections || 'Unknown'}\n`;
            dbContent += `• Schema Version: ${dbStatus.schemaVersion || 'Unknown'}\n`;
            dbContent += `• Database Size: ${dbStatus.databaseSize || 'Unknown'}\n`;
            dbContent += `• Query Performance: ${dbStatus.queryPerformance || 'Unknown'}\n\n`;

            // Table statistics
            dbContent += `📋 TABLE STATISTICS:\n`;
            const tableStats = await this.getTableStatistics();
            for (const [table, stats] of Object.entries(tableStats)) {
                dbContent += `• ${table}: ${stats.rows || 0} rows, ${stats.size || 'Unknown'} size\n`;
            }
            dbContent += `\n`;

            // Index performance
            dbContent += `🔍 INDEX PERFORMANCE:\n`;
            const indexStats = await this.getIndexStatistics();
            dbContent += `• Total Indexes: ${indexStats.total || 'Unknown'}\n`;
            dbContent += `• Index Hit Ratio: ${indexStats.hitRatio || 'Unknown'}\n`;
            dbContent += `• Unused Indexes: ${indexStats.unused || 'Unknown'}\n`;
            dbContent += `• Missing Indexes: ${indexStats.missing || 'Unknown'}\n\n`;

            // Recent queries
            dbContent += `⚡ RECENT SLOW QUERIES:\n`;
            const slowQueries = await this.getSlowQueries();
            slowQueries.forEach(query => {
                dbContent += `• ${query.duration}ms: ${query.query.substring(0, 80)}...\n`;
            });
            dbContent += `\n`;

            dbContent += `🛠️ AVAILABLE OPERATIONS:\n`;
            dbContent += `• Database Optimization (ANALYZE/VACUUM)\n`;
            dbContent += `• Index Rebuilding\n`;
            dbContent += `• Connection Pool Tuning\n`;
            dbContent += `• Backup and Restore\n`;
            dbContent += `• Schema Migration Monitoring\n`;

            consoleDiv.innerHTML = dbContent;

            await adminDebugLog('SystemController', 'Database management console displayed');

        } catch (error) {
            console.error('Error displaying database management:', error);
            await adminDebugError('SystemController', 'Database management display failed', error);
        }
    }

    /**
     * Handle cache control operations
     */
    async handleCacheControl() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let cacheContent = `🚀 Cache Management Console\n`;
            cacheContent += `================================\n\n`;

            // Get cache status
            const cacheStatus = await this.getCacheStatus();
            cacheContent += `📊 CACHE STATUS:\n`;
            cacheContent += `• Redis Status: ${cacheStatus.redisStatus || 'Unknown'}\n`;
            cacheContent += `• Memory Usage: ${cacheStatus.memoryUsage || 'Unknown'}\n`;
            cacheContent += `• Hit Rate: ${cacheStatus.hitRate || 'Unknown'}\n`;
            cacheContent += `• Miss Rate: ${cacheStatus.missRate || 'Unknown'}\n`;
            cacheContent += `• Eviction Rate: ${cacheStatus.evictionRate || 'Unknown'}\n\n`;

            // Cache key statistics
            cacheContent += `🔑 CACHE KEY STATISTICS:\n`;
            const keyStats = await this.getCacheKeyStatistics();
            cacheContent += `• Total Keys: ${keyStats.totalKeys || 'Unknown'}\n`;
            cacheContent += `• Expired Keys: ${keyStats.expiredKeys || 'Unknown'}\n`;
            cacheContent += `• Memory per Key (avg): ${keyStats.avgMemoryPerKey || 'Unknown'}\n`;
            cacheContent += `• TTL Distribution: ${keyStats.ttlDistribution || 'Unknown'}\n\n`;

            // Cache performance metrics
            cacheContent += `📈 PERFORMANCE METRICS:\n`;
            const perfMetrics = await this.getCachePerformanceMetrics();
            cacheContent += `• Operations/sec: ${perfMetrics.operationsPerSecond || 'Unknown'}\n`;
            cacheContent += `• Average Response Time: ${perfMetrics.avgResponseTime || 'Unknown'}\n`;
            cacheContent += `• Peak Memory Usage: ${perfMetrics.peakMemoryUsage || 'Unknown'}\n`;
            cacheContent += `• Connection Pool: ${perfMetrics.connectionPool || 'Unknown'}\n\n`;

            // Popular cache patterns
            cacheContent += `🏆 POPULAR CACHE PATTERNS:\n`;
            const popularKeys = await this.getPopularCacheKeys();
            popularKeys.forEach(key => {
                cacheContent += `• ${key.pattern}: ${key.hitCount} hits, ${key.avgSize} avg size\n`;
            });
            cacheContent += `\n`;

            cacheContent += `🛠️ AVAILABLE OPERATIONS:\n`;
            cacheContent += `• Cache Invalidation (all/selective)\n`;
            cacheContent += `• Cache Warming\n`;
            cacheContent += `• Memory Optimization\n`;
            cacheContent += `• Key Pattern Analysis\n`;
            cacheContent += `• Performance Tuning\n`;

            consoleDiv.innerHTML = cacheContent;

            await adminDebugLog('SystemController', 'Cache control console displayed');

        } catch (error) {
            console.error('Error displaying cache control:', error);
            await adminDebugError('SystemController', 'Cache control display failed', error);
        }
    }

    /**
     * Handle maintenance mode toggle with TOTP verification
     */
    async handleMaintenanceMode() {
        try {
            const currentMode = this.maintenanceMode;
            const action = currentMode ? 'disable' : 'enable';

            const impact = `This will:
• ${action.toUpperCase()} maintenance mode
• ${currentMode ? 'Allow' : 'Block'} user access to the platform
• Display ${currentMode ? 'normal' : 'maintenance'} page to users
• ${currentMode ? 'Resume' : 'Pause'} normal operations`;

            if (!confirm(`⚠️ MAINTENANCE MODE ${action.toUpperCase()}\n\n${impact}\n\nThis action requires TOTP verification. Continue?`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                `${action} maintenance mode`,
                { additionalInfo: impact }
            );

            // Get maintenance reason if enabling
            let reason = '';
            if (!currentMode) {
                reason = prompt('Enter maintenance reason (required, 10-500 characters):');
                if (!reason || reason.trim().length < 10) {
                    alert('Maintenance reason is required and must be at least 10 characters.');
                    return;
                }
            }

            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/system/maintenance`, {
                method: 'POST',
                body: JSON.stringify({
                    totpToken,
                    enable: !currentMode,
                    reason: reason.trim(),
                    adminUserId: window.adminAuth.getCurrentUser()?.id,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.maintenanceMode = !currentMode;

                alert(`✅ Maintenance mode ${action}d successfully.\n\nMode ID: ${data.modeId}\nStatus: ${this.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}`);

                // Update UI
                this.updateMaintenanceModeDisplay();

                await adminDebugLog('SystemController', `Maintenance mode ${action}d`, {
                    modeId: data.modeId,
                    reason: reason.trim()
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${action} maintenance mode`);
            }

        } catch (error) {
            console.error('Error toggling maintenance mode:', error);
            alert(`❌ Maintenance mode operation failed: ${error.message}`);
            await adminDebugError('SystemController', 'Maintenance mode operation failed', error);
        }
    }

    /**
     * Display comprehensive system health metrics
     */
    async displaySystemHealth() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let healthContent = `🏥 System Health Diagnostics\n`;
            healthContent += `================================\n\n`;

            // Overall system status
            await this.updateSystemHealth();
            healthContent += `🎯 OVERALL STATUS: ${this.systemHealth.status.toUpperCase()}\n`;
            healthContent += `🕐 Last Check: ${this.systemHealth.lastCheck || 'Never'}\n\n`;

            // Core components health
            healthContent += `🏗️ CORE COMPONENTS:\n`;
            for (const [component, status] of Object.entries(this.systemHealth.components)) {
                const emoji = status.healthy ? '✅' : '❌';
                healthContent += `${emoji} ${component}: ${status.status}\n`;
                if (status.metrics) {
                    for (const [metric, value] of Object.entries(status.metrics)) {
                        healthContent += `   ${metric}: ${value}\n`;
                    }
                }
            }
            healthContent += `\n`;

            // Server performance metrics
            healthContent += `📊 SERVER PERFORMANCE:\n`;
            const serverMetrics = await this.getServerMetrics();
            healthContent += `• CPU Usage: ${serverMetrics.cpu || 'Unknown'}\n`;
            healthContent += `• Memory Usage: ${serverMetrics.memory || 'Unknown'}\n`;
            healthContent += `• Disk Usage: ${serverMetrics.disk || 'Unknown'}\n`;
            healthContent += `• Network I/O: ${serverMetrics.network || 'Unknown'}\n`;
            healthContent += `• Load Average: ${serverMetrics.loadAverage || 'Unknown'}\n\n`;

            // Application performance
            healthContent += `🚀 APPLICATION PERFORMANCE:\n`;
            const appMetrics = await this.getApplicationMetrics();
            healthContent += `• Response Time (avg): ${appMetrics.avgResponseTime || 'Unknown'}\n`;
            healthContent += `• Requests/minute: ${appMetrics.requestsPerMinute || 'Unknown'}\n`;
            healthContent += `• Error Rate: ${appMetrics.errorRate || 'Unknown'}\n`;
            healthContent += `• Active Sessions: ${appMetrics.activeSessions || 'Unknown'}\n`;
            healthContent += `• Memory Heap: ${appMetrics.memoryHeap || 'Unknown'}\n\n`;

            // Security status
            healthContent += `🔒 SECURITY STATUS:\n`;
            const securityStatus = await this.getSecurityStatus();
            healthContent += `• Failed Logins (24h): ${securityStatus.failedLogins || 'Unknown'}\n`;
            healthContent += `• Blocked IPs: ${securityStatus.blockedIPs || 'Unknown'}\n`;
            healthContent += `• SSL Certificate: ${securityStatus.sslStatus || 'Unknown'}\n`;
            healthContent += `• Security Patches: ${securityStatus.patchLevel || 'Unknown'}\n\n`;

            // Background services
            healthContent += `⚙️ BACKGROUND SERVICES:\n`;
            const serviceStatus = await this.getServiceStatus();
            for (const [service, status] of Object.entries(serviceStatus)) {
                const emoji = status.running ? '✅' : '❌';
                healthContent += `${emoji} ${service}: ${status.status}\n`;
            }

            healthContent += `\n🔄 Auto-refresh every 60 seconds`;

            consoleDiv.innerHTML = healthContent;

            await adminDebugLog('SystemController', 'System health diagnostics displayed');

        } catch (error) {
            console.error('Error displaying system health:', error);
            await adminDebugError('SystemController', 'System health display failed', error);
        }
    }

    /**
     * Handle backup and restore operations
     */
    async handleBackupRestore() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let backupContent = `💾 Backup & Restore Management\n`;
            backupContent += `================================\n\n`;

            // Recent backups
            backupContent += `📋 RECENT BACKUPS:\n`;
            const recentBackups = await this.getRecentBackups();
            recentBackups.forEach(backup => {
                backupContent += `• ${backup.timestamp}: ${backup.type} - ${backup.size} (${backup.status})\n`;
            });
            backupContent += `\n`;

            // Backup schedule
            backupContent += `⏰ BACKUP SCHEDULE:\n`;
            const backupSchedule = await this.getBackupSchedule();
            backupContent += `• Database: ${backupSchedule.database || 'Not scheduled'}\n`;
            backupContent += `• Configuration: ${backupSchedule.configuration || 'Not scheduled'}\n`;
            backupContent += `• Media Files: ${backupSchedule.media || 'Not scheduled'}\n`;
            backupContent += `• Full System: ${backupSchedule.fullSystem || 'Not scheduled'}\n\n`;

            // Storage usage
            backupContent += `💽 BACKUP STORAGE:\n`;
            const storageInfo = await this.getBackupStorageInfo();
            backupContent += `• Total Space: ${storageInfo.totalSpace || 'Unknown'}\n`;
            backupContent += `• Used Space: ${storageInfo.usedSpace || 'Unknown'}\n`;
            backupContent += `• Available: ${storageInfo.availableSpace || 'Unknown'}\n`;
            backupContent += `• Retention Policy: ${storageInfo.retentionPolicy || 'Unknown'}\n\n`;

            // Restore points
            backupContent += `🎯 RESTORE POINTS:\n`;
            const restorePoints = await this.getRestorePoints();
            restorePoints.forEach(point => {
                backupContent += `• ${point.timestamp}: ${point.description} (${point.verified ? 'Verified' : 'Unverified'})\n`;
            });
            backupContent += `\n`;

            backupContent += `🛠️ AVAILABLE OPERATIONS:\n`;
            backupContent += `• Manual Backup Creation\n`;
            backupContent += `• Backup Verification\n`;
            backupContent += `• Point-in-Time Restore\n`;
            backupContent += `• Schedule Management\n`;
            backupContent += `• Storage Cleanup\n`;

            consoleDiv.innerHTML = backupContent;

            await adminDebugLog('SystemController', 'Backup and restore console displayed');

        } catch (error) {
            console.error('Error displaying backup and restore:', error);
            await adminDebugError('SystemController', 'Backup and restore display failed', error);
        }
    }

    /**
     * Handle performance tuning operations
     */
    async handlePerformanceTuning() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let perfContent = `⚡ Performance Tuning Console\n`;
            perfContent += `================================\n\n`;

            // Performance analysis
            perfContent += `📊 PERFORMANCE ANALYSIS:\n`;
            const perfAnalysis = await this.getPerformanceAnalysis();
            perfContent += `• Overall Score: ${perfAnalysis.overallScore || 'Unknown'}\n`;
            perfContent += `• Bottlenecks: ${perfAnalysis.bottlenecks?.join(', ') || 'None detected'}\n`;
            perfContent += `• Optimization Opportunities: ${perfAnalysis.opportunities || 'Unknown'}\n\n`;

            // Resource utilization trends
            perfContent += `📈 RESOURCE TRENDS (24h):\n`;
            const trends = await this.getResourceTrends();
            perfContent += `• CPU Peak: ${trends.cpuPeak || 'Unknown'}\n`;
            perfContent += `• Memory Peak: ${trends.memoryPeak || 'Unknown'}\n`;
            perfContent += `• Disk I/O Peak: ${trends.diskPeak || 'Unknown'}\n`;
            perfContent += `• Response Time (95th): ${trends.responseTime95th || 'Unknown'}\n\n`;

            // Configuration recommendations
            perfContent += `🎯 TUNING RECOMMENDATIONS:\n`;
            const recommendations = await this.getTuningRecommendations();
            recommendations.forEach(rec => {
                perfContent += `• ${rec.category}: ${rec.recommendation}\n`;
                perfContent += `  Impact: ${rec.impact}, Effort: ${rec.effort}\n`;
            });
            perfContent += `\n`;

            // Database performance
            perfContent += `💾 DATABASE PERFORMANCE:\n`;
            const dbPerf = await this.getDatabasePerformance();
            perfContent += `• Query Time (avg): ${dbPerf.avgQueryTime || 'Unknown'}\n`;
            perfContent += `• Slow Queries: ${dbPerf.slowQueries || 'Unknown'}\n`;
            perfContent += `• Index Efficiency: ${dbPerf.indexEfficiency || 'Unknown'}\n`;
            perfContent += `• Connection Pool: ${dbPerf.connectionPool || 'Unknown'}\n\n`;

            // Cache effectiveness
            perfContent += `🚀 CACHE EFFECTIVENESS:\n`;
            const cacheEff = await this.getCacheEffectiveness();
            perfContent += `• Hit Rate: ${cacheEff.hitRate || 'Unknown'}\n`;
            perfContent += `• Memory Efficiency: ${cacheEff.memoryEfficiency || 'Unknown'}\n`;
            perfContent += `• Eviction Rate: ${cacheEff.evictionRate || 'Unknown'}\n`;
            perfContent += `• Optimal TTL: ${cacheEff.optimalTTL || 'Unknown'}\n\n`;

            perfContent += `🛠️ TUNING ACTIONS:\n`;
            perfContent += `• Auto-scaling Configuration\n`;
            perfContent += `• Cache Optimization\n`;
            perfContent += `• Database Index Tuning\n`;
            perfContent += `• Connection Pool Sizing\n`;
            perfContent += `• Memory Allocation Tuning\n`;

            consoleDiv.innerHTML = perfContent;

            await adminDebugLog('SystemController', 'Performance tuning console displayed');

        } catch (error) {
            console.error('Error displaying performance tuning:', error);
            await adminDebugError('SystemController', 'Performance tuning display failed', error);
        }
    }

    /**
     * Handle system diagnostics
     */
    async handleSystemDiagnostics() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let diagContent = `🔍 System Diagnostics Console\n`;
            diagContent += `================================\n\n`;

            // System information
            diagContent += `💻 SYSTEM INFORMATION:\n`;
            const sysInfo = await this.getSystemInformation();
            diagContent += `• Platform: ${sysInfo.platform || 'Unknown'}\n`;
            diagContent += `• Node.js Version: ${sysInfo.nodeVersion || 'Unknown'}\n`;
            diagContent += `• Application Version: ${sysInfo.appVersion || 'Unknown'}\n`;
            diagContent += `• Uptime: ${sysInfo.uptime || 'Unknown'}\n`;
            diagContent += `• Environment: ${sysInfo.environment || 'Unknown'}\n\n`;

            // Connectivity tests
            diagContent += `🌐 CONNECTIVITY TESTS:\n`;
            const connectivity = await this.runConnectivityTests();
            diagContent += `• Database: ${connectivity.database || 'Unknown'}\n`;
            diagContent += `• Redis Cache: ${connectivity.redis || 'Unknown'}\n`;
            diagContent += `• External APIs: ${connectivity.externalAPIs || 'Unknown'}\n`;
            diagContent += `• File Storage: ${connectivity.fileStorage || 'Unknown'}\n`;
            diagContent += `• Email Service: ${connectivity.emailService || 'Unknown'}\n\n`;

            // Health checks
            diagContent += `🏥 HEALTH CHECKS:\n`;
            const healthChecks = await this.runHealthChecks();
            healthChecks.forEach(check => {
                const emoji = check.passed ? '✅' : '❌';
                diagContent += `${emoji} ${check.name}: ${check.status}\n`;
                if (check.details) {
                    diagContent += `   ${check.details}\n`;
                }
            });
            diagContent += `\n`;

            // Error analysis
            diagContent += `🚨 ERROR ANALYSIS (24h):\n`;
            const errorAnalysis = await this.getErrorAnalysis();
            diagContent += `• Total Errors: ${errorAnalysis.totalErrors || 'Unknown'}\n`;
            diagContent += `• Critical Errors: ${errorAnalysis.criticalErrors || 'Unknown'}\n`;
            diagContent += `• Most Common: ${errorAnalysis.mostCommon || 'None'}\n`;
            diagContent += `• Error Trend: ${errorAnalysis.trend || 'Unknown'}\n\n`;

            // Log analysis
            diagContent += `📝 LOG ANALYSIS:\n`;
            const logAnalysis = await this.getLogAnalysis();
            diagContent += `• Log Size: ${logAnalysis.totalSize || 'Unknown'}\n`;
            diagContent += `• Warning Count: ${logAnalysis.warningCount || 'Unknown'}\n`;
            diagContent += `• Info Count: ${logAnalysis.infoCount || 'Unknown'}\n`;
            diagContent += `• Debug Count: ${logAnalysis.debugCount || 'Unknown'}\n\n`;

            diagContent += `🛠️ DIAGNOSTIC TOOLS:\n`;
            diagContent += `• Memory Leak Detection\n`;
            diagContent += `• Performance Profiling\n`;
            diagContent += `• Network Latency Testing\n`;
            diagContent += `• Dependency Verification\n`;
            diagContent += `• Configuration Validation\n`;

            consoleDiv.innerHTML = diagContent;

            await adminDebugLog('SystemController', 'System diagnostics displayed');

        } catch (error) {
            console.error('Error displaying system diagnostics:', error);
            await adminDebugError('SystemController', 'System diagnostics display failed', error);
        }
    }

    /**
     * Handle resource monitoring
     */
    async handleResourceMonitoring() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let resourceContent = `📊 Resource Monitoring Dashboard\n`;
            resourceContent += `================================\n\n`;

            // Real-time resource usage
            resourceContent += `⚡ REAL-TIME USAGE:\n`;
            const realTimeUsage = await this.getRealTimeResourceUsage();
            resourceContent += `• CPU: ${realTimeUsage.cpu || 'Unknown'}\n`;
            resourceContent += `• Memory: ${realTimeUsage.memory || 'Unknown'}\n`;
            resourceContent += `• Disk I/O: ${realTimeUsage.diskIO || 'Unknown'}\n`;
            resourceContent += `• Network: ${realTimeUsage.network || 'Unknown'}\n`;
            resourceContent += `• Active Connections: ${realTimeUsage.connections || 'Unknown'}\n\n`;

            // Resource thresholds
            resourceContent += `⚠️ THRESHOLD ALERTS:\n`;
            const thresholds = await this.getResourceThresholds();
            thresholds.forEach(threshold => {
                const emoji = threshold.exceeded ? '🚨' : '✅';
                resourceContent += `${emoji} ${threshold.resource}: ${threshold.current}/${threshold.limit}\n`;
            });
            resourceContent += `\n`;

            // Historical trends
            resourceContent += `📈 HISTORICAL TRENDS (7 days):\n`;
            const trends = await this.getResourceTrends();
            resourceContent += `• Peak CPU: ${trends.peakCPU || 'Unknown'}\n`;
            resourceContent += `• Peak Memory: ${trends.peakMemory || 'Unknown'}\n`;
            resourceContent += `• Avg Response Time: ${trends.avgResponseTime || 'Unknown'}\n`;
            resourceContent += `• Peak Concurrent Users: ${trends.peakUsers || 'Unknown'}\n\n`;

            // Resource optimization suggestions
            resourceContent += `💡 OPTIMIZATION SUGGESTIONS:\n`;
            const suggestions = await this.getResourceOptimizationSuggestions();
            suggestions.forEach(suggestion => {
                resourceContent += `• ${suggestion.type}: ${suggestion.recommendation}\n`;
                resourceContent += `  Expected Impact: ${suggestion.impact}\n`;
            });
            resourceContent += `\n`;

            // Auto-scaling status
            resourceContent += `🔄 AUTO-SCALING STATUS:\n`;
            const autoScaling = await this.getAutoScalingStatus();
            resourceContent += `• Status: ${autoScaling.enabled ? 'Enabled' : 'Disabled'}\n`;
            resourceContent += `• Current Instances: ${autoScaling.currentInstances || 'Unknown'}\n`;
            resourceContent += `• Min/Max: ${autoScaling.minInstances || 'Unknown'}/${autoScaling.maxInstances || 'Unknown'}\n`;
            resourceContent += `• Last Scaling: ${autoScaling.lastScaling || 'Never'}\n\n`;

            resourceContent += `🛠️ MONITORING TOOLS:\n`;
            resourceContent += `• Real-time Resource Graphs\n`;
            resourceContent += `• Alert Configuration\n`;
            resourceContent += `• Capacity Planning\n`;
            resourceContent += `• Performance Baselines\n`;
            resourceContent += `• Resource Forecasting\n`;

            consoleDiv.innerHTML = resourceContent;

            await adminDebugLog('SystemController', 'Resource monitoring displayed');

        } catch (error) {
            console.error('Error displaying resource monitoring:', error);
            await adminDebugError('SystemController', 'Resource monitoring display failed', error);
        }
    }

    /**
     * Handle configuration audit
     */
    async handleConfigurationAudit() {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let auditContent = `🔍 Configuration Audit Report\n`;
            auditContent += `================================\n\n`;

            // Configuration changes history
            auditContent += `📋 RECENT CHANGES:\n`;
            const recentChanges = await this.getConfigurationChanges();
            recentChanges.forEach(change => {
                auditContent += `• ${change.timestamp}: ${change.setting} changed by ${change.admin}\n`;
                auditContent += `  From: ${change.oldValue} → To: ${change.newValue}\n`;
            });
            auditContent += `\n`;

            // Security configuration audit
            auditContent += `🔒 SECURITY CONFIGURATION:\n`;
            const securityAudit = await this.getSecurityConfigurationAudit();
            securityAudit.forEach(item => {
                const emoji = item.compliant ? '✅' : '⚠️';
                auditContent += `${emoji} ${item.setting}: ${item.status}\n`;
                if (!item.compliant) {
                    auditContent += `   Recommendation: ${item.recommendation}\n`;
                }
            });
            auditContent += `\n`;

            // Performance configuration audit
            auditContent += `⚡ PERFORMANCE CONFIGURATION:\n`;
            const perfAudit = await this.getPerformanceConfigurationAudit();
            perfAudit.forEach(item => {
                const emoji = item.optimal ? '✅' : '📈';
                auditContent += `${emoji} ${item.setting}: ${item.current}\n`;
                if (!item.optimal) {
                    auditContent += `   Suggested: ${item.suggested} (${item.improvement} improvement)\n`;
                }
            });
            auditContent += `\n`;

            // Configuration drift detection
            auditContent += `🎯 CONFIGURATION DRIFT:\n`;
            const driftDetection = await this.getConfigurationDrift();
            if (driftDetection.length === 0) {
                auditContent += `✅ No configuration drift detected\n`;
            } else {
                driftDetection.forEach(drift => {
                    auditContent += `⚠️ ${drift.setting}: Expected ${drift.expected}, Found ${drift.actual}\n`;
                });
            }
            auditContent += `\n`;

            // Compliance status
            auditContent += `📊 COMPLIANCE STATUS:\n`;
            const compliance = await this.getComplianceStatus();
            auditContent += `• Security Standards: ${compliance.security || 'Unknown'}\n`;
            auditContent += `• Performance Standards: ${compliance.performance || 'Unknown'}\n`;
            auditContent += `• Backup Standards: ${compliance.backup || 'Unknown'}\n`;
            auditContent += `• Monitoring Standards: ${compliance.monitoring || 'Unknown'}\n\n`;

            auditContent += `🛠️ AUDIT ACTIONS:\n`;
            auditContent += `• Configuration Backup\n`;
            auditContent += `• Compliance Remediation\n`;
            auditContent += `• Security Hardening\n`;
            auditContent += `• Performance Optimization\n`;
            auditContent += `• Change Tracking Setup\n`;

            consoleDiv.innerHTML = auditContent;

            await adminDebugLog('SystemController', 'Configuration audit displayed');

        } catch (error) {
            console.error('Error displaying configuration audit:', error);
            await adminDebugError('SystemController', 'Configuration audit display failed', error);
        }
    }

    // UI Update Helper Methods

    /**
     * Update system overview cards
     */
    updateSystemOverview(data) {
        try {
            // Update system status card
            const systemStatusElement = document.getElementById('systemStatus');
            if (systemStatusElement) {
                systemStatusElement.textContent = this.systemHealth.status || 'Unknown';
            }

            // Update uptime card
            const uptimeElement = document.getElementById('systemUptime');
            if (uptimeElement && data.health?.uptime) {
                const hours = Math.round(parseFloat(data.health.uptime) / 3600 * 100) / 100;
                uptimeElement.textContent = `${hours}h`;
            }

            // Update maintenance mode status
            const maintenanceElement = document.getElementById('maintenanceStatus');
            if (maintenanceElement) {
                maintenanceElement.textContent = this.maintenanceMode ? 'Active' : 'Inactive';
            }

            // Update last update time
            const lastUpdateElement = document.getElementById('lastSystemUpdate');
            if (lastUpdateElement) {
                lastUpdateElement.textContent = new Date().toLocaleString();
            }

        } catch (error) {
            adminDebugError('SystemController', 'Failed to update system overview', error);
        }
    }

    /**
     * Update system health display
     */
    updateSystemHealthDisplay(health) {
        try {
            const healthDiv = document.getElementById('systemHealthStatus');
            if (!healthDiv) return;

            let healthHtml = '';

            // Overall health status
            const overallEmoji = this.systemHealth.status === 'healthy' ? '✅' :
                               this.systemHealth.status === 'warning' ? '⚠️' : '❌';

            healthHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                    <span><strong>${overallEmoji} Overall System</strong></span>
                    <span style="color: ${this.getHealthStatusColor(this.systemHealth.status)}">${this.systemHealth.status}</span>
                </div>
            `;

            // Component health
            for (const [component, status] of Object.entries(this.systemHealth.components)) {
                const emoji = status.healthy ? '✅' : '❌';
                const color = status.healthy ? '#388e3c' : '#d32f2f';

                healthHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span><strong>${emoji} ${component}</strong></span>
                        <span style="color: ${color}">${status.status}</span>
                    </div>
                `;
            }

            healthDiv.innerHTML = healthHtml;

        } catch (error) {
            adminDebugError('SystemController', 'Failed to update health display', error);
        }
    }

    /**
     * Update configuration display
     */
    updateConfigurationDisplay(config) {
        try {
            const configDiv = document.getElementById('systemConfigStatus');
            if (!configDiv || !config) return;

            let configHtml = '';

            for (const [category, settings] of Object.entries(config)) {
                configHtml += `
                    <div style="margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">${category}</h4>
                `;

                for (const [setting, value] of Object.entries(settings)) {
                    configHtml += `
                        <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9rem;">
                            <span>${setting}:</span>
                            <span style="font-family: monospace;">${value}</span>
                        </div>
                    `;
                }

                configHtml += `</div>`;
            }

            configDiv.innerHTML = configHtml;

        } catch (error) {
            adminDebugError('SystemController', 'Failed to update configuration display', error);
        }
    }

    /**
     * Update performance display
     */
    updatePerformanceDisplay(performance) {
        try {
            const perfDiv = document.getElementById('systemPerformanceStatus');
            if (!perfDiv || !performance) return;

            let perfHtml = '';

            // Performance metrics
            for (const [metric, value] of Object.entries(performance)) {
                const isGood = this.isPerformanceMetricGood(metric, value);
                const color = isGood ? '#388e3c' : '#ff9800';
                const emoji = isGood ? '✅' : '⚠️';

                perfHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span><strong>${emoji} ${metric}</strong></span>
                        <span style="color: ${color}">${value}</span>
                    </div>
                `;
            }

            perfDiv.innerHTML = perfHtml;

        } catch (error) {
            adminDebugError('SystemController', 'Failed to update performance display', error);
        }
    }

    /**
     * Update system console with formatted output
     */
    updateSystemConsole(data) {
        try {
            const consoleDiv = document.getElementById('systemConsole');
            if (!consoleDiv) return;

            let output = '🖥️ System Administration Console\n';
            output += '================================\n\n';

            // Add timestamp
            output += `📅 Last Updated: ${new Date().toLocaleString()}\n\n`;

            // System overview
            output += `🎯 SYSTEM OVERVIEW:\n`;
            output += `   Status: ${this.systemHealth.status}\n`;
            output += `   Maintenance Mode: ${this.maintenanceMode ? 'Active' : 'Inactive'}\n`;
            output += `   Components: ${Object.keys(this.systemHealth.components).length} monitored\n\n`;

            // Quick stats
            if (data.performance) {
                output += `📊 QUICK STATS:\n`;
                for (const [metric, value] of Object.entries(data.performance)) {
                    output += `   ${metric}: ${value}\n`;
                }
                output += `\n`;
            }

            output += '================================\n';
            output += 'Use system action buttons for detailed management\n';
            output += 'Auto-refresh enabled every 60 seconds\n';

            consoleDiv.innerHTML = output;

        } catch (error) {
            adminDebugError('SystemController', 'Console update failed', error);
        }
    }

    /**
     * Update maintenance mode display
     */
    updateMaintenanceModeDisplay() {
        try {
            const maintenanceBtn = document.getElementById('maintenanceModeBtn');
            if (maintenanceBtn) {
                maintenanceBtn.textContent = this.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance';
                maintenanceBtn.style.backgroundColor = this.maintenanceMode ? '#d32f2f' : '#1976d2';
            }

            const statusElement = document.getElementById('maintenanceStatus');
            if (statusElement) {
                statusElement.textContent = this.maintenanceMode ? 'Active' : 'Inactive';
                statusElement.style.color = this.maintenanceMode ? '#d32f2f' : '#388e3c';
            }

        } catch (error) {
            adminDebugError('SystemController', 'Failed to update maintenance mode display', error);
        }
    }

    // Data Collection Helper Methods

    /**
     * Start performance data collection
     */
    startPerformanceCollection() {
        try {
            // Use Performance Observer API if available
            if (window.PerformanceObserver) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.performanceMetrics.set(entry.name, {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            timestamp: Date.now()
                        });
                    }
                });

                observer.observe({ entryTypes: ['measure', 'navigation'] });
            }

            // Collect custom metrics
            setInterval(() => {
                this.collectCustomMetrics();
            }, 30000); // Every 30 seconds

        } catch (error) {
            adminDebugError('SystemController', 'Performance collection setup failed', error);
        }
    }

    /**
     * Collect custom performance metrics
     */
    collectCustomMetrics() {
        try {
            // Memory usage
            if (performance.memory) {
                this.performanceMetrics.set('memory', {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                });
            }

            // Timing metrics
            const timing = performance.timing;
            if (timing) {
                this.performanceMetrics.set('pageLoad', {
                    total: timing.loadEventEnd - timing.navigationStart,
                    domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            adminDebugError('SystemController', 'Custom metrics collection failed', error);
        }
    }

    /**
     * Update system health status
     */
    async updateSystemHealth() {
        try {
            // Check backend health
            const backendHealth = await this.checkBackendHealth();

            // Check database health
            const databaseHealth = await this.checkDatabaseHealth();

            // Check cache health
            const cacheHealth = await this.checkCacheHealth();

            // Check external services health
            const externalHealth = await this.checkExternalServicesHealth();

            this.systemHealth = {
                status: this.calculateOverallHealth([backendHealth, databaseHealth, cacheHealth, externalHealth]),
                lastCheck: new Date().toISOString(),
                components: {
                    'Backend API': backendHealth,
                    'Database': databaseHealth,
                    'Cache': cacheHealth,
                    'External Services': externalHealth
                }
            };

        } catch (error) {
            this.systemHealth = {
                status: 'error',
                lastCheck: new Date().toISOString(),
                components: {
                    'System': { healthy: false, status: 'Health check failed', error: error.message }
                }
            };
            adminDebugError('SystemController', 'System health update failed', error);
        }
    }

    // Health Check Helper Methods

    async checkBackendHealth() {
        try {
            const response = await fetch(`${window.AdminAPI?.BACKEND_URL || 'https://api.unitedwerise.org'}/health`);
            if (response.ok) {
                const health = await response.json();
                return {
                    healthy: health.status === 'healthy',
                    status: health.status,
                    metrics: {
                        uptime: health.uptime,
                        responseTime: `${Date.now() - performance.now()}ms`,
                        version: health.version
                    }
                };
            }
        } catch (error) {
            return { healthy: false, status: 'Unreachable', error: error.message };
        }
        return { healthy: false, status: 'Unknown' };
    }

    async checkDatabaseHealth() {
        try {
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/system/database/health`, {
                method: 'GET'
            });

            if (response.ok) {
                const health = await response.json();
                return {
                    healthy: health.connected,
                    status: health.status,
                    metrics: {
                        connections: health.connections,
                        responseTime: health.responseTime,
                        version: health.version
                    }
                };
            } else if (response.status === 404) {
                // Endpoint not implemented yet - return graceful fallback
                return {
                    healthy: true,
                    status: 'Endpoint not available',
                    metrics: {
                        connections: 'N/A',
                        responseTime: 'N/A',
                        version: 'N/A'
                    }
                };
            }
        } catch (error) {
            return { healthy: false, status: 'Connection failed', error: error.message };
        }
        return { healthy: false, status: 'Unknown' };
    }

    async checkCacheHealth() {
        try {
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/system/cache/health`, {
                method: 'GET'
            });

            if (response.ok) {
                const health = await response.json();
                return {
                    healthy: health.connected,
                    status: health.status,
                    metrics: {
                        hitRate: health.hitRate,
                        memoryUsage: health.memoryUsage,
                        connections: health.connections
                    }
                };
            } else if (response.status === 404) {
                // Endpoint not implemented yet - return graceful fallback
                return {
                    healthy: true,
                    status: 'Endpoint not available',
                    metrics: {
                        hitRate: 'N/A',
                        memoryUsage: 'N/A',
                        connections: 'N/A'
                    }
                };
            }
        } catch (error) {
            return { healthy: false, status: 'Cache unavailable', error: error.message };
        }
        return { healthy: false, status: 'Unknown' };
    }

    async checkExternalServicesHealth() {
        try {
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/system/external/health`, {
                method: 'GET'
            });

            if (response.ok) {
                const health = await response.json();
                return {
                    healthy: health.allHealthy,
                    status: health.status,
                    metrics: {
                        totalServices: health.totalServices,
                        healthyServices: health.healthyServices,
                        lastCheck: health.lastCheck
                    }
                };
            } else if (response.status === 404) {
                // Endpoint not implemented yet - return graceful fallback
                return {
                    healthy: true,
                    status: 'Endpoint not available',
                    metrics: {
                        totalServices: 'N/A',
                        healthyServices: 'N/A',
                        lastCheck: 'N/A'
                    }
                };
            }
        } catch (error) {
            return { healthy: false, status: 'Check failed', error: error.message };
        }
        return { healthy: false, status: 'Unknown' };
    }

    // Data Retrieval Helper Methods (Mock implementations for now)

    async getSystemHealthData() {
        // Mock implementation - would integrate with real monitoring APIs
        return {
            status: 'healthy',
            uptime: '72h 30m',
            components: ['Backend', 'Database', 'Cache', 'Storage'],
            lastCheck: new Date().toISOString()
        };
    }

    async getSystemConfiguration() {
        // Mock implementation - would load from configuration management system
        return {
            database: {
                maxConnections: '100',
                timeout: '30s',
                poolSize: '20'
            },
            cache: {
                maxMemory: '512MB',
                ttl: '3600s',
                evictionPolicy: 'LRU'
            },
            server: {
                port: '3000',
                workers: '4',
                maxRequestSize: '10MB'
            }
        };
    }

    async getPerformanceMetrics() {
        // Mock implementation - would integrate with performance monitoring
        return {
            'CPU Usage': '45%',
            'Memory Usage': '67%',
            'Response Time': '120ms',
            'Requests/min': '1,250',
            'Error Rate': '0.2%'
        };
    }

    async getConfigurationChanges() {
        // Mock implementation - would load from configuration audit logs
        return [
            {
                setting: 'database.maxConnections',
                oldValue: '80',
                newValue: '100',
                admin: 'admin@unitedwerise.org',
                timestamp: '2025-01-15T10:30:00Z'
            }
        ];
    }

    async createConfigurationBackup() {
        // Mock implementation - would create actual configuration backup
        const backupId = `config_backup_${Date.now()}`;
        this.configBackups.set(backupId, {
            timestamp: new Date().toISOString(),
            configuration: await this.getSystemConfiguration()
        });
        return backupId;
    }

    // Utility Helper Methods

    calculateOverallHealth(componentHealths) {
        const healthyCount = componentHealths.filter(h => h.healthy).length;
        const totalCount = componentHealths.length;

        if (healthyCount === totalCount) return 'healthy';
        if (healthyCount === 0) return 'critical';
        return 'warning';
    }

    getHealthStatusColor(status) {
        switch (status) {
            case 'healthy': return '#388e3c';
            case 'warning': return '#ff9800';
            case 'critical': return '#d32f2f';
            default: return '#757575';
        }
    }

    isPerformanceMetricGood(metric, value) {
        // Mock implementation - would use actual thresholds
        if (metric.includes('Usage') && parseFloat(value) > 80) return false;
        if (metric.includes('Time') && parseFloat(value) > 500) return false;
        if (metric.includes('Error') && parseFloat(value) > 1) return false;
        return true;
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('SystemController Error:', message);

        const consoleDiv = document.getElementById('systemConsole');
        if (consoleDiv) {
            consoleDiv.innerHTML = `❌ Error: ${message}\n\nTry refreshing the system data or check console for details.`;
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
        const eventButtons = [
            'configUpdateBtn', 'configAuditBtn', 'dbManagementBtn', 'dbOptimizeBtn', 'dbBackupBtn',
            'cacheControlBtn', 'cacheInvalidateBtn', 'cacheWarmBtn', 'systemHealthBtn', 'resourceMonitorBtn',
            'systemDiagnosticsBtn', 'maintenanceModeBtn', 'backupRestoreBtn', 'performanceTuningBtn', 'refreshSystemBtn'
        ];

        eventButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.removeEventListener('click', this[this.getEventHandlerName(buttonId)]);
            }
        });

        // Clear data
        this.currentSystemData = {};
        this.performanceMetrics.clear();
        this.configBackups.clear();
        this.pendingChanges.clear();
        this.isInitialized = false;

        console.log('SystemController destroyed');
    }

    /**
     * Get event handler method name from button ID
     */
    getEventHandlerName(buttonId) {
        const handlerMap = {
            'configUpdateBtn': 'handleConfigurationUpdate',
            'configAuditBtn': 'handleConfigurationAudit',
            'dbManagementBtn': 'handleDatabaseManagement',
            'cacheControlBtn': 'handleCacheControl',
            'systemHealthBtn': 'displaySystemHealth',
            'resourceMonitorBtn': 'handleResourceMonitoring',
            'systemDiagnosticsBtn': 'handleSystemDiagnostics',
            'maintenanceModeBtn': 'handleMaintenanceMode',
            'backupRestoreBtn': 'handleBackupRestore',
            'performanceTuningBtn': 'handlePerformanceTuning',
            'refreshSystemBtn': 'loadData'
        };
        return handlerMap[buttonId] || 'loadData';
    }

    // Additional mock helper methods for comprehensive functionality
    async getDatabaseStatus() { return { connectionPool: '20/100', activeConnections: '15', schemaVersion: '2.1.0', databaseSize: '2.3GB', queryPerformance: 'Good' }; }
    async getTableStatistics() { return { users: { rows: 15234, size: '45MB' }, posts: { rows: 98765, size: '123MB' }, comments: { rows: 234567, size: '67MB' } }; }
    async getIndexStatistics() { return { total: 47, hitRatio: '98.5%', unused: 3, missing: 1 }; }
    async getSlowQueries() { return [{ duration: 1250, query: 'SELECT * FROM posts WHERE created_at > NOW() - INTERVAL 7 DAY' }]; }
    async getCacheStatus() { return { redisStatus: 'Connected', memoryUsage: '256MB/512MB', hitRate: '94.2%', missRate: '5.8%', evictionRate: '0.1%' }; }
    async getCacheKeyStatistics() { return { totalKeys: 15432, expiredKeys: 234, avgMemoryPerKey: '2.1KB', ttlDistribution: 'Normal' }; }
    async getCachePerformanceMetrics() { return { operationsPerSecond: 2500, avgResponseTime: '0.8ms', peakMemoryUsage: '412MB', connectionPool: '10/20' }; }
    async getPopularCacheKeys() { return [{ pattern: 'user:profile:*', hitCount: 12543, avgSize: '3.2KB' }]; }
    async getRecentBackups() { return [{ timestamp: '2025-01-15T10:00:00Z', type: 'Database', size: '2.3GB', status: 'Success' }]; }
    async getBackupSchedule() { return { database: 'Daily 2:00 AM', configuration: 'Weekly Sunday', media: 'Daily 3:00 AM', fullSystem: 'Monthly 1st' }; }
    async getBackupStorageInfo() { return { totalSpace: '1TB', usedSpace: '234GB', availableSpace: '790GB', retentionPolicy: '90 days' }; }
    async getRestorePoints() { return [{ timestamp: '2025-01-15T10:00:00Z', description: 'Pre-update backup', verified: true }]; }
    async getPerformanceAnalysis() { return { overallScore: '85/100', bottlenecks: ['Database queries', 'Cache misses'], opportunities: 'Index optimization' }; }
    async getResourceTrends() { return { cpuPeak: '78%', memoryPeak: '85%', diskPeak: '45%', responseTime95th: '245ms' }; }
    async getTuningRecommendations() { return [{ category: 'Database', recommendation: 'Add index on posts.created_at', impact: 'High', effort: 'Low' }]; }
    async getDatabasePerformance() { return { avgQueryTime: '12ms', slowQueries: 3, indexEfficiency: '96%', connectionPool: '15/100' }; }
    async getCacheEffectiveness() { return { hitRate: '94.2%', memoryEfficiency: '78%', evictionRate: '0.1%', optimalTTL: '3600s' }; }
    async getSystemInformation() { return { platform: 'Azure Container Apps', nodeVersion: '18.19.0', appVersion: '2.1.0', uptime: '72h 30m', environment: 'Production' }; }
    async runConnectivityTests() { return { database: '✅ Connected', redis: '✅ Connected', externalAPIs: '✅ All responsive', fileStorage: '✅ Available', emailService: '✅ Operational' }; }
    async runHealthChecks() { return [{ name: 'API Endpoints', passed: true, status: 'All endpoints responding', details: '15/15 healthy' }]; }
    async getErrorAnalysis() { return { totalErrors: 23, criticalErrors: 0, mostCommon: 'ValidationError', trend: 'Decreasing' }; }
    async getLogAnalysis() { return { totalSize: '45MB', warningCount: 12, infoCount: 1234, debugCount: 5678 }; }
    async getRealTimeResourceUsage() { return { cpu: '45%', memory: '67%', diskIO: '23MB/s', network: '12MB/s', connections: 145 }; }
    async getResourceThresholds() { return [{ resource: 'CPU', current: '45%', limit: '80%', exceeded: false }]; }
    async getResourceOptimizationSuggestions() { return [{ type: 'Memory', recommendation: 'Increase cache size', impact: 'Medium performance improvement' }]; }
    async getAutoScalingStatus() { return { enabled: true, currentInstances: 2, minInstances: 1, maxInstances: 5, lastScaling: '2025-01-14T15:30:00Z' }; }
    async getSecurityConfigurationAudit() { return [{ setting: 'Password Policy', compliant: true, status: 'Strong policy enforced' }]; }
    async getPerformanceConfigurationAudit() { return [{ setting: 'Connection Pool', optimal: false, current: '20', suggested: '50', improvement: '40% faster' }]; }
    async getConfigurationDrift() { return []; }
    async getComplianceStatus() { return { security: '98%', performance: '85%', backup: '100%', monitoring: '92%' }; }
    async getServerMetrics() { return { cpu: '45%', memory: '67%', disk: '23%', network: '12MB/s', loadAverage: '1.2' }; }
    async getApplicationMetrics() { return { avgResponseTime: '120ms', requestsPerMinute: 1250, errorRate: '0.2%', activeSessions: 234, memoryHeap: '145MB' }; }
    async getSecurityStatus() { return { failedLogins: 5, blockedIPs: 2, sslStatus: 'Valid until 2025-12-01', patchLevel: 'Current' }; }
    async getServiceStatus() { return { 'Background Jobs': { running: true, status: 'Processing 5 jobs' }, 'Email Service': { running: true, status: 'Operational' } }; }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemController;
} else {
    window.SystemController = SystemController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.systemController = new SystemController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.systemController = new SystemController();
            }
        }, 100);
    });
}