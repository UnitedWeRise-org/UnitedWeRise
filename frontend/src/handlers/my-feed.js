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
                if (typeof window.createPostFromFeed === 'function') {
                    window.createPostFromFeed();
                } else {
                    console.error('❌ createPostFromFeed function not available');
                }
                break;
        }
    }

    /**
     * Show My Feed in main content area (like Profile)
     * Migrated from index.html line 2586
     */
    async showMyFeedInMain() {
        console.log('🎯 Showing My Feed in main content area');

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

        console.log('✅ Authenticated user found for My Feed:', window.currentUser.username);

        // Hide other content
        if (typeof window.closeAllPanels === 'function') {
            window.closeAllPanels();
        }
        document.getElementById('profilePanel').style.display = 'none';
        document.getElementById('messagesContainer').style.display = 'none';

        // Show My Feed in main content area
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="my-feed">
                <div class="sticky-composer-wrapper">
                    <div class="quick-post-composer">
                        <textarea id="feedPostContent" placeholder="What's on your mind?" style="width: 100%; min-height: 80px; border: 1px solid #ddd; border-radius: 4px; padding: 0.75rem; font-family: inherit; resize: vertical; box-sizing: border-box;"></textarea>
                        <div style="text-align: right; margin-top: 0.25rem; margin-bottom: 0.25rem;">
                            <span id="feedPostCharCount" style="font-size: 0.85rem; color: #6c757d;">0/500</span>
                            <span id="sectionIndicator" style="display: none; margin-left: 10px; font-size: 0.85rem; color: #1da1f2;">Section 1</span>
                        </div>
                        <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <label for="feedMediaUpload" style="background: #666; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-right: 0.5rem;">
                                    📷 Add Media
                                    <input type="file" id="feedMediaUpload" multiple accept="image/*,video/*" style="display: none;" data-action="handle-post-media-upload">
                                </label>
                                <div id="feedMediaPreview" style="margin-top: 0.5rem;"></div>
                            </div>
                            <div>
                                <button data-action="create-post-from-feed" class="btn">Post</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="myFeedPosts" style="margin-top: 1rem; min-height: 400px; height: calc(100vh - 300px); overflow-y: auto;">
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <p>Loading your personalized feed...</p>
                    </div>
                </div>
            </div>
        `;

        // Load the posts with error handling
        try {
            await this.loadMyFeedPosts();
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

        // Character counter - only shows when approaching max limit
        this.setupCharacterCounter();

        // Apply background if user has one
        if (window.currentUser && window.currentUser.backgroundImage && typeof window.applyUserBackground === 'function') {
            window.applyUserBackground(window.currentUser.backgroundImage);
        }
    }

    /**
     * Setup character counter for post composer
     */
    setupCharacterCounter() {
        const feedPostTextarea = document.getElementById('feedPostContent');
        const feedCharCount = document.getElementById('feedPostCharCount');
        const sectionIndicator = document.getElementById('sectionIndicator');

        if (feedPostTextarea && feedCharCount) {
            // Function to update character count
            const updateCharCounter = () => {
                const text = feedPostTextarea.value;
                const charCount = text.length;

                // Hide section indicator (no longer needed)
                if (sectionIndicator) {
                    sectionIndicator.style.display = 'none';
                }

                // Only show counter when approaching 5000 char limit
                if (charCount >= 4900) {
                    feedCharCount.style.display = 'inline';
                    feedCharCount.textContent = `${charCount}/5000`;

                    if (charCount > 5000) {
                        feedCharCount.style.color = '#dc3545'; // Red
                        feedCharCount.style.fontWeight = 'bold';
                    } else {
                        feedCharCount.style.color = '#ffc107'; // Orange warning
                        feedCharCount.style.fontWeight = 'bold';
                    }
                } else {
                    // Hide counter when under 4900
                    feedCharCount.style.display = 'none';
                }
            };

            // Initial count
            updateCharCounter();

            // Update on input
            feedPostTextarea.addEventListener('input', updateCharCounter);
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
            const response = await window.apiCall('/feed/?limit=15', {
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

        // Use the existing displayPosts function with fallback
        try {
            if (typeof window.displayPosts === 'function') {
                window.displayPosts(posts, 'myFeedPosts', appendMode);
            } else {
                console.warn('⚠️ displayPosts function not available, using fallback');
                this.displayMyFeedPostsFallback(posts, container, appendMode);
            }
        } catch (error) {
            console.error('❌ Error displaying posts:', error);
            this.displayMyFeedPostsFallback(posts, container, appendMode);
        }
    }

    /**
     * Fallback display function for My Feed
     * Migrated from index.html line 2849
     */
    displayMyFeedPostsFallback(posts, container, appendMode = false) {
        console.log(`🔧 Using fallback display for My Feed (${appendMode ? 'append' : 'replace'} mode)`);

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
            const response = await window.apiCall(`/feed/?limit=15&offset=${this.currentFeedOffset}`, {
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
            console.log('✅ Setting up infinite scroll for My Feed');
            myFeedContainer.addEventListener('scroll', () => {
                // Skip if already loading
                if (this.isLoadingMorePosts || !this.hasMorePosts) {
                    return;
                }

                const { scrollTop, scrollHeight, clientHeight } = myFeedContainer;
                const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

                // Only trigger at the very bottom to prevent multiple requests
                if (distanceFromBottom <= 50) {
                    console.log('🔄 Infinite scroll triggered - loading more posts');
                    this.loadMoreMyFeedPosts();
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

console.log('✅ My Feed handlers module loaded (Feed Management System)');