/**
 * Organization Public Profile Component
 * Standalone page component for viewing public organization profiles
 *
 * @module features/organizations/components/org-profile
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

// H3 constants for map display
const H3_RESOLUTION = 7;

/**
 * Profile state
 */
let profileState = {
    loading: true,
    error: null,
    organization: null,
    currentUser: null,
    isFollowing: false,
    membershipStatus: null, // null | 'ACTIVE' | 'PENDING'
    publicActivity: [],
    activityLoading: false,
    endorsedCandidates: [],
    endorsementsLoading: false,
    mapInitialized: false,
    map: null
};

/**
 * Initialize profile on page load
 */
async function initProfile() {
    const container = document.getElementById('orgProfileContainer');
    if (!container) return;

    // Get org identifier from URL
    const params = new URLSearchParams(window.location.search);
    const orgSlug = params.get('org');
    const orgId = params.get('id');

    if (!orgSlug && !orgId) {
        profileState.error = 'No organization specified';
        profileState.loading = false;
        renderProfile(container);
        return;
    }

    try {
        // Check authentication first
        profileState.currentUser = await checkAuth();

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
        profileState.organization = orgData.organization || orgData;

        // Update page metadata
        document.title = `${profileState.organization.name} - United We Rise`;
        updateMetaTags(profileState.organization);

        // Check follow status and membership if logged in
        if (profileState.currentUser) {
            await checkFollowStatus();
            await checkMembership();
        }

        profileState.loading = false;
        renderProfile(container);

        // Load public activity and endorsed candidates
        loadPublicActivity();
        loadEndorsedCandidates();

        // Initialize map if org has H3 cells
        if (profileState.organization.h3Cells?.length > 0) {
            setTimeout(() => initCoverageMap(), 100);
        }

    } catch (error) {
        console.error('Profile init error:', error);
        profileState.error = error.message || 'Failed to load profile';
        profileState.loading = false;
        renderProfile(container);
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
            return data.data;  // API returns { success: true, data: userData }
        }
    } catch (e) {
        console.warn('Auth check failed:', e);
    }
    return null;
}

/**
 * Check if user follows this organization
 */
async function checkFollowStatus() {
    if (!profileState.currentUser || !profileState.organization) return;

    try {
        const response = await fetch(`${API_BASE}/organizations/me/following`, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            profileState.isFollowing = data.following?.some(
                f => f.organizationId === profileState.organization.id
            ) || false;
        }
    } catch (e) {
        console.warn('Follow status check failed:', e);
    }
}

/**
 * Check user's membership in organization
 */
async function checkMembership() {
    if (!profileState.currentUser || !profileState.organization) {
        console.log('[OrgProfile] checkMembership skipped - no user or org');
        return;
    }

    console.log('[OrgProfile] Checking membership for org:', profileState.organization.id);

    try {
        const response = await fetch(`${API_BASE}/organizations/me/memberships`, {
            credentials: 'include'
        });
        console.log('[OrgProfile] Membership API response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('[OrgProfile] Memberships returned:', data.memberships?.length);
            console.log('[OrgProfile] Looking for orgId:', profileState.organization.id);
            console.log('[OrgProfile] Available orgIds:', data.memberships?.map(m => m.organizationId));

            const membership = data.memberships?.find(
                m => m.organizationId === profileState.organization.id
            );
            console.log('[OrgProfile] Found membership:', membership);
            profileState.membershipStatus = membership?.status || null;
            console.log('[OrgProfile] Set membershipStatus to:', profileState.membershipStatus);
        }
    } catch (e) {
        console.error('[OrgProfile] Membership check failed:', e);
    }
}

/**
 * Load public activity feed
 */
async function loadPublicActivity() {
    if (!profileState.organization) return;

    profileState.activityLoading = true;

    try {
        const response = await fetch(
            `${API_BASE}/organizations/${profileState.organization.id}/public-activity?limit=5`,
            { credentials: 'include' }
        );

        if (response.ok) {
            const data = await response.json();
            profileState.publicActivity = data.items || [];
        }
    } catch (e) {
        console.warn('Activity load failed:', e);
    } finally {
        profileState.activityLoading = false;
        const container = document.getElementById('orgProfileContainer');
        if (container) renderProfile(container);
    }
}

