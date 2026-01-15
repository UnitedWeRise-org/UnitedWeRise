/**
 * Organization Dashboard Component
 * Standalone page component for organization management
 *
 * @module features/organizations/components/org-dashboard
 */

import { ORG_TYPE_LABELS, JURISDICTION_LABELS } from './org-card.js';

/**
 * Capability categories for role creation UI
 */
const CAPABILITY_CATEGORIES = {
    'Membership': ['INVITE_MEMBERS', 'APPROVE_APPLICATIONS', 'REMOVE_MEMBERS'],
    'Roles': ['CREATE_ROLES', 'ASSIGN_ROLES'],
    'Settings': ['MANAGE_ORG_SETTINGS'],
    'Content': ['POST_AS_ORG', 'MODERATE_CONTENT'],
    'Events': ['CREATE_EVENTS', 'MANAGE_EVENTS', 'VIEW_RSVPS'],
    'Discussions': ['CREATE_DISCUSSION', 'PIN_DISCUSSION', 'MODERATE_DISCUSSION', 'VIEW_LEADERSHIP_DISCUSSIONS'],
    'Endorsements': ['MANAGE_QUESTIONNAIRE', 'REVIEW_APPLICATIONS', 'VOTE_ENDORSEMENT', 'PUBLISH_ENDORSEMENT']
};

/**
 * Human-readable capability labels
 */
const CAPABILITY_LABELS = {
    INVITE_MEMBERS: 'Invite Members',
    APPROVE_APPLICATIONS: 'Approve Join Requests',
    REMOVE_MEMBERS: 'Remove Members',
    CREATE_ROLES: 'Create & Edit Roles',
    ASSIGN_ROLES: 'Assign Roles to Members',
    MANAGE_ORG_SETTINGS: 'Manage Organization Settings',
    POST_AS_ORG: 'Post as Organization',
    MODERATE_CONTENT: 'Moderate Content',
    CREATE_EVENTS: 'Create Events',
    MANAGE_EVENTS: 'Manage Events',
    VIEW_RSVPS: 'View Event RSVPs',
    CREATE_DISCUSSION: 'Create Discussions',
    PIN_DISCUSSION: 'Pin Discussions',
    MODERATE_DISCUSSION: 'Moderate Discussions',
    VIEW_LEADERSHIP_DISCUSSIONS: 'View Leadership Discussions',
    MANAGE_QUESTIONNAIRE: 'Manage Endorsement Questionnaires',
    REVIEW_APPLICATIONS: 'Review Endorsement Applications',
    VOTE_ENDORSEMENT: 'Vote on Endorsements',
    PUBLISH_ENDORSEMENT: 'Publish Endorsements'
};

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
    userCapabilities: [], // Current user's capabilities in this org
    activeTab: 'overview',
    members: [],
    membersLoading: false,
    pendingRequests: [],
    editMode: false,
    editData: {},
    // Role management
    roles: [],
    rolesLoading: false,
    editingRole: null, // Role being edited, or {} for new
    showRoleModal: false
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

        // Load members and roles for tabs (async)
        loadMembers();
        loadRoles();

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
 * Load organization roles
 */
