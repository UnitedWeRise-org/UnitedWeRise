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

/** Inline SVG placeholder for videos without thumbnails - prevents 404 errors */
const VIDEO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 16' fill='%231a1a1a'%3E%3Crect width='9' height='16'/%3E%3Cpath d='M3.5 5.5l3 2.5-3 2.5z' fill='white'/%3E%3C/svg%3E";

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
            photoCount: post.photos?.length || 0,
            hasImageUrl: !!post.imageUrl,
            postKeys: Object.keys(post),
            // RiseAI debug
            hasRiseAIResponse: !!post.riseAIResponse,
            riseAIStatus: post.riseAIResponse?.status,
            riseAIHasComment: !!post.riseAIResponse?.responseComment
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

        // Auto-detect post ownership if not explicitly set
        if (typeof post.isOwner === 'undefined' && window.currentUser && post.author) {
            post.isOwner = post.author.id === window.currentUser.id;
            console.log('🔧 UnifiedPostRenderer: Auto-detected isOwner', {
                postId: post.id,
                authorId: post.author.id,
                currentUserId: window.currentUser.id,
                isOwner: post.isOwner
            });
        }

        // Build the complete post HTML
        return `
            <div class="post-component unified-post ${settings.compactView ? 'compact-view' : ''}"
                 data-post-id="${post.id}"
                 data-author-reputation="${post.authorReputation || 70}"
                 data-context="${context}">

                ${settings.showAuthor ? this.renderAuthorHeader(post, settings, timeAgo, authorName, authorInitial) : ''}

                ${shouldShowWarning ? this.renderContentWarning(post.contentFlags) : ''}

                <div class="post-content ${shouldShowWarning ? 'content-hidden' : ''}" data-action="openPostFocus" data-post-id="${post.id}" style="cursor: pointer;">
                    ${this.renderPostContent(post.content, settings)}
                    ${this.renderThreadIndicator(post)}
                </div>

                ${this.renderThreadExpansion(post)}

                ${post.imageUrl ? this.renderLegacyImage(post.imageUrl) : ''}

                ${this.renderPostMedia(post.photos, settings)}

                ${this.renderPostVideos(post.videos, settings)}

                ${post.riseAIResponse ? this.renderInlineRiseAIResponse(post.riseAIResponse, post.id) : ''}

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
                     data-action="showUserCard" data-author-id="${post.author?.id || ''}" data-post-id="${post.id}"
                     style="cursor: pointer;"
                     title="Click to view profile">
                    ${post.author?.avatar ?
                        `<img src="${post.author.avatar}" alt="Profile Picture" class="avatar-img">` :
                        `<div class="avatar-placeholder">${authorInitial}</div>`
                    }
                </div>
                <div class="post-author-info">
                    <div class="post-author-name user-card-trigger"
                         data-action="showUserCard" data-author-id="${post.author?.id || ''}" data-post-id="${post.id}"
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
     * Render inline RiseAI response directly below trigger content
     * Creates a visible prompt→response flow for AI-assisted conversation
     * @param {Object} riseAIResponse - Enriched RiseAI response data from API
     * @param {string} postId - The post ID this response is attached to
     * @returns {string} HTML for inline response or empty string
     * @private
     */
    renderInlineRiseAIResponse(riseAIResponse, postId) {
        if (!riseAIResponse) return '';

        // Show pending/processing state
        if (riseAIResponse.status === 'pending' || riseAIResponse.status === 'processing' || riseAIResponse.status === 'analyzing') {
            return `
                <div class="riseai-inline-response riseai-pending" data-post-id="${postId}">
                    <div class="riseai-response-header">
                        <div class="riseai-avatar">
                            <div class="riseai-avatar-icon">AI</div>
                        </div>
                        <div class="riseai-author-info">
                            <span class="riseai-name">RiseAI</span>
                            <span class="riseai-badge" title="AI Assistant">analyzing...</span>
                        </div>
                    </div>
                    <div class="riseai-response-content riseai-loading">
                        <div class="riseai-spinner"></div>
                        <span>RiseAI is analyzing this content...</span>
                    </div>
                </div>
            `;
        }

        // Show failed state
        if (riseAIResponse.status === 'failed') {
            return `
                <div class="riseai-inline-response riseai-failed" data-post-id="${postId}">
                    <div class="riseai-response-header">
                        <div class="riseai-avatar">
                            <div class="riseai-avatar-icon">AI</div>
                        </div>
                        <div class="riseai-author-info">
                            <span class="riseai-name">RiseAI</span>
                            <span class="riseai-badge riseai-error">analysis failed</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // No response comment yet
        if (!riseAIResponse.responseComment) {
            return '';
        }

        const response = riseAIResponse.responseComment;
        const author = response.author || {};
        const timeAgo = this.getTimeAgo(new Date(response.createdAt));

        // Process content for display
        const processedContent = (response.content || '')
            .replace(/\n/g, '<br>')
            .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>');

        // Determine active reaction states
        const likeActive = response.userSentiment === 'LIKE' ? 'active' : '';
        const dislikeActive = response.userSentiment === 'DISLIKE' ? 'active' : '';
        const agreeActive = response.userStance === 'AGREE' ? 'active' : '';
        const disagreeActive = response.userStance === 'DISAGREE' ? 'active' : '';

        return `
            <div class="riseai-inline-response"
                 data-comment-id="${response.id}"
                 data-interaction-id="${riseAIResponse.interactionId}"
                 data-post-id="${postId}">
                <div class="riseai-response-header">
                    <div class="riseai-avatar">
                        ${author.avatar
                            ? `<img src="${author.avatar}" alt="RiseAI" class="riseai-avatar-img">`
                            : `<div class="riseai-avatar-icon">AI</div>`
                        }
                    </div>
                    <div class="riseai-author-info">
                        <span class="riseai-name">${author.firstName || 'RiseAI'}</span>
                        ${author.verified ? '<span class="riseai-verified" title="Verified">✓</span>' : ''}
                        <span class="riseai-badge" title="AI Analysis Assistant">AI</span>
                        <span class="riseai-timestamp">${timeAgo}</span>
                    </div>
                </div>
                <div class="riseai-response-content">
                    ${processedContent}
                </div>
                <div class="riseai-response-actions">
                    <button class="riseai-reaction-btn ${likeActive}"
                            data-action="toggleRiseAIReaction"
                            data-comment-id="${response.id}"
                            data-reaction-type="SENTIMENT"
                            data-reaction-value="LIKE"
                            title="Like">
                        <span class="reaction-icon">👍</span>
                        <span class="reaction-count">${response.likesCount || 0}</span>
                    </button>
                    <button class="riseai-reaction-btn ${dislikeActive}"
                            data-action="toggleRiseAIReaction"
                            data-comment-id="${response.id}"
                            data-reaction-type="SENTIMENT"
                            data-reaction-value="DISLIKE"
                            title="Dislike">
                        <span class="reaction-icon">👎</span>
                        <span class="reaction-count">${response.dislikesCount || 0}</span>
                    </button>
                    <button class="riseai-reaction-btn ${agreeActive}"
                            data-action="toggleRiseAIReaction"
                            data-comment-id="${response.id}"
                            data-reaction-type="STANCE"
                            data-reaction-value="AGREE"
                            title="Agree">
                        <span class="reaction-icon">✅</span>
                        <span class="reaction-count">${response.agreesCount || 0}</span>
                    </button>
                    <button class="riseai-reaction-btn ${disagreeActive}"
                            data-action="toggleRiseAIReaction"
                            data-comment-id="${response.id}"
                            data-reaction-type="STANCE"
                            data-reaction-value="DISAGREE"
                            title="Disagree">
                        <span class="reaction-icon">❌</span>
                        <span class="reaction-count">${response.disagreesCount || 0}</span>
                    </button>
                    <button class="riseai-reply-btn"
                            data-action="replyToRiseAI"
                            data-comment-id="${response.id}"
                            data-post-id="${postId}"
                            title="Reply to RiseAI">
                        <span class="reaction-icon">💬</span>
                        <span>Reply</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render post media (photos/videos) with responsive grid layout
     * Based on working PostComponent.renderPostMedia() implementation
     * @private
     */
    renderPostMedia(photos, settings) {
        // DIAGNOSTIC: Enhanced logging for photo rendering
        console.log('📸 RENDERER - renderPostMedia called', {
            photosProvided: !!photos,
            photosLength: photos?.length || 0,
            photosType: typeof photos,
            isArray: Array.isArray(photos)
        });

        if (!photos || photos.length === 0) {
            console.log('📸 RENDERER: No media to render - returning empty string');
            return '';
        }

        console.log('📸 RENDERER: Rendering media', {
            photoCount: photos.length,
            context: settings.context,
            photoSize: settings.photoSize,
            photosData: photos.map(p => ({ id: p.id, url: p.url, mimeType: p.mimeType }))
        });

        const sizeConfig = this.photoSizes[settings.photoSize] || this.photoSizes.medium;

        // Single photo - full width, natural aspect ratio
        if (photos.length === 1) {
            const photo = photos[0];
            const isGif = photo.mimeType === 'image/gif';

            return `
                <div class="post-media-inline single-photo" style="margin-top: 12px; border-radius: 12px; overflow: hidden; position: relative; display: flex; justify-content: center; align-items: center; background: #f8f9fa;">
                    <img src="${photo.url}"
                         alt="Post image"
                         ${settings.enableLazyLoading ? 'loading="lazy"' : ''}
                         data-action="openMediaViewer" data-param1="${photo.url}" data-param2="${photo.mimeType}" data-param3="${photo.id}"
                         style="max-width: ${sizeConfig.maxWidth}; max-height: ${sizeConfig.maxHeight}; width: auto; height: auto; object-fit: contain; cursor: pointer; display: block;">
                    ${isGif ? '<div class="media-type-badge gif-badge" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">GIF</div>' : ''}
                </div>
            `;
        }

        // Multiple photos - grid layout EXACTLY like working PostComponent
        const gridTemplate = this.getPhotoGridTemplate(photos.length);
        return `
            <div class="post-media-inline multi-photo" style="margin-top: 12px; display: grid; gap: 2px; border-radius: 12px; overflow: hidden; max-height: 400px; ${gridTemplate}">
                ${photos.slice(0, 4).map((photo, index) => {
                    const isGif = photo.mimeType === 'image/gif';
                    const gridStyle = this.getPhotoGridStyle(photos.length, index);
                    return `
                        <div class="post-media-item" style="${gridStyle}; position: relative; overflow: hidden;">
                            <img src="${photo.url}"
                                 alt="Post image ${index + 1}"
                                 ${settings.enableLazyLoading ? 'loading="lazy"' : ''}
                                 data-action="openMediaViewer" data-param1="${photo.url}" data-param2="${photo.mimeType}" data-param3="${photo.id}"
                                 style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; display: block;">
                            ${isGif ? '<div class="media-type-badge gif-badge" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">GIF</div>' : ''}
                            ${photos.length > 4 && index === 3 ? `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">+${photos.length - 4}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Render post videos with thumbnail and play button
     * @param {Array} videos - Array of video objects
     * @param {Object} settings - Render settings
     * @returns {string} HTML string for videos
     * @private
     */
    renderPostVideos(videos, settings) {
        if (!videos || videos.length === 0) {
            return '';
        }

        console.log('📹 RENDERER - renderPostVideos called', {
            videosProvided: !!videos,
            videosLength: videos.length
        });

        return `
            <div class="post-videos" style="margin-top: 12px;">
                ${videos.map(video => `
                    <div class="post-video-item"
                         data-video-id="${video.id}"
                         data-action="playPostVideo"
                         style="position: relative; border-radius: 12px; overflow: hidden; cursor: pointer; margin-bottom: 8px;">
                        <img src="${video.thumbnailUrl || VIDEO_PLACEHOLDER}"
                             alt="Video"
                             loading="lazy"
                             style="width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover;"
                             onerror="this.src='${VIDEO_PLACEHOLDER}'"
                        <div class="video-play-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 64px; height: 64px; background: rgba(0,0,0,0.7); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
                            <span class="play-icon">▶</span>
                        </div>
                        <span class="video-duration" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${this.formatVideoDuration(video.duration)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Format video duration in seconds to MM:SS
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     * @private
     */
    formatVideoDuration(seconds) {
        if (!seconds || seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get CSS grid template for photo layouts
     * EXACT COPY from working PostComponent.getPhotoGridTemplate()
     * @private
     */
    getPhotoGridTemplate(totalCount) {
        if (totalCount === 2) {
            return 'grid-template-columns: 1fr 1fr; grid-template-rows: 250px;';
        } else if (totalCount === 3) {
            return 'grid-template-columns: 1fr 1fr; grid-template-rows: 199px 199px;';
        } else { // 4 or more
            return 'grid-template-columns: 1fr 1fr; grid-template-rows: 199px 199px;';
        }
    }

    /**
     * Get CSS grid styles for photo layouts like modern social media
     * EXACT COPY from working PostComponent.getPhotoGridStyle()
     * @private
     */
    getPhotoGridStyle(totalCount, index) {
        if (totalCount === 2) {
            return `grid-column: ${index + 1}; grid-row: 1;`;
        } else if (totalCount === 3) {
            if (index === 0) {
                return 'grid-column: 1; grid-row: 1 / 3;';
            } else {
                return `grid-column: 2; grid-row: ${index};`;
            }
        } else { // 4 or more
            const col = (index % 2) + 1;
            const row = Math.floor(index / 2) + 1;
            return `grid-column: ${col}; grid-row: ${row};`;
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
     * Render thread indicator inline after content
     * Shows "... Thread (N more)" link for posts with continuations
     * @private
     */
    renderThreadIndicator(post) {
        const threadCount = post.threadPostsCount || post._count?.threadPosts || 0;
        if (threadCount === 0) return '';

        return `
            <span class="thread-indicator"
                  data-action="toggleThreadExpansion"
                  data-post-id="${post.id}"
                  style="color: var(--accent-color, #0d6efd); cursor: pointer; font-weight: 500; margin-left: 4px;">
                ... Thread (${threadCount} more)
            </span>
        `;
    }

    /**
     * Render thread expansion container (initially hidden)
     * Shows all continuation posts when expanded
     * @private
     */
    renderThreadExpansion(post) {
        const threadCount = post.threadPostsCount || post._count?.threadPosts || 0;
        if (threadCount === 0) return '';

        return `
            <div class="thread-expansion" id="thread-expansion-${post.id}" style="display: none;">
                <div class="thread-posts" id="thread-posts-${post.id}">
                    <div class="thread-loading" style="padding: 1rem; text-align: center; color: #666;">
                        Loading thread...
                    </div>
                </div>
                <button class="thread-collapse-btn"
                        data-action="collapseThread"
                        data-post-id="${post.id}"
                        style="display: block; width: 100%; padding: 0.5rem; margin-top: 0.5rem; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; color: #666; font-size: 0.9rem;">
                    Hide thread
                </button>
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
                        data-action="toggleComments" data-post-id="${post.id}">
                    <span class="action-icon">💬</span>
                    <span class="action-count">${post.commentsCount || 0}</span>
                </button>

                <button class="post-action-btn share-btn ${post.isShared ? 'shared' : ''}"
                        data-action="sharePost" data-post-id="${post.id}">
                    <span class="action-icon">🔄</span>
                    <span class="action-count">${post.sharesCount || 0}</span>
                </button>

                <button class="post-action-btn save-btn ${post.isSaved ? 'saved' : ''}"
                        data-action="toggleSave" data-post-id="${post.id}">
                    <span class="action-icon">🔖</span>
                </button>

                ${post.isOwner ? `
                    <button class="post-action-btn more-btn"
                            data-action="showPostMenu" data-post-id="${post.id}">
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
                            data-action="toggleReaction" data-post-id="${post.id}" data-param1="sentiment" data-param2="LIKE"
                            data-reaction-type="sentiment"
                            data-reaction-value="LIKE">
                        <span class="emoji">😊</span>
                        <span class="reaction-count">${post.likesCount || 0}</span>
                    </button>
                    <button class="reaction-btn sentiment-dislike ${post.userSentiment === 'DISLIKE' ? 'active' : ''}"
                            data-action="toggleReaction" data-post-id="${post.id}" data-param1="sentiment" data-param2="DISLIKE"
                            data-reaction-type="sentiment"
                            data-reaction-value="DISLIKE">
                        <span class="emoji">😞</span>
                        <span class="reaction-count">${post.dislikesCount || 0}</span>
                    </button>
                </div>
                <div class="stance-group">
                    <button class="reaction-btn stance-agree ${post.userStance === 'AGREE' ? 'active' : ''}"
                            data-action="toggleReaction" data-post-id="${post.id}" data-param1="stance" data-param2="AGREE"
                            data-reaction-type="stance"
                            data-reaction-value="AGREE">
                        <span class="emoji">👍</span>
                        <span class="reaction-count">${post.agreesCount || 0}</span>
                    </button>
                    <button class="reaction-btn stance-disagree ${post.userStance === 'DISAGREE' ? 'active' : ''}"
                            data-action="toggleReaction" data-post-id="${post.id}" data-param1="stance" data-param2="DISAGREE"
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
                <button class="mod-btn" data-action="moderatePost" data-post-id="${post.id}" data-param1="flag" style="font-size: 0.8rem; margin-right: 8px;">🚩 Flag</button>
                <button class="mod-btn" data-action="moderatePost" data-post-id="${post.id}" data-param1="hide" style="font-size: 0.8rem; margin-right: 8px;">👁️ Hide</button>
                <button class="mod-btn" data-action="moderatePost" data-post-id="${post.id}" data-param1="delete" style="font-size: 0.8rem; color: #dc3545;">🗑️ Delete</button>
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
                <button data-action="toggleContentWarning"
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
                                data-action="hideComments" data-post-id="${post.id}">
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
                         data-action="openPostFocus" data-post-id="${comments[0].postId}">
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