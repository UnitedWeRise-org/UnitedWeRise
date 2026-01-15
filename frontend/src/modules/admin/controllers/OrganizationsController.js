/**
 * OrganizationsController - Handles admin dashboard organizations section
 * Super-admin organization management functionality
 *
 * @module admin/controllers/OrganizationsController
 */

class OrganizationsController {
    constructor() {
        this.sectionId = 'organizations';
        this.isInitialized = false;
        this.currentOrganizations = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalOrganizations = 0;
        this.searchQuery = '';
        this.statusFilter = 'all';
        this.sortFilter = 'newest';

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadOrganizations = this.loadOrganizations.bind(this);
        this.displayOrganizationsTable = this.displayOrganizationsTable.bind(this);
        this.renderOrganizationRow = this.renderOrganizationRow.bind(this);
        this.handleOrganizationActions = this.handleOrganizationActions.bind(this);
        this.showOrganizationDetails = this.showOrganizationDetails.bind(this);
        this.showAddMemberModal = this.showAddMemberModal.bind(this);
        this.addMember = this.addMember.bind(this);
        this.removeMember = this.removeMember.bind(this);
        this.showTransferHeadshipModal = this.showTransferHeadshipModal.bind(this);
        this.transferHeadship = this.transferHeadship.bind(this);
        this.showDeactivateModal = this.showDeactivateModal.bind(this);
        this.deactivateOrganization = this.deactivateOrganization.bind(this);
        this.reactivateOrganization = this.reactivateOrganization.bind(this);
    }

