/**
 * @module js/deployment-status
 * @description Deployment status checker for admin dashboard
 *
 * Monitors and displays deployment status, release information, and system health.
 * Shows deployment timestamps for all components in the browser console.
 * Helps track whether changes have actually deployed across the system.
 * Admin-only feature.
 *
 * Migrated to ES6 modules: October 11, 2025 (Batch 4)
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
            backend: 'https://api.unitedwerise.org/health',
            database: 'https://api.unitedwerise.org/health/database',
            batch: 'https://api.unitedwerise.org/api/batch/health-check',
            reputation: 'https://api.unitedwerise.org/api/reputation/health'
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
                        nodeEnv: data.nodeEnv || 'Unknown',
                        databaseHost: data.databaseHost || 'Unknown',
                        releaseSha: data.releaseSha || 'Unknown',
                        githubBranch: data.githubBranch || 'Unknown',
                        responseTime: this.measureResponseTime(response)
                    };

                    // Run environment validation
                    this.performEnvironmentHealthCheck(data);

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

        /**
         * Performs comprehensive environment health check
         * Validates consistency between frontend, backend, and database environments
         *
         * @param {Object} healthData - Backend health endpoint response
         */
        performEnvironmentHealthCheck(healthData) {
            if (typeof adminDebugLog === 'undefined') return;

            try {
                // Get frontend environment details
                const frontendEnv = window.getEnvironment ? window.getEnvironment() : 'unknown';
                const frontendHostname = window.location.hostname;
                const frontendApiUrl = window.getApiBaseUrl ? window.getApiBaseUrl() : 'unknown';

                // Extract backend environment details
                const backendEnv = healthData.environment || 'unknown';
                const nodeEnv = healthData.nodeEnv || 'unknown';
                const dbHost = healthData.databaseHost || 'unknown';
                const githubBranch = healthData.githubBranch || 'unknown';
                const releaseSha = healthData.releaseSha || 'unknown';
                const databaseStatus = healthData.database || 'unknown';

                // Start grouped output
                console.group('🏥 ENVIRONMENT HEALTH CHECK');

                adminDebugLog('DeploymentStatus', '=== Frontend Environment ===');
                adminDebugLog('DeploymentStatus', `Environment: ${frontendEnv}`);
                adminDebugLog('DeploymentStatus', `Hostname: ${frontendHostname}`);
                adminDebugLog('DeploymentStatus', `API Target: ${frontendApiUrl}`);

                adminDebugLog('DeploymentStatus', '\n=== Backend Environment ===');
                adminDebugLog('DeploymentStatus', `Environment: ${backendEnv}`);
                adminDebugLog('DeploymentStatus', `NODE_ENV: ${nodeEnv}`);
                adminDebugLog('DeploymentStatus', `GitHub Branch: ${githubBranch}`);
                adminDebugLog('DeploymentStatus', `Release SHA: ${releaseSha}`);
                adminDebugLog('DeploymentStatus', `Uptime: ${healthData.uptime ? Math.floor(healthData.uptime / 60) + ' minutes' : 'unknown'}`);

                adminDebugLog('DeploymentStatus', '\n=== Database Environment ===');
                adminDebugLog('DeploymentStatus', `Host: ${dbHost}`);
                adminDebugLog('DeploymentStatus', `Status: ${databaseStatus}`);

                // Run validation using exported function
                if (typeof window.validateEnvironmentConsistency === 'function') {
                    const issues = window.validateEnvironmentConsistency(healthData);

                    if (issues.length > 0) {
                        adminDebugError('DeploymentStatus', '\n🚨 ISSUES DETECTED:');
                        issues.forEach(issue => {
                            const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'error' ? '🟠' : '🟡';
                            adminDebugError('DeploymentStatus', `${icon} ${issue.message}`);
                        });
                    } else {
                        adminDebugLog('DeploymentStatus', '\n✅ ENVIRONMENT CONSISTENCY: PASS');
                    }
                }

                console.groupEnd();
            } catch (error) {
                adminDebugError('DeploymentStatus', 'Error during health check:', error);
                console.groupEnd();
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

    // ============================================
    // ES6 MODULE EXPORTS (within IIFE)
    // ============================================

    // Export the class to window for backward compatibility
    if (typeof window !== 'undefined') {
        window.DeploymentStatusChecker = DeploymentStatusChecker;
    }

})();

