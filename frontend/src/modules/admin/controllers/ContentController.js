/**
 * ContentController - Handles admin dashboard content moderation section
 * Extracted from admin-dashboard.html content management functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 2.2 - Content Moderation Controller Implementation
 */

class ContentController {
    constructor() {
        this.sectionId = 'content';
        this.isInitialized = false;
        this.currentReports = [];
        this.currentFlags = [];
        this.activeTab = 'userReports';
        this.selectedComments = new Set(); // Track selected comment IDs for batch deletion

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.loadUserReports = this.loadUserReports.bind(this);
        this.loadAIFlaggedContent = this.loadAIFlaggedContent.bind(this);
        this.showContentTab = this.showContentTab.bind(this);
        this.displayUserReports = this.displayUserReports.bind(this);
        this.displayUserReportStats = this.displayUserReportStats.bind(this);
        this.displayFlaggedContent = this.displayFlaggedContent.bind(this);
        this.showReportActionModal = this.showReportActionModal.bind(this);
        this.showReportDetailsModal = this.showReportDetailsModal.bind(this);
        this.processReportAction = this.processReportAction.bind(this);
        this.resolveFlag = this.resolveFlag.bind(this);
        this.toggleCommentSelection = this.toggleCommentSelection.bind(this);
        this.toggleAllComments = this.toggleAllComments.bind(this);
        this.deleteSelectedComments = this.deleteSelectedComments.bind(this);
        this.updateBatchDeleteButton = this.updateBatchDeleteButton.bind(this);
    }

