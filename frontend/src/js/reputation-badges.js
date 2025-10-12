/**
 * @module js/reputation-badges
 * @description Reputation Badge System - Color-coded badges based on reputation score
 * Green: 95-100, Yellow: 30-49, Brown: 0-29, Nothing: 50-94
 * Migrated to ES6 modules: October 11, 2025 (Batch 5)
 */
import { apiCall } from './api-compatibility-shim.js';

/**
 * Get badge color and text based on reputation score
 */
function getReputationBadge(score) {
    if (score >= 95) {
        return {
            color: 'green',
            text: 'Trusted',
            class: 'reputation-badge-green',
            show: true
        };
    } else if (score >= 50) {
        return {
            color: null,
            text: null,
            class: null,
            show: false
        };
    } else if (score >= 30) {
        return {
            color: 'yellow',
            text: 'Mixed',
            class: 'reputation-badge-yellow',
            show: true
        };
    } else {
        return {
            color: 'brown',
            text: 'Low Trust',
            class: 'reputation-badge-brown',
            show: true
        };
    }
}

/**
 * Create badge HTML element
 */
function createReputationBadgeElement(score, options = {}) {
    const badge = getReputationBadge(score);
    
    if (!badge.show) {
        return null;
    }

    const badgeElement = document.createElement('span');
    badgeElement.className = `reputation-badge ${badge.class}`;
    badgeElement.textContent = badge.text;
    badgeElement.title = `Community Reputation: ${score}/100`;

    // Add inline styles for immediate visibility (can be moved to CSS later)
    const styles = {
        'reputation-badge-green': {
            backgroundColor: '#22c55e',
            color: 'white',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '12px',
            fontWeight: '500',
            marginLeft: '4px'
        },
        'reputation-badge-yellow': {
            backgroundColor: '#eab308',
            color: 'white',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '12px',
            fontWeight: '500',
            marginLeft: '4px'
        },
        'reputation-badge-brown': {
            backgroundColor: '#a16207',
            color: 'white',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '12px',
            fontWeight: '500',
            marginLeft: '4px'
        }
    };

    const style = styles[badge.class];
    if (style) {
        Object.assign(badgeElement.style, style);
    }

    return badgeElement;
}

/**
 * Add reputation badge to user name in posts
 */
function addReputationBadgeToPost(postElement, userScore) {
    if (!postElement || userScore === null || userScore === undefined) {
        return;
    }

    // Find the username element (adjust selector based on your HTML structure)
    const usernameElement = postElement.querySelector('.post-author-name, .username, .author-name');
    
    if (usernameElement && !usernameElement.querySelector('.reputation-badge')) {
        const badge = createReputationBadgeElement(userScore);
        if (badge) {
            usernameElement.appendChild(badge);
        }
    }
}

/**
 * Add reputation badge to profile display
 */
function addReputationBadgeToProfile(profileElement, userScore) {
    if (!profileElement || userScore === null || userScore === undefined) {
        return;
    }

    // Find the profile name element
    const nameElement = profileElement.querySelector('.profile-name, .user-name, h2, h3');
    
    if (nameElement && !nameElement.querySelector('.reputation-badge')) {
        const badge = createReputationBadgeElement(userScore);
        if (badge) {
            nameElement.appendChild(badge);
        }
    }
}

/**
 * Update all visible posts with reputation badges
 */
function updateAllPostBadges() {
    const posts = document.querySelectorAll('.post, [data-post-id]');
    
    posts.forEach(post => {
        const authorReputationAttr = post.getAttribute('data-author-reputation');
        const authorReputation = authorReputationAttr ? parseInt(authorReputationAttr) : null;
        
        if (authorReputation !== null) {
            addReputationBadgeToPost(post, authorReputation);
        }
    });
}

/**
 * Update profile with reputation badge
 */
function updateProfileBadge(userScore) {
    const profileElements = document.querySelectorAll('.profile-container, .user-profile, #profile-content');
    
    profileElements.forEach(profile => {
        addReputationBadgeToProfile(profile, userScore);
    });
}

/**
 * Initialize reputation badge system
 */
function initializeReputationBadges() {
    console.log('🏆 Initializing reputation badge system...');
    
    // Update existing posts
    updateAllPostBadges();
    
    // Set up mutation observer for new posts
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the added node is a post
                    if (node.classList && (node.classList.contains('post') || node.hasAttribute('data-post-id'))) {
                        const authorReputationAttr = node.getAttribute('data-author-reputation');
                        const authorReputation = authorReputationAttr ? parseInt(authorReputationAttr) : null;
                        
                        if (authorReputation !== null) {
                            addReputationBadgeToPost(node, authorReputation);
                        }
                    }
                    
                    // Check for posts within the added node
                    const childPosts = node.querySelectorAll && node.querySelectorAll('.post, [data-post-id]');
                    if (childPosts) {
                        childPosts.forEach(post => {
                            const authorReputationAttr = post.getAttribute('data-author-reputation');
                            const authorReputation = authorReputationAttr ? parseInt(authorReputationAttr) : null;
                            
                            if (authorReputation !== null) {
                                addReputationBadgeToPost(post, authorReputation);
                            }
                        });
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Reputation badge system initialized');
}

/**
 * Get current user's reputation and update profile
 */
async function loadCurrentUserReputation() {
    try {
        const response = await apiCall('/reputation/me');

        if (response.ok) {
            const data = response.data;
            updateProfileBadge(data.reputation.current);
            
            // Store in global for other components to use
            window.currentUserReputation = data.reputation.current;
        }
    } catch (error) {
        console.warn('Failed to load current user reputation:', error);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReputationBadges);
} else {
    initializeReputationBadges();
}

// Load current user reputation if logged in
const checkAndLoadReputation = () => {
    const isAuthenticated = window.authUtils?.isUserAuthenticated() ||
                           window.currentUser ||
                           (window.userState && window.userState.current) ||
                           (localStorage.getItem('authToken') && localStorage.getItem('authToken') !== 'null');

    if (isAuthenticated) {
        loadCurrentUserReputation();
    }
};

// Try immediately, then try again after auth system loads
checkAndLoadReputation();
setTimeout(checkAndLoadReputation, 2000);

// ES6 Module Exports
export {
    getReputationBadge,
    createReputationBadgeElement,
    addReputationBadgeToPost,
    addReputationBadgeToProfile,
    updateAllPostBadges,
    updateProfileBadge,
    loadCurrentUserReputation,
    initializeReputationBadges
};

// Export as default object for convenience
export default {
    getReputationBadge,
    createReputationBadgeElement,
    addReputationBadgeToPost,
    addReputationBadgeToProfile,
    updateAllPostBadges,
    updateProfileBadge,
    loadCurrentUserReputation,
    initializeReputationBadges
};

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.ReputationBadges = {
        getReputationBadge,
        createReputationBadgeElement,
        addReputationBadgeToPost,
        addReputationBadgeToProfile,
        updateAllPostBadges,
        updateProfileBadge,
        loadCurrentUserReputation,
        initializeReputationBadges
    };
}