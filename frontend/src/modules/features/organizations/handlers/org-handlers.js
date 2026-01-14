/**
 * Organization Event Handlers
 * Central event delegation for organization-related actions
 *
 * @module features/organizations/handlers/org-handlers
 */

import { showOrgProfileModal, handleModalAction } from '../components/org-profile-modal.js';
import { handleBrowserAction } from '../components/org-browser.js';
import { handleWidgetAction } from '../components/my-orgs-widget.js';
import { organizationsApi } from '../organizations-api.js';
import { showToast } from '../../../../utils/toast.js';

/**
 * Setup global event delegation for organization actions
 * Uses data-org-action attribute pattern
 */
export function setupOrgEventDelegation() {
    document.addEventListener('click', handleOrgClick);
    console.log('🏢 Organization event handlers initialized');
}

/**
 * Handle click events for organization actions
 */
async function handleOrgClick(e) {
    // Find the closest element with an org action
    const target = e.target.closest('[data-org-action]');
    if (!target) return;

    const action = target.dataset.orgAction;
    const orgId = target.dataset.orgId;
    const membershipId = target.dataset.membershipId;

    // Prevent default for buttons
    if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        e.preventDefault();
    }

    // Route to appropriate handler
    try {
        await routeAction(action, { orgId, membershipId, target });
    } catch (error) {
        console.error('❌ Organization action failed:', action, error);
        showToast(error.message || 'Action failed');
    }
}

/**
 * Route action to appropriate handler
 */
async function routeAction(action, data) {
    const { orgId, membershipId, target } = data;

    switch (action) {
        // ==================== View/Navigation Actions ====================
        case 'viewProfile':
            if (orgId) {
                await showOrgProfileModal(orgId);
            }
            break;

        case 'browseOrganizations':
            showOrganizationsBrowser();
            break;

        case 'createOrganization':
            showCreateOrgWizard();
            break;

        case 'openDashboard':
            if (orgId) {
                openOrgDashboard(orgId);
            }
            break;

        // ==================== Modal Actions ====================
        case 'closeModal':
        case 'joinOrg':
        case 'leaveOrg':
        case 'followOrg':
        case 'unfollowOrg':
            await handleModalAction(action, orgId);
            break;

        // ==================== Browser Actions ====================
        case 'search':
        case 'loadNearby':
        case 'toggleView':
        case 'retry':
        case 'prevPage':
        case 'nextPage':
            handleBrowserAction(action, data);
            break;

        // ==================== Widget Actions ====================
        case 'refreshMyOrgs':
        case 'acceptInvitation':
        case 'declineInvitation':
        case 'cancelRequest':
            await handleWidgetAction(action, { orgId, membershipId });
            break;

        // ==================== Quick Actions (from cards) ====================
        case 'follow':
            await handleQuickFollow(orgId, target);
            break;

        case 'unfollow':
            await handleQuickUnfollow(orgId, target);
            break;

        default:
            console.warn('Unknown organization action:', action);
    }
}

/**
 * Show organizations browser in civic organizing panel
 */
function showOrganizationsBrowser() {
    // Import and init browser in the organizing content area
    const organizingContent = document.getElementById('organizingContent');
    if (organizingContent) {
        import('../components/org-browser.js').then(({ initOrgBrowser }) => {
            initOrgBrowser(organizingContent);
        });
    } else {
        console.warn('⚠️ Organizing content container not found');
        showToast('Unable to show organizations browser');
    }
}

/**
 * Show create organization wizard
 * (Placeholder - will be implemented in Phase 2b)
 */
function showCreateOrgWizard() {
    showToast('Organization creation coming soon!');
    // TODO: Implement in Phase 2b
    // This will show a multi-step wizard for creating an organization
}

/**
 * Open organization dashboard
 */
function openOrgDashboard(orgId) {
    // For now, navigate to dashboard page
    // Later we can add slug-based navigation
    window.location.href = `/org-dashboard.html?id=${orgId}`;
}

/**
 * Handle quick follow action from card
 */
async function handleQuickFollow(orgId, target) {
    try {
        await organizationsApi.follow(orgId);
        showToast('Now following organization');

        // Update button state
        if (target) {
            target.textContent = 'Following';
            target.dataset.orgAction = 'unfollow';
        }

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('orgFollowChanged', {
            detail: { orgId, isFollowing: true }
        }));
    } catch (error) {
        console.error('❌ Failed to follow organization:', error);
        showToast(error.message || 'Failed to follow organization');
    }
}

/**
 * Handle quick unfollow action from card
 */
async function handleQuickUnfollow(orgId, target) {
    try {
        await organizationsApi.unfollow(orgId);
        showToast('Unfollowed organization');

        // Update button state
        if (target) {
            target.textContent = 'Follow';
            target.dataset.orgAction = 'follow';
        }

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('orgFollowChanged', {
            detail: { orgId, isFollowing: false }
        }));
    } catch (error) {
        console.error('❌ Failed to unfollow organization:', error);
        showToast(error.message || 'Failed to unfollow organization');
    }
}

/**
 * Listen for auth state changes to refresh org-related UI
 */
export function setupAuthStateListener() {
    window.addEventListener('userLoggedIn', () => {
        // Refresh my orgs widget if visible
        import('../components/my-orgs-widget.js').then(({ refreshMyOrgsWidget }) => {
            refreshMyOrgsWidget();
        });
    });

    window.addEventListener('userLoggedOut', () => {
        // Clear any org-related state
        import('../components/org-browser.js').then(({ resetBrowserState }) => {
            resetBrowserState();
        });
    });
}

export default {
    setupOrgEventDelegation,
    setupAuthStateListener
};
