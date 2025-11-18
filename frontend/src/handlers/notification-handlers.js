/**
 * Notification System Handlers
 * Manages notification dropdown, badges, toasts, and initialization
 *
 * Phase 2B-9: THE FINAL SPRINT TO 70% TARGET
 * Functions migrated (9 functions):
 * - createNotificationDropdown
 * - closeNotifications
 * - displayNotifications
 * - getNotificationIcon
 * - getNotificationTitle
 * - updateNotificationBadge
 * - updateNotificationUI
 * - showNotificationToast
 * - initializeNotifications
 *
 * Phase 4D-2: FINAL MIGRATION COMPLETION
 * Additional functions migrated (9 functions):
 * - toggleNotifications
 * - openNotifications
 * - fetchNotifications
 * - markAllNotificationsRead
 * - handleNotificationClick
 * - triggerAdminRefresh
 * - triggerCandidateRefresh
 * - getCachedRelationshipStatus
 * - refreshFriendStatus
 */

// Import dependencies
import { apiClient } from '../modules/core/api/client.js';
import { getTimeAgo } from '../utils/date-helpers.js';
import { apiCall } from '../js/api-compatibility-shim.js';

// ============================================================================
// NOTIFICATION STATE MANAGEMENT
// ============================================================================

let notificationsCache = [];
let notificationDropdownOpen = false;

// ============================================================================
// NOTIFICATION FUNCTIONS (Phase 2B-9)
// ============================================================================

/**
 * Create notification dropdown HTML structure
 * Creates the dropdown container and appends it to the notification section
 */
function createNotificationDropdown() {
    const notificationSection = document.getElementById('notificationSection');
    const dropdown = document.createElement('div');
    dropdown.id = 'notificationDropdown';
    dropdown.className = 'notification-dropdown';
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        width: 350px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    `;

    notificationSection.style.position = 'relative';
    notificationSection.appendChild(dropdown);
}

/**
 * Close notifications dropdown
 * Hides the notification dropdown and updates state
 */
function closeNotifications() {
    notificationDropdownOpen = false;
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

/**
 * Display notifications in the dropdown
 * Renders the notifications list with proper formatting and interaction
 */
function displayNotifications() {
    const dropdown = document.getElementById('notificationDropdown');

    if (notificationsCache.length === 0) {
        dropdown.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #666;">
                <span style="font-size: 2rem;">🔔</span>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }

    // 🎯 OPTIMIZED: Add batch mark-all-read functionality
    const unreadNotifications = notificationsCache.filter(n => !n.read);
    const hasUnread = unreadNotifications.length > 0;

    let html = `
        <div style="padding: 1rem; border-bottom: 1px solid #eee; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
            <h6 style="margin: 0; font-weight: bold;">Notifications</h6>
            ${hasUnread ? `
                <button onclick="markAllNotificationsRead()"
                        style="padding: 0.25rem 0.5rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    Mark All Read (${unreadNotifications.length})
                </button>
            ` : ''}
        </div>
        <div class="notifications-list">
    `;

    notificationsCache.forEach(notification => {
        const timeAgo = getTimeAgo(new Date(notification.createdAt));
        const isUnread = !notification.read;

        html += `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${notification.id}"
                 onclick="handleNotificationClick('${notification.id}', '${notification.type}')"
                 style="padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; ${isUnread ? 'background: #f0f7ff;' : ''} hover:background: #f5f5f5;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="font-size: 1.5rem;">${getNotificationIcon(notification.type)}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: ${isUnread ? 'bold' : 'normal'}; margin-bottom: 0.25rem;">
                            ${getNotificationTitle(notification)}
                        </div>
                        <div style="font-size: 0.85rem; color: #666; overflow: hidden; text-overflow: ellipsis;">
                            ${notification.message || ''}
                        </div>
                        <div style="font-size: 0.8rem; color: #999; margin-top: 0.25rem;">
                            ${timeAgo}
                        </div>
                    </div>
                    ${isUnread ? '<div style="width: 8px; height: 8px; background: #1976d2; border-radius: 50%; flex-shrink: 0;"></div>' : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    dropdown.innerHTML = html;
}

/**
 * Get notification icon based on type
 * Returns appropriate emoji icon for each notification type
 * @param {string} type - The notification type
 * @return {string} - Emoji icon for the notification type
 */
function getNotificationIcon(type) {
    const icons = {
        'friend_request': '👥',
        'friend_accepted': '✅',
        'post_like': '❤️',
        'post_comment': '💬',
        'mention': '🏷️',
        'follow': '👤',
        'system': '⚙️',
        'admin_message': '🛡️',
        'ADMIN_MESSAGE': '🛡️'
    };
    return icons[type] || '🔔';
}

/**
 * Get notification title based on type and content
 * Creates a user-friendly title for each notification type
 * @param {Object} notification - The notification object
 * @return {string} - Formatted notification title
 */
function getNotificationTitle(notification) {
    const data = notification.data || {};

    switch (notification.type) {
        case 'friend_request':
            return `Friend request from ${data.senderName || 'someone'}`;
        case 'friend_accepted':
            return `${data.accepterName || 'Someone'} accepted your friend request`;
        case 'post_like':
            return `${data.likerName || 'Someone'} liked your post`;
        case 'post_comment':
            return `${data.commenterName || 'Someone'} commented on your post`;
        case 'follow':
            return `${data.followerName || 'Someone'} started following you`;
        case 'mention':
            return `${data.mentionerName || 'Someone'} mentioned you`;
        case 'admin_message':
        case 'ADMIN_MESSAGE':
            return `New message from site administrator`;
        default:
            return notification.title || 'New notification';
    }
}

/**
 * Update notification badge count
 * Updates the notification badge display with unread count
 */
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const unreadCount = notificationsCache.filter(n => !n.read).length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Update notification UI with new real-time notification
 * Adds new notifications to the cache and refreshes UI components
 * @param {Object} notification - The new notification object
 */
function updateNotificationUI(notification) {
    console.log('🔔 Updating notification UI with:', notification);

    // Add new notification to cache at the beginning (most recent first)
    if (!notificationsCache.find(n => n.id === notification.id)) {
        notificationsCache.unshift(notification);
    }

    // If notifications dropdown is open, refresh it
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown && dropdown.style.display !== 'none') {
        displayNotifications();
    }

    // Update badge count
    updateNotificationBadge();
}

