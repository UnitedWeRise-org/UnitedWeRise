/**
 * ExternalCandidatesController - Handles external candidate tracking and monitoring
 * FINAL controller for UnitedWeRise admin dashboard 100% modularization completion
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 4.4 - External candidate data integration and monitoring system
 */

class ExternalCandidatesController {
    constructor() {
        this.sectionId = 'external-candidates';
        this.isInitialized = false;
        this.currentTab = 'vote-tracking';
        this.currentExternalData = {
            voteTracking: [],
            campaignFinance: [],
            newsTracking: [],
            pollingData: [],
            dataSourceHealth: []
        };
        this.currentAnalytics = {};
        this.externalFilters = {
            office: 'all',
            state: 'all',
            party: 'all',
            dataSource: 'all',
            status: 'all',
            dateRange: '30'
        };
        this.refreshInterval = null;
        this.selectedItems = new Set();
        this.syncStatus = new Map();
        this.realTimeUpdates = new Map();

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayExternalCandidatesData = this.displayExternalCandidatesData.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
        this.handleDataSourceSync = this.handleDataSourceSync.bind(this);
        this.handleVoteTracking = this.handleVoteTracking.bind(this);
        this.handleCampaignFinanceSync = this.handleCampaignFinanceSync.bind(this);
        this.handleNewsTracking = this.handleNewsTracking.bind(this);
        this.displayPollingData = this.displayPollingData.bind(this);
        this.generateExternalReport = this.generateExternalReport.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
    }