/**
 * Load endorsed candidates for this organization
 */
async function loadEndorsedCandidates() {
    if (!profileState.organization) return;

    profileState.endorsementsLoading = true;

    try {
        const response = await fetch(
            `${API_BASE}/endorsements/organizations/${profileState.organization.id}`,
            { credentials: 'include' }
        );

        if (response.ok) {
            const data = await response.json();
            profileState.endorsedCandidates = data || [];
        }
    } catch (e) {
        console.warn('Endorsements load failed:', e);
    } finally {
        profileState.endorsementsLoading = false;
        const container = document.getElementById('orgProfileContainer');
        if (container) renderProfile(container);
    }
}

/**
 * Update meta tags for SEO/sharing
 */
function updateMetaTags(org) {
    const desc = org.description
        ? org.description.substring(0, 160)
        : `View ${org.name} on United We Rise`;

    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${org.name} - United We Rise`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
}

/**
 * Main render function
 */
function renderProfile(container) {
    if (profileState.loading) {
        container.innerHTML = `
            <div class="org-profile-loading">
                <div class="loading-spinner"></div>
                <p>Loading organization...</p>
            </div>
        `;
        return;
    }

    if (profileState.error) {
        container.innerHTML = `
            <div class="org-profile-error">
                <h2>Error</h2>
                <p>${profileState.error}</p>
                <a href="/index.html#organizations" class="org-profile-btn org-profile-btn-primary">
                    Browse Organizations
                </a>
            </div>
        `;
        return;
    }

    const org = profileState.organization;

    container.innerHTML = `
        <div class="org-profile-content">
            ${renderHeader(org)}
            ${renderAbout(org)}
            ${org.h3Cells?.length > 0 ? renderCoverageSection() : ''}
            ${renderEndorsedCandidatesSection()}
            ${renderActivitySection()}
        </div>
    `;

    attachProfileListeners(container);
}

/**
 * Render profile header with org info and actions
 */
function renderHeader(org) {
    const typeLabel = ORG_TYPE_LABELS[org.type] || org.type;
    const jurisdictionLabel = org.jurisdictionType
        ? `${JURISDICTION_LABELS[org.jurisdictionType] || org.jurisdictionType}${org.jurisdictionValue ? ` - ${org.jurisdictionValue}` : ''}`
        : null;

    const memberCount = org._count?.members || org.memberCount || 0;
    const followerCount = org._count?.followers || org.followerCount || 0;
    const isVerified = org.verificationStatus === 'APPROVED';
    const avatarUrl = org.avatar || '/assets/images/org-placeholder.png';

    return `
        <div class="org-profile-header">
            <div class="org-profile-header-main">
                <img src="${avatarUrl}" alt="${org.name}" class="org-profile-avatar" />
                <div class="org-profile-info">
                    <h1 class="org-profile-name">
                        ${org.name}
                        ${isVerified ? '<span class="org-profile-verified" title="Verified Organization">✓</span>' : ''}
                    </h1>
                    <div class="org-profile-meta">
                        <span class="org-profile-type">${typeLabel}</span>
                        ${jurisdictionLabel ? `<span class="org-profile-jurisdiction">${jurisdictionLabel}</span>` : ''}
                    </div>
                    <div class="org-profile-stats">
                        <span class="org-profile-stat">${formatCount(memberCount)} members</span>
                        <span class="org-profile-stat">${formatCount(followerCount)} followers</span>
                    </div>
                </div>
            </div>
            <div class="org-profile-actions">
                ${renderActionButtons()}
            </div>
        </div>
    `;
}

/**
 * Render action buttons based on user state
 */
function renderActionButtons() {
    const isMember = profileState.membershipStatus === 'ACTIVE';
    const isPending = profileState.membershipStatus === 'PENDING';
    const isHead = profileState.organization?.headUserId === profileState.currentUser?.id;

    if (!profileState.currentUser) {
        return `
            <div class="org-profile-login-hint">
                <a href="/index.html#login" class="org-profile-btn org-profile-btn-primary">
                    Login to Follow or Join
                </a>
            </div>
        `;
    }

    if (isHead) {
        return `
            <a href="/org-dashboard.html?id=${profileState.organization.id}" class="org-profile-btn org-profile-btn-primary">
                Manage Organization
            </a>
            <button class="org-profile-btn org-profile-btn-secondary" data-action="share">
                Share
            </button>
        `;
    }

    if (isMember) {
        return `
            <a href="/org-dashboard.html?id=${profileState.organization.id}" class="org-profile-btn org-profile-btn-primary">
                View Dashboard
            </a>
            <button class="org-profile-btn org-profile-btn-secondary ${profileState.isFollowing ? 'following' : ''}" data-action="toggle-follow">
                ${profileState.isFollowing ? 'Following' : 'Follow'}
            </button>
            <button class="org-profile-btn org-profile-btn-secondary" data-action="share">
                Share
            </button>
        `;
    }

    if (isPending) {
        return `
            <button class="org-profile-btn org-profile-btn-secondary" disabled>
                Request Pending
            </button>
            <button class="org-profile-btn org-profile-btn-secondary ${profileState.isFollowing ? 'following' : ''}" data-action="toggle-follow">
                ${profileState.isFollowing ? 'Following' : 'Follow'}
            </button>
            <button class="org-profile-btn org-profile-btn-secondary" data-action="share">
                Share
            </button>
        `;
    }

    // Non-member
    return `
        <button class="org-profile-btn org-profile-btn-primary" data-action="request-join">
            Request to Join
        </button>
        <button class="org-profile-btn org-profile-btn-secondary ${profileState.isFollowing ? 'following' : ''}" data-action="toggle-follow">
            ${profileState.isFollowing ? 'Follow' : 'Follow'}
        </button>
        <button class="org-profile-btn org-profile-btn-secondary" data-action="share">
            Share
        </button>
    `;
}

/**
 * Render about section
 */
function renderAbout(org) {
    return `
        <div class="org-profile-section">
            <h2 class="org-profile-section-title">About</h2>
            <div class="org-profile-description">
                ${org.description || 'No description provided.'}
            </div>
            ${org.website || org.contactEmail ? `
                <div class="org-profile-contact">
                    ${org.website ? `
                        <a href="${org.website}" target="_blank" rel="noopener noreferrer" class="org-profile-link">
                            <span class="org-profile-link-icon">🌐</span>
                            ${org.website.replace(/^https?:\/\//, '')}
                        </a>
                    ` : ''}
                    ${org.contactEmail ? `
                        <a href="mailto:${org.contactEmail}" class="org-profile-link">
                            <span class="org-profile-link-icon">✉️</span>
                            ${org.contactEmail}
                        </a>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render coverage area section (H3 map)
 */
function renderCoverageSection() {
    return `
        <div class="org-profile-section">
            <h2 class="org-profile-section-title">Coverage Area</h2>
            <div id="coverageMap" class="org-profile-map"></div>
        </div>
    `;
}

/**
 * Render endorsed candidates section
 */
function renderEndorsedCandidatesSection() {
    const endorsements = profileState.endorsedCandidates;

    // Don't render section if no endorsements and not loading
    if (!profileState.endorsementsLoading && endorsements.length === 0) {
        return '';
    }

    return `
        <div class="org-profile-section org-profile-endorsements-section">
            <h2 class="org-profile-section-title">Endorsed Candidates</h2>
            <div class="org-profile-endorsed-candidates">
                ${profileState.endorsementsLoading
                    ? '<div class="org-profile-loading-message">Loading endorsements...</div>'
                    : endorsements.map(endorsement => renderEndorsedCandidateCard(endorsement)).join('')
                }
            </div>
        </div>
    `;
}

/**
 * Render a single endorsed candidate card
 */
function renderEndorsedCandidateCard(endorsement) {
    const candidate = endorsement.candidate || {};
    const office = candidate.office?.title || 'Running for Office';

    return `
        <div class="org-profile-candidate-card">
            <div class="org-profile-candidate-photo">
                ${candidate.photoUrl || candidate.user?.avatar
                    ? `<img src="${candidate.photoUrl || candidate.user?.avatar}" alt="${candidate.name}">`
                    : `<div class="org-profile-candidate-initials">${getInitials(candidate.name)}</div>`
                }
            </div>
            <div class="org-profile-candidate-info">
                <h3 class="org-profile-candidate-name">${escapeHtml(candidate.name || 'Candidate')}</h3>
                <span class="org-profile-candidate-office">${escapeHtml(office)}</span>
                ${candidate.party ? `<span class="org-profile-candidate-party">${escapeHtml(candidate.party)}</span>` : ''}
            </div>
            ${endorsement.statement ? `
                <div class="org-profile-endorsement-statement">
                    "${escapeHtml(endorsement.statement)}"
                </div>
            ` : ''}
            <div class="org-profile-endorsement-date">
                Endorsed ${formatDate(endorsement.publishedAt)}
            </div>
        </div>
    `;
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Escape HTML for security
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Render activity section
 */
function renderActivitySection() {
    const isMember = profileState.membershipStatus === 'ACTIVE';

    return `
        <div class="org-profile-section">
            <h2 class="org-profile-section-title">Recent Activity</h2>
            <div class="org-profile-activity">
                ${profileState.activityLoading
                    ? '<div class="org-profile-activity-loading">Loading activity...</div>'
                    : profileState.publicActivity.length === 0
                        ? '<div class="org-profile-activity-empty">No public activity yet</div>'
                        : profileState.publicActivity.map(item => renderActivityItem(item)).join('')
                }
            </div>
            ${isMember && profileState.publicActivity.length > 0 ? `
                <div class="org-profile-activity-more">
                    <a href="/org-dashboard.html?id=${profileState.organization.id}" class="org-profile-link">
                        View All Activity →
                    </a>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render single activity item
 */
function renderActivityItem(item) {
    switch (item.type) {
        case 'post':
            return renderPostItem(item.data, item.timestamp);
        case 'event':
            return renderEventItem(item.data, item.timestamp);
        case 'endorsement':
            return renderEndorsementItem(item.data, item.timestamp);
        default:
            return '';
    }
}

/**
 * Render post activity item
 */
function renderPostItem(post, timestamp) {
    const org = profileState.organization;
    const timeAgo = formatTimeAgo(timestamp);
    const avatarUrl = org.avatar || '/assets/images/org-placeholder.png';

    return `
        <div class="org-profile-activity-item org-profile-activity-post">
            <div class="org-profile-activity-header">
                <img src="${avatarUrl}" alt="${org.name}" class="org-profile-activity-avatar" />
                <div class="org-profile-activity-meta">
                    <span class="org-profile-activity-author">${org.name}</span>
                    <span class="org-profile-activity-label">posted</span>
                    <span class="org-profile-activity-time">${timeAgo}</span>
                </div>
            </div>
            <div class="org-profile-activity-content">
                ${post.content || ''}
            </div>
            ${post.photos?.length > 0 ? `
                <div class="org-profile-activity-photos">
                    ${post.photos.slice(0, 4).map(photo => `
                        <img src="${photo.thumbnailUrl || photo.url}" alt="" class="org-profile-activity-photo" />
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render event activity item
 */
function renderEventItem(event, timestamp) {
    const timeAgo = formatTimeAgo(timestamp);
    const eventDate = new Date(event.scheduledDate || event.date);
    const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    return `
        <div class="org-profile-activity-item org-profile-activity-event">
            <div class="org-profile-activity-header">
                <span class="org-profile-activity-icon">📅</span>
                <div class="org-profile-activity-meta">
                    <span class="org-profile-activity-label">Upcoming Event</span>
                    <span class="org-profile-activity-time">${timeAgo}</span>
                </div>
            </div>
            <div class="org-profile-event-title">${event.title}</div>
            <div class="org-profile-event-date">${dateStr}</div>
            ${event.location?.address ? `<div class="org-profile-event-location">📍 ${event.location.address}</div>` : ''}
        </div>
    `;
}

/**
 * Render endorsement activity item
 */
function renderEndorsementItem(endorsement, timestamp) {
    const timeAgo = formatTimeAgo(timestamp);
    const candidate = endorsement.candidate;

    return `
        <div class="org-profile-activity-item org-profile-activity-endorsement">
            <div class="org-profile-activity-header">
                <span class="org-profile-activity-icon">✓</span>
                <div class="org-profile-activity-meta">
                    <span class="org-profile-activity-label">Endorsed</span>
                    <span class="org-profile-activity-time">${timeAgo}</span>
                </div>
            </div>
            <div class="org-profile-endorsement-content">
                <strong>${candidate?.name || 'Candidate'}</strong>
                ${candidate?.office ? ` for ${candidate.office}` : ''}
            </div>
        </div>
    `;
}

/**
 * Initialize H3 coverage map
 */
function initCoverageMap() {
    const mapContainer = document.getElementById('coverageMap');
    if (!mapContainer || profileState.mapInitialized) return;

    const cells = profileState.organization.h3Cells || [];
    if (cells.length === 0) return;

    try {
        // Create map
        profileState.map = new maplibregl.Map({
            container: 'coverageMap',
            style: {
                version: 8,
                sources: {
                    'carto-light': {
                        type: 'raster',
                        tiles: [
                            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
                        ],
                        tileSize: 256,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    }
                },
                layers: [
                    {
                        id: 'carto-light-layer',
                        type: 'raster',
                        source: 'carto-light',
                        minzoom: 0,
                        maxzoom: 19
                    }
                ]
            },
            center: [-98.5795, 39.8283],
            zoom: 4,
            minZoom: 3,
            maxZoom: 12
        });

        profileState.map.addControl(new maplibregl.NavigationControl(), 'top-right');

        profileState.map.on('load', () => {
            // Add H3 cells as GeoJSON
            const features = cells.map(cell => {
                const boundary = h3.cellToBoundary(cell, true);
                return {
                    type: 'Feature',
                    properties: { cell },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [boundary]
                    }
                };
            });

            profileState.map.addSource('h3-cells', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features
                }
            });

            profileState.map.addLayer({
                id: 'h3-cells-fill',
                type: 'fill',
                source: 'h3-cells',
                paint: {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.4
                }
            });

            profileState.map.addLayer({
                id: 'h3-cells-outline',
                type: 'line',
                source: 'h3-cells',
                paint: {
                    'line-color': '#1d4ed8',
                    'line-width': 2
                }
            });

            // Fit map to cells bounds
            fitMapToCells(cells);
        });

        profileState.mapInitialized = true;

    } catch (error) {
        console.error('Map initialization error:', error);
    }
}

/**
 * Fit map to show all H3 cells
 */
function fitMapToCells(cells) {
    if (!profileState.map || cells.length === 0) return;

    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    cells.forEach(cell => {
        const boundary = h3.cellToBoundary(cell, true);
        boundary.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        });
    });

    profileState.map.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 40, maxZoom: 10 }
    );
}

/**
 * Attach event listeners
 */
function attachProfileListeners(container) {
    container.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'toggle-follow':
                await toggleFollow();
                break;
            case 'request-join':
                await requestJoin();
                break;
            case 'share':
                shareProfile();
                break;
        }
    });
}

/**
 * Toggle follow status
 */
async function toggleFollow() {
    if (!profileState.currentUser) {
        window.location.href = '/index.html#login';
        return;
    }

    try {
        const endpoint = profileState.isFollowing
            ? `${API_BASE}/organizations/${profileState.organization.id}/unfollow`
            : `${API_BASE}/organizations/${profileState.organization.id}/follow`;

        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRF-Token': window.csrfToken || ''
            }
        });

        if (response.ok) {
            profileState.isFollowing = !profileState.isFollowing;
            const container = document.getElementById('orgProfileContainer');
            if (container) renderProfile(container);
            showToast(profileState.isFollowing ? 'Now following this organization' : 'Unfollowed organization');
        }
    } catch (error) {
        console.error('Follow toggle error:', error);
        showToast('Failed to update follow status', 'error');
    }
}

/**
 * Request to join organization
 */
async function requestJoin() {
    if (!profileState.currentUser) {
        window.location.href = '/index.html#login';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/organizations/${profileState.organization.id}/join`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRF-Token': window.csrfToken || ''
            }
        });

        if (response.ok) {
            profileState.membershipStatus = 'PENDING';
            const container = document.getElementById('orgProfileContainer');
            if (container) renderProfile(container);
            showToast('Join request submitted!');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to submit join request', 'error');
        }
    } catch (error) {
        console.error('Join request error:', error);
        showToast('Failed to submit join request', 'error');
    }
}

/**
 * Share profile URL
 */
function shareProfile() {
    const url = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: `${profileState.organization.name} - United We Rise`,
            url
        }).catch(() => {
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Link copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Format count for display (e.g., 1.2K)
 */
function formatCount(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
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

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfile);
} else {
    initProfile();
}
