/**
 * CandidatesController - Handles admin dashboard candidates section
 * Most complex specialized controller for UnitedWeRise admin system
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 3.1 - Advanced multi-tab candidate management with political compliance
 */

class CandidatesController {
    constructor() {
        this.sectionId = 'candidates';
        this.isInitialized = false;
        this.currentTab = 'registrations';
        this.currentCandidates = {
            registrations: [],
            profiles: [],
            reports: [],
            verification: []
        };
        this.currentAnalytics = {};
        this.candidateFilters = {
            status: 'all',
            office: 'all',
            state: 'all',
            party: 'all',
            verificationStatus: 'all',
            dateRange: '30'
        };
        this.refreshInterval = null;
        this.selectedCandidates = new Set();
        this.documentViewer = null;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayCandidatesData = this.displayCandidatesData.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
        this.handleCandidateVerification = this.handleCandidateVerification.bind(this);
        this.handleCandidateProfile = this.handleCandidateProfile.bind(this);
        this.displayRegistrations = this.displayRegistrations.bind(this);
        this.displayProfiles = this.displayProfiles.bind(this);
        this.displayReports = this.displayReports.bind(this);
        this.displayVerificationQueue = this.displayVerificationQueue.bind(this);
        this.handleBulkActions = this.handleBulkActions.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
    }

