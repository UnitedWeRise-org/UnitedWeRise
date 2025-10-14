/**
 * My Feed Module - Priority 1 Phase 4B Migration
 * Extracted from index.html lines 2586-3003
 * Handles personalized feed functionality with infinite scroll
 *
 * Functions Migrated:
 * - showMyFeedInMain() [lines 2586-2736] - Main content area feed display
 * - loadMyFeedPosts() [lines 2743-2810] - Load initial feed posts
 * - displayMyFeedPosts() [lines 2813-2846] - Display posts with fallback
 * - displayMyFeedPostsFallback() [lines 2849-2884] - Fallback post renderer
 * - loadMoreMyFeedPosts() [lines 2898-2972] - Infinite scroll pagination
 * - setupMyFeedInfiniteScroll() [lines 2975-2997] - Scroll event setup
 * - showMyFeed() [lines 3000-3003] - Main feed entry point
 */

import { getApiBaseUrl } from '../utils/environment.js';
import { apiCall } from '../js/api-compatibility-shim.js';

export class MyFeedHandlers {
    constructor() {
        // Variables for infinite scroll functionality (migrated from global scope)
        this.isLoadingMorePosts = false;
        this.hasMorePosts = true;
        this.currentFeedOffset = 0; // Track total posts loaded

        this.setupEventListeners();
    }

    /**
     * Setup event delegation for my feed actions
     */
    setupEventListeners() {
        document.addEventListener('click', this.handleFeedClick.bind(this));
    }

    /**
     * Handle click events for my feed actions
     */
    handleFeedClick(event) {
        const target = event.target.closest('[data-feed-action], [data-action]');
        if (!target) return;

        event.preventDefault();
        event.stopPropagation();

        const action = target.dataset.feedAction || target.dataset.action;

        switch (action) {
            case 'show-my-feed':
                this.showMyFeed();
                break;
            case 'retry-feed':
                this.loadMyFeedPosts();
                break;
            case 'load-more-posts':
                this.loadMoreMyFeedPosts();
                break;
            case 'create-post-from-feed':
                this.createPostFromFeed();
                break;
        }
    }

    /**
     * Show My Feed in main content area (like Profile)
     * Migrated from index.html line 2586
     */
    async showMyFeedInMain() {
        if (typeof adminDebugLog !== 'undefined') {
            await adminDebugLog('MyFeed', 'Showing My Feed in main content area');
        }

        // Hide Civic Organizing container if open
        const civicOrganizing = document.querySelector('.civic-organizing-container');
        if (civicOrganizing) {
            civicOrganizing.style.display = 'none';
        }

        // Hide other main view systems
        const electionsView = document.querySelector('.elections-main-view');
        if (electionsView) {
            electionsView.style.display = 'none';
        }

        const officialsView = document.querySelector('.officials-main-view');
        if (officialsView) {
            officialsView.style.display = 'none';
        }

        const candidatesView = document.querySelector('.candidates-main-view');
        if (candidatesView) {
            candidatesView.style.display = 'none';
        }

        // Check if user is authenticated (using window.currentUser since tokens are httpOnly)
        if (!window.currentUser) {
            console.log('❌ No authenticated user, showing login prompt');
            document.getElementById('mainContent').innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2>Please log in to view your feed</h2>
                    <button onclick="openAuthModal('login')" class="btn">Log In</button>
                </div>
            `;
            return;
        }

        if (typeof adminDebugLog !== 'undefined') {
            await adminDebugLog('MyFeed', 'Authenticated user found for My Feed', { username: window.currentUser.username });
        }

        // Hide other content
        if (typeof window.closeAllPanels === 'function') {
            window.closeAllPanels();
        }
        document.getElementById('profilePanel').style.display = 'none';
        document.getElementById('messagesContainer').style.display = 'none';

        // Show My Feed in main content area
        const mainContent = document.getElementById('mainContent');

        // Ensure mainContent is visible (critical for mobile)
        mainContent.style.display = 'block';
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';

        // Scroll to top of mainContent on mobile
        const isMobile = window.innerWidth <= 767;
        if (isMobile) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Adjust height calculation for mobile
        // Extend feed container below visible area for pre-loading content
        // Mobile: extend 180px below, Desktop: extend 200px below
        const feedHeight = isMobile ? 'calc(100% + 180px)' : 'calc(100% + 200px)';

        mainContent.innerHTML = `
            <div class="my-feed">
                <div id="myFeedPosts" style="min-height: 400px; height: ${feedHeight}; overflow-y: auto;">
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <p>Loading your personalized feed...</p>
                    </div>
                </div>
            </div>
        `;

        // Render feed toggle UI
        if (window.feedToggle) {
            window.feedToggle.render('myFeedPosts');
        }

        // Load the posts with error handling
        try {
            // Use feed toggle to load the appropriate feed
            if (window.feedToggle) {
                await window.feedToggle.loadFeed(window.feedToggle.getCurrentFeed());
            } else {
                // Fallback to original method
                await this.loadMyFeedPosts();
            }
        } catch (error) {
            console.error('❌ Error loading My Feed posts:', error);
            const feedContainer = document.getElementById('myFeedPosts');
            if (feedContainer) {
                feedContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <p>Error loading feed. Please refresh the page.</p>
                        <button data-feed-action="retry-feed" class="btn">Retry</button>
                    </div>
                `;
            }
        }

