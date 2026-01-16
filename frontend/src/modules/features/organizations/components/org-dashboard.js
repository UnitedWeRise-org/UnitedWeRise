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

/**
 * Question type labels for endorsement questionnaires
 */
const QUESTION_TYPE_LABELS = {
    SHORT_TEXT: 'Short Text',
    LONG_TEXT: 'Long Text',
    MULTIPLE_CHOICE: 'Multiple Choice',
    CHECKBOX: 'Checkboxes',
    YES_NO: 'Yes/No',
    SCALE: 'Scale (1-10)'
};

/**
 * Application status labels
 */
const APPLICATION_STATUS_LABELS = {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    DENIED: 'Denied',
    WITHDRAWN: 'Withdrawn'
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
    showRoleModal: false,
    // Endorsement management
    endorsementsSubTab: 'questionnaires', // 'questionnaires' | 'applications' | 'published'
    // Questionnaires
    questionnaires: [],
    questionnairesLoading: false,
    showQuestionnaireModal: false,
    editingQuestionnaire: null,
    questionnaireFormData: { title: '', description: '', isActive: true, questions: [] },
    editingQuestionIndex: null,
    // Applications
    applications: [],
    applicationsLoading: false,
    applicationsFilter: { questionnaireId: null, status: null },
    selectedApplication: null,
    showApplicationDetailModal: false,
    currentUserVote: null,
    voteStatus: null,
    // Published endorsements
    endorsements: [],
    endorsementsLoading: false,
    showRevokeConfirmModal: false,
    endorsementToRevoke: null,
    // Jurisdiction editing (for CUSTOM type)
    showJurisdictionModal: false,
    jurisdictionCells: [],
    jurisdictionMap: null,
    jurisdictionHistory: [],
    // Activity feed
    activityFilter: 'all', // 'all' | 'posts' | 'events' | 'endorsements'
    activityItems: [],
    activityLoading: false,
    activityPage: 1,
    activityHasMore: true,
    showPostComposer: false,
    showEventCreator: false,
    newPostContent: '',
    newEventData: { title: '', description: '', date: '', time: '', location: '' }
};

