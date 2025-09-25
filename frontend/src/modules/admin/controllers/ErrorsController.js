/**
 * ErrorsController - Handles admin dashboard error monitoring and tracking section
 * Extracted from admin-dashboard.html error management functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 4.2 - Error monitoring and tracking controller
 */

class ErrorsController {
    constructor() {
        this.sectionId = 'errors';
        this.isInitialized = false;
        this.currentErrorData = {};
        this.refreshInterval = null;
        this.errorMetrics = new Map();
        this.errorFilters = {
            severity: 'all',
            type: 'all',
            timeframe: '24h',
            status: 'all'
        };

        // Error monitoring configuration
        this.errorCategories = new Map();
        this.alertThresholds = new Map();
        this.realTimeUpdates = false;
        this.errorTrends = new Map();

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayErrorsData = this.displayErrorsData.bind(this);
        this.handleErrorResolution = this.handleErrorResolution.bind(this);
        this.handleErrorFiltering = this.handleErrorFiltering.bind(this);
        this.displayErrorDetails = this.displayErrorDetails.bind(this);
        this.displayErrorTrends = this.displayErrorTrends.bind(this);
        this.handleErrorAlerts = this.handleErrorAlerts.bind(this);
        this.generateErrorReport = this.generateErrorReport.bind(this);
        this.handleRealTimeMonitoring = this.handleRealTimeMonitoring.bind(this);
        this.handleErrorClassification = this.handleErrorClassification.bind(this);
        this.handleErrorImpactAnalysis = this.handleErrorImpactAnalysis.bind(this);
        this.handleErrorPerformanceCorrelation = this.handleErrorPerformanceCorrelation.bind(this);
        this.handleErrorUserCorrelation = this.handleErrorUserCorrelation.bind(this);
        this.handleErrorResolutionWorkflow = this.handleErrorResolutionWorkflow.bind(this);
    }

    /**
     * Initialize the errors controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for error monitoring
            if (window.AdminState) {
                window.AdminState.displayErrorsData = this.displayErrorsData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Set up auto-refresh every 30 seconds for error monitoring
            this.refreshInterval = setInterval(() => {
                this.loadData(false); // Skip cache for monitoring data
            }, 30000);

            // Initialize error monitoring systems
            await this.initializeErrorMonitoring();

            this.isInitialized = true;

            await adminDebugLog('ErrorsController', 'Controller initialized successfully');
        } catch (error) {
            await adminDebugError('ErrorsController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for error monitoring section
     */
    async setupEventListeners() {
        // Error filtering buttons
        const severityFilterBtn = document.getElementById('errorSeverityFilterBtn');
        if (severityFilterBtn) {
            severityFilterBtn.addEventListener('click', this.handleErrorFiltering);
        }

        const typeFilterBtn = document.getElementById('errorTypeFilterBtn');
        if (typeFilterBtn) {
            typeFilterBtn.addEventListener('click', this.handleErrorFiltering);
        }

        const timeframeFilterBtn = document.getElementById('errorTimeframeFilterBtn');
        if (timeframeFilterBtn) {
            timeframeFilterBtn.addEventListener('click', this.handleErrorFiltering);
        }

        const statusFilterBtn = document.getElementById('errorStatusFilterBtn');
        if (statusFilterBtn) {
            statusFilterBtn.addEventListener('click', this.handleErrorFiltering);
        }

        // Error management buttons
        const errorDetailsBtn = document.getElementById('errorDetailsBtn');
        if (errorDetailsBtn) {
            errorDetailsBtn.addEventListener('click', this.displayErrorDetails);
        }

        const errorTrendsBtn = document.getElementById('errorTrendsBtn');
        if (errorTrendsBtn) {
            errorTrendsBtn.addEventListener('click', this.displayErrorTrends);
        }

        const errorResolutionBtn = document.getElementById('errorResolutionBtn');
        if (errorResolutionBtn) {
            errorResolutionBtn.addEventListener('click', this.handleErrorResolution);
        }

        const errorAlertsBtn = document.getElementById('errorAlertsBtn');
        if (errorAlertsBtn) {
            errorAlertsBtn.addEventListener('click', this.handleErrorAlerts);
        }

        const errorReportBtn = document.getElementById('errorReportBtn');
        if (errorReportBtn) {
            errorReportBtn.addEventListener('click', this.generateErrorReport);
        }

        // Real-time monitoring toggle
        const realTimeToggleBtn = document.getElementById('realTimeToggleBtn');
        if (realTimeToggleBtn) {
            realTimeToggleBtn.addEventListener('click', this.handleRealTimeMonitoring);
        }

        // Advanced analysis buttons
        const errorClassificationBtn = document.getElementById('errorClassificationBtn');
        if (errorClassificationBtn) {
            errorClassificationBtn.addEventListener('click', this.handleErrorClassification);
        }

        const errorImpactBtn = document.getElementById('errorImpactBtn');
        if (errorImpactBtn) {
            errorImpactBtn.addEventListener('click', this.handleErrorImpactAnalysis);
        }

        const errorPerformanceBtn = document.getElementById('errorPerformanceBtn');
        if (errorPerformanceBtn) {
            errorPerformanceBtn.addEventListener('click', this.handleErrorPerformanceCorrelation);
        }

        const errorUserCorrelationBtn = document.getElementById('errorUserCorrelationBtn');
        if (errorUserCorrelationBtn) {
            errorUserCorrelationBtn.addEventListener('click', this.handleErrorUserCorrelation);
        }

        const errorWorkflowBtn = document.getElementById('errorWorkflowBtn');
        if (errorWorkflowBtn) {
            errorWorkflowBtn.addEventListener('click', this.handleErrorResolutionWorkflow);
        }

        // Error refresh button
        const refreshErrorsBtn = document.getElementById('refreshErrorsBtn');
        if (refreshErrorsBtn) {
            refreshErrorsBtn.addEventListener('click', () => this.loadData(false));
        }

        await adminDebugLog('ErrorsController', 'Event listeners set up successfully');
    }

    /**
     * Initialize error monitoring systems
     */
    async initializeErrorMonitoring() {
        try {
            // Set up error categorization rules
            this.initializeErrorCategories();

            // Set up alert thresholds
            this.initializeAlertThresholds();

            // Initialize trend tracking
            await this.initializeTrendTracking();

            await adminDebugLog('ErrorsController', 'Error monitoring systems initialized');
        } catch (error) {
            await adminDebugError('ErrorsController', 'Error monitoring setup failed', error);
        }
    }

    /**
     * Load error monitoring data
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                const data = await window.AdminState.loadErrorsData({}, useCache);
                this.displayErrorsData(data);
                return data;
            } else {
                return await this.loadDataFallback();
            }
        } catch (error) {
            await adminDebugError('ErrorsController', 'Error loading errors data', error);
            this.showError('Failed to load error monitoring data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            // Load error logs and analytics
            const errorLogs = await this.getErrorLogs();

            // Load error analytics
            const errorAnalytics = await this.getErrorAnalytics();

            // Load error trends
            const errorTrends = await this.getErrorTrends();

            this.currentErrorData = {
                logs: errorLogs,
                analytics: errorAnalytics,
                trends: errorTrends,
                lastUpdated: new Date().toISOString()
            };

            this.displayErrorsData(this.currentErrorData);
            return this.currentErrorData;

        } catch (error) {
            await adminDebugError('ErrorsController', 'Fallback error data loading failed', error);
            throw error;
        }
    }

    /**
     * Display error monitoring data in the UI
     */
    async displayErrorsData(data) {
        try {
            if (!data) {
                await adminDebugLog('ErrorsController', 'No error data available');
                return;
            }

            this.currentErrorData = data;

            // Update error overview cards
            this.updateErrorOverview(data);

            // Update error logs display
            this.updateErrorLogsDisplay(data.logs || []);

            // Update error analytics display
            this.updateErrorAnalyticsDisplay(data.analytics || {});

            // Update error trends display
            this.updateErrorTrendsDisplay(data.trends || {});

            // Update error console
            this.updateErrorConsole(data);

            adminDebugLog('ErrorsController', 'Error data displayed successfully', {
                hasLogs: !!(data.logs && data.logs.length),
                hasAnalytics: !!data.analytics,
                hasTrends: !!data.trends
            });

        } catch (error) {
            await adminDebugError('ErrorsController', 'Failed to display error data', error);
        }
    }

