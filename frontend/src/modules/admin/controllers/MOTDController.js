/**
 * MOTDController - Handles admin dashboard MOTD (Message of the Day) section
 * Extracted from admin-dashboard.html MOTD management functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 3.3 - MOTD Controller Implementation
 */

class MOTDController {
    constructor() {
        this.sectionId = 'motd';
        this.isInitialized = false;
        this.currentMOTDs = [];
        this.templates = [];
        this.activeEditor = null;
        this.isEditing = false;
        this.previewMode = false;
        this.modalListenersAdded = false;

        // Store handler functions to prevent duplicate listeners
        this.scheduleCloseHandler = null;
        this.scheduleCancelHandler = null;
        this.editorCloseHandler = null;
        this.editorCancelHandler = null;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayMOTDData = this.displayMOTDData.bind(this);
        this.handleCreateMOTD = this.handleCreateMOTD.bind(this);
        this.handleUpdateMOTD = this.handleUpdateMOTD.bind(this);
        this.showScheduleMOTDModal = this.showScheduleMOTDModal.bind(this);
        this.populateScheduleMOTDDropdown = this.populateScheduleMOTDDropdown.bind(this);
        this.handleScheduleMOTD = this.handleScheduleMOTD.bind(this);
        this.handleDeleteMOTD = this.handleDeleteMOTD.bind(this);
        this.displayMOTDHistory = this.displayMOTDHistory.bind(this);
        this.displayMOTDAnalytics = this.displayMOTDAnalytics.bind(this);
        this.togglePreview = this.togglePreview.bind(this);
        this.initializeRichTextEditor = this.initializeRichTextEditor.bind(this);
        this.sanitizeContent = this.sanitizeContent.bind(this);
        this.validateMOTDContent = this.validateMOTDContent.bind(this);
        this.attachModalCloseButtons = this.attachModalCloseButtons.bind(this);
        this.closeScheduleModal = this.closeScheduleModal.bind(this);
        this.closeMOTDEditor = this.closeMOTDEditor.bind(this);
        this.closeAllModals = this.closeAllModals.bind(this);
    }

    /**
     * Initialize the MOTD controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for MOTD
            if (window.AdminState) {
                window.AdminState.displayMOTDData = this.displayMOTDData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Initialize rich text editor
            await this.initializeRichTextEditor();

            // Load initial data
            await this.loadData();

            // Load templates
            await this.loadTemplates();

            this.isInitialized = true;

            await adminDebugLog('MOTDController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing MOTDController:', error);
            await adminDebugError('MOTDController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for MOTD section
     */
    async setupEventListeners() {
        try {
            // Create MOTD button
            const createBtn = document.getElementById('createMOTDBtn');
            if (createBtn) {
                createBtn.removeAttribute('onclick');
                createBtn.addEventListener('click', this.handleCreateMOTD);
            }

            // Schedule MOTD button (shows modal)
            const scheduleBtn = document.getElementById('scheduleMOTDBtn');
            if (scheduleBtn) {
                scheduleBtn.removeAttribute('onclick');
                scheduleBtn.addEventListener('click', this.showScheduleMOTDModal);
            }

            // Preview toggle button
            const previewBtn = document.getElementById('previewMOTDBtn');
            if (previewBtn) {
                previewBtn.removeAttribute('onclick');
                previewBtn.addEventListener('click', this.togglePreview);
            }

            // Template selector
            const templateSelect = document.getElementById('motdTemplateSelect');
            if (templateSelect) {
                templateSelect.addEventListener('change', this.loadTemplate.bind(this));
            }

            // Content length counter
            const contentArea = document.getElementById('motdContent');
            if (contentArea) {
                contentArea.addEventListener('input', this.updateCharacterCount.bind(this));
            }

            // Auto-save functionality
            this.setupAutoSave();

            // Modal close button event listeners
            this.setupModalCloseListeners();

            await adminDebugLog('MOTDController', 'Event listeners set up successfully');
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to setup event listeners', error);
        }
    }

    /**
     * Set up modal close button event listeners
     */
    setupModalCloseListeners() {
        // Prevent duplicate event listeners
        if (this.modalListenersAdded) {
            return;
        }

        try {
            // Find and attach listeners to specific modal close buttons
            this.attachModalCloseButtons();

            // Handle ESC key to close modals
            this.modalKeyHandler = (event) => {
                if (event.key === 'Escape') {
                    this.closeAllModals();
                }
            };

            document.addEventListener('keydown', this.modalKeyHandler);

            // Handle clicking outside modal to close (using document delegation for this)
            this.modalOverlayHandler = (event) => {
                if (event.target.classList.contains('modal-overlay')) {
                    this.closeAllModals();
                }
            };

            document.addEventListener('click', this.modalOverlayHandler);

            this.modalListenersAdded = true;

        } catch (error) {
            console.error('Error setting up modal close listeners:', error);
        }
    }

    /**
     * Attach event listeners directly to modal close buttons
     */
    attachModalCloseButtons() {
        try {
            // Create handlers once and store them as instance properties
            if (!this.scheduleCloseHandler) {
                this.scheduleCloseHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Schedule modal close button clicked');
                    this.closeScheduleModal();
                };
            }

            if (!this.scheduleCancelHandler) {
                this.scheduleCancelHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Schedule modal cancel button clicked');
                    this.closeScheduleModal();
                };
            }