    /**
     * Initialize the organizations controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            this.section = document.getElementById(this.sectionId);
            if (!this.section) {
                console.error('[OrganizationsController] Section #organizations not found');
                return;
            }

            await this.setupEventListeners();
            await this.loadOrganizations();

            this.isInitialized = true;
            await adminDebugLog('OrganizationsController', 'Controller initialized');
        } catch (error) {
            console.error('Error initializing OrganizationsController:', error);
            await adminDebugError('OrganizationsController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners
     */
    async setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('orgSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadOrganizations();
                }, 300);
            });
        }

        // Status filter
        const statusFilter = document.getElementById('orgStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.loadOrganizations();
            });
        }

        // Sort filter
        const sortFilter = document.getElementById('orgSortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.sortFilter = e.target.value;
                this.currentPage = 1;
                this.loadOrganizations();
            });
        }

        // Event delegation for dynamic content
        this.setupEventDelegation();

        await adminDebugLog('OrganizationsController', 'Event listeners set up');
    }

    /**
     * Set up event delegation for dynamic content
     */
    setupEventDelegation() {
        if (this.section) {
            this.section.removeEventListener('click', this.handleOrganizationActions);
        }
        this.section.addEventListener('click', this.handleOrganizationActions);
    }

    /**
     * Handle organization actions via event delegation
     */
    async handleOrganizationActions(event) {
        const actionElement = event.target.closest('[data-action]');
        if (!actionElement) return;

        const action = actionElement.dataset.action;
        const target = actionElement.dataset.target;

        switch (action) {
            case 'view-org-details':
                event.preventDefault();
                await this.showOrganizationDetails(target);
                break;
            case 'show-add-member-modal':
                event.preventDefault();
                await this.showAddMemberModal(target);
                break;
            case 'add-org-member':
                event.preventDefault();
                await this.addMember(target);
                break;
            case 'remove-org-member':
                event.preventDefault();
                const membershipId = actionElement.dataset.membershipId;
                await this.removeMember(target, membershipId);
                break;
            case 'show-transfer-headship-modal':
                event.preventDefault();
                await this.showTransferHeadshipModal(target);
                break;
            case 'transfer-headship':
                event.preventDefault();
                await this.transferHeadship(target);
                break;
            case 'show-deactivate-modal':
                event.preventDefault();
                await this.showDeactivateModal(target);
                break;
            case 'deactivate-org':
                event.preventDefault();
                await this.deactivateOrganization(target);
                break;
            case 'reactivate-org':
                event.preventDefault();
                await this.reactivateOrganization(target);
                break;
            case 'close-modal':
                event.preventDefault();
                const modal = actionElement.closest('.modal-overlay');
                if (modal) modal.remove();
                break;
            case 'org-page':
                event.preventDefault();
                this.currentPage = parseInt(target);
                await this.loadOrganizations();
                break;
        }
    }

    /**
     * Load organizations from API
     */
    async loadOrganizations() {
        const container = document.getElementById('organizationsTable');
        if (!container) return;

        container.innerHTML = '<p class="loading">Loading organizations...</p>';

        try {
            const params = {
                page: this.currentPage,
                limit: this.pageSize,
                sort: this.sortFilter
            };
            if (this.searchQuery) params.search = this.searchQuery;
            if (this.statusFilter !== 'all') params.status = this.statusFilter;

            const response = await window.AdminAPI.getAdminOrganizations(params);

            if (response.success) {
                this.currentOrganizations = response.organizations;
                this.totalOrganizations = response.pagination.total;
                this.displayOrganizationsTable(response.organizations, response.pagination);
            } else {
                container.innerHTML = '<p class="error">Failed to load organizations</p>';
            }
        } catch (error) {
            console.error('Error loading organizations:', error);
            container.innerHTML = '<p class="error">Error loading organizations</p>';
        }
    }

    /**
     * Display organizations table
     */
    displayOrganizationsTable(organizations, pagination) {
        const container = document.getElementById('organizationsTable');
        if (!container) return;

        if (!organizations || organizations.length === 0) {
            container.innerHTML = '<p class="no-data">No organizations found</p>';
            return;
        }

        const tableHtml = `
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Organization</th>
                            <th>Head</th>
                            <th>Members</th>
                            <th>Status</th>
                            <th>Verified</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${organizations.map(org => this.renderOrganizationRow(org)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;

        // Render pagination
        this.renderPagination(pagination);
    }

    /**
     * Render a single organization row
     */
    renderOrganizationRow(org) {
        const statusBadge = org.isActive
            ? '<span class="status-badge active">Active</span>'
            : '<span class="status-badge inactive">Inactive</span>';

        const verifiedBadge = org.isVerified
            ? '<span class="verified-badge" title="Verified">✓</span>'
            : '<span class="unverified-badge" title="Not verified">-</span>';

        const headName = org.head
            ? `${org.head.firstName || ''} ${org.head.lastName || ''} (@${org.head.username})`.trim()
            : 'Unknown';

        const memberCount = org._count?.members || 0;
        const createdDate = new Date(org.createdAt).toLocaleDateString();

        return `
            <tr data-org-id="${org.id}">
                <td>
                    <div class="org-name-cell">
                        <strong>${this.escapeHtml(org.name)}</strong>
                        <small class="org-slug">/${org.slug}</small>
                    </div>
                </td>
                <td>${this.escapeHtml(headName)}</td>
                <td>${memberCount}</td>
                <td>${statusBadge}</td>
                <td>${verifiedBadge}</td>
                <td>${createdDate}</td>
                <td class="actions">
                    <button class="action-btn" data-action="view-org-details" data-target="${org.id}" title="View Details">
                        👁️ Details
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination(pagination) {
        const container = document.getElementById('orgPagination');
        if (!container) return;

        const totalPages = pagination.pages;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHtml = '<div class="pagination">';

        // Previous button
        if (this.currentPage > 1) {
            paginationHtml += `<button class="page-btn" data-action="org-page" data-target="${this.currentPage - 1}">← Prev</button>`;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHtml += `<button class="page-btn" data-action="org-page" data-target="1">1</button>`;
            if (startPage > 2) paginationHtml += '<span class="page-ellipsis">...</span>';
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHtml += `<button class="page-btn ${activeClass}" data-action="org-page" data-target="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHtml += '<span class="page-ellipsis">...</span>';
            paginationHtml += `<button class="page-btn" data-action="org-page" data-target="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHtml += `<button class="page-btn" data-action="org-page" data-target="${this.currentPage + 1}">Next →</button>`;
        }

        paginationHtml += '</div>';
        container.innerHTML = paginationHtml;
    }

    /**
     * Show organization details modal
     */
    async showOrganizationDetails(orgId) {
        try {
            const response = await window.AdminAPI.getAdminOrganization(orgId);
            if (!response.success) {
                alert('Failed to load organization details');
                return;
            }

            const { organization, members, verificationHistory } = response;

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 1000;
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
            `;

            // Close on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            const headName = organization.head
                ? `${organization.head.firstName || ''} ${organization.head.lastName || ''} (@${organization.head.username})`.trim()
                : 'Unknown';

            const statusBadge = organization.isActive
                ? '<span class="status-badge active">Active</span>'
                : '<span class="status-badge inactive">Inactive</span>';

            const verifiedBadge = organization.isVerified
                ? '<span class="verified-badge">✓ Verified</span>'
                : '';

            const membersHtml = members.members.length > 0
                ? members.members.map(m => `
                    <tr>
                        <td>${this.escapeHtml(m.user?.username || 'Unknown')}</td>
                        <td>${m.role?.name || '-'}</td>
                        <td><span class="status-badge ${m.status.toLowerCase()}">${m.status}</span></td>
                        <td>${m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '-'}</td>
                        <td>
                            ${m.userId !== organization.headUserId ? `
                                <button class="action-btn danger" data-action="remove-org-member" data-target="${orgId}" data-membership-id="${m.id}" title="Remove Member">
                                    🗑️
                                </button>
                            ` : '<span title="Organization head">👑</span>'}
                        </td>
                    </tr>
                `).join('')
                : '<tr><td colspan="5" class="no-data">No members found</td></tr>';

            modal.innerHTML = `
                <div style="background: white; border-radius: 12px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;">
                    <button data-action="close-modal" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>

                    <div style="padding: 1.5rem; border-bottom: 1px solid #eee;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            ${organization.avatar ? `<img src="${organization.avatar}" alt="${organization.name}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">` : ''}
                            <div>
                                <h2 style="margin: 0;">${this.escapeHtml(organization.name)} ${verifiedBadge}</h2>
                                <p style="margin: 0.25rem 0; color: #666;">/${organization.slug}</p>
                            </div>
                            <div style="margin-left: auto;">
                                ${statusBadge}
                            </div>
                        </div>
                    </div>

                    <div style="padding: 1.5rem;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                            <div>
                                <strong>Head:</strong><br>
                                ${this.escapeHtml(headName)}
                            </div>
                            <div>
                                <strong>Members:</strong><br>
                                ${members.total} total
                            </div>
                            <div>
                                <strong>Created:</strong><br>
                                ${new Date(organization.createdAt).toLocaleDateString()}
                            </div>
                            ${organization.website ? `
                            <div>
                                <strong>Website:</strong><br>
                                <a href="${organization.website}" target="_blank">${organization.website}</a>
                            </div>
                            ` : ''}
                        </div>

                        ${organization.description ? `
                        <div style="margin-bottom: 1.5rem;">
                            <strong>Description:</strong>
                            <p>${this.escapeHtml(organization.description)}</p>
                        </div>
                        ` : ''}

                        <div style="margin-bottom: 1.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <strong>Members (${members.total})</strong>
                                <button class="action-btn" data-action="show-add-member-modal" data-target="${orgId}">
                                    ➕ Add Member
                                </button>
                            </div>
                            <div class="admin-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Joined</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${membersHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; padding-top: 1rem; border-top: 1px solid #eee;">
                            <button class="action-btn" data-action="show-transfer-headship-modal" data-target="${orgId}">
                                👑 Transfer Headship
                            </button>
                            ${organization.isActive ? `
                                <button class="action-btn danger" data-action="show-deactivate-modal" data-target="${orgId}">
                                    🚫 Deactivate
                                </button>
                            ` : `
                                <button class="action-btn success" data-action="reactivate-org" data-target="${orgId}">
                                    ✅ Reactivate
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            console.error('Error showing organization details:', error);
            alert('Error loading organization details');
        }
    }

    /**
     * Show add member modal
     */
    async showAddMemberModal(orgId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 1001;
            display: flex; align-items: center; justify-content: center;
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; max-width: 400px; width: 100%;">
                <h3 style="margin-top: 0;">Add Member to Organization</h3>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">User ID</label>
                    <input type="text" id="addMemberUserId" placeholder="Enter user ID" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    <small style="color: #666;">You can find user IDs in the Users section</small>
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Status</label>
                    <select id="addMemberStatus" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="ACTIVE">Active (immediate membership)</option>
                        <option value="PENDING">Pending (requires approval)</option>
                    </select>
                </div>

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="action-btn" data-action="close-modal">Cancel</button>
                    <button class="action-btn success" data-action="add-org-member" data-target="${orgId}">Add Member</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Add member to organization
     */
    async addMember(orgId) {
        const userIdInput = document.getElementById('addMemberUserId');
        const statusSelect = document.getElementById('addMemberStatus');

        if (!userIdInput || !statusSelect) return;

        const userId = userIdInput.value.trim();
        const status = statusSelect.value;

        if (!userId) {
            alert('Please enter a user ID');
            return;
        }

        try {
            const response = await window.AdminAPI.addOrganizationMember(orgId, userId, status);
            if (response.success) {
                alert('Member added successfully');
                // Close add member modal and refresh details
                document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
                await this.showOrganizationDetails(orgId);
                await this.loadOrganizations();
            } else {
                alert(response.error || 'Failed to add member');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Error adding member');
        }
    }

    /**
     * Remove member from organization
     */
    async removeMember(orgId, membershipId) {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            const response = await window.AdminAPI.removeOrganizationMember(orgId, membershipId, 'Removed by admin');
            if (response.success) {
                alert('Member removed');
                // Refresh details modal
                document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
                await this.showOrganizationDetails(orgId);
                await this.loadOrganizations();
            } else {
                alert(response.error || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Error removing member');
        }
    }

    /**
     * Show transfer headship modal
     */
    async showTransferHeadshipModal(orgId) {
        // First get org details to list members
        try {
            const response = await window.AdminAPI.getAdminOrganization(orgId);
            if (!response.success) {
                alert('Failed to load organization');
                return;
            }

            const { organization, members } = response;
            const activeMembers = members.members.filter(m =>
                m.status === 'ACTIVE' && m.userId !== organization.headUserId
            );

            if (activeMembers.length === 0) {
                alert('No other active members to transfer headship to');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 1001;
                display: flex; align-items: center; justify-content: center;
            `;

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            const membersOptions = activeMembers.map(m => `
                <option value="${m.userId}">${m.user?.username || 'Unknown'}</option>
            `).join('');

            modal.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 1.5rem; max-width: 400px; width: 100%;">
                    <h3 style="margin-top: 0;">Transfer Headship</h3>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">New Head</label>
                        <select id="transferNewHead" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            ${membersOptions}
                        </select>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Reason (required)</label>
                        <textarea id="transferReason" placeholder="Enter reason for transfer (10-500 characters)" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;"></textarea>
                    </div>

                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="action-btn" data-action="close-modal">Cancel</button>
                        <button class="action-btn warning" data-action="transfer-headship" data-target="${orgId}">Transfer</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            console.error('Error loading members:', error);
            alert('Error loading organization members');
        }
    }

    /**
     * Transfer headship
     */
    async transferHeadship(orgId) {
        const newHeadSelect = document.getElementById('transferNewHead');
        const reasonInput = document.getElementById('transferReason');

        if (!newHeadSelect || !reasonInput) return;

        const newHeadUserId = newHeadSelect.value;
        const reason = reasonInput.value.trim();

        if (!reason || reason.length < 10) {
            alert('Please enter a reason (at least 10 characters)');
            return;
        }

        if (!confirm('Are you sure you want to transfer headship? This action is significant.')) return;

        try {
            const response = await window.AdminAPI.transferOrganizationHeadship(orgId, newHeadUserId, reason);
            if (response.success) {
                alert('Headship transferred successfully');
                document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
                await this.showOrganizationDetails(orgId);
                await this.loadOrganizations();
            } else {
                alert(response.error || 'Failed to transfer headship');
            }
        } catch (error) {
            console.error('Error transferring headship:', error);
            alert('Error transferring headship');
        }
    }

    /**
     * Show deactivate modal
     */
    async showDeactivateModal(orgId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 1001;
            display: flex; align-items: center; justify-content: center;
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; max-width: 400px; width: 100%;">
                <h3 style="margin-top: 0; color: #dc3545;">Deactivate Organization</h3>

                <p style="color: #666;">This will soft-delete the organization. It can be reactivated later.</p>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Reason (required)</label>
                    <textarea id="deactivateReason" placeholder="Enter reason for deactivation (10-500 characters)" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;"></textarea>
                </div>

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="action-btn" data-action="close-modal">Cancel</button>
                    <button class="action-btn danger" data-action="deactivate-org" data-target="${orgId}">Deactivate</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Deactivate organization
     */
    async deactivateOrganization(orgId) {
        const reasonInput = document.getElementById('deactivateReason');
        if (!reasonInput) return;

        const reason = reasonInput.value.trim();
        if (!reason || reason.length < 10) {
            alert('Please enter a reason (at least 10 characters)');
            return;
        }

        try {
            const response = await window.AdminAPI.deactivateOrganization(orgId, reason);
            if (response.success) {
                alert('Organization deactivated');
                document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
                await this.loadOrganizations();
            } else {
                alert(response.error || 'Failed to deactivate organization');
            }
        } catch (error) {
            console.error('Error deactivating organization:', error);
            alert('Error deactivating organization');
        }
    }

    /**
     * Reactivate organization
     */
    async reactivateOrganization(orgId) {
        if (!confirm('Are you sure you want to reactivate this organization?')) return;

        try {
            const response = await window.AdminAPI.reactivateOrganization(orgId, 'Reactivated by admin');
            if (response.success) {
                alert('Organization reactivated');
                document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
                await this.loadOrganizations();
            } else {
                alert(response.error || 'Failed to reactivate organization');
            }
        } catch (error) {
            console.error('Error reactivating organization:', error);
            alert('Error reactivating organization');
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make available globally for AdminModuleLoader
window.OrganizationsController = OrganizationsController;

// Export for ES6 modules
export { OrganizationsController };