// ============================================
// VALIDATION FUNCTION
// ============================================

/**
 * Validate environment consistency between frontend and backend
 * Detects mismatches that indicate deployment issues
 *
 * @param {Object} healthData - Backend health data from /health endpoint
 * @returns {Array} Array of issue objects with severity and message
 */
function validateEnvironmentConsistency(healthData) {
    const issues = [];

    // Get frontend environment
    const frontendEnv = window.getEnvironment ? window.getEnvironment() : 'unknown';
    const frontendHostname = window.location.hostname;

    // Extract backend environment info
    const backendEnv = healthData.environment?.toLowerCase() || 'unknown';
    const backendNodeEnv = healthData.nodeEnv?.toLowerCase() || 'unknown';
    const backendBranch = healthData.githubBranch?.toLowerCase() || 'unknown';

    // Critical: Environment-branch mismatch (violates protected rule)
    if (frontendEnv === 'development') {
        if (backendBranch !== 'development' && backendBranch !== 'unknown') {
            issues.push({
                severity: 'critical',
                message: `CRITICAL: Staging environment running ${backendBranch} branch (must be development)`
            });
        }
        if (backendNodeEnv !== 'staging' && backendNodeEnv !== 'unknown') {
            issues.push({
                severity: 'critical',
                message: `CRITICAL: Staging backend NODE_ENV is ${backendNodeEnv} (should be staging)`
            });
        }
    }

    if (frontendEnv === 'production') {
        if (backendBranch !== 'main' && backendBranch !== 'unknown') {
            issues.push({
                severity: 'critical',
                message: `CRITICAL: Production environment running ${backendBranch} branch (must be main)`
            });
        }
        if (backendNodeEnv !== 'production' && backendNodeEnv !== 'unknown') {
            issues.push({
                severity: 'critical',
                message: `CRITICAL: Production backend NODE_ENV is ${backendNodeEnv} (should be production)`
            });
        }
    }

    // Error: Frontend-backend environment mismatch
    if (frontendEnv === 'development' && backendEnv === 'production') {
        issues.push({
            severity: 'error',
            message: `Frontend on staging but backend reports production environment`
        });
    }

    if (frontendEnv === 'production' && backendEnv === 'development') {
        issues.push({
            severity: 'error',
            message: `Frontend on production but backend reports development environment`
        });
    }

    // Warning: Database host mismatch
    const databaseHost = healthData.databaseHost || '';
    if (frontendEnv === 'development' && !databaseHost.includes('unitedwerise-db-dev')) {
        issues.push({
            severity: 'error',
            message: `Staging should use unitedwerise-db-dev, currently: ${databaseHost}`
        });
    }

    if (frontendEnv === 'production' && !databaseHost.includes('unitedwerise-db.postgres')) {
        issues.push({
            severity: 'error',
            message: `Production should use unitedwerise-db, currently: ${databaseHost}`
        });
    }

    // Warning: Database connection issues
    if (healthData.database !== 'connected') {
        issues.push({
            severity: 'error',
            message: `Database status: ${healthData.database || 'disconnected'}`
        });
    }

    return issues;
}

// Expose validation function to window for use by IIFE code
if (typeof window !== 'undefined') {
    window.validateEnvironmentConsistency = validateEnvironmentConsistency;
}

// ============================================
// ES6 MODULE EXPORTS
// ============================================

// Export window-attached objects for ES6 module consumers
export { validateEnvironmentConsistency };
export const DeploymentStatusChecker = typeof window !== 'undefined' ? window.DeploymentStatusChecker : null;
export const deploymentStatus = typeof window !== 'undefined' ? window.deploymentStatus : null;