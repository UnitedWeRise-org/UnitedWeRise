/**
 * Notification System Handlers
 * Bell badge, dropdown panel, real-time updates, and friend-request actions.
 *
 * The panel is designed to behave like a social feed notification center:
 * - unread badge reflects the server's total unread count
 * - opening the panel marks visible notifications as read (badge clears)
 * - new notifications arrive over WebSocket and update the badge/panel
 * - friend requests can be accepted/declined inline
 */

import { apiClient } from '../modules/core/api/client.js';
import { getTimeAgo } from '../utils/date-helpers.js';
import { escapeHTML } from '../utils/security.js';

// ============================================================================
// STATE
// ============================================================================

const PAGE_SIZE = 20;
const REFRESH_THROTTLE_MS = 30_000;

let notificationsCache = [];
let notificationDropdownOpen = false;
let unreadCount = 0;
let notificationOffset = 0;
let notificationHasMore = true;
let notificationLoading = false;
let lastNotificationFetch = 0;
let refreshInterval = null;

// ============================================================================
// AUTH / API HELPERS
// ============================================================================

function isAuthenticated() {
    if (window.currentUser) return true;
    if (window.userState && window.userState.current) return true;
    if (window.authUtils && typeof window.authUtils.isUserAuthenticated === 'function') {
        return window.authUtils.isUserAuthenticated();
    }
    return false;
}

function showToast(message, duration = 4000) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, duration);
        return;
    }
    console.debug('Notification:', message);
}

// ============================================================================
// BADGE
// ============================================================================

/**
 * Set the bell badge from the server's unread count.
 * @param {number} count - Total unread notifications
 */