            if (!this.editorCloseHandler) {
                this.editorCloseHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Editor modal close button clicked');
                    this.closeMOTDEditor();
                };
            }

            if (!this.editorCancelHandler) {
                this.editorCancelHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Editor modal cancel button clicked');
                    this.closeMOTDEditor();
                };
            }

            // Schedule modal close buttons
            const scheduleCloseBtn = document.querySelector('[data-action="close-schedule-modal"]');
            const scheduleCancelBtn = document.querySelector('[data-action="cancel-schedule-modal"]');

            if (scheduleCloseBtn) {
                // Remove existing listeners to prevent duplicates
                scheduleCloseBtn.removeEventListener('click', this.scheduleCloseHandler);
                scheduleCloseBtn.addEventListener('click', this.scheduleCloseHandler);
            }

            if (scheduleCancelBtn) {
                // Remove existing listeners to prevent duplicates
                scheduleCancelBtn.removeEventListener('click', this.scheduleCancelHandler);
                scheduleCancelBtn.addEventListener('click', this.scheduleCancelHandler);
            }

            // MOTD editor close buttons
            const editorCloseBtn = document.querySelector('[data-action="close-motd-editor"]');
            const editorCancelBtn = document.querySelector('[data-action="cancel-motd-editor"]');

            if (editorCloseBtn) {
                editorCloseBtn.removeEventListener('click', this.editorCloseHandler);
                editorCloseBtn.addEventListener('click', this.editorCloseHandler);
            }

            if (editorCancelBtn) {
                editorCancelBtn.removeEventListener('click', this.editorCancelHandler);
                editorCancelBtn.addEventListener('click', this.editorCancelHandler);
            }

            console.log('Modal close buttons attached:', {
                scheduleClose: !!scheduleCloseBtn,
                scheduleCancel: !!scheduleCancelBtn,
                editorClose: !!editorCloseBtn,
                editorCancel: !!editorCancelBtn
            });

        } catch (error) {
            console.error('Error attaching modal close buttons:', error);
        }
    }

    /**
     * Close the schedule modal
     */
    closeScheduleModal() {
        const modal = document.getElementById('scheduleModal');
        if (modal) {
            modal.style.display = 'none';
            // Clear form data
            const form = document.getElementById('scheduleForm');
            if (form) {
                form.reset();
            }
        }
    }

    /**
     * Close the MOTD editor modal
     */
    closeMOTDEditor() {
        const modal = document.getElementById('motdEditorModal');
        if (modal) {
            modal.style.display = 'none';
            // Clear editor data if needed
            this.isEditing = false;
            this.activeEditor = null;
        }
    }

    /**
     * Close all MOTD modals
     */
    closeAllModals() {
        this.closeScheduleModal();
        this.closeMOTDEditor();
    }

    /**
     * Load MOTD data
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                const data = await window.AdminState.loadMOTDData({}, useCache);
                this.displayMOTDData(data);
                return data;
            } else {
                // Fallback to direct API call
                return await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading MOTD data:', error);
            this.showError('Failed to load MOTD data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/motd`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                this.displayMOTDData(data);
                return data;
            } else {
                throw new Error('Failed to fetch MOTD data');
            }
        } catch (error) {
            console.error('Fallback MOTD data loading failed:', error);
            throw error;
        }
    }

    /**
     * Load MOTD templates
     */
    async loadTemplates() {
        // Use default templates directly to prevent 404 network logs
        await adminDebugLog('MOTDController', 'Using default templates (endpoint not implemented)');
        this.templates = this.getDefaultTemplates();
        this.displayTemplates();
    }

    /**
     * Get default templates if API fails
     */
    getDefaultTemplates() {
        return [
            {
                id: 'welcome',
                name: 'Welcome Message',
                content: '<h3>Welcome to UnitedWeRise!</h3><p>Join us in building a more connected democracy.</p>',
                category: 'general'
            },
            {
                id: 'maintenance',
                name: 'Maintenance Notice',
                content: '<h3>🔧 Scheduled Maintenance</h3><p>We will be performing maintenance on [DATE] from [TIME] to [TIME]. During this time, some features may be temporarily unavailable.</p>',
                category: 'system'
            },
            {
                id: 'election',
                name: 'Election Reminder',
                content: '<h3>🗳️ Election Day Reminder</h3><p>Don\'t forget to vote on [DATE]! Find your polling location and candidate information in our Elections section.</p>',
                category: 'civic'
            },
            {
                id: 'feature',
                name: 'New Feature Announcement',
                content: '<h3>🎉 New Feature Available!</h3><p>Check out our latest feature: [FEATURE_NAME]. Learn more about how it can help you stay engaged in your community.</p>',
                category: 'product'
            }
        ];
    }

    /**
     * Display MOTD data in the UI
     */
    async displayMOTDData(data) {
        try {
            if (!data) {
                console.warn('No MOTD data available');
                return;
            }

            this.currentMOTDs = data.motds || [];

            // Display active MOTDs
            this.displayActiveMOTDs(this.currentMOTDs);

            // Display MOTD history
            this.displayMOTDHistory(this.currentMOTDs);

            // Display analytics
            this.displayMOTDAnalytics(data.analytics || {});

            await adminDebugLog('MOTDController', 'MOTD data displayed', {
                motdCount: this.currentMOTDs.length,
                activeMOTDs: this.currentMOTDs.filter(m => m.isActive).length
            });

        } catch (error) {
            console.error('Error displaying MOTD data:', error);
            await adminDebugError('MOTDController', 'Failed to display MOTD data', error);
        }
    }

    /**
     * Display active MOTDs
     */
    displayActiveMOTDs(motds) {
        const container = document.getElementById('activeMOTDsList');
        if (!container) return;

        const activeMOTDs = motds.filter(motd => motd.isActive);

        if (activeMOTDs.length === 0) {
            container.innerHTML = '<div class="no-data">No active MOTDs</div>';
            return;
        }

        const html = activeMOTDs.map(motd => this.renderActiveMOTDCard(motd)).join('');
        container.innerHTML = html;
    }

    /**
     * Render active MOTD card
     */
    renderActiveMOTDCard(motd) {
        const priorityIcon = { high: '🔴', medium: '🟡', low: '🟢' }[motd.priority] || '🟢';
        const targetIcon = this.getTargetAudienceIcon(motd.targetAudience);

        return `
            <div class="motd-card active" data-motd-id="${motd.id}">
                <div class="motd-header">
                    <div class="motd-title">
                        <h4>${motd.title}</h4>
                        <span class="motd-priority">${priorityIcon} ${motd.priority || 'low'}</span>
                    </div>
                    <div class="motd-actions">
                        <button onclick="window.motdController.editMOTD('${motd.id}')"
                                class="action-btn edit-btn" title="Edit MOTD">
                            ✏️ Edit
                        </button>
                        <button onclick="window.motdController.handleDeleteMOTD('${motd.id}')"
                                class="action-btn delete-btn" title="Delete MOTD">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                <div class="motd-content">
                    ${this.sanitizeContent(motd.content)}
                </div>
                <div class="motd-meta">
                    <div class="motd-schedule">
                        <span>📅 ${this.formatDateRange(motd.startDate, motd.endDate)}</span>
                        <span>${targetIcon} ${motd.targetAudience || 'All Users'}</span>
                    </div>
                    <div class="motd-stats">
                        <span>👁️ ${motd.views || 0} views</span>
                        <span>👆 ${motd.clicks || 0} clicks</span>
                        <span>❌ ${motd.dismissals || 0} dismissals</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Display MOTD history
     */
    displayMOTDHistory(motds) {
        const container = document.getElementById('motdHistoryTable');
        if (!container) return;

        const sortedMOTDs = [...motds].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (sortedMOTDs.length === 0) {
            container.innerHTML = '<div class="no-data">No MOTD history</div>';
            return;
        }

        const tableHtml = `
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Target</th>
                            <th>Schedule</th>
                            <th>Performance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedMOTDs.map(motd => this.renderMOTDHistoryRow(motd)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;
    }

    /**
     * Render MOTD history row
     */
    renderMOTDHistoryRow(motd) {
        const statusIcon = motd.isActive ? '🟢' : motd.endDate && new Date(motd.endDate) < new Date() ? '🔴' : '🟡';
        const statusText = motd.isActive ? 'Active' : motd.endDate && new Date(motd.endDate) < new Date() ? 'Expired' : 'Scheduled';
        const priorityIcon = { high: '🔴', medium: '🟡', low: '🟢' }[motd.priority] || '🟢';
        const targetIcon = this.getTargetAudienceIcon(motd.targetAudience);

        return `
            <tr data-motd-id="${motd.id}">
                <td>
                    <div class="motd-title-cell">
                        <strong>${motd.title}</strong>
                        <br><small>Created: ${this.formatDate(motd.createdAt)}</small>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusText.toLowerCase()}">
                        ${statusIcon} ${statusText}
                    </span>
                </td>
                <td>
                    <span class="priority-badge ${motd.priority || 'low'}">
                        ${priorityIcon} ${motd.priority || 'low'}
                    </span>
                </td>
                <td>
                    <span class="target-badge">
                        ${targetIcon} ${motd.targetAudience || 'All'}
                    </span>
                </td>
                <td>
                    <small>${this.formatDateRange(motd.startDate, motd.endDate)}</small>
                </td>
                <td>
                    <div class="performance-stats">
                        <span>👁️ ${motd.views || 0}</span>
                        <span>👆 ${motd.clicks || 0}</span>
                        <span>❌ ${motd.dismissals || 0}</span>
                    </div>
                </td>
                <td class="actions">
                    <button onclick="window.motdController.viewMOTD('${motd.id}')"
                            class="action-btn view-btn" title="View MOTD">
                        👁️ View
                    </button>
                    <button onclick="window.motdController.editMOTD('${motd.id}')"
                            class="action-btn edit-btn" title="Edit MOTD">
                        ✏️ Edit
                    </button>
                    <button onclick="window.motdController.duplicateMOTD('${motd.id}')"
                            class="action-btn duplicate-btn" title="Duplicate MOTD">
                        📋 Copy
                    </button>
                    <button onclick="window.motdController.handleDeleteMOTD('${motd.id}')"
                            class="action-btn delete-btn" title="Delete MOTD">
                        🗑️ Delete
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Display MOTD analytics
     */
    async displayMOTDAnalytics(analytics) {
        try {
            // Update overview stats
            this.updateAnalyticsOverview(analytics);

            // Update performance charts
            this.updatePerformanceCharts(analytics);

            // Update engagement metrics
            this.updateEngagementMetrics(analytics);

            await adminDebugLog('MOTDController', 'Analytics displayed successfully');
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to display analytics', error);
        }
    }

    /**
     * Update analytics overview
     */
    updateAnalyticsOverview(analytics) {
        const stats = [
            { id: 'totalMOTDs', value: analytics.totalMOTDs || 0, label: 'Total MOTDs' },
            { id: 'activeMOTDs', value: analytics.activeMOTDs || 0, label: 'Active MOTDs' },
            { id: 'totalViews', value: analytics.totalViews || 0, label: 'Total Views' },
            { id: 'avgEngagement', value: analytics.avgEngagement || 0, label: 'Avg Engagement %' }
        ];

        stats.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                element.textContent = typeof stat.value === 'number' && stat.id === 'avgEngagement'
                    ? `${stat.value.toFixed(1)}%`
                    : stat.value.toLocaleString();
            }
        });
    }

    /**
     * Handle create MOTD
     */
    async handleCreateMOTD() {
        try {
            this.clearEditor();
            this.showMOTDEditor();
            document.getElementById('motdEditorTitle').textContent = 'Create New MOTD';

            // Set default values
            document.getElementById('motdTitle').value = '';
            document.getElementById('motdContent').value = '';
            document.getElementById('motdPriority').value = 'medium';
            document.getElementById('motdTargetAudience').value = 'all';

            // Set default schedule (start now, end in 7 days)
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            document.getElementById('motdStartDate').value = this.formatDateForInput(now);
            document.getElementById('motdEndDate').value = this.formatDateForInput(weekFromNow);

            this.isEditing = false;
            this.updateCharacterCount();

            await adminDebugLog('MOTDController', 'Create MOTD form opened');
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to open create MOTD form', error);
        }
    }

    /**
     * Handle update MOTD (save)
     */
    async handleUpdateMOTD() {
        try {
            const formData = this.getMOTDFormData();

            // Validate form data
            const validation = this.validateMOTDContent(formData);
            if (!validation.isValid) {
                alert(`❌ Validation Error:\n${validation.errors.join('\n')}`);
                return;
            }

            // Show confirmation for high-priority MOTDs
            if (formData.priority === 'high') {
                if (!confirm('⚠️ HIGH PRIORITY MOTD\n\nThis MOTD will be prominently displayed to all targeted users.\n\nContinue?')) {
                    return;
                }
            }

            const isUpdate = this.isEditing && formData.id;
            const url = isUpdate
                ? `${window.AdminAPI.BACKEND_URL}/api/admin/motd/${formData.id}`
                : `${window.AdminAPI.BACKEND_URL}/api/admin/motd`;

            const method = isUpdate ? 'PUT' : 'POST';

            const response = await window.AdminAPI.call(url, {
                method,
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ MOTD ${isUpdate ? 'updated' : 'created'} successfully!${data.auditId ? `\n\nAudit ID: ${data.auditId}` : ''}`);

                this.hideMOTDEditor();
                await this.loadData(false); // Refresh data

                await adminDebugLog('MOTDController', `MOTD ${isUpdate ? 'updated' : 'created'} successfully`, {
                    motdId: data.id || formData.id,
                    title: formData.title,
                    isUpdate
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isUpdate ? 'update' : 'create'} MOTD`);
            }

        } catch (error) {
            console.error('Error saving MOTD:', error);
            alert(`❌ Failed to save MOTD: ${error.message}`);
            await adminDebugError('MOTDController', 'MOTD save failed', error);
        }
    }

    /**
     * Show the Schedule MOTD modal
     */
    async showScheduleMOTDModal() {
        try {
            // Populate the MOTD selection dropdown
            await this.populateScheduleMOTDDropdown();

            // Show the schedule modal
            const modal = document.getElementById('scheduleModal');
            if (modal) {
                modal.style.display = 'flex';

                // Re-attach close button listeners now that modal is visible
                setTimeout(() => {
                    this.attachModalCloseButtons();
                }, 100);

                await adminDebugLog('MOTDController', 'Schedule MOTD modal shown');
            } else {
                console.error('Schedule modal not found');
            }
        } catch (error) {
            console.error('Error showing schedule modal:', error);
            await adminDebugError('MOTDController', 'Failed to show schedule modal', error);
        }
    }

    /**
     * Populate the Schedule MOTD dropdown with available MOTDs
     */
    async populateScheduleMOTDDropdown() {
        try {
            const dropdown = document.getElementById('scheduleMOTDSelect');
            if (!dropdown) return;

            // Clear existing options except the first one
            dropdown.innerHTML = '<option value="">Choose a MOTD to schedule...</option>';

            // Populate with current MOTDs
            if (this.currentMOTDs && this.currentMOTDs.length > 0) {
                this.currentMOTDs.forEach(motd => {
                    const option = document.createElement('option');
                    option.value = motd.id;
                    option.textContent = `${motd.title || 'Untitled'} (${motd.status})`;
                    dropdown.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error populating schedule dropdown:', error);
        }
    }

    /**
     * Handle schedule MOTD (form submission)
     */
    async handleScheduleMOTD() {
        try {
            const scheduleData = this.getScheduleFormData();

            if (!scheduleData.motdId) {
                alert('❌ Please select a MOTD to schedule');
                return;
            }

            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/motd/${scheduleData.motdId}/schedule`, {
                method: 'PUT',
                body: JSON.stringify(scheduleData)
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ MOTD scheduled successfully!\n\nSchedule: ${this.formatDateRange(scheduleData.startDate, scheduleData.endDate)}`);

                // Close the modal after successful scheduling
                this.closeScheduleModal();

                await this.loadData(false); // Refresh data

                await adminDebugLog('MOTDController', 'MOTD scheduled successfully', {
                    motdId: scheduleData.motdId,
                    schedule: scheduleData
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to schedule MOTD');
            }

        } catch (error) {
            console.error('Error scheduling MOTD:', error);
            alert(`❌ Failed to schedule MOTD: ${error.message}`);
            await adminDebugError('MOTDController', 'MOTD scheduling failed', error);
        }
    }

    /**
     * Handle delete MOTD with TOTP verification
     */
    async handleDeleteMOTD(motdId) {
        try {
            const motd = this.currentMOTDs.find(m => m.id === motdId);
            if (!motd) {
                alert('❌ MOTD not found');
                return;
            }

            const impactDetails = `This will affect:
• ${motd.views || 0} total views
• ${motd.clicks || 0} total clicks
• Currently active: ${motd.isActive ? 'YES' : 'NO'}
• Target audience: ${motd.targetAudience || 'All users'}`;

            if (!confirm(`⚠️ DELETE MOTD\n\nTitle: ${motd.title}\nID: ${motdId}\n\n${impactDetails}\n\nThis action requires TOTP verification. Continue?`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                `Delete MOTD: ${motd.title}`,
                { additionalInfo: impactDetails }
            );

            // Get deletion reason
            const reason = prompt('Enter reason for deletion (required, 10-500 characters):');
            if (!reason || reason.trim().length < 10) {
                alert('Deletion reason is required and must be at least 10 characters.');
                return;
            }

            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/motd/${motdId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    totpToken,
                    reason: reason.trim(),
                    adminUserId: window.adminAuth.getCurrentUser()?.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ MOTD "${motd.title}" deleted successfully.\n\nAudit ID: ${data.auditId}`);

                // Refresh MOTD data
                await this.loadData(false);

                await adminDebugLog('MOTDController', 'MOTD deleted successfully', {
                    motdId,
                    title: motd.title,
                    auditId: data.auditId
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete MOTD');
            }

        } catch (error) {
            console.error('Error deleting MOTD:', error);
            alert(`❌ Failed to delete MOTD: ${error.message}`);
            await adminDebugError('MOTDController', 'MOTD deletion failed', error);
        }
    }

    /**
     * Edit existing MOTD
     */
    async editMOTD(motdId) {
        try {
            const motd = this.currentMOTDs.find(m => m.id === motdId);
            if (!motd) {
                alert('❌ MOTD not found');
                return;
            }

            this.showMOTDEditor();
            document.getElementById('motdEditorTitle').textContent = `Edit MOTD: ${motd.title}`;

            // Populate form with existing data
            document.getElementById('motdTitle').value = motd.title || '';
            document.getElementById('motdContent').value = motd.content || '';
            document.getElementById('motdPriority').value = motd.priority || 'medium';
            document.getElementById('motdTargetAudience').value = motd.targetAudience || 'all';
            document.getElementById('motdStartDate').value = this.formatDateForInput(motd.startDate);
            document.getElementById('motdEndDate').value = this.formatDateForInput(motd.endDate);

            // Store the ID for updating
            document.getElementById('motdEditor').dataset.motdId = motdId;

            this.isEditing = true;
            this.updateCharacterCount();

            await adminDebugLog('MOTDController', 'Edit MOTD form opened', { motdId, title: motd.title });
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to open edit MOTD form', error);
        }
    }

    /**
     * View MOTD details
     */
    async viewMOTD(motdId) {
        try {
            const motd = this.currentMOTDs.find(m => m.id === motdId);
            if (!motd) {
                alert('❌ MOTD not found');
                return;
            }

            // Show MOTD details in modal
            this.showMOTDDetails(motd);

            await adminDebugLog('MOTDController', 'MOTD details viewed', { motdId, title: motd.title });
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to view MOTD details', error);
        }
    }

    /**
     * Duplicate MOTD
     */
    async duplicateMOTD(motdId) {
        try {
            const motd = this.currentMOTDs.find(m => m.id === motdId);
            if (!motd) {
                alert('❌ MOTD not found');
                return;
            }

            this.showMOTDEditor();
            document.getElementById('motdEditorTitle').textContent = `Duplicate MOTD: ${motd.title}`;

            // Populate form with existing data but modify title
            document.getElementById('motdTitle').value = `Copy of ${motd.title}`;
            document.getElementById('motdContent').value = motd.content || '';
            document.getElementById('motdPriority').value = motd.priority || 'medium';
            document.getElementById('motdTargetAudience').value = motd.targetAudience || 'all';

            // Set new dates (start now, end in 7 days)
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            document.getElementById('motdStartDate').value = this.formatDateForInput(now);
            document.getElementById('motdEndDate').value = this.formatDateForInput(weekFromNow);

            this.isEditing = false; // This is a new MOTD
            this.updateCharacterCount();

            await adminDebugLog('MOTDController', 'MOTD duplication started', { originalMotdId: motdId, title: motd.title });
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to duplicate MOTD', error);
        }
    }

    /**
     * Initialize rich text editor
     */
    async initializeRichTextEditor() {
        try {
            // Simple rich text toolbar setup
            this.setupRichTextToolbar();

            // Content area enhancements
            const contentArea = document.getElementById('motdContent');
            if (contentArea) {
                // Add formatting shortcuts
                contentArea.addEventListener('keydown', this.handleEditorShortcuts.bind(this));

                // Add paste handling
                contentArea.addEventListener('paste', this.handlePaste.bind(this));
            }

            await adminDebugLog('MOTDController', 'Rich text editor initialized');
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to initialize rich text editor', error);
        }
    }

    /**
     * Setup rich text toolbar
     */
    setupRichTextToolbar() {
        const toolbar = document.getElementById('motdToolbar');
        if (!toolbar) return;

        const tools = [
            { id: 'bold', icon: '𝐁', title: 'Bold (Ctrl+B)', action: () => this.formatText('bold') },
            { id: 'italic', icon: '𝐼', title: 'Italic (Ctrl+I)', action: () => this.formatText('italic') },
            { id: 'underline', icon: '𝐔', title: 'Underline (Ctrl+U)', action: () => this.formatText('underline') },
            { id: 'heading', icon: 'H1', title: 'Heading', action: () => this.insertHeading() },
            { id: 'link', icon: '🔗', title: 'Insert Link', action: () => this.insertLink() },
            { id: 'list', icon: '•', title: 'Bullet List', action: () => this.insertList() },
            { id: 'emoji', icon: '😊', title: 'Insert Emoji', action: () => this.showEmojiPicker() }
        ];

        toolbar.innerHTML = tools.map(tool =>
            `<button type="button" class="toolbar-btn" title="${tool.title}" data-action="${tool.id}">
                ${tool.icon}
            </button>`
        ).join('');

        // Add event listeners
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.toolbar-btn');
            if (btn) {
                const action = btn.dataset.action;
                const tool = tools.find(t => t.id === action);
                if (tool) tool.action();
            }
        });
    }

    /**
     * Format text in content area
     */
    formatText(command) {
        const contentArea = document.getElementById('motdContent');
        if (!contentArea) return;

        const start = contentArea.selectionStart;
        const end = contentArea.selectionEnd;
        const selectedText = contentArea.value.substring(start, end);

        if (!selectedText) {
            alert('Please select text to format');
            return;
        }

        let formattedText = selectedText;
        switch (command) {
            case 'bold':
                formattedText = `<strong>${selectedText}</strong>`;
                break;
            case 'italic':
                formattedText = `<em>${selectedText}</em>`;
                break;
            case 'underline':
                formattedText = `<u>${selectedText}</u>`;
                break;
        }

        this.insertTextAtCursor(formattedText, start, end);
    }

    /**
     * Insert heading
     */
    insertHeading() {
        const level = prompt('Heading level (1-3):', '2');
        if (!level || !['1', '2', '3'].includes(level)) return;

        const text = prompt('Heading text:');
        if (!text) return;

        const heading = `<h${level}>${text}</h${level}>`;
        this.insertTextAtCursor(heading);
    }

    /**
     * Insert link
     */
    insertLink() {
        const url = prompt('Enter URL:');
        if (!url) return;

        const text = prompt('Link text:', url);
        const link = `<a href="${url}" target="_blank">${text || url}</a>`;
        this.insertTextAtCursor(link);
    }

    /**
     * Insert list
     */
    insertList() {
        const items = prompt('Enter list items (one per line):');
        if (!items) return;

        const listItems = items.split('\n')
            .filter(item => item.trim())
            .map(item => `<li>${item.trim()}</li>`)
            .join('');

        const list = `<ul>${listItems}</ul>`;
        this.insertTextAtCursor(list);
    }

    /**
     * Show emoji picker
     */
    showEmojiPicker() {
        const emojis = ['😊', '👍', '🎉', '🚀', '✅', '⚠️', '🔥', '💡', '📢', '🗳️', '🌟', '💪', '🤝', '🏛️', '📊'];
        const emoji = prompt(`Select emoji:\n${emojis.map((e, i) => `${i + 1}. ${e}`).join('  ')}\n\nEnter number (1-${emojis.length}):`);

        const index = parseInt(emoji) - 1;
        if (index >= 0 && index < emojis.length) {
            this.insertTextAtCursor(emojis[index]);
        }
    }

    /**
     * Insert text at cursor position
     */
    insertTextAtCursor(text, start = null, end = null) {
        const contentArea = document.getElementById('motdContent');
        if (!contentArea) return;

        const cursorStart = start !== null ? start : contentArea.selectionStart;
        const cursorEnd = end !== null ? end : contentArea.selectionEnd;

        const currentValue = contentArea.value;
        const newValue = currentValue.substring(0, cursorStart) + text + currentValue.substring(cursorEnd);

        contentArea.value = newValue;
        contentArea.focus();
        contentArea.setSelectionRange(cursorStart + text.length, cursorStart + text.length);

        this.updateCharacterCount();
    }

    /**
     * Handle editor keyboard shortcuts
     */
    handleEditorShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.formatText('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.formatText('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    this.formatText('underline');
                    break;
                case 's':
                    e.preventDefault();
                    this.autoSave();
                    break;
            }
        }
    }

    /**
     * Handle paste events
     */
    handlePaste(e) {
        // Allow paste but sanitize content
        setTimeout(() => {
            const contentArea = document.getElementById('motdContent');
            if (contentArea) {
                contentArea.value = this.sanitizeContent(contentArea.value);
                this.updateCharacterCount();
            }
        }, 10);
    }

    /**
     * Toggle preview mode
     */
    async togglePreview() {
        try {
            this.previewMode = !this.previewMode;

            const contentArea = document.getElementById('motdContent');
            const previewArea = document.getElementById('motdPreview');
            const previewBtn = document.getElementById('previewMOTDBtn');

            if (!contentArea || !previewArea || !previewBtn) return;

            if (this.previewMode) {
                // Show preview
                const content = this.sanitizeContent(contentArea.value);
                previewArea.innerHTML = content || '<p>No content to preview</p>';
                previewArea.style.display = 'block';
                contentArea.style.display = 'none';
                previewBtn.textContent = '✏️ Edit';
            } else {
                // Show editor
                previewArea.style.display = 'none';
                contentArea.style.display = 'block';
                previewBtn.textContent = '👁️ Preview';
            }

            await adminDebugLog('MOTDController', 'Preview mode toggled', { previewMode: this.previewMode });
        } catch (error) {
            await adminDebugError('MOTDController', 'Failed to toggle preview mode', error);
        }
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        setInterval(() => {
            if (this.isEditorOpen() && this.hasUnsavedChanges()) {
                this.autoSave();
            }
        }, 30000); // Auto-save every 30 seconds
    }

    /**
     * Auto-save draft
     */
    async autoSave() {
        try {
            const formData = this.getMOTDFormData();
            const draftKey = `motd_draft_${formData.id || 'new'}`;

            localStorage.setItem(draftKey, JSON.stringify({
                ...formData,
                lastSaved: new Date().toISOString()
            }));

            // Show auto-save indicator
            this.showAutoSaveIndicator();

            await adminDebugLog('MOTDController', 'Auto-save completed', { draftKey });
        } catch (error) {
            await adminDebugError('MOTDController', 'Auto-save failed', error);
        }
    }

    /**
     * Load template
     */
    loadTemplate(e) {
        const templateId = e.target.value;
        if (!templateId) return;

        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        if (this.hasUnsavedChanges()) {
            if (!confirm('Loading a template will replace current content. Continue?')) {
                e.target.value = '';
                return;
            }
        }

        document.getElementById('motdContent').value = template.content;
        this.updateCharacterCount();

        // Reset template selector
        e.target.value = '';
    }

    /**
     * Display templates in selector
     */
    displayTemplates() {
        const select = document.getElementById('motdTemplateSelect');
        if (!select) return;

        const categories = [...new Set(this.templates.map(t => t.category))];

        let html = '<option value="">Select a template...</option>';

        categories.forEach(category => {
            html += `<optgroup label="${category.charAt(0).toUpperCase() + category.slice(1)}">`;
            this.templates
                .filter(t => t.category === category)
                .forEach(template => {
                    html += `<option value="${template.id}">${template.name}</option>`;
                });
            html += '</optgroup>';
        });

        select.innerHTML = html;
    }

    /**
     * Update character count
     */
    updateCharacterCount() {
        const contentArea = document.getElementById('motdContent');
        const counter = document.getElementById('characterCount');

        if (!contentArea || !counter) return;

        const length = contentArea.value.length;
        const maxLength = 2000; // Reasonable limit for MOTD content

        counter.textContent = `${length}/${maxLength}`;
        counter.className = length > maxLength ? 'char-count over-limit' : 'char-count';

        if (length > maxLength) {
            counter.textContent += ' (Over limit)';
        }
    }

    /**
     * Get MOTD form data
     */
    getMOTDFormData() {
        const editor = document.getElementById('motdEditor');
        return {
            id: editor?.dataset.motdId || null,
            title: document.getElementById('motdTitle')?.value?.trim() || '',
            content: document.getElementById('motdContent')?.value?.trim() || '',
            priority: document.getElementById('motdPriority')?.value || 'medium',
            targetAudience: document.getElementById('motdTargetAudience')?.value || 'all',
            startDate: document.getElementById('motdStartDate')?.value || null,
            endDate: document.getElementById('motdEndDate')?.value || null,
            isActive: document.getElementById('motdIsActive')?.checked || false,
            isDismissible: document.getElementById('motdIsDismissible')?.checked || true,
            showOnce: document.getElementById('motdShowOnce')?.checked || false
        };
    }

    /**
     * Get schedule form data
     */
    getScheduleFormData() {
        return {
            motdId: document.getElementById('scheduleMOTDSelect')?.value || null,
            startDate: document.getElementById('scheduleStartDate')?.value || null,
            endDate: document.getElementById('scheduleEndDate')?.value || null,
            timezone: document.getElementById('scheduleTimezone')?.value || 'UTC'
        };
    }

    /**
     * Validate MOTD content
     */
    validateMOTDContent(data) {
        const errors = [];

        if (!data.title || data.title.length < 3) {
            errors.push('Title must be at least 3 characters long');
        }

        if (!data.content || data.content.length < 10) {
            errors.push('Content must be at least 10 characters long');
        }

        if (data.content && data.content.length > 2000) {
            errors.push('Content must be less than 2000 characters');
        }

        if (!data.startDate) {
            errors.push('Start date is required');
        }

        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            errors.push('End date must be after start date');
        }

        // Validate HTML content
        if (data.content) {
            const sanitized = this.sanitizeContent(data.content);
            if (sanitized !== data.content) {
                errors.push('Content contains potentially unsafe HTML');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitize content to prevent XSS
     */
    sanitizeContent(content) {
        if (!content) return '';

        // Allow specific HTML tags only
        const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a'];
        const allowedAttributes = {
            'a': ['href', 'target', 'title']
        };

        // Basic sanitization - in production, use DOMPurify
        let sanitized = content
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');

        // Validate links
        sanitized = sanitized.replace(/<a\s+href\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, url) => {
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
                return match;
            }
            return match.replace(url, '#');
        });

        return sanitized;
    }

    /**
     * Utility methods
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateRange(startDate, endDate) {
        if (!startDate && !endDate) return 'No schedule';
        if (!endDate) return `From ${this.formatDate(startDate)}`;
        if (!startDate) return `Until ${this.formatDate(endDate)}`;

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start.toDateString() === end.toDateString()) {
            return `${start.toLocaleDateString()} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
        }

        return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16); // Format for datetime-local input
    }

    getTargetAudienceIcon(audience) {
        const icons = {
            'all': '👥',
            'new': '🆕',
            'active': '⚡',
            'inactive': '😴',
            'admins': '👑',
            'moderators': '🛡️',
            'candidates': '🗳️'
        };
        return icons[audience] || '👥';
    }

    showMOTDEditor() {
        const editor = document.getElementById('motdEditor');
        if (editor) {
            editor.style.display = 'block';
            editor.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideMOTDEditor() {
        const editor = document.getElementById('motdEditor');
        if (editor) {
            editor.style.display = 'none';
            delete editor.dataset.motdId;
        }
        this.clearEditor();
    }

    clearEditor() {
        const fields = ['motdTitle', 'motdContent'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });

        this.isEditing = false;
        this.previewMode = false;
        this.updateCharacterCount();
    }

    isEditorOpen() {
        const editor = document.getElementById('motdEditor');
        return editor && editor.style.display !== 'none';
    }

    hasUnsavedChanges() {
        const formData = this.getMOTDFormData();
        return formData.title || formData.content;
    }

    showAutoSaveIndicator() {
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.textContent = '✅ Auto-saved';
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 2000);
        }
    }

    showMOTDDetails(motd) {
        // Implementation for showing MOTD details modal
        alert(`MOTD Details:\n\nTitle: ${motd.title}\nStatus: ${motd.isActive ? 'Active' : 'Inactive'}\nPriority: ${motd.priority}\nViews: ${motd.views || 0}\nClicks: ${motd.clicks || 0}\nDismissals: ${motd.dismissals || 0}`);
    }

    updatePerformanceCharts(analytics) {
        // Implementation for updating performance charts
        console.log('Performance charts updated:', analytics);
    }

    updateEngagementMetrics(analytics) {
        // Implementation for updating engagement metrics
        console.log('Engagement metrics updated:', analytics);
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('MOTDController Error:', message);

        const container = document.getElementById('motdContainer');
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        // Clear any intervals
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        // Remove event listeners
        const createBtn = document.getElementById('createMOTDBtn');
        if (createBtn) {
            createBtn.removeEventListener('click', this.handleCreateMOTD);
        }

        // Clear data
        this.currentMOTDs = [];
        this.templates = [];
        this.isInitialized = false;

        console.log('MOTDController destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MOTDController;
} else {
    window.MOTDController = MOTDController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.motdController = new MOTDController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.motdController = new MOTDController();
            }
        }, 100);
    });
}