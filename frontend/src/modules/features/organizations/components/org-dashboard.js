/**
 * Organization Dashboard Component
 * Standalone page component for organization management
 *
 * @module features/organizations/components/org-dashboard
 */

import { ORG_TYPE_LABELS, JURISDICTION_LABELS } from './org-card.js';

// API Base URL detection
const API_BASE = detectApiBase();

function detectApiBase() {
    const hostname = window.location.hostname;
    if (hostname === 'dev.unitedwerise.org' || hostname === 'localhost') {
        return 'https://dev-api.unitedwerise.org/api';
    }
    return 'https://api.unitedwerise.org/api';
}

/**
 * Dashboard state
 */
let dashboardState = {
    loading: true,
    error: null,
    organization: null,
    currentUser: null,
    userRole: null, // 'HEAD', 'ADMIN', 'MEMBER', null
    activeTab: 'overview',
    members: [],
    membersLoading: false,
    pendingRequests: [],
    editMode: false,
    editData: {}
};

/**
 * Initialize dashboard on page load
 */
async function initDashboard() {
    const container = document.getElementById('orgDashboardContainer');
    if (!container) return;

    // Get org identifier from URL
    const params = new URLSearchParams(window.location.search);
    const orgSlug = params.get('org');
    const orgId = params.get('id');

    if (!orgSlug && !orgId) {
        dashboardState.error = 'No organization specified';
        dashboardState.loading = false;
        renderDashboard(container);
        return;
    }

    try {
        // Check authentication first
        dashboardState.currentUser = await checkAuth();

        // Load organization
        const endpoint = orgSlug
            ? `${API_BASE}/organizations/slug/${orgSlug}`
            : `${API_BASE}/organizations/${orgId}`;

        const orgResponse = await fetch(endpoint, { credentials: 'include' });

        if (!orgResponse.ok) {
            if (orgResponse.status === 404) {
                throw new Error('Organization not found');
            }
            throw new Error('Failed to load organization');
        }

        dashboardState.organization = await orgResponse.json();

        // Determine user's role
        if (dashboardState.currentUser) {
            if (dashboardState.organization.headUserId === dashboardState.currentUser.id) {
                dashboardState.userRole = 'HEAD';
            } else {
                // Check membership
                const membership = await checkMembership(dashboardState.organization.id);
                if (membership?.status === 'ACTIVE') {
                    dashboardState.userRole = membership.role ? 'ADMIN' : 'MEMBER';
                }
            }
        }

        // Update page title
        document.title = `${dashboardState.organization.name} - Dashboard | United We Rise`;

        dashboardState.loading = false;
        renderDashboard(container);

        // Load members for members tab (async)
        loadMembers();

    } catch (error) {
        console.error('Dashboard init error:', error);
        dashboardState.error = error.message || 'Failed to load dashboard';
        dashboardState.loading = false;
        renderDashboard(container);
    }
}

/**
 * Check user authentication
 */
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
    } catch (e) {
        console.warn('Auth check failed:', e);
    }
    return null;
}

/**
 * Check user's membership in organization
 */
async function checkMembership(orgId) {
    try {
        const response = await fetch(`${API_BASE}/organizations/me/memberships`, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            return data.memberships?.find(m => m.organizationId === orgId);
        }
    } catch (e) {
        console.warn('Membership check failed:', e);
    }
    return null;
}

/**
 * Load organization members
 */
async function loadMembers() {
    if (!dashboardState.organization) return;

    dashboardState.membersLoading = true;

    try {
        // Load active members
        const membersResponse = await fetch(
            `${API_BASE}/organizations/${dashboardState.organization.id}/members?status=ACTIVE`,
            { credentials: 'include' }
        );

        if (membersResponse.ok) {
            const data = await membersResponse.json();
            dashboardState.members = data.members || [];
        }

        // Load pending requests (only if user can approve)
        if (dashboardState.userRole === 'HEAD' || dashboardState.userRole === 'ADMIN') {
            const pendingResponse = await fetch(
                `${API_BASE}/organizations/${dashboardState.organization.id}/members?status=PENDING`,
                { credentials: 'include' }
            );

            if (pendingResponse.ok) {
                const data = await pendingResponse.json();
                dashboardState.pendingRequests = data.members || [];
            }
        }

    } catch (error) {
        console.error('Failed to load members:', error);
    }

    dashboardState.membersLoading = false;

    // Re-render if on members tab
    if (dashboardState.activeTab === 'members') {
        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);
    }
}

/**
 * Render dashboard
 */