    /**
     * Initialize the candidates controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for candidates
            if (window.AdminState) {
                window.AdminState.displayCandidatesData = this.displayCandidatesData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Initialize multi-tab system
            await this.setupTabSystem();

            // Load initial data
            await this.loadData();

            // Set up automatic refresh
            this.setupAutoRefresh();

            this.isInitialized = true;

            await adminDebugLog('CandidatesController', 'Controller initialized successfully with multi-tab system');
        } catch (error) {
            await adminDebugError('CandidatesController', 'Initialization failed', error);
            throw error;
        }
    }

    /**
     * Set up multi-tab system for candidates management
     */
    async setupTabSystem() {
        const tabContainer = document.getElementById('candidatesTabContainer');
        if (!tabContainer) {
            await adminDebugError('CandidatesController', 'Tab container not found');
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

        await adminDebugLog('CandidatesController', 'Multi-tab system initialized', {
            totalTabs: tabButtons.length,
            currentTab: this.currentTab
        });
    }

    /**
     * Set up event listeners for candidates section
     */
    async setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshCandidatesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefresh);
        }

        // Filter controls
        const statusFilter = document.getElementById('candidateStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.candidateFilters.status = statusFilter.value;
                this.handleFilterChange();
            });
        }

        const officeFilter = document.getElementById('candidateOfficeFilter');
        if (officeFilter) {
            officeFilter.addEventListener('change', () => {
                this.candidateFilters.office = officeFilter.value;
                this.handleFilterChange();
            });
        }

        const stateFilter = document.getElementById('candidateStateFilter');
        if (stateFilter) {
            stateFilter.addEventListener('change', () => {
                this.candidateFilters.state = stateFilter.value;
                this.handleFilterChange();
            });
        }

        const verificationFilter = document.getElementById('candidateVerificationFilter');
        if (verificationFilter) {
            verificationFilter.addEventListener('change', () => {
                this.candidateFilters.verificationStatus = verificationFilter.value;
                this.handleFilterChange();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('candidatesSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(async () => {
                    await this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // Bulk action buttons
        const bulkActionBtn = document.getElementById('candidateBulkActionBtn');
        if (bulkActionBtn) {
            bulkActionBtn.addEventListener('click', this.handleBulkActions);
        }

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllCandidates');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Export candidates button
        const exportBtn = document.getElementById('exportCandidatesBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCandidates();
            });
        }

        // Document upload handlers
        const documentUpload = document.getElementById('candidateDocumentUpload');
        if (documentUpload) {
            documentUpload.addEventListener('change', (e) => {
                this.handleDocumentUpload(e.target.files);
            });
        }

        await adminDebugLog('CandidatesController', 'Event listeners set up successfully');
    }

    /**
     * Set up automatic refresh for candidates data
     */
    setupAutoRefresh() {
        // Refresh candidates data every 2 minutes (candidates need more frequent updates)
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadData(false); // Force fresh data
            } catch (error) {
                await adminDebugError('CandidatesController', 'Auto-refresh failed', error);
            }
        }, 120000);
    }

    /**
     * Load candidates data for all tabs
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                await window.AdminState.loadCandidatesData(this.candidateFilters, useCache);
            } else {
                // Fallback to direct API calls
                await this.loadDataFallback();
            }
        } catch (error) {
            await adminDebugError('CandidatesController', 'Failed to load candidates data', error);
            this.showError('Failed to load candidates data');
            // Don't throw error - allow controller to initialize with empty data
            return { success: false, error: error.message };
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            const [registrations, profiles, reports, verification, analytics, offices] = await Promise.all([
                window.AdminAPI.getCandidateRegistrations(this.candidateFilters),
                window.AdminAPI.getCandidateProfiles(this.candidateFilters),
                window.AdminAPI.getCandidateReports(this.candidateFilters),
                window.AdminAPI.getCandidateVerificationQueue(this.candidateFilters),
                window.AdminAPI.getCandidatesAnalytics(this.candidateFilters.dateRange),
                window.AdminAPI.getAvailableOffices()
            ]);

            this.displayCandidatesData({
                registrations: registrations.data || [],
                profiles: profiles.data || [],
                reports: reports.data || [],
                verification: verification.data || [],
                analytics: analytics.data || {},
                offices: offices.data || []
            });

        } catch (error) {
            await adminDebugError('CandidatesController', 'Fallback candidates data loading failed', error);
            throw error;
        }
    }

    /**
     * Handle manual refresh
     */
    async handleRefresh() {
        try {
            const refreshBtn = document.getElementById('refreshCandidatesBtn');
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Refreshing...';
            }

            await this.loadData(false); // Force fresh data

            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh';
            }

            await adminDebugLog('CandidatesController', 'Manual refresh completed');
        } catch (error) {
            await adminDebugError('CandidatesController', 'Manual refresh failed', error);
        }
    }

    /**
     * Display candidates data in the UI
     */
    async displayCandidatesData(data) {
        try {
            if (!data) {
                await adminDebugWarn('CandidatesController', 'No candidates data available');
                return;
            }

            // Store current data
            this.currentCandidates = {
                registrations: data.registrations || [],
                profiles: data.profiles || [],
                reports: data.reports || [],
                verification: data.verification || []
            };
            this.currentAnalytics = data.analytics || {};

            // Display analytics dashboard first
            await this.displayCandidatesAnalytics(data.analytics);

            // Display current tab content
            await this.displayCurrentTab();

            // Update last refresh time
            this.updateLastRefreshTime();

            await adminDebugLog('CandidatesController', 'Candidates data displayed', {
                registrationsCount: data.registrations?.length || 0,
                profilesCount: data.profiles?.length || 0,
                reportsCount: data.reports?.length || 0,
                verificationCount: data.verification?.length || 0,
                currentTab: this.currentTab
            });

        } catch (error) {
            await adminDebugError('CandidatesController', 'Failed to display candidates data', error);
        }
    }

    /**
     * Display candidates analytics dashboard
     */
    async displayCandidatesAnalytics(analytics) {
        try {
            const analyticsContainer = document.getElementById('candidatesAnalytics');
            if (!analyticsContainer) {
                await adminDebugWarn('CandidatesController', 'Candidates analytics container not found');
                return;
            }

            const totalCandidates = analytics.totalCandidates || 0;
            const pendingRegistrations = analytics.pendingRegistrations || 0;
            const verifiedCandidates = analytics.verifiedCandidates || 0;
            const activeCampaigns = analytics.activeCampaigns || 0;
            const pendingVerifications = analytics.pendingVerifications || 0;
            const complianceIssues = analytics.complianceIssues || 0;

            const analyticsHtml = `
                <div class="candidates-analytics-grid">
                    <div class="analytics-card primary">
                        <div class="card-header">
                            <h3>🗳️ Total Candidates</h3>
                            <span class="period">${this.candidateFilters.dateRange} days</span>
                        </div>
                        <div class="card-value">${this.formatNumber(totalCandidates)}</div>
                        <div class="card-trend ${analytics.candidatesTrend >= 0 ? 'up' : 'down'}">
                            ${analytics.candidatesTrend >= 0 ? '↗️' : '↘️'} ${Math.abs(analytics.candidatesTrend || 0)}% from last period
                        </div>
                    </div>

                    <div class="analytics-card urgent">
                        <div class="card-header">
                            <h3>📝 Pending Registrations</h3>
                            <span class="priority-badge">Needs Review</span>
                        </div>
                        <div class="card-value">${pendingRegistrations}</div>
                        <div class="card-subtext">
                            ${analytics.urgentRegistrations || 0} urgent review
                        </div>
                    </div>

                    <div class="analytics-card success">
                        <div class="card-header">
                            <h3>✅ Verified Candidates</h3>
                        </div>
                        <div class="card-value">${verifiedCandidates}</div>
                        <div class="card-subtext">
                            ${analytics.verificationRate || 0}% verification rate
                        </div>
                    </div>

                    <div class="analytics-card info">
                        <div class="card-header">
                            <h3>🎯 Active Campaigns</h3>
                        </div>
                        <div class="card-value">${activeCampaigns}</div>
                        <div class="card-subtext">
                            ${analytics.avgCampaignActivity || 0}% avg activity
                        </div>
                    </div>

                    <div class="analytics-card warning">
                        <div class="card-header">
                            <h3>⏳ Pending Verifications</h3>
                            <span class="priority-badge">Action Required</span>
                        </div>
                        <div class="card-value">${pendingVerifications}</div>
                        <div class="card-subtext">
                            ${analytics.avgVerificationTime || 0}h avg time
                        </div>
                    </div>

                    <div class="analytics-card compliance">
                        <div class="card-header">
                            <h3>⚖️ Compliance Issues</h3>
                            ${complianceIssues > 0 ? '<span class="alert-badge">Alert</span>' : ''}
                        </div>
                        <div class="card-value">${complianceIssues}</div>
                        <div class="card-subtext">
                            ${analytics.criticalCompliance || 0} critical
                        </div>
                    </div>

                    <div class="analytics-card geographic">
                        <div class="card-header">
                            <h3>🌍 Geographic Distribution</h3>
                        </div>
                        <div class="card-value">${analytics.topState || 'N/A'}</div>
                        <div class="card-subtext">
                            ${analytics.stateCount || 0} states represented
                        </div>
                    </div>

                    <div class="analytics-card office">
                        <div class="card-header">
                            <h3>🏛️ Top Office Type</h3>
                        </div>
                        <div class="card-value">${analytics.topOffice || 'N/A'}</div>
                        <div class="card-subtext">
                            ${analytics.topOfficeCount || 0} candidates
                        </div>
                    </div>
                </div>

                <div class="candidates-charts-section">
                    <div class="chart-container">
                        <h4>📈 Registration Trends (Last 90 Days)</h4>
                        <div id="candidatesRegistrationChart" class="chart-placeholder">
                            ${this.renderRegistrationTrend(analytics.registrationTrend)}
                        </div>
                    </div>
                    <div class="chart-container">
                        <h4>🏛️ Office Distribution</h4>
                        <div id="candidatesOfficeChart" class="chart-placeholder">
                            ${this.renderOfficeDistribution(analytics.officeDistribution)}
                        </div>
                    </div>
                    <div class="chart-container">
                        <h4>⚖️ Compliance Status</h4>
                        <div id="candidatesComplianceChart" class="chart-placeholder">
                            ${this.renderComplianceBreakdown(analytics.complianceBreakdown)}
                        </div>
                    </div>
                </div>
            `;

            analyticsContainer.innerHTML = analyticsHtml;

        } catch (error) {
            await adminDebugError('CandidatesController', 'Failed to display candidates analytics', error);
        }
    }

    /**
     * Handle tab switching in multi-tab system
     */
    async handleTabSwitch(tabId) {
        try {
            // Update active tab button
            const tabButtons = document.querySelectorAll('.candidates-tabs .tab-button');
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

            await adminDebugLog('CandidatesController', 'Tab switched', { newTab: tabId });
        } catch (error) {
            await adminDebugError('CandidatesController', 'Tab switch failed', error);
        }
    }

    /**
     * Display current tab content
     */
    async displayCurrentTab() {
        switch (this.currentTab) {
            case 'registrations':
                await this.displayRegistrations(this.currentCandidates.registrations);
                break;
            case 'profiles':
                await this.displayProfiles(this.currentCandidates.profiles);
                break;
            case 'reports':
                await this.displayReports(this.currentCandidates.reports);
                break;
            case 'verification':
                await this.displayVerificationQueue(this.currentCandidates.verification);
                break;
            default:
                await adminDebugWarn('CandidatesController', 'Unknown tab requested', { tab: this.currentTab });
        }
    }

    /**
     * Display registrations tab content
     */
    async displayRegistrations(registrations) {
        try {
            const container = document.getElementById('candidatesRegistrationsTable');
            if (!container) {
                await adminDebugWarn('CandidatesController', 'Registrations table container not found');
                return;
            }

            if (!registrations || registrations.length === 0) {
                container.innerHTML = '<div class="no-data">✅ No pending registrations found</div>';
                return;
            }

            const tableHtml = `
                <div class="registrations-controls">
                    <div class="selection-controls">
                        <label class="checkbox-container">
                            <input type="checkbox" id="selectAllRegistrations">
                            <span class="checkmark"></span>
                            Select All
                        </label>
                        <span class="selection-count">${this.selectedCandidates.size} selected</span>
                    </div>
                    <div class="bulk-actions">
                        <select id="registrationBulkActionSelect">
                            <option value="">Bulk Actions...</option>
                            <option value="approve">Approve Selected</option>
                            <option value="reject">Reject Selected</option>
                            <option value="request-docs">Request Additional Documents</option>
                            <option value="flag-review">Flag for Manual Review</option>
                        </select>
                        <button id="registrationBulkActionBtn" class="action-btn bulk-btn" disabled>Apply</button>
                    </div>
                </div>

                <div class="registrations-table-container">
                    <table class="candidates-table registrations-table">
                        <thead>
                            <tr>
                                <th class="checkbox-col">
                                    <input type="checkbox" id="selectAllRegistrationsHeader">
                                </th>
                                <th class="sortable" data-sort="timestamp">📅 Submitted</th>
                                <th>👤 Candidate</th>
                                <th class="sortable" data-sort="office">🏛️ Office</th>
                                <th>📍 Location</th>
                                <th>📄 Documents</th>
                                <th class="sortable" data-sort="status">📊 Status</th>
                                <th>🔍 Background Check</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${registrations.map(registration => this.renderRegistrationRow(registration)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up table interactions for registrations
            this.setupRegistrationTableInteractions();

        } catch (error) {
            await adminDebugError('CandidatesController', 'Failed to display registrations', error);
        }
    }

    /**
     * Display profiles tab content
     */
    async displayProfiles(profiles) {
        try {
            const container = document.getElementById('candidatesProfilesTable');
            if (!container) {
                await adminDebugWarn('CandidatesController', 'Profiles table container not found');
                return;
            }

            if (!profiles || profiles.length === 0) {
                container.innerHTML = '<div class="no-data">No candidate profiles found</div>';
                return;
            }

            const tableHtml = `
                <div class="profiles-controls">
                    <div class="selection-controls">
                        <label class="checkbox-container">
                            <input type="checkbox" id="selectAllProfiles">
                            <span class="checkmark"></span>
                            Select All
                        </label>
                        <span class="selection-count">${this.selectedCandidates.size} selected</span>
                    </div>
                    <div class="bulk-actions">
                        <select id="profileBulkActionSelect">
                            <option value="">Bulk Actions...</option>
                            <option value="update-visibility">Update Visibility</option>
                            <option value="verify-social">Verify Social Media</option>
                            <option value="compliance-check">Run Compliance Check</option>
                            <option value="suspend-campaign">Suspend Campaigns</option>
                        </select>
                        <button id="profileBulkActionBtn" class="action-btn bulk-btn" disabled>Apply</button>
                    </div>
                </div>

                <div class="profiles-table-container">
                    <table class="candidates-table profiles-table">
                        <thead>
                            <tr>
                                <th class="checkbox-col">
                                    <input type="checkbox" id="selectAllProfilesHeader">
                                </th>
                                <th>👤 Candidate</th>
                                <th class="sortable" data-sort="office">🏛️ Office</th>
                                <th>🎯 Campaign Status</th>
                                <th>📱 Social Media</th>
                                <th>💰 Campaign Finance</th>
                                <th class="sortable" data-sort="activity">📊 Activity</th>
                                <th>⚖️ Compliance</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${profiles.map(profile => this.renderProfileRow(profile)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up table interactions for profiles
            this.setupProfileTableInteractions();

        } catch (error) {
            await adminDebugError('CandidatesController', 'Failed to display profiles', error);
        }
    }

    /**
     * Display reports tab content
     */
    async displayReports(reports) {
        try {
            const container = document.getElementById('candidatesReportsTable');
            if (!container) {
                await adminDebugWarn('CandidatesController', 'Reports table container not found');
                return;
            }

            if (!reports || reports.length === 0) {
                container.innerHTML = '<div class="no-data">✅ No candidate-related reports found</div>';
                return;
            }

            const tableHtml = `
                <div class="reports-controls">
                    <div class="selection-controls">
                        <label class="checkbox-container">
                            <input type="checkbox" id="selectAllReports">
                            <span class="checkmark"></span>
                            Select All
                        </label>
                        <span class="selection-count">${this.selectedCandidates.size} selected</span>
                    </div>
                    <div class="bulk-actions">
                        <select id="reportBulkActionSelect">
                            <option value="">Bulk Actions...</option>
                            <option value="dismiss">Dismiss Selected</option>
                            <option value="investigate">Start Investigation</option>
                            <option value="escalate">Escalate to FEC</option>
                            <option value="compliance-review">Compliance Review</option>
                        </select>
                        <button id="reportBulkActionBtn" class="action-btn bulk-btn" disabled>Apply</button>
                    </div>
                </div>

                <div class="reports-table-container">
                    <table class="candidates-table reports-table">
                        <thead>
                            <tr>
                                <th class="checkbox-col">
                                    <input type="checkbox" id="selectAllReportsHeader">
                                </th>
                                <th class="sortable" data-sort="timestamp">📅 Reported</th>
                                <th>🏷️ Type</th>
                                <th>👤 Reported Candidate</th>
                                <th>📝 Issue Description</th>
                                <th class="sortable" data-sort="severity">⚠️ Severity</th>
                                <th>⚖️ Legal Impact</th>
                                <th class="sortable" data-sort="status">📊 Status</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.map(report => this.renderReportRow(report)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up table interactions for reports
            this.setupReportTableInteractions();

        } catch (error) {
            await adminDebugError('CandidatesController', 'Failed to display reports', error);
        }
    }

    /**
     * Display verification queue tab content
     */
    async displayVerificationQueue(verifications) {
        try {
            const container = document.getElementById('candidatesVerificationTable');
            if (!container) {
                await adminDebugWarn('CandidatesController', 'Verification table container not found');
                return;
            }

            if (!verifications || verifications.length === 0) {
                container.innerHTML = '<div class="no-data">✅ No pending verifications found</div>';
                return;
            }

            const tableHtml = `
                <div class="verification-controls">
                    <div class="selection-controls">
                        <label class="checkbox-container">
                            <input type="checkbox" id="selectAllVerifications">
                            <span class="checkmark"></span>
                            Select All
                        </label>
                        <span class="selection-count">${this.selectedCandidates.size} selected</span>
                    </div>
                    <div class="bulk-actions">
                        <select id="verificationBulkActionSelect">
                            <option value="">Bulk Actions...</option>
                            <option value="approve">Approve Selected</option>
                            <option value="reject">Reject Selected</option>
                            <option value="request-info">Request Additional Info</option>
                            <option value="manual-review">Flag for Manual Review</option>
                        </select>
                        <button id="verificationBulkActionBtn" class="action-btn bulk-btn" disabled>Apply</button>
                    </div>
                </div>

                <div class="verification-table-container">
                    <table class="candidates-table verification-table">
                        <thead>
                            <tr>
                                <th class="checkbox-col">
                                    <input type="checkbox" id="selectAllVerificationsHeader">
                                </th>
                                <th class="sortable" data-sort="priority">📌 Priority</th>
                                <th>👤 Candidate</th>
                                <th>🔍 Verification Type</th>
                                <th>📄 Documents</th>
                                <th>✅ Requirements Check</th>
                                <th>🕐 Time in Queue</th>
                                <th class="sortable" data-sort="status">📊 Status</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${verifications.map(verification => this.renderVerificationRow(verification)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up table interactions for verification
            this.setupVerificationTableInteractions();

        } catch (error) {
            await adminDebugError('CandidatesController', 'Failed to display verification queue', error);
        }
    }

    /**
     * Render individual registration row
     */
    renderRegistrationRow(registration) {
        const statusClass = this.getStatusClass(registration.status);
        const statusIcon = this.getStatusIcon(registration.status);
        const bgCheckStatus = this.getBackgroundCheckStatus(registration.backgroundCheck);

        return `
            <tr data-candidate-id="${registration.id}" class="registration-row ${statusClass}">
                <td class="checkbox-col">
                    <label class="checkbox-container">
                        <input type="checkbox" value="${registration.id}" class="candidate-checkbox">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="timestamp">
                    ${this.formatTimestamp(registration.submittedAt)}
                    <div class="time-ago">${this.getTimeAgo(registration.submittedAt)}</div>
                </td>
                <td class="candidate-info">
                    <div class="candidate-details">
                        <strong>${registration.firstName} ${registration.lastName}</strong>
                        <div class="candidate-meta">
                            <span class="email">${registration.email}</span>
                            <span class="phone">${registration.phone || 'N/A'}</span>
                        </div>
                    </div>
                </td>
                <td class="office">
                    <div class="office-info">
                        <span class="office-title">${registration.office}</span>
                        <span class="office-level">${registration.officeLevel || 'Local'}</span>
                    </div>
                </td>
                <td class="location">
                    <div class="location-info">
                        <span class="state">${registration.state}</span>
                        <span class="district">${registration.district || 'N/A'}</span>
                    </div>
                </td>
                <td class="documents">
                    <div class="document-status">
                        <span class="doc-count">${registration.documents?.length || 0} docs</span>
                        ${this.renderDocumentTypes(registration.documents)}
                    </div>
                </td>
                <td class="status">
                    <span class="status-badge ${statusClass}">
                        ${statusIcon} ${registration.status}
                    </span>
                </td>
                <td class="background-check">
                    ${bgCheckStatus}
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button onclick="window.candidatesController.reviewRegistration('${registration.id}')"
                                class="action-btn review-btn" title="Review Registration">
                            🔍 Review
                        </button>
                        <button onclick="window.candidatesController.approveRegistration('${registration.id}')"
                                class="action-btn approve-btn" title="Approve Registration">
                            ✅ Approve
                        </button>
                        <button onclick="window.candidatesController.rejectRegistration('${registration.id}')"
                                class="action-btn reject-btn" title="Reject Registration">
                            ❌ Reject
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render individual profile row
     */
    renderProfileRow(profile) {
        const campaignStatus = this.getCampaignStatus(profile.campaign);
        const complianceStatus = this.getComplianceStatus(profile.compliance);

        return `
            <tr data-candidate-id="${profile.id}" class="profile-row">
                <td class="checkbox-col">
                    <label class="checkbox-container">
                        <input type="checkbox" value="${profile.id}" class="candidate-checkbox">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="candidate-info">
                    <div class="candidate-profile">
                        ${profile.profilePhoto ? `<img src="${profile.profilePhoto}" class="profile-thumb" alt="Profile">` : '<div class="profile-placeholder">👤</div>'}
                        <div class="profile-details">
                            <strong>${profile.firstName} ${profile.lastName}</strong>
                            <span class="username">@${profile.username || 'N/A'}</span>
                        </div>
                    </div>
                </td>
                <td class="office">
                    <div class="office-info">
                        <span class="office-title">${profile.office}</span>
                        <span class="election-year">${profile.electionYear || new Date().getFullYear()}</span>
                    </div>
                </td>
                <td class="campaign-status">
                    ${campaignStatus}
                </td>
                <td class="social-media">
                    <div class="social-links">
                        ${profile.socialMedia?.twitter ? '🐦' : ''}
                        ${profile.socialMedia?.facebook ? '📘' : ''}
                        ${profile.socialMedia?.instagram ? '📷' : ''}
                        ${profile.socialMedia?.website ? '🌐' : ''}
                        <span class="social-verified">${profile.socialMediaVerified ? '✅' : '❌'}</span>
                    </div>
                </td>
                <td class="campaign-finance">
                    <div class="finance-info">
                        <span class="funds-raised">$${this.formatCurrency(profile.campaignFinance?.raised || 0)}</span>
                        <span class="funds-spent">$${this.formatCurrency(profile.campaignFinance?.spent || 0)}</span>
                        <span class="compliance-status ${profile.campaignFinance?.compliant ? 'compliant' : 'non-compliant'}">
                            ${profile.campaignFinance?.compliant ? '✅' : '❌'} FEC
                        </span>
                    </div>
                </td>
                <td class="activity">
                    <div class="activity-metrics">
                        <span class="posts">${profile.stats?.posts || 0} posts</span>
                        <span class="engagement">${profile.stats?.engagement || 0}% engagement</span>
                        <span class="last-active">${this.getTimeAgo(profile.lastActive)}</span>
                    </div>
                </td>
                <td class="compliance">
                    ${complianceStatus}
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button onclick="window.candidatesController.handleCandidateProfile('${profile.id}')"
                                class="action-btn edit-btn" title="Edit Profile">
                            ✏️ Edit
                        </button>
                        <button onclick="window.candidatesController.viewCampaignDetails('${profile.id}')"
                                class="action-btn campaign-btn" title="Campaign Details">
                            🎯 Campaign
                        </button>
                        <button onclick="window.candidatesController.checkCompliance('${profile.id}')"
                                class="action-btn compliance-btn" title="Check Compliance">
                            ⚖️ Compliance
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render individual report row
     */
    renderReportRow(report) {
        const severityClass = this.getSeverityClass(report.severity);
        const statusClass = this.getStatusClass(report.status);

        return `
            <tr data-report-id="${report.id}" class="report-row ${severityClass}">
                <td class="checkbox-col">
                    <label class="checkbox-container">
                        <input type="checkbox" value="${report.id}" class="candidate-checkbox">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="timestamp">
                    ${this.formatTimestamp(report.reportedAt)}
                    <div class="time-ago">${this.getTimeAgo(report.reportedAt)}</div>
                </td>
                <td class="report-type">
                    <span class="type-badge ${report.type.toLowerCase().replace(/\s+/g, '-')}">
                        ${this.getReportTypeIcon(report.type)} ${report.type}
                    </span>
                </td>
                <td class="reported-candidate">
                    <div class="candidate-info">
                        <strong>${report.candidate.firstName} ${report.candidate.lastName}</strong>
                        <span class="office">${report.candidate.office}</span>
                    </div>
                </td>
                <td class="description">
                    <div class="description-text" title="${report.description}">
                        ${this.truncateText(report.description, 80)}
                    </div>
                    ${report.evidence ? '<span class="evidence-badge">📎 Evidence</span>' : ''}
                </td>
                <td class="severity">
                    <span class="severity-badge ${severityClass}">
                        ${this.getSeverityIcon(report.severity)} ${report.severity}
                    </span>
                </td>
                <td class="legal-impact">
                    <div class="legal-status">
                        <span class="fec-reportable ${report.fecReportable ? 'required' : 'not-required'}">
                            ${report.fecReportable ? '⚖️ FEC' : '📋 Internal'}
                        </span>
                        ${report.legalConsultation ? '<span class="legal-consulted">👨‍⚖️ Legal</span>' : ''}
                    </div>
                </td>
                <td class="status">
                    <span class="status-badge ${statusClass}">
                        ${this.getStatusIcon(report.status)} ${report.status}
                    </span>
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button onclick="window.candidatesController.reviewCandidateReport('${report.id}')"
                                class="action-btn review-btn" title="Review Report">
                            🔍 Review
                        </button>
                        <button onclick="window.candidatesController.investigateReport('${report.id}')"
                                class="action-btn investigate-btn" title="Start Investigation">
                            🕵️ Investigate
                        </button>
                        <button onclick="window.candidatesController.escalateToFEC('${report.id}')"
                                class="action-btn escalate-btn" title="Escalate to FEC">
                            ⚖️ Escalate
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render individual verification row
     */
    renderVerificationRow(verification) {
        const priorityClass = this.getPriorityClass(verification.priority);
        const statusClass = this.getStatusClass(verification.status);

        return `
            <tr data-verification-id="${verification.id}" class="verification-row ${priorityClass}">
                <td class="checkbox-col">
                    <label class="checkbox-container">
                        <input type="checkbox" value="${verification.id}" class="candidate-checkbox">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="priority">
                    <span class="priority-badge ${priorityClass}">
                        ${this.getPriorityIcon(verification.priority)} ${verification.priority}
                    </span>
                </td>
                <td class="candidate-info">
                    <div class="candidate-details">
                        <strong>${verification.candidate.firstName} ${verification.candidate.lastName}</strong>
                        <span class="verification-type">${verification.verificationType}</span>
                    </div>
                </td>
                <td class="verification-type">
                    <span class="type-badge">
                        ${this.getVerificationTypeIcon(verification.verificationType)} ${verification.verificationType}
                    </span>
                </td>
                <td class="documents">
                    <div class="document-list">
                        ${verification.documents.map(doc => `
                            <div class="document-item">
                                <span class="doc-type">${doc.type}</span>
                                <button onclick="window.candidatesController.viewDocument('${doc.id}')"
                                        class="view-doc-btn">📄 View</button>
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td class="requirements">
                    ${this.renderRequirementsCheck(verification.requirements)}
                </td>
                <td class="time-in-queue">
                    <div class="queue-time">
                        <span class="duration">${this.formatDuration(verification.timeInQueue)}</span>
                        <span class="queue-date">${this.formatTimestamp(verification.queuedAt)}</span>
                    </div>
                </td>
                <td class="status">
                    <span class="status-badge ${statusClass}">
                        ${this.getStatusIcon(verification.status)} ${verification.status}
                    </span>
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button onclick="window.candidatesController.handleCandidateVerification('${verification.id}')"
                                class="action-btn verify-btn" title="Process Verification">
                            🔍 Verify
                        </button>
                        <button onclick="window.candidatesController.approveVerification('${verification.id}')"
                                class="action-btn approve-btn" title="Approve Verification">
                            ✅ Approve
                        </button>
                        <button onclick="window.candidatesController.rejectVerification('${verification.id}')"
                                class="action-btn reject-btn" title="Reject Verification">
                            ❌ Reject
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Handle candidate verification process with document review
     */
    async handleCandidateVerification(verificationId) {
        try {
            const response = await window.AdminAPI.getCandidateVerificationDetails(verificationId);

            if (response.success) {
                const verification = response.data;
                this.showVerificationModal(verification);

                await adminDebugLog('CandidatesController', 'Candidate verification opened', { verificationId });
            } else {
                throw new Error(response.error || 'Failed to get verification details');
            }

        } catch (error) {
            await adminDebugError('CandidatesController', 'Candidate verification failed', error);
            alert(`❌ Failed to load verification details: ${error.message}`);
        }
    }

    /**
     * Show comprehensive verification modal with document review
     */
    showVerificationModal(verification) {
        const modalHtml = `
            <div class="verification-modal">
                <div class="modal-header">
                    <h3>🔍 Candidate Verification</h3>
                    <button class="close-modal" onclick="this.closest('.verification-modal').remove()">✕</button>
                </div>
                <div class="modal-content">
                    <div class="verification-layout">
                        <div class="verification-sidebar">
                            <div class="candidate-summary">
                                <h4>👤 Candidate Information</h4>
                                <div class="candidate-details">
                                    <div class="candidate-name">${verification.candidate.firstName} ${verification.candidate.lastName}</div>
                                    <div class="candidate-office">${verification.candidate.office}</div>
                                    <div class="candidate-location">${verification.candidate.state}, ${verification.candidate.district || 'N/A'}</div>
                                </div>
                            </div>

                            <div class="verification-checklist">
                                <h4>✅ Verification Checklist</h4>
                                ${this.renderVerificationChecklist(verification.requirements)}
                            </div>

                            <div class="verification-notes">
                                <h4>📝 Notes</h4>
                                <textarea id="verificationNotes" placeholder="Add verification notes..." rows="4"></textarea>
                            </div>
                        </div>

                        <div class="verification-main">
                            <div class="document-viewer">
                                <h4>📄 Document Review</h4>
                                <div class="document-tabs">
                                    ${verification.documents.map((doc, index) => `
                                        <button class="doc-tab ${index === 0 ? 'active' : ''}"
                                                data-doc-index="${index}">
                                            ${doc.type}
                                        </button>
                                    `).join('')}
                                </div>
                                <div class="document-content">
                                    ${this.renderDocumentViewer(verification.documents[0])}
                                </div>
                            </div>

                            <div class="background-check-section">
                                <h4>🔍 Background Check Results</h4>
                                ${this.renderBackgroundCheckResults(verification.backgroundCheck)}
                            </div>

                            <div class="eligibility-check">
                                <h4>⚖️ Eligibility Verification</h4>
                                ${this.renderEligibilityCheck(verification.eligibility)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button onclick="window.candidatesController.approveVerification('${verification.id}')"
                            class="action-btn approve-btn large">✅ Approve Verification</button>
                    <button onclick="window.candidatesController.rejectVerification('${verification.id}')"
                            class="action-btn reject-btn large">❌ Reject Verification</button>
                    <button onclick="window.candidatesController.requestAdditionalInfo('${verification.id}')"
                            class="action-btn info-btn large">📋 Request Additional Info</button>
                    <button onclick="this.closest('.verification-modal').remove()"
                            class="action-btn secondary-btn large">Close</button>
                </div>
            </div>
        `;

        // Show modal
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-overlay verification-overlay';
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Set up document tab switching
        const docTabs = modalContainer.querySelectorAll('.doc-tab');
        docTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const docIndex = parseInt(tab.dataset.docIndex);
                this.switchDocumentView(verification.documents[docIndex]);

                // Update active tab
                docTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        // Close modal when clicking overlay
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
    }

    /**
     * Handle candidate profile management
     */
    async handleCandidateProfile(candidateId) {
        try {
            const response = await window.AdminAPI.getCandidateProfile(candidateId);

            if (response.success) {
                const profile = response.data;
                this.showProfileEditModal(profile);

                await adminDebugLog('CandidatesController', 'Candidate profile opened for editing', { candidateId });
            } else {
                throw new Error(response.error || 'Failed to get candidate profile');
            }

        } catch (error) {
            await adminDebugError('CandidatesController', 'Candidate profile handling failed', error);
            alert(`❌ Failed to load candidate profile: ${error.message}`);
        }
    }

    /**
     * Show profile editing modal
     */
    showProfileEditModal(profile) {
        const modalHtml = `
            <div class="profile-edit-modal">
                <div class="modal-header">
                    <h3>✏️ Edit Candidate Profile</h3>
                    <button class="close-modal" onclick="this.closest('.profile-edit-modal').remove()">✕</button>
                </div>
                <div class="modal-content">
                    <div class="profile-edit-layout">
                        <div class="profile-sections">
                            <div class="section-tabs">
                                <button class="section-tab active" data-section="basic">Basic Info</button>
                                <button class="section-tab" data-section="campaign">Campaign</button>
                                <button class="section-tab" data-section="social">Social Media</button>
                                <button class="section-tab" data-section="finance">Finance</button>
                                <button class="section-tab" data-section="compliance">Compliance</button>
                            </div>

                            <div class="section-content">
                                <div id="basic-section" class="profile-section active">
                                    ${this.renderBasicInfoSection(profile)}
                                </div>
                                <div id="campaign-section" class="profile-section">
                                    ${this.renderCampaignSection(profile)}
                                </div>
                                <div id="social-section" class="profile-section">
                                    ${this.renderSocialMediaSection(profile)}
                                </div>
                                <div id="finance-section" class="profile-section">
                                    ${this.renderFinanceSection(profile)}
                                </div>
                                <div id="compliance-section" class="profile-section">
                                    ${this.renderComplianceSection(profile)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button onclick="window.candidatesController.saveProfileChanges('${profile.id}')"
                            class="action-btn save-btn large">💾 Save Changes</button>
                    <button onclick="window.candidatesController.resetProfileChanges('${profile.id}')"
                            class="action-btn reset-btn large">🔄 Reset</button>
                    <button onclick="this.closest('.profile-edit-modal').remove()"
                            class="action-btn secondary-btn large">Cancel</button>
                </div>
            </div>
        `;

        // Show modal
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-overlay profile-edit-overlay';
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Set up section tab switching
        this.setupProfileModalTabs(modalContainer);

        // Close modal when clicking overlay
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
    }

    /**
     * Handle bulk actions on selected candidates
     */
    async handleBulkActions() {
        try {
            const actionSelect = document.getElementById(`${this.currentTab}BulkActionSelect`);
            const action = actionSelect?.value;

            if (!action) {
                alert('❌ Please select a bulk action');
                return;
            }

            if (this.selectedCandidates.size === 0) {
                alert('❌ Please select candidates to perform bulk action');
                return;
            }

            const candidateIds = Array.from(this.selectedCandidates);
            let confirmMessage = `🔄 BULK ACTION: ${action.toUpperCase()}\n\nSelected Candidates: ${candidateIds.length}\nCandidate IDs: ${candidateIds.join(', ')}\n\n`;

            // Customize confirmation message based on action and tab
            switch (this.currentTab) {
                case 'registrations':
                    confirmMessage += this.getBulkRegistrationMessage(action);
                    break;
                case 'profiles':
                    confirmMessage += this.getBulkProfileMessage(action);
                    break;
                case 'reports':
                    confirmMessage += this.getBulkReportMessage(action);
                    break;
                case 'verification':
                    confirmMessage += this.getBulkVerificationMessage(action);
                    break;
            }

            if (!confirm(confirmMessage)) {
                return;
            }

            let totpToken = null;
            const sensitiveActions = ['approve', 'reject', 'suspend-campaign', 'escalate'];
            if (sensitiveActions.includes(action)) {
                const totpResult = await requestTOTPConfirmation(
                    `Bulk ${action} action for candidates`,
                    { additionalInfo: `${candidateIds.length} candidates selected` }
                );
                totpToken = totpResult.totpToken;
            }

            // Perform bulk action
            const response = await window.AdminAPI.bulkCandidateAction(candidateIds, action, this.currentTab, {
                totpToken,
                adminUserId: window.adminAuth.getCurrentUser()?.id
            });

            if (response.success) {
                alert(`✅ Bulk ${action} completed successfully\n\nProcessed: ${response.processedCount} candidates\nFailed: ${response.failedCount || 0} candidates`);

                // Clear selection
                this.selectedCandidates.clear();
                this.updateSelectionUI();

                // Reset action dropdown
                actionSelect.value = '';

                // Refresh current tab data
                await this.loadData(false);

                await adminDebugLog('CandidatesController', 'Bulk action completed', {
                    action,
                    tab: this.currentTab,
                    candidateIds,
                    processedCount: response.processedCount,
                    failedCount: response.failedCount
                });
            } else {
                throw new Error(response.error || `Failed to perform bulk ${action}`);
            }

        } catch (error) {
            await adminDebugError('CandidatesController', 'Bulk action failed', error);
            alert(`❌ Bulk action failed: ${error.message}`);
        }
    }

    /**
     * Handle filter changes
     */
    async handleFilterChange() {
        try {
            await this.loadData(false); // Force fresh data with new filters
            await adminDebugLog('CandidatesController', 'Filters applied', this.candidateFilters);
        } catch (error) {
            await adminDebugError('CandidatesController', 'Filter change failed', error);
        }
    }

    /**
     * Handle search functionality
     */
    async handleSearch(searchTerm) {
        try {
            // Filter current tab data based on search term
            let filteredData = this.currentCandidates[this.currentTab];

            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(item => {
                    // Search varies by tab
                    switch (this.currentTab) {
                        case 'registrations':
                            return item.firstName?.toLowerCase().includes(searchLower) ||
                                   item.lastName?.toLowerCase().includes(searchLower) ||
                                   item.email?.toLowerCase().includes(searchLower) ||
                                   item.office?.toLowerCase().includes(searchLower);
                        case 'profiles':
                            return item.firstName?.toLowerCase().includes(searchLower) ||
                                   item.lastName?.toLowerCase().includes(searchLower) ||
                                   item.username?.toLowerCase().includes(searchLower) ||
                                   item.office?.toLowerCase().includes(searchLower);
                        case 'reports':
                            return item.candidate?.firstName?.toLowerCase().includes(searchLower) ||
                                   item.candidate?.lastName?.toLowerCase().includes(searchLower) ||
                                   item.description?.toLowerCase().includes(searchLower) ||
                                   item.type?.toLowerCase().includes(searchLower);
                        case 'verification':
                            return item.candidate?.firstName?.toLowerCase().includes(searchLower) ||
                                   item.candidate?.lastName?.toLowerCase().includes(searchLower) ||
                                   item.verificationType?.toLowerCase().includes(searchLower);
                        default:
                            return true;
                    }
                });
            }

            // Display filtered data
            switch (this.currentTab) {
                case 'registrations':
                    await this.displayRegistrations(filteredData);
                    break;
                case 'profiles':
                    await this.displayProfiles(filteredData);
                    break;
                case 'reports':
                    await this.displayReports(filteredData);
                    break;
                case 'verification':
                    await this.displayVerificationQueue(filteredData);
                    break;
            }

            await adminDebugLog('CandidatesController', 'Search completed', {
                tab: this.currentTab,
                searchTerm,
                resultsCount: filteredData.length
            });

        } catch (error) {
            await adminDebugError('CandidatesController', 'Search failed', error);
        }
    }

    // Utility methods for rendering and formatting

    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
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
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('$', '');
    }

    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        } else if (minutes < 1440) { // 24 hours
            return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        } else {
            return `${Math.floor(minutes / 1440)}d`;
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    getStatusClass(status) {
        return `status-${(status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;
    }

    getStatusIcon(status) {
        switch ((status || 'pending').toLowerCase()) {
            case 'pending': return '⏳';
            case 'approved': return '✅';
            case 'rejected': return '❌';
            case 'under-review': return '🔍';
            case 'verified': return '✅';
            case 'active': return '🟢';
            case 'suspended': return '🚫';
            case 'completed': return '✅';
            case 'in-progress': return '🔄';
            default: return '📋';
        }
    }

    getPriorityClass(priority) {
        return `priority-${(priority || 'low').toLowerCase()}`;
    }

    getPriorityIcon(priority) {
        switch ((priority || 'low').toLowerCase()) {
            case 'urgent': return '🚨';
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }

    getSeverityClass(severity) {
        return `severity-${(severity || 'low').toLowerCase()}`;
    }

    getSeverityIcon(severity) {
        switch ((severity || 'low').toLowerCase()) {
            case 'critical': return '🚨';
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }

    getReportTypeIcon(type) {
        switch ((type || '').toLowerCase()) {
            case 'campaign finance violation': return '💰';
            case 'election fraud': return '🗳️';
            case 'ethics violation': return '⚖️';
            case 'misinformation': return '❗';
            case 'illegal advertising': return '📢';
            case 'voter intimidation': return '😠';
            case 'conflict of interest': return '🤝';
            default: return '📋';
        }
    }

    getVerificationTypeIcon(type) {
        switch ((type || '').toLowerCase()) {
            case 'identity verification': return '🆔';
            case 'eligibility check': return '✅';
            case 'background check': return '🔍';
            case 'document verification': return '📄';
            case 'reference check': return '👥';
            case 'credential verification': return '🎓';
            default: return '🔍';
        }
    }

    renderDocumentTypes(documents) {
        if (!documents || documents.length === 0) {
            return '<span class="no-docs">No documents</span>';
        }

        return documents.slice(0, 3).map(doc =>
            `<span class="doc-type-badge">${doc.type}</span>`
        ).join('') + (documents.length > 3 ? `<span class="more-docs">+${documents.length - 3} more</span>` : '');
    }

    getBackgroundCheckStatus(bgCheck) {
        if (!bgCheck) return '<span class="bg-check pending">⏳ Pending</span>';

        switch (bgCheck.status) {
            case 'passed':
                return '<span class="bg-check passed">✅ Passed</span>';
            case 'failed':
                return '<span class="bg-check failed">❌ Failed</span>';
            case 'reviewing':
                return '<span class="bg-check reviewing">🔍 Reviewing</span>';
            default:
                return '<span class="bg-check pending">⏳ Pending</span>';
        }
    }

    getCampaignStatus(campaign) {
        if (!campaign) return '<span class="campaign-status inactive">Inactive</span>';

        return `
            <div class="campaign-status-info">
                <span class="campaign-status ${campaign.status}">${campaign.status}</span>
                <span class="campaign-phase">${campaign.phase || 'Planning'}</span>
                ${campaign.fundraisingGoal ? `<span class="fundraising-goal">Goal: $${this.formatCurrency(campaign.fundraisingGoal)}</span>` : ''}
            </div>
        `;
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

    renderRegistrationTrend(trend) {
        if (!trend || trend.length === 0) {
            return '<div class="no-data">No trend data available</div>';
        }

        // Simple text-based trend chart
        return trend.map((point, index) => `
            <div class="trend-point">
                <span class="trend-date">${point.date}</span>
                <span class="trend-value">${point.registrations}</span>
                <div class="trend-bar" style="width: ${(point.registrations / Math.max(...trend.map(p => p.registrations))) * 100}%"></div>
            </div>
        `).join('');
    }

    renderOfficeDistribution(distribution) {
        if (!distribution || Object.keys(distribution).length === 0) {
            return '<div class="no-data">No office data available</div>';
        }

        return Object.entries(distribution)
            .sort(([,a], [,b]) => b - a)
            .map(([office, count]) => `
                <div class="office-distribution-item">
                    <span class="office-label">${office}</span>
                    <span class="office-count">${count}</span>
                    <div class="office-bar">
                        <div class="office-fill" style="width: ${(count / Math.max(...Object.values(distribution))) * 100}%"></div>
                    </div>
                </div>
            `).join('');
    }

    renderComplianceBreakdown(breakdown) {
        if (!breakdown) {
            return '<div class="no-data">No compliance data available</div>';
        }

        return `
            <div class="compliance-breakdown">
                <div class="compliance-item compliant">
                    <span class="status-label">✅ Compliant</span>
                    <span class="status-count">${breakdown.compliant || 0}</span>
                </div>
                <div class="compliance-item warning">
                    <span class="status-label">⚠️ Minor Issues</span>
                    <span class="status-count">${breakdown.minorIssues || 0}</span>
                </div>
                <div class="compliance-item critical">
                    <span class="status-label">🚨 Critical Issues</span>
                    <span class="status-count">${breakdown.criticalIssues || 0}</span>
                </div>
            </div>
        `;
    }

    renderVerificationChecklist(requirements) {
        if (!requirements) return '<div class="no-requirements">No requirements specified</div>';

        return requirements.map(req => `
            <div class="checklist-item ${req.status}">
                <span class="check-icon">${req.status === 'complete' ? '✅' : req.status === 'pending' ? '⏳' : '❌'}</span>
                <span class="check-label">${req.label}</span>
                ${req.notes ? `<span class="check-notes">${req.notes}</span>` : ''}
            </div>
        `).join('');
    }

    renderRequirementsCheck(requirements) {
        if (!requirements) return '<span class="requirements unknown">❓ Unknown</span>';

        const completed = requirements.filter(req => req.status === 'complete').length;
        const total = requirements.length;
        const percentage = Math.round((completed / total) * 100);

        return `
            <div class="requirements-status">
                <span class="requirements-progress">${completed}/${total}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="requirements-percentage">${percentage}%</span>
            </div>
        `;
    }

    renderDocumentViewer(document) {
        if (!document) return '<div class="no-document">No document selected</div>';

        return `
            <div class="document-viewer-content">
                <div class="document-header">
                    <h5>${document.type}</h5>
                    <span class="document-date">Uploaded: ${this.formatTimestamp(document.uploadedAt)}</span>
                </div>
                <div class="document-body">
                    ${document.contentType === 'image' ?
                        `<img src="${document.url}" alt="${document.type}" class="document-image">` :
                        `<iframe src="${document.url}" class="document-iframe"></iframe>`
                    }
                </div>
                <div class="document-actions">
                    <button onclick="window.open('${document.url}', '_blank')" class="doc-action-btn">🔗 Open in New Tab</button>
                    <button onclick="window.candidatesController.downloadDocument('${document.id}')" class="doc-action-btn">💾 Download</button>
                    <button onclick="window.candidatesController.annotateDocument('${document.id}')" class="doc-action-btn">✏️ Annotate</button>
                </div>
            </div>
        `;
    }

    renderBackgroundCheckResults(bgCheck) {
        if (!bgCheck) return '<div class="no-bg-check">Background check not initiated</div>';

        return `
            <div class="background-check-results">
                <div class="bg-check-status ${bgCheck.status}">
                    <span class="status-icon">${this.getStatusIcon(bgCheck.status)}</span>
                    <span class="status-text">${bgCheck.status}</span>
                </div>
                ${bgCheck.summary ? `<div class="bg-check-summary">${bgCheck.summary}</div>` : ''}
                ${bgCheck.findings && bgCheck.findings.length > 0 ? `
                    <div class="bg-check-findings">
                        <h6>Findings:</h6>
                        <ul>
                            ${bgCheck.findings.map(finding => `<li class="${finding.severity}">${finding.description}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div class="bg-check-meta">
                    <span class="check-date">Date: ${this.formatTimestamp(bgCheck.completedAt)}</span>
                    <span class="check-provider">Provider: ${bgCheck.provider || 'Internal'}</span>
                </div>
            </div>
        `;
    }

    renderEligibilityCheck(eligibility) {
        if (!eligibility) return '<div class="no-eligibility">Eligibility not verified</div>';

        return `
            <div class="eligibility-check-results">
                <div class="eligibility-status ${eligibility.status}">
                    <span class="status-icon">${eligibility.status === 'eligible' ? '✅' : '❌'}</span>
                    <span class="status-text">${eligibility.status}</span>
                </div>
                <div class="eligibility-requirements">
                    ${eligibility.requirements.map(req => `
                        <div class="eligibility-req ${req.met ? 'met' : 'not-met'}">
                            <span class="req-icon">${req.met ? '✅' : '❌'}</span>
                            <span class="req-text">${req.requirement}</span>
                            ${req.verification ? `<span class="req-verification">${req.verification}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Additional helper methods for tab-specific operations

    setupRegistrationTableInteractions() {
        // Set up selection and bulk actions for registrations tab
        this.setupTableSelectionHandlers('registrations');
    }

    setupProfileTableInteractions() {
        // Set up selection and bulk actions for profiles tab
        this.setupTableSelectionHandlers('profiles');
    }

    setupReportTableInteractions() {
        // Set up selection and bulk actions for reports tab
        this.setupTableSelectionHandlers('reports');
    }

    setupVerificationTableInteractions() {
        // Set up selection and bulk actions for verification tab
        this.setupTableSelectionHandlers('verification');
    }

    setupTableSelectionHandlers(tabType) {
        // Common selection handling for all tabs
        const checkboxes = document.querySelectorAll('.candidate-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = e.target.value;
                if (e.target.checked) {
                    this.selectedCandidates.add(itemId);
                } else {
                    this.selectedCandidates.delete(itemId);
                }
                this.updateSelectionUI();
            });
        });

        // Select all handling
        const selectAllHeader = document.getElementById(`selectAll${tabType.charAt(0).toUpperCase() + tabType.slice(1)}Header`);
        if (selectAllHeader) {
            selectAllHeader.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Bulk action handling
        const bulkActionSelect = document.getElementById(`${tabType}BulkActionSelect`);
        if (bulkActionSelect) {
            bulkActionSelect.addEventListener('change', () => {
                const bulkActionBtn = document.getElementById(`${tabType}BulkActionBtn`);
                if (bulkActionBtn) {
                    bulkActionBtn.disabled = !bulkActionSelect.value || this.selectedCandidates.size === 0;
                }
            });
        }
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.candidate-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const itemId = checkbox.value;
            if (checked) {
                this.selectedCandidates.add(itemId);
            } else {
                this.selectedCandidates.delete(itemId);
            }
        });
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectionCount = document.querySelector('.selection-count');
        if (selectionCount) {
            selectionCount.textContent = `${this.selectedCandidates.size} selected`;
        }

        // Update bulk action button state for current tab
        const bulkActionBtn = document.getElementById(`${this.currentTab}BulkActionBtn`);
        const bulkActionSelect = document.getElementById(`${this.currentTab}BulkActionSelect`);
        if (bulkActionBtn) {
            bulkActionBtn.disabled = this.selectedCandidates.size === 0 || !bulkActionSelect?.value;
        }
    }

    getBulkRegistrationMessage(action) {
        switch (action) {
            case 'approve':
                return 'All selected registrations will be approved and candidates will be notified.\n\nThis action requires TOTP verification. Continue?';
            case 'reject':
                return 'All selected registrations will be rejected and candidates will be notified.\n\nThis action requires TOTP verification. Continue?';
            case 'request-docs':
                return 'Additional document requests will be sent to all selected candidates.\n\nContinue?';
            case 'flag-review':
                return 'All selected registrations will be flagged for manual review.\n\nContinue?';
            default:
                return 'This bulk action will be applied to all selected registrations.\n\nContinue?';
        }
    }

    getBulkProfileMessage(action) {
        switch (action) {
            case 'update-visibility':
                return 'Profile visibility settings will be updated for all selected candidates.\n\nContinue?';
            case 'verify-social':
                return 'Social media verification will be initiated for all selected candidates.\n\nContinue?';
            case 'compliance-check':
                return 'Compliance checks will be run for all selected candidates.\n\nContinue?';
            case 'suspend-campaign':
                return 'Campaign activities will be suspended for all selected candidates.\n\nThis action requires TOTP verification. Continue?';
            default:
                return 'This bulk action will be applied to all selected candidate profiles.\n\nContinue?';
        }
    }

    getBulkReportMessage(action) {
        switch (action) {
            case 'dismiss':
                return 'All selected reports will be dismissed.\n\nContinue?';
            case 'investigate':
                return 'Investigations will be initiated for all selected reports.\n\nContinue?';
            case 'escalate':
                return 'All selected reports will be escalated to the FEC.\n\nThis action requires TOTP verification. Continue?';
            case 'compliance-review':
                return 'Compliance reviews will be initiated for all selected reports.\n\nContinue?';
            default:
                return 'This bulk action will be applied to all selected reports.\n\nContinue?';
        }
    }

    getBulkVerificationMessage(action) {
        switch (action) {
            case 'approve':
                return 'All selected verifications will be approved.\n\nThis action requires TOTP verification. Continue?';
            case 'reject':
                return 'All selected verifications will be rejected.\n\nThis action requires TOTP verification. Continue?';
            case 'request-info':
                return 'Additional information requests will be sent for all selected verifications.\n\nContinue?';
            case 'manual-review':
                return 'All selected verifications will be flagged for manual review.\n\nContinue?';
            default:
                return 'This bulk action will be applied to all selected verifications.\n\nContinue?';
        }
    }

    updateLastRefreshTime() {
        const refreshTimeElement = document.getElementById('candidatesLastRefreshTime');
        if (refreshTimeElement) {
            const now = new Date();
            refreshTimeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('candidatesError');
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
    async destroy() {
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
        const refreshBtn = document.getElementById('refreshCandidatesBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.handleRefresh);
        }

        // Clear data
        this.currentCandidates = {
            registrations: [],
            profiles: [],
            reports: [],
            verification: []
        };
        this.currentAnalytics = {};
        this.selectedCandidates.clear();
        this.isInitialized = false;

        await adminDebugLog('CandidatesController', 'Controller destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CandidatesController;
} else {
    window.CandidatesController = CandidatesController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.candidatesController = new CandidatesController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.candidatesController = new CandidatesController();
            }
        }, 100);
    });
}