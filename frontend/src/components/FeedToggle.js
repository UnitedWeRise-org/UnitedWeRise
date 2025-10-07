/**
 * Feed Toggle Component
 * Manages switching between "Discover" and "Following" feeds
 */

import { getApiBaseUrl } from '../utils/environment.js';

export class FeedToggle {
    constructor() {
        this.currentFeed = 'discover'; // Default to discover feed
        this.caches = {
            following: [],
            discover: []
        };
        this.showNewUserBanner = false;
        this.showEmptyFollowingState = false;

        this.init();
    }

    async init() {
        // Determine smart default based on user's follows and content
        await this.determineDefaultFeed();

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('FeedToggle', `Feed toggle initialized with ${this.currentFeed} feed`);
        }
    }

    /**
     * Smart default feed selection based on user's follow status
     * - If user follows 0 people → Discover
     * - If user follows people but feed is empty → Discover with helpful message
     * - Otherwise → Saved preference or Following
     */
    async determineDefaultFeed() {
        try {
            // Check saved preference first
            const saved = localStorage.getItem('preferredFeed');
            if (saved && (saved === 'discover' || saved === 'following')) {
                this.currentFeed = saved;
                return;
            }

            // Safety check: Ensure apiCall is available before making API requests
            if (typeof window.apiCall !== 'function') {
                console.warn('FeedToggle: apiCall not available yet, defaulting to Discover feed');
                this.currentFeed = 'discover';
                return;
            }

            // Check if user follows anyone
            const followResponse = await window.apiCall('/user/profile', { method: 'GET' });
            const followingCount = followResponse?.data?.followingCount || 0;

            if (followingCount === 0) {
                // No follows → default to Discover
                this.currentFeed = 'discover';
                this.showNewUserBanner = true;
                return;
            }

            // Check if Following feed has posts
            const followingPreview = await window.apiCall('/feed/following?limit=1', { method: 'GET' });
            const hasFollowingPosts = followingPreview?.data?.posts?.length > 0 ||
                                     followingPreview?.posts?.length > 0;

            if (!hasFollowingPosts) {
                // User follows people but no posts → default to Discover, show empty state
                this.currentFeed = 'discover';
                this.showEmptyFollowingState = true;
            } else {
                // User has Following content → default to Following
                this.currentFeed = 'following';
            }
        } catch (error) {
            console.error('Error determining default feed:', error);
            // Fallback to discover on error
            this.currentFeed = 'discover';
        }
    }

    /**
     * Render the toggle UI and insert it into the page
     * @param {string} containerId - ID of container to insert toggle into
     */
    render(containerId = 'myFeedPosts') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Feed toggle: container ${containerId} not found`);
            return;
        }

        // Check if toggle already exists
        if (document.querySelector('.feed-toggle-container')) {
            console.log('Feed toggle already exists, updating state');
            this.updateToggleState();
            this.updateUnreadBadge();
            return;
        }

        const toggleHtml = `
            <div class="feed-toggle-container">
                <div class="feed-toggle">
                    <button class="feed-toggle-btn ${this.currentFeed === 'discover' ? 'active' : ''}" data-feed-type="discover">
                        <span class="feed-toggle-icon">🔥</span>
                        <span class="feed-toggle-label">Discover</span>
                    </button>
                    <button class="feed-toggle-btn ${this.currentFeed === 'following' ? 'active' : ''}" data-feed-type="following">
                        <span class="feed-toggle-icon">👥</span>
                        <span class="feed-toggle-label">Following</span>
                        <span class="unread-badge" style="display: none;"></span>
                    </button>
                </div>
            </div>
        `;

        // Insert at the top of the feed container
        container.insertAdjacentHTML('afterbegin', toggleHtml);

        // Render banners if needed
        if (this.showNewUserBanner) {
            this.renderNewUserBanner(container);
        } else if (this.showEmptyFollowingState) {
            this.renderEmptyFollowingBanner(container);
        }

        // Attach event listeners
        this.attachEventListeners();

        // Setup swipe gestures on mobile
        this.attachSwipeListeners();

        // Update unread badge
        this.updateUnreadBadge();

        // Show swipe hint on mobile (first time only)
        if (this.isMobile()) {
            this.showSwipeHint();
            this.showSwipeTooltip();
        }
    }

    /**
     * Render banner for new users with no follows
     */
    renderNewUserBanner(container) {
        const bannerHtml = `
            <div class="feed-banner new-user-banner" style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">👋</div>
                <div style="font-weight: 600; color: #2e7d32; margin-bottom: 4px;">Welcome to UnitedWeRise!</div>
                <div style="color: #555; font-size: 14px;">
                    Start by following people to see their posts in your Following feed.
                </div>
            </div>
        `;
        const toggleContainer = container.querySelector('.feed-toggle-container');
        if (toggleContainer) {
            toggleContainer.insertAdjacentHTML('afterend', bannerHtml);
        }
    }

    /**
     * Render banner when user follows people but feed is empty
     */
    renderEmptyFollowingBanner(container) {
        const bannerHtml = `
            <div class="feed-banner empty-following-banner" style="background: #fff3e0; border: 1px solid #ff9800; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">📭</div>
                <div style="font-weight: 600; color: #e65100; margin-bottom: 4px;">Following feed is quiet</div>
                <div style="color: #555; font-size: 14px;">
                    The people you follow haven't posted recently. Check back later or explore Discover!
                </div>
            </div>
        `;
        const toggleContainer = container.querySelector('.feed-toggle-container');
        if (toggleContainer) {
            toggleContainer.insertAdjacentHTML('afterend', bannerHtml);
        }
    }

    attachEventListeners() {
        document.querySelectorAll('.feed-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const feedType = btn.dataset.feedType;
                this.switchFeed(feedType);
            });
        });
    }

    updateToggleState() {
        // Update button states
        document.querySelectorAll('.feed-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.feedType === this.currentFeed);
        });
    }

    async switchFeed(feedType) {
        if (this.currentFeed === feedType) {
            console.log(`Already on ${feedType} feed`);
            return;
        }

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('FeedToggle', `Switching feed from ${this.currentFeed} to ${feedType}`);
        }

        this.currentFeed = feedType;
        localStorage.setItem('preferredFeed', feedType);

        // Reset unread count when switching to Following
        if (feedType === 'following') {
            this.resetUnreadCount();
        }

        // Update UI
        this.updateToggleState();

        // Load feed
        await this.loadFeed(feedType);
    }

    async loadFeed(feedType) {
        // Show loading state
        const container = document.getElementById('myFeedPosts');
        if (!container) return;

        // Get all post elements (not the toggle or banners)
        const postElements = Array.from(container.children).filter(el =>
            !el.classList.contains('feed-toggle-container') &&
            !el.classList.contains('feed-banner') &&
            !el.classList.contains('feed-loading')
        );

        // Fade out old posts with animation
        if (postElements.length > 0) {
            postElements.forEach(el => el.classList.add('fade-out'));
            // Wait for fade out animation
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Remove old posts
        postElements.forEach(el => el.remove());

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'feed-loading';
        loadingDiv.style.cssText = 'text-align: center; padding: 2rem; color: #666;';
        loadingDiv.innerHTML = `<p>Loading ${feedType} feed...</p>`;
        container.appendChild(loadingDiv);

        try {
            let posts;
            if (feedType === 'following') {
                posts = await this.loadFollowingFeed();
            } else {
                posts = await this.loadDiscoverFeed();
            }

            // Remove loading indicator
            loadingDiv.remove();

            // Render posts
            this.renderPosts(posts);

            // Fade in new posts
            setTimeout(() => {
                const newPostElements = container.querySelectorAll('.post-item');
                newPostElements.forEach(el => {
                    el.classList.add('fade-in');
                    // Remove class after animation completes
                    setTimeout(() => el.classList.remove('fade-in'), 200);
                });
            }, 50);
        } catch (error) {
            console.error('Feed load error:', error);
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>Unable to load feed. Please try again.</p>
                    <button onclick="window.feedToggle.loadFeed('${feedType}')" class="btn">Retry</button>
                </div>
            `;
        }
    }

    async loadFollowingFeed() {
        console.log('Loading following feed...');

        // Check cache first
        if (this.caches.following.length > 0) {
            console.log('Using cached following feed');
            return this.caches.following;
        }

        // Safety check: Ensure apiCall is available
        if (typeof window.apiCall !== 'function') {
            console.error('FeedToggle: apiCall not available, cannot load Following feed');
            return [];
        }

        // Backend endpoint is /feed/following
        const response = await window.apiCall('/feed/following?limit=15', {
            method: 'GET'
        });

        console.log('Following feed response:', response);

        // Handle different response formats
        let posts = null;
        if (response && response.posts) {
            posts = response.posts;
        } else if (response && response.data && response.data.posts) {
            posts = response.data.posts;
        } else if (response && response.ok && response.data && response.data.posts) {
            posts = response.data.posts;
        }

        if (posts && Array.isArray(posts)) {
            this.caches.following = posts;
            return posts;
        }

        return [];
    }

    async loadDiscoverFeed() {
        console.log('Loading discover feed...');

        // Check cache first
        if (this.caches.discover.length > 0) {
            console.log('Using cached discover feed');
            return this.caches.discover;
        }

        // Safety check: Ensure apiCall is available
        if (typeof window.apiCall !== 'function') {
            console.error('FeedToggle: apiCall not available, cannot load Discover feed');
            return [];
        }

        // Backend endpoint is /feed/ (default discover)
        const response = await window.apiCall('/feed/?limit=15', {
            method: 'GET'
        });

        console.log('Discover feed response:', response);

        // Handle different response formats
        let posts = null;
        if (response && response.posts) {
            posts = response.posts;
        } else if (response && response.data && response.data.posts) {
            posts = response.data.posts;
        } else if (response && response.ok && response.data && response.data.posts) {
            posts = response.data.posts;
        }

        if (posts && Array.isArray(posts)) {
            this.caches.discover = posts;
            return posts;
        }

        return [];
    }

    renderPosts(posts) {
        const container = document.getElementById('myFeedPosts');
        if (!container) return;

        if (!posts || posts.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = 'text-align: center; padding: 2rem; color: #666;';

            if (this.currentFeed === 'following') {
                emptyDiv.innerHTML = `
                    <p>No posts from users you follow yet.</p>
                    <p><small>Try the Discover feed to find interesting people to follow!</small></p>
                `;
            } else {
                emptyDiv.innerHTML = `
                    <p>No posts available right now.</p>
                    <p><small>Check back later for new content!</small></p>
                `;
            }

            container.appendChild(emptyDiv);
            return;
        }

        console.log(`Rendering ${posts.length} posts for ${this.currentFeed} feed`);

        // Use UnifiedPostRenderer if available
        if (window.unifiedPostRenderer) {
            window.unifiedPostRenderer.appendPosts(posts, 'myFeedPosts', { context: 'feed' });
        } else if (window.displayMyFeedPosts) {
            // Fallback to existing feed display function
            window.displayMyFeedPosts(posts, true); // true = append mode
        } else {
            console.warn('No post renderer available');
            this.renderPostsFallback(posts, container);
        }
    }

    renderPostsFallback(posts, container) {
        console.log('Using fallback post renderer');

        posts.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.className = 'post-item';
            postDiv.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;';

            postDiv.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <strong>${post.author?.firstName || post.author?.username || 'Anonymous'}</strong>
                    <span style="color: #666; margin-left: 0.5rem; font-size: 0.9rem;">
                        ${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                    </span>
                </div>
                <div style="margin-bottom: 1rem;">${post.content || ''}</div>
                ${post.photos && post.photos.length > 0 ? `
                    <div style="margin-bottom: 1rem;">
                        ${post.photos.map(photo => `
                            <img src="${photo.url}" alt="Post image"
                                 style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 0.5rem; display: block;">
                        `).join('')}
                    </div>
                ` : ''}
                <div style="color: #666; font-size: 0.9rem;">
                    👍 ${post.likesCount || 0} likes • 💬 ${post.commentsCount || 0} comments
                </div>
            `;

            container.appendChild(postDiv);
        });
    }

    /**
     * Get unread count for Following feed
     */
    async getUnreadCount() {
        try {
            // Safety check: Ensure apiCall is available
            if (typeof window.apiCall !== 'function') {
                return 0;
            }

            // Get last view timestamp
            const lastView = localStorage.getItem('followingLastView');
            if (!lastView) return 0;

            // Fetch Following feed preview
            const response = await window.apiCall('/feed/following?limit=100', { method: 'GET' });
            const posts = response?.data?.posts || response?.posts || [];

            // Count posts newer than last view
            const unreadCount = posts.filter(post =>
                new Date(post.createdAt) > new Date(lastView)
            ).length;

            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('FeedToggle', `Unread count: ${unreadCount}`);
            }

            return Math.min(unreadCount, 99); // Max 99
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    /**
     * Update unread badge on Following button
     */
    async updateUnreadBadge() {
        const followingBtn = document.querySelector('.feed-toggle-btn[data-feed-type="following"]');
        if (!followingBtn) return;

        let badge = followingBtn.querySelector('.unread-badge');

        // If we're on Following feed, hide badge
        if (this.currentFeed === 'following') {
            if (badge) badge.style.display = 'none';
            return;
        }

        // Get unread count
        const count = await this.getUnreadCount();

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge feed-toggle-badge';
                followingBtn.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            if (badge) badge.style.display = 'none';
        }
    }

    /**
     * Reset unread count by saving current timestamp
     */
    resetUnreadCount() {
        localStorage.setItem('followingLastView', new Date().toISOString());
        this.updateUnreadBadge();
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('FeedToggle', 'Reset unread count');
        }
    }

    /**
     * Attach swipe gesture listeners for mobile
     */
    attachSwipeListeners() {
        const container = document.getElementById('myFeedPosts');
        if (!container) return;

        let touchStartX = 0;
        let touchEndX = 0;
        let isDragging = false;

        container.addEventListener('touchstart', (e) => {
            // Only track swipes that start on the feed content area, not on buttons
            const target = e.target;
            if (target.closest('.feed-toggle-btn') || target.closest('button')) {
                return;
            }

            touchStartX = e.changedTouches[0].screenX;
            isDragging = true;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            touchEndX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;

            const swipeDistance = touchEndX - touchStartX;
            const minSwipeDistance = 50;

            if (Math.abs(swipeDistance) < minSwipeDistance) return;

            // Swipe right → Discover, Swipe left → Following
            if (swipeDistance > 0 && this.currentFeed === 'following') {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('FeedToggle', 'Swipe right detected: switching to Discover');
                }
                this.switchFeed('discover');
            } else if (swipeDistance < 0 && this.currentFeed === 'discover') {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('FeedToggle', 'Swipe left detected: switching to Following');
                }
                this.switchFeed('following');
            }
        }, { passive: true });
    }

    /**
     * Show wobble animation hint for swipe gesture
     */
    showSwipeHint() {
        // Check if already shown
        const hasSeenAnimation = localStorage.getItem('hasSeenSwipeAnimation');
        if (hasSeenAnimation) return;

        // Wait 2 seconds after load
        setTimeout(() => {
            const toggle = document.querySelector('.feed-toggle');
            if (!toggle) return;

            // Add wobble class
            toggle.classList.add('wobble-hint');

            // Remove after animation and mark as seen
            setTimeout(() => {
                toggle.classList.remove('wobble-hint');
                localStorage.setItem('hasSeenSwipeAnimation', 'true');
            }, 1000);
        }, 2000);
    }

    /**
     * Show tooltip explaining swipe gesture
     */
    showSwipeTooltip() {
        const shownCount = parseInt(localStorage.getItem('swipeHintShownCount') || '0');
        if (shownCount >= 2) return;

        setTimeout(() => {
            const toggleContainer = document.querySelector('.feed-toggle-container');
            if (!toggleContainer) return;

            // Make container position relative for tooltip positioning
            toggleContainer.style.position = 'relative';

            const tooltip = document.createElement('div');
            tooltip.className = 'swipe-hint-tooltip';
            tooltip.innerHTML = '💡 Swipe to switch feeds';
            toggleContainer.appendChild(tooltip);

            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                tooltip.remove();
                localStorage.setItem('swipeHintShownCount', String(shownCount + 1));
            }, 3000);
        }, 3000); // Show after wobble animation
    }

    /**
     * Check if device is mobile
     */
    isMobile() {
        return window.innerWidth <= 767 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    clearCache(feedType = null) {
        if (feedType) {
            this.caches[feedType] = [];
        } else {
            this.caches.following = [];
            this.caches.discover = [];
        }
    }

    getCurrentFeed() {
        return this.currentFeed;
    }
}

// Create global instance
window.feedToggle = new FeedToggle();

// Export for module use
export default FeedToggle;

console.log('✅ FeedToggle component loaded');
