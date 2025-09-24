/**
 * AnalyticsController - Handles admin dashboard analytics section
 * Comprehensive analytics dashboard with charts and metrics
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 3.2 - Analytics Dashboard Implementation
 */

class AnalyticsController {
    constructor() {
        this.sectionId = 'analytics';
        this.isInitialized = false;
        this.analyticsData = {};
        this.charts = new Map();
        this.currentDateRange = '30d';
        this.activeFilters = {
            demographics: 'all',
            geography: 'all',
            contentType: 'all'
        };
        this.refreshInterval = null;
        this.isRealTimeMode = false;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayAnalyticsData = this.displayAnalyticsData.bind(this);
        this.handleDateRangeChange = this.handleDateRangeChange.bind(this);
        this.handleMetricFilter = this.handleMetricFilter.bind(this);
        this.displayUserEngagement = this.displayUserEngagement.bind(this);
        this.displayContentPerformance = this.displayContentPerformance.bind(this);
        this.displayGrowthMetrics = this.displayGrowthMetrics.bind(this);
        this.generateCustomReport = this.generateCustomReport.bind(this);
        this.exportReport = this.exportReport.bind(this);
        this.toggleRealTime = this.toggleRealTime.bind(this);
        this.setupCharts = this.setupCharts.bind(this);
        this.updateChart = this.updateChart.bind(this);
        this.destroyChart = this.destroyChart.bind(this);
    }

