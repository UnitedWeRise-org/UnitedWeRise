/**
 * UnifiedPostRenderer - Single source of truth for all post display logic
 *
 * Consolidates post rendering across ALL UnitedWeRise contexts:
 * - My Feed (infinite scroll, 15-post batches)
 * - Focus View (detailed post with comments)
 * - Profile View (user-centric display)
 * - Trending (compact with topic indicators)
 * - Search Results (highlighted content)
 * - Admin (moderation tools and metadata)
 *
 * FIXES: My Feed photo display issue with proper media handling
 * STANDARDIZES: Consistent post appearance across entire platform
 * OPTIMIZES: Performance with lazy loading and responsive design
 *
 * @module UnifiedPostRenderer
 */

class UnifiedPostRenderer {
    constructor() {
        this.defaultOptions = {
            context: 'feed',
            showActions: true,
            showComments: false,
            showAuthor: true,
            showTimestamp: true,
            photoSize: 'medium',
            maxPhotos: 10,
            enableLazyLoading: true,
            compactView: false,
            showTopicIndicators: false,
            showModerationTools: false
        };

        this.contextPresets = {
            feed: {
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true,
                photoSize: 'medium',
                compactView: false
            },
            focus: {
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true,
                photoSize: 'large',
                compactView: false
            },
            profile: {
                showActions: true,
                showComments: true,
                showAuthor: false, // User's own profile
                showTimestamp: true,
                photoSize: 'medium',
                compactView: false
            },
            trending: {
                showActions: false,
                showComments: false,
                showAuthor: true,
                showTimestamp: true,
                photoSize: 'small',
                compactView: true,
                showTopicIndicators: true
            },
            search: {
                showActions: true,
                showComments: false,
                showAuthor: true,
                showTimestamp: true,
                photoSize: 'medium',
                compactView: false
            },
            admin: {
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true,
                photoSize: 'medium',
                compactView: false,
                showModerationTools: true
            }
        };

        this.photoSizes = {
            thumbnail: { maxWidth: '150px', maxHeight: '150px' },
            small: { maxWidth: '200px', maxHeight: '200px' },
            medium: { maxWidth: '500px', maxHeight: '500px' },
            large: { maxWidth: '100%', maxHeight: '600px' },
            full: { maxWidth: '100%', maxHeight: 'none' }
        };
    }

    /**
     * Main rendering method - context-aware post HTML generation
     *
     * @param {Object} post - Post data object with author, content, photos, etc.
     * @param {Object} options - Rendering configuration (merged with context presets)
     * @returns {string} HTML string for the post
     */
    render(post, options = {}) {
        // Merge options with context preset and defaults
        const context = options.context || this.defaultOptions.context;
        const contextPreset = this.contextPresets[context] || {};
        const settings = { ...this.defaultOptions, ...contextPreset, ...options };

        console.log('🎨 UnifiedPostRenderer.render() called', {
            postId: post.id,
            context: context,
            hasPhotos: !!(post.photos?.length),
            photoCount: post.photos?.length || 0
        });

        // Validate post data
        if (!post || !post.id) {
            console.error('❌ Invalid post data provided to renderer');
            return '<div class="post-error">Invalid post data</div>';
        }

        // Generate post components
        const timeAgo = this.getTimeAgo(new Date(post.createdAt));
        const authorName = post.author?.firstName || post.author?.username || 'Anonymous';
        const authorInitial = authorName[0]?.toUpperCase() || 'A';

        // Content moderation check
        const hasContentFlags = post.contentFlags && typeof post.contentFlags === 'object' && Object.keys(post.contentFlags).length > 0;
        const shouldShowWarning = hasContentFlags && this.shouldHideContent && this.shouldHideContent(post.contentFlags);

        // Build the complete post HTML
        return `
            <div class="post-component unified-post ${settings.compactView ? 'compact-view' : ''}"
                 data-post-id="${post.id}"
                 data-author-reputation="${post.authorReputation || 70}"
                 data-context="${context}">

                ${settings.showAuthor ? this.renderAuthorHeader(post, settings, timeAgo, authorName, authorInitial) : ''}

                ${shouldShowWarning ? this.renderContentWarning(post.contentFlags) : ''}

                <div class="post-content ${shouldShowWarning ? 'content-hidden' : ''}" onclick="if(window.postComponent) window.postComponent.openPostFocus('${post.id}')" style="cursor: pointer;">
                    ${this.renderPostContent(post.content, settings)}
                </div>

                ${post.imageUrl ? this.renderLegacyImage(post.imageUrl) : ''}

                ${this.renderPostMedia(post.photos, settings)}

                ${settings.showTopicIndicators && post.stance ? this.renderTopicIndicator(post.stance) : ''}

                ${settings.showActions ? this.renderActions(post, settings) : ''}

                ${settings.showModerationTools ? this.renderModerationTools(post) : ''}

                ${settings.showComments ? this.renderCommentsSection(post, settings) : ''}
            </div>
        `;
    }