function setUnreadCount(count) {
    unreadCount = Math.max(0, Number.isFinite(Number(count)) ? Number(count) : 0);
    window.notificationsUnreadCount = unreadCount;

    let badge = document.getElementById('notificationBadge');
    if (!badge && unreadCount > 0) {
        const button = document.querySelector('.notification-btn');
        if (button) {
            badge = document.createElement('span');
            badge.id = 'notificationBadge';
            badge.className = 'notification-badge';
            button.appendChild(badge);
        }
    }

    if (badge) {
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Backwards-compatible badge update.
 */
function updateNotificationBadge() {
    setUnreadCount(unreadCount);
}

// ============================================================================
// DROPDOWN
// ============================================================================

/**
 * Create the notification dropdown shell.
 */
function createNotificationDropdown() {
    const notificationSection = document.getElementById('notificationSection');
    if (!notificationSection) return;

    let dropdown = document.getElementById('notificationDropdown');
    if (dropdown) return;

    notificationSection.style.position = 'relative';

    dropdown = document.createElement('div');
    dropdown.id = 'notificationDropdown';
    dropdown.className = 'notification-dropdown';
    dropdown.setAttribute('role', 'dialog');
    dropdown.setAttribute('aria-label', 'Notifications');
    dropdown.innerHTML = `
        <div class="notification-dropdown-header">
            <h6>Notifications</h6>
            <div class="notification-header-actions">
                <button type="button" class="notification-mark-all-btn" data-notification-action="mark-all-read" style="display:none;">
                    Mark all read
                </button>
                <button type="button" class="notification-close-btn" data-notification-action="close" aria-label="Close notifications">×</button>
            </div>
        </div>
        <div class="notifications-list" id="notificationsList">
            <div class="notification-loading">Loading…</div>
        </div>
        <div class="notification-footer">
            <button type="button" class="notification-load-more" data-notification-action="load-more" style="display:none;">
                Load more
            </button>
        </div>
    `;

    notificationSection.appendChild(dropdown);
}

function closeNotifications() {
    notificationDropdownOpen = false;
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
        dropdown.style.display = 'none';
    }
}

/**
 * Render the current notification cache into the dropdown.
 */
function displayNotifications() {
    const list = document.getElementById('notificationsList');
    const dropdown = document.getElementById('notificationDropdown');
    if (!list || !dropdown) return;

    const markAllBtn = dropdown.querySelector('[data-notification-action="mark-all-read"]');
    const loadMoreBtn = dropdown.querySelector('[data-notification-action="load-more"]');
    const hasUnread = unreadCount > 0 || notificationsCache.some((n) => !n.read);

    if (markAllBtn) {
        markAllBtn.style.display = hasUnread && notificationsCache.length > 0
            ? 'inline-flex'
            : 'none';
    }
    if (loadMoreBtn) {
        loadMoreBtn.style.display = notificationHasMore && notificationsCache.length > 0
            ? 'inline-flex'
            : 'none';
    }

    if (notificationLoading && notificationsCache.length === 0) {
        list.innerHTML = '<div class="notification-loading">Loading…</div>';
        return;
    }

    if (notificationsCache.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <div class="notification-empty-icon">🔔</div>
                <p class="notification-empty-text">No notifications yet</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notificationsCache.map((notification) => {
        const sender = notification.sender || {};
        const senderId = sender.id || '';
        const senderName = getSenderName(notification);
        const title = getNotificationTitle(notification);
        const message = notification.message && notification.message !== title
            ? notification.message
            : '';
        const icon = getNotificationIcon(notification.type);
        const isUnread = !notification.read;
        const avatar = sender.avatar
            ? `<img class="notification-avatar" src="${escapeHTML(sender.avatar)}" alt="">`
            : `<span class="notification-item-emoji">${icon}</span>`;

        const isFriendRequest =
            notification.type === 'FRIEND_REQUEST' && senderId && isUnread;

        const actions = isFriendRequest ? `
            <div class="notification-item-actions">
                <button type="button" class="notification-action-btn accept"
                        data-notification-action="accept-friend"
                        data-sender-id="${escapeHTML(senderId)}"
                        data-notification-id="${escapeHTML(notification.id)}">Accept</button>
                <button type="button" class="notification-action-btn decline"
                        data-notification-action="decline-friend"
                        data-sender-id="${escapeHTML(senderId)}"
                        data-notification-id="${escapeHTML(notification.id)}">Decline</button>
            </div>
        ` : '';

        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}"
                 data-notification-action="handle-click"
                 data-notification-id="${escapeHTML(notification.id)}"
                 data-notification-type="${escapeHTML(notification.type)}"
                 data-sender-id="${escapeHTML(senderId)}">
                <div class="notification-item-icon">${avatar}</div>
                <div class="notification-item-content">
                    <div class="notification-item-title">${escapeHTML(title)}</div>
                    ${message ? `<div class="notification-item-message">${escapeHTML(message)}</div>` : ''}
                    <div class="notification-item-time">${escapeHTML(getTimeAgo(new Date(notification.createdAt)))}</div>
                    ${actions}
                </div>
                ${isUnread ? '<div class="notification-unread-dot"></div>' : ''}
            </div>
        `;
    }).join('');

    list.setAttribute('aria-label', `Notifications for ${getSenderName(notificationsCache[0])}`);
}

// ============================================================================
// PRESENTATION HELPERS
// ============================================================================

function getSenderName(notification) {
    const sender = notification.sender;
    if (sender) {
        if (sender.firstName && sender.lastName) {
            return `${sender.firstName} ${sender.lastName}`;
        }
        return sender.username || 'Someone';
    }
    return notification.data?.senderName || 'Someone';
}

function getNotificationIcon(type) {
    const icons = {
        FRIEND_REQUEST: '👥',
        FRIEND_ACCEPTED: '✅',
        LIKE: '❤️',
        COMMENT: '💬',
        MENTION: '🏷️',
        FOLLOW: '👤',
        REACTION: '👍',
        VERIFICATION_APPROVED: '✅',
        VERIFICATION_DENIED: '❌',
        NEW_POST: '📝',
        MESSAGE_REQUEST: '💬',
        ORG_INVITE: '🏢',
        ORG_APPLICATION_RECEIVED: '📥',
        ORG_APPLICATION_APPROVED: '✅',
        ORG_APPLICATION_DENIED: '❌',
        ORG_ROLE_ASSIGNED: '🎖️',
        ORG_ROLE_REMOVED: '🎖️',
        ORG_AFFILIATION_PROPOSED: '🤝',
        ORG_AFFILIATION_APPROVED: '🤝',
        ORG_AFFILIATION_REVOKED: '🤝',
        ORG_MERGE_PROPOSED: '🔀',
        ORG_MERGE_ACCEPTED: '🔀',
        ORG_MERGE_COMPLETED: '🔀',
        // Legacy lowercase
        friend_request: '👥',
        friend_accepted: '✅',
        post_like: '❤️',
        post_comment: '💬',
        mention: '🏷️',
        follow: '👤',
        admin_message: '🛡️'
    };
    return icons[type] || '🔔';
}

function getNotificationTitle(notification) {
    const senderName = getSenderName(notification);

    switch (notification.type) {
        case 'FRIEND_REQUEST':
            return `Friend request from ${senderName}`;
        case 'FRIEND_ACCEPTED':
            return `${senderName} accepted your friend request`;
        case 'LIKE':
            return `${senderName} liked your post`;
        case 'COMMENT':
            return `${senderName} commented on your post`;
        case 'FOLLOW':
            return `${senderName} started following you`;
        case 'MENTION':
            return `${senderName} mentioned you`;
        case 'REACTION':
            return `${senderName} reacted to your post`;
        case 'VERIFICATION_APPROVED':
            return 'Your verification has been approved';
        case 'VERIFICATION_DENIED':
            return 'Your verification request was denied';
        case 'NEW_POST':
            return `${senderName} posted something new`;
        case 'MESSAGE_REQUEST':
            return `${senderName} wants to message you`;
        // Legacy lowercase
        case 'friend_request':
            return `Friend request from ${senderName}`;
        case 'friend_accepted':
            return `${senderName} accepted your friend request`;
        case 'post_like':
            return `${senderName} liked your post`;
        case 'post_comment':
            return `${senderName} commented on your post`;
        case 'follow':
            return `${senderName} started following you`;
        case 'mention':
            return `${senderName} mentioned you`;
        case 'admin_message':
            return 'New message from site administrator';
        default:
            return notification.message || notification.title || 'New notification';
    }
}

// ============================================================================
// FETCHING
// ============================================================================

/**
 * Fetch a page of notifications.
 *
 * @param {Object} options
 * @param {number} [options.limit] - Page size
 * @param {number} [options.offset] - Offset
 * @param {boolean} [options.append] - Append instead of replacing
 * @returns {Promise<Array>} Notification cache
 */
async function fetchNotifications(options = {}) {
    const { limit = PAGE_SIZE, offset = 0, append = false } = options;

    if (notificationLoading) return notificationsCache;
    notificationLoading = true;

    try {
        const data = await apiClient.call('/notifications', {
            params: { limit, offset },
            bypassCache: true
        });

        const incoming = Array.isArray(data?.notifications) ? data.notifications : [];

        if (append) {
            const existingIds = new Set(notificationsCache.map((n) => n.id));
            notificationsCache = notificationsCache.concat(
                incoming.filter((n) => !existingIds.has(n.id))
            );
        } else {
            notificationsCache = incoming;
        }

        notificationOffset = offset + incoming.length;
        notificationHasMore = incoming.length === limit;
        lastNotificationFetch = Date.now();

        if (typeof data?.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
        }

        if (notificationDropdownOpen) {
            displayNotifications();
        }

        return notificationsCache;
    } finally {
        notificationLoading = false;
    }
}

/**
 * Load the next page into the panel.
 */
async function loadMoreNotifications() {
    if (notificationLoading || !notificationHasMore) return;
    try {
        await fetchNotifications({ offset: notificationOffset, append: true });
        displayNotifications();
        await markVisibleNotificationsRead();
    } catch (error) {
        console.error('Failed to load more notifications:', error);
    }
}

// ============================================================================
// READ STATE
// ============================================================================

/**
 * Mark the fetched unread notifications as read. Called when the panel opens,
 * so the bell badge clears after the user has looked at them.
 */
async function markVisibleNotificationsRead() {
    const unreadIds = notificationsCache.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
        const data = await apiClient.call('/notifications/mark-read-batch', {
            method: 'PUT',
            body: { notificationIds: unreadIds }
        });

        const unreadIdSet = new Set(unreadIds);
        notificationsCache.forEach((n) => {
            if (unreadIdSet.has(n.id)) n.read = true;
        });

        if (typeof data?.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
        } else {
            setUnreadCount(0);
        }

        const dropdown = document.getElementById('notificationDropdown');
        const markAllBtn = dropdown?.querySelector('[data-notification-action="mark-all-read"]');
        if (markAllBtn) markAllBtn.style.display = 'none';

        // Keep the current rendered list (with its unread styling) until the
        // next open/refresh; the badge is what needs to clear immediately.
    } catch (error) {
        console.warn('Failed to mark notifications read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        const data = await apiClient.call('/notifications/read-all', { method: 'PUT' });
        notificationsCache.forEach((n) => { n.read = true; });
        setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
        displayNotifications();
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        showToast('Failed to mark notifications read', 4000);
    }
}

// ============================================================================
// OPEN / CLOSE / INIT
// ============================================================================

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) {
        createNotificationDropdown();
    }

    if (notificationDropdownOpen) {
        closeNotifications();
    } else {
        void openNotifications();
    }
}

/**
 * Open the panel, fetch the latest page, render it, and mark it read.
 */
async function openNotifications() {
    createNotificationDropdown();
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    notificationDropdownOpen = true;
    dropdown.classList.add('open');
    dropdown.style.display = 'block';
    displayNotifications();

    try {
        await fetchNotifications({ offset: 0 });
        displayNotifications();
        await markVisibleNotificationsRead();
    } catch (error) {
        console.error('Failed to open notifications:', error);
        const list = document.getElementById('notificationsList');
        if (list) {
            list.innerHTML = `
                <div class="notification-empty">
                    <div class="notification-empty-icon">⚠️</div>
                    <p class="notification-empty-text">Failed to load notifications</p>
                </div>
            `;
        }
    }
}

function initializeNotifications() {
    if (!isAuthenticated()) return;

    void fetchNotifications({ offset: 0 }).catch((error) => {
        console.debug('Initial notification fetch failed:', error?.message || error);
    });

    setupRefreshHandling();
}

function setupRefreshHandling() {
    if (window.__notificationRefreshInitialized) return;
    window.__notificationRefreshInitialized = true;

    const refreshIfStale = () => {
        if (!isAuthenticated() || document.hidden) return;
        if (Date.now() - lastNotificationFetch < REFRESH_THROTTLE_MS) return;
        void fetchNotifications({ offset: 0 }).catch(() => {});
    };

    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refreshIfStale();
    });

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshIfStale, 60_000);
}

// ============================================================================
// REAL-TIME
// ============================================================================

/**
 * Handle a notification pushed over WebSocket.
 * @param {Object} notification - New notification
 */
function updateNotificationUI(notification) {
    if (!notification?.id) return;
    if (notificationsCache.some((n) => n.id === notification.id)) return;

    if (notificationDropdownOpen) {
        // The user is looking at the panel; treat it as seen.
        notification.read = true;
        notificationsCache.unshift(notification);
        displayNotifications();

        void apiClient.call(`/notifications/${notification.id}/read`, { method: 'PUT' })
            .then((data) => {
                if (typeof data?.unreadCount === 'number') setUnreadCount(data.unreadCount);
            })
            .catch(() => {});
        return;
    }

    notificationsCache.unshift(notification);
    setUnreadCount(unreadCount + 1);
}

function showNotificationToast(notification) {
    if (notificationDropdownOpen) return;

    const title = getNotificationTitle(notification);
    const message = notification.message && notification.message !== title
        ? notification.message
        : '';
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="notification-toast-content">
            <span class="notification-toast-icon">${getNotificationIcon(notification.type)}</span>
            <div class="notification-toast-body">
                <div class="notification-toast-title">${escapeHTML(title)}</div>
                ${message ? `<div class="notification-toast-message">${escapeHTML(message)}</div>` : ''}
            </div>
        </div>
    `;

    toast.addEventListener('click', () => {
        toast.remove();
        void openNotifications();
    });

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ============================================================================
// NAVIGATION / ACTIONS
// ============================================================================

async function markNotificationRead(notificationId) {
    const notification = notificationsCache.find((n) => n.id === notificationId);
    if (!notification || notification.read) return;

    try {
        const data = await apiClient.call(`/notifications/${notificationId}/read`, { method: 'PUT' });
        notification.read = true;
        if (typeof data?.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
        } else {
            setUnreadCount(Math.max(0, unreadCount - 1));
        }
    } catch (error) {
        console.warn('Failed to mark notification read:', error);
    }
}

async function handleNotificationClick(notificationId, notificationType) {
    await markNotificationRead(notificationId);

    const notification = notificationsCache.find((n) => n.id === notificationId);
    const postId = notification?.postId;

    switch (notificationType) {
        case 'FRIEND_REQUEST':
        case 'friend_request':
            closeNotifications();
            if (typeof window.showFriendsPanel === 'function') {
                window.showFriendsPanel();
            }
            break;

        case 'LIKE':
        case 'COMMENT':
        case 'REACTION':
        case 'MENTION':
        case 'post_like':
        case 'post_comment':
        case 'mention':
            closeNotifications();
            if (postId && typeof window.showPostInFeed === 'function') {
                window.showPostInFeed(postId);
            }
            break;

        case 'FOLLOW':
        case 'follow':
            closeNotifications();
            if (notification?.sender?.id && typeof window.showUserProfile === 'function') {
                window.showUserProfile(notification.sender.id);
            }
            break;

        case 'NEW_POST':
            closeNotifications();
            if (postId && typeof window.showPostInFeed === 'function') {
                window.showPostInFeed(postId);
            }
            break;

        case 'MESSAGE_REQUEST':
            closeNotifications();
            if (typeof window.openMessagesPanel === 'function') {
                window.openMessagesPanel();
            }
            break;

        default:
            closeNotifications();
            break;
    }
}

async function acceptFriendRequest(senderId, notificationId) {
    if (!senderId) return;
    try {
        await apiClient.call(`/relationships/friend-request/${senderId}/accept`, { method: 'POST' });
        await markNotificationRead(notificationId);
        showToast('Friend request accepted');
        await fetchNotifications({ offset: 0 });
        displayNotifications();
    } catch (error) {
        console.error('Failed to accept friend request:', error);
        showToast('Failed to accept friend request', 5000);
    }
}

async function declineFriendRequest(senderId, notificationId) {
    if (!senderId) return;
    try {
        await apiClient.call(`/relationships/friend-request/${senderId}/reject`, { method: 'POST' });
        await markNotificationRead(notificationId);
        showToast('Friend request declined');
        await fetchNotifications({ offset: 0 });
        displayNotifications();
    } catch (error) {
        console.error('Failed to decline friend request:', error);
        showToast('Failed to decline friend request', 5000);
    }
}

// ============================================================================
// LEGACY HELPERS
// ============================================================================

async function triggerAdminRefresh() {
    if (!window.currentUser?.isAdmin) return;
    try {
        await fetchNotifications({ offset: 0 });
        if (typeof window.loadAdminDashboard === 'function') {
            window.loadAdminDashboard();
        }
    } catch (error) {
        console.error('Failed to refresh admin notifications:', error);
    }
}

async function triggerCandidateRefresh() {
    if (!window.currentUser?.isCandidate) return;
    try {
        await fetchNotifications({ offset: 0 });
        if (typeof window.loadCandidateDashboard === 'function') {
            window.loadCandidateDashboard();
        }
    } catch (error) {
        console.error('Failed to refresh candidate notifications:', error);
    }
}

function getCachedRelationshipStatus(userId) {
    if (window.relationshipCache && window.relationshipCache[userId]) {
        return window.relationshipCache[userId].status;
    }
    return null;
}

async function refreshFriendStatus(userId) {
    try {
        const data = await apiClient.call(`/relationships/friend-status/${userId}`, {
            bypassCache: true
        });

        if (data) {
            if (!window.relationshipCache) window.relationshipCache = {};
            window.relationshipCache[userId] = {
                status: data.status,
                lastUpdated: new Date().toISOString()
            };

            document.dispatchEvent(new CustomEvent('friendStatusUpdated', {
                detail: { userId, status: data.status }
            }));
        }
    } catch (error) {
        console.error('Failed to refresh friend status:', error);
    }
}

// ============================================================================
// BELL VISIBILITY
// ============================================================================

function showNotificationBell() {
    const notificationSection = document.getElementById('notificationSection');
    if (notificationSection) {
        notificationSection.style.display = 'flex';
    }
}

function hideNotificationBell() {
    const notificationSection = document.getElementById('notificationSection');
    if (notificationSection) {
        notificationSection.style.display = 'none';
    }
    closeNotifications();
    notificationsCache = [];
    setUnreadCount(0);

    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    window.__notificationRefreshInitialized = false;
}

// ============================================================================
// EVENT WIRING
// ============================================================================

document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-notification-action]');
    if (!target) return;

    const action = target.dataset.notificationAction;
    const notificationId = target.dataset.notificationId;
    const notificationType = target.dataset.notificationType;
    const senderId = target.dataset.senderId;

    switch (action) {
        case 'mark-all-read':
            e.stopPropagation();
            void markAllNotificationsRead();
            break;
        case 'close':
            e.stopPropagation();
            closeNotifications();
            break;
        case 'load-more':
            e.stopPropagation();
            void loadMoreNotifications();
            break;
        case 'accept-friend':
            e.stopPropagation();
            void acceptFriendRequest(senderId, notificationId);
            break;
        case 'decline-friend':
            e.stopPropagation();
            void declineFriendRequest(senderId, notificationId);
            break;
        case 'handle-click':
            if (notificationId && notificationType) {
                void handleNotificationClick(notificationId, notificationType);
            }
            break;
    }
});

document.addEventListener('click', (e) => {
    if (!notificationDropdownOpen) return;
    const dropdown = document.getElementById('notificationDropdown');
    const notificationSection = document.getElementById('notificationSection');
    if (dropdown && notificationSection && !notificationSection.contains(e.target)) {
        closeNotifications();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && notificationDropdownOpen) {
        closeNotifications();
    }
});

window.addEventListener('userLoggedIn', () => {
    showNotificationBell();
    initializeNotifications();
});

window.addEventListener('userLoggedOut', () => {
    hideNotificationBell();
});

// ============================================================================
// EXPORTS / GLOBAL COMPATIBILITY
// ============================================================================

export {
    createNotificationDropdown,
    closeNotifications,
    displayNotifications,
    getNotificationIcon,
    getNotificationTitle,
    updateNotificationBadge,
    updateNotificationUI,
    showNotificationToast,
    initializeNotifications,
    toggleNotifications,
    openNotifications,
    fetchNotifications,
    markAllNotificationsRead,
    handleNotificationClick,
    triggerAdminRefresh,
    triggerCandidateRefresh,
    getCachedRelationshipStatus,
    refreshFriendStatus,
    showNotificationBell,
    hideNotificationBell,
    setUnreadCount
};

if (typeof window !== 'undefined') {
    window.createNotificationDropdown = createNotificationDropdown;
    window.closeNotifications = closeNotifications;
    window.displayNotifications = displayNotifications;
    window.getNotificationIcon = getNotificationIcon;
    window.getNotificationTitle = getNotificationTitle;
    window.updateNotificationBadge = updateNotificationBadge;
    window.updateNotificationUI = updateNotificationUI;
    window.showNotificationToast = showNotificationToast;
    window.initializeNotifications = initializeNotifications;
    window.toggleNotifications = toggleNotifications;
    window.openNotifications = openNotifications;
    window.fetchNotifications = fetchNotifications;
    window.markAllNotificationsRead = markAllNotificationsRead;
    window.handleNotificationClick = handleNotificationClick;
    window.triggerAdminRefresh = triggerAdminRefresh;
    window.triggerCandidateRefresh = triggerCandidateRefresh;
    window.getCachedRelationshipStatus = getCachedRelationshipStatus;
    window.refreshFriendStatus = refreshFriendStatus;
    window.showNotificationBell = showNotificationBell;
    window.hideNotificationBell = hideNotificationBell;
    window.setNotificationUnreadCount = setUnreadCount;

    // Read-only compatibility getters (legacy consumers read these).
    try {
        Object.defineProperty(window, 'notificationsCache', {
            get: () => notificationsCache,
            configurable: true
        });
        Object.defineProperty(window, 'notificationDropdownOpen', {
            get: () => notificationDropdownOpen,
            configurable: true
        });
    } catch (_) {
        // Ignore environments that do not allow redefining globals.
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createNotificationDropdown();
            if (window.currentUser) {
                showNotificationBell();
                initializeNotifications();
            }
        });
    } else {
        createNotificationDropdown();
        if (window.currentUser) {
            showNotificationBell();
            initializeNotifications();
        }
    }
}
