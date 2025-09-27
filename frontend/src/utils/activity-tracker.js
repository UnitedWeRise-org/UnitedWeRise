/**
 * User Activity Tracker
 * Tracks user activity and engagement for analytics and session management
 *
 * Functions to be migrated:
 * - startActivityTracking
 */

console.log('📊 Loading activity tracker...');

// Auto-update activity every 2 minutes when user is active
let activityTimer = null;

// Update user activity (call this when user is active)
async function updateUserActivity() {
    if (!window.currentUser) return;

    try {
        await window.apiCall('/users/activity', {
            method: 'POST',
            body: JSON.stringify({ timestamp: new Date().toISOString() })
        });
    } catch (error) {
        // Silently fail - activity tracking is not critical
        console.debug('Failed to update user activity:', error);
    }
}

function startActivityTracking() {
    if (activityTimer) clearInterval(activityTimer);

    // Update immediately
    updateUserActivity();

    // Then update every 2 minutes
    activityTimer = setInterval(updateUserActivity, 120000);

    // Track user interactions
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => {
            // Throttle to once per minute max
            if (!window.lastActivityUpdate || (Date.now() - window.lastActivityUpdate) > 60000) {
                window.lastActivityUpdate = Date.now();
                updateUserActivity();
            }
        }, { passive: true });
    });
}

// Start activity tracking when user logs in
window.addEventListener('load', () => {
    if (window.currentUser) {
        setTimeout(startActivityTracking, 2000);
    }
});

// Export for module system
export {
    startActivityTracking,
    updateUserActivity
};

// Global exposure for compatibility (temporary during migration)
if (typeof window !== 'undefined') {
    window.startActivityTracking = startActivityTracking;
    window.updateUserActivity = updateUserActivity;
    console.log('🌐 Activity tracker available globally');
}

console.log('✅ Activity tracker loaded');