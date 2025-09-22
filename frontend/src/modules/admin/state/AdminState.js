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
        return cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
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
     */
    showError(message) {
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

            // Load dashboard stats
            const [dashboardResponse, healthResponse] = await Promise.all([
                window.AdminAPI.getDashboardStats(),
                window.AdminAPI.healthCheck()
            ]);

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

                document.getElementById('failedLogins').textContent = stats.failedLogins || '0';
                document.getElementById('suspiciousActivity').textContent = stats.highRiskEvents || '0';
                document.getElementById('blockedIPs').textContent = stats.lockedAccounts || '0';
                document.getElementById('securityScore').textContent = Math.max(100 - stats.avgRiskScore, 0);
            }

            if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json();
                securityData.events = eventsData.events;
                this.displaySecurityEvents(eventsData.events);
            } else {
                document.getElementById('securityEventsList').innerHTML =
                    '<p>Unable to load security events. Check admin permissions.</p>';
            }

            this.setCache(cacheKey, securityData);
            return securityData;

        } catch (error) {
            console.error('Error loading security data:', error);
            document.getElementById('securityEventsList').innerHTML =
                '<div class="error">Failed to load security data</div>';
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
            this.displayReportsData(data);

            this.setCache(cacheKey, data);
            return data;

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
    refreshAllData() {
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
        // To be implemented by ReportsController
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
    setupAutoRefresh(intervalMs = 300000) { // 5 minutes default
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