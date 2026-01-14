/**
 * My Organizations Widget
 * Shows user's organization memberships and pending invitations
 *
 * @module features/organizations/components/my-orgs-widget
 */

import { organizationsApi } from '../organizations-api.js';
import { showToast } from '../../../../utils/toast.js';

/**
 * Widget state
 */
let widgetState = {
    memberships: [],
    headedOrg: null,
    loading: false,
    error: null
};

/**
 * Initialize the my organizations widget
 * @param {HTMLElement} container - Container element to render into
 */
export async function initMyOrgsWidget(container) {
    if (!container) {
        console.error('❌ My orgs widget container not found');
        return;
    }

    if (!window.currentUser) {
        container.innerHTML = `
            <div class="my-orgs-widget my-orgs-widget-logged-out">
                <p>Log in to see your organizations</p>
            </div>
        `;
        return;
    }

    widgetState.loading = true;
    renderWidget(container);

    try {
        // Load user's memberships and headed org in parallel
        const [membershipsResponse, headedOrgResponse] = await Promise.all([
            organizationsApi.getMyMemberships(),
            organizationsApi.getMyHeadedOrg().catch(() => null)
        ]);

        widgetState.memberships = membershipsResponse.memberships || [];
        widgetState.headedOrg = headedOrgResponse;
        widgetState.loading = false;
        widgetState.error = null;

    } catch (error) {
        console.error('❌ Failed to load user organizations:', error);
        widgetState.loading = false;
        widgetState.error = error.message || 'Failed to load organizations';
    }

    renderWidget(container);
}

/**
 * Render the widget
 */
