/**
 * Organizations Module
 * Main entry point for organization-related features
 *
 * Features:
 * - Organization browsing and discovery
 * - Organization profile viewing
 * - Membership management (join, leave, follow)
 * - My organizations widget
 *
 * @module features/organizations
 */

// API
export { organizationsApi } from './organizations-api.js';

// Components
export { renderOrgCard, renderOrgGrid, renderOrgList, ORG_TYPE_LABELS, JURISDICTION_LABELS } from './components/org-card.js';
export { initOrgBrowser, loadNearbyOrganizations, handleBrowserAction, resetBrowserState } from './components/org-browser.js';
export { showOrgProfileModal, closeOrgProfileModal, handleModalAction } from './components/org-profile-modal.js';
export { initMyOrgsWidget, handleWidgetAction, refreshMyOrgsWidget } from './components/my-orgs-widget.js';

// Handlers
export { setupOrgEventDelegation, setupAuthStateListener } from './handlers/org-handlers.js';

/**
 * Initialize the organizations module
 * Call this once when the app loads
 */
export function initOrganizationsModule() {
    // Import and setup event delegation
    import('./handlers/org-handlers.js').then(({ setupOrgEventDelegation, setupAuthStateListener }) => {
        setupOrgEventDelegation();
        setupAuthStateListener();
        console.log('🏢 Organizations module initialized');
    });
}

/**
 * Show organizations in a container (convenience function)
 * @param {HTMLElement} container - Container to render into
 * @param {Object} options - Options
 * @param {string} [options.view='browser'] - View type: 'browser', 'widget'
 */
export async function showOrganizations(container, options = {}) {
    const { view = 'browser' } = options;

    if (view === 'widget') {
        const { initMyOrgsWidget } = await import('./components/my-orgs-widget.js');
        await initMyOrgsWidget(container);
    } else {
        const { initOrgBrowser } = await import('./components/org-browser.js');
        await initOrgBrowser(container);
    }
}

/**
 * Open organization profile by ID or slug
 * @param {string} identifier - Organization ID or slug
 */
export async function openOrgProfile(identifier) {
    const { showOrgProfileModal } = await import('./components/org-profile-modal.js');

    // Check if it's a UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (isUuid) {
        await showOrgProfileModal(identifier);
    } else {
        // Fetch by slug first to get ID
        const { organizationsApi } = await import('./organizations-api.js');
        try {
            const org = await organizationsApi.getBySlug(identifier);
            await showOrgProfileModal(org.id);
        } catch (error) {
            console.error('❌ Organization not found:', identifier);
            const { showToast } = await import('../../utils/toast.js');
            showToast('Organization not found');
        }
    }
}

// Auto-initialize when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrganizationsModule);
} else {
    initOrganizationsModule();
}

export default {
    initOrganizationsModule,
    showOrganizations,
    openOrgProfile
};
