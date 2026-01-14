/**
 * Organization Browser Component
 * Browse and search organizations with filters
 *
 * @module features/organizations/components/org-browser
 */

import { organizationsApi } from '../organizations-api.js';
import { renderOrgGrid, ORG_TYPE_LABELS, JURISDICTION_LABELS } from './org-card.js';
import { showToast } from '../../../utils/toast.js';

/**
 * Browser state
 */
let browserState = {
    organizations: [],
    loading: false,
    error: null,
    filters: {
        search: '',
        type: '',
        jurisdictionType: '',
        isVerified: null
    },
    pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0
    },
    userMemberships: new Map(),
    viewMode: 'grid' // 'grid' or 'list'
};

/**
 * Initialize the organization browser
 * @param {HTMLElement} container - Container element to render into
 */
export async function initOrgBrowser(container) {
    if (!container) {
        console.error('❌ Organization browser container not found');
        return;
    }

    // Load user memberships if logged in
    if (window.currentUser) {
        await loadUserMemberships();
    }

    // Render browser UI
    renderBrowser(container);

    // Load initial data
    await loadOrganizations();
}

/**
 * Load user's organization memberships
 */
async function loadUserMemberships() {
    try {
        const response = await organizationsApi.getMyMemberships();
        browserState.userMemberships.clear();
        if (response.memberships) {
            response.memberships.forEach(m => {
                browserState.userMemberships.set(m.organizationId, m);
            });
        }
    } catch (error) {
        console.warn('⚠️ Failed to load user memberships:', error);
    }
}

/**
 * Load organizations with current filters
 */
async function loadOrganizations() {
    browserState.loading = true;
    browserState.error = null;
    updateBrowserContent();

    try {
        const params = {
            page: browserState.pagination.page,
            limit: browserState.pagination.limit
        };

        // Add filters
        if (browserState.filters.search) {
            params.search = browserState.filters.search;
        }
        if (browserState.filters.type) {
            params.type = browserState.filters.type;
        }
        if (browserState.filters.jurisdictionType) {
            params.jurisdictionType = browserState.filters.jurisdictionType;
        }
        if (browserState.filters.isVerified !== null) {
            params.isVerified = browserState.filters.isVerified;
        }

        const response = await organizationsApi.list(params);

        browserState.organizations = response.organizations || [];
        browserState.pagination = {
            ...browserState.pagination,
            total: response.pagination?.total || 0,
            totalPages: response.pagination?.totalPages || 1
        };
        browserState.loading = false;
        browserState.error = null;

    } catch (error) {
        console.error('❌ Failed to load organizations:', error);
        browserState.loading = false;
        browserState.error = error.message || 'Failed to load organizations';
    }

    updateBrowserContent();
}

/**
 * Load nearby organizations based on user's location
 */
export async function loadNearbyOrganizations() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser');
        return;
    }

    browserState.loading = true;
    updateBrowserContent();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const response = await organizationsApi.getNearby(
                    position.coords.latitude,
                    position.coords.longitude,
                    50 // 50km radius
                );

                browserState.organizations = response.organizations || [];
                browserState.loading = false;
                updateBrowserContent();

            } catch (error) {
                console.error('❌ Failed to load nearby organizations:', error);
                browserState.loading = false;
                browserState.error = error.message;
                updateBrowserContent();
            }
        },
        (error) => {
            console.error('❌ Geolocation error:', error);
            browserState.loading = false;
            browserState.error = 'Unable to get your location';
            updateBrowserContent();
            showToast('Unable to get your location');
        }
    );
}

/**
 * Render the browser UI
 */
function renderBrowser(container) {
    container.innerHTML = `
        <div class="org-browser">
            <div class="org-browser-header">
                <h2 class="org-browser-title">Organizations</h2>
                ${window.currentUser ? `
                    <button
                        class="org-browser-btn org-browser-btn-primary"
                        data-org-action="createOrganization"
                    >
                        + Create Organization
                    </button>
                ` : ''}
            </div>

            <div class="org-browser-toolbar">
                <div class="org-browser-search">
                    <input
                        type="text"
                        id="orgSearchInput"
                        placeholder="Search organizations..."
                        class="org-search-input"
                        value="${browserState.filters.search}"
                    />
                    <button
                        class="org-search-btn"
                        data-org-action="search"
                        title="Search"
                    >
                        🔍
                    </button>
                </div>

                <div class="org-browser-filters">
                    <select id="orgTypeFilter" class="org-filter-select">
                        <option value="">All Types</option>
                        ${Object.entries(ORG_TYPE_LABELS).map(([value, label]) =>
                            `<option value="${value}" ${browserState.filters.type === value ? 'selected' : ''}>${label}</option>`
                        ).join('')}
                    </select>

                    <select id="orgJurisdictionFilter" class="org-filter-select">
                        <option value="">All Jurisdictions</option>
                        ${Object.entries(JURISDICTION_LABELS).map(([value, label]) =>
                            `<option value="${value}" ${browserState.filters.jurisdictionType === value ? 'selected' : ''}>${label}</option>`
                        ).join('')}
                    </select>

                    <label class="org-filter-checkbox">
                        <input
                            type="checkbox"
                            id="orgVerifiedFilter"
                            ${browserState.filters.isVerified === true ? 'checked' : ''}
                        />
                        Verified Only
                    </label>
                </div>

                <div class="org-browser-actions">
                    <button
                        class="org-browser-btn org-browser-btn-secondary"
                        data-org-action="loadNearby"
                        title="Find Nearby"
                    >
                        📍 Nearby
                    </button>
                    <button
                        class="org-browser-btn org-browser-btn-icon"
                        data-org-action="toggleView"
                        title="Toggle View"
                    >
                        ${browserState.viewMode === 'grid' ? '☰' : '⊞'}
                    </button>
                </div>
            </div>

            <div id="orgBrowserContent" class="org-browser-content">
                <!-- Content loaded dynamically -->
            </div>

            <div id="orgBrowserPagination" class="org-browser-pagination">
                <!-- Pagination loaded dynamically -->
            </div>
        </div>
    `;

    // Attach event listeners
    attachBrowserEventListeners(container);
}