async function loadRoles() {
    if (!dashboardState.organization) return;

    dashboardState.rolesLoading = true;

    try {
        const response = await fetch(
            `${API_BASE}/organizations/${dashboardState.organization.id}/roles`,
            { credentials: 'include' }
        );

        if (response.ok) {
            const data = await response.json();
            dashboardState.roles = data.roles || [];
        }
    } catch (error) {
        console.error('Failed to load roles:', error);
    }

    dashboardState.rolesLoading = false;

    // Re-render if on roles tab
    if (dashboardState.activeTab === 'roles') {
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
                ${isHead ? `
                    <button
                        class="org-dashboard-tab ${dashboardState.activeTab === 'roles' ? 'active' : ''}"
                        data-tab="roles"
                    >
                        Roles
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
        case 'roles':
            return renderRolesTab();
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
 * Render Roles tab
 */
function renderRolesTab() {
    if (dashboardState.rolesLoading) {
        return `
            <div class="org-dashboard-roles-loading">
                <div class="loading-spinner"></div>
                <p>Loading roles...</p>
            </div>
        `;
    }

    return `
        <div class="org-dashboard-roles">
            <div class="org-dashboard-section">
                <div class="org-roles-header">
                    <h2>Organization Roles (${dashboardState.roles.length})</h2>
                    <button class="org-dashboard-btn org-dashboard-btn-primary" data-action="createRole">
                        + Create Role
                    </button>
                </div>

                ${dashboardState.roles.length > 0 ? `
                    <div class="org-roles-grid">
                        ${dashboardState.roles.map(role => renderRoleCard(role)).join('')}
                    </div>
                ` : `
                    <div class="org-roles-empty">
                        <p>No custom roles created yet.</p>
                        <p>Create roles to delegate responsibilities to organization members.</p>
                    </div>
                `}
            </div>
        </div>

        ${dashboardState.showRoleModal ? renderRoleModal() : ''}
    `;
}

/**
 * Render a role card
 */
function renderRoleCard(role) {
    const capabilityCount = role.capabilities?.length || 0;
    const holderCount = role._count?.memberships || 0;
    const maxHolders = role.maxHolders || 0;
    const maxText = maxHolders === 0 ? 'Unlimited' : `${holderCount}/${maxHolders}`;

    return `
        <div class="org-role-card" data-role-id="${role.id}">
            <div class="org-role-card-header">
                <h3 class="org-role-name">${escapeHtml(role.name)}</h3>
                <div class="org-role-actions">
                    <button
                        class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-secondary"
                        data-action="editRole"
                        data-role-id="${role.id}"
                        title="Edit role"
                    >
                        Edit
                    </button>
                    <button
                        class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-danger"
                        data-action="deleteRole"
                        data-role-id="${role.id}"
                        title="Delete role"
                    >
                        Delete
                    </button>
                </div>
            </div>
            ${role.description ? `
                <p class="org-role-description">${escapeHtml(role.description)}</p>
            ` : ''}
            <div class="org-role-meta">
                <span class="org-role-stat">
                    <strong>${capabilityCount}</strong> capabilities
                </span>
                <span class="org-role-stat">
                    <strong>${maxText}</strong> holders
                </span>
            </div>
            ${capabilityCount > 0 ? `
                <div class="org-role-capabilities">
                    ${role.capabilities.slice(0, 4).map(cap =>
                        `<span class="org-capability-tag">${CAPABILITY_LABELS[cap] || cap}</span>`
                    ).join('')}
                    ${capabilityCount > 4 ? `<span class="org-capability-more">+${capabilityCount - 4} more</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render role create/edit modal
 */
function renderRoleModal() {
    const isEditing = dashboardState.editingRole && dashboardState.editingRole.id;
    const role = dashboardState.editingRole || {};
    const selectedCapabilities = role.capabilities || [];

    return `
        <div class="org-role-modal-overlay" data-action="closeRoleModal">
            <div class="org-role-modal" onclick="event.stopPropagation()">
                <div class="org-role-modal-header">
                    <h2>${isEditing ? 'Edit Role' : 'Create Role'}</h2>
                    <button class="org-role-modal-close" data-action="closeRoleModal">&times;</button>
                </div>

                <form id="roleForm" class="org-role-form">
                    <div class="org-form-field">
                        <label for="roleName">Role Name *</label>
                        <input
                            type="text"
                            id="roleName"
                            name="name"
                            value="${escapeHtml(role.name || '')}"
                            maxlength="50"
                            required
                            placeholder="e.g., Event Coordinator"
                        />
                    </div>

                    <div class="org-form-field">
                        <label for="roleDescription">Description</label>
                        <textarea
                            id="roleDescription"
                            name="description"
                            rows="2"
                            maxlength="200"
                            placeholder="Brief description of this role's purpose"
                        >${escapeHtml(role.description || '')}</textarea>
                    </div>

                    <div class="org-form-field">
                        <label for="roleMaxHolders">Maximum Holders</label>
                        <input
                            type="number"
                            id="roleMaxHolders"
                            name="maxHolders"
                            value="${role.maxHolders || 1}"
                            min="0"
                            max="100"
                        />
                        <small>Set to 0 for unlimited</small>
                    </div>

                    <div class="org-form-field">
                        <label>Capabilities</label>
                        <div class="org-capabilities-grid">
                            ${Object.entries(CAPABILITY_CATEGORIES).map(([category, caps]) => `
                                <div class="org-capability-category">
                                    <h4>${category}</h4>
                                    ${caps.map(cap => `
                                        <label class="org-capability-checkbox">
                                            <input
                                                type="checkbox"
                                                name="capabilities"
                                                value="${cap}"
                                                ${selectedCapabilities.includes(cap) ? 'checked' : ''}
                                            />
                                            ${CAPABILITY_LABELS[cap] || cap}
                                        </label>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="org-form-actions">
                        <button type="button" class="org-dashboard-btn org-dashboard-btn-secondary" data-action="closeRoleModal">
                            Cancel
                        </button>
                        <button type="submit" class="org-dashboard-btn org-dashboard-btn-primary">
                            ${isEditing ? 'Save Changes' : 'Create Role'}
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
    const canManageRoles = dashboardState.userRole === 'HEAD';
    const canRemove = dashboardState.userRole === 'HEAD' && !isHead;

    // Build role dropdown for active members (not pending, not org head)
    const roleDropdown = canManageRoles && !isPending && !isHead ? `
        <select
            class="org-member-role-select"
            data-action="changeRole"
            data-membership-id="${member.id}"
        >
            <option value="">No Role</option>
            ${dashboardState.roles.map(role => `
                <option value="${role.id}" ${member.roleId === role.id ? 'selected' : ''}>
                    ${escapeHtml(role.name)}
                </option>
            `).join('')}
        </select>
    ` : '';

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
                    ${!canManageRoles && member.role ? `<span class="org-member-badge role">${escapeHtml(member.role.name)}</span>` : ''}
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
            ${!isPending && (roleDropdown || canRemove) ? `
                <div class="org-member-actions">
                    ${roleDropdown}
                    ${canRemove ? `
                        <button
                            class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-danger"
                            data-action="removeMember"
                            data-membership-id="${member.id}"
                            title="Remove member"
                        >
                            Remove
                        </button>
                    ` : ''}
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
        const roleId = target.dataset.roleId;

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
            // Role management actions
            case 'createRole':
                openRoleModal({});
                break;
            case 'editRole':
                const role = dashboardState.roles.find(r => r.id === roleId);
                if (role) openRoleModal(role);
                break;
            case 'deleteRole':
                await deleteRole(roleId);
                break;
            case 'closeRoleModal':
                closeRoleModal();
                break;
            case 'removeMember':
                await removeMember(membershipId);
                break;
        }
    });

    // Role dropdown change handler
    container.addEventListener('change', async (e) => {
        if (e.target.dataset.action === 'changeRole') {
            const membershipId = e.target.dataset.membershipId;
            const roleId = e.target.value;
            await changeMemberRole(membershipId, roleId);
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

    // Role form submission
    const roleForm = container.querySelector('#roleForm');
    if (roleForm) {
        roleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveRole(new FormData(roleForm));
        });
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

// ==================== Role Management Functions ====================

/**
 * Open role modal for create/edit
 */
function openRoleModal(role) {
    dashboardState.editingRole = role;
    dashboardState.showRoleModal = true;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Close role modal
 */
function closeRoleModal() {
    dashboardState.editingRole = null;
    dashboardState.showRoleModal = false;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Save role (create or update)
 */
async function saveRole(formData) {
    const org = dashboardState.organization;
    const isEditing = dashboardState.editingRole && dashboardState.editingRole.id;

    // Collect selected capabilities
    const capabilities = [];
    formData.getAll('capabilities').forEach(cap => capabilities.push(cap));

    const roleData = {
        name: formData.get('name'),
        description: formData.get('description') || null,
        maxHolders: parseInt(formData.get('maxHolders'), 10) || 0,
        capabilities
    };

    try {
        const url = isEditing
            ? `${API_BASE}/organizations/${org.id}/roles/${dashboardState.editingRole.id}`
            : `${API_BASE}/organizations/${org.id}/roles`;

        const response = await fetch(url, {
            method: isEditing ? 'PATCH' : 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roleData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save role');
        }

        showToast(isEditing ? 'Role updated' : 'Role created');
        closeRoleModal();
        await loadRoles();

    } catch (error) {
        console.error('Save role failed:', error);
        showToast(error.message || 'Failed to save role');
    }
}

/**
 * Delete role
 */
async function deleteRole(roleId) {
    const role = dashboardState.roles.find(r => r.id === roleId);
    if (!role) return;

    if (!confirm(`Are you sure you want to delete the "${role.name}" role? Members with this role will lose it.`)) {
        return;
    }

    const org = dashboardState.organization;

    try {
        const response = await fetch(
            `${API_BASE}/organizations/${org.id}/roles/${roleId}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete role');
        }

        showToast('Role deleted');
        await loadRoles();
        await loadMembers(); // Refresh members since they may have lost roles

    } catch (error) {
        console.error('Delete role failed:', error);
        showToast(error.message || 'Failed to delete role');
    }
}

/**
 * Change member's role
 */
async function changeMemberRole(membershipId, roleId) {
    const org = dashboardState.organization;

    try {
        if (roleId) {
            // Assign role
            const response = await fetch(
                `${API_BASE}/organizations/${org.id}/members/${membershipId}/role`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ roleId })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to assign role');
            }

            showToast('Role assigned');
        } else {
            // Remove role
            const response = await fetch(
                `${API_BASE}/organizations/${org.id}/members/${membershipId}/role`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to remove role');
            }

            showToast('Role removed');
        }

        await loadMembers();

    } catch (error) {
        console.error('Change role failed:', error);
        showToast(error.message || 'Failed to change role');
        // Reload to reset dropdown to actual state
        await loadMembers();
    }
}

/**
 * Remove member from organization
 */
async function removeMember(membershipId) {
    const member = dashboardState.members.find(m => m.id === membershipId);
    if (!member) return;

    if (!confirm(`Are you sure you want to remove ${member.user.displayName} from the organization?`)) {
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
            const error = await response.json();
            throw new Error(error.message || 'Failed to remove member');
        }

        showToast('Member removed');
        await loadMembers();

    } catch (error) {
        console.error('Remove member failed:', error);
        showToast(error.message || 'Failed to remove member');
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