// H3 Picker constants for dashboard
const H3_RESOLUTION = 7;
const MAX_H3_CELLS = 100;

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

        const orgData = await orgResponse.json();
        // Backend wraps response in { success: true, organization: {...} }
        dashboardState.organization = orgData.organization || orgData;

        // Determine user's role
        if (dashboardState.currentUser) {
            console.log('[OrgDashboard] headUserId:', dashboardState.organization.headUserId);
            console.log('[OrgDashboard] currentUser.id:', dashboardState.currentUser.id);
            console.log('[OrgDashboard] Match:', dashboardState.organization.headUserId === dashboardState.currentUser.id);
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
                ${dashboardState.userRole ? `
                    <button
                        class="org-dashboard-tab ${dashboardState.activeTab === 'activity' ? 'active' : ''}"
                        data-tab="activity"
                    >
                        Activity
                    </button>
                ` : ''}
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
                ${isHead || hasEndorsementCapability() ? `
                    <button
                        class="org-dashboard-tab ${dashboardState.activeTab === 'endorsements' ? 'active' : ''}"
                        data-tab="endorsements"
                    >
                        Endorsements
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
        case 'activity':
            return renderActivityTab();
        case 'settings':
            return renderSettingsTab();
        case 'roles':
            return renderRolesTab();
        case 'endorsements':
            return renderEndorsementsTab();
        case 'members':
            return renderMembersTab();
        default:
            return '<p>Unknown tab</p>';
    }
}

/**
 * Check if user has any endorsement-related capability
 */
function hasEndorsementCapability() {
    const endorsementCaps = ['MANAGE_QUESTIONNAIRE', 'REVIEW_APPLICATIONS', 'VOTE_ENDORSEMENT', 'PUBLISH_ENDORSEMENT'];
    return dashboardState.userCapabilities.some(cap => endorsementCaps.includes(cap));
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
 * Render Activity tab
 */
function renderActivityTab() {
    const org = dashboardState.organization;
    const isHead = dashboardState.userRole === 'HEAD';
    const canPost = isHead || dashboardState.userCapabilities.includes('POST_AS_ORG');
    const canCreateEvents = isHead || dashboardState.userCapabilities.includes('CREATE_EVENTS');

    // Load activity if not loaded yet
    if (dashboardState.activityItems.length === 0 && !dashboardState.activityLoading) {
        loadActivity();
    }

    return `
        <div class="org-activity-container">
            <!-- Action Buttons -->
            <div class="org-activity-actions">
                ${canPost ? `
                    <button class="org-dashboard-btn org-dashboard-btn-primary" data-action="toggle-post-composer">
                        + New Post
                    </button>
                ` : ''}
                ${canCreateEvents ? `
                    <button class="org-dashboard-btn org-dashboard-btn-secondary" data-action="toggle-event-creator">
                        + New Event
                    </button>
                ` : ''}
            </div>

            <!-- Post Composer (inline) -->
            ${dashboardState.showPostComposer ? renderPostComposer() : ''}

            <!-- Event Creator Modal -->
            ${dashboardState.showEventCreator ? renderEventCreatorModal() : ''}

            <!-- Filter Buttons -->
            <div class="org-activity-filters">
                <button
                    class="org-activity-filter ${dashboardState.activityFilter === 'all' ? 'active' : ''}"
                    data-activity-filter="all"
                >
                    All
                </button>
                <button
                    class="org-activity-filter ${dashboardState.activityFilter === 'posts' ? 'active' : ''}"
                    data-activity-filter="posts"
                >
                    Posts
                </button>
                <button
                    class="org-activity-filter ${dashboardState.activityFilter === 'events' ? 'active' : ''}"
                    data-activity-filter="events"
                >
                    Events
                </button>
                <button
                    class="org-activity-filter ${dashboardState.activityFilter === 'endorsements' ? 'active' : ''}"
                    data-activity-filter="endorsements"
                >
                    Endorsements
                </button>
            </div>

            <!-- Activity Feed -->
            <div class="org-activity-feed">
                ${dashboardState.activityLoading && dashboardState.activityItems.length === 0
                    ? '<div class="org-activity-loading">Loading activity...</div>'
                    : dashboardState.activityItems.length === 0
                        ? '<div class="org-activity-empty">No activity yet</div>'
                        : dashboardState.activityItems.map(item => renderActivityItem(item)).join('')
                }
            </div>

            <!-- Load More -->
            ${dashboardState.activityHasMore && dashboardState.activityItems.length > 0 ? `
                <div class="org-activity-load-more">
                    <button
                        class="org-dashboard-btn org-dashboard-btn-secondary"
                        data-action="load-more-activity"
                        ${dashboardState.activityLoading ? 'disabled' : ''}
                    >
                        ${dashboardState.activityLoading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Load activity feed from API
 */
async function loadActivity(append = false) {
    if (!dashboardState.organization) return;
    if (dashboardState.activityLoading) return;

    dashboardState.activityLoading = true;
    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);

    try {
        const params = new URLSearchParams({
            type: dashboardState.activityFilter,
            page: dashboardState.activityPage.toString(),
            limit: '20'
        });

        const response = await fetch(
            `${API_BASE}/organizations/${dashboardState.organization.id}/activity?${params}`,
            { credentials: 'include' }
        );

        if (!response.ok) {
            throw new Error('Failed to load activity');
        }

        const data = await response.json();

        if (append) {
            dashboardState.activityItems = [...dashboardState.activityItems, ...data.items];
        } else {
            dashboardState.activityItems = data.items;
        }
        dashboardState.activityHasMore = data.hasMore;

    } catch (error) {
        console.error('Load activity error:', error);
    } finally {
        dashboardState.activityLoading = false;
        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);
    }
}

/**
 * Render a single activity item
 */
function renderActivityItem(item) {
    switch (item.type) {
        case 'post':
            return renderPostActivityItem(item.data, item.timestamp);
        case 'event':
            return renderEventActivityItem(item.data, item.timestamp);
        case 'endorsement':
            return renderEndorsementActivityItem(item.data, item.timestamp);
        case 'member_milestone':
            return renderMilestoneActivityItem(item.data, item.timestamp);
        default:
            return '';
    }
}

/**
 * Render post activity item
 */
function renderPostActivityItem(post, timestamp) {
    const org = dashboardState.organization;
    const timeAgo = formatTimeAgo(timestamp);
    const avatarUrl = org.avatar || '/assets/images/org-placeholder.png';

    return `
        <div class="org-activity-item org-activity-post">
            <div class="org-activity-header">
                <img src="${avatarUrl}" alt="${org.name}" class="org-activity-avatar" />
                <div class="org-activity-meta">
                    <span class="org-activity-author">${org.name}</span>
                    <span class="org-activity-label">posted</span>
                    <span class="org-activity-time">${timeAgo}</span>
                </div>
            </div>
            <div class="org-activity-content">
                ${post.content || ''}
            </div>
            ${post.photos && post.photos.length > 0 ? `
                <div class="org-activity-photos">
                    ${post.photos.slice(0, 4).map(photo => `
                        <img src="${photo.thumbnailUrl || photo.url}" alt="" class="org-activity-photo" />
                    `).join('')}
                </div>
            ` : ''}
            <div class="org-activity-stats">
                <span>${post._count?.likes || 0} likes</span>
                <span>${post._count?.comments || 0} comments</span>
            </div>
        </div>
    `;
}

/**
 * Render event activity item
 */
function renderEventActivityItem(event, timestamp) {
    const timeAgo = formatTimeAgo(timestamp);
    const eventDate = new Date(event.startDate || event.date);
    const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    return `
        <div class="org-activity-item org-activity-event">
            <div class="org-activity-header">
                <span class="org-activity-icon">📅</span>
                <div class="org-activity-meta">
                    <span class="org-activity-label">New Event</span>
                    <span class="org-activity-time">${timeAgo}</span>
                </div>
            </div>
            <div class="org-activity-event-title">${event.title}</div>
            <div class="org-activity-event-date">${dateStr}</div>
            ${event.location ? `<div class="org-activity-event-location">📍 ${event.location}</div>` : ''}
            <div class="org-activity-stats">
                <span>${event._count?.rsvps || 0} RSVPs</span>
            </div>
        </div>
    `;
}

/**
 * Render endorsement activity item
 */
function renderEndorsementActivityItem(endorsement, timestamp) {
    const timeAgo = formatTimeAgo(timestamp);
    const candidate = endorsement.candidate;

    return `
        <div class="org-activity-item org-activity-endorsement">
            <div class="org-activity-header">
                <span class="org-activity-icon">✓</span>
                <div class="org-activity-meta">
                    <span class="org-activity-label">Endorsed</span>
                    <span class="org-activity-time">${timeAgo}</span>
                </div>
            </div>
            <div class="org-activity-endorsement-content">
                <strong>${candidate?.name || 'Candidate'}</strong>
                ${candidate?.office ? ` for ${candidate.office}` : ''}
            </div>
            ${endorsement.statement ? `
                <div class="org-activity-endorsement-statement">"${endorsement.statement}"</div>
            ` : ''}
        </div>
    `;
}

/**
 * Render member milestone activity item
 */
function renderMilestoneActivityItem(milestone, timestamp) {
    const timeAgo = formatTimeAgo(timestamp);
    const count = milestone.count || 0;
    const users = milestone.users || [];

    let description = '';
    if (count === 1 && users.length > 0) {
        description = `${users[0].displayName} joined`;
    } else if (count > 1) {
        if (users.length > 0) {
            const names = users.map(u => u.displayName).join(', ');
            description = count > users.length
                ? `${names} and ${count - users.length} more joined`
                : `${names} joined`;
        } else {
            description = `${count} new members joined`;
        }
    }

    return `
        <div class="org-activity-item org-activity-milestone">
            <div class="org-activity-header">
                <span class="org-activity-icon">👤</span>
                <div class="org-activity-meta">
                    <span class="org-activity-label">${description}</span>
                    <span class="org-activity-time">${timeAgo}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render inline post composer
 */
function renderPostComposer() {
    return `
        <div class="org-post-composer">
            <textarea
                class="org-post-textarea"
                placeholder="What's happening with your organization?"
                id="orgPostContent"
            >${dashboardState.newPostContent}</textarea>
            <div class="org-post-composer-actions">
                <button class="org-dashboard-btn org-dashboard-btn-secondary" data-action="cancel-post">
                    Cancel
                </button>
                <button
                    class="org-dashboard-btn org-dashboard-btn-primary"
                    data-action="submit-post"
                    ${!dashboardState.newPostContent.trim() ? 'disabled' : ''}
                >
                    Post as ${dashboardState.organization?.name || 'Organization'}
                </button>
            </div>
        </div>
    `;
}

/**
 * Render event creator modal
 */
function renderEventCreatorModal() {
    const data = dashboardState.newEventData;
    return `
        <div class="org-modal-overlay" data-action="close-event-creator">
            <div class="org-modal" onclick="event.stopPropagation()">
                <div class="org-modal-header">
                    <h3>Create Event</h3>
                    <button class="org-modal-close" data-action="close-event-creator">&times;</button>
                </div>
                <div class="org-modal-body">
                    <div class="org-form-group">
                        <label for="eventTitle">Event Title *</label>
                        <input
                            type="text"
                            id="eventTitle"
                            class="org-form-input"
                            value="${data.title}"
                            placeholder="Enter event title"
                        />
                    </div>
                    <div class="org-form-group">
                        <label for="eventDescription">Description</label>
                        <textarea
                            id="eventDescription"
                            class="org-form-textarea"
                            placeholder="Describe your event"
                        >${data.description}</textarea>
                    </div>
                    <div class="org-form-row">
                        <div class="org-form-group">
                            <label for="eventDate">Date *</label>
                            <input
                                type="date"
                                id="eventDate"
                                class="org-form-input"
                                value="${data.date}"
                            />
                        </div>
                        <div class="org-form-group">
                            <label for="eventTime">Time *</label>
                            <input
                                type="time"
                                id="eventTime"
                                class="org-form-input"
                                value="${data.time}"
                            />
                        </div>
                    </div>
                    <div class="org-form-group">
                        <label for="eventLocation">Location</label>
                        <input
                            type="text"
                            id="eventLocation"
                            class="org-form-input"
                            value="${data.location}"
                            placeholder="Enter location or 'Virtual'"
                        />
                    </div>
                </div>
                <div class="org-modal-footer">
                    <button class="org-dashboard-btn org-dashboard-btn-secondary" data-action="close-event-creator">
                        Cancel
                    </button>
                    <button class="org-dashboard-btn org-dashboard-btn-primary" data-action="submit-event">
                        Create Event
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Format timestamp as relative time ago
 */
function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    return date.toLocaleDateString();
}

/**
 * Submit organization post
 */
async function submitOrgPost() {
    const content = document.getElementById('orgPostContent')?.value?.trim();
    if (!content) return;

    try {
        const response = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                organizationId: dashboardState.organization.id,
                audience: 'PUBLIC'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create post');
        }

        // Reset and reload
        dashboardState.showPostComposer = false;
        dashboardState.newPostContent = '';
        dashboardState.activityPage = 1;
        dashboardState.activityItems = [];
        loadActivity();

    } catch (error) {
        console.error('Post creation error:', error);
        alert(error.message || 'Failed to create post');
    }
}

/**
 * Submit organization event
 */
async function submitOrgEvent() {
    const title = document.getElementById('eventTitle')?.value?.trim();
    const description = document.getElementById('eventDescription')?.value?.trim();
    const date = document.getElementById('eventDate')?.value;
    const time = document.getElementById('eventTime')?.value;
    const location = document.getElementById('eventLocation')?.value?.trim();

    if (!title || !date || !time) {
        alert('Please fill in required fields (title, date, time)');
        return;
    }

    try {
        const startDate = new Date(`${date}T${time}`);

        const response = await fetch(`${API_BASE}/civic/events`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
                startDate: startDate.toISOString(),
                location: location || null,
                organizationId: dashboardState.organization.id,
                category: 'ORGANIZING_ACTIVITIES'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create event');
        }

        // Reset and reload
        dashboardState.showEventCreator = false;
        dashboardState.newEventData = { title: '', description: '', date: '', time: '', location: '' };
        dashboardState.activityPage = 1;
        dashboardState.activityItems = [];
        loadActivity();

    } catch (error) {
        console.error('Event creation error:', error);
        alert(error.message || 'Failed to create event');
    }
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

    // Format jurisdiction display
    let jurisdictionDisplay = org.jurisdictionType || 'National';
    if (org.jurisdictionType === 'STATE' && org.jurisdictionValue) {
        jurisdictionDisplay = `State - ${org.jurisdictionValue}`;
    } else if (org.jurisdictionType === 'COUNTY' && org.jurisdictionValue) {
        jurisdictionDisplay = `County - ${org.jurisdictionValue}`;
    } else if (org.jurisdictionType === 'CITY' && org.jurisdictionValue) {
        jurisdictionDisplay = `City - ${org.jurisdictionValue}`;
    } else if (org.jurisdictionType === 'CUSTOM') {
        const cellCount = org.h3Cells?.length || 0;
        const approxArea = Math.round(cellCount * 50);
        jurisdictionDisplay = cellCount > 0
            ? `Custom Area (${cellCount} region${cellCount !== 1 ? 's' : ''}, ~${approxArea} km²)`
            : 'Custom Area (not configured)';
    }

    const canEditJurisdiction = isHead && org.jurisdictionType === 'CUSTOM';

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
                        <dt>Type</dt>
                        <dd>${org.type || 'Organization'}</dd>
                    </div>
                    <div class="org-detail-row">
                        <dt>Jurisdiction</dt>
                        <dd>
                            ${jurisdictionDisplay}
                            ${canEditJurisdiction ? `
                                <button class="org-dashboard-btn-inline" data-action="editJurisdiction">
                                    Edit Coverage
                                </button>
                            ` : ''}
                        </dd>
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

        ${dashboardState.showJurisdictionModal ? renderJurisdictionModal() : ''}
    `;
}

/**
 * Render jurisdiction editing modal for CUSTOM type orgs
 */
function renderJurisdictionModal() {
    const cellCount = dashboardState.jurisdictionCells.length;
    const approxArea = Math.round(cellCount * 50);

    return `
        <div class="org-jurisdiction-modal-overlay" data-action="closeJurisdictionModal">
            <div class="org-jurisdiction-modal" onclick="event.stopPropagation()">
                <div class="org-jurisdiction-modal-header">
                    <h2>Edit Coverage Area</h2>
                    <button class="org-jurisdiction-modal-close" data-action="closeJurisdictionModal">✕</button>
                </div>
                <div class="org-jurisdiction-modal-body">
                    <p class="org-jurisdiction-instructions">
                        Click on the map to select hexagonal coverage areas.
                        Click again to deselect. Maximum ${MAX_H3_CELLS} cells (~${MAX_H3_CELLS * 50} km²).
                    </p>
                    <div class="org-jurisdiction-map-container">
                        <div id="jurisdictionMapContainer" class="org-jurisdiction-map"></div>
                    </div>
                    <div class="org-jurisdiction-controls">
                        <div class="org-jurisdiction-info">
                            <span class="org-jurisdiction-count">
                                Selected: <strong>${cellCount}</strong> cell${cellCount !== 1 ? 's' : ''}
                                ${cellCount > 0 ? `(~${approxArea} km²)` : ''}
                            </span>
                        </div>
                        <div class="org-jurisdiction-buttons">
                            <button type="button" class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-secondary" data-action="h3Undo" ${dashboardState.jurisdictionHistory.length === 0 ? 'disabled' : ''}>
                                Undo
                            </button>
                            <button type="button" class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-secondary" data-action="h3Clear" ${cellCount === 0 ? 'disabled' : ''}>
                                Clear All
                            </button>
                            <button type="button" class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-secondary" data-action="h3FitToSelection" ${cellCount === 0 ? 'disabled' : ''}>
                                Zoom to Selection
                            </button>
                        </div>
                    </div>
                </div>
                <div class="org-jurisdiction-modal-footer">
                    <button type="button" class="org-dashboard-btn org-dashboard-btn-secondary" data-action="closeJurisdictionModal">
                        Cancel
                    </button>
                    <button type="button" class="org-dashboard-btn org-dashboard-btn-primary" data-action="saveJurisdiction" ${cellCount === 0 ? 'disabled' : ''}>
                        Save Changes
                    </button>
                </div>
            </div>
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
            // Load endorsement data when switching to endorsements tab
            if (tab.dataset.tab === 'endorsements') {
                loadQuestionnaires();
                loadEndorsements();
            }
            // Reset and load activity when switching to activity tab
            if (tab.dataset.tab === 'activity') {
                dashboardState.activityPage = 1;
                dashboardState.activityItems = [];
                loadActivity();
            }
            renderDashboard(container);
        });
    });

    // Activity filter buttons
    container.querySelectorAll('[data-activity-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            dashboardState.activityFilter = btn.dataset.activityFilter;
            dashboardState.activityPage = 1;
            dashboardState.activityItems = [];
            loadActivity();
            renderDashboard(container);
        });
    });

    // Sub-tab switching for endorsements
    container.querySelectorAll('[data-subtab]').forEach(subtab => {
        subtab.addEventListener('click', () => {
            dashboardState.endorsementsSubTab = subtab.dataset.subtab;
            if (subtab.dataset.subtab === 'applications') {
                loadApplications();
            }
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
        const questionnaireId = target.dataset.questionnaireId;
        const applicationId = target.dataset.applicationId;
        const endorsementId = target.dataset.endorsementId;
        const questionIndex = target.dataset.questionIndex !== undefined ? parseInt(target.dataset.questionIndex, 10) : null;
        const optionIndex = target.dataset.optionIndex !== undefined ? parseInt(target.dataset.optionIndex, 10) : null;

        switch (action) {
            case 'startEdit':
                startEdit();
                break;
            case 'cancelEdit':
                cancelEdit();
                break;
            case 'editJurisdiction':
                openJurisdictionModal();
                break;
            case 'closeJurisdictionModal':
                closeJurisdictionModal();
                break;
            case 'saveJurisdiction':
                await saveJurisdiction();
                break;
            case 'h3Undo':
                h3Undo();
                break;
            case 'h3Clear':
                h3Clear();
                break;
            case 'h3FitToSelection':
                h3FitToSelection();
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
            // Questionnaire actions
            case 'createQuestionnaire':
                openQuestionnaireModal(null);
                break;
            case 'editQuestionnaire':
                await openQuestionnaireModalForEdit(questionnaireId);
                break;
            case 'toggleQuestionnaire':
                await toggleQuestionnaire(questionnaireId);
                break;
            case 'deleteQuestionnaire':
                await deleteQuestionnaire(questionnaireId);
                break;
            case 'closeQuestionnaireModal':
                closeQuestionnaireModal();
                break;
            case 'saveQuestionnaire':
                await saveQuestionnaire();
                break;
            // Question actions
            case 'addQuestion':
                addQuestion();
                break;
            case 'editQuestion':
                dashboardState.editingQuestionIndex = questionIndex;
                renderDashboard(container);
                break;
            case 'saveQuestion':
                dashboardState.editingQuestionIndex = null;
                renderDashboard(container);
                break;
            case 'deleteQuestion':
                deleteQuestion(questionIndex);
                break;
            case 'moveQuestionUp':
                moveQuestion(questionIndex, -1);
                break;
            case 'moveQuestionDown':
                moveQuestion(questionIndex, 1);
                break;
            case 'addOption':
                addOption(questionIndex);
                break;
            case 'removeOption':
                removeOption(questionIndex, optionIndex);
                break;
            // Application actions
            case 'viewApplication':
                await viewApplication(applicationId);
                break;
            case 'closeApplicationModal':
                closeApplicationModal();
                break;
            case 'moveToReview':
                await updateApplicationStatus(applicationId, 'UNDER_REVIEW');
                break;
            case 'castVote':
                await castVote(target.dataset.vote);
                break;
            case 'publishEndorsement':
                await publishEndorsement(applicationId);
                break;
            case 'denyApplication':
                await denyApplicationAction(applicationId);
                break;
            // Endorsement actions
            case 'revokeEndorsement':
                openRevokeModal(endorsementId);
                break;
            case 'closeRevokeModal':
                closeRevokeModal();
                break;
            case 'confirmRevoke':
                await confirmRevoke();
                break;
            // Activity actions
            case 'toggle-post-composer':
                dashboardState.showPostComposer = !dashboardState.showPostComposer;
                renderDashboard(container);
                break;
            case 'cancel-post':
                dashboardState.showPostComposer = false;
                dashboardState.newPostContent = '';
                renderDashboard(container);
                break;
            case 'submit-post':
                await submitOrgPost();
                break;
            case 'toggle-event-creator':
                dashboardState.showEventCreator = !dashboardState.showEventCreator;
                renderDashboard(container);
                break;
            case 'close-event-creator':
                dashboardState.showEventCreator = false;
                dashboardState.newEventData = { title: '', description: '', date: '', time: '', location: '' };
                renderDashboard(container);
                break;
            case 'submit-event':
                await submitOrgEvent();
                break;
            case 'load-more-activity':
                dashboardState.activityPage++;
                await loadActivity(true);
                break;
        }
    });

    // Input handlers for post composer
    container.addEventListener('input', (e) => {
        if (e.target.id === 'orgPostContent') {
            dashboardState.newPostContent = e.target.value;
            // Update submit button state
            const submitBtn = container.querySelector('[data-action="submit-post"]');
            if (submitBtn) {
                submitBtn.disabled = !e.target.value.trim();
            }
        }
    });

    // Change handlers
    container.addEventListener('change', async (e) => {
        // Role dropdown
        if (e.target.dataset.action === 'changeRole') {
            const membershipId = e.target.dataset.membershipId;
            const roleId = e.target.value;
            await changeMemberRole(membershipId, roleId);
        }
        // Application filters
        if (e.target.dataset.filter) {
            const filter = e.target.dataset.filter;
            dashboardState.applicationsFilter[filter] = e.target.value || null;
            await loadApplications();
        }
        // Questionnaire form fields
        if (e.target.dataset.field) {
            const field = e.target.dataset.field;
            if (field === 'isActive') {
                dashboardState.questionnaireFormData.isActive = e.target.checked;
            } else {
                dashboardState.questionnaireFormData[field] = e.target.value;
            }
        }
        // Question fields
        if (e.target.dataset.questionField !== undefined) {
            const field = e.target.dataset.questionField;
            const index = parseInt(e.target.dataset.questionIndex, 10);
            const questions = dashboardState.questionnaireFormData.questions;
            if (questions[index]) {
                if (field === 'isRequired' || field === 'isPublic') {
                    questions[index][field] = e.target.checked;
                } else {
                    questions[index][field] = e.target.value;
                }
                // If type changed to choice type, initialize options
                if (field === 'type' && (e.target.value === 'MULTIPLE_CHOICE' || e.target.value === 'CHECKBOX')) {
                    if (!questions[index].options || questions[index].options.length === 0) {
                        questions[index].options = ['', ''];
                    }
                }
                renderDashboard(container);
            }
        }
        // Option fields
        if (e.target.dataset.optionIndex !== undefined) {
            const questionIndex = parseInt(e.target.dataset.questionIndex, 10);
            const optionIndex = parseInt(e.target.dataset.optionIndex, 10);
            const questions = dashboardState.questionnaireFormData.questions;
            if (questions[questionIndex] && questions[questionIndex].options) {
                questions[questionIndex].options[optionIndex] = e.target.value;
            }
        }
    });

    // Input handlers for immediate updates
    container.addEventListener('input', (e) => {
        // Questionnaire form fields
        if (e.target.dataset.field) {
            const field = e.target.dataset.field;
            dashboardState.questionnaireFormData[field] = e.target.value;
        }
        // Question text
        if (e.target.dataset.questionField === 'text') {
            const index = parseInt(e.target.dataset.questionIndex, 10);
            const questions = dashboardState.questionnaireFormData.questions;
            if (questions[index]) {
                questions[index].text = e.target.value;
            }
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
        // Backend wraps response in { success: true, organization: {...} }
        dashboardState.organization = updated.organization || updated;
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

// ==================== Endorsement Tab Functions ====================

/**
 * Render Endorsements tab
 */
function renderEndorsementsTab() {
    const isHead = dashboardState.userRole === 'HEAD';
    const canManageQuestionnaires = isHead || dashboardState.userCapabilities.includes('MANAGE_QUESTIONNAIRE');
    const canReviewApplications = isHead || dashboardState.userCapabilities.includes('REVIEW_APPLICATIONS') || dashboardState.userCapabilities.includes('VOTE_ENDORSEMENT');

    return `
        <div class="org-endorsements-tab">
            ${renderEndorsementsSubNav(canManageQuestionnaires, canReviewApplications)}
            <div class="org-endorsements-content">
                ${renderEndorsementsSubTabContent()}
            </div>
        </div>
        ${dashboardState.showQuestionnaireModal ? renderQuestionnaireModal() : ''}
        ${dashboardState.showApplicationDetailModal ? renderApplicationDetailModal() : ''}
        ${dashboardState.showRevokeConfirmModal ? renderRevokeConfirmModal() : ''}
    `;
}

/**
 * Render endorsements sub-navigation
 */
function renderEndorsementsSubNav(canManageQuestionnaires, canReviewApplications) {
    return `
        <div class="org-endorsements-subnav">
            ${canManageQuestionnaires ? `
                <button
                    class="org-endorsements-subnav-btn ${dashboardState.endorsementsSubTab === 'questionnaires' ? 'active' : ''}"
                    data-subtab="questionnaires"
                >
                    Questionnaires
                </button>
            ` : ''}
            ${canReviewApplications ? `
                <button
                    class="org-endorsements-subnav-btn ${dashboardState.endorsementsSubTab === 'applications' ? 'active' : ''}"
                    data-subtab="applications"
                >
                    Applications
                </button>
            ` : ''}
            <button
                class="org-endorsements-subnav-btn ${dashboardState.endorsementsSubTab === 'published' ? 'active' : ''}"
                data-subtab="published"
            >
                Published
            </button>
        </div>
    `;
}

/**
 * Render endorsements sub-tab content
 */
function renderEndorsementsSubTabContent() {
    switch (dashboardState.endorsementsSubTab) {
        case 'questionnaires':
            return renderQuestionnairesSection();
        case 'applications':
            return renderApplicationsSection();
        case 'published':
            return renderPublishedSection();
        default:
            return renderQuestionnairesSection();
    }
}

/**
 * Render questionnaires section
 */
function renderQuestionnairesSection() {
    if (dashboardState.questionnairesLoading) {
        return `
            <div class="org-endorsements-loading">
                <div class="loading-spinner"></div>
                <p>Loading questionnaires...</p>
            </div>
        `;
    }

    return `
        <div class="org-questionnaires-section">
            <div class="org-questionnaires-header">
                <h2>Endorsement Questionnaires (${dashboardState.questionnaires.length})</h2>
                <button class="org-dashboard-btn org-dashboard-btn-primary" data-action="createQuestionnaire">
                    + Create Questionnaire
                </button>
            </div>
            ${dashboardState.questionnaires.length > 0 ? `
                <div class="org-questionnaires-grid">
                    ${dashboardState.questionnaires.map(q => renderQuestionnaireCard(q)).join('')}
                </div>
            ` : `
                <div class="org-questionnaires-empty">
                    <p>No questionnaires created yet.</p>
                    <p>Create a questionnaire to start accepting endorsement applications from candidates.</p>
                </div>
            `}
        </div>
    `;
}

/**
 * Render questionnaire card
 */
function renderQuestionnaireCard(questionnaire) {
    const questionCount = questionnaire.questions?.length || questionnaire._count?.questions || 0;
    const applicationCount = questionnaire._count?.applications || 0;

    return `
        <div class="org-questionnaire-card" data-questionnaire-id="${questionnaire.id}">
            <div class="org-questionnaire-card-header">
                <h3 class="org-questionnaire-name">${escapeHtml(questionnaire.title)}</h3>
                <span class="org-questionnaire-status ${questionnaire.isActive ? 'active' : 'inactive'}">
                    ${questionnaire.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            ${questionnaire.description ? `
                <p class="org-questionnaire-description">${escapeHtml(questionnaire.description)}</p>
            ` : ''}
            <div class="org-questionnaire-stats">
                <span>${questionCount} questions</span>
                <span>${applicationCount} applications</span>
            </div>
            <div class="org-questionnaire-actions">
                <button
                    class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-secondary"
                    data-action="editQuestionnaire"
                    data-questionnaire-id="${questionnaire.id}"
                >
                    Edit
                </button>
                <button
                    class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-secondary"
                    data-action="toggleQuestionnaire"
                    data-questionnaire-id="${questionnaire.id}"
                >
                    ${questionnaire.isActive ? 'Deactivate' : 'Activate'}
                </button>
                ${applicationCount === 0 ? `
                    <button
                        class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-danger"
                        data-action="deleteQuestionnaire"
                        data-questionnaire-id="${questionnaire.id}"
                    >
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render questionnaire modal
 */
function renderQuestionnaireModal() {
    const isEditing = dashboardState.editingQuestionnaire && dashboardState.editingQuestionnaire.id;
    const formData = dashboardState.questionnaireFormData;

    return `
        <div class="org-modal-overlay" data-action="closeQuestionnaireModal">
            <div class="org-questionnaire-modal" onclick="event.stopPropagation()">
                <div class="org-modal-header">
                    <h2>${isEditing ? 'Edit Questionnaire' : 'Create Questionnaire'}</h2>
                    <button class="org-modal-close" data-action="closeQuestionnaireModal">&times;</button>
                </div>
                <div class="org-modal-body">
                    <div class="org-form-field">
                        <label for="questionnaireTitle">Title *</label>
                        <input
                            type="text"
                            id="questionnaireTitle"
                            value="${escapeHtml(formData.title || '')}"
                            maxlength="100"
                            placeholder="e.g., 2026 General Election Endorsement"
                            data-field="title"
                        />
                    </div>
                    <div class="org-form-field">
                        <label for="questionnaireDescription">Description</label>
                        <textarea
                            id="questionnaireDescription"
                            rows="2"
                            maxlength="500"
                            placeholder="Describe what this questionnaire is for..."
                            data-field="description"
                        >${escapeHtml(formData.description || '')}</textarea>
                    </div>
                    <div class="org-form-field org-form-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                id="questionnaireActive"
                                ${formData.isActive ? 'checked' : ''}
                                data-field="isActive"
                            />
                            Active (accepting applications)
                        </label>
                    </div>

                    <hr class="org-modal-divider" />

                    ${renderQuestionsBuilder()}
                </div>
                <div class="org-modal-footer">
                    <button class="org-dashboard-btn org-dashboard-btn-secondary" data-action="closeQuestionnaireModal">
                        Cancel
                    </button>
                    <button class="org-dashboard-btn org-dashboard-btn-primary" data-action="saveQuestionnaire">
                        ${isEditing ? 'Save Changes' : 'Create Questionnaire'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render questions builder
 */
function renderQuestionsBuilder() {
    const questions = dashboardState.questionnaireFormData.questions || [];

    return `
        <div class="org-questions-builder">
            <div class="org-questions-header">
                <h3>Questions (${questions.length})</h3>
                <button class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-primary" data-action="addQuestion">
                    + Add Question
                </button>
            </div>
            ${questions.length > 0 ? `
                <div class="org-questions-list">
                    ${questions.map((q, i) => renderQuestionRow(q, i)).join('')}
                </div>
            ` : `
                <div class="org-questions-empty">
                    <p>No questions added yet. Add at least one question.</p>
                </div>
            `}
        </div>
    `;
}

/**
 * Render question row
 */
function renderQuestionRow(question, index) {
    const isEditing = dashboardState.editingQuestionIndex === index;

    if (isEditing) {
        return renderQuestionEditor(question, index);
    }

    return `
        <div class="org-question-row" data-question-index="${index}">
            <div class="org-question-row-header">
                <div class="org-question-row-info">
                    <span class="org-question-order">${index + 1}.</span>
                    <span class="org-question-text">${escapeHtml(question.text || 'Untitled question')}</span>
                    <span class="org-question-type-badge">${QUESTION_TYPE_LABELS[question.type] || question.type}</span>
                    ${question.isRequired ? '<span class="org-question-required">Required</span>' : ''}
                </div>
                <div class="org-question-row-actions">
                    ${index > 0 ? `
                        <button class="org-question-btn" data-action="moveQuestionUp" data-question-index="${index}" title="Move up">↑</button>
                    ` : ''}
                    ${index < (dashboardState.questionnaireFormData.questions.length - 1) ? `
                        <button class="org-question-btn" data-action="moveQuestionDown" data-question-index="${index}" title="Move down">↓</button>
                    ` : ''}
                    <button class="org-question-btn" data-action="editQuestion" data-question-index="${index}" title="Edit">Edit</button>
                    <button class="org-question-btn org-question-btn-danger" data-action="deleteQuestion" data-question-index="${index}" title="Delete">×</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render question editor
 */
function renderQuestionEditor(question, index) {
    const options = question.options || [];

    return `
        <div class="org-question-row org-question-row-editing" data-question-index="${index}">
            <div class="org-question-editor">
                <div class="org-form-field">
                    <label>Question Text *</label>
                    <input
                        type="text"
                        value="${escapeHtml(question.text || '')}"
                        placeholder="Enter your question..."
                        data-question-field="text"
                        data-question-index="${index}"
                    />
                </div>
                <div class="org-form-row">
                    <div class="org-form-field">
                        <label>Type</label>
                        <select data-question-field="type" data-question-index="${index}">
                            ${Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) =>
                                `<option value="${value}" ${question.type === value ? 'selected' : ''}>${label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="org-form-field org-form-field-checkbox">
                        <label>
                            <input type="checkbox" ${question.isRequired ? 'checked' : ''} data-question-field="isRequired" data-question-index="${index}" />
                            Required
                        </label>
                    </div>
                    <div class="org-form-field org-form-field-checkbox">
                        <label>
                            <input type="checkbox" ${question.isPublic ? 'checked' : ''} data-question-field="isPublic" data-question-index="${index}" />
                            Public
                        </label>
                    </div>
                </div>
                ${(question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOX') ? renderOptionsManager(options, index) : ''}
                <div class="org-question-editor-actions">
                    <button class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-primary" data-action="saveQuestion" data-question-index="${index}">
                        Done
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render options manager for choice questions
 */
function renderOptionsManager(options, questionIndex) {
    return `
        <div class="org-options-manager">
            <label>Options (min 2)</label>
            <div class="org-options-list">
                ${options.map((opt, i) => `
                    <div class="org-option-row">
                        <input
                            type="text"
                            value="${escapeHtml(opt)}"
                            placeholder="Option ${i + 1}"
                            data-option-index="${i}"
                            data-question-index="${questionIndex}"
                        />
                        <button class="org-option-remove" data-action="removeOption" data-option-index="${i}" data-question-index="${questionIndex}">×</button>
                    </div>
                `).join('')}
            </div>
            <button class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-secondary" data-action="addOption" data-question-index="${questionIndex}">
                + Add Option
            </button>
        </div>
    `;
}

/**
 * Render applications section
 */
function renderApplicationsSection() {
    if (dashboardState.applicationsLoading) {
        return `
            <div class="org-endorsements-loading">
                <div class="loading-spinner"></div>
                <p>Loading applications...</p>
            </div>
        `;
    }

    return `
        <div class="org-applications-section">
            <div class="org-applications-header">
                <h2>Endorsement Applications</h2>
            </div>
            ${renderApplicationsFilter()}
            ${dashboardState.applications.length > 0 ? `
                <div class="org-applications-list">
                    ${dashboardState.applications.map(app => renderApplicationCard(app)).join('')}
                </div>
            ` : `
                <div class="org-applications-empty">
                    <p>No applications found${dashboardState.applicationsFilter.status ? ` with status "${APPLICATION_STATUS_LABELS[dashboardState.applicationsFilter.status]}"` : ''}.</p>
                </div>
            `}
        </div>
    `;
}

/**
 * Render applications filter
 */
function renderApplicationsFilter() {
    return `
        <div class="org-applications-filter">
            <div class="org-filter-group">
                <label>Questionnaire</label>
                <select data-filter="questionnaireId">
                    <option value="">All Questionnaires</option>
                    ${dashboardState.questionnaires.map(q =>
                        `<option value="${q.id}" ${dashboardState.applicationsFilter.questionnaireId === q.id ? 'selected' : ''}>${escapeHtml(q.title)}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="org-filter-group">
                <label>Status</label>
                <select data-filter="status">
                    <option value="">All Statuses</option>
                    ${Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) =>
                        `<option value="${value}" ${dashboardState.applicationsFilter.status === value ? 'selected' : ''}>${label}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
    `;
}

/**
 * Render application card
 */
function renderApplicationCard(application) {
    const candidate = application.candidate;
    const questionnaire = application.questionnaire;

    return `
        <div class="org-application-card" data-application-id="${application.id}">
            <div class="org-application-card-header">
                <div class="org-application-candidate">
                    <span class="org-application-candidate-name">${escapeHtml(candidate?.user?.displayName || 'Unknown Candidate')}</span>
                    ${questionnaire ? `<span class="org-application-questionnaire">${escapeHtml(questionnaire.title)}</span>` : ''}
                </div>
                <span class="org-application-status ${application.status.toLowerCase()}">${APPLICATION_STATUS_LABELS[application.status]}</span>
            </div>
            <div class="org-application-card-meta">
                <span>Submitted: ${new Date(application.submittedAt).toLocaleDateString()}</span>
                ${application.status === 'UNDER_REVIEW' ? `
                    <span class="org-application-votes">
                        Votes: ${application.votesFor || 0} for / ${application.votesAgainst || 0} against / ${application.votesAbstain || 0} abstain
                    </span>
                ` : ''}
            </div>
            <div class="org-application-card-actions">
                <button
                    class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-primary"
                    data-action="viewApplication"
                    data-application-id="${application.id}"
                >
                    View Details
                </button>
            </div>
        </div>
    `;
}

/**
 * Render application detail modal
 */
function renderApplicationDetailModal() {
    const app = dashboardState.selectedApplication;
    if (!app) return '';

    const isHead = dashboardState.userRole === 'HEAD';
    const canVote = isHead || dashboardState.userCapabilities.includes('VOTE_ENDORSEMENT');
    const canPublish = isHead || dashboardState.userCapabilities.includes('PUBLISH_ENDORSEMENT');
    const canReview = isHead || dashboardState.userCapabilities.includes('REVIEW_APPLICATIONS');

    return `
        <div class="org-modal-overlay" data-action="closeApplicationModal">
            <div class="org-application-modal" onclick="event.stopPropagation()">
                <div class="org-modal-header">
                    <h2>Application Details</h2>
                    <button class="org-modal-close" data-action="closeApplicationModal">&times;</button>
                </div>
                <div class="org-modal-body">
                    <div class="org-application-detail-header">
                        <div class="org-application-detail-candidate">
                            <h3>${escapeHtml(app.candidate?.user?.displayName || 'Unknown Candidate')}</h3>
                            <span class="org-application-status ${app.status.toLowerCase()}">${APPLICATION_STATUS_LABELS[app.status]}</span>
                        </div>
                        <div class="org-application-detail-meta">
                            <span>Questionnaire: ${escapeHtml(app.questionnaire?.title || 'Unknown')}</span>
                            <span>Submitted: ${new Date(app.submittedAt).toLocaleString()}</span>
                        </div>
                    </div>

                    <h4>Responses</h4>
                    ${renderApplicationResponses(app)}

                    ${app.status === 'UNDER_REVIEW' && canVote ? renderVotingSection(app) : ''}

                    ${renderApplicationActions(app, canReview, canPublish)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render application responses
 */
function renderApplicationResponses(app) {
    const responses = app.responses || [];

    if (responses.length === 0) {
        return '<p class="org-no-responses">No responses recorded.</p>';
    }

    return `
        <div class="org-application-responses">
            ${responses.map(response => `
                <div class="org-response-item">
                    <div class="org-response-question">
                        ${escapeHtml(response.question?.text || 'Unknown question')}
                        ${response.question?.isRequired ? '<span class="org-required-marker">*</span>' : ''}
                    </div>
                    <div class="org-response-answer">${escapeHtml(response.response || 'No answer')}</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render voting section
 */
function renderVotingSection(app) {
    const voteStatus = dashboardState.voteStatus;
    const currentVote = dashboardState.currentUserVote;

    return `
        <div class="org-voting-section">
            <h4>Cast Your Vote</h4>
            <div class="org-vote-buttons">
                <button
                    class="org-vote-btn org-vote-btn-for ${currentVote === 'FOR' ? 'selected' : ''}"
                    data-action="castVote"
                    data-vote="FOR"
                >
                    FOR
                </button>
                <button
                    class="org-vote-btn org-vote-btn-against ${currentVote === 'AGAINST' ? 'selected' : ''}"
                    data-action="castVote"
                    data-vote="AGAINST"
                >
                    AGAINST
                </button>
                <button
                    class="org-vote-btn org-vote-btn-abstain ${currentVote === 'ABSTAIN' ? 'selected' : ''}"
                    data-action="castVote"
                    data-vote="ABSTAIN"
                >
                    ABSTAIN
                </button>
            </div>
            ${voteStatus ? `
                <div class="org-vote-status">
                    <div class="org-vote-counts">
                        <span class="org-vote-count for">${voteStatus.votesFor || 0} For</span>
                        <span class="org-vote-count against">${voteStatus.votesAgainst || 0} Against</span>
                        <span class="org-vote-count abstain">${voteStatus.votesAbstain || 0} Abstain</span>
                    </div>
                    <div class="org-vote-threshold">
                        ${voteStatus.thresholdMet ? '✓ Threshold met' : 'Threshold not met'}
                        ${voteStatus.quorumMet ? '' : ' (Quorum not reached)'}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render application actions
 */
function renderApplicationActions(app, canReview, canPublish) {
    const actions = [];

    if (app.status === 'SUBMITTED' && canReview) {
        actions.push(`
            <button class="org-dashboard-btn org-dashboard-btn-primary" data-action="moveToReview" data-application-id="${app.id}">
                Move to Review
            </button>
        `);
    }

    if (app.status === 'UNDER_REVIEW' && canPublish) {
        actions.push(`
            <button class="org-dashboard-btn org-dashboard-btn-success" data-action="publishEndorsement" data-application-id="${app.id}">
                Publish Endorsement
            </button>
        `);
        actions.push(`
            <button class="org-dashboard-btn org-dashboard-btn-danger" data-action="denyApplication" data-application-id="${app.id}">
                Deny
            </button>
        `);
    }

    if (actions.length === 0) return '';

    return `
        <div class="org-application-actions">
            ${actions.join('')}
        </div>
    `;
}

/**
 * Render published endorsements section
 */
function renderPublishedSection() {
    if (dashboardState.endorsementsLoading) {
        return `
            <div class="org-endorsements-loading">
                <div class="loading-spinner"></div>
                <p>Loading endorsements...</p>
            </div>
        `;
    }

    return `
        <div class="org-published-section">
            <div class="org-published-header">
                <h2>Published Endorsements (${dashboardState.endorsements.length})</h2>
            </div>
            ${dashboardState.endorsements.length > 0 ? `
                <div class="org-endorsements-list">
                    ${dashboardState.endorsements.map(e => renderEndorsementCard(e)).join('')}
                </div>
            ` : `
                <div class="org-endorsements-empty">
                    <p>No endorsements published yet.</p>
                </div>
            `}
        </div>
    `;
}

/**
 * Render endorsement card
 */
function renderEndorsementCard(endorsement) {
    const isHead = dashboardState.userRole === 'HEAD';
    const canRevoke = isHead || dashboardState.userCapabilities.includes('PUBLISH_ENDORSEMENT');

    return `
        <div class="org-endorsement-card ${!endorsement.isActive ? 'revoked' : ''}" data-endorsement-id="${endorsement.id}">
            <div class="org-endorsement-card-header">
                <div class="org-endorsement-candidate">
                    <span class="org-endorsement-candidate-name">${escapeHtml(endorsement.candidate?.user?.displayName || 'Unknown')}</span>
                </div>
                ${!endorsement.isActive ? '<span class="org-endorsement-revoked-badge">Revoked</span>' : ''}
            </div>
            ${endorsement.statement ? `
                <p class="org-endorsement-statement">"${escapeHtml(endorsement.statement)}"</p>
            ` : ''}
            <div class="org-endorsement-meta">
                <span>Published: ${new Date(endorsement.publishedAt).toLocaleDateString()}</span>
                ${endorsement.revokedAt ? `<span>Revoked: ${new Date(endorsement.revokedAt).toLocaleDateString()}</span>` : ''}
            </div>
            ${endorsement.isActive && canRevoke ? `
                <div class="org-endorsement-actions">
                    <button
                        class="org-dashboard-btn org-dashboard-btn-sm org-dashboard-btn-danger"
                        data-action="revokeEndorsement"
                        data-endorsement-id="${endorsement.id}"
                    >
                        Revoke
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render revoke confirmation modal
 */
function renderRevokeConfirmModal() {
    return `
        <div class="org-modal-overlay" data-action="closeRevokeModal">
            <div class="org-confirm-modal" onclick="event.stopPropagation()">
                <div class="org-modal-header">
                    <h2>Revoke Endorsement</h2>
                    <button class="org-modal-close" data-action="closeRevokeModal">&times;</button>
                </div>
                <div class="org-modal-body">
                    <p>Are you sure you want to revoke this endorsement? This action can be seen publicly.</p>
                    <div class="org-form-field">
                        <label for="revokeReason">Reason (optional)</label>
                        <textarea id="revokeReason" rows="3" placeholder="Explain why the endorsement is being revoked..."></textarea>
                    </div>
                </div>
                <div class="org-modal-footer">
                    <button class="org-dashboard-btn org-dashboard-btn-secondary" data-action="closeRevokeModal">
                        Cancel
                    </button>
                    <button class="org-dashboard-btn org-dashboard-btn-danger" data-action="confirmRevoke">
                        Revoke Endorsement
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== Endorsement Data Loading ====================

/**
 * Load questionnaires
 */
async function loadQuestionnaires() {
    if (!dashboardState.organization) return;

    dashboardState.questionnairesLoading = true;

    try {
        const response = await fetch(
            `${API_BASE}/questionnaires/organizations/${dashboardState.organization.id}?includeInactive=true`,
            { credentials: 'include' }
        );

        if (response.ok) {
            const data = await response.json();
            dashboardState.questionnaires = data.questionnaires || [];
        }
    } catch (error) {
        console.error('Failed to load questionnaires:', error);
    }

    dashboardState.questionnairesLoading = false;

    if (dashboardState.activeTab === 'endorsements') {
        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);
    }
}

/**
 * Load applications
 */
async function loadApplications() {
    if (!dashboardState.organization) return;

    // Need at least one questionnaire to load applications
    if (dashboardState.questionnaires.length === 0) {
        dashboardState.applications = [];
        return;
    }

    dashboardState.applicationsLoading = true;

    try {
        // If a specific questionnaire is selected, load from that
        // Otherwise load from the first active questionnaire
        const questionnaireId = dashboardState.applicationsFilter.questionnaireId ||
            dashboardState.questionnaires[0]?.id;

        if (!questionnaireId) {
            dashboardState.applications = [];
            dashboardState.applicationsLoading = false;
            return;
        }

        let url = `${API_BASE}/endorsements/questionnaires/${questionnaireId}/applications`;
        if (dashboardState.applicationsFilter.status) {
            url += `?status=${dashboardState.applicationsFilter.status}`;
        }

        const response = await fetch(url, { credentials: 'include' });

        if (response.ok) {
            const data = await response.json();
            dashboardState.applications = data.applications || [];
        }
    } catch (error) {
        console.error('Failed to load applications:', error);
    }

    dashboardState.applicationsLoading = false;

    if (dashboardState.activeTab === 'endorsements' && dashboardState.endorsementsSubTab === 'applications') {
        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);
    }
}

/**
 * Load published endorsements
 */
async function loadEndorsements() {
    if (!dashboardState.organization) return;

    dashboardState.endorsementsLoading = true;

    try {
        const response = await fetch(
            `${API_BASE}/endorsements/organizations/${dashboardState.organization.id}?includeRevoked=true`,
            { credentials: 'include' }
        );

        if (response.ok) {
            const data = await response.json();
            dashboardState.endorsements = data.endorsements || [];
        }
    } catch (error) {
        console.error('Failed to load endorsements:', error);
    }

    dashboardState.endorsementsLoading = false;

    if (dashboardState.activeTab === 'endorsements' && dashboardState.endorsementsSubTab === 'published') {
        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);
    }
}

/**
 * Load application details
 */
async function loadApplicationDetails(applicationId) {
    try {
        const [appResponse, voteStatusResponse] = await Promise.all([
            fetch(`${API_BASE}/endorsements/applications/${applicationId}`, { credentials: 'include' }),
            fetch(`${API_BASE}/endorsements/applications/${applicationId}/vote-status`, { credentials: 'include' })
        ]);

        if (appResponse.ok) {
            dashboardState.selectedApplication = await appResponse.json();
        }

        if (voteStatusResponse.ok) {
            const voteData = await voteStatusResponse.json();
            dashboardState.voteStatus = voteData;
            dashboardState.currentUserVote = voteData.userVote || null;
        }
    } catch (error) {
        console.error('Failed to load application details:', error);
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

// ==================== Endorsement Handler Functions ====================

/**
 * Open questionnaire modal for create
 */
function openQuestionnaireModal(questionnaire) {
    dashboardState.editingQuestionnaire = questionnaire;
    dashboardState.questionnaireFormData = {
        title: '',
        description: '',
        isActive: true,
        questions: []
    };
    dashboardState.editingQuestionIndex = null;
    dashboardState.showQuestionnaireModal = true;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Open questionnaire modal for edit
 */
async function openQuestionnaireModalForEdit(questionnaireId) {
    try {
        const response = await fetch(
            `${API_BASE}/questionnaires/${questionnaireId}`,
            { credentials: 'include' }
        );

        if (!response.ok) throw new Error('Failed to load questionnaire');

        const questionnaire = await response.json();
        dashboardState.editingQuestionnaire = questionnaire;
        dashboardState.questionnaireFormData = {
            title: questionnaire.title || '',
            description: questionnaire.description || '',
            isActive: questionnaire.isActive !== false,
            questions: (questionnaire.questions || []).map(q => ({
                id: q.id,
                text: q.text,
                type: q.type,
                description: q.description || '',
                options: q.options || [],
                isRequired: q.isRequired !== false,
                isPublic: q.isPublic !== false,
                displayOrder: q.displayOrder
            })).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        };
        dashboardState.editingQuestionIndex = null;
        dashboardState.showQuestionnaireModal = true;

        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);

    } catch (error) {
        console.error('Load questionnaire failed:', error);
        showToast(error.message || 'Failed to load questionnaire');
    }
}

/**
 * Close questionnaire modal
 */
function closeQuestionnaireModal() {
    dashboardState.showQuestionnaireModal = false;
    dashboardState.editingQuestionnaire = null;
    dashboardState.questionnaireFormData = { title: '', description: '', isActive: true, questions: [] };
    dashboardState.editingQuestionIndex = null;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Save questionnaire
 */
async function saveQuestionnaire() {
    const org = dashboardState.organization;
    const isEditing = dashboardState.editingQuestionnaire && dashboardState.editingQuestionnaire.id;
    const formData = dashboardState.questionnaireFormData;

    if (!formData.title.trim()) {
        showToast('Title is required');
        return;
    }

    if (formData.questions.length === 0) {
        showToast('Add at least one question');
        return;
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
        const q = formData.questions[i];
        if (!q.text.trim()) {
            showToast(`Question ${i + 1} needs text`);
            return;
        }
        if ((q.type === 'MULTIPLE_CHOICE' || q.type === 'CHECKBOX') &&
            (!q.options || q.options.filter(o => o.trim()).length < 2)) {
            showToast(`Question ${i + 1} needs at least 2 options`);
            return;
        }
    }

    try {
        if (isEditing) {
            // Update questionnaire metadata
            await fetch(`${API_BASE}/questionnaires/${dashboardState.editingQuestionnaire.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description || null,
                    isActive: formData.isActive
                })
            });

            // Handle questions (simplified - in production would need proper sync)
            // For now, we'll update existing and add new
            for (let i = 0; i < formData.questions.length; i++) {
                const q = formData.questions[i];
                q.displayOrder = i + 1;
                const cleanOptions = (q.options || []).filter(o => o.trim());

                if (q.id) {
                    // Update existing
                    await fetch(`${API_BASE}/questionnaires/questions/${q.id}`, {
                        method: 'PATCH',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: q.text,
                            type: q.type,
                            description: q.description || null,
                            options: cleanOptions.length > 0 ? cleanOptions : null,
                            isRequired: q.isRequired,
                            isPublic: q.isPublic,
                            displayOrder: q.displayOrder
                        })
                    });
                } else {
                    // Add new
                    await fetch(`${API_BASE}/questionnaires/${dashboardState.editingQuestionnaire.id}/questions`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: q.text,
                            type: q.type,
                            description: q.description || null,
                            options: cleanOptions.length > 0 ? cleanOptions : null,
                            isRequired: q.isRequired,
                            isPublic: q.isPublic,
                            displayOrder: q.displayOrder
                        })
                    });
                }
            }

            showToast('Questionnaire updated');
        } else {
            // Create new questionnaire with questions
            const questions = formData.questions.map((q, i) => ({
                text: q.text,
                type: q.type,
                description: q.description || null,
                options: (q.options || []).filter(o => o.trim()),
                isRequired: q.isRequired !== false,
                isPublic: q.isPublic !== false,
                displayOrder: i + 1
            }));

            const response = await fetch(`${API_BASE}/questionnaires/organizations/${org.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description || null,
                    isActive: formData.isActive,
                    questions
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create questionnaire');
            }

            showToast('Questionnaire created');
        }

        closeQuestionnaireModal();
        await loadQuestionnaires();

    } catch (error) {
        console.error('Save questionnaire failed:', error);
        showToast(error.message || 'Failed to save questionnaire');
    }
}

/**
 * Toggle questionnaire active status
 */
async function toggleQuestionnaire(questionnaireId) {
    const questionnaire = dashboardState.questionnaires.find(q => q.id === questionnaireId);
    if (!questionnaire) return;

    try {
        const response = await fetch(`${API_BASE}/questionnaires/${questionnaireId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !questionnaire.isActive })
        });

        if (!response.ok) throw new Error('Failed to update questionnaire');

        showToast(questionnaire.isActive ? 'Questionnaire deactivated' : 'Questionnaire activated');
        await loadQuestionnaires();

    } catch (error) {
        console.error('Toggle questionnaire failed:', error);
        showToast(error.message || 'Failed to update questionnaire');
    }
}

/**
 * Delete questionnaire
 */
async function deleteQuestionnaire(questionnaireId) {
    if (!confirm('Are you sure you want to delete this questionnaire?')) return;

    try {
        const response = await fetch(`${API_BASE}/questionnaires/${questionnaireId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete questionnaire');
        }

        showToast('Questionnaire deleted');
        await loadQuestionnaires();

    } catch (error) {
        console.error('Delete questionnaire failed:', error);
        showToast(error.message || 'Failed to delete questionnaire');
    }
}

/**
 * Add question to questionnaire form
 */
function addQuestion() {
    dashboardState.questionnaireFormData.questions.push({
        text: '',
        type: 'SHORT_TEXT',
        description: '',
        options: [],
        isRequired: true,
        isPublic: true
    });
    dashboardState.editingQuestionIndex = dashboardState.questionnaireFormData.questions.length - 1;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Delete question from questionnaire form
 */
function deleteQuestion(index) {
    dashboardState.questionnaireFormData.questions.splice(index, 1);
    if (dashboardState.editingQuestionIndex === index) {
        dashboardState.editingQuestionIndex = null;
    } else if (dashboardState.editingQuestionIndex > index) {
        dashboardState.editingQuestionIndex--;
    }

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Move question up or down
 */
function moveQuestion(index, direction) {
    const questions = dashboardState.questionnaireFormData.questions;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const temp = questions[index];
    questions[index] = questions[newIndex];
    questions[newIndex] = temp;

    if (dashboardState.editingQuestionIndex === index) {
        dashboardState.editingQuestionIndex = newIndex;
    } else if (dashboardState.editingQuestionIndex === newIndex) {
        dashboardState.editingQuestionIndex = index;
    }

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Add option to question
 */
function addOption(questionIndex) {
    const question = dashboardState.questionnaireFormData.questions[questionIndex];
    if (question) {
        question.options = question.options || [];
        question.options.push('');
    }

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Remove option from question
 */
function removeOption(questionIndex, optionIndex) {
    const question = dashboardState.questionnaireFormData.questions[questionIndex];
    if (question && question.options) {
        question.options.splice(optionIndex, 1);
    }

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * View application details
 */
async function viewApplication(applicationId) {
    await loadApplicationDetails(applicationId);
    dashboardState.showApplicationDetailModal = true;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Close application modal
 */
function closeApplicationModal() {
    dashboardState.showApplicationDetailModal = false;
    dashboardState.selectedApplication = null;
    dashboardState.currentUserVote = null;
    dashboardState.voteStatus = null;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Update application status
 */
async function updateApplicationStatus(applicationId, status) {
    try {
        const response = await fetch(`${API_BASE}/endorsements/applications/${applicationId}/status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update status');
        }

        showToast(`Application moved to ${APPLICATION_STATUS_LABELS[status]}`);
        closeApplicationModal();
        await loadApplications();

    } catch (error) {
        console.error('Update status failed:', error);
        showToast(error.message || 'Failed to update status');
    }
}

/**
 * Cast vote on application
 */
async function castVote(vote) {
    const app = dashboardState.selectedApplication;
    if (!app) return;

    try {
        const response = await fetch(`${API_BASE}/endorsements/applications/${app.id}/vote`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vote })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to cast vote');
        }

        showToast('Vote recorded');
        await loadApplicationDetails(app.id);

        const container = document.getElementById('orgDashboardContainer');
        if (container) renderDashboard(container);

    } catch (error) {
        console.error('Cast vote failed:', error);
        showToast(error.message || 'Failed to cast vote');
    }
}

/**
 * Publish endorsement
 */
async function publishEndorsement(applicationId) {
    const statement = prompt('Enter endorsement statement (optional):');

    try {
        const response = await fetch(`${API_BASE}/endorsements/applications/${applicationId}/publish`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statement: statement || null })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to publish endorsement');
        }

        showToast('Endorsement published');
        closeApplicationModal();
        await loadApplications();
        await loadEndorsements();

    } catch (error) {
        console.error('Publish failed:', error);
        showToast(error.message || 'Failed to publish endorsement');
    }
}