    /**
     * Initialize the analytics controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            await adminDebugLog('AnalyticsController', 'Starting initialization');

            // Initialize tabs manager if available
            if (window.adminTabsManager) {
                // Analytics-specific tab functionality will be handled by AdminTabsManager
                console.log('✅ AnalyticsController integrating with AdminTabsManager');
            }

            // Check for Chart.js dependency
            if (typeof Chart === 'undefined') {
                await this.loadChartJS();
            }

            // Override AdminState display methods for analytics
            if (window.AdminState) {
                window.AdminState.displayAnalyticsData = this.displayAnalyticsData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Initialize charts containers
            this.setupCharts();

            // Load initial data
            await this.loadData();

            this.isInitialized = true;

            await adminDebugLog('AnalyticsController', 'Controller initialized successfully', {
                dateRange: this.currentDateRange,
                realTimeMode: this.isRealTimeMode
            });
        } catch (error) {
            await adminDebugError('AnalyticsController', 'Initialization failed', error);
            throw error;
        }
    }

    /**
     * Load Chart.js if not available
     */
    async loadChartJS() {
        return new Promise((resolve, reject) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                adminDebugLog('AnalyticsController', 'Chart.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                adminDebugError('AnalyticsController', 'Failed to load Chart.js');
                reject(new Error('Failed to load Chart.js'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Set up event listeners for analytics section
     */
    async setupEventListeners() {
        try {
            // Date range selector
            const dateRangeSelect = document.getElementById('analyticsDateRange');
            if (dateRangeSelect) {
                dateRangeSelect.addEventListener('change', this.handleDateRangeChange);
            }

            // Custom date range inputs
            const customStartDate = document.getElementById('customStartDate');
            const customEndDate = document.getElementById('customEndDate');
            if (customStartDate && customEndDate) {
                customStartDate.addEventListener('change', this.handleDateRangeChange);
                customEndDate.addEventListener('change', this.handleDateRangeChange);
            }

            // Filter controls
            const demographicsFilter = document.getElementById('demographicsFilter');
            const geographyFilter = document.getElementById('geographyFilter');
            const contentTypeFilter = document.getElementById('contentTypeFilter');

            if (demographicsFilter) {
                demographicsFilter.addEventListener('change', (e) => {
                    this.activeFilters.demographics = e.target.value;
                    this.handleMetricFilter();
                });
            }

            if (geographyFilter) {
                geographyFilter.addEventListener('change', (e) => {
                    this.activeFilters.geography = e.target.value;
                    this.handleMetricFilter();
                });
            }

            if (contentTypeFilter) {
                contentTypeFilter.addEventListener('change', (e) => {
                    this.activeFilters.contentType = e.target.value;
                    this.handleMetricFilter();
                });
            }

            // Export buttons
            const exportCSVBtn = document.getElementById('exportCSV');
            const exportPDFBtn = document.getElementById('exportPDF');
            const generateReportBtn = document.getElementById('generateCustomReport');

            if (exportCSVBtn) {
                exportCSVBtn.addEventListener('click', () => this.exportReport('csv'));
            }

            if (exportPDFBtn) {
                exportPDFBtn.addEventListener('click', () => this.exportReport('pdf'));
            }

            if (generateReportBtn) {
                generateReportBtn.addEventListener('click', this.generateCustomReport);
            }

            // Real-time toggle
            const realTimeToggle = document.getElementById('realTimeToggle');
            if (realTimeToggle) {
                realTimeToggle.addEventListener('change', this.toggleRealTime);
            }

            // Refresh button
            const refreshBtn = document.getElementById('refreshAnalytics');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadData(false));
            }

            await adminDebugLog('AnalyticsController', 'Event listeners set up successfully');
        } catch (error) {
            await adminDebugError('AnalyticsController', 'Error setting up event listeners', error);
        }
    }

    /**
     * Set up chart containers and configurations
     */
    setupCharts() {
        try {
            // Initialize chart containers
            const chartConfigs = {
                userGrowthChart: {
                    type: 'line',
                    element: 'userGrowthChart',
                    title: 'User Growth Over Time'
                },
                engagementChart: {
                    type: 'bar',
                    element: 'engagementChart',
                    title: 'User Engagement Metrics'
                },
                contentPerformanceChart: {
                    type: 'doughnut',
                    element: 'contentPerformanceChart',
                    title: 'Content Performance Distribution'
                },
                geographicChart: {
                    type: 'bar',
                    element: 'geographicChart',
                    title: 'Geographic User Distribution'
                },
                retentionChart: {
                    type: 'line',
                    element: 'retentionChart',
                    title: 'User Retention Analysis'
                },
                deviceChart: {
                    type: 'pie',
                    element: 'deviceChart',
                    title: 'Device Usage Statistics'
                }
            };

            for (const [name, config] of Object.entries(chartConfigs)) {
                const canvas = document.getElementById(config.element);
                if (canvas) {
                    this.charts.set(name, {
                        config,
                        canvas,
                        chart: null
                    });
                }
            }

            adminDebugLog('AnalyticsController', 'Chart containers set up', {
                chartsConfigured: this.charts.size
            });
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error setting up charts', error);
        }
    }

    /**
     * Load analytics data
     */
    async loadData(useCache = true) {
        try {
            await adminDebugLog('AnalyticsController', 'Loading analytics data', {
                dateRange: this.currentDateRange,
                filters: this.activeFilters,
                useCache
            });

            if (window.AdminState) {
                const data = await window.AdminState.loadAnalyticsData({
                    dateRange: this.currentDateRange,
                    filters: this.activeFilters
                }, useCache);
                this.displayAnalyticsData(data);
                return data;
            } else {
                // Fallback to direct API call
                return await this.loadDataFallback();
            }
        } catch (error) {
            await adminDebugError('AnalyticsController', 'Error loading analytics data', error);
            this.displayError('Failed to load analytics data');
        }
    }

    /**
     * Fallback data loading method
     */
    async loadDataFallback() {
        try {
            const response = await window.AdminAPI.get('/admin/analytics', {
                dateRange: this.currentDateRange,
                ...this.activeFilters
            });

            if (response.ok && response.data.success) {
                this.analyticsData = response.data.data;
                this.displayAnalyticsData(this.analyticsData);
                return this.analyticsData;
            } else {
                throw new Error(response.data.message || 'Failed to load analytics data');
            }
        } catch (error) {
            await adminDebugError('AnalyticsController', 'Fallback data loading failed', error);
            throw error;
        }
    }

    /**
     * Display analytics data
     */
    displayAnalyticsData(data) {
        try {
            if (!data) {
                this.displayError('No analytics data available');
                return;
            }

            this.analyticsData = data;

            // Update core metrics cards
            this.updateMetricCards(data.coreMetrics || {});

            // Display user engagement analytics
            this.displayUserEngagement(data.userEngagement || {});

            // Display content performance
            this.displayContentPerformance(data.contentPerformance || {});

            // Display growth metrics
            this.displayGrowthMetrics(data.growthMetrics || {});

            // Update all charts
            this.updateAllCharts(data);

            // Update last refresh time
            this.updateLastRefreshTime();

            adminDebugLog('AnalyticsController', 'Analytics data displayed successfully', {
                dataKeys: Object.keys(data)
            });
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error displaying analytics data', error);
            this.displayError('Error displaying analytics data');
        }
    }

    /**
     * Update metric cards with core KPIs
     */
    updateMetricCards(metrics) {
        const metricElements = {
            totalUsers: document.getElementById('totalUsersMetric'),
            activeUsers: document.getElementById('activeUsersMetric'),
            newRegistrations: document.getElementById('newRegistrationsMetric'),
            totalPosts: document.getElementById('totalPostsMetric'),
            engagementRate: document.getElementById('engagementRateMetric'),
            retentionRate: document.getElementById('retentionRateMetric')
        };

        for (const [key, element] of Object.entries(metricElements)) {
            if (element && metrics[key] !== undefined) {
                element.textContent = this.formatMetricValue(metrics[key], key);

                // Add trend indicator if available
                const trendElement = element.nextElementSibling;
                if (trendElement && trendElement.classList.contains('metric-trend')) {
                    this.updateTrendIndicator(trendElement, metrics[`${key}Trend`]);
                }
            }
        }
    }

    /**
     * Format metric values for display
     */
    formatMetricValue(value, type) {
        if (typeof value !== 'number') return value;

        switch (type) {
            case 'engagementRate':
            case 'retentionRate':
                return `${(value * 100).toFixed(1)}%`;
            case 'totalUsers':
            case 'activeUsers':
            case 'newRegistrations':
            case 'totalPosts':
                return value.toLocaleString();
            default:
                return value.toString();
        }
    }

    /**
     * Update trend indicators
     */
    updateTrendIndicator(element, trend) {
        if (!trend) return;

        element.className = 'metric-trend';
        if (trend > 0) {
            element.className += ' positive';
            element.innerHTML = `↗ +${trend.toFixed(1)}%`;
        } else if (trend < 0) {
            element.className += ' negative';
            element.innerHTML = `↘ ${trend.toFixed(1)}%`;
        } else {
            element.className += ' neutral';
            element.innerHTML = '→ 0%';
        }
    }

    /**
     * Display user engagement analytics
     */
    displayUserEngagement(engagementData) {
        try {
            const container = document.getElementById('userEngagementContainer');
            if (!container) return;

            let html = '<div class="engagement-metrics">';

            // Daily active users
            if (engagementData.dailyActiveUsers) {
                html += `
                    <div class="metric-card">
                        <h4>Daily Active Users</h4>
                        <div class="metric-value">${engagementData.dailyActiveUsers.toLocaleString()}</div>
                        <div class="metric-change ${engagementData.dauTrend >= 0 ? 'positive' : 'negative'}">
                            ${engagementData.dauTrend >= 0 ? '+' : ''}${engagementData.dauTrend?.toFixed(1)}% vs. yesterday
                        </div>
                    </div>
                `;
            }

            // Session metrics
            if (engagementData.sessionMetrics) {
                html += `
                    <div class="metric-card">
                        <h4>Avg. Session Duration</h4>
                        <div class="metric-value">${this.formatDuration(engagementData.sessionMetrics.avgDuration)}</div>
                        <div class="metric-subtext">Sessions per user: ${engagementData.sessionMetrics.sessionsPerUser?.toFixed(1)}</div>
                    </div>
                `;
            }

            // Feature adoption
            if (engagementData.featureAdoption) {
                html += `
                    <div class="metric-card">
                        <h4>Feature Adoption</h4>
                        <div class="feature-list">
                `;

                for (const [feature, rate] of Object.entries(engagementData.featureAdoption)) {
                    html += `
                        <div class="feature-item">
                            <span class="feature-name">${feature}</span>
                            <span class="feature-rate">${(rate * 100).toFixed(1)}%</span>
                        </div>
                    `;
                }

                html += '</div></div>';
            }

            html += '</div>';
            container.innerHTML = html;

            adminDebugLog('AnalyticsController', 'User engagement data displayed');
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error displaying user engagement data', error);
        }
    }

    /**
     * Display content performance analytics
     */
    displayContentPerformance(contentData) {
        try {
            const container = document.getElementById('contentPerformanceContainer');
            if (!container) return;

            let html = '<div class="content-metrics">';

            // Top performing posts
            if (contentData.topPosts) {
                html += `
                    <div class="top-content-card">
                        <h4>Top Performing Posts</h4>
                        <div class="top-posts-list">
                `;

                contentData.topPosts.slice(0, 5).forEach((post, index) => {
                    html += `
                        <div class="top-post-item">
                            <div class="post-rank">#${index + 1}</div>
                            <div class="post-content">
                                <div class="post-text">${this.truncateText(post.content, 60)}</div>
                                <div class="post-stats">
                                    <span>❤️ ${post.likes}</span>
                                    <span>💬 ${post.comments}</span>
                                    <span>🔄 ${post.shares}</span>
                                </div>
                            </div>
                            <div class="post-engagement">${post.engagementRate?.toFixed(1)}%</div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            // Content type performance
            if (contentData.typePerformance) {
                html += `
                    <div class="content-type-card">
                        <h4>Content Type Performance</h4>
                        <div class="type-performance-list">
                `;

                for (const [type, metrics] of Object.entries(contentData.typePerformance)) {
                    html += `
                        <div class="type-item">
                            <div class="type-name">${type}</div>
                            <div class="type-metrics">
                                <div class="type-count">${metrics.count} posts</div>
                                <div class="type-engagement">${metrics.avgEngagement?.toFixed(1)}% avg engagement</div>
                            </div>
                        </div>
                    `;
                }

                html += '</div></div>';
            }

            // Trending hashtags
            if (contentData.trendingHashtags) {
                html += `
                    <div class="trending-hashtags-card">
                        <h4>Trending Hashtags</h4>
                        <div class="hashtag-cloud">
                `;

                contentData.trendingHashtags.forEach(hashtag => {
                    const size = Math.min(Math.max(hashtag.frequency / 100, 0.8), 2);
                    html += `
                        <span class="hashtag-item" style="font-size: ${size}em">
                            #${hashtag.tag} (${hashtag.frequency})
                        </span>
                    `;
                });

                html += '</div></div>';
            }

            html += '</div>';
            container.innerHTML = html;

            adminDebugLog('AnalyticsController', 'Content performance data displayed');
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error displaying content performance data', error);
        }
    }

    /**
     * Display growth metrics
     */
    displayGrowthMetrics(growthData) {
        try {
            const container = document.getElementById('growthMetricsContainer');
            if (!container) return;

            let html = '<div class="growth-metrics">';

            // User acquisition
            if (growthData.userAcquisition) {
                html += `
                    <div class="acquisition-card">
                        <h4>User Acquisition</h4>
                        <div class="acquisition-sources">
                `;

                for (const [source, data] of Object.entries(growthData.userAcquisition)) {
                    html += `
                        <div class="source-item">
                            <div class="source-name">${source}</div>
                            <div class="source-metrics">
                                <div class="source-users">${data.users} users</div>
                                <div class="source-percentage">${data.percentage?.toFixed(1)}%</div>
                                <div class="source-cost">${data.costPerAcquisition ? '$' + data.costPerAcquisition.toFixed(2) + ' CPA' : ''}</div>
                            </div>
                        </div>
                    `;
                }

                html += '</div></div>';
            }

            // Retention cohorts
            if (growthData.retentionCohorts) {
                html += `
                    <div class="retention-card">
                        <h4>User Retention Cohorts</h4>
                        <div class="cohort-table">
                            <div class="cohort-header">
                                <div class="cohort-period">Period</div>
                                <div class="cohort-week">Week 1</div>
                                <div class="cohort-week">Week 2</div>
                                <div class="cohort-week">Week 4</div>
                                <div class="cohort-week">Week 8</div>
                            </div>
                `;

                growthData.retentionCohorts.forEach(cohort => {
                    html += `
                        <div class="cohort-row">
                            <div class="cohort-period">${cohort.period}</div>
                            <div class="cohort-rate">${cohort.week1?.toFixed(1)}%</div>
                            <div class="cohort-rate">${cohort.week2?.toFixed(1)}%</div>
                            <div class="cohort-rate">${cohort.week4?.toFixed(1)}%</div>
                            <div class="cohort-rate">${cohort.week8?.toFixed(1)}%</div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            // Churn analysis
            if (growthData.churnAnalysis) {
                html += `
                    <div class="churn-card">
                        <h4>Churn Analysis</h4>
                        <div class="churn-metrics">
                            <div class="churn-rate">
                                <span class="churn-label">Monthly Churn Rate</span>
                                <span class="churn-value">${growthData.churnAnalysis.monthlyRate?.toFixed(1)}%</span>
                            </div>
                            <div class="churn-reasons">
                                <h5>Top Churn Reasons:</h5>
                `;

                if (growthData.churnAnalysis.reasons) {
                    growthData.churnAnalysis.reasons.forEach(reason => {
                        html += `
                            <div class="churn-reason">
                                <span class="reason-text">${reason.reason}</span>
                                <span class="reason-percentage">${reason.percentage?.toFixed(1)}%</span>
                            </div>
                        `;
                    });
                }

                html += '</div></div></div>';
            }

            html += '</div>';
            container.innerHTML = html;

            adminDebugLog('AnalyticsController', 'Growth metrics data displayed');
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error displaying growth metrics data', error);
        }
    }

    /**
     * Update all charts with new data
     */
    updateAllCharts(data) {
        try {
            // User growth chart
            if (data.userGrowth) {
                this.updateChart('userGrowthChart', {
                    type: 'line',
                    data: {
                        labels: data.userGrowth.labels,
                        datasets: [{
                            label: 'Total Users',
                            data: data.userGrowth.totalUsers,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.1
                        }, {
                            label: 'New Users',
                            data: data.userGrowth.newUsers,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'User Growth Over Time'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }

            // Engagement chart
            if (data.engagementMetrics) {
                this.updateChart('engagementChart', {
                    type: 'bar',
                    data: {
                        labels: ['Posts', 'Comments', 'Likes', 'Shares', 'Profile Views'],
                        datasets: [{
                            label: 'Daily Average',
                            data: [
                                data.engagementMetrics.dailyPosts,
                                data.engagementMetrics.dailyComments,
                                data.engagementMetrics.dailyLikes,
                                data.engagementMetrics.dailyShares,
                                data.engagementMetrics.dailyProfileViews
                            ],
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.6)',
                                'rgba(54, 162, 235, 0.6)',
                                'rgba(255, 205, 86, 0.6)',
                                'rgba(75, 192, 192, 0.6)',
                                'rgba(153, 102, 255, 0.6)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'User Engagement Metrics'
                            }
                        }
                    }
                });
            }

            // Content performance chart
            if (data.contentDistribution) {
                this.updateChart('contentPerformanceChart', {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(data.contentDistribution),
                        datasets: [{
                            data: Object.values(data.contentDistribution),
                            backgroundColor: [
                                '#FF6384',
                                '#36A2EB',
                                '#FFCE56',
                                '#4BC0C0',
                                '#9966FF',
                                '#FF9F40'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Content Type Distribution'
                            },
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }

            // Geographic distribution chart
            if (data.geographicData) {
                this.updateChart('geographicChart', {
                    type: 'bar',
                    data: {
                        labels: data.geographicData.labels,
                        datasets: [{
                            label: 'Users',
                            data: data.geographicData.userCounts,
                            backgroundColor: 'rgba(54, 162, 235, 0.6)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Geographic User Distribution'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }

            // Device usage chart
            if (data.deviceData) {
                this.updateChart('deviceChart', {
                    type: 'pie',
                    data: {
                        labels: ['Mobile', 'Desktop', 'Tablet'],
                        datasets: [{
                            data: [
                                data.deviceData.mobile,
                                data.deviceData.desktop,
                                data.deviceData.tablet
                            ],
                            backgroundColor: [
                                '#FF6384',
                                '#36A2EB',
                                '#FFCE56'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Device Usage Distribution'
                            }
                        }
                    }
                });
            }

            adminDebugLog('AnalyticsController', 'All charts updated successfully');
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error updating charts', error);
        }
    }

    /**
     * Update a specific chart
     */
    updateChart(chartName, config) {
        try {
            const chartInfo = this.charts.get(chartName);
            if (!chartInfo || !chartInfo.canvas) return;

            // Destroy existing chart
            if (chartInfo.chart) {
                chartInfo.chart.destroy();
            }

            // Create new chart
            const ctx = chartInfo.canvas.getContext('2d');
            chartInfo.chart = new Chart(ctx, config);

            adminDebugLog('AnalyticsController', `Chart ${chartName} updated successfully`);
        } catch (error) {
            adminDebugError('AnalyticsController', `Error updating chart ${chartName}`, error);
        }
    }

    /**
     * Handle date range changes
     */
    async handleDateRangeChange(event) {
        try {
            if (event.target.id === 'analyticsDateRange') {
                this.currentDateRange = event.target.value;
            } else {
                // Custom date range
                const startDate = document.getElementById('customStartDate')?.value;
                const endDate = document.getElementById('customEndDate')?.value;

                if (startDate && endDate) {
                    this.currentDateRange = `custom:${startDate}:${endDate}`;
                }
            }

            await adminDebugLog('AnalyticsController', 'Date range changed', {
                newRange: this.currentDateRange
            });

            // Reload data with new date range
            await this.loadData(false);
        } catch (error) {
            await adminDebugError('AnalyticsController', 'Error handling date range change', error);
        }
    }

    /**
     * Handle metric filter changes
     */
    async handleMetricFilter() {
        try {
            await adminDebugLog('AnalyticsController', 'Filters changed', {
                filters: this.activeFilters
            });

            // Reload data with new filters
            await this.loadData(false);
        } catch (error) {
            await adminDebugError('AnalyticsController', 'Error handling metric filter', error);
        }
    }

    /**
     * Generate custom report
     */
    async generateCustomReport() {
        try {
            await adminDebugLog('AnalyticsController', 'Generating custom report');

            // Get selected metrics
            const selectedMetrics = Array.from(document.querySelectorAll('.metric-selector:checked'))
                .map(checkbox => checkbox.value);

            if (selectedMetrics.length === 0) {
                alert('Please select at least one metric for the custom report.');
                return;
            }

            // Show loading state
            const generateBtn = document.getElementById('generateCustomReport');
            const originalText = generateBtn.textContent;
            generateBtn.textContent = 'Generating...';
            generateBtn.disabled = true;

            try {
                const response = await window.AdminAPI.post('/admin/analytics/custom-report', {
                    metrics: selectedMetrics,
                    dateRange: this.currentDateRange,
                    filters: this.activeFilters
                });

                if (response.ok && response.data.success) {
                    // Display custom report
                    this.displayCustomReport(response.data.data);
                } else {
                    throw new Error(response.data.message || 'Failed to generate custom report');
                }
            } finally {
                generateBtn.textContent = originalText;
                generateBtn.disabled = false;
            }
        } catch (error) {
            await adminDebugError('AnalyticsController', 'Error generating custom report', error);
            alert('Failed to generate custom report. Please try again.');
        }
    }

    /**
     * Display custom report
     */
    displayCustomReport(reportData) {
        try {
            const container = document.getElementById('customReportContainer');
            if (!container) return;

            let html = `
                <div class="custom-report">
                    <div class="report-header">
                        <h3>Custom Analytics Report</h3>
                        <div class="report-meta">
                            <span>Generated: ${new Date().toLocaleString()}</span>
                            <span>Period: ${this.formatDateRange(this.currentDateRange)}</span>
                        </div>
                    </div>
                    <div class="report-content">
            `;

            // Display each selected metric
            for (const [metric, data] of Object.entries(reportData)) {
                html += `
                    <div class="report-section">
                        <h4>${this.formatMetricName(metric)}</h4>
                        <div class="report-data">
                            ${this.formatReportData(data)}
                        </div>
                    </div>
                `;
            }

            html += `
                    </div>
                    <div class="report-actions">
                        <button onclick="window.analyticsController.exportReport('pdf')" class="btn btn-primary">
                            Export as PDF
                        </button>
                        <button onclick="window.analyticsController.exportReport('csv')" class="btn btn-secondary">
                            Export as CSV
                        </button>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            container.scrollIntoView({ behavior: 'smooth' });

            adminDebugLog('AnalyticsController', 'Custom report displayed successfully');
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error displaying custom report', error);
        }
    }

    /**
     * Export report in specified format
     */
    async exportReport(format) {
        try {
            await adminDebugLog('AnalyticsController', `Exporting report as ${format}`);

            const response = await window.AdminAPI.post('/admin/analytics/export', {
                format,
                dateRange: this.currentDateRange,
                filters: this.activeFilters,
                data: this.analyticsData
            });

            if (response.ok && response.data.success) {
                // Create download link
                const blob = new Blob([response.data.data], {
                    type: format === 'pdf' ? 'application/pdf' : 'text/csv'
                });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-report-${this.currentDateRange}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                adminDebugLog('AnalyticsController', `Report exported successfully as ${format}`);
            } else {
                throw new Error(response.data.message || 'Export failed');
            }
        } catch (error) {
            await adminDebugError('AnalyticsController', `Error exporting report as ${format}`, error);
            alert(`Failed to export report as ${format}. Please try again.`);
        }
    }

    /**
     * Toggle real-time mode
     */
    toggleRealTime(event) {
        try {
            this.isRealTimeMode = event.target.checked;

            if (this.isRealTimeMode) {
                // Start auto-refresh every 30 seconds
                this.refreshInterval = setInterval(() => {
                    this.loadData(false);
                }, 30000);

                adminDebugLog('AnalyticsController', 'Real-time mode enabled');
            } else {
                // Stop auto-refresh
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                }

                adminDebugLog('AnalyticsController', 'Real-time mode disabled');
            }
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error toggling real-time mode', error);
        }
    }

    /**
     * Display error message
     */
    displayError(message) {
        const container = document.getElementById('analyticsContent');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>Analytics Unavailable</h3>
                    <p>${message}</p>
                    <button onclick="window.analyticsController.loadData(false)" class="btn btn-primary">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Update last refresh time display
     */
    updateLastRefreshTime() {
        const element = document.getElementById('lastRefreshTime');
        if (element) {
            element.textContent = new Date().toLocaleTimeString();
        }
    }

    /**
     * Utility methods
     */
    formatDuration(seconds) {
        if (!seconds) return '0s';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    formatDateRange(range) {
        switch (range) {
            case '7d': return 'Last 7 days';
            case '30d': return 'Last 30 days';
            case '90d': return 'Last 90 days';
            case '1y': return 'Last year';
            default:
                if (range.startsWith('custom:')) {
                    const [, start, end] = range.split(':');
                    return `${start} to ${end}`;
                }
                return range;
        }
    }

    formatMetricName(metric) {
        return metric
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }

    formatReportData(data) {
        if (Array.isArray(data)) {
            return data.map(item => `<div class="data-item">${JSON.stringify(item)}</div>`).join('');
        } else if (typeof data === 'object') {
            return Object.entries(data)
                .map(([key, value]) => `<div class="data-pair"><strong>${key}:</strong> ${value}</div>`)
                .join('');
        } else {
            return `<div class="data-value">${data}</div>`;
        }
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Destroy all charts and cleanup
     */
    destroyChart(chartName) {
        const chartInfo = this.charts.get(chartName);
        if (chartInfo && chartInfo.chart) {
            chartInfo.chart.destroy();
            chartInfo.chart = null;
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        try {
            // Stop real-time refresh
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }

            // Destroy all charts
            for (const [name] of this.charts) {
                this.destroyChart(name);
            }
            this.charts.clear();

            // Clear data
            this.analyticsData = {};
            this.isInitialized = false;

            adminDebugLog('AnalyticsController', 'Controller destroyed successfully');
        } catch (error) {
            adminDebugError('AnalyticsController', 'Error during cleanup', error);
        }
    }
}

// Create global instance and expose
window.AnalyticsController = AnalyticsController;

// Auto-initialization for standalone usage
if (typeof window !== 'undefined' && !window.analyticsController) {
    window.analyticsController = new AnalyticsController();
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsController;
}