    /**
     * Initialize the external candidates controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for external candidates
            if (window.AdminState) {
                window.AdminState.displayExternalCandidatesData = this.displayExternalCandidatesData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Initialize multi-tab system
            await this.setupTabSystem();

            // Load initial data
            await this.loadData();

            // Set up automatic refresh and real-time monitoring
            this.setupAutoRefresh();
            this.setupRealTimeMonitoring();

            this.isInitialized = true;

            await adminDebugLog('ExternalCandidatesController', 'Controller initialized successfully with external data monitoring', {
                totalTabs: 5,
                currentTab: this.currentTab,
                dataSourcesConfigured: this.syncStatus.size
            });
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Initialization failed', error);
            throw error;
        }
    }

    /**
     * Set up multi-tab system for external candidates management
     */
    async setupTabSystem() {
        const tabContainer = document.getElementById('externalCandidatesTabContainer');
        if (!tabContainer) {
            await adminDebugError('ExternalCandidatesController', 'Tab container not found');
            return;
        }

        // Set up tab navigation
        const tabButtons = tabContainer.querySelectorAll('.tab-button[data-tab]');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                this.handleTabSwitch(tabId);
            });
        });

        // Initialize first tab
        await this.handleTabSwitch(this.currentTab);

        await adminDebugLog('ExternalCandidatesController', 'Multi-tab system initialized', {
            totalTabs: tabButtons.length,
            currentTab: this.currentTab
        });
    }

    /**
     * Set up event listeners for external candidates section
     */
    async setupEventListeners() {
        // Set up event delegation for all external candidates actions
        this.setupEventDelegation();
        // Refresh button
        const refreshBtn = document.getElementById('refreshExternalCandidatesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefresh);
        }

        // Filter controls
        const officeFilter = document.getElementById('externalOfficeFilter');
        if (officeFilter) {
            officeFilter.addEventListener('change', () => {
                this.externalFilters.office = officeFilter.value;
                this.handleFilterChange();
            });
        }

        const stateFilter = document.getElementById('externalStateFilter');
        if (stateFilter) {
            stateFilter.addEventListener('change', () => {
                this.externalFilters.state = stateFilter.value;
                this.handleFilterChange();
            });
        }

        const partyFilter = document.getElementById('externalPartyFilter');
        if (partyFilter) {
            partyFilter.addEventListener('change', () => {
                this.externalFilters.party = partyFilter.value;
                this.handleFilterChange();
            });
        }

        const dataSourceFilter = document.getElementById('externalDataSourceFilter');
        if (dataSourceFilter) {
            dataSourceFilter.addEventListener('change', () => {
                this.externalFilters.dataSource = dataSourceFilter.value;
                this.handleFilterChange();
            });
        }

        // Data sync controls
        const syncAllBtn = document.getElementById('syncAllDataSourcesBtn');
        if (syncAllBtn) {
            syncAllBtn.addEventListener('click', () => {
                this.handleDataSourceSync('all');
            });
        }

        const syncFECBtn = document.getElementById('syncFECBtn');
        if (syncFECBtn) {
            syncFECBtn.addEventListener('click', () => {
                this.handleDataSourceSync('fec');
            });
        }

        const syncNewsBtn = document.getElementById('syncNewsBtn');
        if (syncNewsBtn) {
            syncNewsBtn.addEventListener('click', () => {
                this.handleDataSourceSync('news');
            });
        }

        const syncPollingBtn = document.getElementById('syncPollingBtn');
        if (syncPollingBtn) {
            syncPollingBtn.addEventListener('click', () => {
                this.handleDataSourceSync('polling');
            });
        }

        // Real-time toggle
        const realTimeToggle = document.getElementById('realTimeUpdatesToggle');
        if (realTimeToggle) {
            realTimeToggle.addEventListener('change', (e) => {
                this.toggleRealTimeUpdates(e.target.checked);
            });
        }

        // Search functionality
        const searchInput = document.getElementById('externalCandidatesSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(async () => {
                    await this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // Export data button
        const exportBtn = document.getElementById('exportExternalDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.generateExternalReport();
            });
        }

        // Data validation button
        const validateBtn = document.getElementById('validateExternalDataBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                this.validateExternalData();
            });
        }

        await adminDebugLog('ExternalCandidatesController', 'Event listeners set up successfully');
    }

    /**
     * Set up event delegation for external candidates actions
     */
    setupEventDelegation() {
        // Vote tracking actions
        const voteTrackingContainer = document.getElementById('voteTrackingTable');
        if (voteTrackingContainer) {
            voteTrackingContainer.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    const action = button.dataset.action;
                    const voteId = button.dataset.voteId;
                    const url = button.dataset.url;

                    switch (action) {
                        case 'view-vote-details':
                            this.viewVoteDetails(voteId);
                            break;
                        case 'verify-vote-count':
                            this.verifyVoteCount(voteId);
                            break;
                        default:
                            console.warn('Unknown vote tracking action:', action);
                    }
                }
            });
        }

        // Campaign finance actions
        const campaignFinanceContainer = document.getElementById('campaignFinanceTable');
        if (campaignFinanceContainer) {
            campaignFinanceContainer.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    const action = button.dataset.action;
                    const financeId = button.dataset.financeId;

                    switch (action) {
                        case 'view-finance-details':
                            this.viewFinanceDetails(financeId);
                            break;
                        case 'check-fec-compliance':
                            this.checkFECCompliance(financeId);
                            break;
                        default:
                            console.warn('Unknown campaign finance action:', action);
                    }
                }
            });
        }

        // News tracking actions
        const newsTrackingContainer = document.getElementById('newsTrackingTable');
        if (newsTrackingContainer) {
            newsTrackingContainer.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    const action = button.dataset.action;
                    const newsId = button.dataset.newsId;
                    const url = button.dataset.url;

                    switch (action) {
                        case 'view-news-article':
                            if (url) {
                                window.open(url, '_blank');
                            }
                            break;
                        case 'analyze-news-item':
                            this.analyzeNewsItem(newsId);
                            break;
                        default:
                            console.warn('Unknown news tracking action:', action);
                    }
                }
            });
        }

        // Polling data actions
        const pollingDataContainer = document.getElementById('pollingDataTable');
        if (pollingDataContainer) {
            pollingDataContainer.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    const action = button.dataset.action;
                    const pollId = button.dataset.pollId;

                    switch (action) {
                        case 'view-poll-details':
                            this.viewPollDetails(pollId);
                            break;
                        case 'analyze-poll-trend':
                            this.analyzePollTrend(pollId);
                            break;
                        default:
                            console.warn('Unknown polling data action:', action);
                    }
                }
            });
        }
    }

    /**
     * Set up automatic refresh for external data
     */
    setupAutoRefresh() {
        // Refresh external data every 5 minutes (external sources need less frequent polling)
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadData(false); // Force fresh data
                await this.updateDataSourceHealth();
            } catch (error) {
                await adminDebugError('ExternalCandidatesController', 'Auto-refresh failed', error);
            }
        }, 300000);
    }

    /**
     * Set up real-time monitoring for critical external data
     */
    setupRealTimeMonitoring() {
        // Monitor vote counts in real-time during election periods
        this.realTimeUpdates.set('vote-tracking', setInterval(async () => {
            if (this.currentTab === 'vote-tracking') {
                try {
                    await this.updateVoteTrackingRealTime();
                } catch (error) {
                    await adminDebugError('ExternalCandidatesController', 'Real-time vote tracking update failed', error);
                }
            }
        }, 30000)); // Every 30 seconds

        // Monitor campaign finance changes
        this.realTimeUpdates.set('campaign-finance', setInterval(async () => {
            if (this.currentTab === 'campaign-finance') {
                try {
                    await this.updateCampaignFinanceRealTime();
                } catch (error) {
                    await adminDebugError('ExternalCandidatesController', 'Real-time campaign finance update failed', error);
                }
            }
        }, 120000)); // Every 2 minutes

        // Monitor breaking news
        this.realTimeUpdates.set('news-tracking', setInterval(async () => {
            if (this.currentTab === 'news-tracking') {
                try {
                    await this.updateNewsTrackingRealTime();
                } catch (error) {
                    await adminDebugError('ExternalCandidatesController', 'Real-time news tracking update failed', error);
                }
            }
        }, 60000)); // Every minute
    }

    /**
     * Load external candidates data for all tabs
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                await window.AdminState.loadExternalCandidatesData(this.externalFilters, useCache);
            } else {
                // Fallback to direct API calls
                await this.loadDataFallback();
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to load external candidates data', error);
            this.showError('Failed to load external candidates data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            const [voteTracking, campaignFinance, newsTracking, pollingData, analytics, dataSourceHealth] = await Promise.all([
                window.AdminAPI.getVoteTrackingData(this.externalFilters),
                window.AdminAPI.getCampaignFinanceData(this.externalFilters),
                window.AdminAPI.getNewsTrackingData(this.externalFilters),
                window.AdminAPI.getPollingData(this.externalFilters),
                window.AdminAPI.getExternalCandidatesAnalytics(this.externalFilters.dateRange),
                window.AdminAPI.getDataSourceHealth()
            ]);

            this.displayExternalCandidatesData({
                voteTracking: voteTracking.data || [],
                campaignFinance: campaignFinance.data || [],
                newsTracking: newsTracking.data || [],
                pollingData: pollingData.data || [],
                analytics: analytics.data || {},
                dataSourceHealth: dataSourceHealth.data || []
            });

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Fallback external data loading failed', error);
            throw error;
        }
    }

    /**
     * Handle manual refresh
     */
    async handleRefresh() {
        try {
            const refreshBtn = document.getElementById('refreshExternalCandidatesBtn');
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Syncing External Data...';
            }

            await this.loadData(false); // Force fresh data
            await this.updateDataSourceHealth();

            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh External Data';
            }

            await adminDebugLog('ExternalCandidatesController', 'Manual refresh completed');
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Manual refresh failed', error);
        }
    }

    /**
     * Display external candidates data in the UI
     */
    async displayExternalCandidatesData(data) {
        try {
            if (!data) {
                await adminDebugWarn('ExternalCandidatesController', 'No external candidates data available');
                return;
            }

            // Store current data
            this.currentExternalData = {
                voteTracking: data.voteTracking || [],
                campaignFinance: data.campaignFinance || [],
                newsTracking: data.newsTracking || [],
                pollingData: data.pollingData || [],
                dataSourceHealth: data.dataSourceHealth || []
            };
            this.currentAnalytics = data.analytics || {};

            // Display analytics dashboard first
            await this.displayExternalAnalytics(data.analytics);

            // Display data source health status
            await this.displayDataSourceHealth(data.dataSourceHealth);

            // Display current tab content
            await this.displayCurrentTab();

            // Update last refresh time
            this.updateLastRefreshTime();

            await adminDebugLog('ExternalCandidatesController', 'External candidates data displayed', {
                voteTrackingCount: data.voteTracking?.length || 0,
                campaignFinanceCount: data.campaignFinance?.length || 0,
                newsTrackingCount: data.newsTracking?.length || 0,
                pollingDataCount: data.pollingData?.length || 0,
                currentTab: this.currentTab
            });

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to display external candidates data', error);
        }
    }

    /**
     * Display external candidates analytics dashboard
     */
    async displayExternalAnalytics(analytics) {
        try {
            const analyticsContainer = document.getElementById('externalCandidatesAnalytics');
            if (!analyticsContainer) {
                await adminDebugWarn('ExternalCandidatesController', 'External candidates analytics container not found');
                return;
            }

            const totalCandidatesTracked = analytics.totalCandidatesTracked || 0;
            const activeElections = analytics.activeElections || 0;
            const dataSourcesActive = analytics.dataSourcesActive || 0;
            const totalVotesTracked = analytics.totalVotesTracked || 0;
            const campaignFinanceTotal = analytics.campaignFinanceTotal || 0;
            const newsArticlesTracked = analytics.newsArticlesTracked || 0;

            const analyticsHtml = `
                <div class="external-analytics-grid">
                    <div class="analytics-card primary">
                        <div class="card-header">
                            <h3>🗳️ Candidates Tracked</h3>
                            <span class="period">${this.externalFilters.dateRange} days</span>
                        </div>
                        <div class="card-value">${this.formatNumber(totalCandidatesTracked)}</div>
                        <div class="card-trend ${analytics.candidatesTrend >= 0 ? 'up' : 'down'}">
                            ${analytics.candidatesTrend >= 0 ? '↗️' : '↘️'} ${Math.abs(analytics.candidatesTrend || 0)}% from last period
                        </div>
                    </div>

                    <div class="analytics-card election">
                        <div class="card-header">
                            <h3>📊 Active Elections</h3>
                            <span class="priority-badge">Live Tracking</span>
                        </div>
                        <div class="card-value">${activeElections}</div>
                        <div class="card-subtext">
                            ${analytics.upcomingElections || 0} upcoming in 30 days
                        </div>
                    </div>

                    <div class="analytics-card data-sources">
                        <div class="card-header">
                            <h3>🔌 Data Sources</h3>
                        </div>
                        <div class="card-value">${dataSourcesActive}</div>
                        <div class="card-subtext">
                            ${analytics.dataSourcesHealthy || 0} healthy, ${analytics.dataSourcesDown || 0} down
                        </div>
                    </div>

                    <div class="analytics-card votes">
                        <div class="card-header">
                            <h3>🗳️ Total Votes Tracked</h3>
                            <span class="realtime-badge">Real-time</span>
                        </div>
                        <div class="card-value">${this.formatNumber(totalVotesTracked)}</div>
                        <div class="card-subtext">
                            ${analytics.votesVerified || 0}% verified accuracy
                        </div>
                    </div>

                    <div class="analytics-card finance">
                        <div class="card-header">
                            <h3>💰 Campaign Finance</h3>
                        </div>
                        <div class="card-value">$${this.formatCurrency(campaignFinanceTotal)}</div>
                        <div class="card-subtext">
                            ${analytics.fecComplianceRate || 0}% FEC compliant
                        </div>
                    </div>

                    <div class="analytics-card news">
                        <div class="card-header">
                            <h3>📰 News Articles</h3>
                        </div>
                        <div class="card-value">${this.formatNumber(newsArticlesTracked)}</div>
                        <div class="card-subtext">
                            ${analytics.averageSentiment || 0}% positive sentiment
                        </div>
                    </div>

                    <div class="analytics-card polling">
                        <div class="card-header">
                            <h3>📈 Polling Data Points</h3>
                        </div>
                        <div class="card-value">${this.formatNumber(analytics.pollingDataPoints || 0)}</div>
                        <div class="card-subtext">
                            ${analytics.averagePollingAccuracy || 0}% accuracy rate
                        </div>
                    </div>

                    <div class="analytics-card alerts">
                        <div class="card-header">
                            <h3>🚨 Active Alerts</h3>
                            ${analytics.criticalAlerts > 0 ? '<span class="alert-badge">Critical</span>' : ''}
                        </div>
                        <div class="card-value">${analytics.activeAlerts || 0}</div>
                        <div class="card-subtext">
                            ${analytics.criticalAlerts || 0} critical, ${analytics.warningAlerts || 0} warnings
                        </div>
                    </div>
                </div>

                <div class="external-charts-section">
                    <div class="chart-container">
                        <h4>📈 Vote Count Trends (Real-time)</h4>
                        <div id="externalVoteChart" class="chart-placeholder">
                            ${this.renderVoteTrend(analytics.voteTrend)}
                        </div>
                    </div>
                    <div class="chart-container">
                        <h4>💰 Campaign Finance Flow</h4>
                        <div id="externalFinanceChart" class="chart-placeholder">
                            ${this.renderFinanceFlow(analytics.financeFlow)}
                        </div>
                    </div>
                    <div class="chart-container">
                        <h4>📊 Polling Aggregation</h4>
                        <div id="externalPollingChart" class="chart-placeholder">
                            ${this.renderPollingAggregation(analytics.pollingAggregation)}
                        </div>
                    </div>
                </div>
            `;

            analyticsContainer.innerHTML = analyticsHtml;

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to display external analytics', error);
        }
    }

    /**
     * Display data source health status
     */
    async displayDataSourceHealth(healthData) {
        try {
            const healthContainer = document.getElementById('dataSourceHealthStatus');
            if (!healthContainer) return;

            const healthHtml = `
                <div class="data-source-health">
                    <h4>🔌 Data Source Health Status</h4>
                    <div class="health-grid">
                        ${healthData.map(source => `
                            <div class="health-item ${source.status}">
                                <div class="source-info">
                                    <span class="source-name">${source.name}</span>
                                    <span class="source-type">${source.type}</span>
                                </div>
                                <div class="health-status">
                                    <span class="status-indicator ${source.status}">
                                        ${this.getHealthStatusIcon(source.status)}
                                    </span>
                                    <span class="last-sync">
                                        Last sync: ${this.getTimeAgo(source.lastSync)}
                                    </span>
                                </div>
                                <div class="health-metrics">
                                    <span class="uptime">Uptime: ${source.uptime || 0}%</span>
                                    <span class="latency">Latency: ${source.latency || 0}ms</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            healthContainer.innerHTML = healthHtml;

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to display data source health', error);
        }
    }

    /**
     * Handle tab switching in multi-tab system
     */
    async handleTabSwitch(tabId) {
        try {
            // Update active tab button
            const tabButtons = document.querySelectorAll('.external-candidates-tabs .tab-button');
            tabButtons.forEach(button => {
                button.classList.remove('active');
                if (button.dataset.tab === tabId) {
                    button.classList.add('active');
                }
            });

            // Update current tab
            this.currentTab = tabId;

            // Display tab content
            await this.displayCurrentTab();

            await adminDebugLog('ExternalCandidatesController', 'Tab switched', { newTab: tabId });
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Tab switch failed', error);
        }
    }

    /**
     * Display current tab content
     */
    async displayCurrentTab() {
        switch (this.currentTab) {
            case 'vote-tracking':
                await this.displayVoteTracking(this.currentExternalData.voteTracking);
                break;
            case 'campaign-finance':
                await this.displayCampaignFinance(this.currentExternalData.campaignFinance);
                break;
            case 'news-tracking':
                await this.displayNewsTracking(this.currentExternalData.newsTracking);
                break;
            case 'polling-data':
                await this.displayPollingData(this.currentExternalData.pollingData);
                break;
            case 'data-sources':
                await this.displayDataSources(this.currentExternalData.dataSourceHealth);
                break;
            default:
                await adminDebugWarn('ExternalCandidatesController', 'Unknown tab requested', { tab: this.currentTab });
        }
    }

    /**
     * Display vote tracking tab content
     */
    async displayVoteTracking(voteData) {
        try {
            const container = document.getElementById('voteTrackingTable');
            if (!container) {
                await adminDebugWarn('ExternalCandidatesController', 'Vote tracking table container not found');
                return;
            }

            if (!voteData || voteData.length === 0) {
                container.innerHTML = '<div class="no-data">No vote tracking data available</div>';
                return;
            }

            const tableHtml = `
                <div class="vote-tracking-controls">
                    <div class="real-time-status">
                        <span class="status-indicator live">🔴 LIVE</span>
                        <span class="update-frequency">Updates every 30 seconds</span>
                    </div>
                    <div class="tracking-actions">
                        <button id="exportVoteDataBtn" class="action-btn export-btn">📊 Export Data</button>
                        <button id="verifyVoteCountsBtn" class="action-btn verify-btn">✅ Verify Counts</button>
                        <button id="generateVoteReportBtn" class="action-btn report-btn">📄 Generate Report</button>
                    </div>
                </div>

                <div class="vote-tracking-table-container">
                    <table class="external-table vote-tracking-table">
                        <thead>
                            <tr>
                                <th>🗳️ Election</th>
                                <th>👤 Candidate</th>
                                <th>🏛️ Office</th>
                                <th>📍 Location</th>
                                <th class="votes-col">🔢 Current Votes</th>
                                <th class="percentage-col">📊 Percentage</th>
                                <th>📈 Trend</th>
                                <th>✅ Verification</th>
                                <th>🕐 Last Update</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${voteData.map(vote => this.renderVoteTrackingRow(vote)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up vote tracking interactions
            this.setupVoteTrackingInteractions();

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to display vote tracking', error);
        }
    }

    /**
     * Display campaign finance tab content
     */
    async displayCampaignFinance(financeData) {
        try {
            const container = document.getElementById('campaignFinanceTable');
            if (!container) {
                await adminDebugWarn('ExternalCandidatesController', 'Campaign finance table container not found');
                return;
            }

            if (!financeData || financeData.length === 0) {
                container.innerHTML = '<div class="no-data">No campaign finance data available</div>';
                return;
            }

            const tableHtml = `
                <div class="campaign-finance-controls">
                    <div class="sync-status">
                        <span class="fec-sync-status">📋 FEC Sync: ${this.getFECSyncStatus()}</span>
                        <button id="syncFECDataBtn" class="action-btn sync-btn">🔄 Sync FEC</button>
                    </div>
                    <div class="finance-actions">
                        <button id="exportFinanceDataBtn" class="action-btn export-btn">📊 Export Finance Data</button>
                        <button id="checkComplianceBtn" class="action-btn compliance-btn">⚖️ Check Compliance</button>
                        <button id="generateFinanceReportBtn" class="action-btn report-btn">📄 Generate Report</button>
                    </div>
                </div>

                <div class="campaign-finance-table-container">
                    <table class="external-table campaign-finance-table">
                        <thead>
                            <tr>
                                <th>👤 Candidate</th>
                                <th>🏛️ Office</th>
                                <th class="amount-col">💰 Total Raised</th>
                                <th class="amount-col">💸 Total Spent</th>
                                <th class="amount-col">💵 Cash on Hand</th>
                                <th>📊 Donors</th>
                                <th>⚖️ FEC Status</th>
                                <th>📈 Trend</th>
                                <th>🕐 Last Updated</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${financeData.map(finance => this.renderCampaignFinanceRow(finance)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up campaign finance interactions
            this.setupCampaignFinanceInteractions();

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to display campaign finance', error);
        }
    }

    /**
     * Display news tracking tab content
     */
    async displayNewsTracking(newsData) {
        try {
            const container = document.getElementById('newsTrackingTable');
            if (!container) {
                await adminDebugWarn('ExternalCandidatesController', 'News tracking table container not found');
                return;
            }

            if (!newsData || newsData.length === 0) {
                container.innerHTML = '<div class="no-data">No news tracking data available</div>';
                return;
            }

            const tableHtml = `
                <div class="news-tracking-controls">
                    <div class="monitoring-status">
                        <span class="status-indicator active">📰 Active Monitoring</span>
                        <span class="sources-count">${this.getActiveNewsSources()} sources</span>
                    </div>
                    <div class="news-actions">
                        <button id="exportNewsDataBtn" class="action-btn export-btn">📊 Export News Data</button>
                        <button id="sentimentAnalysisBtn" class="action-btn analysis-btn">🧠 Sentiment Analysis</button>
                        <button id="generateNewsReportBtn" class="action-btn report-btn">📄 Generate Report</button>
                    </div>
                </div>

                <div class="news-tracking-table-container">
                    <table class="external-table news-tracking-table">
                        <thead>
                            <tr>
                                <th>📅 Date</th>
                                <th>👤 Candidate</th>
                                <th>📰 Source</th>
                                <th>📝 Headline</th>
                                <th>😊 Sentiment</th>
                                <th>👀 Views/Reach</th>
                                <th>💬 Engagement</th>
                                <th>🏷️ Topics</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${newsData.map(news => this.renderNewsTrackingRow(news)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up news tracking interactions
            this.setupNewsTrackingInteractions();

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to display news tracking', error);
        }
    }

    /**
     * Display polling data tab content
     */
    async displayPollingData(pollingData) {
        try {
            const container = document.getElementById('pollingDataTable');
            if (!container) {
                await adminDebugWarn('ExternalCandidatesController', 'Polling data table container not found');
                return;
            }

            if (!pollingData || pollingData.length === 0) {
                container.innerHTML = '<div class="no-data">No polling data available</div>';
                return;
            }

            const tableHtml = `
                <div class="polling-data-controls">
                    <div class="aggregation-status">
                        <span class="status-indicator">📊 Polling Aggregated</span>
                        <span class="organizations-count">${this.getPollingOrganizations()} organizations</span>
                    </div>
                    <div class="polling-actions">
                        <button id="exportPollingDataBtn" class="action-btn export-btn">📊 Export Polling Data</button>
                        <button id="forecastModelBtn" class="action-btn forecast-btn">🔮 Electoral Forecast</button>
                        <button id="generatePollingReportBtn" class="action-btn report-btn">📄 Generate Report</button>
                    </div>
                </div>

                <div class="polling-data-table-container">
                    <table class="external-table polling-data-table">
                        <thead>
                            <tr>
                                <th>📅 Poll Date</th>
                                <th>🏢 Organization</th>
                                <th>👤 Candidate</th>
                                <th>🏛️ Office</th>
                                <th class="percentage-col">📊 Support %</th>
                                <th>📈 Trend</th>
                                <th>👥 Sample Size</th>
                                <th>📊 Margin of Error</th>
                                <th>⭐ Rating</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pollingData.map(poll => this.renderPollingDataRow(poll)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up polling data interactions
            this.setupPollingDataInteractions();

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to display polling data', error);
        }
    }

    /**
     * Handle data source synchronization
     */
    async handleDataSourceSync(sourceType) {
        try {
            const syncBtn = document.getElementById(`sync${sourceType.toUpperCase()}Btn`) ||
                           document.getElementById('syncAllDataSourcesBtn');

            if (syncBtn) {
                syncBtn.disabled = true;
                syncBtn.textContent = `🔄 Syncing ${sourceType}...`;
            }

            // Update sync status
            this.syncStatus.set(sourceType, 'syncing');

            const response = await window.AdminAPI.syncExternalDataSource(sourceType, {
                filters: this.externalFilters,
                forceRefresh: true
            });

            if (response.success) {
                this.syncStatus.set(sourceType, 'success');

                // Refresh data after successful sync
                await this.loadData(false);

                await adminDebugLog('ExternalCandidatesController', 'Data source sync completed', {
                    sourceType,
                    recordsUpdated: response.recordsUpdated || 0,
                    syncDuration: response.syncDuration || 0
                });
            } else {
                this.syncStatus.set(sourceType, 'error');
                throw new Error(response.error || `Failed to sync ${sourceType}`);
            }

            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.textContent = `✅ ${sourceType} Synced`;
                setTimeout(() => {
                    syncBtn.textContent = `🔄 Sync ${sourceType}`;
                }, 3000);
            }

        } catch (error) {
            this.syncStatus.set(sourceType, 'error');
            await adminDebugError('ExternalCandidatesController', 'Data source sync failed', error);
            alert(`❌ Failed to sync ${sourceType}: ${error.message}`);

            const syncBtn = document.getElementById(`sync${sourceType.toUpperCase()}Btn`) ||
                           document.getElementById('syncAllDataSourcesBtn');
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.textContent = `❌ Sync Failed`;
                setTimeout(() => {
                    syncBtn.textContent = `🔄 Sync ${sourceType}`;
                }, 3000);
            }
        }
    }

    /**
     * Handle vote tracking functionality
     */
    async handleVoteTracking() {
        try {
            // Implement real-time vote tracking logic
            const response = await window.AdminAPI.getVoteTrackingRealTime();

            if (response.success) {
                // Update vote tracking display with real-time data
                await this.updateVoteDisplayRealTime(response.data);

                await adminDebugLog('ExternalCandidatesController', 'Vote tracking updated', {
                    totalVotes: response.data.totalVotes || 0,
                    candidatesTracked: response.data.candidatesTracked || 0
                });
            }

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Vote tracking failed', error);
        }
    }

    /**
     * Handle campaign finance synchronization
     */
    async handleCampaignFinanceSync() {
        try {
            await this.handleDataSourceSync('fec');

            // Additional FEC-specific processing
            const response = await window.AdminAPI.processFECUpdates();

            if (response.success) {
                await adminDebugLog('ExternalCandidatesController', 'FEC data processed', {
                    updatedCandidates: response.updatedCandidates || 0,
                    complianceIssues: response.complianceIssues || 0
                });
            }

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Campaign finance sync failed', error);
        }
    }

    /**
     * Handle news tracking functionality
     */
    async handleNewsTracking() {
        try {
            await this.handleDataSourceSync('news');

            // Additional news processing
            const response = await window.AdminAPI.processNewsUpdates();

            if (response.success) {
                await adminDebugLog('ExternalCandidatesController', 'News data processed', {
                    newArticles: response.newArticles || 0,
                    sentimentAnalyzed: response.sentimentAnalyzed || 0
                });
            }

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'News tracking failed', error);
        }
    }

    /**
     * Generate external candidates report
     */
    async generateExternalReport() {
        try {
            const reportBtn = document.getElementById('exportExternalDataBtn');
            if (reportBtn) {
                reportBtn.disabled = true;
                reportBtn.textContent = '📊 Generating Report...';
            }

            const response = await window.AdminAPI.generateExternalCandidatesReport({
                filters: this.externalFilters,
                includeAnalytics: true,
                includeCharts: true,
                format: 'comprehensive'
            });

            if (response.success) {
                // Download the report
                const blob = new Blob([response.data], { type: 'application/octet-stream' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `external-candidates-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                await adminDebugLog('ExternalCandidatesController', 'External report generated successfully');
            } else {
                throw new Error(response.error || 'Failed to generate report');
            }

            if (reportBtn) {
                reportBtn.disabled = false;
                reportBtn.textContent = '📊 Export Data';
            }

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Report generation failed', error);
            alert(`❌ Failed to generate report: ${error.message}`);
        }
    }

    // Rendering methods for individual rows

    renderVoteTrackingRow(vote) {
        const trendClass = this.getTrendClass(vote.trend);
        const verificationStatus = this.getVerificationStatus(vote.verification);

        return `
            <tr data-vote-id="${vote.id}" class="vote-tracking-row">
                <td class="election">
                    <div class="election-info">
                        <span class="election-name">${vote.election}</span>
                        <span class="election-date">${this.formatDate(vote.electionDate)}</span>
                    </div>
                </td>
                <td class="candidate">
                    <div class="candidate-info">
                        <strong>${vote.candidate.name}</strong>
                        <span class="party">${vote.candidate.party || 'Independent'}</span>
                    </div>
                </td>
                <td class="office">
                    <span class="office-title">${vote.office}</span>
                </td>
                <td class="location">
                    <div class="location-info">
                        <span class="state">${vote.state}</span>
                        <span class="district">${vote.district || 'Statewide'}</span>
                    </div>
                </td>
                <td class="votes">
                    <div class="vote-count">
                        <span class="current-votes">${this.formatNumber(vote.currentVotes)}</span>
                        <span class="vote-change ${trendClass}">
                            ${vote.voteChange >= 0 ? '+' : ''}${this.formatNumber(vote.voteChange)}
                        </span>
                    </div>
                </td>
                <td class="percentage">
                    <div class="vote-percentage">
                        <span class="percentage-value">${vote.percentage.toFixed(1)}%</span>
                        <div class="percentage-bar">
                            <div class="percentage-fill" style="width: ${vote.percentage}%"></div>
                        </div>
                    </div>
                </td>
                <td class="trend">
                    <span class="trend-indicator ${trendClass}">
                        ${this.getTrendIcon(vote.trend)} ${vote.trend}
                    </span>
                </td>
                <td class="verification">
                    ${verificationStatus}
                </td>
                <td class="last-update">
                    <span class="update-time">${this.getTimeAgo(vote.lastUpdate)}</span>
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button data-action="view-vote-details" data-vote-id="${vote.id}"
                                class="action-btn view-btn" title="View Details">
                            🔍 Details
                        </button>
                        <button data-action="verify-vote-count" data-vote-id="${vote.id}"
                                class="action-btn verify-btn" title="Verify Count">
                            ✅ Verify
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderCampaignFinanceRow(finance) {
        const complianceStatus = this.getComplianceStatus(finance.fecCompliance);
        const trendClass = this.getTrendClass(finance.financeTrend);

        return `
            <tr data-finance-id="${finance.id}" class="campaign-finance-row">
                <td class="candidate">
                    <div class="candidate-info">
                        <strong>${finance.candidate.name}</strong>
                        <span class="party">${finance.candidate.party || 'Independent'}</span>
                    </div>
                </td>
                <td class="office">
                    <span class="office-title">${finance.office}</span>
                </td>
                <td class="amount raised">
                    <div class="amount-info">
                        <span class="amount-value">$${this.formatCurrency(finance.totalRaised)}</span>
                        <span class="amount-change ${trendClass}">
                            ${finance.raisedChange >= 0 ? '+' : ''}$${this.formatCurrency(Math.abs(finance.raisedChange))}
                        </span>
                    </div>
                </td>
                <td class="amount spent">
                    <div class="amount-info">
                        <span class="amount-value">$${this.formatCurrency(finance.totalSpent)}</span>
                        <span class="amount-change ${trendClass}">
                            ${finance.spentChange >= 0 ? '+' : ''}$${this.formatCurrency(Math.abs(finance.spentChange))}
                        </span>
                    </div>
                </td>
                <td class="amount cash">
                    <span class="amount-value">$${this.formatCurrency(finance.cashOnHand)}</span>
                </td>
                <td class="donors">
                    <div class="donor-info">
                        <span class="donor-count">${this.formatNumber(finance.totalDonors)}</span>
                        <span class="avg-donation">Avg: $${this.formatCurrency(finance.averageDonation)}</span>
                    </div>
                </td>
                <td class="compliance">
                    ${complianceStatus}
                </td>
                <td class="trend">
                    <span class="trend-indicator ${trendClass}">
                        ${this.getTrendIcon(finance.financeTrend)} ${finance.financeTrend}
                    </span>
                </td>
                <td class="last-update">
                    <span class="update-time">${this.getTimeAgo(finance.lastUpdate)}</span>
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button data-action="view-finance-details" data-finance-id="${finance.id}"
                                class="action-btn view-btn" title="View Details">
                            💰 Details
                        </button>
                        <button data-action="check-fec-compliance" data-finance-id="${finance.id}"
                                class="action-btn compliance-btn" title="Check Compliance">
                            ⚖️ Compliance
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderNewsTrackingRow(news) {
        const sentimentClass = this.getSentimentClass(news.sentiment);
        const engagementLevel = this.getEngagementLevel(news.engagement);

        return `
            <tr data-news-id="${news.id}" class="news-tracking-row">
                <td class="date">
                    <span class="news-date">${this.formatDate(news.publishedAt)}</span>
                </td>
                <td class="candidate">
                    <div class="candidate-info">
                        <strong>${news.candidate.name}</strong>
                        <span class="mentions">${news.mentionCount} mentions</span>
                    </div>
                </td>
                <td class="source">
                    <div class="source-info">
                        <span class="source-name">${news.source}</span>
                        <span class="source-type">${news.sourceType}</span>
                    </div>
                </td>
                <td class="headline">
                    <div class="headline-text" title="${news.headline}">
                        ${this.truncateText(news.headline, 60)}
                    </div>
                </td>
                <td class="sentiment">
                    <span class="sentiment-badge ${sentimentClass}">
                        ${this.getSentimentIcon(news.sentiment)} ${news.sentimentScore.toFixed(1)}
                    </span>
                </td>
                <td class="reach">
                    <div class="reach-info">
                        <span class="views">${this.formatNumber(news.views || news.reach)}</span>
                        <span class="reach-type">${news.views ? 'views' : 'reach'}</span>
                    </div>
                </td>
                <td class="engagement">
                    <span class="engagement-badge ${engagementLevel}">
                        ${this.formatNumber(news.engagement)} ${this.getEngagementIcon(engagementLevel)}
                    </span>
                </td>
                <td class="topics">
                    <div class="topic-tags">
                        ${news.topics.slice(0, 3).map(topic =>
                            `<span class="topic-tag">${topic}</span>`
                        ).join('')}
                        ${news.topics.length > 3 ? `<span class="more-topics">+${news.topics.length - 3}</span>` : ''}
                    </div>
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button data-action="view-news-article" data-url="${news.url}"
                                class="action-btn view-btn" title="View Article">
                            🔗 View
                        </button>
                        <button data-action="analyze-news-item" data-news-id="${news.id}"
                                class="action-btn analyze-btn" title="Analyze">
                            🧠 Analyze
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderPollingDataRow(poll) {
        const trendClass = this.getTrendClass(poll.trend);
        const ratingClass = this.getRatingClass(poll.organizationRating);

        return `
            <tr data-poll-id="${poll.id}" class="polling-data-row">
                <td class="date">
                    <span class="poll-date">${this.formatDate(poll.pollDate)}</span>
                </td>
                <td class="organization">
                    <div class="org-info">
                        <span class="org-name">${poll.organization}</span>
                        <span class="poll-method">${poll.method}</span>
                    </div>
                </td>
                <td class="candidate">
                    <div class="candidate-info">
                        <strong>${poll.candidate.name}</strong>
                        <span class="party">${poll.candidate.party || 'Independent'}</span>
                    </div>
                </td>
                <td class="office">
                    <span class="office-title">${poll.office}</span>
                </td>
                <td class="support">
                    <div class="support-info">
                        <span class="support-percentage">${poll.supportPercentage}%</span>
                        <div class="support-bar">
                            <div class="support-fill" style="width: ${poll.supportPercentage}%"></div>
                        </div>
                    </div>
                </td>
                <td class="trend">
                    <span class="trend-indicator ${trendClass}">
                        ${this.getTrendIcon(poll.trend)} ${poll.trendChange}%
                    </span>
                </td>
                <td class="sample">
                    <span class="sample-size">${this.formatNumber(poll.sampleSize)}</span>
                </td>
                <td class="margin">
                    <span class="margin-error">±${poll.marginOfError}%</span>
                </td>
                <td class="rating">
                    <span class="rating-badge ${ratingClass}">
                        ${this.getRatingIcon(poll.organizationRating)} ${poll.organizationRating}
                    </span>
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button data-action="view-poll-details" data-poll-id="${poll.id}"
                                class="action-btn view-btn" title="View Details">
                            📊 Details
                        </button>
                        <button data-action="analyze-poll-trend" data-poll-id="${poll.id}"
                                class="action-btn analyze-btn" title="Analyze Trend">
                            📈 Trend
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Utility methods and helper functions

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatDate(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString();
        } catch {
            return 'Invalid date';
        }
    }

    getTimeAgo(timestamp) {
        try {
            const now = new Date();
            const date = new Date(timestamp);
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 60) {
                return `${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else {
                return `${diffDays}d ago`;
            }
        } catch {
            return 'Unknown';
        }
    }

    getTrendClass(trend) {
        if (!trend) return 'neutral';
        return trend.toLowerCase().includes('up') ? 'up' :
               trend.toLowerCase().includes('down') ? 'down' : 'neutral';
    }

    getTrendIcon(trend) {
        if (!trend) return '➖';
        return trend.toLowerCase().includes('up') ? '📈' :
               trend.toLowerCase().includes('down') ? '📉' : '➖';
    }

    getSentimentClass(sentiment) {
        if (sentiment >= 0.6) return 'positive';
        if (sentiment <= 0.4) return 'negative';
        return 'neutral';
    }

    getSentimentIcon(sentiment) {
        if (sentiment >= 0.6) return '😊';
        if (sentiment <= 0.4) return '😟';
        return '😐';
    }

    getEngagementLevel(engagement) {
        if (engagement >= 10000) return 'high';
        if (engagement >= 1000) return 'medium';
        return 'low';
    }

    getEngagementIcon(level) {
        switch (level) {
            case 'high': return '🔥';
            case 'medium': return '👀';
            case 'low': return '💬';
            default: return '📊';
        }
    }

    getRatingClass(rating) {
        if (rating >= 8) return 'excellent';
        if (rating >= 6) return 'good';
        if (rating >= 4) return 'fair';
        return 'poor';
    }

    getRatingIcon(rating) {
        if (rating >= 8) return '⭐';
        if (rating >= 6) return '👍';
        if (rating >= 4) return '👌';
        return '👎';
    }

    getHealthStatusIcon(status) {
        switch (status) {
            case 'healthy': return '🟢';
            case 'warning': return '🟡';
            case 'error': return '🔴';
            case 'offline': return '⚫';
            default: return '❓';
        }
    }

    getVerificationStatus(verification) {
        if (!verification) return '<span class="verification pending">⏳ Pending</span>';

        switch (verification.status) {
            case 'verified':
                return '<span class="verification verified">✅ Verified</span>';
            case 'disputed':
                return '<span class="verification disputed">⚠️ Disputed</span>';
            case 'unverified':
                return '<span class="verification unverified">❌ Unverified</span>';
            default:
                return '<span class="verification pending">⏳ Pending</span>';
        }
    }

    getComplianceStatus(compliance) {
        if (!compliance) return '<span class="compliance unknown">❓ Unknown</span>';

        const issues = compliance.issues || 0;
        const lastCheck = compliance.lastCheck;

        return `
            <div class="compliance-status">
                <span class="compliance-badge ${issues === 0 ? 'compliant' : 'non-compliant'}">
                    ${issues === 0 ? '✅ Compliant' : `❌ ${issues} Issues`}
                </span>
                <span class="last-check">Last: ${this.getTimeAgo(lastCheck)}</span>
            </div>
        `;
    }

    getFECSyncStatus() {
        const status = this.syncStatus.get('fec') || 'unknown';
        const icons = {
            'success': '✅ Synced',
            'syncing': '🔄 Syncing',
            'error': '❌ Error',
            'unknown': '❓ Unknown'
        };
        return icons[status] || '❓ Unknown';
    }

    getActiveNewsSources() {
        return this.currentExternalData.newsTracking.length > 0 ?
               new Set(this.currentExternalData.newsTracking.map(n => n.source)).size : 0;
    }

    getPollingOrganizations() {
        return this.currentExternalData.pollingData.length > 0 ?
               new Set(this.currentExternalData.pollingData.map(p => p.organization)).size : 0;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Chart rendering methods

    renderVoteTrend(trend) {
        if (!trend || trend.length === 0) {
            return '<div class="no-data">No vote trend data available</div>';
        }

        return trend.map((point, index) => `
            <div class="trend-point">
                <span class="trend-time">${point.time}</span>
                <span class="trend-votes">${this.formatNumber(point.votes)}</span>
                <div class="trend-bar" style="width: ${(point.votes / Math.max(...trend.map(p => p.votes))) * 100}%"></div>
            </div>
        `).join('');
    }

    renderFinanceFlow(flow) {
        if (!flow || Object.keys(flow).length === 0) {
            return '<div class="no-data">No finance flow data available</div>';
        }

        return Object.entries(flow)
            .sort(([,a], [,b]) => b - a)
            .map(([category, amount]) => `
                <div class="finance-flow-item">
                    <span class="flow-category">${category}</span>
                    <span class="flow-amount">$${this.formatCurrency(amount)}</span>
                    <div class="flow-bar">
                        <div class="flow-fill" style="width: ${(amount / Math.max(...Object.values(flow))) * 100}%"></div>
                    </div>
                </div>
            `).join('');
    }

    renderPollingAggregation(aggregation) {
        if (!aggregation || aggregation.length === 0) {
            return '<div class="no-data">No polling aggregation data available</div>';
        }

        return aggregation.map(candidate => `
            <div class="polling-candidate">
                <div class="candidate-name">${candidate.name}</div>
                <div class="polling-average">${candidate.average}%</div>
                <div class="polling-bar">
                    <div class="polling-fill" style="width: ${candidate.average}%"></div>
                </div>
                <div class="polling-trend ${this.getTrendClass(candidate.trend)}">
                    ${this.getTrendIcon(candidate.trend)} ${candidate.trend}
                </div>
            </div>
        `).join('');
    }

    // Event handler setup methods

    setupVoteTrackingInteractions() {
        const exportBtn = document.getElementById('exportVoteDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportVoteData();
            });
        }

        const verifyBtn = document.getElementById('verifyVoteCountsBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                this.verifyAllVoteCounts();
            });
        }

        const reportBtn = document.getElementById('generateVoteReportBtn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                this.generateVoteReport();
            });
        }
    }

    setupCampaignFinanceInteractions() {
        const syncFECBtn = document.getElementById('syncFECDataBtn');
        if (syncFECBtn) {
            syncFECBtn.addEventListener('click', () => {
                this.handleCampaignFinanceSync();
            });
        }

        const complianceBtn = document.getElementById('checkComplianceBtn');
        if (complianceBtn) {
            complianceBtn.addEventListener('click', () => {
                this.checkAllCompliance();
            });
        }
    }

    setupNewsTrackingInteractions() {
        const sentimentBtn = document.getElementById('sentimentAnalysisBtn');
        if (sentimentBtn) {
            sentimentBtn.addEventListener('click', () => {
                this.runSentimentAnalysis();
            });
        }
    }

    setupPollingDataInteractions() {
        const forecastBtn = document.getElementById('forecastModelBtn');
        if (forecastBtn) {
            forecastBtn.addEventListener('click', () => {
                this.generateElectoralForecast();
            });
        }
    }

    // External candidates action methods (government compliance operations)

    /**
     * View detailed vote information for specific candidate
     */
    async viewVoteDetails(voteId) {
        try {
            await adminDebugLog('ExternalCandidatesController', 'Viewing vote details', { voteId });

            const response = await window.AdminAPI.getVoteDetails(voteId);

            if (response.success) {
                // Display vote details modal or navigate to details page
                this.showVoteDetailsModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to load vote details');
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to view vote details', error);
            alert(`❌ Failed to load vote details: ${error.message}`);
        }
    }

    /**
     * Verify vote count accuracy for specific candidate
     */
    async verifyVoteCount(voteId) {
        try {
            await adminDebugLog('ExternalCandidatesController', 'Verifying vote count', { voteId });

            const response = await window.AdminAPI.verifyVoteCount(voteId);

            if (response.success) {
                await this.loadData(false); // Refresh data after verification
                alert(`✅ Vote count verified: ${response.message}`);
            } else {
                throw new Error(response.error || 'Failed to verify vote count');
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to verify vote count', error);
            alert(`❌ Failed to verify vote count: ${error.message}`);
        }
    }

    /**
     * View detailed campaign finance information
     */
    async viewFinanceDetails(financeId) {
        try {
            await adminDebugLog('ExternalCandidatesController', 'Viewing finance details', { financeId });

            const response = await window.AdminAPI.getFinanceDetails(financeId);

            if (response.success) {
                // Display finance details modal or navigate to details page
                this.showFinanceDetailsModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to load finance details');
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to view finance details', error);
            alert(`❌ Failed to load finance details: ${error.message}`);
        }
    }

    /**
     * Check FEC compliance for candidate campaign finance
     */
    async checkFECCompliance(financeId) {
        try {
            await adminDebugLog('ExternalCandidatesController', 'Checking FEC compliance', { financeId });

            const response = await window.AdminAPI.checkFECCompliance(financeId);

            if (response.success) {
                await this.loadData(false); // Refresh data after compliance check
                this.showComplianceResultModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to check FEC compliance');
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to check FEC compliance', error);
            alert(`❌ Failed to check FEC compliance: ${error.message}`);
        }
    }

    /**
     * Analyze news item sentiment and impact
     */
    async analyzeNewsItem(newsId) {
        try {
            await adminDebugLog('ExternalCandidatesController', 'Analyzing news item', { newsId });

            const response = await window.AdminAPI.analyzeNewsItem(newsId);

            if (response.success) {
                this.showNewsAnalysisModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to analyze news item');
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to analyze news item', error);
            alert(`❌ Failed to analyze news item: ${error.message}`);
        }
    }

    /**
     * View detailed polling information
     */
    async viewPollDetails(pollId) {
        try {
            await adminDebugLog('ExternalCandidatesController', 'Viewing poll details', { pollId });

            const response = await window.AdminAPI.getPollDetails(pollId);

            if (response.success) {
                this.showPollDetailsModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to load poll details');
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to view poll details', error);
            alert(`❌ Failed to load poll details: ${error.message}`);
        }
    }

    /**
     * Analyze polling trend for candidate
     */
    async analyzePollTrend(pollId) {
        try {
            await adminDebugLog('ExternalCandidatesController', 'Analyzing poll trend', { pollId });

            const response = await window.AdminAPI.analyzePollTrend(pollId);

            if (response.success) {
                this.showPollTrendModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to analyze poll trend');
            }
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Failed to analyze poll trend', error);
            alert(`❌ Failed to analyze poll trend: ${error.message}`);
        }
    }

    /**
     * Show vote details in modal
     */
    showVoteDetailsModal(voteData) {
        // Implementation for vote details modal display
        console.log('Vote Details Modal:', voteData);
        // This would typically show a detailed modal with vote information
    }

    /**
     * Show finance details in modal
     */
    showFinanceDetailsModal(financeData) {
        // Implementation for finance details modal display
        console.log('Finance Details Modal:', financeData);
        // This would typically show a detailed modal with campaign finance information
    }

    /**
     * Show compliance result in modal
     */
    showComplianceResultModal(complianceData) {
        // Implementation for compliance result modal display
        console.log('Compliance Result Modal:', complianceData);
        // This would typically show FEC compliance check results
    }

    /**
     * Show news analysis in modal
     */
    showNewsAnalysisModal(analysisData) {
        // Implementation for news analysis modal display
        console.log('News Analysis Modal:', analysisData);
        // This would typically show sentiment analysis and impact metrics
    }

    /**
     * Show poll details in modal
     */
    showPollDetailsModal(pollData) {
        // Implementation for poll details modal display
        console.log('Poll Details Modal:', pollData);
        // This would typically show detailed polling information
    }

    /**
     * Show poll trend analysis in modal
     */
    showPollTrendModal(trendData) {
        // Implementation for poll trend modal display
        console.log('Poll Trend Modal:', trendData);
        // This would typically show polling trend analysis and forecasts
    }

    // Additional functionality methods

    async handleFilterChange() {
        try {
            await this.loadData(false); // Force fresh data with new filters
            await adminDebugLog('ExternalCandidatesController', 'Filters applied', this.externalFilters);
        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Filter change failed', error);
        }
    }

    async handleSearch(searchTerm) {
        try {
            // Filter current tab data based on search term
            let filteredData = this.currentExternalData[this.currentTab.replace('-', '')];

            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(item => {
                    return item.candidate?.name?.toLowerCase().includes(searchLower) ||
                           item.office?.toLowerCase().includes(searchLower) ||
                           item.state?.toLowerCase().includes(searchLower);
                });
            }

            // Display filtered data
            await this.displayCurrentTab();

            await adminDebugLog('ExternalCandidatesController', 'Search completed', {
                tab: this.currentTab,
                searchTerm,
                resultsCount: filteredData.length
            });

        } catch (error) {
            await adminDebugError('ExternalCandidatesController', 'Search failed', error);
        }
    }

    toggleRealTimeUpdates(enabled) {
        if (enabled) {
            this.setupRealTimeMonitoring();
            adminDebugLog('ExternalCandidatesController', 'Real-time updates enabled');
        } else {
            // Clear all real-time intervals
            for (const [key, interval] of this.realTimeUpdates) {
                clearInterval(interval);
            }
            this.realTimeUpdates.clear();
            adminDebugLog('ExternalCandidatesController', 'Real-time updates disabled');
        }
    }

    updateLastRefreshTime() {
        const refreshTimeElement = document.getElementById('externalCandidatesLastRefreshTime');
        if (refreshTimeElement) {
            const now = new Date();
            refreshTimeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('externalCandidatesError');
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

        // Clear real-time update intervals
        for (const [key, interval] of this.realTimeUpdates) {
            clearInterval(interval);
        }
        this.realTimeUpdates.clear();

        // Clear search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Remove event listeners
        const refreshBtn = document.getElementById('refreshExternalCandidatesBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.handleRefresh);
        }

        // Clear data
        this.currentExternalData = {
            voteTracking: [],
            campaignFinance: [],
            newsTracking: [],
            pollingData: [],
            dataSourceHealth: []
        };
        this.currentAnalytics = {};
        this.selectedItems.clear();
        this.syncStatus.clear();
        this.isInitialized = false;

        adminDebugLog('ExternalCandidatesController', 'Controller destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExternalCandidatesController;
} else {
    window.ExternalCandidatesController = ExternalCandidatesController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.externalCandidatesController = new ExternalCandidatesController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.externalCandidatesController = new ExternalCandidatesController();
            }
        }, 100);
    });
}