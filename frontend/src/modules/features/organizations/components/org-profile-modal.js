/**
 * Organization Profile Modal Component
 * Displays detailed organization information in a modal overlay
 *
 * @module features/organizations/components/org-profile-modal
 */

import { organizationsApi } from '../organizations-api.js';
import { showToast } from '../../../../utils/toast.js';
import { ORG_TYPE_LABELS, JURISDICTION_LABELS } from './org-card.js';

/**
 * Modal state
 */
let modalState = {
    organization: null,
    membership: null,
    loading: false,
    error: null
};

/**
 * Show organization profile modal
 * @param {string} orgId - Organization ID
 */
export async function showOrgProfileModal(orgId) {
    modalState.loading = true;
    modalState.error = null;
    modalState.organization = null;
    modalState.membership = null;

    // Create and show modal container
    let modalContainer = document.getElementById('orgProfileModal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'orgProfileModal';
        modalContainer.className = 'org-modal-overlay';
        document.body.appendChild(modalContainer);
    }

    renderModal(modalContainer);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    try {
        // Load organization data
        const org = await organizationsApi.getById(orgId);
        modalState.organization = org;

        // Check user's membership if logged in
        if (window.currentUser) {
            try {
                const membershipsResponse = await organizationsApi.getMyMemberships();
                const membership = membershipsResponse.memberships?.find(
                    m => m.organizationId === orgId
                );
                modalState.membership = membership || null;
            } catch (e) {
                console.warn('⚠️ Failed to check membership:', e);
            }
        }

        modalState.loading = false;
        renderModal(modalContainer);

    } catch (error) {
        console.error('❌ Failed to load organization:', error);
        modalState.loading = false;
        modalState.error = error.message || 'Failed to load organization';
        renderModal(modalContainer);
    }
}

/**
 * Close the organization profile modal
 */
export function closeOrgProfileModal() {
    const modalContainer = document.getElementById('orgProfileModal');
    if (modalContainer) {
        modalContainer.remove();
    }
    document.body.style.overflow = '';
    modalState = {
        organization: null,
        membership: null,
        loading: false,
        error: null
    };
}

/**
 * Render the modal content
 */
