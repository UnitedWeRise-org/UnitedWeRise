/**
 * Reputation System Integration
 * 
 * Ensures reputation badges are properly displayed when posts are loaded
 * Integrates with existing feed, profile, and post systems
 */

// Override existing post rendering to include reputation data
(function() {
    'use strict';
    
    console.log('🏆 Loading reputation system integration...');
    
    // Wait for page to load and other systems to initialize
    document.addEventListener('DOMContentLoaded', function() {
        initializeReputationIntegration();
    });
    
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
    
    // Enhance existing API calls to include reputation data
    if (window.apiCall) {
        const originalApiCall = window.apiCall;
        
        window.apiCall = async function(endpoint, options = {}) {
            const result = await originalApiCall(endpoint, options);
            
            // If this is a posts response, ensure reputation data is included
            if (result.ok && result.data) {
                enhancePostDataWithReputation(result.data);
            }
            
            return result;
        };
    }
    
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
    
    // Helper function to manually trigger reputation badge updates
    window.updateReputationBadges = function() {
        if (window.ReputationBadges) {
            window.ReputationBadges.updateAllPostBadges();
            if (window.currentUserReputation !== undefined) {
                window.ReputationBadges.updateProfileBadge(window.currentUserReputation);
            }
        }
    };
    
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
    
})();