/**
 * Show notification toast/popup
 * Displays a temporary toast notification for new notifications
 * @param {Object} notification - The notification object to display
 */
function showNotificationToast(notification) {
    // Create simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #4b5c09;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">🔔</span>
            <div>
                <div style="font-weight: bold; font-size: 0.9rem;">${notification.type}</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">${notification.message}</div>
            </div>
        </div>
    `;

    document.body.appendChild(toast);

    // Remove toast after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 4000);
}

/**
 * Initialize notifications when user logs in
 * Sets up the notification system for the current user
 */
function initializeNotifications() {
    if (window.currentUser) {
        fetchNotifications().catch(console.error);

        // Note: No polling - notifications refresh triggered by events
        // For future: Consider WebSocket/SSE for real-time notifications
    }
}

// ============================================================================
// PHASE 4D-2: ADDITIONAL NOTIFICATION FUNCTIONS FROM SCRIPT BLOCK
// ============================================================================

/**
 * Toggle notifications dropdown visibility
 * Main function for notification bell click interaction
 */
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');

    if (!dropdown) {
        createNotificationDropdown();
        return toggleNotifications();
    }

    if (notificationDropdownOpen) {
        closeNotifications();
    } else {
        openNotifications();
    }
}

/**
 * Open notifications dropdown
 * Shows the notifications dropdown and fetches latest notifications
 */
async function openNotifications() {
    notificationDropdownOpen = true;
    const dropdown = document.getElementById('notificationDropdown');

    if (dropdown) {
        dropdown.style.display = 'block';

        try {
            await fetchNotifications();
            displayNotifications();
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            dropdown.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #666;">
                    <span style="font-size: 2rem;">⚠️</span>
                    <p>Failed to load notifications</p>
                </div>
            `;
        }
    }
}

/**
 * Mark all notifications as read
 * Bulk action to mark all current notifications as read
 */
async function markAllNotificationsRead() {
    try {
        const response = await apiCall('/notifications/mark-all-read', {
            method: 'POST'
        });

        if (response.ok) {
            // Update local cache
            notificationsCache.forEach(notification => {
                notification.read = true;
            });

            // Refresh UI
            updateNotificationBadge();
            displayNotifications();

            console.log('✅ All notifications marked as read');
        }
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
    }
}

/**
 * Handle notification item click
 * Processes notification click actions and navigation
 * @param {string} notificationId - The ID of the clicked notification
 * @param {string} notificationType - The type of notification
 */