function renderModal(container) {
    if (modalState.loading) {
        container.innerHTML = `
            <div class="org-modal">
                <div class="org-modal-content">
                    <div class="org-modal-loading">
                        <div class="loading-spinner"></div>
                        <p>Loading organization...</p>
                    </div>
                </div>
            </div>
        `;
        attachModalEventListeners(container);
        return;
    }

    if (modalState.error) {
        container.innerHTML = `
            <div class="org-modal">
                <div class="org-modal-content">
                    <div class="org-modal-header">
                        <h2>Error</h2>
                        <button class="org-modal-close" data-org-action="closeModal">✕</button>
                    </div>
                    <div class="org-modal-body">
                        <div class="org-modal-error">
                            <p>⚠️ ${escapeHtml(modalState.error)}</p>
                            <button class="org-modal-btn" data-org-action="closeModal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        attachModalEventListeners(container);
        return;
    }

    const org = modalState.organization;
    if (!org) return;

    const typeLabel = ORG_TYPE_LABELS[org.type] || org.type;
    const jurisdictionLabel = org.jurisdictionType
        ? `${JURISDICTION_LABELS[org.jurisdictionType] || org.jurisdictionType}${org.jurisdictionState ? ` - ${org.jurisdictionState}` : ''}`
        : 'Not specified';

    const memberCount = org._count?.members || org.memberCount || 0;
    const followerCount = org._count?.followers || org.followerCount || 0;
    const isVerified = org.verificationStatus === 'APPROVED';
    const isFollowing = org.isFollowing || false;
    const isMember = modalState.membership?.status === 'ACTIVE';
    const isPending = modalState.membership?.status === 'PENDING';
    const isHead = org.headUserId === window.currentUser?.id;

    container.innerHTML = `
        <div class="org-modal" data-org-id="${org.id}">
            <div class="org-modal-content">
                <div class="org-modal-header">
                    <div class="org-modal-header-info">
                        <div class="org-modal-avatar">
                            ${org.logoUrl
                                ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" class="org-logo-large" />`
                                : `<div class="org-logo-placeholder-large">${getInitials(org.name)}</div>`
                            }
                        </div>
                        <div class="org-modal-title-area">
                            <h2 class="org-modal-name">
                                ${escapeHtml(org.name)}
                                ${isVerified ? '<span class="verified-badge-large" title="Verified Organization">✓</span>' : ''}
                            </h2>
                            <span class="org-modal-type">${typeLabel}</span>
                        </div>
                    </div>
                    <button class="org-modal-close" data-org-action="closeModal">✕</button>
                </div>

                <div class="org-modal-body">
                    ${org.description ? `
                        <div class="org-modal-section">
                            <h3>About</h3>
                            <p class="org-modal-description">${escapeHtml(org.description)}</p>
                        </div>
                    ` : ''}

                    <div class="org-modal-section">
                        <h3>Details</h3>
                        <div class="org-modal-details">
                            <div class="org-detail-item">
                                <span class="org-detail-label">Jurisdiction</span>
                                <span class="org-detail-value">${jurisdictionLabel}</span>
                            </div>
                            <div class="org-detail-item">
                                <span class="org-detail-label">Members</span>
                                <span class="org-detail-value">${memberCount}</span>
                            </div>
                            <div class="org-detail-item">
                                <span class="org-detail-label">Followers</span>
                                <span class="org-detail-value">${followerCount}</span>
                            </div>
                            ${org.website ? `
                                <div class="org-detail-item">
                                    <span class="org-detail-label">Website</span>
                                    <a href="${escapeHtml(org.website)}" target="_blank" rel="noopener noreferrer" class="org-detail-link">
                                        ${escapeHtml(org.website)}
                                    </a>
                                </div>
                            ` : ''}
                            ${org.contactEmail ? `
                                <div class="org-detail-item">
                                    <span class="org-detail-label">Contact</span>
                                    <a href="mailto:${escapeHtml(org.contactEmail)}" class="org-detail-link">
                                        ${escapeHtml(org.contactEmail)}
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${isMember || isHead ? `
                        <div class="org-modal-section org-modal-membership">
                            <h3>Your Membership</h3>
                            <div class="org-membership-status">
                                ${isHead ? `
                                    <span class="org-badge org-badge-head">Head</span>
                                    <p>You lead this organization</p>
                                ` : `
                                    <span class="org-badge org-badge-member">Member</span>
                                    ${modalState.membership?.role ? `
                                        <p>Role: ${escapeHtml(modalState.membership.role.name)}</p>
                                    ` : ''}
                                `}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="org-modal-footer">
                    ${!window.currentUser ? `
                        <p class="org-modal-login-hint">Log in to join or follow organizations</p>
                    ` : isHead ? `
                        <button
                            class="org-modal-btn org-modal-btn-primary"
                            data-org-action="openDashboard"
                            data-org-id="${org.id}"
                        >
                            Manage Organization
                        </button>
                    ` : isMember ? `
                        <button
                            class="org-modal-btn org-modal-btn-primary"
                            data-org-action="openDashboard"
                            data-org-id="${org.id}"
                        >
                            View Dashboard
                        </button>
                        <button
                            class="org-modal-btn org-modal-btn-danger"
                            data-org-action="leaveOrg"
                            data-org-id="${org.id}"
                        >
                            Leave
                        </button>
                    ` : isPending ? `
                        <button class="org-modal-btn" disabled>
                            Request Pending
                        </button>
                        <button
                            class="org-modal-btn org-modal-btn-secondary"
                            data-org-action="${isFollowing ? 'unfollowOrg' : 'followOrg'}"
                            data-org-id="${org.id}"
                        >
                            ${isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                    ` : `
                        <button
                            class="org-modal-btn org-modal-btn-primary"
                            data-org-action="joinOrg"
                            data-org-id="${org.id}"
                        >
                            Request to Join
                        </button>
                        <button
                            class="org-modal-btn org-modal-btn-secondary"
                            data-org-action="${isFollowing ? 'unfollowOrg' : 'followOrg'}"
                            data-org-id="${org.id}"
                        >
                            ${isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;

    attachModalEventListeners(container);
}

/**
 * Attach event listeners for modal
 */
function attachModalEventListeners(container) {
    // Close on overlay click
    container.addEventListener('click', (e) => {
        if (e.target === container || e.target.classList.contains('org-modal')) {
            closeOrgProfileModal();
        }
    });

    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeOrgProfileModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Handle modal actions
 */
export async function handleModalAction(action, orgId) {
    switch (action) {
        case 'closeModal':
            closeOrgProfileModal();
            break;

        case 'joinOrg':
            await handleJoinOrg(orgId);
            break;

        case 'leaveOrg':
            await handleLeaveOrg(orgId);
            break;

        case 'followOrg':
            await handleFollowOrg(orgId);
            break;

        case 'unfollowOrg':
            await handleUnfollowOrg(orgId);
            break;

        case 'openDashboard':
            openOrgDashboard(orgId);
            break;

        default:
            console.warn('Unknown modal action:', action);
    }
}

/**
 * Handle join organization request
 */
async function handleJoinOrg(orgId) {
    try {
        await organizationsApi.requestJoin(orgId);
        showToast('Join request sent!');
        // Refresh modal to show pending status
        await showOrgProfileModal(orgId);
    } catch (error) {
        console.error('❌ Failed to join organization:', error);
        showToast(error.message || 'Failed to send join request');
    }
}

/**
 * Handle leave organization
 */
async function handleLeaveOrg(orgId) {
    if (!confirm('Are you sure you want to leave this organization?')) {
        return;
    }

    try {
        await organizationsApi.leave(orgId);
        showToast('You have left the organization');
        closeOrgProfileModal();
        // Dispatch event for other components to update
        window.dispatchEvent(new CustomEvent('orgMembershipChanged', { detail: { orgId } }));
    } catch (error) {
        console.error('❌ Failed to leave organization:', error);
        showToast(error.message || 'Failed to leave organization');
    }
}

/**
 * Handle follow organization
 */
async function handleFollowOrg(orgId) {
    try {
        await organizationsApi.follow(orgId);
        showToast('Now following organization');
        // Update modal
        if (modalState.organization) {
            modalState.organization.isFollowing = true;
            const container = document.getElementById('orgProfileModal');
            if (container) renderModal(container);
        }
    } catch (error) {
        console.error('❌ Failed to follow organization:', error);
        showToast(error.message || 'Failed to follow organization');
    }
}

/**
 * Handle unfollow organization
 */
async function handleUnfollowOrg(orgId) {
    try {
        await organizationsApi.unfollow(orgId);
        showToast('Unfollowed organization');
        // Update modal
        if (modalState.organization) {
            modalState.organization.isFollowing = false;
            const container = document.getElementById('orgProfileModal');
            if (container) renderModal(container);
        }
    } catch (error) {
        console.error('❌ Failed to unfollow organization:', error);
        showToast(error.message || 'Failed to unfollow organization');
    }
}

/**
 * Open organization dashboard
 */
function openOrgDashboard(orgId) {
    // For now, open in same tab. Later we can change to new tab if preferred.
    const org = modalState.organization;
    const urlParam = org?.slug ? `org=${org.slug}` : `id=${orgId}`;
    window.location.href = `/org-dashboard.html?${urlParam}`;
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
    showOrgProfileModal,
    closeOrgProfileModal,
    handleModalAction
};
