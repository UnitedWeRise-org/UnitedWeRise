/**
 * Date Formatting and Display Utilities
 * Provides date and time formatting functions for consistent display
 *
 * Functions migrated:
 * - getTimeAgo (COMPLETE)
 */

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
}

// Export for module system
export {
    getTimeAgo
};

// Global exposure for compatibility (temporary during migration)
if (typeof window !== 'undefined') {
    window.getTimeAgo = getTimeAgo;
}