        // Setup infinite scroll for My Feed (with safety check)
        try {
            this.setupMyFeedInfiniteScroll();
        } catch (error) {
            console.error('❌ Error setting up infinite scroll:', error);
        }

        // Apply background if user has one
        if (window.currentUser && window.currentUser.backgroundImage && typeof window.applyUserBackground === 'function') {
            window.applyUserBackground(window.currentUser.backgroundImage);
        }
    }

    /**
     * Create post from My Feed composer using UnifiedPostCreator
     * Migrated from /modules/features/feed/my-feed.js to resolve module conflict
     */
    async createPostFromFeed() {
        console.log('🎯 createPostFromFeed() - using UnifiedPostCreator');

        if (!window.unifiedPostCreator) {
            console.error('❌ UnifiedPostCreator not available');
            alert('Post creation system not loaded. Please refresh the page.');
            return false;
        }

        const result = await window.unifiedPostCreator.create({
            type: 'post',
            textareaId: 'feedPostContent',
            mediaInputId: 'feedMediaUpload',
            destination: 'feed',
            tags: ['Public Post'],
            clearAfterSuccess: true,
            onSuccess: (result) => {
                console.log('✅ Post created successfully via UnifiedPostCreator');

                // Update character counter
                const charCount = document.getElementById('feedPostCharCount');
                if (charCount) charCount.textContent = '0/5000';

                // Prepend new post to feed for instant feedback
                if (result.data?.post && window.currentUser) {
                    this.prependUserPostToFeed(result.data.post, window.currentUser);
                } else if (result.data && window.currentUser) {
                    this.prependUserPostToFeed(result.data, window.currentUser);
                }
            },
            onError: (error) => {
                console.error('❌ Post creation failed:', error);
                alert(error.error || 'Error creating post. Please try again.');
            }
        });

        return result.success;
    }

    /**
     * Prepend user's newly created post to the top of My Feed for instant gratification
     * Migrated from /modules/features/feed/my-feed.js
     */
    prependUserPostToFeed(post, user) {
        const feedContainer = document.getElementById('myFeedPosts');
        if (!feedContainer) return;

        console.log('📝 Prepending new post to feed:', {
            id: post.id,
            hasPhotos: !!(post.photos?.length),
            photoCount: post.photos?.length || 0
        });

        // Format the post with user data for display
        const postWithUser = {
            ...post,
            author: {
                id: user.id,
                username: user.username,
                firstName: user.firstName || user.username,
                lastName: user.lastName || '',
                avatar: user.avatar || null,
                verified: user.verified || false
            },
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            isLiked: false,
            createdAt: new Date().toISOString(),
            // Ensure photos array exists (backend might not include it immediately)
            photos: post.photos || []
        };

        try {
            // PRIORITY 1: Use UnifiedPostRenderer for consistent display
            if (window.unifiedPostRenderer) {
                const postHtml = window.unifiedPostRenderer.render(postWithUser, { context: 'feed' });
                // Insert at top of feed
                feedContainer.insertAdjacentHTML('afterbegin', postHtml);
                console.log('✅ Post prepended using UnifiedPostRenderer');
            } else if (window.postComponent) {
                // Fallback to PostComponent
                const postHtml = window.postComponent.renderPost(postWithUser, {
                    showActions: true,
                    showComments: true,
                    inFeed: true
                });
                // Insert at top of feed
                feedContainer.insertAdjacentHTML('afterbegin', postHtml);
                console.log('✅ Post prepended using PostComponent (fallback)');
            } else {
                // Ultimate fallback rendering
                this.displayMyFeedPostsFallback([postWithUser], feedContainer, false);
                console.log('✅ Post prepended using fallback renderer');
            }
        } catch (error) {
            console.error('❌ Error prepending post to feed:', error);
            // Still show success message even if prepend fails
        }
    }

    /**
     * Load posts for My Feed in main area
     * Migrated from index.html line 2743
     */
    async loadMyFeedPosts() {
        console.log('🔄 Loading My Feed posts...');

        // Ensure user is authenticated (using currentUser since tokens are httpOnly)
        if (!window.currentUser) {
            console.error('❌ No authenticated user for My Feed');
            document.getElementById('myFeedPosts').innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>Please log in to view your feed.</p>
                    <button onclick="openAuthModal('login')" class="btn">Log In</button>
                </div>
            `;
            return;
        }

        try {
            console.log('🌐 Making API call to /feed/');
            const response = await apiCall('/feed/?limit=15', {
                method: 'GET'
            });

            console.log('📦 My Feed API Response:', response);

            // Handle different response formats
            let posts = null;
            if (response && response.posts) {
                // Direct posts array
                posts = response.posts;
            } else if (response && response.data && response.data.posts) {
                // Wrapped in data object
                posts = response.data.posts;
            } else if (response && response.ok && response.data && response.data.posts) {
                // Double wrapped
                posts = response.data.posts;
            }

            if (posts && Array.isArray(posts) && posts.length > 0) {
                console.log(`✅ Found ${posts.length} posts for My Feed`);
                // Reset offset for initial load
                this.currentFeedOffset = posts.length;
                this.hasMorePosts = true; // Reset for new feed
                this.displayMyFeedPosts(posts);
            } else {
                console.log('📝 No posts found in My Feed');
                const feedContainer = document.getElementById('myFeedPosts');
                if (feedContainer) {
                    feedContainer.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: #666;">
                            <p>No posts in your feed yet. Follow some users to see their posts here!</p>
                            <p><small>Start by exploring trending topics or searching for users to follow.</small></p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('❌ Feed loading error:', error);
            const feedContainer = document.getElementById('myFeedPosts');
            if (feedContainer) {
                feedContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <p>Unable to load your feed. Please try again.</p>
                        <p><small>Error: ${error.message}</small></p>
                        <button data-feed-action="retry-feed" class="btn">Retry</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Display posts in My Feed
     * Migrated from index.html line 2813
     * UPDATED: Now uses UnifiedPostRenderer for consistent display
     */
    displayMyFeedPosts(posts, appendMode = false) {
        const container = document.getElementById('myFeedPosts');

        if (!container) {
            console.error('❌ My Feed container not found');
            return;
        }

        if (!posts || posts.length === 0) {
            if (!appendMode) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <p>No posts in your feed yet. Follow some users to see their posts here!</p>
                    </div>
                `;
            }
            return;
        }

        console.log(`🎯 ${appendMode ? 'Appending' : 'Displaying'} ${posts.length} posts in My Feed`);

        // PRIORITY 1: Use UnifiedPostRenderer for consistent display
        try {
            if (window.unifiedPostRenderer) {
                console.log('✅ Using UnifiedPostRenderer for My Feed display');
                if (appendMode) {
                    window.unifiedPostRenderer.appendPosts(posts, 'myFeedPosts', { context: 'feed' });
                } else {
                    window.unifiedPostRenderer.renderPostsList(posts, 'myFeedPosts', { context: 'feed' });
                }
            } else {
                console.warn('⚠️ UnifiedPostRenderer not available, using legacy fallback');
                this.displayMyFeedPostsFallback(posts, container, appendMode);
            }
        } catch (error) {
            console.error('❌ Error displaying posts with UnifiedPostRenderer:', error);
            this.displayMyFeedPostsFallback(posts, container, appendMode);
        }
    }

    /**
     * Fallback display function for My Feed
     * Migrated from index.html line 2849
     * UPDATED: Now uses UnifiedPostRenderer as fallback for better consistency
     */
    displayMyFeedPostsFallback(posts, container, appendMode = false) {
        console.log(`🔧 Using enhanced fallback display for My Feed (${appendMode ? 'append' : 'replace'} mode)`);

        // Try to use UnifiedPostRenderer even in fallback
        if (window.unifiedPostRenderer) {
            console.log('✅ UnifiedPostRenderer available in fallback mode');
            try {
                const postsHtml = posts.map(post =>
                    window.unifiedPostRenderer.render(post, { context: 'feed' })
                ).join('');

                if (appendMode) {
                    container.insertAdjacentHTML('beforeend', postsHtml);
                } else {
                    container.innerHTML = postsHtml;
                }
                return;
            } catch (error) {
                console.error('❌ UnifiedPostRenderer failed in fallback, using basic HTML:', error);
            }
        }

        // Ultimate fallback with basic HTML
        let html = '';
        posts.forEach(post => {
            html += `
                <div class="post-item" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;">
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
                                     style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 0.5rem; display: block;"
                                     onclick="window.open('${photo.url}', '_blank')">
                            `).join('')}
                        </div>
                    ` : ''}
                    <div style="color: #666; font-size: 0.9rem;">
                        👍 ${post.likesCount || 0} likes • 💬 ${post.commentsCount || 0} comments
                    </div>
                </div>
            `;
        });

        if (appendMode) {
            container.insertAdjacentHTML('beforeend', html);
        } else {
            container.innerHTML = html;
        }
    }

    /**
     * Load more posts for infinite scroll (corrected implementation for main content area)
     * Migrated from index.html line 2898
     */
    async loadMoreMyFeedPosts() {
        if (this.isLoadingMorePosts || !this.hasMorePosts) return;

        this.isLoadingMorePosts = true;
        const container = document.getElementById('myFeedPosts');

        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'feed-loading';
        loadingDiv.innerHTML = 'Loading more posts...';
        container.appendChild(loadingDiv);

        try {
            // Use offset-based pagination
            console.log(`🔄 Loading more My Feed posts... (offset: ${this.currentFeedOffset})`);
            const response = await apiCall(`/feed/?limit=15&offset=${this.currentFeedOffset}`, {
                method: 'GET'
            });

            console.log('📦 Load more response:', response);

            // Handle different response formats (same as main load)
            let posts = null;
            if (response && response.posts) {
                posts = response.posts;
            } else if (response && response.data && response.data.posts) {
                posts = response.data.posts;
            } else if (response && response.ok && response.data && response.data.posts) {
                posts = response.data.posts;
            }

            // Remove loading indicator
            container.removeChild(loadingDiv);

            if (!posts || posts.length === 0) {
                this.hasMorePosts = false;
                const endDiv = document.createElement('div');
                endDiv.className = 'feed-end-indicator';
                endDiv.style.cssText = 'text-align: center; padding: 1rem; color: #666; font-style: italic;';
                endDiv.innerHTML = "You're all caught up! 🎉";
                container.appendChild(endDiv);
                return;
            }

            // Append new posts to existing feed (pagination now supported)
            console.log(`✅ Appending ${posts.length} more posts (total offset: ${this.currentFeedOffset})`);
            this.displayMyFeedPosts(posts, true); // true = append mode
            this.currentFeedOffset += posts.length; // Increment offset by number of posts loaded

            // Check if backend indicates more posts available
            if (response.pagination && response.pagination.hasMore === false) {
                this.hasMorePosts = false;
                console.log('📝 Backend indicates no more posts available');
            }

        } catch (error) {
            console.error('❌ Error loading more posts:', error);

            // Remove loading indicator
            if (container.contains(loadingDiv)) {
                container.removeChild(loadingDiv);
            }

            const errorDiv = document.createElement('div');
            errorDiv.className = 'feed-error';
            errorDiv.style.cssText = 'text-align: center; padding: 1rem;';
            errorDiv.innerHTML = `
                <p style="color: #666; margin-bottom: 0.5rem;">Failed to refresh feed.</p>
                <button data-feed-action="load-more-posts" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Retry</button>
            `;
            container.appendChild(errorDiv);
        }

        this.isLoadingMorePosts = false;
    }

    /**
     * Scroll event listener for infinite scroll on My Feed
     * Migrated from index.html line 2975
     */
    setupMyFeedInfiniteScroll() {
        const myFeedContainer = document.getElementById('myFeedPosts');
        if (myFeedContainer) {
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('MyFeed', 'Setting up infinite scroll for My Feed');
            }

            let ticking = false;

            myFeedContainer.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        // Infinite scroll logic
                        if (!this.isLoadingMorePosts && this.hasMorePosts) {
                            const { scrollTop, scrollHeight, clientHeight } = myFeedContainer;
                            const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

                            // Only trigger at the very bottom to prevent multiple requests
                            if (distanceFromBottom <= 50) {
                                console.log('🔄 Infinite scroll triggered - loading more posts');
                                this.loadMoreMyFeedPosts();
                            }
                        }

                        ticking = false;
                    });
                    ticking = true;
                }
            });
        } else {
            console.warn('⚠️ myFeedPosts container not found for infinite scroll setup');
        }
    }

    /**
     * New function to show My Feed - personalized feed based on who user follows
     * Migrated from index.html line 3000
     */
    async showMyFeed() {
        // Use the correct main content area implementation
        this.showMyFeedInMain();
    }
}

