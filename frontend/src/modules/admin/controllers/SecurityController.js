/**
 * SecurityController - Handles admin dashboard security section
 * Extracted from admin-dashboard.html security monitoring functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 2.3 - Security Monitoring and Access Control Implementation
 */

class SecurityController {
    constructor() {
        this.sectionId = 'security';
        this.isInitialized = false;
        this.currentFailedLogins = [];
        this.currentSuspiciousActivity = [];
        this.securityMetrics = {};
        this.refreshInterval = null;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displaySecurityData = this.displaySecurityData.bind(this);
        this.displayFailedLogins = this.displayFailedLogins.bind(this);
        this.displaySuspiciousActivity = this.displaySuspiciousActivity.bind(this);
        this.handleIPBlock = this.handleIPBlock.bind(this);
        this.handleLoginMonitoring = this.handleLoginMonitoring.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
    }

    /**
     * Initialize the security controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for security
            if (window.AdminState) {
                window.AdminState.displaySecurityData = this.displaySecurityData.bind(this);
                window.AdminState.displayFailedLogins = this.displayFailedLogins.bind(this);
                window.AdminState.displaySuspiciousActivity = this.displaySuspiciousActivity.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Set up automatic refresh
            this.setupAutoRefresh();

            this.isInitialized = true;

            await adminDebugLog('SecurityController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing SecurityController:', error);
            await adminDebugError('SecurityController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for security section
     */
    async setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshSecurityBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefresh);
        }

        // IP blocking controls
        const blockIPBtn = document.getElementById('blockIPBtn');
        if (blockIPBtn) {
            blockIPBtn.addEventListener('click', () => {
                const ipInput = document.getElementById('ipAddressInput');
                if (ipInput && ipInput.value.trim()) {
                    this.handleIPBlock(ipInput.value.trim());
                }
            });
        }

        // Login monitoring controls
        const monitoringToggle = document.getElementById('loginMonitoringToggle');
        if (monitoringToggle) {
            monitoringToggle.addEventListener('change', this.handleLoginMonitoring);
        }

        // Search functionality for failed logins
        const searchInput = document.getElementById('securitySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.filterSecurityData(e.target.value);
                }, 300);
            });
        }

        // Clear blocked IPs button
        const clearBlockedBtn = document.getElementById('clearBlockedIPsBtn');
        if (clearBlockedBtn) {
            clearBlockedBtn.addEventListener('click', () => {
                this.clearBlockedIPs();
            });
        }

        await adminDebugLog('SecurityController', 'Event listeners set up successfully');
    }

    /**
     * Set up automatic refresh for security data
     */
    setupAutoRefresh() {
        // Refresh security data every 30 seconds
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadData(false); // Force fresh data
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, 30000);
    }

    /**
     * Load security data
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                await window.AdminState.loadSecurityData({}, useCache);
            } else {
                // Fallback to direct API calls
                await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading security data:', error);
            this.showError('Failed to load security data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            const [failedLogins, suspiciousActivity, securityMetrics, blockedIPs] = await Promise.all([
                window.AdminAPI.getFailedLogins(),
                window.AdminAPI.getSuspiciousActivity(),
                window.AdminAPI.getSecurityMetrics(),
                window.AdminAPI.getBlockedIPs()
            ]);

            this.displaySecurityData({
                failedLogins: failedLogins.data || [],
                suspiciousActivity: suspiciousActivity.data || [],
                metrics: securityMetrics.data || {},
                blockedIPs: blockedIPs.data || []
            });

        } catch (error) {
            console.error('Fallback security data loading failed:', error);
            throw error;
        }
    }

    /**
     * Handle manual refresh
     */
    async handleRefresh() {
        try {
            const refreshBtn = document.getElementById('refreshSecurityBtn');
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Refreshing...';
            }

            await this.loadData(false); // Force fresh data

            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh';
            }

            await adminDebugLog('SecurityController', 'Manual refresh completed');
        } catch (error) {
            console.error('Manual refresh failed:', error);
            await adminDebugError('SecurityController', 'Manual refresh failed', error);
        }
    }

    /**
     * Display security data in the UI
     */
    async displaySecurityData(data) {
        try {
            if (!data) {
                console.warn('No security data available');
                return;
            }

            // Store current data
            this.currentFailedLogins = data.failedLogins || [];
            this.currentSuspiciousActivity = data.suspiciousActivity || [];
            this.securityMetrics = data.metrics || {};

            // Display security metrics
            this.displaySecurityMetrics(data.metrics);

            // Display failed logins table
            this.displayFailedLogins(data.failedLogins);

            // Display suspicious activity
            this.displaySuspiciousActivity(data.suspiciousActivity);

            // Display blocked IPs
            this.displayBlockedIPs(data.blockedIPs);

            // Update last refresh time
            this.updateLastRefreshTime();

            await adminDebugLog('SecurityController', 'Security data displayed', {
                failedLoginCount: data.failedLogins?.length || 0,
                suspiciousActivityCount: data.suspiciousActivity?.length || 0,
                blockedIPCount: data.blockedIPs?.length || 0
            });

        } catch (error) {
            console.error('Error displaying security data:', error);
            await adminDebugError('SecurityController', 'Failed to display security data', error);
        }
    }

    /**
     * Display security metrics dashboard
     */
    displaySecurityMetrics(metrics) {
        try {
            const metricsContainer = document.getElementById('securityMetrics');
            if (!metricsContainer) {
                console.warn('Security metrics container not found');
                return;
            }

            const threatLevel = this.calculateThreatLevel(metrics);
            const threatClass = this.getThreatLevelClass(threatLevel);

            const metricsHtml = `
                <div class="security-metrics-grid">
                    <div class="security-metric-card threat-level ${threatClass}">
                        <div class="metric-header">
                            <h3>🛡️ Threat Level</h3>
                            <span class="threat-indicator ${threatClass}">${threatLevel}</span>
                        </div>
                        <div class="metric-value">${this.getThreatEmoji(threatLevel)}</div>
                    </div>

                    <div class="security-metric-card">
                        <div class="metric-header">
                            <h3>🚫 Failed Logins (24h)</h3>
                        </div>
                        <div class="metric-value">${metrics.failedLoginsLast24h || 0}</div>
                        <div class="metric-trend ${(metrics.failedLoginsTrend || 0) > 0 ? 'up' : 'down'}">
                            ${(metrics.failedLoginsTrend || 0) > 0 ? '↗️' : '↘️'} ${Math.abs(metrics.failedLoginsTrend || 0)}%
                        </div>
                    </div>

                    <div class="security-metric-card">
                        <div class="metric-header">
                            <h3>🌍 Unique IPs</h3>
                        </div>
                        <div class="metric-value">${metrics.uniqueIPs || 0}</div>
                        <div class="metric-subtext">Attempting access</div>
                    </div>

                    <div class="security-metric-card">
                        <div class="metric-header">
                            <h3>⚡ Brute Force Attempts</h3>
                        </div>
                        <div class="metric-value">${metrics.bruteForceAttempts || 0}</div>
                        <div class="metric-subtext">Last 1 hour</div>
                    </div>

                    <div class="security-metric-card">
                        <div class="metric-header">
                            <h3>🔒 Blocked IPs</h3>
                        </div>
                        <div class="metric-value">${metrics.blockedIPs || 0}</div>
                        <div class="metric-subtext">Currently active</div>
                    </div>

                    <div class="security-metric-card">
                        <div class="metric-header">
                            <h3>📍 Geographic Alerts</h3>
                        </div>
                        <div class="metric-value">${metrics.geographicAlerts || 0}</div>
                        <div class="metric-subtext">Suspicious locations</div>
                    </div>
                </div>
            `;

            metricsContainer.innerHTML = metricsHtml;

        } catch (error) {
            console.error('Error displaying security metrics:', error);
            await adminDebugError('SecurityController', 'Failed to display security metrics', error);
        }
    }

    /**
     * Display failed logins table
     */
    displayFailedLogins(failedLogins) {
        try {
            const container = document.getElementById('failedLoginsTable');
            if (!container) {
                console.warn('Failed logins table container not found');
                return;
            }

            if (!failedLogins || failedLogins.length === 0) {
                container.innerHTML = '<div class="no-data">✅ No failed login attempts found</div>';
                return;
            }

            const tableHtml = `
                <div class="security-table">
                    <table>
                        <thead>
                            <tr>
                                <th>⏰ Timestamp</th>
                                <th>🌐 IP Address</th>
                                <th>👤 Attempted User</th>
                                <th>❌ Failure Reason</th>
                                <th>📍 Location</th>
                                <th>🚨 Risk Level</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${failedLogins.map(login => this.renderFailedLoginRow(login)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

        } catch (error) {
            console.error('Error displaying failed logins table:', error);
            await adminDebugError('SecurityController', 'Failed to display failed logins table', error);
        }
    }

    /**
     * Display suspicious activity alerts
     */
    displaySuspiciousActivity(suspiciousActivity) {
        try {
            const container = document.getElementById('suspiciousActivityPanel');
            if (!container) {
                console.warn('Suspicious activity panel container not found');
                return;
            }

            if (!suspiciousActivity || suspiciousActivity.length === 0) {
                container.innerHTML = '<div class="no-data">✅ No suspicious activity detected</div>';
                return;
            }

            const alertsHtml = suspiciousActivity.map(activity => `
                <div class="suspicious-activity-alert ${this.getSeverityClass(activity.severity)}">
                    <div class="alert-header">
                        <span class="alert-icon">${this.getSeverityIcon(activity.severity)}</span>
                        <span class="alert-title">${activity.title}</span>
                        <span class="alert-time">${this.formatTimestamp(activity.timestamp)}</span>
                    </div>
                    <div class="alert-description">${activity.description}</div>
                    <div class="alert-details">
                        <span class="detail-item">🌐 IP: ${activity.ipAddress}</span>
                        <span class="detail-item">👤 User: ${activity.targetUser || 'N/A'}</span>
                        <span class="detail-item">📍 Location: ${activity.location || 'Unknown'}</span>
                    </div>
                    <div class="alert-actions">
                        <button onclick="window.securityController.handleIPBlock('${activity.ipAddress}')"
                                class="action-btn block-btn">🚫 Block IP</button>
                        <button onclick="window.securityController.dismissAlert('${activity.id}')"
                                class="action-btn dismiss-btn">✅ Dismiss</button>
                        <button onclick="window.securityController.investigateActivity('${activity.id}')"
                                class="action-btn investigate-btn">🔍 Investigate</button>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `<div class="suspicious-activity-list">${alertsHtml}</div>`;

        } catch (error) {
            console.error('Error displaying suspicious activity:', error);
            await adminDebugError('SecurityController', 'Failed to display suspicious activity', error);
        }
    }

    /**
     * Display blocked IPs list
     */
    displayBlockedIPs(blockedIPs) {
        try {
            const container = document.getElementById('blockedIPsList');
            if (!container) {
                console.warn('Blocked IPs list container not found');
                return;
            }

            if (!blockedIPs || blockedIPs.length === 0) {
                container.innerHTML = '<div class="no-data">No IPs currently blocked</div>';
                return;
            }

            const ipsHtml = blockedIPs.map(ip => `
                <div class="blocked-ip-item">
                    <div class="ip-info">
                        <span class="ip-address">🚫 ${ip.address}</span>
                        <span class="ip-reason">${ip.reason}</span>
                        <span class="ip-timestamp">Blocked: ${this.formatTimestamp(ip.blockedAt)}</span>
                    </div>
                    <div class="ip-actions">
                        <button onclick="window.securityController.unblockIP('${ip.address}')"
                                class="action-btn unblock-btn">✅ Unblock</button>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `<div class="blocked-ips-list">${ipsHtml}</div>`;

        } catch (error) {
            console.error('Error displaying blocked IPs:', error);
            await adminDebugError('SecurityController', 'Failed to display blocked IPs', error);
        }
    }

    /**
     * Render individual failed login row
     */
    renderFailedLoginRow(login) {
        const riskClass = this.getRiskLevelClass(login.riskLevel);
        const riskIcon = this.getRiskLevelIcon(login.riskLevel);

        return `
            <tr data-login-id="${login.id}" class="login-row ${riskClass}">
                <td>${this.formatTimestamp(login.timestamp)}</td>
                <td>
                    <span class="ip-address">${login.ipAddress}</span>
                    ${login.isVPN ? '<span class="vpn-badge">VPN</span>' : ''}
                </td>
                <td>${login.attemptedUsername || 'N/A'}</td>
                <td>
                    <span class="failure-reason">${login.failureReason}</span>
                </td>
                <td>
                    <span class="location">${login.location || 'Unknown'}</span>
                    ${login.countryCode ? `<span class="country-flag">${this.getCountryFlag(login.countryCode)}</span>` : ''}
                </td>
                <td>
                    <span class="risk-badge ${riskClass}">
                        ${riskIcon} ${login.riskLevel || 'Low'}
                    </span>
                </td>
                <td class="actions">
                    <button onclick="window.securityController.handleIPBlock('${login.ipAddress}')"
                            class="action-btn block-btn" title="Block IP">
                        🚫 Block
                    </button>
                    <button onclick="window.securityController.viewLoginDetails('${login.id}')"
                            class="action-btn details-btn" title="View Details">
                        🔍 Details
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Handle IP blocking with TOTP verification
     */
    async handleIPBlock(ipAddress, reason = null) {
        try {
            if (!ipAddress || !this.isValidIP(ipAddress)) {
                alert('❌ Invalid IP address format');
                return;
            }

            const blockReason = reason || prompt('Enter reason for blocking this IP (required):');
            if (!blockReason || blockReason.trim().length < 5) {
                alert('❌ Block reason is required and must be at least 5 characters');
                return;
            }

            // Confirm the action
            if (!confirm(`🚫 BLOCK IP ADDRESS\n\nIP: ${ipAddress}\nReason: ${blockReason}\n\nThis will immediately prevent all access from this IP address.\n\nThis action requires TOTP verification. Continue?`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                `Block IP address ${ipAddress}`,
                { additionalInfo: `Reason: ${blockReason}` }
            );

            // Perform the IP block
            const response = await window.AdminAPI.blockIP(ipAddress, {
                totpToken,
                reason: blockReason.trim(),
                adminUserId: window.adminAuth.getCurrentUser()?.id
            });

            if (response.success) {
                alert(`✅ IP ${ipAddress} blocked successfully\n\nBlock ID: ${response.blockId}`);

                // Clear IP input if it exists
                const ipInput = document.getElementById('ipAddressInput');
                if (ipInput) {
                    ipInput.value = '';
                }

                // Refresh security data
                await this.loadData(false);

                await adminDebugLog('SecurityController', 'IP blocked successfully', {
                    ipAddress,
                    reason: blockReason,
                    blockId: response.blockId
                });
            } else {
                throw new Error(response.error || 'Failed to block IP');
            }

        } catch (error) {
            console.error('Error blocking IP:', error);
            alert(`❌ Failed to block IP: ${error.message}`);
            await adminDebugError('SecurityController', 'IP blocking failed', error);
        }
    }

    /**
     * Handle unblocking an IP address
     */
    async unblockIP(ipAddress) {
        try {
            if (!confirm(`✅ UNBLOCK IP ADDRESS\n\nIP: ${ipAddress}\n\nThis will restore access from this IP address.\n\nContinue?`)) {
                return;
            }

            const response = await window.AdminAPI.unblockIP(ipAddress);

            if (response.success) {
                alert(`✅ IP ${ipAddress} unblocked successfully`);
                await this.loadData(false);

                await adminDebugLog('SecurityController', 'IP unblocked successfully', { ipAddress });
            } else {
                throw new Error(response.error || 'Failed to unblock IP');
            }

        } catch (error) {
            console.error('Error unblocking IP:', error);
            alert(`❌ Failed to unblock IP: ${error.message}`);
            await adminDebugError('SecurityController', 'IP unblocking failed', error);
        }
    }

    /**
     * Clear all blocked IPs
     */
    async clearBlockedIPs() {
        try {
            if (!confirm('🚨 CLEAR ALL BLOCKED IPs\n\nThis will unblock ALL currently blocked IP addresses.\n\nThis action requires TOTP verification and cannot be undone.\n\nContinue?')) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                'Clear all blocked IP addresses',
                { additionalInfo: 'This will unblock all currently blocked IPs' }
            );

            const response = await window.AdminAPI.clearBlockedIPs({
                totpToken,
                adminUserId: window.adminAuth.getCurrentUser()?.id
            });

            if (response.success) {
                alert(`✅ All blocked IPs cleared successfully\n\nCleared ${response.clearedCount} IP addresses`);
                await this.loadData(false);

                await adminDebugLog('SecurityController', 'All blocked IPs cleared', {
                    clearedCount: response.clearedCount
                });
            } else {
                throw new Error(response.error || 'Failed to clear blocked IPs');
            }

        } catch (error) {
            console.error('Error clearing blocked IPs:', error);
            alert(`❌ Failed to clear blocked IPs: ${error.message}`);
            await adminDebugError('SecurityController', 'Clearing blocked IPs failed', error);
        }
    }

    /**
     * Handle login monitoring toggle
     */
    async handleLoginMonitoring(event) {
        try {
            const enabled = event.target.checked;

            const response = await window.AdminAPI.setLoginMonitoring(enabled);

            if (response.success) {
                await adminDebugLog('SecurityController', 'Login monitoring toggled', { enabled });
            } else {
                // Revert the toggle
                event.target.checked = !enabled;
                throw new Error(response.error || 'Failed to update login monitoring');
            }

        } catch (error) {
            console.error('Error updating login monitoring:', error);
            alert(`❌ Failed to update login monitoring: ${error.message}`);
            await adminDebugError('SecurityController', 'Login monitoring update failed', error);
        }
    }

    /**
     * Filter security data based on search query
     */
    filterSecurityData(query) {
        const filteredLogins = this.currentFailedLogins.filter(login =>
            login.ipAddress?.toLowerCase().includes(query.toLowerCase()) ||
            login.attemptedUsername?.toLowerCase().includes(query.toLowerCase()) ||
            login.location?.toLowerCase().includes(query.toLowerCase())
        );

        this.displayFailedLogins(filteredLogins);
    }

    /**
     * Dismiss a security alert
     */
    async dismissAlert(alertId) {
        try {
            const response = await window.AdminAPI.dismissSecurityAlert(alertId);

            if (response.success) {
                await this.loadData(false);
                await adminDebugLog('SecurityController', 'Security alert dismissed', { alertId });
            } else {
                throw new Error(response.error || 'Failed to dismiss alert');
            }

        } catch (error) {
            console.error('Error dismissing alert:', error);
            alert(`❌ Failed to dismiss alert: ${error.message}`);
        }
    }

    /**
     * Investigate suspicious activity
     */
    async investigateActivity(activityId) {
        try {
            const response = await window.AdminAPI.getActivityDetails(activityId);

            if (response.success) {
                const details = response.data;
                const detailsText = `
🔍 ACTIVITY INVESTIGATION

ID: ${details.id}
Type: ${details.type}
Severity: ${details.severity}
Timestamp: ${this.formatTimestamp(details.timestamp)}

📍 Location Details:
IP: ${details.ipAddress}
Location: ${details.location}
ISP: ${details.isp || 'Unknown'}
VPN: ${details.isVPN ? 'Yes' : 'No'}

👤 Target Information:
User: ${details.targetUser || 'N/A'}
Account: ${details.targetAccountId || 'N/A'}

🔬 Technical Details:
User Agent: ${details.userAgent || 'Unknown'}
Request Count: ${details.requestCount || 0}
Success Rate: ${details.successRate || 0}%

📊 Risk Assessment:
Score: ${details.riskScore || 0}/100
Factors: ${details.riskFactors ? details.riskFactors.join(', ') : 'None'}
                `;

                alert(detailsText);

                await adminDebugLog('SecurityController', 'Activity investigation completed', { activityId });
            } else {
                throw new Error(response.error || 'Failed to get activity details');
            }

        } catch (error) {
            console.error('Error investigating activity:', error);
            alert(`❌ Failed to investigate activity: ${error.message}`);
        }
    }

    /**
     * View detailed login information
     */
    async viewLoginDetails(loginId) {
        try {
            const login = this.currentFailedLogins.find(l => l.id === loginId);
            if (!login) {
                alert('❌ Login details not found');
                return;
            }

            const detailsText = `
🔍 FAILED LOGIN DETAILS

Timestamp: ${this.formatTimestamp(login.timestamp)}
IP Address: ${login.ipAddress}
Attempted User: ${login.attemptedUsername || 'N/A'}
Failure Reason: ${login.failureReason}

📍 Location Information:
Country: ${login.country || 'Unknown'}
Region: ${login.region || 'Unknown'}
City: ${login.city || 'Unknown'}
ISP: ${login.isp || 'Unknown'}
VPN: ${login.isVPN ? 'Yes' : 'No'}

🔒 Security Assessment:
Risk Level: ${login.riskLevel || 'Low'}
Previous Attempts: ${login.previousAttempts || 0}
Success Rate: ${login.successRate || 0}%

🔬 Technical Details:
User Agent: ${login.userAgent || 'Unknown'}
Session ID: ${login.sessionId || 'N/A'}
Request Headers: ${login.suspiciousHeaders ? 'Suspicious detected' : 'Normal'}
            `;

            alert(detailsText);

        } catch (error) {
            console.error('Error viewing login details:', error);
            alert(`❌ Failed to view login details: ${error.message}`);
        }
    }

    // Utility methods for UI formatting

    calculateThreatLevel(metrics) {
        const score = (metrics.failedLoginsLast24h || 0) * 2 +
                     (metrics.bruteForceAttempts || 0) * 5 +
                     (metrics.geographicAlerts || 0) * 3;

        if (score >= 50) return 'HIGH';
        if (score >= 20) return 'MEDIUM';
        return 'LOW';
    }

    getThreatLevelClass(level) {
        return `threat-${level.toLowerCase()}`;
    }

    getThreatEmoji(level) {
        switch (level) {
            case 'HIGH': return '🔴';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    }

    getSeverityClass(severity) {
        return `severity-${(severity || 'low').toLowerCase()}`;
    }

    getSeverityIcon(severity) {
        switch ((severity || 'low').toLowerCase()) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '🟡';
            case 'low': return 'ℹ️';
            default: return '📋';
        }
    }

    getRiskLevelClass(riskLevel) {
        return `risk-${(riskLevel || 'low').toLowerCase()}`;
    }

    getRiskLevelIcon(riskLevel) {
        switch ((riskLevel || 'low').toLowerCase()) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }

    getCountryFlag(countryCode) {
        try {
            return String.fromCodePoint(...countryCode.toUpperCase().split('').map(c => 0x1F1A5 + c.charCodeAt(0)));
        } catch {
            return '🌍';
        }
    }

    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch {
            return 'Invalid date';
        }
    }

    isValidIP(ip) {
        const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    /**
     * Update last refresh time display
     */
    updateLastRefreshTime() {
        const refreshTimeElement = document.getElementById('securityLastRefreshTime');
        if (refreshTimeElement) {
            const now = new Date();
            refreshTimeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('SecurityController Error:', message);

        const errorContainer = document.getElementById('securityError');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        // Clear auto-refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Clear search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Remove event listeners
        const refreshBtn = document.getElementById('refreshSecurityBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.handleRefresh);
        }

        // Clear data
        this.currentFailedLogins = [];
        this.currentSuspiciousActivity = [];
        this.securityMetrics = {};
        this.isInitialized = false;

        console.log('SecurityController destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityController;
} else {
    window.SecurityController = SecurityController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.securityController = new SecurityController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.securityController = new SecurityController();
            }
        }, 100);
    });
}