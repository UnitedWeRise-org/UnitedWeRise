/**
 * @module admin/controllers/PetitionsController
 * @description Admin controller for petition management — listing, filtering,
 * status changes, and oversight of the petition signing system.
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Follows ReportsController pattern for consistency
 */

class PetitionsController {
    constructor() {
        this.sectionId = 'petitions';
        this.section = null;
        this.isInitialized = false;
        this.currentPetitions = [];
        this.filters = { status: 'all', category: 'all', search: '' };
        this.pagination = { page: 1, limit: 25, total: 0, pages: 0 };
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
        this.refreshInterval = null;
        this.searchTimeout = null;
        this.expandedPetitionId = null;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayPetitions = this.displayPetitions.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
    }

    /**
     * Initialize the petitions controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            this.section = document.getElementById(this.sectionId);
            if (!this.section) {
                adminDebugError('PetitionsController', 'Section #petitions not found - cannot initialize');
                return;
            }

            // Override AdminState display method for petitions
            if (window.AdminState) {
                window.AdminState.displayPetitionsData = this.displayPetitions.bind(this);
            }

            this.setupEventListeners();
            this.setupDataActionDelegation();
            await this.loadData();
            this.setupAutoRefresh();

            this.isInitialized = true;

            await adminDebugLog('PetitionsController', 'Controller initialized successfully');
        } catch (error) {
            adminDebugError('PetitionsController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for petitions section
     */
    setupEventListeners() {
        // Status filter
        const statusFilter = document.getElementById('petitionStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filters.status = statusFilter.value;
                this.pagination.page = 1;
                this.handleFilterChange();
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('petitionCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filters.category = categoryFilter.value;
                this.pagination.page = 1;
                this.handleFilterChange();
            });
        }

