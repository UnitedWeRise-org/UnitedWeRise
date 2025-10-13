/**
 * Saved Posts View Component
 * Displays user's saved posts with infinite scroll
 */

import { apiCall } from '../js/api-compatibility-shim.js';

class SavedPostsView {
    constructor() {
        this.currentPage = 0;
        this.limit = 20;
        this.hasMore = true;
        this.loading = false;
        this.posts = [];
        this.apiBase = window.API_BASE || '/api';
    }

    /**
     * Show saved posts view
     */
    async show() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            console.error('SavedPostsView: mainContent not found');
            return;
        }

        // Reset state
        this.currentPage = 0;
        this.hasMore = true;
        this.posts = [];

        // Render container
        mainContent.innerHTML = `
            <div class="saved-posts-container">
                <div class="saved-posts-header">
                    <h2>🔖 Saved Posts</h2>
                    <p class="saved-posts-subtitle">Posts you've bookmarked for later</p>
                </div>
                <div id="saved-posts-list" class="saved-posts-list"></div>
                <div id="saved-posts-loader" class="saved-posts-loader" style="display: none;">
                    <div class="spinner"></div>
                    <p>Loading saved posts...</p>
                </div>
                <div id="saved-posts-empty" class="saved-posts-empty" style="display: none;">
                    <div class="empty-state-icon">🔖</div>
                    <h3>No saved posts yet</h3>
                    <p>Tap the bookmark icon on any post to save it for later</p>
                </div>
            </div>
        `;

        // Load initial posts
        await this.loadPosts();

        // Set up infinite scroll
        this.setupInfiniteScroll();
    }

    /**
     * Load saved posts from API
     */
    async loadPosts(append = false) {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.showLoader(true);

        try {
            const offset = this.currentPage * this.limit;
            const response = await apiCall(`/posts/saved?limit=${this.limit}&offset=${offset}`, {
                method: 'GET'
            });

            if (!response.ok) {
                console.error('Failed to load saved posts:', response.data);
                this.showError('Failed to load saved posts');
                return;
            }

            const data = response.data.data;
            const posts = data.posts || [];
            const total = data.total || 0;

            // Mark all posts as saved
            posts.forEach(post => {
                post.isSaved = true;
            });

            if (append) {
                this.posts = [...this.posts, ...posts];
            } else {
                this.posts = posts;
            }

            this.hasMore = data.hasMore || false;
            this.currentPage++;

            // Render posts
            this.renderPosts(append);

        } catch (error) {
            console.error('Error loading saved posts:', error);
            this.showError('Failed to load saved posts');
        } finally {
            this.loading = false;
            this.showLoader(false);
        }
    }

    /**
     * Render posts to the list
     */
    renderPosts(append = false) {
        const listContainer = document.getElementById('saved-posts-list');
        const emptyState = document.getElementById('saved-posts-empty');

        if (!listContainer) return;

        if (this.posts.length === 0) {
            listContainer.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Use PostComponent to render posts
        if (!window.postComponent) {
            console.error('SavedPostsView: PostComponent not available');
            return;
        }

        if (!append) {
            listContainer.innerHTML = '';
        }

        // Render each post
        this.posts.forEach((post, index) => {
            if (append && index < (this.currentPage - 1) * this.limit) {
                return; // Skip already rendered posts
            }

            const postHTML = window.postComponent.renderPost(post, {
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true
            });

            const postElement = document.createElement('div');
            postElement.innerHTML = postHTML;
            listContainer.appendChild(postElement.firstElementChild);
        });
    }

    /**
     * Show/hide loader
     */
    showLoader(show) {
        const loader = document.getElementById('saved-posts-loader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const listContainer = document.getElementById('saved-posts-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="saved-posts-error">
                    <p>${message}</p>
                    <button onclick="window.savedPostsView.loadPosts()" class="btn btn-primary">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Set up infinite scroll
     */
    setupInfiniteScroll() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        // Remove existing listener if any
        if (this.scrollHandler) {
            mainContent.removeEventListener('scroll', this.scrollHandler);
        }

        this.scrollHandler = () => {
            const scrollTop = mainContent.scrollTop;
            const scrollHeight = mainContent.scrollHeight;
            const clientHeight = mainContent.clientHeight;

            // Load more when user is 500px from bottom
            if (scrollTop + clientHeight >= scrollHeight - 500) {
                this.loadPosts(true);
            }
        };

        mainContent.addEventListener('scroll', this.scrollHandler);
    }

    /**
     * Clean up when view is closed
     */
    cleanup() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent && this.scrollHandler) {
            mainContent.removeEventListener('scroll', this.scrollHandler);
        }
        this.scrollHandler = null;
    }
}

// Initialize and export
const savedPostsView = new SavedPostsView();
window.savedPostsView = savedPostsView;

console.log('SavedPostsView: Component initialized');

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SavedPostsView;
}