function renderWidget(container) {
    if (widgetState.loading) {
        container.innerHTML = `
            <div class="my-orgs-widget my-orgs-widget-loading">
                <div class="loading-spinner-small"></div>
                <span>Loading your organizations...</span>
            </div>
        `;
        return;
    }

    if (widgetState.error) {
        container.innerHTML = `
            <div class="my-orgs-widget my-orgs-widget-error">
                <p>⚠️ ${escapeHtml(widgetState.error)}</p>
                <button class="my-orgs-btn" data-org-action="refreshMyOrgs">Try Again</button>
            </div>
        `;
        return;
    }

    const activeMemberships = widgetState.memberships.filter(m => m.status === 'ACTIVE');
    const pendingInvitations = widgetState.memberships.filter(m => m.status === 'PENDING' && m.invitedBy);
    const pendingRequests = widgetState.memberships.filter(m => m.status === 'PENDING' && !m.invitedBy);

    const hasContent = activeMemberships.length > 0 || pendingInvitations.length > 0 || widgetState.headedOrg;

    if (!hasContent) {
        container.innerHTML = `
            <div class="my-orgs-widget my-orgs-widget-empty">
                <h3>My Organizations</h3>
                <p>You're not a member of any organizations yet.</p>
                <button
                    class="my-orgs-btn my-orgs-btn-primary"
                    data-org-action="browseOrganizations"
                >
                    Browse Organizations
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="my-orgs-widget">
            <div class="my-orgs-header">
                <h3>My Organizations</h3>
                <button
                    class="my-orgs-btn my-orgs-btn-small"
                    data-org-action="browseOrganizations"
                    title="Browse Organizations"
                >
                    +
                </button>
            </div>

            ${widgetState.headedOrg ? `
                <div class="my-orgs-section">
                    <h4 class="my-orgs-section-title">Leading</h4>
                    ${renderOrgItem(widgetState.headedOrg, { isHead: true })}
                </div>
            ` : ''}

            ${pendingInvitations.length > 0 ? `
                <div class="my-orgs-section">
                    <h4 class="my-orgs-section-title">Pending Invitations</h4>
                    ${pendingInvitations.map(m => renderInvitationItem(m)).join('')}
                </div>
            ` : ''}

            ${activeMemberships.length > 0 ? `
                <div class="my-orgs-section">
                    <h4 class="my-orgs-section-title">Memberships</h4>
                    ${activeMemberships.map(m => renderMembershipItem(m)).join('')}
                </div>
            ` : ''}

            ${pendingRequests.length > 0 ? `
                <div class="my-orgs-section">
                    <h4 class="my-orgs-section-title">Pending Requests</h4>
                    ${pendingRequests.map(m => renderPendingRequestItem(m)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render an organization item (for headed org)
 */
function renderOrgItem(org, options = {}) {
    const { isHead = false } = options;
    return `
        <div class="my-orgs-item" data-org-id="${org.id}">
            <div class="my-orgs-item-avatar">
                ${org.logoUrl
                    ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" />`
                    : `<div class="avatar-placeholder">${getInitials(org.name)}</div>`
                }
            </div>
            <div class="my-orgs-item-info">
                <span class="my-orgs-item-name">${escapeHtml(org.name)}</span>
                ${isHead ? `<span class="my-orgs-item-badge badge-head">Head</span>` : ''}
            </div>
            <button
                class="my-orgs-item-action"
                data-org-action="viewProfile"
                data-org-id="${org.id}"
                title="View"
            >
                →
            </button>
        </div>
    `;
}

/**
 * Render a membership item
 */
function renderMembershipItem(membership) {
    const org = membership.organization;
    return `
        <div class="my-orgs-item" data-org-id="${org.id}" data-membership-id="${membership.id}">
            <div class="my-orgs-item-avatar">
                ${org.logoUrl
                    ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" />`
                    : `<div class="avatar-placeholder">${getInitials(org.name)}</div>`
                }
            </div>
            <div class="my-orgs-item-info">
                <span class="my-orgs-item-name">${escapeHtml(org.name)}</span>
                ${membership.role ? `
                    <span class="my-orgs-item-role">${escapeHtml(membership.role.name)}</span>
                ` : ''}
            </div>
            <button
                class="my-orgs-item-action"
                data-org-action="viewProfile"
                data-org-id="${org.id}"
                title="View"
            >
                →
            </button>
        </div>
    `;
}

/**
 * Render a pending invitation item
 */
function renderInvitationItem(membership) {
    const org = membership.organization;
    return `
        <div class="my-orgs-item my-orgs-item-invitation" data-org-id="${org.id}" data-membership-id="${membership.id}">
            <div class="my-orgs-item-avatar">
                ${org.logoUrl
                    ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" />`
                    : `<div class="avatar-placeholder">${getInitials(org.name)}</div>`
                }
            </div>
            <div class="my-orgs-item-info">
                <span class="my-orgs-item-name">${escapeHtml(org.name)}</span>
                <span class="my-orgs-item-meta">Invited to join</span>
            </div>
            <div class="my-orgs-item-actions">
                <button
                    class="my-orgs-btn my-orgs-btn-accept"
                    data-org-action="acceptInvitation"
                    data-org-id="${org.id}"
                    data-membership-id="${membership.id}"
                    title="Accept"
                >
                    ✓
                </button>
                <button
                    class="my-orgs-btn my-orgs-btn-decline"
                    data-org-action="declineInvitation"
                    data-org-id="${org.id}"
                    data-membership-id="${membership.id}"
                    title="Decline"
                >
                    ✕
                </button>
            </div>
        </div>
    `;
}

/**
 * Render a pending request item
 */
function renderPendingRequestItem(membership) {
    const org = membership.organization;
    return `
        <div class="my-orgs-item my-orgs-item-pending" data-org-id="${org.id}" data-membership-id="${membership.id}">
            <div class="my-orgs-item-avatar">
                ${org.logoUrl
                    ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" />`
                    : `<div class="avatar-placeholder">${getInitials(org.name)}</div>`
                }
            </div>
            <div class="my-orgs-item-info">
                <span class="my-orgs-item-name">${escapeHtml(org.name)}</span>
                <span class="my-orgs-item-status">Request pending</span>
            </div>
            <button
                class="my-orgs-btn my-orgs-btn-cancel"
                data-org-action="cancelRequest"
                data-org-id="${org.id}"
                data-membership-id="${membership.id}"
                title="Cancel request"
            >
                ✕
            </button>
        </div>
    `;
}

/**
 * Handle widget actions
 */
export async function handleWidgetAction(action, data = {}) {
    switch (action) {
        case 'refreshMyOrgs':
            const container = document.querySelector('.my-orgs-widget')?.parentElement;
            if (container) {
                await initMyOrgsWidget(container);
            }
            break;

        case 'acceptInvitation':
            await handleAcceptInvitation(data.orgId, data.membershipId);
            break;

        case 'declineInvitation':
            await handleDeclineInvitation(data.orgId, data.membershipId);
            break;

        case 'cancelRequest':
            await handleCancelRequest(data.orgId, data.membershipId);
            break;

        default:
            console.warn('Unknown widget action:', action);
    }
}

/**
 * Handle accepting an invitation
 */
async function handleAcceptInvitation(orgId, membershipId) {
    try {
        await organizationsApi.approveMember(orgId, membershipId);
        showToast('Invitation accepted!');
        // Refresh widget
        const container = document.querySelector('.my-orgs-widget')?.parentElement;
        if (container) {
            await initMyOrgsWidget(container);
        }
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('orgMembershipChanged', { detail: { orgId } }));
    } catch (error) {
        console.error('❌ Failed to accept invitation:', error);
        showToast(error.message || 'Failed to accept invitation');
    }
}

/**
 * Handle declining an invitation
 */
async function handleDeclineInvitation(orgId, membershipId) {
    if (!confirm('Decline this invitation?')) return;

    try {
        await organizationsApi.leave(orgId);
        showToast('Invitation declined');
        // Refresh widget
        const container = document.querySelector('.my-orgs-widget')?.parentElement;
        if (container) {
            await initMyOrgsWidget(container);
        }
    } catch (error) {
        console.error('❌ Failed to decline invitation:', error);
        showToast(error.message || 'Failed to decline invitation');
    }
}

/**
 * Handle canceling a join request
 */
async function handleCancelRequest(orgId, membershipId) {
    if (!confirm('Cancel your join request?')) return;

    try {
        await organizationsApi.leave(orgId);
        showToast('Request cancelled');
        // Refresh widget
        const container = document.querySelector('.my-orgs-widget')?.parentElement;
        if (container) {
            await initMyOrgsWidget(container);
        }
    } catch (error) {
        console.error('❌ Failed to cancel request:', error);
        showToast(error.message || 'Failed to cancel request');
    }
}

/**
 * Refresh widget data
 */
export async function refreshMyOrgsWidget() {
    const container = document.querySelector('.my-orgs-widget')?.parentElement;
    if (container) {
        await initMyOrgsWidget(container);
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

export default {
    initMyOrgsWidget,
    handleWidgetAction,
    refreshMyOrgsWidget
};