async function handleNotificationClick(notificationId, notificationType) {
    try {
        // Mark single notification as read
        const response = await apiCall(`/notifications/${notificationId}/read`, {
            method: 'POST'
        });

        if (response.ok) {
            // Update local cache
            const notification = notificationsCache.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
            }

            // Update UI
            updateNotificationBadge();
            displayNotifications();
        }

        // Handle navigation based on notification type
        switch (notificationType) {
            case 'friend_request':
                closeNotifications();
                // Navigate to friends/requests page
                if (typeof window.showFriendsPanel === 'function') {
                    window.showFriendsPanel();
                }
                break;

            case 'post_like':
            case 'post_comment':
                closeNotifications();
                // Navigate to the specific post
                const notification = notificationsCache.find(n => n.id === notificationId);
                if (notification?.data?.postId && typeof window.showPostInFeed === 'function') {
                    window.showPostInFeed(notification.data.postId);
                }
                break;

            case 'admin_message':
            case 'ADMIN_MESSAGE':
                closeNotifications();
                // Navigate to admin messages or announcements
                break;

            default:
                closeNotifications();
                break;
        }
    } catch (error) {
        console.error('Failed to handle notification click:', error);
    }
}

/**
 * Trigger admin refresh
 * Forces refresh of admin-related notifications and data
 */
async function triggerAdminRefresh() {
    if (window.currentUser?.isAdmin) {
        try {
            await fetchNotifications();

            // Trigger other admin refreshes if available
            if (typeof window.loadAdminDashboard === 'function') {
                window.loadAdminDashboard();
            }

            console.log('🛡️ Admin notifications refreshed');
        } catch (error) {
            console.error('Failed to refresh admin notifications:', error);
        }
    }
}

/**
 * Trigger candidate refresh
 * Forces refresh of candidate-related notifications and data
 */
async function triggerCandidateRefresh() {
    if (window.currentUser?.isCandidate) {
        try {
            await fetchNotifications();

            // Trigger other candidate refreshes if available
            if (typeof window.loadCandidateDashboard === 'function') {
                window.loadCandidateDashboard();
            }

            console.log('🗳️ Candidate notifications refreshed');
        } catch (error) {
            console.error('Failed to refresh candidate notifications:', error);
        }
    }
}

/**
 * Get cached relationship status
 * Returns cached relationship status for a user
 * @param {string} userId - The user ID to check relationship status for
 * @return {string|null} - The relationship status or null if not cached
 */
function getCachedRelationshipStatus(userId) {
    // Check if we have this user's relationship status cached
    if (window.relationshipCache && window.relationshipCache[userId]) {
        return window.relationshipCache[userId].status;
    }
    return null;
}

/**
 * Refresh friend status
 * Updates friend status and related UI components
 * @param {string} userId - The user ID to refresh status for
 */
async function refreshFriendStatus(userId) {
    try {
        const response = await apiCall(`/relationships/friend-status/${userId}`, {
            method: 'GET'
        });

        if (response.ok && response.data) {
            // Update relationship cache if it exists
            if (!window.relationshipCache) {
                window.relationshipCache = {};
            }
            window.relationshipCache[userId] = {
                status: response.data.status,
                lastUpdated: new Date().toISOString()
            };

            // Trigger UI updates for friend status
            const event = new CustomEvent('friendStatusUpdated', {
                detail: { userId, status: response.data.status }
            });
            document.dispatchEvent(event);

            console.log(`👥 Friend status refreshed for user ${userId}: ${response.data.status}`);
        }
    } catch (error) {
        console.error('Failed to refresh friend status:', error);
    }
}

// ============================================================================
// HELPER FUNCTIONS (Integration with existing notification system)
// ============================================================================

/**
 * Fetch notifications from API
 * Helper function to retrieve notifications from the backend
 */
async function fetchNotifications() {
    const response = await apiCall('/notifications', {
        method: 'GET'
    });

    if (response.ok) {
        notificationsCache = response.data.notifications || [];
        updateNotificationBadge();
        return notificationsCache;
    } else {
        throw new Error('Failed to fetch notifications');
    }
}

// Export for module system
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
    // Phase 4D-2 additional exports
    toggleNotifications,
    openNotifications,
    fetchNotifications,
    markAllNotificationsRead,
    handleNotificationClick,
    triggerAdminRefresh,
    triggerCandidateRefresh,
    getCachedRelationshipStatus,
    refreshFriendStatus
};

// Global exposure for compatibility (temporary during migration)
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

    // Phase 4D-2 additional global exposure
    window.toggleNotifications = toggleNotifications;
    window.openNotifications = openNotifications;
    window.fetchNotifications = fetchNotifications;
    window.markAllNotificationsRead = markAllNotificationsRead;
    window.handleNotificationClick = handleNotificationClick;
    window.triggerAdminRefresh = triggerAdminRefresh;
    window.triggerCandidateRefresh = triggerCandidateRefresh;
    window.getCachedRelationshipStatus = getCachedRelationshipStatus;
    window.refreshFriendStatus = refreshFriendStatus;

    // Expose state variables for compatibility
    window.notificationsCache = notificationsCache;
    window.notificationDropdownOpen = notificationDropdownOpen;
}