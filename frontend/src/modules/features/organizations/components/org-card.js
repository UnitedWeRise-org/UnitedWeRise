/**
 * Organization Card Component
 * Displays organization info in a card format for browse/search results
 *
 * @module features/organizations/components/org-card
 */

/**
 * Organization type labels for display
 */
export const ORG_TYPE_LABELS = {
    POLITICAL_PARTY: 'Political Party',
    ADVOCACY_ORG: 'Advocacy Organization',
    LABOR_UNION: 'Labor Union',
    COMMUNITY_ORG: 'Community Organization',
    GOVERNMENT_OFFICE: 'Government Office',
    CAMPAIGN: 'Campaign',
    PAC_SUPERPAC: 'PAC/Super PAC',
    OTHER: 'Organization'
};

/**
 * Jurisdiction type labels for display
 */
export const JURISDICTION_LABELS = {
    NATIONAL: 'National',
    STATE: 'State',
    COUNTY: 'County',
    CITY: 'City',
    CUSTOM: 'Custom Area'
};

/**
 * Render an organization card
 * @param {Object} org - Organization data
 * @param {Object} [options] - Render options
 * @param {boolean} [options.showActions=true] - Show action buttons
 * @param {boolean} [options.compact=false] - Use compact layout
 * @param {Object} [options.membership] - User's membership in this org (if any)
 * @returns {string} HTML string
 */
export function renderOrgCard(org, options = {}) {
    const { showActions = true, compact = false, membership = null } = options;

    const typeLabel = ORG_TYPE_LABELS[org.type] || org.type;
    const jurisdictionLabel = org.jurisdictionType
        ? `${JURISDICTION_LABELS[org.jurisdictionType] || org.jurisdictionType}${org.jurisdictionState ? ` - ${org.jurisdictionState}` : ''}`
        : null;

    const memberCount = org._count?.members || org.memberCount || 0;
    const isVerified = org.verificationStatus === 'APPROVED';
    const isFollowing = org.isFollowing || false;
    const isMember = membership?.status === 'ACTIVE';
    const isPending = membership?.status === 'PENDING';

    if (compact) {
        return renderCompactCard(org, { typeLabel, isVerified, memberCount });
    }

    return `
        <div class="org-card" data-org-id="${org.id}" data-org-slug="${org.slug}">
            <div class="org-card-header">
                <div class="org-card-avatar">
                    ${org.logoUrl
                        ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" class="org-logo" />`
                        : `<div class="org-logo-placeholder">${getInitials(org.name)}</div>`
                    }
                </div>
                <div class="org-card-title-area">
                    <h3 class="org-card-name">
                        ${escapeHtml(org.name)}
                        ${isVerified ? '<span class="verified-badge" title="Verified Organization">✓</span>' : ''}
                    </h3>
                    <span class="org-card-type">${typeLabel}</span>
                </div>
            </div>

            ${org.description ? `
                <p class="org-card-description">${escapeHtml(truncate(org.description, 150))}</p>
            ` : ''}

            <div class="org-card-meta">
                ${jurisdictionLabel ? `
                    <span class="org-card-jurisdiction">
                        <span class="meta-icon">📍</span>
                        ${jurisdictionLabel}
                    </span>
                ` : ''}
                <span class="org-card-members">
                    <span class="meta-icon">👥</span>
                    ${memberCount} ${memberCount === 1 ? 'member' : 'members'}
                </span>
            </div>

            ${showActions ? `
                <div class="org-card-actions">
                    <button
                        class="org-card-btn org-card-btn-primary"
                        data-org-action="viewProfile"
                        data-org-id="${org.id}"
                    >
                        View Profile
                    </button>
                    ${!isMember && !isPending ? `
                        <button
                            class="org-card-btn org-card-btn-secondary"
                            data-org-action="${isFollowing ? 'unfollow' : 'follow'}"
                            data-org-id="${org.id}"
                        >
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    ` : ''}
                    ${isMember ? `
                        <span class="org-card-badge org-card-badge-member">Member</span>
                    ` : ''}
                    ${isPending ? `
                        <span class="org-card-badge org-card-badge-pending">Pending</span>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render a compact organization card (for lists, search results)
 * @private
 */
function renderCompactCard(org, { typeLabel, isVerified, memberCount }) {
    return `
        <div class="org-card org-card-compact" data-org-id="${org.id}" data-org-slug="${org.slug}">
            <div class="org-card-avatar org-card-avatar-small">
                ${org.logoUrl
                    ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" class="org-logo" />`
                    : `<div class="org-logo-placeholder">${getInitials(org.name)}</div>`
                }
            </div>
            <div class="org-card-info">
                <span class="org-card-name">
                    ${escapeHtml(org.name)}
                    ${isVerified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
                </span>
                <span class="org-card-meta-compact">
                    ${typeLabel} · ${memberCount} members
                </span>
            </div>
            <button
                class="org-card-btn org-card-btn-icon"
                data-org-action="viewProfile"
                data-org-id="${org.id}"
                title="View Profile"
            >
                →
            </button>
        </div>
    `;
}

/**
 * Render a grid of organization cards
 * @param {Array} organizations - List of organizations
 * @param {Object} [options] - Render options
 * @param {Map} [options.memberships] - Map of orgId -> membership
 * @returns {string} HTML string
 */
export function renderOrgGrid(organizations, options = {}) {
    const { memberships = new Map() } = options;

    if (!organizations || organizations.length === 0) {
        return `
            <div class="org-grid-empty">
                <p>No organizations found</p>
            </div>
        `;
    }

    return `
        <div class="org-grid">
            ${organizations.map(org =>
                renderOrgCard(org, {
                    membership: memberships.get(org.id)
                })
            ).join('')}
        </div>
    `;
}

/**
 * Render a list of organization cards (compact)
 * @param {Array} organizations - List of organizations
 * @returns {string} HTML string
 */
export function renderOrgList(organizations) {
    if (!organizations || organizations.length === 0) {
        return `
            <div class="org-list-empty">
                <p>No organizations found</p>
            </div>
        `;
    }

    return `
        <div class="org-list">
            ${organizations.map(org =>
                renderOrgCard(org, { compact: true, showActions: false })
            ).join('')}
        </div>
    `;
}

// ==================== Utility Functions ====================

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Truncate string to max length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from organization name
 * @param {string} name - Organization name
 * @returns {string} Initials (max 2 chars)
 */
function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}

export default {
    renderOrgCard,
    renderOrgGrid,
    renderOrgList,
    ORG_TYPE_LABELS,
    JURISDICTION_LABELS
};