/**
 * Deny application
 */
async function denyApplicationAction(applicationId) {
    if (!confirm('Are you sure you want to deny this application?')) return;

    try {
        const response = await fetch(`${API_BASE}/endorsements/applications/${applicationId}/deny`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to deny application');
        }

        showToast('Application denied');
        closeApplicationModal();
        await loadApplications();

    } catch (error) {
        console.error('Deny failed:', error);
        showToast(error.message || 'Failed to deny application');
    }
}

/**
 * Open revoke confirmation modal
 */
function openRevokeModal(endorsementId) {
    dashboardState.endorsementToRevoke = endorsementId;
    dashboardState.showRevokeConfirmModal = true;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Close revoke modal
 */
function closeRevokeModal() {
    dashboardState.showRevokeConfirmModal = false;
    dashboardState.endorsementToRevoke = null;

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Confirm revoke endorsement
 */
async function confirmRevoke() {
    const endorsementId = dashboardState.endorsementToRevoke;
    if (!endorsementId) return;

    const reasonInput = document.getElementById('revokeReason');
    const reason = reasonInput ? reasonInput.value : '';

    try {
        const response = await fetch(`${API_BASE}/endorsements/${endorsementId}/revoke`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason || null })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to revoke endorsement');
        }

        showToast('Endorsement revoked');
        closeRevokeModal();
        await loadEndorsements();

    } catch (error) {
        console.error('Revoke failed:', error);
        showToast(error.message || 'Failed to revoke endorsement');
    }
}