    /**
     * Initialize the content controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for content
            if (window.AdminState) {
                window.AdminState.displayContentData = this.displayContentData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Load initial data
            await this.loadData();

            this.isInitialized = true;

            await adminDebugLog('ContentController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing ContentController:', error);
            await adminDebugError('ContentController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for content section
     */
    async setupEventListeners() {
        // Tab switching
        const userReportsTab = document.getElementById('userReportsTab');
        const aiFlagsTab = document.getElementById('aiFlagsTab');

        if (userReportsTab) {
            userReportsTab.removeAttribute('onclick');
            userReportsTab.addEventListener('click', () => this.showContentTab('userReports'));
        }

        if (aiFlagsTab) {
            aiFlagsTab.removeAttribute('onclick');
            aiFlagsTab.addEventListener('click', () => this.showContentTab('aiFlags'));
        }

        // Filter controls for user reports
        const statusFilter = document.getElementById('reportStatusFilter');
        const targetTypeFilter = document.getElementById('reportTargetTypeFilter');
        const priorityFilter = document.getElementById('reportPriorityFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                if (this.activeTab === 'userReports') {
                    this.loadUserReports();
                }
            });
        }

        if (targetTypeFilter) {
            targetTypeFilter.addEventListener('change', () => {
                if (this.activeTab === 'userReports') {
                    this.loadUserReports();
                }
            });
        }

        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                if (this.activeTab === 'userReports') {
                    this.loadUserReports();
                }
            });
        }

        // Search button for user reports
        const searchBtn = document.querySelector('#userReportsContent button');
        if (searchBtn && searchBtn.hasAttribute('onclick')) {
            searchBtn.removeAttribute('onclick');
            searchBtn.addEventListener('click', this.loadUserReports);
        }

        // Professional event delegation for dynamically generated content
        this.setupContentEventDelegation();

        await adminDebugLog('ContentController', 'Event listeners set up successfully');
    }

    /**
     * Set up sophisticated event delegation for dynamic content actions
     */
    setupContentEventDelegation() {
        // Remove any existing delegation listeners
        document.removeEventListener('click', this.handleContentActions);

        // Bind the handler to preserve context
        this.handleContentActions = this.handleContentActions.bind(this);

        // Set up unified event delegation for all content actions
        document.addEventListener('click', this.handleContentActions);

        // Handle modal close events specifically
        document.addEventListener('click', (event) => {
            const modalCloseBtn = event.target.closest('[data-action="close-modal"]');
            if (modalCloseBtn) {
                event.preventDefault();
                const modal = modalCloseBtn.closest('.modal-overlay');
                if (modal) {
                    modal.remove();
                }
            }
        });
    }

    /**
     * Handle all content-related actions through professional event delegation
     */
    handleContentActions(event) {
        const actionElement = event.target.closest('[data-action]');
        if (!actionElement) return;

        const action = actionElement.dataset.action;
        const targetId = actionElement.dataset.target;

        // Prevent default action
        event.preventDefault();

        // Route to appropriate handler based on action
        switch (action) {
            case 'show-report-action-modal':
                if (targetId) {
                    this.showReportActionModal(targetId);
                }
                break;

            case 'show-report-details-modal':
                if (targetId) {
                    this.showReportDetailsModal(targetId);
                }
                break;

            case 'resolve-flag':
                if (targetId) {
                    this.resolveFlag(targetId);
                }
                break;

            case 'process-report-action':
                if (targetId) {
                    this.processReportAction(targetId);
                }
                break;

            case 'toggle-comment-selection':
                if (targetId) {
                    this.toggleCommentSelection(targetId);
                }
                break;

            case 'toggle-all-comments':
                this.toggleAllComments();
                break;

            case 'delete-selected-comments':
                this.deleteSelectedComments();
                break;

            default:
                console.warn('Unknown content action:', action);
        }
    }

    /**
     * Load content data (main entry point)
     * Extracted from loadContentData function
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                const data = await window.AdminState.loadContentData({}, useCache);
                this.displayContentData(data);
                return data;
            } else {
                // Fallback to direct loading
                return await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading content data:', error);
            this.showError('Failed to load content data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            // Load user reports by default when content section is shown
            await this.loadUserReports();
            return { success: true };
        } catch (error) {
            console.error('Fallback content data loading failed:', error);
            throw error;
        }
    }

    /**
     * Display content data in the UI
     */
    async displayContentData(data) {
        try {
            // Load user reports by default
            this.loadUserReports();

            await adminDebugLog('ContentController', 'Content data displayed');
        } catch (error) {
            console.error('Error displaying content data:', error);
            await adminDebugError('ContentController', 'Failed to display content data', error);
        }
    }

    /**
     * Show content tab (userReports or aiFlags)
     * Extracted from showContentTab function
     */
    async showContentTab(tab) {
        try {
            this.activeTab = tab;

            // Update tab buttons
            document.getElementById('userReportsTab')?.classList.toggle('active', tab === 'userReports');
            document.getElementById('aiFlagsTab')?.classList.toggle('active', tab === 'aiFlags');

            // Update tab content
            document.getElementById('userReportsContent')?.classList.toggle('active', tab === 'userReports');
            document.getElementById('aiFlagsContent')?.classList.toggle('active', tab === 'aiFlags');

            // Load data for the active tab
            if (tab === 'userReports') {
                this.loadUserReports();
            } else if (tab === 'aiFlags') {
                this.loadAIFlaggedContent();
            }

            adminDebugLog('ContentController', 'Content tab switched', { tab });
        } catch (error) {
            console.error('Error switching content tab:', error);
            adminDebugError('ContentController', 'Tab switch failed', error);
        }
    }

    /**
     * Load user reports
     * Extracted from loadUserReports function
     */
    async loadUserReports() {
        try {
            const status = document.getElementById('reportStatusFilter')?.value || 'PENDING';
            const targetType = document.getElementById('reportTargetTypeFilter')?.value || 'all';
            const priority = document.getElementById('reportPriorityFilter')?.value || 'all';

            let url = `${window.AdminAPI?.BACKEND_URL || '/api'}/api/moderation/reports?`;
            const params = new URLSearchParams();

            if (status !== 'all') params.append('status', status);
            if (targetType !== 'all') params.append('targetType', targetType);
            if (priority !== 'all') params.append('priority', priority);
            params.append('limit', '50');

            const response = await window.AdminAPI.call(url + params.toString());

            if (response.ok) {
                const data = await response.json();
                this.currentReports = data.reports || [];
                this.displayUserReports(this.currentReports);
                this.displayUserReportStats(this.currentReports);

                await adminDebugLog('ContentController', 'User reports loaded', {
                    reportCount: this.currentReports.length,
                    filters: { status, targetType, priority }
                });
            } else {
                throw new Error('Failed to load user reports');
            }
        } catch (error) {
            console.error('Error loading user reports:', error);
            const container = document.getElementById('userReportsTable');
            if (container) {
                container.innerHTML = `<div class="error">Failed to load user reports: ${error.message}</div>`;
            }
            await adminDebugError('ContentController', 'User reports loading failed', error);
        }
    }

    /**
     * Display user reports table
     * Extracted from displayUserReports function
     */
    async displayUserReports(reports) {
        try {
            const container = document.getElementById('userReportsTable');

            if (!container) {
                console.warn('User reports table container not found');
                return;
            }

            if (!reports || reports.length === 0) {
                container.innerHTML = '<div class="no-data">No user reports found</div>';
                return;
            }

            // Check if there are any comment reports
            const hasCommentReports = reports.some(r => r.targetType === 'COMMENT');

            let html = '';

            // Add batch delete button if there are comment reports
            if (hasCommentReports) {
                html += `
                    <div style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
                        <button
                            id="batch-delete-comments-btn"
                            data-action="delete-selected-comments"
                            class="nav-button"
                            style="background: #e74c3c; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; border: none;"
                            disabled>
                            🗑️ Delete Selected Comments
                        </button>
                        <span style="color: #666; font-size: 0.9rem;">
                            <strong id="selected-comments-count">0</strong> comment(s) selected
                        </span>
                    </div>
                `;
            }

            html += `
                <table class="data-table">
                    <thead>
                        <tr>
                            ${hasCommentReports ? `<th style="width: 40px;">
                                <input
                                    type="checkbox"
                                    id="select-all-comments"
                                    data-action="toggle-all-comments"
                                    title="Select all comments"
                                    style="cursor: pointer;">
                            </th>` : ''}
                            <th>Target</th>
                            <th>Reporter</th>
                            <th>Reason</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            reports.forEach(report => {
                html += this.renderUserReportRow(report, hasCommentReports);
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error displaying user reports:', error);
            await adminDebugError('ContentController', 'Failed to display user reports', error);
        }
    }

    /**
     * Render individual user report row
     */
    renderUserReportRow(report, hasCommentReports = false) {
        const priorityColors = {
            'URGENT': '#dc3545',
            'HIGH': '#fd7e14',
            'MEDIUM': '#ffc107',
            'LOW': '#28a745'
        };

        const statusColors = {
            'PENDING': '#6c757d',
            'IN_REVIEW': '#17a2b8',
            'RESOLVED': '#28a745'
        };

        const targetInfo = report.targetContent ?
            (report.targetContent.name || report.targetContent.username || report.targetContent.content?.substring(0, 50) || 'Content')
            : report.targetId;

        const isComment = report.targetType === 'COMMENT';

        return `
            <tr>
                ${hasCommentReports ? `<td style="text-align: center;">
                    ${isComment ? `
                        <input
                            type="checkbox"
                            data-action="toggle-comment-selection"
                            data-target="${report.targetId}"
                            data-comment-id="${report.targetId}"
                            title="Select for deletion"
                            style="cursor: pointer;">
                    ` : ''}
                </td>` : ''}
                <td>
                    <strong>${report.targetType}</strong><br>
                    <small>${targetInfo}</small>
                </td>
                <td>
                    <strong>${report.reporter?.username || 'Unknown'}</strong><br>
                    <small>${report.reporter?.email || ''}</small>
                </td>
                <td>
                    <span style="font-weight: bold;">${report.reason.replace(/_/g, ' ')}</span><br>
                    <small style="color: #666;">${report.description?.substring(0, 100) || ''}${report.description?.length > 100 ? '...' : ''}</small>
                </td>
                <td>
                    <span style="background: ${priorityColors[report.priority]}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
                        ${report.priority}
                    </span>
                </td>
                <td>
                    <span style="background: ${statusColors[report.status]}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
                        ${report.status}
                    </span>
                </td>
                <td>
                    ${new Date(report.createdAt).toLocaleDateString()}<br>
                    <small>${new Date(report.createdAt).toLocaleTimeString()}</small>
                </td>
                <td>
                    ${report.status === 'PENDING' ? `
                        <button data-action="show-report-action-modal" data-target="${report.id}" class="btn-sm" style="background: #4b5c09; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer;">
                            Take Action
                        </button>
                    ` : `
                        <button data-action="show-report-details-modal" data-target="${report.id}" class="btn-sm" style="background: #6c757d; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer;">
                            View Details
                        </button>
                    `}
                </td>
            </tr>
        `;
    }

    /**
     * Display user report statistics
     * Extracted from displayUserReportStats function
     */
    async displayUserReportStats(reports) {
        try {
            const container = document.getElementById('userReportStats');

            if (!container) {
                console.warn('User report stats container not found');
                return;
            }

            const stats = {
                total: reports.length,
                pending: reports.filter(r => r.status === 'PENDING').length,
                inReview: reports.filter(r => r.status === 'IN_REVIEW').length,
                resolved: reports.filter(r => r.status === 'RESOLVED').length,
                urgent: reports.filter(r => r.priority === 'URGENT').length
            };

            const statItems = [
                { label: 'Total Reports', value: stats.total, color: '#17a2b8' },
                { label: 'Pending', value: stats.pending, color: '#ffc107' },
                { label: 'In Review', value: stats.inReview, color: '#17a2b8' },
                { label: 'Resolved', value: stats.resolved, color: '#28a745' },
                { label: 'Urgent', value: stats.urgent, color: '#dc3545' }
            ];

            let html = '';
            statItems.forEach(item => {
                html += `
                    <div class="stat-card" style="border-left: 4px solid ${item.color};">
                        <div class="stat-value">${item.value}</div>
                        <div class="stat-label">${item.label}</div>
                    </div>
                `;
            });

            container.innerHTML = html;

        } catch (error) {
            console.error('Error displaying user report stats:', error);
            await adminDebugError('ContentController', 'Failed to display user report stats', error);
        }
    }

    /**
     * Load AI flagged content
     * Extracted from loadAIFlaggedContent function
     */
    async loadAIFlaggedContent() {
        try {
            const response = await window.AdminAPI.call(`${window.AdminAPI?.BACKEND_URL || '/api'}/api/admin/content/flagged`);

            if (response.ok) {
                const data = await response.json();
                this.currentFlags = data.flags || [];
                this.displayFlaggedContent(this.currentFlags);

                await adminDebugLog('ContentController', 'AI flagged content loaded', {
                    flagCount: this.currentFlags.length
                });
            } else {
                throw new Error('Failed to load AI flagged content');
            }
        } catch (error) {
            console.error('Error loading AI flagged content:', error);
            const container = document.getElementById('flaggedContent');
            if (container) {
                container.innerHTML = '<div class="error">Failed to load AI flagged content</div>';
            }
            await adminDebugError('ContentController', 'AI flagged content loading failed', error);
        }
    }

    /**
     * Display AI flagged content
     * Extracted from displayFlaggedContent function
     */
    async displayFlaggedContent(flags) {
        try {
            const container = document.getElementById('flaggedContent');

            if (!container) {
                console.warn('Flagged content container not found');
                return;
            }

            if (!flags || flags.length === 0) {
                container.innerHTML = '<p>No flagged content at this time.</p>';
                return;
            }

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Flag Reason</th>
                            <th>Confidence</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            flags.forEach(flag => {
                const date = new Date(flag.createdAt).toLocaleDateString();
                const confidence = Math.round(flag.confidence * 100);

                html += `
                    <tr>
                        <td>${flag.contentType}</td>
                        <td>${flag.flagType}</td>
                        <td>${confidence}%</td>
                        <td>${date}</td>
                        <td>
                            <button data-action="resolve-flag" data-target="${flag.id}" class="nav-button" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Resolve</button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error displaying flagged content:', error);
            await adminDebugError('ContentController', 'Failed to display flagged content', error);
        }
    }

    /**
     * Show report action modal
     * Extracted from showReportActionModal function
     */
    showReportActionModal(reportId) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
            modal.innerHTML = `
                <div class="modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; width: 90%;">
                    <h3>Take Action on Report</h3>
                    <form id="reportActionForm">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label>Action:</label>
                            <select id="reportAction" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
                                <option value="NO_ACTION">No Action Required</option>
                                <option value="CONTENT_HIDDEN">Hide Content</option>
                                <option value="CONTENT_DELETED">Delete Content</option>
                                <option value="USER_WARNED">Issue Warning</option>
                                <option value="USER_SUSPENDED">Suspend User</option>
                                <option value="USER_BANNED">Ban User</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label>Notes:</label>
                            <textarea id="actionNotes" placeholder="Enter reason for this action..." style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; min-height: 100px;"></textarea>
                        </div>
                        <div style="text-align: right;">
                            <button type="button" data-action="close-modal" style="background: #6c757d; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
                                Cancel
                            </button>
                            <button type="button" data-action="process-report-action" data-target="${reportId}" style="background: #4b5c09; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                                Take Action
                            </button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            adminDebugLog('ContentController', 'Report action modal shown', { reportId });
        } catch (error) {
            console.error('Error showing report action modal:', error);
            adminDebugError('ContentController', 'Failed to show report action modal', error);
        }
    }

    /**
     * Show report details modal
     * Extracted from showReportDetailsModal function
     */
    showReportDetailsModal(reportId) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
            modal.innerHTML = `
                <div class="modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; width: 90%;">
                    <h3>Report Details</h3>
                    <p>Report ID: ${reportId}</p>
                    <p><em>This report has already been resolved. View the moderation history for details.</em></p>
                    <div style="text-align: right; margin-top: 1rem;">
                        <button type="button" data-action="close-modal" style="background: #6c757d; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            adminDebugLog('ContentController', 'Report details modal shown', { reportId });
        } catch (error) {
            console.error('Error showing report details modal:', error);
            adminDebugError('ContentController', 'Failed to show report details modal', error);
        }
    }

    /**
     * Process report action (new implementation for proper moderation workflow)
     */
    async processReportAction(reportId) {
        try {
            const action = document.getElementById('reportAction')?.value;
            const notes = document.getElementById('actionNotes')?.value;

            if (!action) {
                alert('Please select an action');
                return;
            }

            if (!notes || notes.trim().length < 5) {
                alert('Please provide detailed notes for this action (minimum 5 characters)');
                return;
            }

            const response = await window.AdminAPI.call(`${window.AdminAPI?.BACKEND_URL || '/api'}/api/moderation/reports/${reportId}/action`, {
                method: 'POST',
                body: JSON.stringify({
                    action: action,
                    notes: notes.trim(),
                    adminUserId: window.adminAuth?.getCurrentUser()?.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Action taken successfully!\n\nAction: ${action}\nAudit ID: ${data.auditId || 'N/A'}`);

                // Close modal
                document.querySelector('.modal-overlay')?.remove();

                // Refresh reports
                await this.loadUserReports();

                await adminDebugLog('ContentController', 'Report action processed', {
                    reportId,
                    action,
                    auditId: data.auditId
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process report action');
            }

        } catch (error) {
            console.error('Error processing report action:', error);
            alert(`❌ Failed to process action: ${error.message}`);
            await adminDebugError('ContentController', 'Report action processing failed', error);
        }
    }

    /**
     * Resolve AI flag
     * Extracted from resolveFlag function (enhanced)
     */
    async resolveFlag(flagId) {
        try {
            if (!confirm('Mark this AI flag as resolved?')) {
                return;
            }

            const response = await window.AdminAPI.call(`${window.AdminAPI?.BACKEND_URL || '/api'}/api/admin/content/flags/${flagId}/resolve`, {
                method: 'POST',
                body: JSON.stringify({
                    adminUserId: window.adminAuth?.getCurrentUser()?.id
                })
            });

            if (response.ok) {
                alert('✅ Flag resolved successfully');

                // Refresh flagged content
                await this.loadAIFlaggedContent();

                await adminDebugLog('ContentController', 'AI flag resolved', { flagId });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to resolve flag');
            }

        } catch (error) {
            console.error('Error resolving flag:', error);
            alert(`❌ Failed to resolve flag: ${error.message}`);
            await adminDebugError('ContentController', 'Flag resolution failed', error);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('ContentController Error:', message);

        // Show error in the current active tab
        const container = this.activeTab === 'userReports'
            ? document.getElementById('userReportsTable')
            : document.getElementById('flaggedContent');

        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    /**
     * Toggle comment selection for batch deletion
     */
    toggleCommentSelection(commentId) {
        if (this.selectedComments.has(commentId)) {
            this.selectedComments.delete(commentId);
        } else {
            this.selectedComments.add(commentId);
        }

        // Update checkbox visual state
        const checkbox = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (checkbox) {
            checkbox.checked = this.selectedComments.has(commentId);
        }

        // Update batch delete button state
        this.updateBatchDeleteButton();
    }

    /**
     * Toggle all comment checkboxes
     */
    toggleAllComments() {
        const selectAllCheckbox = document.getElementById('select-all-comments');
        const commentReports = this.currentReports.filter(r => r.targetType === 'COMMENT');

        if (selectAllCheckbox?.checked) {
            // Select all
            commentReports.forEach(report => {
                this.selectedComments.add(report.targetId);
                const checkbox = document.querySelector(`[data-comment-id="${report.targetId}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else {
            // Deselect all
            this.selectedComments.clear();
            document.querySelectorAll('[data-comment-id]').forEach(checkbox => {
                checkbox.checked = false;
            });
        }

        this.updateBatchDeleteButton();
    }

    /**
     * Update batch delete button state
     */
    updateBatchDeleteButton() {
        const button = document.getElementById('batch-delete-comments-btn');
        const counter = document.getElementById('selected-comments-count');

        if (button) {
            button.disabled = this.selectedComments.size === 0;
        }

        if (counter) {
            counter.textContent = this.selectedComments.size;
        }
    }

    /**
     * Delete selected comments with TOTP confirmation
     */
    async deleteSelectedComments() {
        try {
            const commentIds = Array.from(this.selectedComments);

            if (commentIds.length === 0) {
                alert('Please select at least one comment to delete');
                return;
            }

            // Confirmation
            if (!confirm(`⚠️ PERMANENT DELETION\n\nDelete ${commentIds.length} comment(s) permanently?\n\nThis action cannot be undone and requires TOTP verification.`)) {
                return;
            }

            // Request TOTP confirmation (using global function)
            const { totpToken } = await requestTOTPConfirmation(
                `Delete ${commentIds.length} comment(s) permanently`,
                { additionalInfo: `${commentIds.length} comments will be permanently removed from the database` }
            );

            // Get deletion reason
            const reason = prompt('Enter reason for deletion (required, 10-500 characters):');
            if (!reason || reason.trim().length < 10) {
                alert('Deletion reason is required and must be at least 10 characters.');
                return;
            }

            if (reason.trim().length > 500) {
                alert('Deletion reason must be no more than 500 characters.');
                return;
            }

            // Perform batch deletion
            const response = await window.AdminAPI.call(`${window.AdminAPI?.BACKEND_URL || '/api'}/api/admin/comments/batch-delete`, {
                method: 'DELETE',
                body: JSON.stringify({
                    commentIds,
                    totpToken,
                    reason: reason.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();

                const successMessage = `✅ Batch Deletion Complete!\n\nDeleted: ${data.deleted}\nFailed: ${data.failed}\n\nTotal requested: ${commentIds.length}`;

                if (data.failed > 0) {
                    const failedDetails = data.results
                        .filter(r => r.status === 'failed')
                        .map(r => `• ${r.id}: ${r.error}`)
                        .join('\n');
                    alert(`${successMessage}\n\nFailed deletions:\n${failedDetails}`);
                } else {
                    alert(successMessage);
                }

                // Clear selections
                this.selectedComments.clear();

                // Refresh reports
                await this.loadUserReports();

                await adminDebugLog('ContentController', 'Batch comment deletion completed', {
                    deleted: data.deleted,
                    failed: data.failed,
                    total: commentIds.length
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete comments');
            }

        } catch (error) {
            console.error('Error deleting selected comments:', error);
            alert(`❌ Failed to delete comments: ${error.message}`);
            await adminDebugError('ContentController', 'Batch comment deletion failed', error);
        }
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        // Remove event listeners
        const userReportsTab = document.getElementById('userReportsTab');
        const aiFlagsTab = document.getElementById('aiFlagsTab');

        if (userReportsTab) {
            userReportsTab.removeEventListener('click', this.showContentTab);
        }

        if (aiFlagsTab) {
            aiFlagsTab.removeEventListener('click', this.showContentTab);
        }

        // Remove event delegation listeners
        if (this.handleContentActions) {
            document.removeEventListener('click', this.handleContentActions);
        }

        // Clear data
        this.currentReports = [];
        this.currentFlags = [];
        this.isInitialized = false;

        console.log('ContentController destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentController;
} else {
    window.ContentController = ContentController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.contentController = new ContentController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.contentController = new ContentController();
            }
        }, 100);
    });
}