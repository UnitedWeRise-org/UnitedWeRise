/**
 * ReportsController - Handles admin dashboard reports section
 * Extracted from admin-dashboard.html reports management functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 2.4 - Final controller completion for comprehensive reports management
 */

class ReportsController {
    constructor() {
        this.sectionId = 'reports';
        this.isInitialized = false;
        this.currentReports = [];
        this.currentAnalytics = {};
        this.reportFilters = {
            status: 'all',
            type: 'all',
            priority: 'all',
            reporter: '',
            dateRange: '7'
        };
        this.refreshInterval = null;
        this.selectedReports = new Set();

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayReportsData = this.displayReportsData.bind(this);
        this.displayReportsQueue = this.displayReportsQueue.bind(this);
        this.displayReportsAnalytics = this.displayReportsAnalytics.bind(this);
        this.handleReportReview = this.handleReportReview.bind(this);
        this.handleBulkActions = this.handleBulkActions.bind(this);
        this.takeReportAction = this.takeReportAction.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
    }

    /**
     * Initialize the reports controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for reports
            if (window.AdminState) {
                window.AdminState.displayReportsData = this.displayReportsData.bind(this);
                window.AdminState.displayReportsQueue = this.displayReportsQueue.bind(this);
                window.AdminState.displayReportsAnalytics = this.displayReportsAnalytics.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Set up data-action event delegation
            await this.setupDataActionDelegation();

            // Use cached data from batch call (avoid immediate API call during login)
            // The batch call in AdminModuleLoader already fetched reports data
            if (window.AdminState && window.AdminState.cache.reports) {
                await this.displayReportsData(window.AdminState.cache.reports);
                await adminDebugLog('ReportsController', 'Using cached reports data from batch call');
            } else {
                // Fallback: load data if cache not available
                await this.loadData();
            }

            // Set up automatic refresh
            this.setupAutoRefresh();

            this.isInitialized = true;

            await adminDebugLog('ReportsController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing ReportsController:', error);
            await adminDebugError('ReportsController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for reports section
     */
    async setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshReportsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefresh);
        }

        // Report type filter
        const typeFilter = document.getElementById('reportTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.reportFilters.type = typeFilter.value;
                this.handleFilterChange();
            });
        }

        // Report status filter
        const statusFilter = document.getElementById('reportStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.reportFilters.status = statusFilter.value;
                this.handleFilterChange();
            });
        }

        // Priority filter
        const priorityFilter = document.getElementById('reportPriorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                this.reportFilters.priority = priorityFilter.value;
                this.handleFilterChange();
            });
        }

        // Date range filter
        const dateRangeFilter = document.getElementById('reportDateRangeFilter');
        if (dateRangeFilter) {
            dateRangeFilter.addEventListener('change', () => {
                this.reportFilters.dateRange = dateRangeFilter.value;
                this.handleFilterChange();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('reportsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(async () => {
                    this.reportFilters.reporter = e.target.value;
                    await this.filterReportsData();
                }, 300);
            });
        }

        // Bulk action buttons
        const bulkActionBtn = document.getElementById('bulkActionBtn');
        if (bulkActionBtn) {
            bulkActionBtn.addEventListener('click', this.handleBulkActions);
        }

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllReports');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Export reports button
        const exportBtn = document.getElementById('exportReportsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportReports();
            });
        }

        await adminDebugLog('ReportsController', 'Event listeners set up successfully');
    }

    /**
     * Set up comprehensive data-action event delegation system
     * Professional architecture - centralized event handling
     */
    async setupDataActionDelegation() {
        // Remove any existing delegation to prevent duplicates
        document.removeEventListener('click', this.handleDataActionClick);

        // Bind the handler to preserve context
        this.handleDataActionClick = this.handleDataActionClick.bind(this);

        // Set up global delegation for all data-action elements
        document.addEventListener('click', this.handleDataActionClick);

        await adminDebugLog('ReportsController', 'Data-action event delegation established successfully');
    }

    /**
     * Centralized data-action click handler
     * Routes all data-action events to appropriate methods
     */
    async handleDataActionClick(event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const action = button.getAttribute('data-action');
        if (!action) return;

        // Prevent default behavior and event bubbling
        event.preventDefault();
        event.stopPropagation();

        try {
            switch (action) {
                case 'review-report':
                    await this.handleReportReview(button.getAttribute('data-report-id'));
                    break;

                case 'take-report-action':
                    await this.takeReportAction(
                        button.getAttribute('data-report-id'),
                        button.getAttribute('data-report-action')
                    );
                    break;

                case 'view-report-history':
                    await this.viewReportHistory(button.getAttribute('data-report-id'));
                    break;

                case 'close-modal':
                    this.handleCloseModal(button);
                    break;

                default:
                    console.warn(`Unknown data-action: ${action}`);
                    await adminDebugWarn('ReportsController', `Unknown data-action encountered: ${action}`);
            }
        } catch (error) {
            console.error(`Error handling data-action ${action}:`, error);
            await adminDebugError('ReportsController', `Data-action ${action} failed`, error);
        }
    }

    /**
     * Handle modal closure
     */
    handleCloseModal(button) {
        const modal = button.closest('.report-details-modal, .modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Set up automatic refresh for reports data
     */
    setupAutoRefresh() {
        // Refresh reports data every 60 seconds
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadData(false); // Force fresh data
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, 60000);
    }

    /**
     * Load reports data
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                await window.AdminState.loadReportsData(this.reportFilters, useCache);
            } else {
                // Fallback to direct API calls
                await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading reports data:', error);
            this.showError('Failed to load reports data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            const [reportsQueue, analytics, reportTypes] = await Promise.all([
                window.AdminAPI.getReportsQueue(this.reportFilters),
                window.AdminAPI.getReportsAnalytics(this.reportFilters.dateRange),
                window.AdminAPI.getReportTypes()
            ]);

            this.displayReportsData({
                queue: reportsQueue.data || [],
                analytics: analytics.data || {},
                types: reportTypes.data || []
            });

        } catch (error) {
            console.error('Fallback reports data loading failed:', error);
            throw error;
        }
    }

    /**
     * Handle manual refresh
     */
    async handleRefresh() {
        try {
            const refreshBtn = document.getElementById('refreshReportsBtn');
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Refreshing...';
            }

            await this.loadData(false); // Force fresh data

            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh';
            }

            await adminDebugLog('ReportsController', 'Manual refresh completed');
        } catch (error) {
            console.error('Manual refresh failed:', error);
            await adminDebugError('ReportsController', 'Manual refresh failed', error);
        }
    }

    /**
     * Display reports data in the UI
     */
    async displayReportsData(data) {
        try {
            if (!data) {
                console.warn('No reports data available');
                return;
            }

            // Store current data
            this.currentReports = data.queue || [];
            this.currentAnalytics = data.analytics || {};

            // Display reports analytics dashboard
            await this.displayReportsAnalytics(data.analytics);

            // Display reports queue table
            await this.displayReportsQueue(data.queue);

            // Update last refresh time
            this.updateLastRefreshTime();

            await adminDebugLog('ReportsController', 'Reports data displayed', {
                queueCount: data.queue?.length || 0,
                pendingCount: data.queue?.filter(r => r.status === 'pending')?.length || 0,
                resolvedCount: data.queue?.filter(r => r.status === 'resolved')?.length || 0
            });

        } catch (error) {
            console.error('Error displaying reports data:', error);
            await adminDebugError('ReportsController', 'Failed to display reports data', error);
        }
    }

    /**
     * Display reports analytics dashboard
     */
    async displayReportsAnalytics(analytics) {
        try {
            const analyticsContainer = document.getElementById('reportsAnalytics');
            if (!analyticsContainer) {
                console.warn('Reports analytics container not found');
                return;
            }

            const totalReports = analytics.totalReports || 0;
            const pendingReports = analytics.pendingReports || 0;
            const resolvedReports = analytics.resolvedReports || 0;
            const avgResolutionTime = analytics.avgResolutionTime || 0;
            const reportsTrend = analytics.reportsTrend || 0;

            const analyticsHtml = `
                <div class="reports-analytics-grid">
                    <div class="analytics-card primary">
                        <div class="card-header">
                            <h3>📊 Total Reports</h3>
                            <span class="period">${this.reportFilters.dateRange} days</span>
                        </div>
                        <div class="card-value">${this.formatNumber(totalReports)}</div>
                        <div class="card-trend ${reportsTrend >= 0 ? 'up' : 'down'}">
                            ${reportsTrend >= 0 ? '↗️' : '↘️'} ${Math.abs(reportsTrend)}% from last period
                        </div>
                    </div>

                    <div class="analytics-card urgent">
                        <div class="card-header">
                            <h3>⏳ Pending Reports</h3>
                            <span class="priority-badge">Needs Action</span>
                        </div>
                        <div class="card-value">${pendingReports}</div>
                        <div class="card-subtext">
                            ${analytics.highPriorityPending || 0} high priority
                        </div>
                    </div>

                    <div class="analytics-card success">
                        <div class="card-header">
                            <h3>✅ Resolved Reports</h3>
                        </div>
                        <div class="card-value">${resolvedReports}</div>
                        <div class="card-subtext">
                            ${analytics.resolutionRate || 0}% resolution rate
                        </div>
                    </div>

                    <div class="analytics-card info">
                        <div class="card-header">
                            <h3>⏱️ Avg Resolution Time</h3>
                        </div>
                        <div class="card-value">${this.formatDuration(avgResolutionTime)}</div>
                        <div class="card-subtext">
                            Target: ${analytics.targetResolutionTime || '24h'}
                        </div>
                    </div>

                    <div class="analytics-card category">
                        <div class="card-header">
                            <h3>🏷️ Top Report Type</h3>
                        </div>
                        <div class="card-value">${analytics.topReportType || 'N/A'}</div>
                        <div class="card-subtext">
                            ${analytics.topReportTypeCount || 0} reports
                        </div>
                    </div>

                    <div class="analytics-card geographic">
                        <div class="card-header">
                            <h3>🌍 Geographic Distribution</h3>
                        </div>
                        <div class="card-value">${analytics.topReportLocation || 'N/A'}</div>
                        <div class="card-subtext">
                            ${analytics.geographicSpread || 0} countries
                        </div>
                    </div>
                </div>

                <div class="reports-charts-section">
                    <div class="chart-container">
                        <h4>📈 Reports Trend (Last 30 Days)</h4>
                        <div id="reportsTrendChart" class="chart-placeholder">
                            Chart will be rendered here
                        </div>
                    </div>
                    <div class="chart-container">
                        <h4>🏷️ Report Categories Breakdown</h4>
                        <div id="reportsCategoriesChart" class="chart-placeholder">
                            ${this.renderCategoriesBreakdown(analytics.categoryBreakdown)}
                        </div>
                    </div>
                </div>
            `;

            analyticsContainer.innerHTML = analyticsHtml;

        } catch (error) {
            console.error('Error displaying reports analytics:', error);
            await adminDebugError('ReportsController', 'Failed to display reports analytics', error);
        }
    }

    /**
     * Display reports queue table
     */
    async displayReportsQueue(reports) {
        try {
            const container = document.getElementById('reportsQueueTable');
            if (!container) {
                console.warn('Reports queue table container not found');
                return;
            }

            if (!reports || reports.length === 0) {
                container.innerHTML = '<div class="no-data">✅ No reports found matching current filters</div>';
                return;
            }

            const tableHtml = `
                <div class="reports-queue-controls">
                    <div class="selection-controls">
                        <label class="checkbox-container">
                            <input type="checkbox" id="selectAllReports">
                            <span class="checkmark"></span>
                            Select All
                        </label>
                        <span class="selection-count">${this.selectedReports.size} selected</span>
                    </div>
                    <div class="bulk-actions">
                        <select id="bulkActionSelect">
                            <option value="">Bulk Actions...</option>
                            <option value="dismiss">Dismiss Selected</option>
                            <option value="warn">Issue Warnings</option>
                            <option value="suspend">Suspend Users</option>
                            <option value="escalate">Escalate Reports</option>
                            <option value="merge">Merge Duplicates</option>
                        </select>
                        <button id="bulkActionBtn" class="action-btn bulk-btn" disabled>Apply</button>
                    </div>
                </div>

                <div class="reports-table-container">
                    <table class="reports-table">
                        <thead>
                            <tr>
                                <th class="checkbox-col">
                                    <input type="checkbox" id="selectAllReportsHeader">
                                </th>
                                <th class="sortable" data-sort="timestamp">⏰ Reported</th>
                                <th class="sortable" data-sort="type">🏷️ Type</th>
                                <th class="sortable" data-sort="priority">📌 Priority</th>
                                <th>👤 Reporter</th>
                                <th>🎯 Target</th>
                                <th>📋 Description</th>
                                <th class="sortable" data-sort="status">📊 Status</th>
                                <th>⚙️ Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.map(report => this.renderReportRow(report)).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="reports-pagination">
                    <div class="pagination-info">
                        Showing ${reports.length} of ${this.currentAnalytics.totalReports || reports.length} reports
                    </div>
                    <div class="pagination-controls">
                        <!-- Pagination controls would go here -->
                    </div>
                </div>
            `;

            container.innerHTML = tableHtml;

            // Set up table interactions
            this.setupTableInteractions();

        } catch (error) {
            console.error('Error displaying reports queue:', error);
            await adminDebugError('ReportsController', 'Failed to display reports queue', error);
        }
    }

    /**
     * Render individual report row
     */
    renderReportRow(report) {
        const priorityClass = this.getPriorityClass(report.priority);
        const statusClass = this.getStatusClass(report.status);
        const priorityIcon = this.getPriorityIcon(report.priority);
        const statusIcon = this.getStatusIcon(report.status);

        return `
            <tr data-report-id="${report.id}" class="report-row ${priorityClass} ${statusClass}">
                <td class="checkbox-col">
                    <label class="checkbox-container">
                        <input type="checkbox" value="${report.id}" class="report-checkbox">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="timestamp">
                    ${this.formatTimestamp(report.createdAt)}
                    <div class="time-ago">${this.getTimeAgo(report.createdAt)}</div>
                </td>
                <td class="report-type">
                    <span class="type-badge ${report.type.toLowerCase().replace(/\s+/g, '-')}">
                        ${this.getTypeIcon(report.type)} ${report.type}
                    </span>
                </td>
                <td class="priority">
                    <span class="priority-badge ${priorityClass}">
                        ${priorityIcon} ${report.priority}
                    </span>
                </td>
                <td class="reporter">
                    <div class="user-info">
                        <span class="username">${report.reporter?.username || 'Anonymous'}</span>
                        <span class="user-id">ID: ${report.reporter?.id || 'N/A'}</span>
                    </div>
                </td>
                <td class="target">
                    <div class="target-info">
                        <span class="target-type">${report.targetType}</span>
                        <span class="target-id">ID: ${report.targetId}</span>
                        ${report.targetUser ? `<span class="target-user">@${report.targetUser.username}</span>` : ''}
                    </div>
                </td>
                <td class="description">
                    <div class="description-text" title="${report.description}">
                        ${this.truncateText(report.description, 60)}
                    </div>
                    ${report.evidence ? '<span class="evidence-badge">📎 Evidence</span>' : ''}
                </td>
                <td class="status">
                    <span class="status-badge ${statusClass}">
                        ${statusIcon} ${report.status}
                    </span>
                    ${report.assignedTo ? `<div class="assigned-to">👤 ${report.assignedTo.username}</div>` : ''}
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button data-action="review-report" data-report-id="${report.id}"
                                class="action-btn review-btn" title="Review Report">
                            🔍 Review
                        </button>
                        ${report.status === 'pending' ? `
                            <button data-action="take-report-action" data-report-id="${report.id}" data-report-action="dismiss"
                                    class="action-btn dismiss-btn" title="Dismiss Report">
                                ❌ Dismiss
                            </button>
                            <button data-action="take-report-action" data-report-id="${report.id}" data-report-action="warn"
                                    class="action-btn warn-btn" title="Issue Warning">
                                ⚠️ Warn
                            </button>
                            <button data-action="take-report-action" data-report-id="${report.id}" data-report-action="suspend"
                                    class="action-btn suspend-btn" title="Suspend User">
                                🚫 Suspend
                            </button>
                        ` : ''}
                        <button data-action="view-report-history" data-report-id="${report.id}"
                                class="action-btn history-btn" title="View History">
                            📋 History
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Set up table interactions (sorting, selection, etc.)
     */
    setupTableInteractions() {
        // Set up report selection checkboxes
        const checkboxes = document.querySelectorAll('.report-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const reportId = e.target.value;
                if (e.target.checked) {
                    this.selectedReports.add(reportId);
                } else {
                    this.selectedReports.delete(reportId);
                }
                this.updateSelectionUI();
            });
        });

        // Set up select all functionality
        const selectAllHeader = document.getElementById('selectAllReportsHeader');
        if (selectAllHeader) {
            selectAllHeader.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Set up sorting
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', async () => {
                const sortBy = header.dataset.sort;
                await this.sortReports(sortBy);
            });
        });

        // Set up bulk action dropdown
        const bulkActionSelect = document.getElementById('bulkActionSelect');
        if (bulkActionSelect) {
            bulkActionSelect.addEventListener('change', () => {
                const bulkActionBtn = document.getElementById('bulkActionBtn');
                if (bulkActionBtn) {
                    bulkActionBtn.disabled = !bulkActionSelect.value || this.selectedReports.size === 0;
                }
            });
        }
    }

    /**
     * Handle report review - show detailed report information
     */
    async handleReportReview(reportId) {
        try {
            const response = await window.AdminAPI.getReportDetails(reportId);

            if (response.success) {
                const report = response.data;
                this.showReportDetailsModal(report);

                await adminDebugLog('ReportsController', 'Report reviewed', { reportId });
            } else {
                throw new Error(response.error || 'Failed to get report details');
            }

        } catch (error) {
            console.error('Error reviewing report:', error);
            alert(`❌ Failed to load report details: ${error.message}`);
            await adminDebugError('ReportsController', 'Report review failed', error);
        }
    }

    /**
     * Show detailed report information in a modal
     */
    showReportDetailsModal(report) {
        const modalHtml = `
            <div class="report-details-modal">
                <div class="modal-header">
                    <h3>🔍 Report Details</h3>
                    <button class="close-modal" data-action="close-modal">✕</button>
                </div>
                <div class="modal-content">
                    <div class="report-info-grid">
                        <div class="info-section">
                            <h4>📋 Basic Information</h4>
                            <div class="info-item">
                                <label>Report ID:</label>
                                <span>${report.id}</span>
                            </div>
                            <div class="info-item">
                                <label>Type:</label>
                                <span class="type-badge">${this.getTypeIcon(report.type)} ${report.type}</span>
                            </div>
                            <div class="info-item">
                                <label>Priority:</label>
                                <span class="priority-badge ${this.getPriorityClass(report.priority)}">
                                    ${this.getPriorityIcon(report.priority)} ${report.priority}
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Status:</label>
                                <span class="status-badge ${this.getStatusClass(report.status)}">
                                    ${this.getStatusIcon(report.status)} ${report.status}
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Reported:</label>
                                <span>${this.formatTimestamp(report.createdAt)}</span>
                            </div>
                        </div>

                        <div class="info-section">
                            <h4>👤 Reporter Information</h4>
                            <div class="info-item">
                                <label>Username:</label>
                                <span>${report.reporter?.username || 'Anonymous'}</span>
                            </div>
                            <div class="info-item">
                                <label>User ID:</label>
                                <span>${report.reporter?.id || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <label>Email:</label>
                                <span>${report.reporter?.email || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <label>Previous Reports:</label>
                                <span>${report.reporter?.previousReports || 0}</span>
                            </div>
                        </div>

                        <div class="info-section">
                            <h4>🎯 Target Information</h4>
                            <div class="info-item">
                                <label>Target Type:</label>
                                <span>${report.targetType}</span>
                            </div>
                            <div class="info-item">
                                <label>Target ID:</label>
                                <span>${report.targetId}</span>
                            </div>
                            ${report.targetUser ? `
                                <div class="info-item">
                                    <label>Target User:</label>
                                    <span>@${report.targetUser.username}</span>
                                </div>
                                <div class="info-item">
                                    <label>User Reputation:</label>
                                    <span>${report.targetUser.reputation || 0}</span>
                                </div>
                            ` : ''}
                            ${report.targetPost ? `
                                <div class="info-item">
                                    <label>Post Content:</label>
                                    <span class="content-preview">${this.truncateText(report.targetPost.content, 100)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="report-description-section">
                        <h4>📝 Report Description</h4>
                        <div class="description-content">
                            ${report.description}
                        </div>
                    </div>

                    ${report.evidence ? `
                        <div class="evidence-section">
                            <h4>📎 Evidence</h4>
                            <div class="evidence-content">
                                ${this.renderEvidence(report.evidence)}
                            </div>
                        </div>
                    ` : ''}

                    ${report.history && report.history.length > 0 ? `
                        <div class="history-section">
                            <h4>📋 Action History</h4>
                            <div class="history-timeline">
                                ${report.history.map(item => `
                                    <div class="history-item">
                                        <div class="history-timestamp">${this.formatTimestamp(item.timestamp)}</div>
                                        <div class="history-action">${item.action}</div>
                                        <div class="history-admin">by ${item.admin?.username || 'System'}</div>
                                        ${item.notes ? `<div class="history-notes">${item.notes}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    ${report.status === 'pending' ? `
                        <button data-action="take-report-action" data-report-id="${report.id}" data-report-action="dismiss"
                                class="action-btn dismiss-btn">❌ Dismiss</button>
                        <button data-action="take-report-action" data-report-id="${report.id}" data-report-action="warn"
                                class="action-btn warn-btn">⚠️ Issue Warning</button>
                        <button data-action="take-report-action" data-report-id="${report.id}" data-report-action="suspend"
                                class="action-btn suspend-btn">🚫 Suspend User</button>
                        <button data-action="take-report-action" data-report-id="${report.id}" data-report-action="escalate"
                                class="action-btn escalate-btn">🚨 Escalate</button>
                    ` : ''}
                    <button data-action="close-modal"
                            class="action-btn secondary-btn">Close</button>
                </div>
            </div>
        `;

        // Show modal (append to body or modal container)
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-overlay';
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Close modal when clicking overlay
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
    }

    /**
     * Take action on a report (dismiss, warn, suspend, etc.)
     */
    async takeReportAction(reportId, action, additionalData = {}) {
        try {
            let confirmMessage = '';
            let requiresTOTP = false;

            switch (action) {
                case 'dismiss':
                    confirmMessage = `❌ DISMISS REPORT\n\nReport ID: ${reportId}\n\nThis report will be marked as dismissed and no further action will be taken.\n\nContinue?`;
                    break;
                case 'warn':
                    confirmMessage = `⚠️ ISSUE WARNING\n\nReport ID: ${reportId}\n\nA formal warning will be issued to the reported user.\n\nContinue?`;
                    requiresTOTP = true;
                    break;
                case 'suspend':
                    confirmMessage = `🚫 SUSPEND USER\n\nReport ID: ${reportId}\n\nThe reported user will be suspended from the platform.\n\nThis action requires TOTP verification. Continue?`;
                    requiresTOTP = true;
                    break;
                case 'escalate':
                    confirmMessage = `🚨 ESCALATE REPORT\n\nReport ID: ${reportId}\n\nThis report will be escalated to senior moderators for review.\n\nContinue?`;
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            if (!confirm(confirmMessage)) {
                return;
            }

            let totpToken = null;
            if (requiresTOTP) {
                // Request TOTP confirmation for sensitive actions
                const totpResult = await requestTOTPConfirmation(
                    `${action.charAt(0).toUpperCase() + action.slice(1)} reported user`,
                    { additionalInfo: `Report ID: ${reportId}` }
                );
                totpToken = totpResult.totpToken;
            }

            // Get additional information if needed
            let actionData = { ...additionalData };
            if (action === 'warn' || action === 'suspend') {
                const reason = prompt(`Enter reason for ${action}:`, actionData.reason || '');
                if (!reason || reason.trim().length < 5) {
                    alert(`❌ ${action.charAt(0).toUpperCase() + action.slice(1)} reason is required and must be at least 5 characters`);
                    return;
                }
                actionData.reason = reason.trim();
            }

            if (action === 'suspend') {
                const duration = prompt('Enter suspension duration (hours):', actionData.duration || '24');
                if (!duration || isNaN(duration) || duration <= 0) {
                    alert('❌ Invalid suspension duration');
                    return;
                }
                actionData.duration = parseInt(duration);
            }

            // Perform the action
            const response = await window.AdminAPI.takeReportAction(reportId, action, {
                ...actionData,
                totpToken,
                adminUserId: window.adminAuth.getCurrentUser()?.id
            });

            if (response.success) {
                alert(`✅ ${action.charAt(0).toUpperCase() + action.slice(1)} action completed successfully\n\nAction ID: ${response.actionId}`);

                // Close any open modals
                const modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(modal => modal.remove());

                // Refresh reports data
                await this.loadData(false);

                await adminDebugLog('ReportsController', 'Report action taken', {
                    reportId,
                    action,
                    actionId: response.actionId
                });
            } else {
                throw new Error(response.error || `Failed to ${action} report`);
            }

        } catch (error) {
            console.error(`Error taking ${action} action:`, error);
            alert(`❌ Failed to ${action} report: ${error.message}`);
            await adminDebugError('ReportsController', `Report ${action} action failed`, error);
        }
    }

    /**
     * Handle bulk actions on selected reports
     */
    async handleBulkActions() {
        try {
            const actionSelect = document.getElementById('bulkActionSelect');
            const action = actionSelect?.value;

            if (!action) {
                alert('❌ Please select a bulk action');
                return;
            }

            if (this.selectedReports.size === 0) {
                alert('❌ Please select reports to perform bulk action');
                return;
            }

            const reportIds = Array.from(this.selectedReports);
            let confirmMessage = `🔄 BULK ACTION: ${action.toUpperCase()}\n\nSelected Reports: ${reportIds.length}\nReport IDs: ${reportIds.join(', ')}\n\n`;

            switch (action) {
                case 'dismiss':
                    confirmMessage += 'All selected reports will be dismissed.\n\nContinue?';
                    break;
                case 'warn':
                    confirmMessage += 'Warnings will be issued to all reported users.\n\nThis action requires TOTP verification. Continue?';
                    break;
                case 'suspend':
                    confirmMessage += 'All reported users will be suspended.\n\nThis action requires TOTP verification. Continue?';
                    break;
                case 'escalate':
                    confirmMessage += 'All selected reports will be escalated.\n\nContinue?';
                    break;
                case 'merge':
                    confirmMessage += 'Selected reports will be merged as duplicates.\n\nContinue?';
                    break;
                default:
                    throw new Error(`Unknown bulk action: ${action}`);
            }

            if (!confirm(confirmMessage)) {
                return;
            }

            let totpToken = null;
            if (['warn', 'suspend'].includes(action)) {
                const totpResult = await requestTOTPConfirmation(
                    `Bulk ${action} action`,
                    { additionalInfo: `${reportIds.length} reports selected` }
                );
                totpToken = totpResult.totpToken;
            }

            // Perform bulk action
            const response = await window.AdminAPI.bulkReportAction(reportIds, action, {
                totpToken,
                adminUserId: window.adminAuth.getCurrentUser()?.id
            });

            if (response.success) {
                alert(`✅ Bulk ${action} completed successfully\n\nProcessed: ${response.processedCount} reports\nFailed: ${response.failedCount || 0} reports`);

                // Clear selection
                this.selectedReports.clear();
                this.updateSelectionUI();

                // Reset action dropdown
                actionSelect.value = '';

                // Refresh reports data
                await this.loadData(false);

                await adminDebugLog('ReportsController', 'Bulk action completed', {
                    action,
                    reportIds,
                    processedCount: response.processedCount,
                    failedCount: response.failedCount
                });
            } else {
                throw new Error(response.error || `Failed to perform bulk ${action}`);
            }

        } catch (error) {
            console.error('Error performing bulk action:', error);
            alert(`❌ Bulk action failed: ${error.message}`);
            await adminDebugError('ReportsController', 'Bulk action failed', error);
        }
    }

    /**
     * Handle filter changes
     */
    async handleFilterChange() {
        try {
            await this.loadData(false); // Force fresh data with new filters
            await adminDebugLog('ReportsController', 'Filters applied', this.reportFilters);
        } catch (error) {
            console.error('Error applying filters:', error);
        }
    }

    /**
     * Filter reports data locally
     */
    async filterReportsData() {
        let filteredReports = [...this.currentReports];

        // Apply reporter search filter
        if (this.reportFilters.reporter) {
            const searchTerm = this.reportFilters.reporter.toLowerCase();
            filteredReports = filteredReports.filter(report =>
                report.reporter?.username?.toLowerCase().includes(searchTerm) ||
                report.reporter?.email?.toLowerCase().includes(searchTerm) ||
                report.description?.toLowerCase().includes(searchTerm)
            );
        }

        await this.displayReportsQueue(filteredReports);
    }

    /**
     * Toggle select all reports
     */
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.report-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const reportId = checkbox.value;
            if (checked) {
                this.selectedReports.add(reportId);
            } else {
                this.selectedReports.delete(reportId);
            }
        });
        this.updateSelectionUI();
    }

    /**
     * Update selection UI elements
     */
    updateSelectionUI() {
        const selectionCount = document.querySelector('.selection-count');
        if (selectionCount) {
            selectionCount.textContent = `${this.selectedReports.size} selected`;
        }

        const bulkActionBtn = document.getElementById('bulkActionBtn');
        const bulkActionSelect = document.getElementById('bulkActionSelect');
        if (bulkActionBtn) {
            bulkActionBtn.disabled = this.selectedReports.size === 0 || !bulkActionSelect?.value;
        }
    }

    /**
     * Export reports data
     */
    async exportReports() {
        try {
            const response = await window.AdminAPI.exportReports(this.reportFilters);

            if (response.success) {
                // Create download link
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                await adminDebugLog('ReportsController', 'Reports exported successfully');
            } else {
                throw new Error(response.error || 'Failed to export reports');
            }

        } catch (error) {
            console.error('Error exporting reports:', error);
            alert(`❌ Failed to export reports: ${error.message}`);
        }
    }

    /**
     * View report history
     */
    async viewReportHistory(reportId) {
        try {
            const response = await window.AdminAPI.getReportHistory(reportId);

            if (response.success) {
                const history = response.data;
                const historyText = `
📋 REPORT HISTORY

Report ID: ${reportId}

${history.map(item => `
${this.formatTimestamp(item.timestamp)}
Action: ${item.action}
Admin: ${item.admin?.username || 'System'}
${item.notes ? `Notes: ${item.notes}` : ''}
---`).join('\n')}
                `;

                alert(historyText);
            } else {
                throw new Error(response.error || 'Failed to get report history');
            }

        } catch (error) {
            console.error('Error viewing report history:', error);
            alert(`❌ Failed to load report history: ${error.message}`);
        }
    }

    // Utility methods for UI formatting

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
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

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
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

    getStatusClass(status) {
        return `status-${(status || 'pending').toLowerCase()}`;
    }

    getStatusIcon(status) {
        switch ((status || 'pending').toLowerCase()) {
            case 'pending': return '⏳';
            case 'in-progress': return '🔄';
            case 'resolved': return '✅';
            case 'dismissed': return '❌';
            case 'escalated': return '🚨';
            default: return '📋';
        }
    }

    getTypeIcon(type) {
        switch ((type || '').toLowerCase()) {
            case 'harassment': return '😡';
            case 'spam': return '📧';
            case 'inappropriate content': return '🚫';
            case 'fake account': return '🎭';
            case 'copyright': return '©️';
            case 'privacy violation': return '🔒';
            case 'misinformation': return '❗';
            default: return '📋';
        }
    }

    renderCategoriesBreakdown(breakdown) {
        if (!breakdown || Object.keys(breakdown).length === 0) {
            return '<div class="no-data">No category data available</div>';
        }

        return Object.entries(breakdown)
            .sort(([,a], [,b]) => b - a)
            .map(([category, count]) => `
                <div class="category-item">
                    <span class="category-label">${this.getTypeIcon(category)} ${category}</span>
                    <span class="category-count">${count}</span>
                    <div class="category-bar">
                        <div class="category-fill" style="width: ${(count / Math.max(...Object.values(breakdown))) * 100}%"></div>
                    </div>
                </div>
            `).join('');
    }

    renderEvidence(evidence) {
        if (!evidence) return 'No evidence provided';

        if (typeof evidence === 'string') {
            return `<div class="evidence-text">${evidence}</div>`;
        }

        if (evidence.files && evidence.files.length > 0) {
            return evidence.files.map(file => `
                <div class="evidence-file">
                    <span class="file-icon">📎</span>
                    <span class="file-name">${file.name}</span>
                    <a href="${file.url}" target="_blank" class="file-link">View</a>
                </div>
            `).join('');
        }

        return 'Evidence format not supported';
    }

    async sortReports(sortBy) {
        // Sort the current reports array and re-display
        this.currentReports.sort((a, b) => {
            switch (sortBy) {
                case 'timestamp':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'priority':
                    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                    return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'type':
                    return a.type.localeCompare(b.type);
                default:
                    return 0;
            }
        });

        await this.displayReportsQueue(this.currentReports);
    }

    /**
     * Update last refresh time display
     */
    updateLastRefreshTime() {
        const refreshTimeElement = document.getElementById('reportsLastRefreshTime');
        if (refreshTimeElement) {
            const now = new Date();
            refreshTimeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('ReportsController Error:', message);

        const errorContainer = document.getElementById('reportsError');
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
        const refreshBtn = document.getElementById('refreshReportsBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.handleRefresh);
        }

        // Remove data-action event delegation
        if (this.handleDataActionClick) {
            document.removeEventListener('click', this.handleDataActionClick);
        }

        // Clear data
        this.currentReports = [];
        this.currentAnalytics = {};
        this.selectedReports.clear();
        this.isInitialized = false;

        console.log('ReportsController destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsController;
} else {
    window.ReportsController = ReportsController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.reportsController = new ReportsController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.reportsController = new ReportsController();
            }
        }, 100);
    });
}