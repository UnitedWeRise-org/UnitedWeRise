/**
 * @module js/reputation-integration
 * @description Decorates API calls with reputation data for civic engagement tracking
 *
 * Wraps window.apiCall to automatically inject reputation scoring data
 * into API requests for quest/badge progress tracking.
 *
 * Integrates with feed, profile, and post systems to display reputation badges.
 *
 * Migrated to ES6 modules: October 11, 2025 (Batch 3)
 */

import { apiCall as baseApiCall } from './api-manager.js';

console.log('🏆 Loading reputation system integration module...');

// ============================================================================
// API CALL DECORATION
// ============================================================================

/**
 * Decorated API call that injects reputation data tracking
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Object>} API response with reputation data enhanced
 */
async function apiCall(endpoint, options = {}) {
    // Call base apiCall
    const result = await baseApiCall(endpoint, options);

    // If this is a posts response, ensure reputation data is included
    if (result.ok && result.data) {
        enhancePostDataWithReputation(result.data);
    }

    return result;
}

/**
 * Enhance post data with reputation information
 * @param {Object} data - API response data
 */
function enhancePostDataWithReputation(data) {
    // Handle different response structures
    if (data.posts && Array.isArray(data.posts)) {
        data.posts.forEach(post => {
            if (!post.authorReputation && post.author) {
                post.authorReputation = 70; // Default reputation for existing posts
            }
        });
    } else if (data.post) {
        if (!data.post.authorReputation && data.post.author) {
            data.post.authorReputation = 70; // Default reputation
        }
    }
}

// ============================================================================
// SYSTEM INTEGRATION
// ============================================================================

/**
 * Initialize reputation system integration
 */
function initializeReputationIntegration() {
    console.log('🔗 Initializing reputation integration...');

    // Hook into existing feed loading
    enhanceFeedSystem();

    // Hook into existing post loading
    enhancePostSystem();

    // Hook into profile system
    enhanceProfileSystem();

    console.log('✅ Reputation integration initialized');
}

/**
 * Enhance feed system with reputation badges
 */
function enhanceFeedSystem() {
    // Monitor for feed updates and add reputation badges
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    addReputationBadgesToNewContent(node);
                }
            });
        });
    });

    observer.observe(feedContainer, {
        childList: true,
        subtree: true
    });
}

/**
 * Enhance post system with reputation data
 */
function enhancePostSystem() {
    // Enhance PostComponent if it exists
    if (window.PostComponent && window.PostComponent.prototype.renderPost) {
        const originalRenderPost = window.PostComponent.prototype.renderPost;

        window.PostComponent.prototype.renderPost = function(post, options = {}) {
            // Call original render method
            const html = originalRenderPost.call(this, post, options);

            // The HTML should already have data-author-reputation attribute
            // The reputation badges system will automatically pick it up
            return html;
        };
    }
}

/**
 * Enhance profile system with reputation badges
 */
function enhanceProfileSystem() {
    // Hook into profile loading to add badges
    if (window.Profile && window.Profile.prototype.renderProfile) {
        const originalRenderProfile = window.Profile.prototype.renderProfile;

        window.Profile.prototype.renderProfile = function(container) {
            // Call original render method
            originalRenderProfile.call(this, container);

            // Add reputation badge to profile after rendering
            setTimeout(() => {
                if (window.ReputationBadges && window.currentUserReputation !== undefined) {
                    window.ReputationBadges.updateProfileBadge(window.currentUserReputation);
                }
            }, 100);
        };
    }
}

/**
 * Add reputation badges to newly loaded content
 * @param {HTMLElement} node - DOM node to scan for posts
 */
function addReputationBadgesToNewContent(node) {
    // Find all posts in the new content
    const posts = node.querySelectorAll ?
        node.querySelectorAll('.post-component, [data-post-id]') :
        [];

    posts.forEach(post => {
        const reputation = post.getAttribute('data-author-reputation');
        if (reputation && window.ReputationBadges) {
            window.ReputationBadges.addReputationBadgeToPost(post, parseInt(reputation));
        }
    });

    // Check if the node itself is a post
    if (node.classList && (node.classList.contains('post-component') || node.hasAttribute('data-post-id'))) {
        const reputation = node.getAttribute('data-author-reputation');
        if (reputation && window.ReputationBadges) {
            window.ReputationBadges.addReputationBadgeToPost(node, parseInt(reputation));
        }
    }
}

/**
 * Manually trigger reputation badge updates
 */
function updateReputationBadges() {
    if (window.ReputationBadges) {
        window.ReputationBadges.updateAllPostBadges();
        if (window.currentUserReputation !== undefined) {
            window.ReputationBadges.updateProfileBadge(window.currentUserReputation);
        }
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeReputationIntegration();
});

// Auto-update badges when auth state changes
document.addEventListener('userLoggedIn', function() {
    setTimeout(() => {
        if (window.ReputationBadges) {
            window.ReputationBadges.loadCurrentUserReputation();
        }
    }, 1000);
});

document.addEventListener('userLoggedOut', function() {
    window.currentUserReputation = undefined;
});

// ============================================================================
// EXPORTS
// ============================================================================

// Export decorated apiCall as default
export { apiCall };

// Export base apiCall for direct access if needed
export { baseApiCall };

// Export helper functions
export { updateReputationBadges, enhancePostDataWithReputation };

// Maintain global access during transition
// CRITICAL: Override window.apiCall with decorated version
if (typeof window !== 'undefined') {
    window.apiCall = apiCall;
    window.updateReputationBadges = updateReputationBadges;
}