        // Search input with debounce
        const searchInput = document.getElementById('petitionsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.pagination.page = 1;
                    this.handleFilterChange();
                }, 500);
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshPetitionsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefresh);
        }

        adminDebugLog('PetitionsController', 'Event listeners set up successfully');
    }

    /**
     * Set up scoped event delegation for dynamic petition actions
     * Uses scoped event delegation to #petitions section (follows commit a190b4d pattern)
     */
    setupDataActionDelegation() {
        this.handleDataActionClick = this.handleDataActionClick.bind(this);
        this.section.addEventListener('click', this.handleDataActionClick);

        adminDebugLog('PetitionsController', 'Data-action event delegation established (scoped to #petitions)');
    }

    /**
     * Centralized data-action click handler
     * Routes all data-action events to appropriate methods
     */
    async handleDataActionClick(event) {
        const button = event.target.closest('[data-petition-action]');
        if (!button) return;

        const action = button.getAttribute('data-petition-action');
        const petitionId = button.getAttribute('data-petition-id');
        if (!action || !petitionId) return;

        event.preventDefault();
        event.stopPropagation();

        switch (action) {
            case 'view':
                await this.viewPetitionDetail(petitionId);
                break;
            case 'activate':
                await this.changePetitionStatus(petitionId, 'ACTIVE');
                break;
            case 'close':
                await this.changePetitionStatus(petitionId, 'CLOSED');
                break;
            case 'archive':
                await this.changePetitionStatus(petitionId, 'ARCHIVED');
                break;
            case 'delete':
                await this.deletePetition(petitionId);
                break;
            case 'copy-link':
                await this.copySigningLink(petitionId);
                break;
            case 'page':
                this.pagination.page = parseInt(button.getAttribute('data-page'), 10);
                await this.loadData();
                break;
            default:
                adminDebugLog('PetitionsController', 'Unknown petition action', { action });
        }
    }

    /**
     * Handle filter changes — reload data with current filters
     */
    async handleFilterChange() {
        try {
            await this.loadData();
        } catch (error) {
            adminDebugError('PetitionsController', 'Filter change failed', error);
        }
    }

    /**
     * Handle manual refresh
     */
    async handleRefresh() {
        try {
            const refreshBtn = document.getElementById('refreshPetitionsBtn');
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Refreshing...';
            }

            await this.loadData();

            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh';
            }

            await adminDebugLog('PetitionsController', 'Manual refresh completed');
        } catch (error) {
            const refreshBtn = document.getElementById('refreshPetitionsBtn');
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh';
            }
            adminDebugError('PetitionsController', 'Manual refresh failed', error);
        }
    }

    /**
     * Load petitions data from API
     * @param {boolean} [useCache=false] - Whether to use cached data
     */
    async loadData(useCache = false) {
        try {
            const params = {
                page: this.pagination.page,
                limit: this.pagination.limit,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            };

            if (this.filters.status !== 'all') params.status = this.filters.status;
            if (this.filters.category !== 'all') params.category = this.filters.category;
            if (this.filters.search) params.search = this.filters.search;

            const result = await window.AdminAPI.getPetitions(params);
            this.displayPetitions(result);

            await adminDebugLog('PetitionsController', 'Petitions data loaded', {
                count: result?.petitions?.length || 0,
                total: result?.pagination?.total || 0,
                filters: this.filters
            });
        } catch (error) {
            adminDebugError('PetitionsController', 'Failed to load petitions data', error);
            this.showError('Failed to load petitions data');
        }
    }

    /**
     * Display petitions data in the table
     * @param {Object} data - Petitions data with pagination
     */
    displayPetitions(data) {
        const container = document.getElementById('petitionsContent');
        if (!container) return;

        const petitions = data?.petitions || [];
        this.currentPetitions = petitions;

        // Update pagination state
        if (data?.pagination) {
            this.pagination.total = data.pagination.total || 0;
            this.pagination.pages = data.pagination.pages || 0;
            this.pagination.page = data.pagination.page || 1;
        }

        if (!petitions.length) {
            container.innerHTML = '<div class="no-data" style="text-align: center; color: #666; padding: 2rem;">No petitions found matching your filters.</div>';
            this.renderPagination();
            return;
        }

        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Creator</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Signatures</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        petitions.forEach(petition => {
            html += this.renderPetitionRow(petition);
        });

        html += '</tbody></table>';
        container.innerHTML = html;

        this.renderPagination();
    }

    /**
     * Render a single petition table row
     * @param {Object} petition - Petition data
     * @returns {string} HTML string for the row
     */
    renderPetitionRow(petition) {
        const statusColors = {
            'DRAFT': '#6c757d',
            'ACTIVE': '#28a745',
            'CLOSED': '#dc3545',
            'ARCHIVED': '#17a2b8',
            'SUBMITTED_TO_STATE': '#fd7e14'
        };

        const categoryColors = {
            'BALLOT_ACCESS': '#6f42c1',
            'CIVIC_ADVOCACY': '#28a745',
            'COMMUNITY': '#17a2b8',
            'POLICY': '#fd7e14'
        };

        const statusColor = statusColors[petition.status] || '#6c757d';
        const categoryColor = categoryColors[petition.category] || '#6c757d';
        const categoryLabel = (petition.category || 'N/A').replace(/_/g, ' ');

        const current = petition.currentSignatures || 0;
        const goal = petition.signatureGoal || 0;
        const progressPct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;

        const signaturesHtml = goal > 0
            ? `<div style="min-width: 120px;">
                   <span>${current} / ${goal}</span>
                   <div style="background: #e9ecef; border-radius: 4px; height: 6px; margin-top: 4px;">
                       <div style="background: #28a745; width: ${progressPct}%; height: 100%; border-radius: 4px;"></div>
                   </div>
               </div>`
            : `<span>${current}</span>`;

        const creatorName = petition.creator?.username || petition.creator?.name || 'Unknown';
        const createdDate = new Date(petition.createdAt).toLocaleDateString();
        const createdTime = new Date(petition.createdAt).toLocaleTimeString();

        // Build action buttons based on status
        let actionButtons = `
            <button data-petition-action="view" data-petition-id="${petition.id}" class="btn-sm" style="background: #17a2b8; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer; margin: 1px;">
                View
            </button>
        `;

        if (petition.status === 'DRAFT') {
            actionButtons += `
                <button data-petition-action="activate" data-petition-id="${petition.id}" class="btn-sm" style="background: #28a745; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer; margin: 1px;">
                    Activate
                </button>
            `;
        }

        if (petition.status === 'ACTIVE') {
            actionButtons += `
                <button data-petition-action="close" data-petition-id="${petition.id}" class="btn-sm" style="background: #dc3545; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer; margin: 1px;">
                    Close
                </button>
            `;
        }

        actionButtons += `
            <button data-petition-action="archive" data-petition-id="${petition.id}" class="btn-sm" style="background: #6c757d; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer; margin: 1px;">
                Archive
            </button>
            <button data-petition-action="delete" data-petition-id="${petition.id}" class="btn-sm" style="background: #dc3545; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer; margin: 1px;">
                Delete
            </button>
        `;

        return `
            <tr id="petition-row-${petition.id}">
                <td>
                    <strong>${this.escapeHtml(petition.title || 'Untitled')}</strong>
                </td>
                <td>
                    <span>${this.escapeHtml(creatorName)}</span>
                </td>
                <td>
                    <span style="background: ${categoryColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
                        ${categoryLabel}
                    </span>
                </td>
                <td>
                    <span style="background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
                        ${petition.status}
                    </span>
                </td>
                <td>${signaturesHtml}</td>
                <td>
                    ${createdDate}<br>
                    <small>${createdTime}</small>
                </td>
                <td style="white-space: nowrap;">
                    ${actionButtons}
                </td>
            </tr>
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const container = document.getElementById('petitionsPagination');
        if (!container) return;

        if (this.pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<div style="display: flex; justify-content: center; gap: 0.5rem; align-items: center;">';

        // Previous button
        if (this.pagination.page > 1) {
            html += `<button data-petition-action="page" data-petition-id="nav" data-page="${this.pagination.page - 1}" class="btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; background: white;">Prev</button>`;
        }

        // Page numbers
        const startPage = Math.max(1, this.pagination.page - 2);
        const endPage = Math.min(this.pagination.pages, this.pagination.page + 2);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.pagination.page;
            html += `<button data-petition-action="page" data-petition-id="nav" data-page="${i}" class="btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; background: ${isActive ? '#4b5c09' : 'white'}; color: ${isActive ? 'white' : '#333'}; font-weight: ${isActive ? 'bold' : 'normal'};">${i}</button>`;
        }

        // Next button
        if (this.pagination.page < this.pagination.pages) {
            html += `<button data-petition-action="page" data-petition-id="nav" data-page="${this.pagination.page + 1}" class="btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; background: white;">Next</button>`;
        }

        html += `<span style="margin-left: 1rem; color: #666; font-size: 0.9rem;">Page ${this.pagination.page} of ${this.pagination.pages} (${this.pagination.total} total)</span>`;
        html += '</div>';

        container.innerHTML = html;
    }

    /**
     * View petition detail — expand a detail panel below the row
     * @param {string} id - Petition ID
     */
    async viewPetitionDetail(id) {
        try {
            // Toggle expansion
            if (this.expandedPetitionId === id) {
                const existingDetail = document.getElementById(`petition-detail-${id}`);
                if (existingDetail) existingDetail.remove();
                this.expandedPetitionId = null;
                return;
            }

            // Remove any previously expanded detail
            if (this.expandedPetitionId) {
                const prevDetail = document.getElementById(`petition-detail-${this.expandedPetitionId}`);
                if (prevDetail) prevDetail.remove();
            }

            this.expandedPetitionId = id;

            const result = await window.AdminAPI.getPetitionDetails(id);
            const petition = result?.petition || result || {};

            const row = document.getElementById(`petition-row-${id}`);
            if (!row) return;

            const detailRow = document.createElement('tr');
            detailRow.id = `petition-detail-${id}`;
            detailRow.innerHTML = `
                <td colspan="7" style="padding: 1rem; background: #f8f9fa; border-left: 4px solid #4b5c09;">
                    ${this.renderPetitionDetailPanel(petition)}
                </td>
            `;

            row.after(detailRow);

            await adminDebugLog('PetitionsController', 'Petition detail expanded', { petitionId: id });
        } catch (error) {
            adminDebugError('PetitionsController', 'Failed to load petition details', error);
            this.showError('Failed to load petition details');
        }
    }

    /**
     * Render the petition detail panel HTML
     * @param {Object} petition - Full petition data
     * @returns {string} HTML string for the detail panel
     */
    renderPetitionDetailPanel(petition) {
        const description = this.escapeHtml(petition.description || 'No description provided.');
        const attestation = this.escapeHtml(petition.attestationLanguage || 'N/A');
        const requiredFields = (petition.requiredFields || []).join(', ') || 'None specified';
        const signingUrl = petition.signingUrl || `${window.location.origin}/petitions/${petition.id}/sign`;

        let signaturesTable = '<p style="color: #666;">No signatures yet.</p>';
        const signatures = petition.signatures || [];
        if (signatures.length > 0) {
            signaturesTable = `
                <table class="data-table" style="margin-top: 0.5rem;">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>Verified</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${signatures.slice(0, 50).map(sig => `
                            <tr>
                                <td>${this.escapeHtml(sig.name || sig.signerName || 'Anonymous')}</td>
                                <td>${this.escapeHtml(sig.location || sig.city || 'N/A')}</td>
                                <td>${new Date(sig.signedAt || sig.createdAt).toLocaleDateString()}</td>
                                <td>${sig.verified ? '<span style="color: #28a745;">Yes</span>' : '<span style="color: #dc3545;">No</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${signatures.length > 50 ? `<p style="color: #666; font-style: italic;">Showing first 50 of ${signatures.length} signatures.</p>` : ''}
            `;
        }

        let auditLogHtml = '';
        const auditLog = petition.auditLog || [];
        if (auditLog.length > 0) {
            auditLogHtml = `
                <details style="margin-top: 1rem;">
                    <summary style="cursor: pointer; font-weight: bold; color: #4b5c09;">Audit Log (${auditLog.length} entries)</summary>
                    <table class="data-table" style="margin-top: 0.5rem;">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Action</th>
                                <th>Actor</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${auditLog.map(entry => `
                                <tr>
                                    <td>${new Date(entry.createdAt || entry.timestamp).toLocaleString()}</td>
                                    <td>${this.escapeHtml(entry.action || 'N/A')}</td>
                                    <td>${this.escapeHtml(entry.actor?.username || entry.adminName || 'System')}</td>
                                    <td>${this.escapeHtml(entry.details || entry.reason || '')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </details>
            `;
        }

        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <h4 style="margin: 0 0 0.5rem;">Description</h4>
                    <p style="color: #333; white-space: pre-wrap;">${description}</p>

                    <h4 style="margin: 1rem 0 0.5rem;">Attestation Language</h4>
                    <p style="color: #333; font-style: italic;">${attestation}</p>

                    <h4 style="margin: 1rem 0 0.5rem;">Required Fields</h4>
                    <p style="color: #333;">${requiredFields}</p>
                </div>
                <div>
                    <h4 style="margin: 0 0 0.5rem;">Signing URL</h4>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="text" value="${this.escapeHtml(signingUrl)}" readonly style="flex: 1; padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 3px; font-size: 0.85rem;">
                        <button data-petition-action="copy-link" data-petition-id="${petition.id}" class="btn-sm" style="background: #4b5c09; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 3px; cursor: pointer;">
                            Copy
                        </button>
                    </div>
                </div>
            </div>

            <h4 style="margin: 1rem 0 0.5rem;">Signatures (${signatures.length})</h4>
            ${signaturesTable}

            ${auditLogHtml}
        `;
    }

    /**
     * Change petition status (activate, close, archive)
     * @param {string} id - Petition ID
     * @param {string} newStatus - New status value
     */
    async changePetitionStatus(id, newStatus) {
        try {
            let reason = '';

            if (newStatus === 'CLOSED') {
                reason = window.prompt('Please provide a reason for closing this petition:');
                if (reason === null) return; // User cancelled
                if (!reason.trim()) {
                    this.showError('A reason is required when closing a petition.');
                    return;
                }
            }

            if (newStatus === 'ARCHIVED') {
                if (!confirm('Are you sure you want to archive this petition?')) return;
            }

            await window.AdminAPI.changePetitionStatus(id, newStatus, reason);
            await this.loadData();

            await adminDebugLog('PetitionsController', 'Petition status changed', {
                petitionId: id,
                newStatus,
                reason: reason || 'N/A'
            });
        } catch (error) {
            adminDebugError('PetitionsController', 'Failed to change petition status', error);
            this.showError(`Failed to change petition status: ${error.message}`);
        }
    }

    /**
     * Delete a petition (requires user confirmation)
     * @param {string} id - Petition ID
     */
    async deletePetition(id) {
        try {
            if (!confirm('Are you sure you want to delete this petition? This action cannot be undone.')) {
                return;
            }

            // Request TOTP confirmation if available
            if (typeof window.requestTOTPConfirmation === 'function') {
                const confirmed = await window.requestTOTPConfirmation();
                if (!confirmed) return;
            }

            await window.AdminAPI.deletePetition(id);
            await this.loadData();

            await adminDebugLog('PetitionsController', 'Petition deleted', { petitionId: id });
        } catch (error) {
            adminDebugError('PetitionsController', 'Failed to delete petition', error);
            this.showError(`Failed to delete petition: ${error.message}`);
        }
    }

    /**
     * Copy petition signing link to clipboard
     * @param {string} id - Petition ID
     */
    async copySigningLink(id) {
        try {
            const petition = this.currentPetitions.find(p => p.id === id);
            const signingUrl = petition?.signingUrl || `${window.location.origin}/petitions/${id}/sign`;

            await navigator.clipboard.writeText(signingUrl);

            await adminDebugLog('PetitionsController', 'Signing link copied to clipboard', { petitionId: id });
        } catch (error) {
            adminDebugError('PetitionsController', 'Failed to copy signing link', error);
        }
    }

    /**
     * Set up automatic refresh every 5 minutes
     */
    setupAutoRefresh() {
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadData();
            } catch (error) {
                adminDebugError('PetitionsController', 'Auto-refresh failed', error);
            }
        }, 300000);

        // Clear interval when session ends to prevent 401 cascades
        window.addEventListener('adminSessionEnded', () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        }, { once: true });
    }

    /**
     * Show error message in UI
     * @param {string} message - Error message to display
     */
    showError(message) {
        // Suppress errors when session is ending (logout, recovery, or expired)
        if (window.AdminAPI?.isLoggingOut || window.adminAuth?.isRecovering ||
            (window.adminAuth && !window.adminAuth.isAuthenticated())) {
            console.warn('PetitionsController: Error suppressed (session ending):', message);
            return;
        }

        adminDebugError('PetitionsController', message);

        const container = document.getElementById('petitionsContent');
        if (container) {
            container.innerHTML = `<div class="error" style="color: #dc3545; padding: 1rem; text-align: center;">${this.escapeHtml(message)}</div>`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped HTML string
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        const refreshBtn = document.getElementById('refreshPetitionsBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.handleRefresh);
        }

        if (this.handleDataActionClick && this.section) {
            this.section.removeEventListener('click', this.handleDataActionClick);
        }

        this.currentPetitions = [];
        this.isInitialized = false;
        this.expandedPetitionId = null;

        adminDebugLog('PetitionsController', 'Controller destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetitionsController;
} else {
    window.PetitionsController = PetitionsController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.petitionsController = new PetitionsController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.petitionsController = new PetitionsController();
            }
        }, 100);
    });
}