// Create global instance
const myFeedHandlers = new MyFeedHandlers();

// Export functions for backward compatibility
export const showMyFeedInMain = () => myFeedHandlers.showMyFeedInMain();
export const loadMyFeedPosts = () => myFeedHandlers.loadMyFeedPosts();
export const displayMyFeedPosts = (posts, appendMode) => myFeedHandlers.displayMyFeedPosts(posts, appendMode);
export const loadMoreMyFeedPosts = () => myFeedHandlers.loadMoreMyFeedPosts();
export const setupMyFeedInfiniteScroll = () => myFeedHandlers.setupMyFeedInfiniteScroll();
export const showMyFeed = () => myFeedHandlers.showMyFeed();

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.showMyFeedInMain = showMyFeedInMain;
    window.loadMyFeedPosts = loadMyFeedPosts;
    window.displayMyFeedPosts = displayMyFeedPosts;
    window.loadMoreMyFeedPosts = loadMoreMyFeedPosts;
    window.setupMyFeedInfiniteScroll = setupMyFeedInfiniteScroll;
    window.showMyFeed = showMyFeed;
    window.myFeedHandlers = myFeedHandlers;

    // Backward compatibility for global variables
    window.isLoadingMorePosts = false;
    window.hasMorePosts = true;
    window.currentFeedOffset = 0;
}

// My Feed handlers module loaded (Feed Management System)