/**
 * Trending Handlers Module - Priority 2 Phase 4B Migration
 * Extracted from index.html lines 1361-1555
 * Handles advanced trending functionality, topic modes, and geographic filtering
 *
 * Functions Migrated:
 * - loadTrendingUpdates() [lines 1361-1407] - Load trending content with AI topics
 * - enterTopicMode() [lines 1422-1455] - Enter filtered topic view
 * - exitTopicMode() [lines 1461-1475] - Exit topic mode and return to normal feed
 * - showTopicModeHeader() [lines 1477-1510] - Display topic mode UI header
 * - displayTopicFilteredFeed() [lines 1512-1555] - Show topic-specific posts
 * - getCurrentGeographicScope() [lines 1415-1419] - Get user's geographic scope
 */

import { getApiBaseUrl } from '../utils/environment.js';
import { apiCall } from '../js/api-compatibility-shim.js';

export class TrendingHandlers {
    constructor() {
        // Variables for trending functionality (migrated from global scope)
        this.allTrendingPosts = [];
        this.allTrendingTopics = [];
        this.trendingExpanded = false;
        this.displayMode = 'topics'; // 'topics' or 'posts'
        this.currentTopicMode = null; // Track if user is in topic-filtered mode

        this.setupEventListeners();
    }

    /**
     * Setup event delegation for trending actions
     */
    setupEventListeners() {
        document.addEventListener('click', this.handleTrendingClick.bind(this));
    }

    /**
     * Handle click events for trending actions
     */
    handleTrendingClick(event) {
        const target = event.target.closest('[data-trending-action]');
        if (!target) return;

        event.preventDefault();
        event.stopPropagation();

        const action = target.dataset.trendingAction;
        const topicId = target.dataset.topicId;

        switch (action) {
            case 'enter-topic-mode':
                if (topicId) {
                    this.enterTopicMode(topicId);
                }
                break;
            case 'exit-topic-mode':
                this.exitTopicMode();
                break;
            case 'load-trending-updates':
                this.loadTrendingUpdates();
                break;
        }
    }

    /**
     * Load trending updates with AI topics and geographic scope
     * Migrated from index.html line 1361
     */
    async loadTrendingUpdates() {
        try {
            // Check if backend is reachable first
            const API_BASE = getApiBaseUrl();
            const healthCheck = await fetch(`${API_BASE.replace('/api', '')}/health`);
            if (!healthCheck.ok) {
                console.log('Backend not available, skipping trending updates');
                return;
            }

            // Get user's current geographic scope
            const scope = this.getCurrentGeographicScope(); // 'national', 'state', or 'local'

            // Try AI topic aggregation with dual-vector clustering
            let response;
            try {
                response = await apiCall(`/trending/topics?scope=${scope}&limit=7`);
                if (response.ok && response.data.topics && response.data.topics.length > 0) {
                    // Store topics for later use
                    this.allTrendingTopics = response.data.topics;

                    // Use content-handlers updateTrendingTopicsPanel since it's already migrated
                    if (typeof window.updateTrendingTopicsPanel === 'function') {
                        window.updateTrendingTopicsPanel(response.data.topics);
                    }

                    // Show the panel when there's content
                    const panel = document.getElementById('trendingUpdates');
                    if (panel) {
                        panel.classList.add('show');
                    }
                    return;
                }
            } catch (topicError) {
                console.log('AI topics unavailable, falling back to posts:', topicError.message);
            }

            // Fallback to post-based trending if AI aggregation fails
            response = await apiCall('/feed/trending?limit=20');

            if (response.ok) {
                this.allTrendingPosts = response.data.posts;
                this.updateTrendingUpdatesPanel(response.data.posts);

                // Show the panel when there's content
                const panel = document.getElementById('trendingUpdates');
                if (panel && response.data.posts.length > 0) {
                    panel.classList.add('show');
                }
            } else {
                console.log('No trending content available yet');
            }
        } catch (error) {
            console.log('Trending updates not available:', error.message);
            // Silently fail - don't spam console with errors
        }
    }