/**
 * Update only the content area (not the whole browser)
 */
function updateBrowserContent() {
    const contentEl = document.getElementById('orgBrowserContent');
    const paginationEl = document.getElementById('orgBrowserPagination');

    if (!contentEl) return;

    if (browserState.loading) {
        contentEl.innerHTML = `
            <div class="org-browser-loading">
                <div class="loading-spinner"></div>
                <p>Loading organizations...</p>
            </div>
        `;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    if (browserState.error) {
        contentEl.innerHTML = `
            <div class="org-browser-error">
                <p>⚠️ ${browserState.error}</p>
                <button class="org-browser-btn" data-org-action="retry">Try Again</button>
            </div>
        `;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    if (browserState.organizations.length === 0) {
        contentEl.innerHTML = `
            <div class="org-browser-empty">
                <p>No organizations found</p>
                <p class="org-browser-empty-hint">Try adjusting your filters or search terms</p>
            </div>
        `;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    // Render organizations
    contentEl.innerHTML = renderOrgGrid(browserState.organizations, {
        memberships: browserState.userMemberships
    });

    // Render pagination
    if (paginationEl) {
        paginationEl.innerHTML = renderPagination();
    }
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const { page, totalPages, total } = browserState.pagination;

    if (totalPages <= 1) return '';

    return `
        <div class="pagination-info">
            Showing ${browserState.organizations.length} of ${total} organizations
        </div>
        <div class="pagination-controls">
            <button
                class="pagination-btn"
                data-org-action="prevPage"
                ${page <= 1 ? 'disabled' : ''}
            >
                ← Previous
            </button>
            <span class="pagination-current">
                Page ${page} of ${totalPages}
            </span>
            <button
                class="pagination-btn"
                data-org-action="nextPage"
                ${page >= totalPages ? 'disabled' : ''}
            >
                Next →
            </button>
        </div>
    `;
}

/**
 * Attach event listeners for the browser
 */
function attachBrowserEventListeners(container) {
    // Search input - debounced
    const searchInput = container.querySelector('#orgSearchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                browserState.filters.search = e.target.value.trim();
                browserState.pagination.page = 1;
                loadOrganizations();
            }, 300);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                browserState.filters.search = e.target.value.trim();
                browserState.pagination.page = 1;
                loadOrganizations();
            }
        });
    }

    // Type filter
    const typeFilter = container.querySelector('#orgTypeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            browserState.filters.type = e.target.value;
            browserState.pagination.page = 1;
            loadOrganizations();
        });
    }

    // Jurisdiction filter
    const jurisdictionFilter = container.querySelector('#orgJurisdictionFilter');
    if (jurisdictionFilter) {
        jurisdictionFilter.addEventListener('change', (e) => {
            browserState.filters.jurisdictionType = e.target.value;
            browserState.pagination.page = 1;
            loadOrganizations();
        });
    }

    // Verified filter
    const verifiedFilter = container.querySelector('#orgVerifiedFilter');
    if (verifiedFilter) {
        verifiedFilter.addEventListener('change', (e) => {
            browserState.filters.isVerified = e.target.checked ? true : null;
            browserState.pagination.page = 1;
            loadOrganizations();
        });
    }
}

/**
 * Handle browser actions (called from event delegation)
 */
export function handleBrowserAction(action, data = {}) {
    switch (action) {
        case 'search':
            const searchInput = document.getElementById('orgSearchInput');
            if (searchInput) {
                browserState.filters.search = searchInput.value.trim();
                browserState.pagination.page = 1;
                loadOrganizations();
            }
            break;

        case 'loadNearby':
            loadNearbyOrganizations();
            break;

        case 'toggleView':
            browserState.viewMode = browserState.viewMode === 'grid' ? 'list' : 'grid';
            updateBrowserContent();
            break;

        case 'retry':
            loadOrganizations();
            break;

        case 'prevPage':
            if (browserState.pagination.page > 1) {
                browserState.pagination.page--;
                loadOrganizations();
            }
            break;

        case 'nextPage':
            if (browserState.pagination.page < browserState.pagination.totalPages) {
                browserState.pagination.page++;
                loadOrganizations();
            }
            break;

        default:
            console.warn('Unknown browser action:', action);
    }
}

/**
 * Reset browser state
 */
export function resetBrowserState() {
    browserState = {
        organizations: [],
        loading: false,
        error: null,
        filters: {
            search: '',
            type: '',
            jurisdictionType: '',
            isVerified: null
        },
        pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0
        },
        userMemberships: new Map(),
        viewMode: 'grid'
    };
}

export default {
    initOrgBrowser,
    loadNearbyOrganizations,
    handleBrowserAction,
    resetBrowserState
};
