/**
 * Topic Discovery and Navigation Component
 *
 * Implements the complete topic navigation system:
 * - Trending topics discovery and display
 * - Topic summaries with prevailing positions and critiques
 * - Topic-filtered content browsing
 * - Seamless return to algorithm-based feed
 */

import { apiCall } from '../js/api-compatibility-shim.js';

class TopicNavigation {
    constructor() {
        this.currentNavigationMode = 'algorithm-based'; // or 'topic-filtered'
        this.activeTopic = null;
        this.trendingTopics = [];
        this.isInitialized = false;

        this.init();
        this.setupEventDelegation();
    }

    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-topic-nav-action]');
            if (!target) return;

            const action = target.dataset.topicNavAction;
            const topicId = target.dataset.topicId;

            switch (action) {
                case 'enterTopic':
                    this.enterTopic(topicId);
                    break;
                case 'loadTrendingTopics':
                    this.loadTrendingTopics();
                    break;
                case 'exitTopic':
                    this.exitTopic();
                    break;
                case 'createTopicPost':
                    this.createTopicPost();
                    break;
                case 'loadMoreTopicPosts':
                    this.loadMoreTopicPosts();
                    break;
            }
        });
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // Check if user is already in topic mode
            await this.checkCurrentNavigationState();
            
            // Load trending topics
            await this.loadTrendingTopics();
            
            this.isInitialized = true;
            console.log('📊 Topic Navigation initialized');
            
        } catch (error) {
            console.error('Topic Navigation initialization failed:', error);
        }
    }

    /**
     * Load and display trending topics with retry logic for transient failures
     * @param {number} retryCount - Current retry attempt (internal use)
     * @param {boolean} silent - Whether to suppress error notifications (for retries)
     */
    async loadTrendingTopics(retryCount = 0, silent = false) {
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second base delay

        try {
            const response = await apiCall('/topic-navigation/trending', {
                method: 'GET'
            });

            if (!response.ok || !response.data?.success) {
                throw new Error(response.data?.error || response.error || 'Failed to load trending topics');
            }

            this.trendingTopics = response.data.topics;
            this.renderTrendingTopics();

            console.log(`📈 Loaded ${this.trendingTopics.length} trending topics`);

        } catch (error) {
            console.error('Failed to load trending topics:', error);

            // Retry with exponential backoff for transient failures
            if (retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount); // 1s, 2s, 4s
                console.log(`🔄 Retrying trending topics in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                setTimeout(() => {
                    this.loadTrendingTopics(retryCount + 1, true);
                }, delay);
                return;
            }

            // All retries exhausted - show graceful degradation
            if (!silent) {
                this.showError('Unable to load trending topics at this time');
            }

            // Render placeholder instead of leaving empty
            this.renderTrendingTopicsPlaceholder();
        }
    }

    /**
     * Render placeholder when trending topics fail to load
     */
    renderTrendingTopicsPlaceholder() {
        const container = document.getElementById('trendingTopicsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="trending-topics-placeholder">
                <div class="placeholder-content">
                    <span class="placeholder-icon">📊</span>
                    <p>Trending topics temporarily unavailable</p>
                    <button class="btn btn-secondary btn-sm" data-topic-nav-action="loadTrendingTopics">
                        Try Again
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render trending topics in the UI
     */
    renderTrendingTopics() {
        const container = document.getElementById('trendingTopicsContainer');
        if (!container) return;

        if (this.trendingTopics.length === 0) {
            container.innerHTML = `
                <div class="no-topics">
                    <h3>No trending topics right now</h3>
                    <p>Check back soon as conversations develop!</p>
                </div>
            `;
            return;
        }

        const topicsHtml = this.trendingTopics.map(topic => `
            <div class="topic-card" data-topic-id="${topic.id}">
                <div class="topic-header">
                    <h3 class="topic-title">${topic.title}</h3>
                    <div class="topic-stats">
                        <span class="participants">👥 ${topic.participantCount}</span>
                        <span class="posts">📝 ${topic.postCount} posts</span>
                        ${topic.category ? `<span class="category category-${topic.category}">${topic.category}</span>` : ''}
                    </div>
                </div>
                
                <div class="topic-summary">
                    <p>${topic.summary}</p>
                </div>
                
                ${topic.prevailingPosition || topic.leadingCritique ? `
                    <div class="topic-positions">
                        ${topic.prevailingPosition ? `
                            <div class="prevailing-position">
                                <strong>💭 Main viewpoint:</strong> ${topic.prevailingPosition}
                            </div>
                        ` : ''}
                        ${topic.leadingCritique ? `
                            <div class="leading-critique">
                                <strong>⚡ Key concern:</strong> ${topic.leadingCritique}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="topic-keywords">
                    ${topic.keyWords.map(keyword => `<span class="keyword">#${keyword}</span>`).join('')}
                </div>
                
                <div class="topic-actions">
                    <button class="btn btn-primary" data-topic-nav-action="enterTopic" data-topic-id="${topic.id}">
                        Join Discussion
                    </button>
                    <span class="last-activity">Active ${this.getTimeAgo(topic.lastActivity)}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="trending-header">
                <h2>🔥 Trending Topics</h2>
                <button class="btn-refresh" data-topic-nav-action="loadTrendingTopics">
                    🔄 Refresh
                </button>
            </div>
            <div class="topics-grid">
                ${topicsHtml}
            </div>
        `;
    }

    /**
     * Enter topic navigation mode
     */
    async enterTopic(topicId) {
        try {
            console.log(`🎯 Entering topic: ${topicId}`);
            
            const response = await apiCall(`/topic-navigation/enter/${topicId}`, {
                method: 'POST',
                body: JSON.stringify({ limit: 30 })
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to enter topic mode');
            }

            // Update navigation state
            this.currentNavigationMode = 'topic-filtered';
            this.activeTopic = response.topic;

            // Update UI to show topic mode
            this.renderTopicMode(response.topic, response.posts);
            
            // Show success message
            this.showSuccess(`Switched to: ${response.topic.title}`);

        } catch (error) {
            console.error('Failed to enter topic:', error);
            this.showError('Unable to enter topic discussion');
        }
    }

    /**
     * Render topic-filtered mode UI
     */
    renderTopicMode(topic, posts) {
        // Update main content area
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="topic-mode-container">
                <!-- Topic Header -->
                <div class="topic-mode-header">
                    <button class="btn-back" data-topic-nav-action="exitTopic">
                        ← Back to Feed
                    </button>
                    <div class="active-topic-info">
                        <h1>${topic.title}</h1>
                        <p class="topic-description">${topic.summary}</p>
                        
                        ${topic.prevailingPosition || topic.leadingCritique ? `
                            <div class="topic-context">
                                ${topic.prevailingPosition ? `
                                    <div class="context-item">
                                        <strong>💭 Prevailing view:</strong> ${topic.prevailingPosition}
                                    </div>
                                ` : ''}
                                ${topic.leadingCritique ? `
                                    <div class="context-item">
                                        <strong>⚡ Main critique:</strong> ${topic.leadingCritique}
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="topic-meta">
                            <span>👥 ${topic.participantCount} participants</span>
                            <span>📝 ${topic.postCount} posts</span>
                            ${topic.keyWords.map(kw => `<span class="keyword">#${kw}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- Topic Composer -->
                <div class="topic-composer">
                    <textarea 
                        id="topicPostContent" 
                        placeholder="Share your thoughts on this topic..."
                        rows="3">
                    </textarea>
                    <div class="composer-actions">
                        <button class="btn btn-primary" data-topic-nav-action="createTopicPost">
                            Post to Topic
                        </button>
                        <span class="topic-hint">💡 Your post will be part of this topic discussion</span>
                    </div>
                </div>

                <!-- Topic Posts -->
                <div class="topic-posts" id="topicPostsList">
                    ${this.renderTopicPosts(posts)}
                </div>
                
                <!-- Load More -->
                <div class="load-more-container">
                    <button class="btn btn-secondary" data-topic-nav-action="loadMoreTopicPosts">
                        Load More Posts
                    </button>
                </div>
            </div>
        `;

        // Update navigation indicator
        this.updateNavigationIndicator();
    }

    /**
     * Render posts for topic mode
     */
    renderTopicPosts(posts) {
        if (!posts || posts.length === 0) {
            return `
                <div class="no-posts">
                    <h3>Be the first to contribute!</h3>
                    <p>Start the conversation on this topic.</p>
                </div>
            `;
        }

        return posts.map(post => {
            // Use existing PostComponent if available, otherwise basic rendering
            if (window.postComponent) {
                return window.postComponent.renderPost(post, {
                    showActions: true,
                    showComments: true,
                    showAuthor: true,
                    showTimestamp: true,
                    compactView: false,
                    topicContext: this.activeTopic?.id
                });
            } else {
                return `
                    <div class="post-card topic-post">
                        <div class="post-header">
                            <span class="author">${post.author?.username || 'Anonymous'}</span>
                            <span class="timestamp">${this.getTimeAgo(post.createdAt)}</span>
                        </div>
                        <div class="post-content">${post.content}</div>
                        <div class="post-actions">
                            <span class="likes">👍 ${post.likesCount || 0}</span>
                            <span class="comments">💬 ${post.commentsCount || 0}</span>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    /**
     * Exit topic mode and return to algorithm feed
     */
    async exitTopic() {
        try {
            console.log('🔙 Exiting topic mode');
            
            const response = await apiCall('/topic-navigation/exit', {
                method: 'POST'
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to exit topic mode');
            }

            // Update navigation state
            this.currentNavigationMode = 'algorithm-based';
            this.activeTopic = null;

            // Restore algorithm-based feed
            this.restoreAlgorithmFeed(response.posts);
            
            this.showSuccess('Returned to main feed');

        } catch (error) {
            console.error('Failed to exit topic:', error);
            this.showError('Unable to return to main feed');
        }
    }

    /**
     * Create a post in topic context
     */
    async createTopicPost() {
        const content = document.getElementById('topicPostContent')?.value?.trim();
        
        if (!content) {
            this.showError('Please enter some content for your post');
            return;
        }

        if (!this.activeTopic) {
            this.showError('No active topic');
            return;
        }

        try {
            const response = await apiCall(`/topic-navigation/${this.activeTopic.id}/post`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to create topic post');
            }

            // Clear the composer
            document.getElementById('topicPostContent').value = '';
            
            // Reload topic posts to show the new post
            await this.loadMoreTopicPosts(true);
            
            this.showSuccess('Post added to topic discussion!');

        } catch (error) {
            console.error('Failed to create topic post:', error);
            this.showError('Unable to create post');
        }
    }

    /**
     * Load more posts for current topic
     */
    async loadMoreTopicPosts(refresh = false) {
        if (!this.activeTopic) return;

        try {
            const currentPosts = document.querySelectorAll('.topic-post').length;
            const offset = refresh ? 0 : currentPosts;

            const response = await apiCall(`/topic-navigation/${this.activeTopic.id}/posts?offset=${offset}&limit=20`);

            if (!response.success) {
                throw new Error(response.error || 'Failed to load topic posts');
            }

            const postsContainer = document.getElementById('topicPostsList');
            if (refresh) {
                postsContainer.innerHTML = this.renderTopicPosts(response.posts);
            } else {
                postsContainer.innerHTML += this.renderTopicPosts(response.posts);
            }

        } catch (error) {
            console.error('Failed to load topic posts:', error);
            this.showError('Unable to load more posts');
        }
    }

    /**
     * Check current navigation state on initialization
     */
    async checkCurrentNavigationState() {
        try {
            const response = await apiCall('/topic-navigation/current');
            
            if (response.success && response.navigationMode === 'topic-filtered') {
                this.currentNavigationMode = 'topic-filtered';
                this.activeTopic = response.activeTopic;
                this.updateNavigationIndicator();
            }

        } catch (error) {
            console.log('Could not check navigation state:', error);
        }
    }

    /**
     * Restore algorithm-based feed
     */
    restoreAlgorithmFeed(posts) {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        // This would integrate with your existing feed rendering
        if (window.feed && window.feed.renderPosts) {
            window.feed.renderPosts(posts);
        } else {
            // Fallback basic rendering
            mainContent.innerHTML = `
                <div class="algorithm-feed">
                    <h2>Your Feed</h2>
                    <div class="posts-container">
                        ${posts.map(post => `
                            <div class="post-card">
                                <div class="post-content">${post.content}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        this.updateNavigationIndicator();
    }

    /**
     * Update navigation indicator in UI
     */
    updateNavigationIndicator() {
        const indicator = document.getElementById('navigationIndicator');
        if (!indicator) return;

        if (this.currentNavigationMode === 'topic-filtered' && this.activeTopic) {
            indicator.innerHTML = `
                <div class="nav-indicator topic-mode">
                    <span class="mode-label">Topic:</span>
                    <span class="topic-name">${this.activeTopic.title}</span>
                    <button class="btn-exit-topic" data-topic-nav-action="exitTopic">✕</button>
                </div>
            `;
        } else {
            indicator.innerHTML = `
                <div class="nav-indicator algorithm-mode">
                    <span class="mode-label">Main Feed</span>
                </div>
            `;
        }
    }

    // Utility methods
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize globally
window.topicNavigation = new TopicNavigation();