// ==================== Jurisdiction Modal Functions ====================

/**
 * Open jurisdiction editing modal
 */
function openJurisdictionModal() {
    const org = dashboardState.organization;
    if (!org || org.jurisdictionType !== 'CUSTOM') return;

    // Initialize with current cells
    dashboardState.jurisdictionCells = org.h3Cells ? [...org.h3Cells] : [];
    dashboardState.jurisdictionHistory = [];
    dashboardState.showJurisdictionModal = true;

    const container = document.getElementById('orgDashboardContainer');
    if (container) {
        renderDashboard(container);

        // Initialize map after modal is rendered
        setTimeout(() => initJurisdictionMap(), 100);
    }
}

/**
 * Close jurisdiction modal
 */
function closeJurisdictionModal() {
    // Clean up map
    if (dashboardState.jurisdictionMap) {
        dashboardState.jurisdictionMap.remove();
        dashboardState.jurisdictionMap = null;
    }

    dashboardState.showJurisdictionModal = false;
    dashboardState.jurisdictionCells = [];
    dashboardState.jurisdictionHistory = [];

    const container = document.getElementById('orgDashboardContainer');
    if (container) renderDashboard(container);
}

/**
 * Initialize the jurisdiction map
 */
function initJurisdictionMap() {
    const mapContainer = document.getElementById('jurisdictionMapContainer');
    if (!mapContainer) {
        console.warn('Jurisdiction map container not found');
        return;
    }

    // Check if MapLibre is available
    if (typeof maplibregl === 'undefined') {
        console.error('MapLibre GL JS not loaded');
        mapContainer.innerHTML = '<p style="color: red; padding: 1rem;">Map library not available</p>';
        return;
    }

    // Check if h3 library is available
    if (typeof h3 === 'undefined') {
        console.error('H3 library not loaded');
        mapContainer.innerHTML = '<p style="color: red; padding: 1rem;">H3 library not available</p>';
        return;
    }

    // Remove existing map if present
    if (dashboardState.jurisdictionMap) {
        dashboardState.jurisdictionMap.remove();
    }

    // Create new map
    dashboardState.jurisdictionMap = new maplibregl.Map({
        container: mapContainer,
        style: {
            version: 8,
            sources: {
                'carto-light': {
                    type: 'raster',
                    tiles: [
                        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap &copy; CARTO'
                }
            },
            layers: [{
                id: 'carto-light-layer',
                type: 'raster',
                source: 'carto-light',
                minzoom: 0,
                maxzoom: 19
            }]
        },
        center: [-98.5795, 39.8283], // Center of US
        zoom: 4,
        minZoom: 3,
        maxZoom: 12
    });

    // Add navigation controls
    dashboardState.jurisdictionMap.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Wait for map to load
    dashboardState.jurisdictionMap.on('load', () => {
        // Add sources and layers
        dashboardState.jurisdictionMap.addSource('h3-selected', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        dashboardState.jurisdictionMap.addSource('h3-hover', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        dashboardState.jurisdictionMap.addLayer({
            id: 'h3-selected-fill',
            type: 'fill',
            source: 'h3-selected',
            paint: {
                'fill-color': '#3b82f6',
                'fill-opacity': 0.4
            }
        });

        dashboardState.jurisdictionMap.addLayer({
            id: 'h3-selected-outline',
            type: 'line',
            source: 'h3-selected',
            paint: {
                'line-color': '#1d4ed8',
                'line-width': 2
            }
        });

        dashboardState.jurisdictionMap.addLayer({
            id: 'h3-hover-fill',
            type: 'fill',
            source: 'h3-hover',
            paint: {
                'fill-color': '#60a5fa',
                'fill-opacity': 0.3
            }
        });

        // Render existing cells
        updateJurisdictionMapLayers();

        // Fit to selection if cells exist
        if (dashboardState.jurisdictionCells.length > 0) {
            setTimeout(() => h3FitToSelection(), 500);
        }

        console.log('🗺️ Jurisdiction map initialized');
    });

    // Handle map clicks
    dashboardState.jurisdictionMap.on('click', handleJurisdictionMapClick);

    // Handle mouse move for hover
    dashboardState.jurisdictionMap.on('mousemove', handleJurisdictionMapMove);
}

/**
 * Handle map click for jurisdiction editing
 */
function handleJurisdictionMapClick(e) {
    const { lng, lat } = e.lngLat;

    try {
        const cellIndex = h3.latLngToCell(lat, lng, H3_RESOLUTION);
        const existingIndex = dashboardState.jurisdictionCells.indexOf(cellIndex);

        // Save state for undo
        dashboardState.jurisdictionHistory.push([...dashboardState.jurisdictionCells]);
        if (dashboardState.jurisdictionHistory.length > 50) {
            dashboardState.jurisdictionHistory.shift();
        }

        if (existingIndex >= 0) {
            // Deselect
            dashboardState.jurisdictionCells.splice(existingIndex, 1);
        } else {
            // Check limit
            if (dashboardState.jurisdictionCells.length >= MAX_H3_CELLS) {
                showToast(`Maximum ${MAX_H3_CELLS} cells allowed`);
                dashboardState.jurisdictionHistory.pop();
                return;
            }
            dashboardState.jurisdictionCells.push(cellIndex);
        }

        updateJurisdictionMapLayers();
        updateJurisdictionControlsUI();

    } catch (error) {
        console.error('Error processing H3 cell:', error);
    }
}

/**
 * Handle mouse move for hover preview
 */
let hoveredJurisdictionCell = null;

function handleJurisdictionMapMove(e) {
    const { lng, lat } = e.lngLat;

    try {
        const cellIndex = h3.latLngToCell(lat, lng, H3_RESOLUTION);

        if (cellIndex !== hoveredJurisdictionCell) {
            hoveredJurisdictionCell = cellIndex;
            updateJurisdictionHoverLayer();
        }
    } catch (error) {
        // Ignore errors for out-of-bounds
    }
}

/**
 * Update the selected cells layer
 */
function updateJurisdictionMapLayers() {
    if (!dashboardState.jurisdictionMap || !dashboardState.jurisdictionMap.getSource('h3-selected')) return;

    const features = dashboardState.jurisdictionCells.map(cellIndex => {
        const boundary = h3.cellToBoundary(cellIndex, true);
        return {
            type: 'Feature',
            properties: { cellIndex },
            geometry: {
                type: 'Polygon',
                coordinates: [boundary]
            }
        };
    });

    dashboardState.jurisdictionMap.getSource('h3-selected').setData({
        type: 'FeatureCollection',
        features
    });
}

/**
 * Update hover layer
 */
function updateJurisdictionHoverLayer() {
    if (!dashboardState.jurisdictionMap || !dashboardState.jurisdictionMap.getSource('h3-hover')) return;

    let features = [];

    if (hoveredJurisdictionCell && !dashboardState.jurisdictionCells.includes(hoveredJurisdictionCell)) {
        const boundary = h3.cellToBoundary(hoveredJurisdictionCell, true);
        features.push({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [boundary]
            }
        });
    }

    dashboardState.jurisdictionMap.getSource('h3-hover').setData({
        type: 'FeatureCollection',
        features
    });
}

/**
 * Update controls UI (cell count, button states)
 */
function updateJurisdictionControlsUI() {
    const cellCount = dashboardState.jurisdictionCells.length;
    const approxArea = Math.round(cellCount * 50);

    // Update count display
    const countEl = document.querySelector('.org-jurisdiction-count');
    if (countEl) {
        countEl.innerHTML = `
            Selected: <strong>${cellCount}</strong> cell${cellCount !== 1 ? 's' : ''}
            ${cellCount > 0 ? `(~${approxArea} km²)` : ''}
        `;
    }

    // Update button states
    const undoBtn = document.querySelector('[data-action="h3Undo"]');
    const clearBtn = document.querySelector('[data-action="h3Clear"]');
    const fitBtn = document.querySelector('[data-action="h3FitToSelection"]');
    const saveBtn = document.querySelector('[data-action="saveJurisdiction"]');

    if (undoBtn) undoBtn.disabled = dashboardState.jurisdictionHistory.length === 0;
    if (clearBtn) clearBtn.disabled = cellCount === 0;
    if (fitBtn) fitBtn.disabled = cellCount === 0;
    if (saveBtn) saveBtn.disabled = cellCount === 0;
}

/**
 * H3 Undo action
 */
function h3Undo() {
    if (dashboardState.jurisdictionHistory.length > 0) {
        dashboardState.jurisdictionCells = dashboardState.jurisdictionHistory.pop();
        updateJurisdictionMapLayers();
        updateJurisdictionControlsUI();
    }
}

/**
 * H3 Clear all action
 */
function h3Clear() {
    if (dashboardState.jurisdictionCells.length > 0) {
        dashboardState.jurisdictionHistory.push([...dashboardState.jurisdictionCells]);
        dashboardState.jurisdictionCells = [];
        updateJurisdictionMapLayers();
        updateJurisdictionControlsUI();
    }
}

/**
 * H3 Fit to selection action
 */
function h3FitToSelection() {
    if (!dashboardState.jurisdictionMap || dashboardState.jurisdictionCells.length === 0) return;

    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    dashboardState.jurisdictionCells.forEach(cellIndex => {
        const boundary = h3.cellToBoundary(cellIndex, true);
        boundary.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        });
    });

    dashboardState.jurisdictionMap.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 50, maxZoom: 10 }
    );
}

/**
 * Save jurisdiction changes
 */
async function saveJurisdiction() {
    if (dashboardState.jurisdictionCells.length === 0) {
        showToast('Please select at least one coverage area');
        return;
    }

    try {
        const org = dashboardState.organization;
        const response = await fetch(`${API_BASE}/organizations/${org.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                h3Cells: dashboardState.jurisdictionCells
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save jurisdiction');
        }

        // Update local state
        dashboardState.organization.h3Cells = [...dashboardState.jurisdictionCells];

        showToast('Coverage area saved successfully');
        closeJurisdictionModal();

    } catch (error) {
        console.error('Save jurisdiction failed:', error);
        showToast(error.message || 'Failed to save jurisdiction');
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