    /**
     * Helper function to get current geographic scope
     * Migrated from index.html line 1415
     */
    getCurrentGeographicScope() {
        // Check if user has a preferred scope setting or use national as default
        return localStorage.getItem('geographicScope') || 'national';
    }

    /**
     * Update trending updates panel with posts (fallback)
     * UPDATED: Now uses UnifiedPostRenderer for consistent display
     */
    updateTrendingUpdatesPanel(posts) {
        const content = document.getElementById('trendingContent');
        if (!content || !posts) return;

        if (posts.length === 0) {
            content.innerHTML = '<p>No trending posts available.</p>';
            return;
        }

        // Use UnifiedPostRenderer for consistent display
        if (window.unifiedPostRenderer) {
            console.log('✅ Using UnifiedPostRenderer for trending panel posts');
            try {
                const postsHtml = posts.slice(0, 5).map(post =>
                    window.unifiedPostRenderer.render(post, {
                        context: 'trending',
                        compactView: true,
                        showActions: false,
                        showComments: false,
                        photoSize: 'small'
                    })
                ).join('');

                content.innerHTML = `<div class="trending-posts-list">${postsHtml}</div>`;
                return;
            } catch (error) {
                console.error('❌ UnifiedPostRenderer failed for trending panel:', error);
            }
        }

        // Fallback to basic HTML
        let html = '<div class="trending-posts-list">';
        posts.slice(0, 5).forEach(post => {
            const timeAgo = this.getTimeAgo(new Date(post.createdAt));
            html += `
                <div class="trending-post" style="padding: 0.75rem; border-bottom: 1px solid #eee; cursor: pointer;" data-post-id="${post.id}">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${post.author?.firstName} ${post.author?.lastName}</div>
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
                    <div style="font-size: 0.8rem; color: #999;">${timeAgo} • ${post.likeCount || 0} likes</div>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
    }

    /**
     * Enter topic mode - show posts filtered by a specific topic
     * Migrated from index.html line 1422
     */
    async enterTopicMode(topicId) {
        try {
            const topic = this.allTrendingTopics.find(t => t.id === topicId);
            if (!topic) {
                console.error('Topic not found:', topicId);
                return;
            }

            // Fetch posts for this topic
            const response = await apiCall(`/trending/topics/${topicId}/posts?limit=20&stance=all`);

            if (response.ok) {
                this.currentTopicMode = {
                    topicId,
                    topic: response.data.topic,
                    posts: response.data.posts
                };

                // Update My Feed to show topic-filtered posts
                this.displayTopicFilteredFeed(response.data.topic, response.data.posts);

                // Update trending panel to show topic mode indicator
                this.updateTrendingWithTopicMode();

                // Show topic mode header in My Feed
                this.showTopicModeHeader(response.data.topic);

            } else {
                console.error('Failed to fetch topic posts');
            }
        } catch (error) {
            console.error('Error entering topic mode:', error);
        }
    }

    /**
     * Exit topic mode and return to normal feed
     * Migrated from index.html line 1461
     */
    exitTopicMode() {
        this.currentTopicMode = null;

        // Clear topic mode header
        const header = document.getElementById('topicModeHeader');
        if (header) {
            header.remove();
        }

        // Reload normal My Feed
        if (typeof window.loadMyFeed === 'function') {
            window.loadMyFeed();
        } else if (typeof window.showMyFeedInMain === 'function') {
            window.showMyFeedInMain();
        }

        // Refresh trending panel
        this.loadTrendingUpdates();
    }

    /**
     * Show topic mode header UI
     * Migrated from index.html line 1477
     */
    showTopicModeHeader(topic) {
        // Remove any existing topic header
        const existingHeader = document.getElementById('topicModeHeader');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create new topic mode header
        const feedContainer = document.getElementById('myFeedPosts') || document.getElementById('mainContent');
        if (feedContainer) {
            const header = document.createElement('div');
            header.id = 'topicModeHeader';
            header.innerHTML = `
                <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">📍</span>
                            <h3 style="margin: 0; font-size: 1.1rem;">Viewing: ${topic.title}</h3>
                        </div>
                        <button data-trending-action="exit-topic-mode" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">✕ Exit Topic Mode</button>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                        <div style="flex: 1; padding: 0.5rem; background: rgba(255,255,255,0.15); border-radius: 4px;">
                            <strong>For (${topic.supportPercentage || 0}%):</strong> ${topic.supportSummary || 'No summary available'}
                        </div>
                        <div style="flex: 1; padding: 0.5rem; background: rgba(255,255,255,0.15); border-radius: 4px;">
                            <strong>Against (${topic.opposePercentage || 0}%):</strong> ${topic.opposeSummary || 'No summary available'}
                        </div>
                    </div>
                </div>
            `;
            feedContainer.insertBefore(header, feedContainer.firstChild);
        }
    }

    /**
     * Display topic-filtered feed with stance indicators
     * Migrated from index.html line 1512
     */
    displayTopicFilteredFeed(topic, posts) {
        const feedContainer = document.getElementById('myFeedPosts') || document.getElementById('mainContent');
        if (!feedContainer) return;

        // Clear existing posts (except the topic header)
        const existingPosts = feedContainer.querySelectorAll('.post-container, .feed-post, .post-item');
        existingPosts.forEach(post => post.remove());

        if (posts && posts.length > 0) {
            // Use UnifiedPostRenderer for consistent display
            if (window.unifiedPostRenderer) {
                console.log('✅ Using UnifiedPostRenderer for topic-filtered feed');

                // Clear existing content (except topic header)
                const existingPosts = feedContainer.querySelectorAll('.post-component, .post-container, .feed-post, .post-item');
                existingPosts.forEach(post => post.remove());

                // Render posts with trending context and stance indicators
                posts.forEach(post => {
                    const postHtml = window.unifiedPostRenderer.render(post, {
                        context: 'trending',
                        showActions: true,
                        showComments: false,
                        showAuthor: true,
                        showTimestamp: true,
                        showTopicIndicators: true,
                        compactView: false
                    });
                    feedContainer.insertAdjacentHTML('beforeend', postHtml);
                });
            } else {
                // Fallback to legacy rendering
                posts.forEach(post => {
                    const postElement = this.createPostElement(post);

                    // Add stance indicator
                    if (post.stance) {
                        const stanceIndicator = document.createElement('div');
                        stanceIndicator.style.cssText = `
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            padding: 0.2rem 0.5rem;
                            border-radius: 4px;
                            font-size: 0.7rem;
                            font-weight: bold;
                            ${post.stance === 'support' ? 'background: rgba(40, 167, 69, 0.1); color: #28a745; border: 1px solid #28a745;' :
                              post.stance === 'oppose' ? 'background: rgba(220, 53, 69, 0.1); color: #dc3545; border: 1px solid #dc3545;' :
                              'background: rgba(108, 117, 125, 0.1); color: #6c757d; border: 1px solid #6c757d;'}
                        `;
                        stanceIndicator.textContent = post.stance === 'support' ? 'Supporting' :
                                                    post.stance === 'oppose' ? 'Opposing' : 'Neutral';

                        postElement.style.position = 'relative';
                        postElement.appendChild(stanceIndicator);
                    }

                    feedContainer.appendChild(postElement);
                });
            }
        } else {
            const noPostsMessage = document.createElement('div');
            noPostsMessage.style.cssText = 'text-align: center; color: #666; padding: 2rem; background: white; border-radius: 8px; margin: 1rem 0;';
            noPostsMessage.innerHTML = `
                <h3>No posts found for this topic</h3>
                <p>Be the first to share your thoughts on "${topic.title}"!</p>
                <button data-trending-action="exit-topic-mode" style="background: #ff6b35; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">View All Posts</button>
            `;
            feedContainer.appendChild(noPostsMessage);
        }
    }

    /**
     * Create a post element for display
     * UPDATED: Now uses UnifiedPostRenderer for consistent display
     */
    createPostElement(post) {
        // Use UnifiedPostRenderer for consistent display
        if (window.unifiedPostRenderer) {
            console.log('✅ Using UnifiedPostRenderer for individual post element');
            try {
                const postHtml = window.unifiedPostRenderer.render(post, {
                    context: 'trending',
                    showTopicIndicators: true,
                    compactView: false
                });

                const postElement = document.createElement('div');
                postElement.innerHTML = postHtml;
                return postElement.firstElementChild; // Return the actual post element
            } catch (error) {
                console.error('❌ UnifiedPostRenderer failed for post element:', error);
            }
        }

        // Fallback to basic HTML
        const postElement = document.createElement('div');
        postElement.className = 'post-item';
        postElement.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;';

        postElement.innerHTML = `
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
        `;

        return postElement;
    }

    /**
     * Update trending panel to show topic mode indicator
     */
    updateTrendingWithTopicMode() {
        const content = document.getElementById('trendingContent');
        if (!content) return;

        if (this.currentTopicMode) {
            const topicModeIndicator = document.createElement('div');
            topicModeIndicator.style.cssText = 'padding: 1rem; background: #e3f2fd; border-radius: 8px; margin-bottom: 1rem; text-align: center;';
            topicModeIndicator.innerHTML = `
                <div style="font-weight: bold; color: #1976d2; margin-bottom: 0.5rem;">🎯 Topic Mode Active</div>
                <div style="font-size: 0.9rem; color: #666;">Viewing posts about "${this.currentTopicMode.topic.title}"</div>
                <button data-trending-action="exit-topic-mode" style="margin-top: 0.5rem; background: #1976d2; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Exit Topic Mode</button>
            `;
            content.insertBefore(topicModeIndicator, content.firstChild);
        }
    }

    /**
     * Helper function to get time ago string
     */
    getTimeAgo(date) {
        if (!date) return '';

        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    }

    /**
     * Load trending posts (fallback when topics aren't available)
     * Migrated from index.html line 1096
     */
    async loadTrendingPosts() {
        try {
            // Try AI topic discovery first, fallback to posts if needed
            let response;
            try {
                response = await apiCall('/topic-navigation/trending?limit=20');
                if (response.ok && response.data.topics && response.data.topics.length > 0) {
                    this.updateTrendingTopicsPanel(response.data.topics);
                    return;
                }
            } catch (topicError) {
                console.log('AI topics unavailable for sidebar, falling back to posts:', topicError.message);
            }

            // Fallback to post-based trending for sidebar
            response = await apiCall('/feed/trending');

            if (response.ok) {
                this.updateTrendingPanel(response.data.posts);
            } else {
                console.error('Failed to load trending content:', response.data?.error);
            }
        } catch (error) {
            console.error('Failed to load trending content:', error);
        }
    }

    /**
     * Start trending refresh interval
     * Migrated from index.html line 1128
     */
    startTrendingRefresh() {
        // Load initial trending updates (but don't spam if backend isn't ready)
        setTimeout(() => this.loadTrendingUpdates(), 2000);

        // Refresh trending every 50 seconds (new posts roll in at top, old ones roll off bottom)
        this.trendingRefreshInterval = setInterval(() => {
            // Only refresh if trending panel is visible
            if (document.getElementById('trendingUpdates').classList.contains('show')) {
                this.loadTrendingUpdates();
            }
        }, 50000);
    }

    /**
     * Stop trending refresh interval
     * Migrated from index.html line 1141
     */
    stopTrendingRefresh() {
        if (this.trendingRefreshInterval) {
            clearInterval(this.trendingRefreshInterval);
            this.trendingRefreshInterval = null;
        }
    }

    /**
     * Enhanced function to display AI-aggregated topics with dual-vector stance info
     * Migrated from index.html line 1157
     */
    updateTrendingTopicsPanel(topics) {
        this.allTrendingTopics = topics;
        this.displayMode = 'topics';
        const body = document.getElementById('trendingUpdatesBody');

        if (topics.length === 0) {
            body.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666; font-size: 0.8rem;">No trending topics</div>';
            return;
        }

        const displayTopics = this.trendingExpanded ? topics : topics.slice(0, 5);
        let html = '';

        displayTopics.forEach((topic, index) => {
            const isFeature = index === 0;

            // Create percentage bar visualization
            const supportPct = topic.support?.percentage || 50;
            const opposePct = topic.oppose?.percentage || 50;

            html += `
                <div class="trending-item topic-item" onclick="enterTopicMode('${topic.id}')" style="cursor: pointer; padding: 0.8rem; border-bottom: 1px solid #eee; transition: background 0.2s;">
                    <div class="topic-header" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 6px;">
                        <span style="font-size: 1.1rem;">${isFeature ? '🔥' : '💭'}</span>
                        <div style="font-weight: bold; font-size: 0.9rem; flex: 1; color: #333;">${topic.title}</div>
                        ${isFeature ? '<span style="background: #ff6b35; color: white; padding: 0.15rem 0.35rem; border-radius: 6px; font-size: 0.65rem; font-weight: bold;">HOT</span>' : ''}
                    </div>

                    <!-- Sentiment Bar -->
                    <div style="margin: 8px 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <div style="flex: 1; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; position: relative;">
                                <div style="position: absolute; left: 0; top: 0; height: 100%; background: #28a745; width: ${supportPct}%; transition: width 0.3s;"></div>
                            </div>
                            <span style="font-size: 0.75rem; color: #666; min-width: 60px;">${supportPct}% | ${opposePct}%</span>
                        </div>
                    </div>

                    <!-- Stance Summaries -->
                    ${topic.support?.summary ? `
                        <div style="margin: 6px 0; padding: 6px 8px; background: rgba(40, 167, 69, 0.08); border-radius: 4px; border-left: 2px solid #28a745;">
                            <div style="font-size: 0.75rem; color: #155724;">
                                <strong>For:</strong> ${topic.support.summary.substring(0, 80)}${topic.support.summary.length > 80 ? '...' : ''}
                            </div>
                        </div>
                    ` : ''}

                    ${topic.oppose?.summary ? `
                        <div style="margin: 6px 0; padding: 6px 8px; background: rgba(220, 53, 69, 0.08); border-radius: 4px; border-left: 2px solid #dc3545;">
                            <div style="font-size: 0.75rem; color: #721c24;">
                                <strong>Against:</strong> ${topic.oppose.summary.substring(0, 80)}${topic.oppose.summary.length > 80 ? '...' : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Metadata -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                        <span style="font-size: 0.7rem; color: #888;">
                            💬 ${topic.totalPosts || (topic.support?.postCount + topic.oppose?.postCount) || 0} posts
                            ${topic.geographicScope ? ` • 📍 ${topic.geographicScope}` : ''}
                        </span>
                        ${topic.state || topic.city ? `
                            <span style="font-size: 0.65rem; color: #666; background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">
                                ${topic.city || topic.state}
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        body.innerHTML = html;

        // Add hover effect
        body.querySelectorAll('.topic-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.background = '#f8f9fa';
            });
            item.addEventListener('mouseleave', function() {
                this.style.background = '';
            });
        });
    }

