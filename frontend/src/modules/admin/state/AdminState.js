/**
 * AdminState Module - Extracted from admin-dashboard.html
 * Manages all admin dashboard data loading and state management
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Phase 2.3 of comprehensive modularization project
 */

class AdminState {
    constructor() {
        this.currentSection = 'overview';
        this.refreshInterval = null;
        this.isLoading = false;
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        // Bind methods to preserve context
        this.loadOverviewData = this.loadOverviewData.bind(this);
        this.loadSecurityData = this.loadSecurityData.bind(this);
        this.loadUsersData = this.loadUsersData.bind(this);
        this.loadCandidatesData = this.loadCandidatesData.bind(this);
        this.loadContentData = this.loadContentData.bind(this);
        this.refreshAllData = this.refreshAllData.bind(this);
    }

    /**
     * Cache management for API calls
     */
    isCacheValid(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;

        // Check for infinite cache (duration === Infinity)
        if (cached.duration === Infinity) return true;

        const duration = cached.duration || this.CACHE_DURATION;
        return (Date.now() - cached.timestamp) < duration;
    }

    setCache(key, data, duration = null) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            duration: duration !== null ? duration : this.CACHE_DURATION
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        return cached ? cached.data : null;
    }

    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Show error message in UI
     * Suppresses errors during wake-from-sleep recovery to prevent transient error popups
     */
    showError(message) {
        // Suppress errors during recovery mode (wake-from-sleep token refresh)
        if (window.adminAuth?.isRecovering) {
            console.warn('AdminState: Error suppressed during recovery:', message);
            return;
        }

        console.error('AdminState Error:', message);

        // Try to show in error element, fallback to alert
        const errorElement = document.getElementById('adminError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            alert(`Admin Error: ${message}`);
        }
    }

    /**
     * Load overview/dashboard data
     * Extracted from loadOverviewData function
     */
    async loadOverviewData(useCache = true) {
        const cacheKey = 'overview';

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayOverviewData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // Use cached global stats instead of fetching
            let dashboardResponse = this.getCache('dashboard_global');
            if (!dashboardResponse) {
                console.warn('Dashboard stats not in cache, fetching...');
                dashboardResponse = await window.AdminAPI.getDashboardStats();
            }

            const healthResponse = await window.AdminAPI.healthCheck();

            const data = dashboardResponse.data || dashboardResponse;

            // Update overview statistics
            if (data.overview) {
                document.getElementById('totalUsers').textContent = data.overview.totalUsers || '0';
                document.getElementById('activeUsers').textContent = data.overview.activeUsers || '0';
                document.getElementById('totalPosts').textContent = data.overview.totalPosts || '0';
                document.getElementById('pendingReports').textContent = data.overview.pendingReports || '0';
            }

            // Display performance metrics if available
            if (data.performance) {
                this.displayPerformanceMetrics(data.performance);
            }

            // Display health status
            if (healthResponse.healthy && healthResponse.data) {
                this.displayHealthStatus(healthResponse.data);
            }

            // Cache the results
            this.setCache(cacheKey, data);

            await adminDebugLog('AdminState', 'Overview data loaded successfully', {
                totalUsers: data.overview?.totalUsers,
                activeUsers: data.overview?.activeUsers
            });

            return data;

        } catch (error) {
            console.error('Error loading overview:', error);
            this.showError('Failed to load overview data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load security data
     * Extracted from loadSecurityData function
     */
    async loadSecurityData(useCache = true) {
        const cacheKey = 'security';

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displaySecurityData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            const [statsResponse, eventsResponse] = await Promise.all([
                window.AdminAPI.get(`${window.AdminAPI.BACKEND_URL}/api/admin/security/stats?timeframe=24h`),
                window.AdminAPI.get(`${window.AdminAPI.BACKEND_URL}/api/admin/security/events?limit=10&minRiskScore=50`)
            ]);

            let securityData = {};

            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                securityData.stats = stats;

                // Let SecurityController handle displaying the metrics instead of updating non-existent elements
                if (window.securityController && window.securityController.displaySecurityMetrics) {
                    await window.securityController.displaySecurityMetrics(stats);
                }
            }

            if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json();
                securityData.events = eventsData.events;
                this.displaySecurityEvents(eventsData.events);
            } else {
                // Let SecurityController handle displaying the error message instead of updating non-existent element
                if (window.securityController && window.securityController.displaySecurityEvents) {
                    await window.securityController.displaySecurityEvents([], 'Unable to load security events. Check admin permissions.');
                }
            }

            this.setCache(cacheKey, securityData);
            return securityData;

        } catch (error) {
            console.error('Error loading security data:', error);
            // Let SecurityController handle displaying the error message instead of updating non-existent element
            if (window.securityController && window.securityController.displaySecurityEvents) {
                await window.securityController.displaySecurityEvents([], 'Failed to load security data');
            }
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load users data
     * Extracted from loadUsersData function
     */
    async loadUsersData(params = {}, useCache = false) {
        const cacheKey = `users_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayUsersData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            const defaultParams = {
                limit: 50,
                page: 1,
                ...params
            };

            const data = await window.AdminAPI.getUsers(defaultParams);
            this.displayUsersData(data);

            // Cache results for pagination
            this.setCache(cacheKey, data);

            await adminDebugLog('AdminState', 'Users data loaded', {
                count: data.users?.length,
                total: data.total
            });

            return data;

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load candidates data
     * Extracted from loadCandidatesData function
     */
    async loadCandidatesData(params = {}, useCache = false) {
        const cacheKey = `candidates_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayCandidatesData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            const data = await window.AdminAPI.getCandidateProfiles(params);
            this.displayCandidatesData(data);

            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('Error loading candidates:', error);
            this.showError('Failed to load candidates data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load content data (posts, comments)
     * Extracted from loadContentData function
     */
    async loadContentData(params = {}, useCache = false) {
        const cacheKey = `content_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayContentData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            const [postsData, commentsData] = await Promise.all([
                window.AdminAPI.getPosts(params),
                window.AdminAPI.getComments(params)
            ]);

            const contentData = {
                posts: postsData,
                comments: commentsData
            };

            this.displayContentData(contentData);
            this.setCache(cacheKey, contentData);

            return contentData;

        } catch (error) {
            console.error('Error loading content:', error);
            this.showError('Failed to load content data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load reports data
     */
    async loadReportsData(params = {}, useCache = false) {
        const cacheKey = `reports_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayReportsData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            const data = await window.AdminAPI.getReports(params);

            // Transform API response to match frontend expectations
            const transformedData = {
                reports: data.reports || [],
                queue: data.reports || [],
                analytics: {
                    totalReports: data.pagination?.total || 0,
                    pendingReports: data.reports?.filter(r => r.status === 'PENDING')?.length || 0,
                    resolvedReports: data.reports?.filter(r => r.status === 'RESOLVED')?.length || 0,
                    avgResolutionTime: 0, // Could be calculated if timestamps are available
                    reportsTrend: 0 // Could be calculated with historical data
                }
            };

            this.displayReportsData(transformedData);

            this.setCache(cacheKey, transformedData);
            return transformedData;

        } catch (error) {
            console.error('Error loading reports:', error);
            this.showError('Failed to load reports data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Refresh all data for current section
     * Extracted from refreshAllData function
     */
    async refreshAllData() {
        // Clear cache for fresh data
        this.clearCache();

        const refreshIcon = document.getElementById('refreshIcon');
        if (refreshIcon) {
            refreshIcon.classList.add('refresh-indicator');
        }

        // Get current active section
        const activeSection = document.querySelector('.dashboard-section.active');
        const sectionId = activeSection ? activeSection.id : this.currentSection;

        // Reload data for current section
        this.loadSectionData(sectionId);

        // Remove refresh animation after 1 second
        setTimeout(() => {
            if (refreshIcon) {
                refreshIcon.classList.remove('refresh-indicator');
            }
        }, 1000);

        await adminDebugLog('AdminState', `Refreshed data for section: ${sectionId}`);
    }

    /**
     * Load data for specific section
     */
    async loadSectionData(sectionId) {
        this.currentSection = sectionId;

        try {
            switch(sectionId) {
                case 'overview':
                    await this.loadOverviewData(false); // Force fresh data
                    break;
                case 'security':
                    await this.loadSecurityData(false);
                    break;
                case 'users':
                    await this.loadUsersData({}, false);
                    break;
                case 'candidates':
                    await this.loadCandidatesData({}, false);
                    break;
                case 'content':
                    await this.loadContentData({}, false);
                    break;
                case 'reports':
                    await this.loadReportsData({}, false);
                    break;
                case 'civic-engagement':
                    // CivicEngagementController handles its own data loading via init()
                    break;
                case 'payments':
                    await this.loadPaymentsData({}, false);
                    break;
                default:
                    console.warn(`Unknown section: ${sectionId}`);
            }
        } catch (error) {
            console.error(`Error loading section ${sectionId}:`, error);
            this.showError(`Failed to load ${sectionId} data`);
        }
    }

    /**
     * Display methods for different data types
     * These will be implemented by section controllers
     */
    displayOverviewData(data) {
        // To be implemented by OverviewController
        console.log('Displaying overview data:', data);
    }

    displaySecurityData(data) {
        // To be implemented by SecurityController
        console.log('Displaying security data:', data);
    }

    displayUsersData(data) {
        // To be implemented by UsersController
        console.log('Displaying users data:', data);
    }

    displayCandidatesData(data) {
        // To be implemented by CandidatesController
        console.log('Displaying candidates data:', data);
    }

    displayContentData(data) {
        // To be implemented by ContentController
        console.log('Displaying content data:', data);
    }

    displayReportsData(data) {
        // Transform API response to match frontend expectations
        if (data && typeof data === 'object') {
            const transformedData = {
                reports: data.reports || [],
                queue: data.reports || [],
                analytics: {
                    totalReports: data.pagination?.total || 0,
                    pendingReports: data.reports?.filter(r => r.status === 'PENDING')?.length || 0,
                    resolvedReports: data.reports?.filter(r => r.status === 'RESOLVED')?.length || 0,
                    avgResolutionTime: 0, // Could be calculated if timestamps are available
                    reportsTrend: 0 // Could be calculated with historical data
                }
            };

            // Call ReportsController display method if available
            if (window.reportsController && window.reportsController.displayReportsData) {
                window.reportsController.displayReportsData(transformedData);
            }
        }
        console.log('Displaying reports data:', data);
    }

    displayPerformanceMetrics(metrics) {
        // To be implemented by OverviewController
        console.log('Displaying performance metrics:', metrics);
    }

    displayHealthStatus(health) {
        // To be implemented by OverviewController
        console.log('Displaying health status:', health);
    }

    displaySecurityEvents(events) {
        // To be implemented by SecurityController
        console.log('Displaying security events:', events);
    }

    /**
     * Set up auto-refresh for dashboard
     */
    async setupAutoRefresh(intervalMs = 300000) { // 5 minutes default
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.refreshAllData();
            }
        }, intervalMs);

        await adminDebugLog('AdminState', `Auto-refresh setup: ${intervalMs}ms interval`);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Get current loading state
     */
    getLoadingState() {
        return this.isLoading;
    }

    /**
     * Get current section
     */
    getCurrentSection() {
        return this.currentSection;
    }

    /**
     * Load MOTD data
     */
    async loadMOTDData(params = {}, useCache = false) {
        const cacheKey = `motd_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayMOTDData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // getMOTDSettings now returns mock data directly, no error handling needed
            const data = await window.AdminAPI.getMOTDSettings();

            this.displayMOTDData(data);
            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('Error loading MOTD:', error);
            // Don't throw - return default data instead
            const defaultData = {
                id: 'error',
                title: 'MOTD Service Unavailable',
                content: 'Message of the day service is currently unavailable.',
                isActive: false,
                priority: 'low'
            };
            this.displayMOTDData(defaultData);
            return defaultData;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load deployment data
     */
    async loadDeploymentData(params = {}, useCache = false) {
        const cacheKey = `deployment_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayDeploymentData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // Use cached global stats
            const dashboardData = this.getCache('dashboard_global');

            const healthData = await window.AdminAPI.healthCheck();

            const deploymentData = {
                health: healthData,
                dashboard: dashboardData,
                timestamp: new Date().toISOString()
            };

            this.displayDeploymentData(deploymentData);
            this.setCache(cacheKey, deploymentData);
            return deploymentData;

        } catch (error) {
            console.error('Error loading deployment data:', error);
            this.showError('Failed to load deployment data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load system data
     */
    async loadSystemData(params = {}, useCache = false) {
        const cacheKey = `system_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displaySystemData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // Use existing endpoints to gather system information
            const healthData = await window.AdminAPI.healthCheck();

            // getAuditLogs now returns mock data directly, no error handling needed
            const auditLogs = await window.AdminAPI.getAuditLogs(params);

            const systemData = {
                health: healthData,
                auditLogs: auditLogs,
                timestamp: new Date().toISOString()
            };

            this.displaySystemData(systemData);
            this.setCache(cacheKey, systemData);
            return systemData;

        } catch (error) {
            console.error('Error loading system data:', error);
            // Don't throw - return default data instead
            const defaultData = {
                health: { healthy: false, error: 'System data unavailable' },
                auditLogs: { logs: [], total: 0 },
                timestamp: new Date().toISOString()
            };
            this.displaySystemData(defaultData);
            return defaultData;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load external candidates data
     */
    async loadExternalCandidatesData(params = {}, useCache = false) {
        const cacheKey = `external_candidates_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayExternalCandidatesData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // For now, return empty data structure - this can be expanded later
            const data = {
                externalCandidates: [],
                total: 0,
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    pages: 0
                }
            };

            this.displayExternalCandidatesData(data);
            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('Error loading external candidates:', error);
            this.showError('Failed to load external candidates data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load analytics data from backend
     */
    async loadAnalyticsData(params = {}, useCache = false) {
        const cacheKey = `analytics_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayAnalyticsData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // Call the analytics API endpoint
            const response = await window.AdminAPI.getAnalytics(params);

            // Transform backend response to frontend data structure
            const data = {
                period: response.period || '30 days',
                summary: response.summary || {},
                dailyActivity: response.dailyActivity || [],
                geographicDistribution: response.geographicDistribution || [],
                reputationEventBreakdown: response.reputationEventBreakdown || [],
                reportBreakdown: response.reportBreakdown || [],
                flagDistribution: response.flagDistribution || [],
                generatedAt: response.generatedAt || new Date().toISOString(),
                // Provide structured access to summary metrics
                coreMetrics: {
                    totalUsers: response.summary?.userGrowth?.totalUsers || 0,
                    activeUsers: response.summary?.userGrowth?.activeUsers24h || 0,
                    newUsers: response.summary?.userGrowth?.newUsers || 0,
                    verifiedUsers: response.summary?.userGrowth?.verifiedUsers || 0
                },
                userEngagement: {
                    postsCreated: response.summary?.engagement?.postsCreated || 0,
                    commentsCreated: response.summary?.engagement?.commentsCreated || 0,
                    likesGiven: response.summary?.engagement?.likesGiven || 0,
                    messagesSent: response.summary?.engagement?.messagesSent || 0,
                    engagementRate: response.summary?.engagement?.engagementRate || '0'
                },
                contentPerformance: {
                    politicalPosts: response.summary?.content?.politicalPosts || 0,
                    photosUploaded: response.summary?.content?.photosUploaded || 0,
                    reportsFiled: response.summary?.content?.reportsFiled || 0
                },
                civicMetrics: {
                    petitionsCreated: response.summary?.civicEngagement?.petitionsCreated || 0,
                    petitionSignatures: response.summary?.civicEngagement?.petitionSignatures || 0,
                    eventsCreated: response.summary?.civicEngagement?.eventsCreated || 0,
                    eventRSVPs: response.summary?.civicEngagement?.eventRSVPs || 0
                }
            };

            this.displayAnalyticsData(data);
            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load AI insights data from backend
     */
    async loadAIInsightsData(params = {}, useCache = false) {
        const cacheKey = `ai_insights_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayAIInsightsData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // Call the AI insights API endpoint (fetches metrics, analysis, suggestions in parallel)
            const response = await window.AdminAPI.getAIInsights();

            // Transform response to expected data structure
            const data = {
                // Metrics from RiseAI usage
                metrics: response.metrics || {},
                riseAI: response.metrics?.riseAI || {
                    totalInteractions: 0,
                    last30Days: 0,
                    avgDailyUsage: 0
                },
                contentModeration: response.metrics?.contentModeration || {
                    flagsLast30Days: 0,
                    aiEnabled: false
                },
                // Analysis insights
                analysis: response.analysis || {},
                insights: response.analysis?.insights || [],
                trends: response.analysis?.trends || [],
                // Suggestions from user feedback
                suggestions: response.suggestions?.suggestions || [],
                categoryBreakdown: response.suggestions?.categoryBreakdown || {},
                // Recommendations extracted from analysis
                recommendations: response.analysis?.recommendations || [],
                // Status info
                status: response.metrics?.status || {
                    aiServicesOnline: false,
                    lastAnalysisRun: null
                }
            };

            this.displayAIInsightsData(data);
            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('Error loading AI insights:', error);
            this.showError('Failed to load AI insights data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load errors data from backend
     */
    async loadErrorsData(params = {}, useCache = false) {
        const cacheKey = `errors_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayErrorsData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // Call the actual backend API
            const response = await window.AdminAPI.getErrors(params);

            // Transform response to match what ErrorsController expects
            const data = {
                errors: response.errors || [],
                stats: response.stats || {},
                timeframe: response.timeframe || '24h',
                note: response.note || '',
                total: response.errors?.length || 0,
                pagination: {
                    page: 1,
                    limit: 50,
                    total: response.errors?.length || 0,
                    pages: Math.ceil((response.errors?.length || 0) / 50)
                }
            };

            this.displayErrorsData(data);
            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('Error loading errors:', error);
            this.showError('Failed to load errors data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load payments data from backend
     * @param {Object} params - Query parameters (page, limit, status, type, search)
     * @param {boolean} useCache - Whether to use cached data
     * @returns {Promise<Object>} Payments data with pagination and summary
     */
    async loadPaymentsData(params = {}, useCache = false) {
        const cacheKey = `payments_${JSON.stringify(params)}`;

        if (useCache && this.isCacheValid(cacheKey)) {
            const cached = this.getCache(cacheKey);
            this.displayPaymentsData(cached);
            return cached;
        }

        try {
            this.isLoading = true;

            // Call the payments API endpoint
            const response = await window.AdminAPI.getPayments(params);

            const data = {
                payments: response.payments || [],
                pagination: response.pagination || {
                    page: 1,
                    limit: 50,
                    total: 0,
                    pages: 1
                },
                summary: response.summary || {
                    totalCompletedCents: 0,
                    totalCompletedFormatted: '$0.00',
                    byStatus: {}
                }
            };

            this.displayPaymentsData(data);
            this.setCache(cacheKey, data);

            await adminDebugLog('AdminState', 'Payments data loaded', {
                count: data.payments.length,
                total: data.pagination.total
            });

            return data;

        } catch (error) {
            console.error('Error loading payments:', error);
            this.showError('Failed to load payments data');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Display payments data
     * @param {Object} data - Payments data to display
     */
    displayPaymentsData(data) {
        // PaymentsController handles its own display via init() override
        if (window.paymentsController && window.paymentsController.displayPaymentsData) {
            window.paymentsController.displayPaymentsData(data);
        }
        console.log('Displaying payments data:', data);
    }

    /**
     * Display methods for new data types
     */
    displayMOTDData(data) {
        console.log('Displaying MOTD data:', data);
    }

    displayDeploymentData(data) {
        console.log('Displaying deployment data:', data);
    }

    displaySystemData(data) {
        console.log('Displaying system data:', data);
    }

    displayExternalCandidatesData(data) {
        console.log('Displaying external candidates data:', data);
    }

    displayAnalyticsData(data) {
        console.log('Displaying analytics data:', data);
    }

    displayAIInsightsData(data) {
        console.log('Displaying AI insights data:', data);
    }

    displayErrorsData(data) {
        console.log('Displaying errors data:', data);
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        this.stopAutoRefresh();
        this.clearCache();
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminState;
} else {
    window.AdminState = new AdminState(); // Singleton pattern for global access
}

// Initialize admin debugging
if (typeof adminDebugLog === 'undefined') {
    console.warn('AdminState: adminDebugLog not available - some debug features disabled');
}