function renderDashboard(container) {
    if (dashboardState.loading) {
        container.innerHTML = `
            <div class="org-dashboard-loading">
                <div class="loading-spinner"></div>
                <p>Loading organization...</p>
            </div>
        `;
        return;
    }

    if (dashboardState.error) {
        container.innerHTML = `
            <div class="org-dashboard-error">
                <h2>Error</h2>
                <p>${escapeHtml(dashboardState.error)}</p>
                <a href="/" class="org-dashboard-btn">Return to Home</a>
            </div>
        `;
        return;
    }

    const org = dashboardState.organization;
    if (!org) return;

    const isHead = dashboardState.userRole === 'HEAD';
    const canEdit = isHead || dashboardState.userRole === 'ADMIN';
    const canApprove = isHead || dashboardState.userRole === 'ADMIN';

    container.innerHTML = `
        <div class="org-dashboard">
            <!-- Header -->
            <div class="org-dashboard-header">
                <div class="org-dashboard-header-info">
                    <div class="org-dashboard-avatar">
                        ${org.logoUrl
                            ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" />`
                            : `<div class="org-avatar-placeholder">${getInitials(org.name)}</div>`
                        }
                    </div>
                    <div class="org-dashboard-header-text">
                        <h1 class="org-dashboard-title">
                            ${escapeHtml(org.name)}
                            ${org.verificationStatus === 'APPROVED' ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
                        </h1>
                        <span class="org-dashboard-type">${ORG_TYPE_LABELS[org.type] || org.type}</span>
                        ${dashboardState.userRole ? `
                            <span class="org-dashboard-role-badge ${dashboardState.userRole.toLowerCase()}">
                                ${dashboardState.userRole === 'HEAD' ? 'Organization Head' : dashboardState.userRole}
                            </span>
                        ` : ''}
                    </div>
                </div>
                ${canEdit ? `
                    <div class="org-dashboard-header-actions">
                        <a href="/" class="org-dashboard-btn org-dashboard-btn-secondary">
                            View Public Profile
                        </a>
                    </div>
                ` : ''}
            </div>

            <!-- Tabs -->
            <div class="org-dashboard-tabs">
                <button
                    class="org-dashboard-tab ${dashboardState.activeTab === 'overview' ? 'active' : ''}"
                    data-tab="overview"
                >
                    Overview
                </button>
                ${canEdit ? `
                    <button
                        class="org-dashboard-tab ${dashboardState.activeTab === 'settings' ? 'active' : ''}"
                        data-tab="settings"
                    >
                        Settings
                    </button>
                ` : ''}
                <button
                    class="org-dashboard-tab ${dashboardState.activeTab === 'members' ? 'active' : ''}"
                    data-tab="members"
                >
                    Members
                    ${dashboardState.pendingRequests.length > 0 ? `
                        <span class="org-dashboard-badge">${dashboardState.pendingRequests.length}</span>
                    ` : ''}
                </button>
            </div>

            <!-- Tab Content -->
            <div class="org-dashboard-content">
                ${renderTabContent()}
            </div>
        </div>
    `;

    attachDashboardListeners(container);
}

/**
 * Render active tab content
 */
function renderTabContent() {
    switch (dashboardState.activeTab) {
        case 'overview':
            return renderOverviewTab();
        case 'settings':
            return renderSettingsTab();
        case 'members':
            return renderMembersTab();
        default:
            return '<p>Unknown tab</p>';
    }
}

/**
 * Render Overview tab
 */
function renderOverviewTab() {
    const org = dashboardState.organization;

    const memberCount = org._count?.members || org.memberCount || 0;
    const followerCount = org._count?.followers || org.followerCount || 0;

    const jurisdictionLabel = org.jurisdictionType
        ? `${JURISDICTION_LABELS[org.jurisdictionType] || org.jurisdictionType}${org.jurisdictionValue ? ` - ${org.jurisdictionValue}` : ''}`
        : 'Not specified';

    return `
        <div class="org-dashboard-overview">
            <!-- Stats -->
            <div class="org-dashboard-stats">
                <div class="org-stat-card">
                    <span class="org-stat-value">${memberCount}</span>
                    <span class="org-stat-label">Members</span>
                </div>
                <div class="org-stat-card">
                    <span class="org-stat-value">${followerCount}</span>
                    <span class="org-stat-label">Followers</span>
                </div>
                <div class="org-stat-card">
                    <span class="org-stat-value">${org.verificationStatus === 'APPROVED' ? 'Yes' : 'No'}</span>
                    <span class="org-stat-label">Verified</span>
                </div>
            </div>

            <!-- Details -->
            <div class="org-dashboard-section">
                <h2>About</h2>
                <p class="org-dashboard-description">
                    ${org.description ? escapeHtml(org.description) : '<em>No description provided</em>'}
                </p>
            </div>

            <div class="org-dashboard-section">
                <h2>Details</h2>
                <dl class="org-dashboard-details">
                    <div class="org-detail-row">
                        <dt>Jurisdiction</dt>
                        <dd>${jurisdictionLabel}</dd>
                    </div>
                    ${org.website ? `
                        <div class="org-detail-row">
                            <dt>Website</dt>
                            <dd><a href="${escapeHtml(org.website)}" target="_blank" rel="noopener">${escapeHtml(org.website)}</a></dd>
                        </div>
                    ` : ''}
                    <div class="org-detail-row">
                        <dt>Created</dt>
                        <dd>${new Date(org.createdAt).toLocaleDateString()}</dd>
                    </div>
                </dl>
            </div>
        </div>
    `;
}

/**
 * Render Settings tab
 */
function renderSettingsTab() {
    const org = dashboardState.organization;
    const isHead = dashboardState.userRole === 'HEAD';

    if (dashboardState.editMode) {
        return renderEditForm();
    }

    return `
        <div class="org-dashboard-settings">
            <div class="org-dashboard-section">
                <div class="org-settings-header">
                    <h2>Organization Settings</h2>
                    <button class="org-dashboard-btn org-dashboard-btn-primary" data-action="startEdit">
                        Edit Settings
                    </button>
                </div>

                <dl class="org-dashboard-details">
                    <div class="org-detail-row">
                        <dt>Name</dt>
                        <dd>${escapeHtml(org.name)}</dd>
                    </div>
                    <div class="org-detail-row">
                        <dt>Slug</dt>
                        <dd>${escapeHtml(org.slug)} <small>(cannot be changed)</small></dd>
                    </div>
                    <div class="org-detail-row">
                        <dt>Description</dt>
                        <dd>${org.description ? escapeHtml(org.description) : '<em>Not set</em>'}</dd>
                    </div>
                    <div class="org-detail-row">
                        <dt>Website</dt>
                        <dd>${org.website ? `<a href="${escapeHtml(org.website)}" target="_blank">${escapeHtml(org.website)}</a>` : '<em>Not set</em>'}</dd>
                    </div>
                </dl>
            </div>

            ${isHead ? `
                <div class="org-dashboard-section org-danger-zone">
                    <h2>Danger Zone</h2>
                    <p>These actions are irreversible. Please be certain.</p>
                    <div class="org-danger-actions">
                        <button class="org-dashboard-btn org-dashboard-btn-danger" data-action="transferHeadship" disabled>
                            Transfer Leadership (Coming Soon)
                        </button>
                        <button class="org-dashboard-btn org-dashboard-btn-danger" data-action="deactivateOrg" disabled>
                            Deactivate Organization (Coming Soon)
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render edit form
 */
function renderEditForm() {
    const data = dashboardState.editData;

    return `
        <div class="org-dashboard-settings">
            <div class="org-dashboard-section">
                <div class="org-settings-header">
                    <h2>Edit Organization</h2>
                </div>

                <form id="editOrgForm" class="org-edit-form">
                    <div class="org-form-field">
                        <label for="editName">Name</label>
                        <input
                            type="text"
                            id="editName"
                            name="name"
                            value="${escapeHtml(data.name || '')}"
                            maxlength="100"
                            required
                        />
                    </div>

                    <div class="org-form-field">
                        <label for="editDescription">Description</label>
                        <textarea
                            id="editDescription"
                            name="description"
                            rows="4"
                            maxlength="1000"
                        >${escapeHtml(data.description || '')}</textarea>
                        <small><span id="editDescCount">${(data.description || '').length}</span>/1000</small>
                    </div>

                    <div class="org-form-field">
                        <label for="editWebsite">Website</label>
                        <input
                            type="url"
                            id="editWebsite"
                            name="website"
                            value="${escapeHtml(data.website || '')}"
                            placeholder="https://example.org"
                        />
                    </div>

                    <div class="org-form-actions">
                        <button type="button" class="org-dashboard-btn org-dashboard-btn-secondary" data-action="cancelEdit">
                            Cancel
                        </button>
                        <button type="submit" class="org-dashboard-btn org-dashboard-btn-primary">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Render Members tab
 */
function renderMembersTab() {
    const canApprove = dashboardState.userRole === 'HEAD' || dashboardState.userRole === 'ADMIN';

    if (dashboardState.membersLoading) {
        return `
            <div class="org-dashboard-members-loading">
                <div class="loading-spinner"></div>
                <p>Loading members...</p>
            </div>
        `;
    }

    return `
        <div class="org-dashboard-members">
            ${canApprove && dashboardState.pendingRequests.length > 0 ? `
                <div class="org-dashboard-section">
                    <h2>Pending Requests (${dashboardState.pendingRequests.length})</h2>
                    <div class="org-members-list">
                        ${dashboardState.pendingRequests.map(member => renderMemberItem(member, true)).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="org-dashboard-section">
                <h2>Active Members (${dashboardState.members.length})</h2>
                ${dashboardState.members.length > 0 ? `
                    <div class="org-members-list">
                        ${dashboardState.members.map(member => renderMemberItem(member, false)).join('')}
                    </div>
                ` : `
                    <p class="org-members-empty">No active members yet.</p>
                `}
            </div>
        </div>
    `;
}

/**
 * Render a member item
 */
function renderMemberItem(member, isPending) {
    const user = member.user;
    const isHead = member.userId === dashboardState.organization?.headUserId;
    const canApprove = dashboardState.userRole === 'HEAD' || dashboardState.userRole === 'ADMIN';

    return `
        <div class="org-member-item" data-membership-id="${member.id}">
            <div class="org-member-avatar">
                ${user.avatarUrl
                    ? `<img src="${user.avatarUrl}" alt="${escapeHtml(user.displayName)}" />`
                    : `<div class="org-avatar-placeholder-small">${getInitials(user.displayName)}</div>`
                }
            </div>
            <div class="org-member-info">
                <span class="org-member-name">${escapeHtml(user.displayName)}</span>
                <span class="org-member-meta">
                    ${isHead ? '<span class="org-member-badge head">Head</span>' : ''}
                    ${member.role ? `<span class="org-member-badge role">${escapeHtml(member.role.name)}</span>` : ''}
                    ${isPending ? '<span class="org-member-badge pending">Pending</span>' : ''}
                </span>
            </div>
            ${isPending && canApprove ? `
                <div class="org-member-actions">
                    <button
                        class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-success"
                        data-action="approveMember"
                        data-membership-id="${member.id}"
                    >
                        Approve
                    </button>
                    <button
                        class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-danger"
                        data-action="denyMember"
                        data-membership-id="${member.id}"
                    >
                        Deny
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Attach event listeners
 */
function attachDashboardListeners(container) {
    // Tab switching
    container.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            dashboardState.activeTab = tab.dataset.tab;
            renderDashboard(container);
        });
    });

    // Action buttons
    container.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const membershipId = target.dataset.membershipId;

        switch (action) {
            case 'startEdit':
                startEdit();
                break;
            case 'cancelEdit':
                cancelEdit();
                break;
            case 'approveMember':
                await approveMember(membershipId);
                break;
            case 'denyMember':
                await denyMember(membershipId);
                break;
        }
    });

    // Edit form submission
    const editForm = container.querySelector('#editOrgForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEdit(new FormData(editForm));
        });

        // Character count for description
        const descTextarea = editForm.querySelector('#editDescription');
        const descCount = editForm.querySelector('#editDescCount');
        if (descTextarea && descCount) {
            descTextarea.addEventListener('input', () => {
                descCount.textContent = descTextarea.value.length;
            });
        }
    }
}

/**
 * Start edit mode
 */
function startEdit() {
    const org = dashboardState.organization;
    dashboardState.editMode = true;
    dashboardState.editData = {
        name: org.name,
        description: org.description || '',
        website: org.website || ''
    };

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Cancel edit mode
 */
function cancelEdit() {
    dashboardState.editMode = false;
    dashboardState.editData = {};

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Save edit
 */
async function saveEdit(formData) {
    const org = dashboardState.organization;

    const updateData = {
        name: formData.get('name'),
        description: formData.get('description') || null,
        website: formData.get('website') || null
    };

    try {
        const response = await fetch(`${API_BASE}/organizations/${org.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save changes');
        }

        const updated = await response.json();
        dashboardState.organization = updated;
        dashboardState.editMode = false;
        dashboardState.editData = {};

        showToast('Settings saved successfully');

        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);

    } catch (error) {
        console.error('Save failed:', error);
        showToast(error.message || 'Failed to save changes');
    }
}

/**
 * Approve member
 */
async function approveMember(membershipId) {
    const org = dashboardState.organization;

    try {
        const response = await fetch(
            `${API_BASE}/organizations/${org.id}/members/${membershipId}/approve`,
            {
                method: 'POST',
                credentials: 'include'
            }
        );

        if (!response.ok) {
            throw new Error('Failed to approve member');
        }

        showToast('Member approved');
        await loadMembers();

    } catch (error) {
        console.error('Approve failed:', error);
        showToast(error.message || 'Failed to approve member');
    }
}

/**
 * Deny member
 */
async function denyMember(membershipId) {
    if (!confirm('Are you sure you want to deny this membership request?')) {
        return;
    }

    const org = dashboardState.organization;

    try {
        const response = await fetch(
            `${API_BASE}/organizations/${org.id}/members/${membershipId}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );

        if (!response.ok) {
            throw new Error('Failed to deny member');
        }

        showToast('Request denied');
        await loadMembers();

    } catch (error) {
        console.error('Deny failed:', error);
        showToast(error.message || 'Failed to deny request');
    }
}

// ==================== Utility Functions ====================

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log('Toast:', message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Initialize ====================

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

export { initDashboard };
export default { initDashboard };