    /**
     * Update trending panel with posts (legacy compatibility)
     * Migrated from index.html line 1241
     */
    updateTrendingPanel(posts) {
        this.allTrendingPosts = posts;
        this.displayMode = 'posts';
        const body = document.getElementById('trendingUpdatesBody');

        if (posts.length === 0) {
            body.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666; font-size: 0.8rem;">No trending topics</div>';
            return;
        }

        const displayPosts = this.trendingExpanded ? posts : posts.slice(0, 5);
        let html = '';

        displayPosts.forEach(post => {
            const timeAgo = this.getTimeAgo(new Date(post.createdAt));
            const preview = post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content;

            html += `
                <div class="trending-item">
                    <div style="font-weight: bold; margin-bottom: 2px; font-size: 0.85rem;">@${post.author.username}</div>
                    <div style="margin-bottom: 4px;">${preview}</div>
                    <div style="color: #666; font-size: 0.75rem; margin-bottom: 4px;">
                        <span style="cursor: pointer; margin-right: 8px;" onclick="likeTrendingPost('${post.id}')">❤️ ${post.likesCount}</span>
                        <span style="cursor: pointer; margin-right: 8px;" onclick="showTrendingCommentBox('${post.id}')">💬 Add</span>
                        ${post.commentsCount > 0 ? `<span style="cursor: pointer; margin-right: 8px; color: #4b5c09;" onclick="viewComments('${post.id}')">👁️ ${post.commentsCount}</span>` : ''}
                        <span>${timeAgo}</span>
                    </div>
                    <div id="trending-comments-${post.id}" class="comments-section" style="display: none; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #eee;">
                        <textarea id="trending-comment-input-${post.id}" placeholder="Add a comment..." style="width: 100%; height: 50px; border: 1px solid #ddd; border-radius: 4px; padding: 0.5rem; box-sizing: border-box; resize: vertical; font-size: 0.8rem;"></textarea>
                        <div style="margin-top: 0.5rem;">
                            <button onclick="addTrendingComment('${post.id}')" style="background: #4b5c09; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Comment</button>
                            <button onclick="hideTrendingCommentBox('${post.id}')" style="background: #666; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; margin-left: 0.5rem; font-size: 0.8rem;">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
        });

        body.innerHTML = html;
    }

    /**
     * Toggle trending expansion
     * Migrated from index.html line 1282
     */
    toggleTrendingExpansion() {
        const panel = document.getElementById('trendingUpdates');
        const btn = document.getElementById('trendingExpandBtn');

        this.trendingExpanded = !this.trendingExpanded;

        if (this.trendingExpanded) {
            panel.classList.add('expanded');
            btn.textContent = 'Less';
        } else {
            panel.classList.remove('expanded');
            btn.textContent = 'More';
        }

        this.updateTrendingUpdatesPanel(this.allTrendingPosts);
    }

    /**
     * Open full trending view (compatibility)
     * Migrated from index.html line 1810
     */
    openFullTrending() {
        // This function kept for compatibility but now just expands in place
        if (!this.trendingExpanded) {
            this.toggleTrendingExpansion();
        }
    }

    /**
     * View trending post (compatibility)
     * Migrated from index.html line 1817
     */
    viewTrendingPost(postId) {
        // For now, just expand the trending if not already expanded
        if (!this.trendingExpanded) {
            this.toggleTrendingExpansion();
        }
    }

    /**
     * Like trending post
     * Migrated from index.html line 2462
     */
    async likeTrendingPost(postId) {
        if (!window.currentUser) {
            alert('Please log in to like posts');
            return;
        }

        try {
            const response = await apiCall(`/posts/${postId}/like`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                // Just update the like count in place, don't refresh whole panel
                this.updateLikeCount(postId, data.liked);
            }
        } catch (error) {
            console.error('Failed to like trending post:', error);
        }
    }

    /**
     * Add trending comment
     * Migrated from index.html line 2486
     */
    async addTrendingComment(postId) {
        const content = document.getElementById(`trending-comment-input-${postId}`).value.trim();

        if (!content) {
            alert('Please enter a comment');
            return;
        }

        try {
            const response = await apiCall(`/posts/${postId}/comments`, {
                method: 'POST'
            });

            if (response.ok) {
                this.hideTrendingCommentBox(postId);
                // Just update the comment count, don't refresh whole panel
                this.updateCommentCount(postId);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to add comment');
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('Network error. Please try again.');
        }
    }

    /**
     * Helper functions for UI updates
     */
    updateLikeCount(postId, liked) {
        // Implementation for updating like count in UI
        console.log(`Post ${postId} ${liked ? 'liked' : 'unliked'}`);
    }

    updateCommentCount(postId) {
        // Implementation for updating comment count in UI
        console.log(`Comment added to post ${postId}`);
    }

    hideTrendingCommentBox(postId) {
        const commentsBox = document.getElementById(`trending-comments-${postId}`);
        if (commentsBox) {
            commentsBox.style.display = 'none';
        }
    }
}

// Create global instance
const trendingHandlers = new TrendingHandlers();

// Export functions for backward compatibility
export const loadTrendingUpdates = () => trendingHandlers.loadTrendingUpdates();
export const loadTrendingPosts = () => trendingHandlers.loadTrendingPosts();
export const startTrendingRefresh = () => trendingHandlers.startTrendingRefresh();
export const stopTrendingRefresh = () => trendingHandlers.stopTrendingRefresh();
export const updateTrendingTopicsPanel = (topics) => trendingHandlers.updateTrendingTopicsPanel(topics);
export const updateTrendingUpdatesPanel = (posts) => trendingHandlers.updateTrendingUpdatesPanel(posts);
export const toggleTrendingExpansion = () => trendingHandlers.toggleTrendingExpansion();
export const enterTopicMode = (topicId) => trendingHandlers.enterTopicMode(topicId);
export const exitTopicMode = () => trendingHandlers.exitTopicMode();
export const updateMyFeedWithTopic = (topic, posts) => trendingHandlers.updateMyFeedWithTopic(topic, posts);
export const updateTrendingWithTopicMode = () => trendingHandlers.updateTrendingWithTopicMode();
export const openFullTrending = () => trendingHandlers.openFullTrending();
export const viewTrendingPost = (postId) => trendingHandlers.viewTrendingPost(postId);
export const likeTrendingPost = (postId) => trendingHandlers.likeTrendingPost(postId);
export const addTrendingComment = (postId) => trendingHandlers.addTrendingComment(postId);
export const getCurrentGeographicScope = () => trendingHandlers.getCurrentGeographicScope();

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.loadTrendingUpdates = loadTrendingUpdates;
    window.loadTrendingPosts = loadTrendingPosts;
    window.startTrendingRefresh = startTrendingRefresh;
    window.stopTrendingRefresh = stopTrendingRefresh;
    window.updateTrendingTopicsPanel = updateTrendingTopicsPanel;
    window.updateTrendingUpdatesPanel = updateTrendingUpdatesPanel;
    window.toggleTrendingExpansion = toggleTrendingExpansion;
    window.enterTopicMode = enterTopicMode;
    window.exitTopicMode = exitTopicMode;
    window.updateMyFeedWithTopic = updateMyFeedWithTopic;
    window.updateTrendingWithTopicMode = updateTrendingWithTopicMode;
    window.openFullTrending = openFullTrending;
    window.viewTrendingPost = viewTrendingPost;
    window.likeTrendingPost = likeTrendingPost;
    window.addTrendingComment = addTrendingComment;
    window.getCurrentGeographicScope = getCurrentGeographicScope;
    window.trendingHandlers = trendingHandlers;

    // Backward compatibility for global variables
    window.allTrendingPosts = [];
    window.allTrendingTopics = [];
    window.trendingExpanded = false;
    window.displayMode = 'topics';
    window.currentTopicMode = null;
    window.trendingRefreshInterval = null;
}

console.log('✅ Trending handlers module loaded (Topic Mode, Geographic Scope, AI Topics)');