    /**
     * Render author header with avatar and metadata
     * @private
     */
    renderAuthorHeader(post, settings, timeAgo, authorName, authorInitial) {
        return `
            <div class="post-header">
                <div class="post-avatar user-card-trigger"
                     onclick="if(window.postComponent) postComponent.showUserCard(event, '${post.author?.id || ''}', {postId: '${post.id}'})"
                     style="cursor: pointer;"
                     title="Click to view profile">
                    ${post.author?.avatar ?
                        `<img src="${post.author.avatar}" alt="Profile Picture" class="avatar-img">` :
                        `<div class="avatar-placeholder">${authorInitial}</div>`
                    }
                </div>
                <div class="post-author-info">
                    <div class="post-author-name user-card-trigger"
                         onclick="if(window.postComponent) postComponent.showUserCard(event, '${post.author?.id || ''}', {postId: '${post.id}'})"
                         style="cursor: pointer;"
                         title="Click to view profile">
                        ${authorName}
                        ${post.author?.verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
                        ${post.author?.isAdmin ? '<span class="admin-badge" title="Administrator">🛡️</span>' : ''}
                    </div>
                    ${settings.showTimestamp ? `
                        <div class="post-timestamp">@${post.author?.username || 'unknown'} • ${timeAgo}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render post content with proper formatting
     * @private
     */
    renderPostContent(content, settings) {
        if (!content) return '';

        // Basic text processing (could be expanded for mentions, hashtags, etc.)
        const processedContent = content
            .replace(/\n/g, '<br>')
            .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>');

        return `<div class="post-text">${processedContent}</div>`;
    }

    /**
     * Render post media (photos/videos) with responsive grid layout
     * Based on working PostComponent.renderPostMedia() implementation
     * @private
     */
    renderPostMedia(photos, settings) {
        if (!photos || photos.length === 0) return '';

        console.log('🖼️ UnifiedPostRenderer: Rendering media', {
            photoCount: photos.length,
            context: settings.context,
            photoSize: settings.photoSize
        });

        const sizeConfig = this.photoSizes[settings.photoSize] || this.photoSizes.medium;

        // Single photo - full width, natural aspect ratio
        if (photos.length === 1) {
            const photo = photos[0];
            const isGif = photo.mimeType === 'image/gif';

            return `
                <div class="post-media-inline single-photo" style="margin-top: 12px; border-radius: 12px; overflow: hidden; position: relative;">
                    <img src="${photo.url}"
                         alt="Post image"
                         ${settings.enableLazyLoading ? 'loading="lazy"' : ''}
                         onclick="if(window.postComponent) postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
                         style="width: 100%; max-height: ${sizeConfig.maxHeight}; object-fit: cover; cursor: pointer; display: block;">
                    ${isGif ? '<div class="media-type-badge gif-badge" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">GIF</div>' : ''}
                </div>
            `;
        }

        // Multiple photos - grid layout like Twitter/Instagram
        const gridTemplate = this.getPhotoGridTemplate(photos.length);

        return `
            <div class="post-media-inline multi-photo"
                 style="margin-top: 12px; border-radius: 12px; overflow: hidden; display: grid; gap: 2px; max-height: ${sizeConfig.maxHeight}; ${gridTemplate}">
                ${photos.slice(0, 4).map((photo, index) => {
                    const isGif = photo.mimeType === 'image/gif';
                    const isOverflow = photos.length > 4 && index === 3;

                    return `
                        <div class="photo-grid-item" style="position: relative; overflow: hidden;">
                            <img src="${photo.url}"
                                 alt="Post image ${index + 1}"
                                 ${settings.enableLazyLoading ? 'loading="lazy"' : ''}
                                 onclick="if(window.postComponent) postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
                                 style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; display: block;">
                            ${isGif ? '<div class="media-type-badge gif-badge" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">GIF</div>' : ''}
                            ${isOverflow ? `
                                <div class="more-photos-overlay"
                                     style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold; cursor: pointer;"
                                     onclick="if(window.postComponent) postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')">
                                    +${photos.length - 4}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Get CSS grid template for photo layout
     * Based on PostComponent.getPhotoGridTemplate()
     * @private
     */
    getPhotoGridTemplate(photoCount) {
        switch(photoCount) {
            case 2:
                return 'grid-template-columns: 1fr 1fr; grid-template-rows: 250px;';
            case 3:
                return 'grid-template-columns: 1fr 1fr; grid-template-rows: 125px 125px;';
            case 4:
            default:
                return 'grid-template-columns: 1fr 1fr; grid-template-rows: 125px 125px;';
        }
    }

    /**
     * Render legacy single image (for backward compatibility)
     * @private
     */
    renderLegacyImage(imageUrl) {
        return `
            <div class="post-image">
                <img src="${imageUrl}" alt="Post image" loading="lazy" style="max-width: 100%; height: auto; border-radius: 8px;">
            </div>
        `;
    }

    /**
     * Render topic/stance indicator for trending view
     * @private
     */
    renderTopicIndicator(stance) {
        const stanceConfig = {
            support: { color: '#28a745', bg: 'rgba(40, 167, 69, 0.1)', text: 'Supporting' },
            oppose: { color: '#dc3545', bg: 'rgba(220, 53, 69, 0.1)', text: 'Opposing' },
            neutral: { color: '#6c757d', bg: 'rgba(108, 117, 125, 0.1)', text: 'Neutral' }
        };

        const config = stanceConfig[stance] || stanceConfig.neutral;

        return `
            <div class="topic-stance-indicator"
                 style="position: absolute; top: 10px; right: 10px; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: bold; background: ${config.bg}; color: ${config.color}; border: 1px solid ${config.color};">
                ${config.text}
            </div>
        `;
    }

    /**
     * Render post actions (enhanced reactions, comment, share, edit/delete)
     * @private
     */
    renderActions(post, settings) {
        return `
            <div class="post-actions" data-post-id="${post.id}">
                ${this.renderEnhancedReactions(post)}

                <button class="post-action-btn comment-btn"
                        onclick="if(window.postComponent) window.postComponent.toggleComments('${post.id}')">
                    <span class="action-icon">💬</span>
                    <span class="action-count">${post.commentsCount || 0}</span>
                </button>

                <button class="post-action-btn share-btn ${post.isShared ? 'shared' : ''}"
                        onclick="if(window.postComponent) window.postComponent.sharePost('${post.id}')">
                    <span class="action-icon">🔄</span>
                    <span class="action-count">${post.sharesCount || 0}</span>
                </button>

                ${post.isOwner ? `
                    <button class="post-action-btn more-btn"
                            onclick="if(window.postComponent) window.postComponent.showPostMenu('${post.id}')">
                        <span class="action-icon">⋯</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render enhanced reactions (like/dislike and agree/disagree)
     * @private
     */
    renderEnhancedReactions(post) {
        return `
            <div class="reaction-groups">
                <div class="sentiment-group">
                    <button class="reaction-btn sentiment-like ${post.userSentiment === 'LIKE' ? 'active' : ''}"
                            onclick="if(window.postComponent) window.postComponent.toggleReaction('${post.id}', 'sentiment', 'LIKE')"
                            data-reaction-type="sentiment"
                            data-reaction-value="LIKE">
                        <span class="emoji">😊</span>
                        <span class="reaction-count">${post.likesCount || 0}</span>
                    </button>
                    <button class="reaction-btn sentiment-dislike ${post.userSentiment === 'DISLIKE' ? 'active' : ''}"
                            onclick="if(window.postComponent) window.postComponent.toggleReaction('${post.id}', 'sentiment', 'DISLIKE')"
                            data-reaction-type="sentiment"
                            data-reaction-value="DISLIKE">
                        <span class="emoji">😞</span>
                        <span class="reaction-count">${post.dislikesCount || 0}</span>
                    </button>
                </div>
                <div class="stance-group">
                    <button class="reaction-btn stance-agree ${post.userStance === 'AGREE' ? 'active' : ''}"
                            onclick="if(window.postComponent) window.postComponent.toggleReaction('${post.id}', 'stance', 'AGREE')"
                            data-reaction-type="stance"
                            data-reaction-value="AGREE">
                        <span class="emoji">👍</span>
                        <span class="reaction-count">${post.agreesCount || 0}</span>
                    </button>
                    <button class="reaction-btn stance-disagree ${post.userStance === 'DISAGREE' ? 'active' : ''}"
                            onclick="if(window.postComponent) window.postComponent.toggleReaction('${post.id}', 'stance', 'DISAGREE')"
                            data-reaction-type="stance"
                            data-reaction-value="DISAGREE">
                        <span class="emoji">👎</span>
                        <span class="reaction-count">${post.disagreesCount || 0}</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render moderation tools for admin view
     * @private
     */
    renderModerationTools(post) {
        return `
            <div class="post-moderation-tools" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                <button class="mod-btn" onclick="moderatePost('${post.id}', 'flag')" style="font-size: 0.8rem; margin-right: 8px;">🚩 Flag</button>
                <button class="mod-btn" onclick="moderatePost('${post.id}', 'hide')" style="font-size: 0.8rem; margin-right: 8px;">👁️ Hide</button>
                <button class="mod-btn" onclick="moderatePost('${post.id}', 'delete')" style="font-size: 0.8rem; color: #dc3545;">🗑️ Delete</button>
                <span style="font-size: 0.7rem; color: #666; margin-left: 8px;">
                    ID: ${post.id} | Created: ${new Date(post.createdAt).toLocaleString()}
                </span>
            </div>
        `;
    }

    /**
     * Render content warning for flagged posts
     * @private
     */
    renderContentWarning(contentFlags) {
        return `
            <div class="content-warning" style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                <div style="font-weight: bold; color: #856404;">⚠️ Content Warning</div>
                <div style="font-size: 0.9rem; color: #856404;">This post has been flagged for review.</div>
                <button onclick="this.parentElement.nextElementSibling.classList.toggle('content-hidden')"
                        style="font-size: 0.8rem; background: transparent; border: 1px solid #856404; color: #856404; padding: 4px 8px; border-radius: 3px; margin-top: 4px; cursor: pointer;">
                    Show Content
                </button>
            </div>
        `;
    }

    /**
     * Render complete comments section with input and existing comments
     * @private
     */
    renderCommentsSection(post, settings) {
        return `
            <div class="post-comments-section" id="comments-${post.id}" style="display: none;">
                <div class="comment-input-wrapper">
                    <textarea class="comment-input"
                              id="comment-input-${post.id}"
                              placeholder="Write a comment..."
                              rows="2"></textarea>
                    <div class="comment-actions">
                        <button class="btn btn-sm btn-primary"
                                data-action="addComment" data-post-id="${post.id}">
                            Post Comment
                        </button>
                        <button class="btn btn-sm btn-secondary"
                                onclick="if(window.postComponent) window.postComponent.hideComments('${post.id}')">
                            Cancel
                        </button>
                    </div>
                </div>
                <div class="comments-list" id="comments-list-${post.id}">
                    <!-- Comments will be loaded here -->
                </div>
            </div>
        `;
    }

    /**
     * Render existing comments (for display)
     * @private
     */
    renderComments(comments, settings) {
        if (!comments || comments.length === 0) return '';

        return `
            <div class="post-comments" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                ${comments.slice(0, 3).map(comment => `
                    <div class="comment-item" style="margin-bottom: 8px; font-size: 0.9rem;">
                        <strong>${comment.author?.firstName || comment.author?.username || 'Anonymous'}:</strong>
                        <span>${comment.content}</span>
                        <span style="color: #666; font-size: 0.8rem; margin-left: 8px;">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    </div>
                `).join('')}
                ${comments.length > 3 ? `
                    <div class="view-more-comments" style="color: #666; font-size: 0.9rem; cursor: pointer;"
                         onclick="if(window.postComponent) window.postComponent.openPostFocus('${comments[0].postId}')">
                        View all ${comments.length} comments
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render a list of posts using the unified renderer
     *
     * @param {Array} posts - Array of post objects
     * @param {string} containerId - ID of container element
     * @param {Object} options - Rendering options
     */
    renderPostsList(posts, containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }

        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div class="no-posts" style="text-align: center; padding: 2rem; color: #666;">
                    <p>No posts to display</p>
                </div>
            `;
            return;
        }

        console.log(`🎨 UnifiedPostRenderer: Rendering ${posts.length} posts in container ${containerId}`);

        const postsHtml = posts.map(post => this.render(post, options)).join('');
        container.innerHTML = postsHtml;
    }

    /**
     * Append posts to existing container (for infinite scroll)
     *
     * @param {Array} posts - Array of post objects to append
     * @param {string} containerId - ID of container element
     * @param {Object} options - Rendering options
     */
    appendPosts(posts, containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }

        if (!posts || posts.length === 0) {
            return;
        }

        console.log(`🎨 UnifiedPostRenderer: Appending ${posts.length} posts to container ${containerId}`);

        const postsHtml = posts.map(post => this.render(post, options)).join('');
        container.insertAdjacentHTML('beforeend', postsHtml);
    }

    /**
     * Get time ago string for timestamps
     * @private
     */
    getTimeAgo(date) {
        if (!date) return '';

        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return `${years}y ago`;
        if (months > 0) return `${months}mo ago`;
        if (weeks > 0) return `${weeks}w ago`;
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        if (seconds > 30) return `${seconds}s ago`;
        return 'just now';
    }

    /**
     * Utility method to get rendering options for specific context
     *
     * @param {string} context - Context name (feed, focus, profile, etc.)
     * @param {Object} overrides - Additional options to override defaults
     * @returns {Object} Complete options object for rendering
     */
    getContextOptions(context, overrides = {}) {
        const contextPreset = this.contextPresets[context] || {};
        return { ...this.defaultOptions, ...contextPreset, context, ...overrides };
    }

    /**
     * Quick method for feed rendering (most common use case)
     */
    renderForFeed(post, options = {}) {
        return this.render(post, this.getContextOptions('feed', options));
    }

    /**
     * Quick method for focus view rendering
     */
    renderForFocus(post, options = {}) {
        return this.render(post, this.getContextOptions('focus', options));
    }

    /**
     * Quick method for trending rendering
     */
    renderForTrending(post, options = {}) {
        return this.render(post, this.getContextOptions('trending', options));
    }
}

// Create singleton instance
const unifiedPostRenderer = new UnifiedPostRenderer();

// Export for ES6 module system
export { unifiedPostRenderer, UnifiedPostRenderer };

// Make globally available for legacy compatibility and immediate use
if (typeof window !== 'undefined') {
    window.unifiedPostRenderer = unifiedPostRenderer;
    window.UnifiedPostRenderer = UnifiedPostRenderer;
}

console.log('✅ UnifiedPostRenderer module loaded - Ready to consolidate all post display logic');