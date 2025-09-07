/**
 * Deployment Status Checker
 * 
 * Shows deployment timestamps for all components in the browser console
 * Helps track whether changes have actually deployed across the system
 */

(function() {
    'use strict';
    
    // Component deployment tracking
    const DEPLOYMENT_CONFIG = {
        // Check intervals (in milliseconds)
        CHECK_INTERVAL: 300000, // 5 minutes
        STARTUP_DELAY: 2000,    // 2 seconds after page load
        
        // Component endpoints (using full backend URLs)
        ENDPOINTS: {
            backend: 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health',
            database: 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health/database',
            batch: 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/batch/health-check',
            reputation: 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/reputation/health'
        },
        
        // Local component info
        FRONTEND_BUILD_TIME: new Date().toISOString(), // Current deployment time
        SCHEMA_VERSION: 'v1.0.0-1755133483176' // Will be replaced during build
    };
    
    class DeploymentStatusChecker {
        constructor() {
            this.lastStatus = {};
            this.startTime = new Date();
            this.checkCount = 0;
        }
        
        async initialize() {
            if (typeof adminDebugLog !== 'undefined') {
                await adminDebugLog('DeploymentStatus', '🚀 Deployment Status Checker Initialized');
            }
            
            // Show initial status after page loads
            setTimeout(() => {
                this.checkAllComponents();
            }, DEPLOYMENT_CONFIG.STARTUP_DELAY);
            
            // Set up periodic checks
            setInterval(() => {
                this.checkAllComponents();
            }, DEPLOYMENT_CONFIG.CHECK_INTERVAL);
        }
        
        async checkAllComponents() {
            this.checkCount++;
            const now = new Date();
            
            if (typeof adminDebugLog !== 'undefined') {
                await adminDebugLog('DeploymentStatus', `📊 Deployment Status Check #${this.checkCount}`, {
                    timestamp: now.toLocaleTimeString(),
                    checkNumber: this.checkCount
                });
            }
            
            // Check all components
            await Promise.all([
                this.checkFrontend(),
                this.checkBackend(),
                this.checkDatabase(),
                this.checkBatchEndpoint(),
                this.checkReputationSystem()
            ]);
            
 // Empty line for readability
        }
        
        checkFrontend() {
            try {
                const buildTime = this.extractBuildTime();
                const pageLoadTime = performance.timing ? 
                    new Date(performance.timing.navigationStart) : 
                    this.startTime;
                
                const status = {
                    component: 'Frontend',
                    buildTime: buildTime,
                    lastLoaded: pageLoadTime,
                    version: this.extractVersion(),
                    cacheStatus: this.getCacheStatus()
                };
                
                this.logComponentStatus(status);
                this.lastStatus.frontend = status;
            } catch (error) {
                this.logComponentError('Frontend', error);
            }
        }
        
        async checkBackend() {
            try {
                const response = await fetch(DEPLOYMENT_CONFIG.ENDPOINTS.backend, {
                    headers: { 
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const status = {
                        component: 'Backend',
                        uptime: data.uptime ? `${Math.floor(data.uptime / 60)} minutes` : 'Unknown',
                        lastRestart: data.uptime ? new Date(Date.now() - (data.uptime * 1000)) : 'Unknown',
                        version: data.version || 'Unknown',
                        environment: data.environment || 'Unknown',
                        dockerImage: data.dockerImage || 'Unknown',
                        dockerTag: data.dockerTag || 'Unknown',
                        buildCommit: data.buildCommit || 'Unknown',
                        githubBranch: data.githubBranch || 'Unknown',
                        responseTime: this.measureResponseTime(response)
                    };
                    
                    this.logComponentStatus(status);
                    this.lastStatus.backend = status;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                this.logComponentError('Backend', error);
            }
        }
        
        async checkDatabase() {
            try {
                const response = await fetch(DEPLOYMENT_CONFIG.ENDPOINTS.database, {
                    headers: { 
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const status = {
                        component: 'Database',
                        connectionTime: data.database?.connectionTime || 'Unknown',
                        status: data.database?.status || 'Unknown',
                        schemaVersion: this.extractSchemaVersion(),
                        lastMigration: this.getLastMigrationTime(),
                        responseTime: this.measureResponseTime(response)
                    };
                    
                    this.logComponentStatus(status);
                    this.lastStatus.database = status;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                this.logComponentError('Database', error);
            }
        }
        
        async checkBatchEndpoint() {
            try {
                const response = await fetch(DEPLOYMENT_CONFIG.ENDPOINTS.batch, {
                    headers: { 
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                });
                
                const status = {
                    component: 'Batch API',
                    available: response.ok,
                    status: response.ok ? 'Deployed' : `HTTP ${response.status}`,
                    responseTime: this.measureResponseTime(response)
                };
                
                if (response.ok) {
                    const data = await response.json();
                    status.lastUpdate = data.timestamp || 'Unknown';
                }
                
                this.logComponentStatus(status);
                this.lastStatus.batch = status;
            } catch (error) {
                this.logComponentError('Batch API', error);
            }
        }
        
        async checkReputationSystem() {
            try {
                const response = await fetch(DEPLOYMENT_CONFIG.ENDPOINTS.reputation, {
                    headers: { 
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                });
                
                const status = {
                    component: 'Reputation System',
                    available: response.ok,
                    status: response.ok ? 'Deployed' : `HTTP ${response.status}`,
                    responseTime: this.measureResponseTime(response)
                };
                
                if (response.ok) {
                    const data = await response.json();
                    status.lastUpdate = data.timestamp || 'Unknown';
                    status.features = data.features || 'Unknown';
                }
                
                this.logComponentStatus(status);
                this.lastStatus.reputation = status;
            } catch (error) {
                this.logComponentError('Reputation System', error);
            }
        }
        
        logComponentStatus(status) {
            const emoji = this.getStatusEmoji(status);
            
            // Only show deployment details to admin users for security
            if (typeof adminDebugLog !== 'undefined') {
                // Use non-async call since this is called synchronously
                adminDebugLog('DeploymentStatus', `${emoji} ${status.component}:`, {
                    component: status.component,
                    details: Object.fromEntries(
                        Object.entries(status).filter(([key]) => key !== 'component')
                    )
                }).catch(err => {
                    // Silent failure for non-admin users
                });
            }
        }
        
        async logComponentError(componentName, error) {
            if (typeof adminDebugError !== 'undefined') {
                await adminDebugError('DeploymentStatus', `${componentName} error`, {
                    component: componentName,
                    error: error.message,
                    stack: error.stack
                });
            }
        }
        
        getStatusEmoji(status) {
            if (status.available === false) return '❌';
            if (status.status && status.status.includes('ERROR')) return '❌';
            if (status.responseTime && parseInt(status.responseTime) > 5000) return '⚠️';
            return '✅';
        }
        
        formatValue(value) {
            if (value instanceof Date) {
                return value.toLocaleString();
            }
            if (typeof value === 'string' && value.includes('ms')) {
                const ms = parseInt(value);
                return ms > 1000 ? `${value} (⚠️ slow)` : value;
            }
            return value;
        }
        
        measureResponseTime(response) {
            // If response has timing info, use it
            if (response.headers.get('X-Response-Time')) {
                return response.headers.get('X-Response-Time');
            }
            // Otherwise return estimated
            return 'Unknown';
        }
        
        extractBuildTime() {
            // Try to get build time from various sources
            if (DEPLOYMENT_CONFIG.FRONTEND_BUILD_TIME !== '2025-08-14T01:04:43.173Z') {
                return new Date(DEPLOYMENT_CONFIG.FRONTEND_BUILD_TIME);
            }
            
            // Check meta tags
            const buildMeta = document.querySelector('meta[name="build-time"]');
            if (buildMeta) {
                return new Date(buildMeta.content);
            }
            
            // Fallback to document last modified (not reliable but better than nothing)
            return document.lastModified ? new Date(document.lastModified) : 'Unknown';
        }
        
        extractVersion() {
            // Check meta tags
            const versionMeta = document.querySelector('meta[name="version"]');
            if (versionMeta) {
                return versionMeta.content;
            }
            
            // Check if there's a version in localStorage
            const storedVersion = localStorage.getItem('appVersion');
            if (storedVersion) {
                return storedVersion;
            }
            
            return 'Unknown';
        }
        
        extractSchemaVersion() {
            if (DEPLOYMENT_CONFIG.SCHEMA_VERSION !== 'v1.0.0-1755133483176') {
                return DEPLOYMENT_CONFIG.SCHEMA_VERSION;
            }
            return 'Unknown';
        }
        
        getLastMigrationTime() {
            // This would need to be populated from backend data
            return 'Check backend logs';
        }
        
        getCacheStatus() {
            // Check if service worker is controlling the page
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                return 'Service Worker Active';
            }
            
            // Check cache headers on main document
            const cacheControl = document.querySelector('meta[http-equiv="Cache-Control"]');
            if (cacheControl) {
                return cacheControl.content;
            }
            
            return 'Unknown';
        }
        
        // Public method to manually trigger check
        forceCheck() {
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('DeploymentStatus', '🔄 Manual deployment status check triggered');
            }
            this.checkAllComponents();
        }
        
        // Public method to get last known status
        getLastStatus() {
            return this.lastStatus;
        }
    }
    
    // Initialize deployment checker
    const deploymentChecker = new DeploymentStatusChecker();
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            deploymentChecker.initialize();
        });
    } else {
        deploymentChecker.initialize();
    }
    
    // Expose to window for manual checks
    window.deploymentStatus = {
        check: () => deploymentChecker.forceCheck(),
        getStatus: () => deploymentChecker.getLastStatus(),
        
        // Helper methods for debugging
        checkBackend: () => deploymentChecker.checkBackend(),
        checkDatabase: () => deploymentChecker.checkDatabase(),
        checkReputation: () => deploymentChecker.checkReputationSystem()
    };
    
    // Add console helper
    if (typeof adminDebugLog !== 'undefined') {
        adminDebugLog('DeploymentStatus', '💡 Deployment Status Commands Available', {
            commands: [
                'deploymentStatus.check() - Manual status check',
                'deploymentStatus.getStatus() - Get last status'
            ]
        });
    }
    
})();