    /**
     * Handle error resolution with admin notes
     */
    async handleErrorResolution() {
        try {
            const selectedErrors = this.getSelectedErrors();
            if (selectedErrors.length === 0) {
                alert('Please select errors to resolve.');
                return;
            }

            const resolution = prompt('Enter resolution notes (required, 10-500 characters):');
            if (!resolution || resolution.trim().length < 10) {
                alert('Resolution notes are required and must be at least 10 characters.');
                return;
            }

            const impact = `This will:
• Mark ${selectedErrors.length} error(s) as resolved
• Add resolution notes to error records
• Update error status and workflow tracking
• Notify relevant team members`;

            if (!confirm(`⚠️ ERROR RESOLUTION\n\n${impact}\n\nThis action requires TOTP verification. Continue?`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                'Error resolution',
                { additionalInfo: impact }
            );

            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/errors/resolve`, {
                method: 'POST',
                body: JSON.stringify({
                    totpToken,
                    errorIds: selectedErrors.map(e => e.id),
                    resolution: resolution.trim(),
                    adminUserId: window.adminAuth.getCurrentUser()?.id,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Errors resolved successfully.\n\nResolution ID: ${data.resolutionId}\nErrors resolved: ${data.resolvedCount}`);

                // Refresh error data
                await this.loadData(false);

                await adminDebugLog('ErrorsController', 'Errors resolved successfully', {
                    resolutionId: data.resolutionId,
                    errorCount: selectedErrors.length
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to resolve errors');
            }

        } catch (error) {
            alert(`❌ Error resolution failed: ${error.message}`);
            await adminDebugError('ErrorsController', 'Error resolution failed', error);
        }
    }

    /**
     * Handle error filtering and search
     */
    async handleErrorFiltering() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            // Get current filter values
            const severityFilter = document.getElementById('errorSeverityFilter')?.value || 'all';
            const typeFilter = document.getElementById('errorTypeFilter')?.value || 'all';
            const timeframeFilter = document.getElementById('errorTimeframeFilter')?.value || '24h';
            const statusFilter = document.getElementById('errorStatusFilter')?.value || 'all';

            // Update internal filters
            this.errorFilters = {
                severity: severityFilter,
                type: typeFilter,
                timeframe: timeframeFilter,
                status: statusFilter
            };

            let filterContent = `🔍 Error Filtering & Search Results\n`;
            filterContent += `================================\n\n`;

            // Apply filters to current data
            const filteredErrors = await this.applyErrorFilters(this.currentErrorData.logs || []);

            filterContent += `📊 FILTER CRITERIA:\n`;
            filterContent += `• Severity: ${severityFilter}\n`;
            filterContent += `• Type: ${typeFilter}\n`;
            filterContent += `• Timeframe: ${timeframeFilter}\n`;
            filterContent += `• Status: ${statusFilter}\n\n`;

            filterContent += `📋 FILTERED RESULTS:\n`;
            filterContent += `• Total Errors: ${filteredErrors.length}\n`;

            // Group by severity
            const severityGroups = this.groupErrorsBySeverity(filteredErrors);
            filterContent += `• Critical: ${severityGroups.critical || 0}\n`;
            filterContent += `• High: ${severityGroups.high || 0}\n`;
            filterContent += `• Medium: ${severityGroups.medium || 0}\n`;
            filterContent += `• Low: ${severityGroups.low || 0}\n\n`;

            // Show recent filtered errors
            filterContent += `🕐 RECENT FILTERED ERRORS:\n`;
            const recentErrors = filteredErrors.slice(0, 10);
            recentErrors.forEach(error => {
                const severityEmoji = this.getSeverityEmoji(error.severity);
                filterContent += `${severityEmoji} ${error.timestamp}: ${error.message.substring(0, 80)}...\n`;
            });

            if (filteredErrors.length > 10) {
                filterContent += `\n... and ${filteredErrors.length - 10} more errors\n`;
            }

            filterContent += `\n🔍 SEARCH OPTIONS:\n`;
            filterContent += `• Full-text error message search\n`;
            filterContent += `• Stack trace pattern matching\n`;
            filterContent += `• User ID correlation\n`;
            filterContent += `• Time range filtering\n`;
            filterContent += `• Geographic error distribution\n`;

            consoleDiv.innerHTML = filterContent;

            // Update error table display
            this.updateFilteredErrorTable(filteredErrors);

            await adminDebugLog('ErrorsController', 'Error filtering applied', {
                filters: this.errorFilters,
                resultCount: filteredErrors.length
            });

        } catch (error) {
            await adminDebugError('ErrorsController', 'Error filtering failed', error);
        }
    }

    /**
     * Display detailed error information
     */
    async displayErrorDetails() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let detailsContent = `🔍 Detailed Error Analysis\n`;
            detailsContent += `================================\n\n`;

            // Get detailed error information
            const errorDetails = await this.getDetailedErrorAnalysis();

            detailsContent += `📊 ERROR CLASSIFICATION:\n`;
            detailsContent += `• Client-side JavaScript Errors: ${errorDetails.clientErrors || 'Unknown'}\n`;
            detailsContent += `• Server-side Application Errors: ${errorDetails.serverErrors || 'Unknown'}\n`;
            detailsContent += `• API Endpoint Errors: ${errorDetails.apiErrors || 'Unknown'}\n`;
            detailsContent += `• Database Errors: ${errorDetails.databaseErrors || 'Unknown'}\n`;
            detailsContent += `• Authentication Errors: ${errorDetails.authErrors || 'Unknown'}\n`;
            detailsContent += `• Network/Connectivity Errors: ${errorDetails.networkErrors || 'Unknown'}\n\n`;

            // Error impact assessment
            detailsContent += `📈 ERROR IMPACT ASSESSMENT:\n`;
            const impactData = await this.getErrorImpactAssessment();
            detailsContent += `• Total Users Affected: ${impactData.affectedUsers || 'Unknown'}\n`;
            detailsContent += `• Session Interruptions: ${impactData.sessionInterruptions || 'Unknown'}\n`;
            detailsContent += `• Failed Transactions: ${impactData.failedTransactions || 'Unknown'}\n`;
            detailsContent += `• Performance Degradation: ${impactData.performanceDegradation || 'Unknown'}\n\n`;

            // Geographic distribution
            detailsContent += `🌍 GEOGRAPHIC DISTRIBUTION:\n`;
            const geoData = await this.getErrorGeographicData();
            geoData.forEach(geo => {
                detailsContent += `• ${geo.region}: ${geo.errorCount} errors (${geo.percentage}%)\n`;
            });
            detailsContent += `\n`;

            // Device and browser analysis
            detailsContent += `💻 DEVICE & BROWSER ANALYSIS:\n`;
            const deviceData = await this.getErrorDeviceAnalysis();
            detailsContent += `• Desktop Errors: ${deviceData.desktop || 'Unknown'}\n`;
            detailsContent += `• Mobile Errors: ${deviceData.mobile || 'Unknown'}\n`;
            detailsContent += `• Tablet Errors: ${deviceData.tablet || 'Unknown'}\n`;
            detailsContent += `• Top Browser: ${deviceData.topBrowser || 'Unknown'}\n`;
            detailsContent += `• Browser Compatibility Issues: ${deviceData.compatibilityIssues || 'Unknown'}\n\n`;

            // Time-based analysis
            detailsContent += `⏰ TIME-BASED PATTERNS:\n`;
            const timeData = await this.getErrorTimeAnalysis();
            detailsContent += `• Peak Error Hour: ${timeData.peakHour || 'Unknown'}\n`;
            detailsContent += `• Weekend vs Weekday: ${timeData.weekendVsWeekday || 'Unknown'}\n`;
            detailsContent += `• Seasonal Trends: ${timeData.seasonalTrends || 'Unknown'}\n\n`;

            detailsContent += `🛠️ DETAILED ANALYSIS TOOLS:\n`;
            detailsContent += `• Stack Trace Deep Dive\n`;
            detailsContent += `• Error Correlation Matrix\n`;
            detailsContent += `• User Journey Reconstruction\n`;
            detailsContent += `• Performance Impact Analysis\n`;
            detailsContent += `• Root Cause Investigation\n`;

            consoleDiv.innerHTML = detailsContent;

            await adminDebugLog('ErrorsController', 'Error details displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'Error details display failed', error);
        }
    }

    /**
     * Display error trends and analytics
     */
    async displayErrorTrends() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let trendsContent = `📈 Error Trends & Analytics Dashboard\n`;
            trendsContent += `================================\n\n`;

            // Error frequency trends
            trendsContent += `📊 ERROR FREQUENCY TRENDS:\n`;
            const frequencyTrends = await this.getErrorFrequencyTrends();
            trendsContent += `• Hourly Average: ${frequencyTrends.hourlyAverage || 'Unknown'}\n`;
            trendsContent += `• Daily Trend: ${frequencyTrends.dailyTrend || 'Unknown'}\n`;
            trendsContent += `• Weekly Change: ${frequencyTrends.weeklyChange || 'Unknown'}\n`;
            trendsContent += `• Monthly Comparison: ${frequencyTrends.monthlyComparison || 'Unknown'}\n\n`;

            // Error severity trends
            trendsContent += `🚨 SEVERITY TREND ANALYSIS:\n`;
            const severityTrends = await this.getErrorSeverityTrends();
            trendsContent += `• Critical Error Trend: ${severityTrends.critical || 'Unknown'}\n`;
            trendsContent += `• High Priority Trend: ${severityTrends.high || 'Unknown'}\n`;
            trendsContent += `• Medium Priority Trend: ${severityTrends.medium || 'Unknown'}\n`;
            trendsContent += `• Low Priority Trend: ${severityTrends.low || 'Unknown'}\n\n`;

            // Resolution time analysis
            trendsContent += `⏱️ RESOLUTION TIME METRICS:\n`;
            const resolutionMetrics = await this.getResolutionTimeMetrics();
            trendsContent += `• Average Resolution Time: ${resolutionMetrics.averageTime || 'Unknown'}\n`;
            trendsContent += `• Fastest Resolution: ${resolutionMetrics.fastestTime || 'Unknown'}\n`;
            trendsContent += `• Slowest Resolution: ${resolutionMetrics.slowestTime || 'Unknown'}\n`;
            trendsContent += `• Resolution Efficiency: ${resolutionMetrics.efficiency || 'Unknown'}\n\n`;

            // Pattern detection
            trendsContent += `🔍 PATTERN DETECTION:\n`;
            const patterns = await this.getErrorPatterns();
            patterns.forEach(pattern => {
                trendsContent += `• ${pattern.type}: ${pattern.description} (${pattern.frequency})\n`;
            });
            trendsContent += `\n`;

            // Predictive analysis
            trendsContent += `🔮 PREDICTIVE ANALYSIS:\n`;
            const predictions = await this.getErrorPredictions();
            trendsContent += `• Next 24h Forecast: ${predictions.next24h || 'Unknown'}\n`;
            trendsContent += `• High-Risk Periods: ${predictions.highRiskPeriods || 'Unknown'}\n`;
            trendsContent += `• Preventive Actions: ${predictions.preventiveActions || 'Unknown'}\n\n`;

            // Performance correlation
            trendsContent += `⚡ PERFORMANCE CORRELATION:\n`;
            const perfCorrelation = await this.getPerformanceCorrelation();
            trendsContent += `• Error-Performance Correlation: ${perfCorrelation.correlation || 'Unknown'}\n`;
            trendsContent += `• High Error Impact Periods: ${perfCorrelation.highImpactPeriods || 'Unknown'}\n`;
            trendsContent += `• Performance Recovery Time: ${perfCorrelation.recoveryTime || 'Unknown'}\n\n`;

            trendsContent += `📊 TREND VISUALIZATION:\n`;
            trendsContent += `• Time Series Error Charts\n`;
            trendsContent += `• Severity Heat Maps\n`;
            trendsContent += `• Geographic Error Distribution\n`;
            trendsContent += `• Resolution Time Histograms\n`;
            trendsContent += `• Pattern Recognition Graphs\n`;

            consoleDiv.innerHTML = trendsContent;

            await adminDebugLog('ErrorsController', 'Error trends displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'Error trends display failed', error);
        }
    }

    /**
     * Handle error alert configuration
     */
    async handleErrorAlerts() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let alertsContent = `🚨 Error Alert Configuration\n`;
            alertsContent += `================================\n\n`;

            // Current alert configuration
            alertsContent += `⚙️ CURRENT ALERT SETTINGS:\n`;
            const alertConfig = await this.getAlertConfiguration();
            alertsContent += `• Critical Error Threshold: ${alertConfig.criticalThreshold || 'Not set'}\n`;
            alertsContent += `• High Error Rate Alert: ${alertConfig.highRateAlert || 'Not set'}\n`;
            alertsContent += `• New Error Type Alert: ${alertConfig.newTypeAlert || 'Enabled'}\n`;
            alertsContent += `• Performance Impact Alert: ${alertConfig.performanceAlert || 'Enabled'}\n`;
            alertsContent += `• Geographic Anomaly Alert: ${alertConfig.geoAlert || 'Disabled'}\n\n`;

            // Alert channels
            alertsContent += `📬 NOTIFICATION CHANNELS:\n`;
            const channels = await this.getNotificationChannels();
            channels.forEach(channel => {
                const status = channel.enabled ? '✅' : '❌';
                alertsContent += `${status} ${channel.name}: ${channel.description}\n`;
            });
            alertsContent += `\n`;

            // Recent alerts
            alertsContent += `📋 RECENT ALERTS (24h):\n`;
            const recentAlerts = await this.getRecentAlerts();
            if (recentAlerts.length === 0) {
                alertsContent += `✅ No alerts triggered in the last 24 hours\n`;
            } else {
                recentAlerts.forEach(alert => {
                    const severityEmoji = this.getSeverityEmoji(alert.severity);
                    alertsContent += `${severityEmoji} ${alert.timestamp}: ${alert.message}\n`;
                });
            }
            alertsContent += `\n`;

            // Alert rules
            alertsContent += `📏 ALERT RULES:\n`;
            const alertRules = await this.getAlertRules();
            alertRules.forEach(rule => {
                const status = rule.active ? '🟢' : '🔴';
                alertsContent += `${status} ${rule.name}: ${rule.condition}\n`;
            });
            alertsContent += `\n`;

            // Alert performance
            alertsContent += `📊 ALERT PERFORMANCE:\n`;
            const alertPerf = await this.getAlertPerformance();
            alertsContent += `• Total Alerts (7 days): ${alertPerf.totalAlerts || 'Unknown'}\n`;
            alertsContent += `• False Positive Rate: ${alertPerf.falsePositiveRate || 'Unknown'}\n`;
            alertsContent += `• Average Response Time: ${alertPerf.avgResponseTime || 'Unknown'}\n`;
            alertsContent += `• Alert Escalations: ${alertPerf.escalations || 'Unknown'}\n\n`;

            alertsContent += `🛠️ ALERT MANAGEMENT:\n`;
            alertsContent += `• Custom Alert Rule Creation\n`;
            alertsContent += `• Threshold Adjustment\n`;
            alertsContent += `• Notification Channel Setup\n`;
            alertsContent += `• Alert Suppression Rules\n`;
            alertsContent += `• Escalation Policies\n`;

            consoleDiv.innerHTML = alertsContent;

            await adminDebugLog('ErrorsController', 'Error alerts configuration displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'Alert configuration display failed', error);
        }
    }

    /**
     * Generate comprehensive error report
     */
    async generateErrorReport() {
        try {
            const reportType = prompt('Report type (summary/detailed/executive):', 'summary');
            if (!reportType) return;

            const timeframe = prompt('Timeframe (24h/7d/30d):', '7d');
            if (!timeframe) return;

            const impact = `This will:
• Generate comprehensive error report
• Include analytics and trends
• Provide actionable insights
• Create exportable document
• Include recommendations`;

            if (!confirm(`📊 ERROR REPORT GENERATION\n\n${impact}\n\nReport Type: ${reportType}\nTimeframe: ${timeframe}\n\nContinue?`)) {
                return;
            }

            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/errors/report`, {
                method: 'POST',
                body: JSON.stringify({
                    reportType: reportType,
                    timeframe: timeframe,
                    adminUserId: window.adminAuth.getCurrentUser()?.id,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Display report summary
                const consoleDiv = document.getElementById('errorsConsole');
                if (consoleDiv) {
                    let reportContent = `📊 Error Report Generated\n`;
                    reportContent += `================================\n\n`;
                    reportContent += `📋 REPORT SUMMARY:\n`;
                    reportContent += `• Report ID: ${data.reportId}\n`;
                    reportContent += `• Type: ${reportType}\n`;
                    reportContent += `• Timeframe: ${timeframe}\n`;
                    reportContent += `• Total Errors Analyzed: ${data.totalErrors || 'Unknown'}\n`;
                    reportContent += `• Critical Issues Found: ${data.criticalIssues || 'Unknown'}\n`;
                    reportContent += `• Recommendations: ${data.recommendations || 'Unknown'}\n\n`;

                    if (data.downloadUrl) {
                        reportContent += `💾 DOWNLOAD LINK:\n`;
                        reportContent += `Report available at: ${data.downloadUrl}\n\n`;
                    }

                    reportContent += `✅ Report generation completed successfully.\n`;
                    reportContent += `Report will be available in admin downloads section.`;

                    consoleDiv.innerHTML = reportContent;
                }

                alert(`✅ Error report generated successfully.\n\nReport ID: ${data.reportId}\nType: ${reportType}\nTimeframe: ${timeframe}`);

                await adminDebugLog('ErrorsController', 'Error report generated', {
                    reportId: data.reportId,
                    reportType: reportType,
                    timeframe: timeframe
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate error report');
            }

        } catch (error) {
            alert(`❌ Report generation failed: ${error.message}`);
            await adminDebugError('ErrorsController', 'Report generation failed', error);
        }
    }

    /**
     * Handle real-time error monitoring toggle
     */
    async handleRealTimeMonitoring() {
        try {
            this.realTimeUpdates = !this.realTimeUpdates;

            if (this.realTimeUpdates) {
                // Start real-time monitoring
                this.startRealTimeMonitoring();
                alert('✅ Real-time error monitoring enabled.\n\nError updates will be received every 10 seconds.');
            } else {
                // Stop real-time monitoring
                this.stopRealTimeMonitoring();
                alert('⏸️ Real-time error monitoring disabled.\n\nReturning to manual refresh mode.');
            }

            // Update button text
            const realTimeBtn = document.getElementById('realTimeToggleBtn');
            if (realTimeBtn) {
                realTimeBtn.textContent = this.realTimeUpdates ? 'Disable Real-time' : 'Enable Real-time';
                realTimeBtn.style.backgroundColor = this.realTimeUpdates ? '#d32f2f' : '#1976d2';
            }

            await adminDebugLog('ErrorsController', `Real-time monitoring ${this.realTimeUpdates ? 'enabled' : 'disabled'}`);

        } catch (error) {
            await adminDebugError('ErrorsController', 'Real-time monitoring toggle failed', error);
        }
    }

    /**
     * Handle error classification analysis
     */
    async handleErrorClassification() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let classificationContent = `🏷️ Error Classification Analysis\n`;
            classificationContent += `================================\n\n`;

            // Automated classification results
            classificationContent += `🤖 AUTOMATED CLASSIFICATION:\n`;
            const autoClassification = await this.getAutomatedClassification();
            autoClassification.forEach(category => {
                classificationContent += `• ${category.name}: ${category.count} errors (${category.percentage}%)\n`;
                classificationContent += `  Confidence: ${category.confidence}, Accuracy: ${category.accuracy}\n`;
            });
            classificationContent += `\n`;

            // Manual classification review
            classificationContent += `👤 MANUAL REVIEW REQUIRED:\n`;
            const manualReview = await this.getManualReviewItems();
            manualReview.forEach(item => {
                classificationContent += `• ${item.errorId}: ${item.description}\n`;
                classificationContent += `  Suggested: ${item.suggestedCategory} (${item.confidence}% confidence)\n`;
            });
            classificationContent += `\n`;

            // Classification accuracy
            classificationContent += `📊 CLASSIFICATION METRICS:\n`;
            const metrics = await this.getClassificationMetrics();
            classificationContent += `• Overall Accuracy: ${metrics.overallAccuracy || 'Unknown'}\n`;
            classificationContent += `• Auto-Classification Rate: ${metrics.autoRate || 'Unknown'}\n`;
            classificationContent += `• Manual Review Rate: ${metrics.manualRate || 'Unknown'}\n`;
            classificationContent += `• False Positive Rate: ${metrics.falsePositiveRate || 'Unknown'}\n\n`;

            // Category definitions
            classificationContent += `📋 CATEGORY DEFINITIONS:\n`;
            const categories = await this.getErrorCategories();
            categories.forEach(category => {
                classificationContent += `• ${category.name}: ${category.description}\n`;
                classificationContent += `  Rules: ${category.rules.join(', ')}\n`;
            });
            classificationContent += `\n`;

            classificationContent += `🛠️ CLASSIFICATION TOOLS:\n`;
            classificationContent += `• Custom Category Creation\n`;
            classificationContent += `• Rule-based Classification\n`;
            classificationContent += `• Machine Learning Enhancement\n`;
            classificationContent += `• Bulk Reclassification\n`;
            classificationContent += `• Category Performance Analysis\n`;

            consoleDiv.innerHTML = classificationContent;

            await adminDebugLog('ErrorsController', 'Error classification analysis displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'Classification analysis display failed', error);
        }
    }

    /**
     * Handle error impact analysis
     */
    async handleErrorImpactAnalysis() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let impactContent = `📈 Error Impact Analysis\n`;
            impactContent += `================================\n\n`;

            // User experience impact
            impactContent += `👤 USER EXPERIENCE IMPACT:\n`;
            const uxImpact = await this.getUserExperienceImpact();
            impactContent += `• Total Users Affected: ${uxImpact.totalUsers || 'Unknown'}\n`;
            impactContent += `• Session Abandonment Rate: ${uxImpact.abandonmentRate || 'Unknown'}\n`;
            impactContent += `• Task Completion Impact: ${uxImpact.taskCompletion || 'Unknown'}\n`;
            impactContent += `• User Satisfaction Score: ${uxImpact.satisfactionScore || 'Unknown'}\n\n`;

            // Business impact
            impactContent += `💼 BUSINESS IMPACT:\n`;
            const businessImpact = await this.getBusinessImpact();
            impactContent += `• Revenue Impact: ${businessImpact.revenueImpact || 'Unknown'}\n`;
            impactContent += `• Transaction Failures: ${businessImpact.transactionFailures || 'Unknown'}\n`;
            impactContent += `• Customer Support Tickets: ${businessImpact.supportTickets || 'Unknown'}\n`;
            impactContent += `• Brand Reputation Risk: ${businessImpact.reputationRisk || 'Unknown'}\n\n`;

            // Performance impact
            impactContent += `⚡ PERFORMANCE IMPACT:\n`;
            const perfImpact = await this.getPerformanceImpact();
            impactContent += `• System Response Time: ${perfImpact.responseTime || 'Unknown'}\n`;
            impactContent += `• Resource Utilization: ${perfImpact.resourceUtil || 'Unknown'}\n`;
            impactContent += `• Throughput Reduction: ${perfImpact.throughputReduction || 'Unknown'}\n`;
            impactContent += `• Cascading Failures: ${perfImpact.cascadingFailures || 'Unknown'}\n\n`;

            // High-impact error analysis
            impactContent += `🚨 HIGH-IMPACT ERRORS:\n`;
            const highImpactErrors = await this.getHighImpactErrors();
            highImpactErrors.forEach(error => {
                impactContent += `• ${error.type}: ${error.description}\n`;
                impactContent += `  Impact Score: ${error.impactScore}, Affected Users: ${error.affectedUsers}\n`;
            });
            impactContent += `\n`;

            // Recovery analysis
            impactContent += `🔄 RECOVERY ANALYSIS:\n`;
            const recoveryData = await this.getRecoveryAnalysis();
            impactContent += `• Average Recovery Time: ${recoveryData.avgRecoveryTime || 'Unknown'}\n`;
            impactContent += `• Fastest Recovery: ${recoveryData.fastestRecovery || 'Unknown'}\n`;
            impactContent += `• Longest Recovery: ${recoveryData.longestRecovery || 'Unknown'}\n`;
            impactContent += `• User Return Rate: ${recoveryData.userReturnRate || 'Unknown'}\n\n`;

            impactContent += `🛠️ IMPACT MITIGATION:\n`;
            impactContent += `• Error Priority Scoring\n`;
            impactContent += `• Impact-based Alerting\n`;
            impactContent += `• Automated Rollback Triggers\n`;
            impactContent += `• User Communication Templates\n`;
            impactContent += `• Business Continuity Planning\n`;

            consoleDiv.innerHTML = impactContent;

            await adminDebugLog('ErrorsController', 'Error impact analysis displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'Impact analysis display failed', error);
        }
    }

    /**
     * Handle error-performance correlation analysis
     */
    async handleErrorPerformanceCorrelation() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let correlationContent = `⚡ Error-Performance Correlation Analysis\n`;
            correlationContent += `================================\n\n`;

            // Correlation metrics
            correlationContent += `📊 CORRELATION METRICS:\n`;
            const correlationMetrics = await this.getPerformanceCorrelationMetrics();
            correlationContent += `• Error-Response Time Correlation: ${correlationMetrics.responseTimeCorr || 'Unknown'}\n`;
            correlationContent += `• Error-Memory Usage Correlation: ${correlationMetrics.memoryCorr || 'Unknown'}\n`;
            correlationContent += `• Error-CPU Usage Correlation: ${correlationMetrics.cpuCorr || 'Unknown'}\n`;
            correlationContent += `• Error-Throughput Correlation: ${correlationMetrics.throughputCorr || 'Unknown'}\n\n`;

            // Performance degradation patterns
            correlationContent += `📉 PERFORMANCE DEGRADATION:\n`;
            const degradationPatterns = await this.getPerformanceDegradationPatterns();
            degradationPatterns.forEach(pattern => {
                correlationContent += `• ${pattern.metric}: ${pattern.degradation} (${pattern.errorTrigger})\n`;
            });
            correlationContent += `\n`;

            // Recovery patterns
            correlationContent += `🔄 RECOVERY PATTERNS:\n`;
            const recoveryPatterns = await this.getPerformanceRecoveryPatterns();
            correlationContent += `• Average Recovery Time: ${recoveryPatterns.avgTime || 'Unknown'}\n`;
            correlationContent += `• Performance Baseline Return: ${recoveryPatterns.baselineReturn || 'Unknown'}\n`;
            correlationContent += `• Error-Free Performance Boost: ${recoveryPatterns.errorFreeBoost || 'Unknown'}\n\n`;

            // Error hotspots
            correlationContent += `🔥 PERFORMANCE HOTSPOTS:\n`;
            const hotspots = await this.getPerformanceHotspots();
            hotspots.forEach(hotspot => {
                correlationContent += `• ${hotspot.component}: ${hotspot.errorRate} error rate, ${hotspot.perfImpact} perf impact\n`;
            });
            correlationContent += `\n`;

            // Predictive insights
            correlationContent += `🔮 PREDICTIVE INSIGHTS:\n`;
            const predictions = await this.getPerformancePredictions();
            correlationContent += `• Performance Risk Score: ${predictions.riskScore || 'Unknown'}\n`;
            correlationContent += `• Projected Error Increase: ${predictions.errorIncrease || 'Unknown'}\n`;
            correlationContent += `• Recommended Actions: ${predictions.recommendations || 'Unknown'}\n\n`;

            correlationContent += `🛠️ OPTIMIZATION OPPORTUNITIES:\n`;
            correlationContent += `• Error-driven Performance Monitoring\n`;
            correlationContent += `• Predictive Scaling Based on Error Patterns\n`;
            correlationContent += `• Performance-aware Error Prioritization\n`;
            correlationContent += `• Automated Performance Recovery\n`;
            correlationContent += `• Resource Allocation Optimization\n`;

            consoleDiv.innerHTML = correlationContent;

            await adminDebugLog('ErrorsController', 'Error-performance correlation displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'Performance correlation display failed', error);
        }
    }

    /**
     * Handle error-user correlation analysis
     */
    async handleErrorUserCorrelation() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let userCorrelationContent = `👥 Error-User Correlation Analysis\n`;
            userCorrelationContent += `================================\n\n`;

            // User segment analysis
            userCorrelationContent += `📊 USER SEGMENT ANALYSIS:\n`;
            const userSegments = await this.getUserSegmentErrorAnalysis();
            userSegments.forEach(segment => {
                userCorrelationContent += `• ${segment.name}: ${segment.errorRate} error rate, ${segment.userCount} users\n`;
            });
            userCorrelationContent += `\n`;

            // User journey impact
            userCorrelationContent += `🛤️ USER JOURNEY IMPACT:\n`;
            const journeyImpact = await this.getUserJourneyImpact();
            journeyImpact.forEach(journey => {
                userCorrelationContent += `• ${journey.stage}: ${journey.errorCount} errors, ${journey.dropoffRate} dropoff\n`;
            });
            userCorrelationContent += `\n`;

            // High-error users
            userCorrelationContent += `🚨 HIGH-ERROR USERS:\n`;
            const highErrorUsers = await this.getHighErrorUsers();
            highErrorUsers.forEach(user => {
                userCorrelationContent += `• User ${user.id}: ${user.errorCount} errors, ${user.sessionCount} sessions\n`;
                userCorrelationContent += `  Pattern: ${user.errorPattern}, Severity: ${user.avgSeverity}\n`;
            });
            userCorrelationContent += `\n`;

            // Error correlation by user attributes
            userCorrelationContent += `👤 USER ATTRIBUTE CORRELATION:\n`;
            const attributeCorr = await this.getUserAttributeCorrelation();
            userCorrelationContent += `• Device Type: ${attributeCorr.deviceType || 'Unknown'}\n`;
            userCorrelationContent += `• Browser Version: ${attributeCorr.browserVersion || 'Unknown'}\n`;
            userCorrelationContent += `• Geographic Location: ${attributeCorr.geoLocation || 'Unknown'}\n`;
            userCorrelationContent += `• User Tenure: ${attributeCorr.userTenure || 'Unknown'}\n`;
            userCorrelationContent += `• Account Type: ${attributeCorr.accountType || 'Unknown'}\n\n`;

            // Error recovery by user
            userCorrelationContent += `🔄 USER ERROR RECOVERY:\n`;
            const userRecovery = await this.getUserErrorRecovery();
            userCorrelationContent += `• Successful Recovery Rate: ${userRecovery.successRate || 'Unknown'}\n`;
            userCorrelationContent += `• Average Recovery Time: ${userRecovery.avgTime || 'Unknown'}\n`;
            userCorrelationContent += `• User-initiated Recovery: ${userRecovery.userInitiated || 'Unknown'}\n`;
            userCorrelationContent += `• Support-assisted Recovery: ${userRecovery.supportAssisted || 'Unknown'}\n\n`;

            userCorrelationContent += `🛠️ USER-CENTRIC IMPROVEMENTS:\n`;
            userCorrelationContent += `• Personalized Error Handling\n`;
            userCorrelationContent += `• User Journey Optimization\n`;
            userCorrelationContent += `• Targeted Error Prevention\n`;
            userCorrelationContent += `• User Experience Monitoring\n`;
            userCorrelationContent += `• Behavior-based Error Prediction\n`;

            consoleDiv.innerHTML = userCorrelationContent;

            await adminDebugLog('ErrorsController', 'Error-user correlation displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'User correlation display failed', error);
        }
    }

    /**
     * Handle error resolution workflow
     */
    async handleErrorResolutionWorkflow() {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let workflowContent = `🔄 Error Resolution Workflow\n`;
            workflowContent += `================================\n\n`;

            // Workflow status overview
            workflowContent += `📊 WORKFLOW STATUS OVERVIEW:\n`;
            const workflowStatus = await this.getWorkflowStatus();
            workflowContent += `• New Errors: ${workflowStatus.newErrors || 'Unknown'}\n`;
            workflowContent += `• In Investigation: ${workflowStatus.investigating || 'Unknown'}\n`;
            workflowContent += `• Awaiting Fix: ${workflowStatus.awaitingFix || 'Unknown'}\n`;
            workflowContent += `• In Testing: ${workflowStatus.inTesting || 'Unknown'}\n`;
            workflowContent += `• Resolved: ${workflowStatus.resolved || 'Unknown'}\n`;
            workflowContent += `• Closed: ${workflowStatus.closed || 'Unknown'}\n\n`;

            // Assignment status
            workflowContent += `👥 ASSIGNMENT STATUS:\n`;
            const assignments = await this.getErrorAssignments();
            assignments.forEach(assignment => {
                workflowContent += `• ${assignment.assignee}: ${assignment.errorCount} errors, ${assignment.avgResolutionTime} avg time\n`;
            });
            workflowContent += `\n`;

            // Resolution SLA tracking
            workflowContent += `⏰ SLA TRACKING:\n`;
            const slaTracking = await this.getSLATracking();
            workflowContent += `• Critical SLA Compliance: ${slaTracking.criticalCompliance || 'Unknown'}\n`;
            workflowContent += `• High Priority Compliance: ${slaTracking.highCompliance || 'Unknown'}\n`;
            workflowContent += `• Medium Priority Compliance: ${slaTracking.mediumCompliance || 'Unknown'}\n`;
            workflowContent += `• Overdue Errors: ${slaTracking.overdueErrors || 'Unknown'}\n\n`;

            // Escalation tracking
            workflowContent += `📈 ESCALATION TRACKING:\n`;
            const escalations = await this.getEscalationTracking();
            workflowContent += `• Auto-escalated: ${escalations.autoEscalated || 'Unknown'}\n`;
            workflowContent += `• Manual escalations: ${escalations.manualEscalated || 'Unknown'}\n`;
            workflowContent += `• Executive escalations: ${escalations.executiveEscalated || 'Unknown'}\n`;
            workflowContent += `• Escalation success rate: ${escalations.successRate || 'Unknown'}\n\n`;

            // Workflow efficiency
            workflowContent += `📊 WORKFLOW EFFICIENCY:\n`;
            const efficiency = await this.getWorkflowEfficiency();
            workflowContent += `• Average Resolution Time: ${efficiency.avgResolutionTime || 'Unknown'}\n`;
            workflowContent += `• First-time Resolution Rate: ${efficiency.firstTimeRate || 'Unknown'}\n`;
            workflowContent += `• Workflow Bottlenecks: ${efficiency.bottlenecks?.join(', ') || 'None identified'}\n`;
            workflowContent += `• Process Improvement Score: ${efficiency.improvementScore || 'Unknown'}\n\n`;

            workflowContent += `🛠️ WORKFLOW TOOLS:\n`;
            workflowContent += `• Automated Error Assignment\n`;
            workflowContent += `• SLA Monitoring and Alerts\n`;
            workflowContent += `• Resolution Template Library\n`;
            workflowContent += `• Escalation Rule Configuration\n`;
            workflowContent += `• Workflow Analytics and Reporting\n`;

            consoleDiv.innerHTML = workflowContent;

            await adminDebugLog('ErrorsController', 'Error resolution workflow displayed');

        } catch (error) {
            await adminDebugError('ErrorsController', 'Resolution workflow display failed', error);
        }
    }

    // UI Update Helper Methods

    /**
     * Update error overview cards
     */
    updateErrorOverview(data) {
        try {
            // Update total errors card
            const totalErrorsElement = document.getElementById('totalErrors');
            if (totalErrorsElement && data.analytics?.totalErrors) {
                totalErrorsElement.textContent = data.analytics.totalErrors;
            }

            // Update critical errors card
            const criticalErrorsElement = document.getElementById('criticalErrors');
            if (criticalErrorsElement && data.analytics?.criticalErrors) {
                criticalErrorsElement.textContent = data.analytics.criticalErrors;
            }

            // Update error rate card
            const errorRateElement = document.getElementById('errorRate');
            if (errorRateElement && data.analytics?.errorRate) {
                errorRateElement.textContent = `${data.analytics.errorRate}%`;
            }

            // Update last error time
            const lastErrorElement = document.getElementById('lastErrorTime');
            if (lastErrorElement && data.analytics?.lastErrorTime) {
                lastErrorElement.textContent = new Date(data.analytics.lastErrorTime).toLocaleString();
            }

        } catch (error) {
            adminDebugError('ErrorsController', 'Failed to update error overview', error);
        }
    }

    /**
     * Update error logs display
     */
    updateErrorLogsDisplay(logs) {
        try {
            const logsDiv = document.getElementById('errorLogsTable');
            if (!logsDiv || !logs) return;

            let logsHtml = `
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Severity</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Time</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Message</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Type</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Status</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            logs.slice(0, 20).forEach(log => {
                const severityColor = this.getSeverityColor(log.severity);
                const severityEmoji = this.getSeverityEmoji(log.severity);
                const statusColor = this.getStatusColor(log.status);

                logsHtml += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 0.5rem; border: 1px solid #ddd; color: ${severityColor};">
                            ${severityEmoji} ${log.severity}
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd; font-size: 0.8rem;">
                            ${new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd; max-width: 300px; word-wrap: break-word;">
                            ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">
                            ${log.type || 'Unknown'}
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd; color: ${statusColor};">
                            ${log.status || 'New'}
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">
                            <button onclick="viewErrorDetails('${log.id}')" style="font-size: 0.8rem; padding: 0.25rem 0.5rem; margin-right: 0.25rem;">View</button>
                            <button onclick="resolveError('${log.id}')" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">Resolve</button>
                        </td>
                    </tr>
                `;
            });

            logsHtml += `
                    </tbody>
                </table>
            `;

            logsDiv.innerHTML = logsHtml;

        } catch (error) {
            adminDebugError('ErrorsController', 'Failed to update error logs display', error);
        }
    }

    /**
     * Update error analytics display
     */
    updateErrorAnalyticsDisplay(analytics) {
        try {
            const analyticsDiv = document.getElementById('errorAnalyticsStatus');
            if (!analyticsDiv || !analytics) return;

            let analyticsHtml = '';

            // Error frequency analytics
            analyticsHtml += `
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">Error Frequency</h4>
            `;

            for (const [metric, value] of Object.entries(analytics.frequency || {})) {
                analyticsHtml += `
                    <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9rem;">
                        <span>${metric}:</span>
                        <span style="font-family: monospace; font-weight: bold;">${value}</span>
                    </div>
                `;
            }

            analyticsHtml += `</div>`;

            // Error distribution analytics
            analyticsHtml += `
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">Error Distribution</h4>
            `;

            for (const [metric, value] of Object.entries(analytics.distribution || {})) {
                analyticsHtml += `
                    <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9rem;">
                        <span>${metric}:</span>
                        <span style="font-family: monospace; font-weight: bold;">${value}</span>
                    </div>
                `;
            }

            analyticsHtml += `</div>`;

            analyticsDiv.innerHTML = analyticsHtml;

        } catch (error) {
            adminDebugError('ErrorsController', 'Failed to update error analytics display', error);
        }
    }

    /**
     * Update error trends display
     */
    updateErrorTrendsDisplay(trends) {
        try {
            const trendsDiv = document.getElementById('errorTrendsStatus');
            if (!trendsDiv || !trends) return;

            let trendsHtml = '';

            // Trend indicators
            for (const [trend, data] of Object.entries(trends)) {
                const trendIcon = this.getTrendIcon(data.direction);
                const trendColor = this.getTrendColor(data.direction);

                trendsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span><strong>${trend}</strong></span>
                        <span style="color: ${trendColor}">${trendIcon} ${data.value}</span>
                    </div>
                `;
            }

            trendsDiv.innerHTML = trendsHtml;

        } catch (error) {
            adminDebugError('ErrorsController', 'Failed to update error trends display', error);
        }
    }

    /**
     * Update error console with formatted output
     */
    updateErrorConsole(data) {
        try {
            const consoleDiv = document.getElementById('errorsConsole');
            if (!consoleDiv) return;

            let output = '🚨 Error Monitoring Console\n';
            output += '================================\n\n';

            // Add timestamp
            output += `📅 Last Updated: ${new Date().toLocaleString()}\n\n`;

            // Error overview
            output += `🎯 ERROR OVERVIEW:\n`;
            output += `   Total Errors (24h): ${data.analytics?.totalErrors || 'Unknown'}\n`;
            output += `   Critical Errors: ${data.analytics?.criticalErrors || 'Unknown'}\n`;
            output += `   Error Rate: ${data.analytics?.errorRate || 'Unknown'}%\n`;
            output += `   Real-time Monitoring: ${this.realTimeUpdates ? 'Active' : 'Inactive'}\n\n`;

            // Recent errors
            if (data.logs && data.logs.length > 0) {
                output += `🕐 RECENT ERRORS (Last 5):\n`;
                data.logs.slice(0, 5).forEach(error => {
                    const severityEmoji = this.getSeverityEmoji(error.severity);
                    output += `   ${severityEmoji} ${error.timestamp}: ${error.message.substring(0, 60)}...\n`;
                });
                output += `\n`;
            }

            output += '================================\n';
            output += 'Use error management buttons for detailed analysis\n';
            output += 'Auto-refresh enabled every 30 seconds\n';

            consoleDiv.innerHTML = output;

        } catch (error) {
            adminDebugError('ErrorsController', 'Console update failed', error);
        }
    }

    // Data Collection Helper Methods

    /**
     * Initialize error categories
     */
    initializeErrorCategories() {
        this.errorCategories.set('client', {
            name: 'Client-side JavaScript',
            rules: ['TypeError', 'ReferenceError', 'SyntaxError'],
            severity: 'medium'
        });

        this.errorCategories.set('server', {
            name: 'Server-side Application',
            rules: ['InternalServerError', 'DatabaseError', 'TimeoutError'],
            severity: 'high'
        });

        this.errorCategories.set('api', {
            name: 'API Endpoint',
            rules: ['404', '500', '503', 'ValidationError'],
            severity: 'medium'
        });

        this.errorCategories.set('auth', {
            name: 'Authentication',
            rules: ['Unauthorized', 'Forbidden', 'TokenExpired'],
            severity: 'high'
        });

        this.errorCategories.set('network', {
            name: 'Network/Connectivity',
            rules: ['NetworkError', 'CORS', 'Timeout'],
            severity: 'low'
        });
    }

    /**
     * Initialize alert thresholds
     */
    initializeAlertThresholds() {
        this.alertThresholds.set('critical', {
            threshold: 1,
            timeWindow: '5m',
            enabled: true
        });

        this.alertThresholds.set('errorRate', {
            threshold: 5, // 5% error rate
            timeWindow: '15m',
            enabled: true
        });

        this.alertThresholds.set('newErrorType', {
            threshold: 1,
            timeWindow: '1h',
            enabled: true
        });
    }

    /**
     * Initialize trend tracking
     */
    async initializeTrendTracking() {
        // Start collecting trend data
        setInterval(() => {
            this.collectTrendData();
        }, 60000); // Every minute
    }

    /**
     * Collect trend data
     */
    async collectTrendData() {
        try {
            const currentTime = new Date().toISOString();
            const currentMetrics = await this.getCurrentErrorMetrics();

            this.errorTrends.set(currentTime, currentMetrics);

            // Keep only last 24 hours of data
            const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            for (const [timestamp] of this.errorTrends) {
                if (timestamp < cutoffTime) {
                    this.errorTrends.delete(timestamp);
                }
            }

        } catch (error) {
            adminDebugError('ErrorsController', 'Trend data collection failed', error);
        }
    }

    /**
     * Start real-time monitoring
     */
    startRealTimeMonitoring() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }

        this.realTimeInterval = setInterval(() => {
            this.loadData(false); // Skip cache for real-time updates
        }, 10000); // Every 10 seconds
    }

    /**
     * Stop real-time monitoring
     */
    stopRealTimeMonitoring() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
        }
    }

    // Helper Methods for Data Retrieval (Mock implementations for now)

    async getErrorLogs() {
        // Mock implementation - would integrate with real error logging system
        return [
            {
                id: 'err_001',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                message: 'Cannot read property "length" of undefined',
                severity: 'high',
                type: 'TypeError',
                status: 'new',
                userId: 'user_123',
                sessionId: 'session_456'
            },
            {
                id: 'err_002',
                timestamp: new Date(Date.now() - 600000).toISOString(),
                message: 'Database connection timeout',
                severity: 'critical',
                type: 'DatabaseError',
                status: 'investigating',
                userId: null,
                sessionId: null
            }
        ];
    }

    async getErrorAnalytics() {
        return {
            totalErrors: 1247,
            criticalErrors: 23,
            errorRate: 2.3,
            lastErrorTime: new Date().toISOString(),
            frequency: {
                'Errors/hour': '52',
                'Peak hour': '14:00-15:00',
                'Avg resolution time': '45 minutes'
            },
            distribution: {
                'Client-side': '45%',
                'Server-side': '35%',
                'API errors': '20%'
            }
        };
    }

    async getErrorTrends() {
        return {
            'Error Rate': { direction: 'down', value: '-5.2%' },
            'Critical Errors': { direction: 'up', value: '+12%' },
            'Resolution Time': { direction: 'down', value: '-8 min' },
            'User Impact': { direction: 'stable', value: '2.1%' }
        };
    }

    // Utility Helper Methods

    getSelectedErrors() {
        // Mock implementation - would get actually selected errors from UI
        return [
            { id: 'err_001', severity: 'high' },
            { id: 'err_002', severity: 'critical' }
        ];
    }

    applyErrorFilters(errors) {
        return errors.filter(error => {
            if (this.errorFilters.severity !== 'all' && error.severity !== this.errorFilters.severity) {
                return false;
            }
            if (this.errorFilters.type !== 'all' && error.type !== this.errorFilters.type) {
                return false;
            }
            if (this.errorFilters.status !== 'all' && error.status !== this.errorFilters.status) {
                return false;
            }
            return true;
        });
    }

    groupErrorsBySeverity(errors) {
        return errors.reduce((groups, error) => {
            groups[error.severity] = (groups[error.severity] || 0) + 1;
            return groups;
        }, {});
    }

    updateFilteredErrorTable(errors) {
        // Update the error logs display with filtered results
        this.updateErrorLogsDisplay(errors);
    }

    getSeverityEmoji(severity) {
        switch (severity?.toLowerCase()) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⚡';
            case 'low': return 'ℹ️';
            default: return '❓';
        }
    }

    getSeverityColor(severity) {
        switch (severity?.toLowerCase()) {
            case 'critical': return '#d32f2f';
            case 'high': return '#ff9800';
            case 'medium': return '#1976d2';
            case 'low': return '#388e3c';
            default: return '#757575';
        }
    }

    getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'resolved': return '#388e3c';
            case 'investigating': return '#ff9800';
            case 'new': return '#d32f2f';
            default: return '#757575';
        }
    }

    getTrendIcon(direction) {
        switch (direction) {
            case 'up': return '📈';
            case 'down': return '📉';
            case 'stable': return '➡️';
            default: return '❓';
        }
    }

    getTrendColor(direction) {
        switch (direction) {
            case 'up': return '#d32f2f';
            case 'down': return '#388e3c';
            case 'stable': return '#757575';
            default: return '#757575';
        }
    }

    /**
     * Show error message
     */
    async showError(message) {
        await adminDebugError('ErrorsController', 'Error message', { message });

        const consoleDiv = document.getElementById('errorsConsole');
        if (consoleDiv) {
            consoleDiv.innerHTML = `❌ Error: ${message}\n\nTry refreshing the error data or check console for details.`;
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

        // Clear real-time interval
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }

        // Remove event listeners
        const eventButtons = [
            'errorSeverityFilterBtn', 'errorTypeFilterBtn', 'errorTimeframeFilterBtn', 'errorStatusFilterBtn',
            'errorDetailsBtn', 'errorTrendsBtn', 'errorResolutionBtn', 'errorAlertsBtn', 'errorReportBtn',
            'realTimeToggleBtn', 'errorClassificationBtn', 'errorImpactBtn', 'errorPerformanceBtn',
            'errorUserCorrelationBtn', 'errorWorkflowBtn', 'refreshErrorsBtn'
        ];

        eventButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.removeEventListener('click', this[this.getEventHandlerName(buttonId)]);
            }
        });

        // Clear data
        this.currentErrorData = {};
        this.errorMetrics.clear();
        this.errorCategories.clear();
        this.alertThresholds.clear();
        this.errorTrends.clear();
        this.isInitialized = false;

        await adminDebugLog('ErrorsController', 'Controller destroyed');
    }

    /**
     * Get event handler method name from button ID
     */
    getEventHandlerName(buttonId) {
        const handlerMap = {
            'errorSeverityFilterBtn': 'handleErrorFiltering',
            'errorTypeFilterBtn': 'handleErrorFiltering',
            'errorTimeframeFilterBtn': 'handleErrorFiltering',
            'errorStatusFilterBtn': 'handleErrorFiltering',
            'errorDetailsBtn': 'displayErrorDetails',
            'errorTrendsBtn': 'displayErrorTrends',
            'errorResolutionBtn': 'handleErrorResolution',
            'errorAlertsBtn': 'handleErrorAlerts',
            'errorReportBtn': 'generateErrorReport',
            'realTimeToggleBtn': 'handleRealTimeMonitoring',
            'errorClassificationBtn': 'handleErrorClassification',
            'errorImpactBtn': 'handleErrorImpactAnalysis',
            'errorPerformanceBtn': 'handleErrorPerformanceCorrelation',
            'errorUserCorrelationBtn': 'handleErrorUserCorrelation',
            'errorWorkflowBtn': 'handleErrorResolutionWorkflow',
            'refreshErrorsBtn': 'loadData'
        };
        return handlerMap[buttonId] || 'loadData';
    }

    // Additional mock helper methods for comprehensive functionality
    async getCurrentErrorMetrics() { return { totalErrors: 1247, criticalErrors: 23, errorRate: 2.3 }; }
    async getDetailedErrorAnalysis() { return { clientErrors: 560, serverErrors: 435, apiErrors: 252, databaseErrors: 89, authErrors: 34, networkErrors: 67 }; }
    async getErrorImpactAssessment() { return { affectedUsers: 1234, sessionInterruptions: 45, failedTransactions: 12, performanceDegradation: '15%' }; }
    async getErrorGeographicData() { return [{ region: 'North America', errorCount: 567, percentage: 45.5 }, { region: 'Europe', errorCount: 389, percentage: 31.2 }]; }
    async getErrorDeviceAnalysis() { return { desktop: 678, mobile: 432, tablet: 137, topBrowser: 'Chrome 91', compatibilityIssues: 23 }; }
    async getErrorTimeAnalysis() { return { peakHour: '14:00-15:00', weekendVsWeekday: '20% lower on weekends', seasonalTrends: 'Higher in Q4' }; }
    async getErrorFrequencyTrends() { return { hourlyAverage: 52, dailyTrend: 'Increasing', weeklyChange: '+12%', monthlyComparison: '+8%' }; }
    async getErrorSeverityTrends() { return { critical: 'Stable', high: 'Decreasing', medium: 'Increasing', low: 'Stable' }; }
    async getResolutionTimeMetrics() { return { averageTime: '45 minutes', fastestTime: '5 minutes', slowestTime: '4.2 hours', efficiency: '87%' }; }
    async getErrorPatterns() { return [{ type: 'Recurring', description: 'Database timeout during peak hours', frequency: 'Daily' }]; }
    async getErrorPredictions() { return { next24h: '15% increase expected', highRiskPeriods: '2:00-3:00 PM', preventiveActions: 'Scale database connections' }; }
    async getPerformanceCorrelation() { return { correlation: 'Strong (0.76)', highImpactPeriods: 'Peak traffic hours', recoveryTime: '12 minutes average' }; }
    async getAlertConfiguration() { return { criticalThreshold: '1 per 5 minutes', highRateAlert: '5% error rate', newTypeAlert: 'Enabled', performanceAlert: 'Enabled', geoAlert: 'Disabled' }; }
    async getNotificationChannels() { return [{ name: 'Email', enabled: true, description: 'admin@unitedwerise.org' }, { name: 'Slack', enabled: false, description: '#alerts channel' }]; }
    async getRecentAlerts() { return [{ timestamp: new Date().toISOString(), severity: 'high', message: 'Database connection timeout spike detected' }]; }
    async getAlertRules() { return [{ name: 'Critical Error Alert', active: true, condition: 'severity = critical AND count > 1 in 5min' }]; }
    async getAlertPerformance() { return { totalAlerts: 45, falsePositiveRate: '8%', avgResponseTime: '3.2 minutes', escalations: 3 }; }
    async getAutomatedClassification() { return [{ name: 'Database Errors', count: 89, percentage: 7.1, confidence: '95%', accuracy: '92%' }]; }
    async getManualReviewItems() { return [{ errorId: 'err_001', description: 'Uncategorized TypeError', suggestedCategory: 'Client-side JavaScript', confidence: 78 }]; }
    async getClassificationMetrics() { return { overallAccuracy: '94%', autoRate: '87%', manualRate: '13%', falsePositiveRate: '6%' }; }
    async getErrorCategories() { return [{ name: 'Client-side JavaScript', description: 'Browser-based JavaScript errors', rules: ['TypeError', 'ReferenceError'] }]; }
    async getUserExperienceImpact() { return { totalUsers: 1234, abandonmentRate: '12%', taskCompletion: '-8%', satisfactionScore: '3.2/5' }; }
    async getBusinessImpact() { return { revenueImpact: '$2,300 estimated', transactionFailures: 45, supportTickets: 12, reputationRisk: 'Low' }; }
    async getPerformanceImpact() { return { responseTime: '+15% slower', resourceUtil: '+23%', throughputReduction: '-12%', cascadingFailures: 3 }; }
    async getHighImpactErrors() { return [{ type: 'Database Timeout', description: 'Connection timeouts during peak hours', impactScore: 85, affectedUsers: 567 }]; }
    async getRecoveryAnalysis() { return { avgRecoveryTime: '12 minutes', fastestRecovery: '2 minutes', longestRecovery: '45 minutes', userReturnRate: '78%' }; }
    async getPerformanceCorrelationMetrics() { return { responseTimeCorr: '0.76 (strong)', memoryCorr: '0.45 (moderate)', cpuCorr: '0.23 (weak)', throughputCorr: '-0.68 (strong negative)' }; }
    async getPerformanceDegradationPatterns() { return [{ metric: 'Response Time', degradation: '+25%', errorTrigger: 'Database errors' }]; }
    async getPerformanceRecoveryPatterns() { return { avgTime: '8 minutes', baselineReturn: '95% in 15 min', errorFreeBoost: '+5% performance' }; }
    async getPerformanceHotspots() { return [{ component: 'Database Layer', errorRate: '15%', perfImpact: 'High' }]; }
    async getPerformancePredictions() { return { riskScore: 'Medium (65/100)', errorIncrease: '+20% if no action', recommendations: 'Scale database connections' }; }
    async getUserSegmentErrorAnalysis() { return [{ name: 'New Users', errorRate: '5.2%', userCount: 1234 }, { name: 'Power Users', errorRate: '1.8%', userCount: 567 }]; }
    async getUserJourneyImpact() { return [{ stage: 'Registration', errorCount: 45, dropoffRate: '12%' }, { stage: 'Checkout', errorCount: 23, dropoffRate: '8%' }]; }
    async getHighErrorUsers() { return [{ id: 'user_123', errorCount: 15, sessionCount: 3, errorPattern: 'Mobile browser issues', avgSeverity: 'Medium' }]; }
    async getUserAttributeCorrelation() { return { deviceType: 'Mobile 23% higher', browserVersion: 'IE11 45% higher', geoLocation: 'Rural areas 18% higher', userTenure: 'New users 34% higher', accountType: 'Free accounts 12% higher' }; }
    async getUserErrorRecovery() { return { successRate: '78%', avgTime: '5.2 minutes', userInitiated: '65%', supportAssisted: '35%' }; }
    async getWorkflowStatus() { return { newErrors: 45, investigating: 23, awaitingFix: 12, inTesting: 8, resolved: 156, closed: 234 }; }
    async getErrorAssignments() { return [{ assignee: 'John Doe', errorCount: 15, avgResolutionTime: '45 min' }, { assignee: 'Jane Smith', errorCount: 12, avgResolutionTime: '38 min' }]; }
    async getSLATracking() { return { criticalCompliance: '95%', highCompliance: '89%', mediumCompliance: '92%', overdueErrors: 5 }; }
    async getEscalationTracking() { return { autoEscalated: 12, manualEscalated: 5, executiveEscalated: 1, successRate: '87%' }; }
    async getWorkflowEfficiency() { return { avgResolutionTime: '42 minutes', firstTimeRate: '78%', bottlenecks: ['Approval delays', 'Testing queue'], improvementScore: '82/100' }; }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorsController;
} else {
    window.ErrorsController = ErrorsController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.errorsController = new ErrorsController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.errorsController = new ErrorsController();
            }
        }, 100);
    });
}