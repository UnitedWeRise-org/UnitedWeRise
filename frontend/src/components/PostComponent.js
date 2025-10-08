/**
 * Reusable Post Component System
 * Handles all post interactions: likes, comments, shares, etc.
 * Created to standardize post behavior across all views
 */

class PostComponent {
    constructor() {
        this.apiBase = window.API_BASE || '/api';
        this.initializeContentModeration();
        this.initializeEventListeners();
    }

    /**
     * Initialize content moderation system
     */
    initializeContentModeration() {
        // Initialize content warning and sensitive content viewer components (optional)
        if (typeof ContentWarningScreen !== 'undefined') {
            this.contentWarning = new ContentWarningScreen();
            this.contentWarning.initializeEventListeners();
        }

        if (typeof SensitiveContentViewer !== 'undefined') {
            this.sensitiveViewer = new SensitiveContentViewer();
        }
    }

    /**
     * Renders a single post with all interactive elements
     * @param {Object} post - Post data object
     * @param {Object} options - Rendering options (showActions, showComments, etc.)
     * @returns {string} HTML string for the post
     */
    renderPost(post, options = {}) {
        // PRIORITY 1: Use UnifiedPostRenderer for consistent display platform-wide
        if (window.unifiedPostRenderer) {
            try {
                console.log('✅ PostComponent: Using UnifiedPostRenderer for post', post.id);
                const context = options.context || (options.inFeed ? 'feed' : 'focus');
                return window.unifiedPostRenderer.render(post, {
                    context: context,
                    showActions: options.showActions !== false,
                    showComments: options.showComments !== false,
                    showAuthor: options.showAuthor !== false,
                    showTimestamp: options.showTimestamp !== false,
                    compactView: options.compactView || false,
                    photoSize: options.photoSize || 'medium',
                    showTopicIndicators: options.showTopicIndicators || false,
                    ...options
                });
            } catch (error) {
                console.error('❌ UnifiedPostRenderer failed in PostComponent, using legacy renderer:', error);
            }
        }

        // Legacy renderer fallback (for compatibility during transition)
        console.log('⚠️ PostComponent: Using legacy renderer for post', post.id);
        const defaults = {
            showActions: true,
            showComments: true,
            showAuthor: true,
            showTimestamp: true,
            compactView: false
        };

        const settings = { ...defaults, ...options };
        const timeAgo = this.getTimeAgo(new Date(post.createdAt));
        const authorName = post.author?.firstName || post.author?.username || 'Anonymous';
        const authorInitial = authorName[0].toUpperCase();

        // Check for content moderation flags
        const hasContentFlags = post.contentFlags && typeof post.contentFlags === 'object' && Object.keys(post.contentFlags).length > 0;
        const shouldShowWarning = hasContentFlags && this.contentWarning && this.contentWarning.shouldHideContent(post.contentFlags);

        // === COMPREHENSIVE POST AVATAR DEBUGGING ===
        adminDebugLog('PostAvatar', '=== POST AVATAR DIAGNOSTIC START ===');
        adminDebugLog('PostAvatar', 'renderPost full post object', post);
        adminDebugLog('PostAvatar', 'post.author object', post.author);
        adminDebugLog('PostAvatar', 'post.author.avatar value', post.author?.avatar);
        adminDebugLog('PostAvatar', 'post.author.avatar type', typeof post.author?.avatar);
        adminDebugLog('PostAvatar', 'authorName', authorName);
        adminDebugLog('PostAvatar', 'authorInitial', authorInitial);
        adminDebugLog('PostAvatar', 'Will show avatar image?', !!post.author?.avatar);
        adminDebugLog('PostAvatar', 'Avatar URL to use', post.author?.avatar || `placeholder with ${authorInitial}`);
        adminDebugLog('PostAvatar', '=== POST AVATAR DIAGNOSTIC END ===');


        // Generate the main post content
        const mainPostContent = `
            <div class="post-component" data-post-id="${post.id}" data-author-reputation="${post.authorReputation || 70}">
                ${settings.showAuthor ? `
                    <div class="post-header">
                        <div class="post-avatar user-card-trigger"
                             onclick="postComponent.showUserCard(event, '${post.author?.id || ''}', {postId: '${post.id}'})"
                             style="cursor: pointer;"
                             title="Click to view profile">
                            ${post.author?.avatar ?
                                `<img src="${post.author.avatar}" alt="Profile Picture" class="avatar-img">` :
                                `<div class="avatar-placeholder">${authorInitial}</div>`
                            }
                        </div>
                        <div class="post-author-info">
                            <div class="post-author-name user-card-trigger"
                                 onclick="postComponent.showUserCard(event, '${post.author?.id || ''}', {postId: '${post.id}'})"
                                 style="cursor: pointer;"
                                 title="Click to view profile">
                                ${authorName}
                                ${post.author?.verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
                                ${this.renderUserBadges(post.author)}
                            </div>
                            ${settings.showTimestamp ? `
                                <div class="post-timestamp">@${post.author?.username || 'unknown'} • ${timeAgo}</div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="post-content" onclick="postComponent.openPostFocus('${post.id}')" style="cursor: pointer;">
                    ${this.formatPostContent(post.content, post)}
                </div>

                ${post.imageUrl ? `
                    <div class="post-image">
                        <img src="${post.imageUrl}" alt="Post image" loading="lazy">
                    </div>
                ` : ''}

                ${this.renderPostMedia(post.photos)}

                ${settings.showActions ? `
                    <div class="post-actions" data-post-id="${post.id}">
                        ${this.renderEnhancedReactions(post)}

                        <button class="post-action-btn comment-btn"
                                onclick="postComponent.toggleComments('${post.id}')">
                            <span class="action-icon">💬</span>
                            <span class="action-count">${post.commentsCount || 0}</span>
                        </button>

                        <button class="post-action-btn share-btn ${post.isShared ? 'shared' : ''}"
                                onclick="postComponent.sharePost('${post.id}')">
                            <span class="action-icon">🔄</span>
                            <span class="action-count">${post.sharesCount || 0}</span>
                        </button>

                        <button class="post-action-btn save-btn ${post.isSaved ? 'saved' : ''}"
                                onclick="postComponent.toggleSave('${post.id}')">
                            <span class="action-icon">${post.isSaved ? '🔖' : '🔖'}</span>
                        </button>

                        ${post.isOwner ? `
                            <button class="post-action-btn more-btn"
                                    onclick="postComponent.showPostMenu('${post.id}')">
                                <span class="action-icon">⋯</span>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}

                ${settings.showComments ? `
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
                                        onclick="postComponent.hideComments('${post.id}')">
                                    Cancel
                                </button>
                            </div>
                        </div>
                        <div class="comments-list" id="comments-list-${post.id}">
                            <!-- Comments will be loaded here -->
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Apply content moderation if needed
        if (shouldShowWarning) {
            // Show content warning screen instead of post content
            const warningScreen = this.contentWarning.renderWarningScreen(post.contentFlags, post.id);
            const sensitiveContentWrapper = this.sensitiveViewer.wrapSensitiveContent(mainPostContent, post.contentFlags, post.id);

            return warningScreen + sensitiveContentWrapper;
        } else {
            // Return normal post content
            return mainPostContent;
        }
    }

    /**
     * Toggle reaction for a post (sentiment: LIKE/DISLIKE, stance: AGREE/DISAGREE)
     */
    async toggleReaction(postId, reactionType, reactionValue) {
        // Check authentication using current user
        const currentUser = window.currentUser;
        if (!currentUser) {
            alert('Please log in to react to posts');
            return;
        }

        const postActions = document.querySelector(`[data-post-id="${postId}"]`);
        if (!postActions) return;

        // Find the specific reaction button
        const reactionBtn = postActions.querySelector(`[data-reaction-type="${reactionType}"][data-reaction-value="${reactionValue}"]`);
        if (!reactionBtn) return;

        const isActive = reactionBtn.classList.contains('active');
        const countElement = reactionBtn.querySelector('.reaction-count');
        const currentCount = parseInt(countElement.textContent) || 0;

        // Find other buttons in the same group to deactivate them
        const groupButtons = postActions.querySelectorAll(`[data-reaction-type="${reactionType}"]`);

        // Store original states for rollback
        const originalStates = Array.from(groupButtons).map(btn => ({
            button: btn,
            wasActive: btn.classList.contains('active'),
            originalCount: parseInt(btn.querySelector('.reaction-count').textContent) || 0
        }));

        // Optimistic UI update
        if (isActive) {
            // Deactivate current reaction
            reactionBtn.classList.remove('active');
            countElement.textContent = Math.max(0, currentCount - 1);
        } else {
            // Deactivate other buttons in the same group
            groupButtons.forEach(btn => {
                if (btn !== reactionBtn && btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    const btnCount = btn.querySelector('.reaction-count');
                    const btnCurrentCount = parseInt(btnCount.textContent) || 0;
                    btnCount.textContent = Math.max(0, btnCurrentCount - 1);
                }
            });

            // Activate current reaction
            reactionBtn.classList.add('active');
            countElement.textContent = currentCount + 1;
        }

        try {
            const response = await window.apiCall(`/posts/${postId}/reaction`, {
                method: 'POST',
                body: JSON.stringify({
                    reactionType,
                    reactionValue: isActive ? null : reactionValue // null to remove reaction
                })
            });

            if (!response.ok) {
                console.error('Failed to toggle reaction:', {
                    status: response.status,
                    error: response.data?.error || response.data?.message || 'Unknown error',
                    reactionType,
                    reactionValue,
                    endpoint: `/posts/${postId}/reaction`
                });

                // Revert all UI changes on error
                originalStates.forEach(state => {
                    if (state.wasActive) {
                        state.button.classList.add('active');
                    } else {
                        state.button.classList.remove('active');
                    }
                    state.button.querySelector('.reaction-count').textContent = state.originalCount;
                });
            }
        } catch (error) {
            console.error('Error toggling reaction:', error);

            // Revert all UI changes on error
            originalStates.forEach(state => {
                if (state.wasActive) {
                    state.button.classList.add('active');
                } else {
                    state.button.classList.remove('active');
                }
                state.button.querySelector('.reaction-count').textContent = state.originalCount;
            });
        }
    }

    /**
     * Toggle reaction on a comment
     */
    async toggleCommentReaction(commentId, reactionType, reactionValue) {
        // Check authentication using current user
        const currentUser = window.currentUser;
        if (!currentUser) {
            alert('Please log in to react to comments');
            return;
        }

        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentElement) return;

        // Find the specific reaction button using both reaction type and value
        const reactionBtn = commentElement.querySelector(`.comment-reaction-btn.${reactionType}-${reactionValue.toLowerCase()}`);
        if (!reactionBtn) return;

        const isActive = reactionBtn.classList.contains('active');
        const countElement = reactionBtn.querySelector('.reaction-count');
        const currentCount = parseInt(countElement.textContent) || 0;

        // Find other buttons in the same group to deactivate them
        const groupSelector = reactionType === 'sentiment' ? '.comment-sentiment-group .comment-reaction-btn' : '.comment-stance-group .comment-reaction-btn';
        const groupButtons = commentElement.querySelectorAll(groupSelector);

        // Store original states for rollback
        const originalStates = Array.from(groupButtons).map(btn => ({
            button: btn,
            wasActive: btn.classList.contains('active'),
            originalCount: parseInt(btn.querySelector('.reaction-count').textContent) || 0
        }));

        // Optimistic UI update
        if (isActive) {
            // Deactivate current reaction
            reactionBtn.classList.remove('active');
            countElement.textContent = Math.max(0, currentCount - 1);
        } else {
            // Deactivate other buttons in the same group
            groupButtons.forEach(btn => {
                if (btn !== reactionBtn && btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    const btnCount = btn.querySelector('.reaction-count');
                    const btnCurrentCount = parseInt(btnCount.textContent) || 0;
                    btnCount.textContent = Math.max(0, btnCurrentCount - 1);
                }
            });

            // Activate current reaction
            reactionBtn.classList.add('active');
            countElement.textContent = currentCount + 1;
        }

        try {
            const response = await window.apiCall(`/posts/comments/${commentId}/reaction`, {
                method: 'POST',
                body: JSON.stringify({
                    reactionType,
                    reactionValue: isActive ? null : reactionValue // null to remove reaction
                })
            });

            if (!response.ok) {
                console.error('Failed to toggle comment reaction:', {
                    status: response.status,
                    error: response.data?.error || response.data?.message || 'Unknown error',
                    reactionType,
                    reactionValue,
                    endpoint: `/posts/comments/${commentId}/reaction`
                });

                // Revert all UI changes on error
                originalStates.forEach(state => {
                    if (state.wasActive) {
                        state.button.classList.add('active');
                    } else {
                        state.button.classList.remove('active');
                    }
                    state.button.querySelector('.reaction-count').textContent = state.originalCount;
                });
            }
        } catch (error) {
            console.error('Error toggling comment reaction:', error);

            // Revert all UI changes on error
            originalStates.forEach(state => {
                if (state.wasActive) {
                    state.button.classList.add('active');
                } else {
                    state.button.classList.remove('active');
                }
                state.button.querySelector('.reaction-count').textContent = state.originalCount;
            });
        }
    }

    /**
     * Toggle comments section visibility and show extended content inline
     */
    async toggleComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (!commentsSection) return;

        if (commentsSection.style.display === 'none') {
            // Show comments section
            commentsSection.style.display = 'block';
            
            // Load extended content if it exists and show it inline
            await this.showExtendedContentInline(postId);
            
            // Load comments
            await this.loadComments(postId);
            
            // Auto-scroll to make comment box visible
            setTimeout(() => {
                commentsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }, 100);
        } else {
            // Hide comments section and extended content
            commentsSection.style.display = 'none';
            this.hideExtendedContentInline(postId);
        }
    }

    /**
     * Toggle save/unsave for a post
     */
    async toggleSave(postId) {
        // Check authentication
        const currentUser = window.currentUser;
        if (!currentUser) {
            alert('Please log in to save posts');
            return;
        }

        // Find the save button
        const postActions = document.querySelector(`[data-post-id="${postId}"]`);
        if (!postActions) return;

        const saveBtn = postActions.querySelector('.save-btn');
        if (!saveBtn) return;

        const iconElement = saveBtn.querySelector('.action-icon');
        const wasSaved = saveBtn.classList.contains('saved');

        // Store original state for rollback
        const originalSaved = wasSaved;
        const originalIcon = iconElement.textContent;

        // Optimistic UI update
        if (wasSaved) {
            // Unsave
            saveBtn.classList.remove('saved');
            iconElement.textContent = '🔖';
        } else {
            // Save
            saveBtn.classList.add('saved');
            iconElement.textContent = '🔖';
        }

        try {
            const endpoint = wasSaved ? `/posts/${postId}/save` : `/posts/${postId}/save`;
            const method = wasSaved ? 'DELETE' : 'POST';

            const response = await window.apiCall(endpoint, {
                method: method
            });

            if (!response.ok) {
                console.error('Failed to toggle save:', {
                    status: response.status,
                    error: response.data?.error || response.data?.message || 'Unknown error',
                    endpoint,
                    method
                });

                // Revert UI on error
                if (originalSaved) {
                    saveBtn.classList.add('saved');
                } else {
                    saveBtn.classList.remove('saved');
                }
                iconElement.textContent = originalIcon;

                // Show error toast
                this.showToast('Failed to save post. Please try again.', 'error');
            } else {
                // Update post data in memory if it exists
                if (window.currentPosts) {
                    const postIndex = window.currentPosts.findIndex(p => p.id === postId);
                    if (postIndex !== -1) {
                        window.currentPosts[postIndex].isSaved = !wasSaved;
                    }
                }

                // Show success toast
                const message = wasSaved ? 'Post removed from saved' : 'Post saved';
                this.showToast(message, 'success');
            }
        } catch (error) {
            console.error('Error toggling save:', error);

            // Revert UI on error
            if (originalSaved) {
                saveBtn.classList.add('saved');
            } else {
                saveBtn.classList.remove('saved');
            }
            iconElement.textContent = originalIcon;

            // Show error toast
            this.showToast('Failed to save post. Please try again.', 'error');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Check if toast container exists, create if not
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000;';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            margin-top: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Batch check saved status for multiple posts
     */
    async checkSavedStatus(postIds) {
        if (!postIds || postIds.length === 0) return {};

        const currentUser = window.currentUser;
        if (!currentUser) return {};

        try {
            const response = await window.apiCall('/posts/saved/check', {
                method: 'POST',
                body: JSON.stringify({ postIds })
            });

            if (response.ok && response.data?.data?.saved) {
                return response.data.data.saved;
            }

            return {};
        } catch (error) {
            console.error('Error checking saved status:', error);
            return {};
        }
    }

    /**
     * Show extended content inline when comments are expanded
     */
    async showExtendedContentInline(postId) {
        try {
            // Get the post data to check for extended content
            const postResponse = await window.apiCall(`/posts/${postId}`);
            if (!postResponse.ok || !postResponse.data.post || !postResponse.data.post.extendedContent) {
                return; // No extended content to show
            }

            const post = postResponse.data.post;
            const postContentDiv = document.querySelector(`[data-post-id="${postId}"] .post-content`);
            if (!postContentDiv) return;

            // Check if extended content is already shown
            const existingExtended = postContentDiv.querySelector('.inline-extended-content');
            if (existingExtended) return;

            // Add extended content after main content
            const extendedContentDiv = document.createElement('div');
            extendedContentDiv.className = 'inline-extended-content';
            extendedContentDiv.innerHTML = `
                <div class="read-more-divider" style="color: #657786; font-size: 0.9em; margin: 0.5rem 0;">
                    ...
                </div>
                <div style="margin-top: 0.5rem;">
                    ${this.formatPostContent(post.extendedContent, post)}
                </div>
            `;

            // Keep the post content clickable for Post Focus View
            // The cursor stays as pointer and onclick remains active
            
            postContentDiv.appendChild(extendedContentDiv);

        } catch (error) {
            console.error('Error showing extended content inline:', error);
        }
    }

    /**
     * Hide extended content inline when comments are collapsed
     */
    hideExtendedContentInline(postId) {
        const postContentDiv = document.querySelector(`[data-post-id="${postId}"] .post-content`);
        if (!postContentDiv) return;

        // Remove extended content
        const existingExtended = postContentDiv.querySelector('.inline-extended-content');
        if (existingExtended) {
            existingExtended.remove();
        }

        // Post content onclick remains active - no need to restore
    }

    /**
     * Hide comments section
     */
    hideComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (commentsSection) {
            commentsSection.style.display = 'none';
        }
    }

    /**
     * Load comments for a post
     */
    async loadComments(postId) {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (!commentsList) return;

        // Hide completely during transition to eliminate blip
        commentsList.style.opacity = '0';
        commentsList.innerHTML = '<div class="loading">Loading comments...</div>';

        try {
            // Bypass cache to ensure fresh data
            const response = await window.apiCall(`/posts/${postId}/comments`, {
                bypassCache: true
            });
            console.log('Load comments response:', response);

            if (response && (response.comments || response.ok)) {
                const data = response.data || response;
                console.log('Comments data:', data);
                this.renderComments(postId, data.comments || []);
                // Small delay to ensure DOM has updated, then slow fade in
                setTimeout(() => {
                    commentsList.style.opacity = '1';
                }, 100);
            } else {
                console.error('Failed to load comments:', response);
                commentsList.innerHTML = '<div class="error">Failed to load comments</div>';
                setTimeout(() => {
                    commentsList.style.opacity = '1';
                }, 100);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            commentsList.innerHTML = '<div class="error">Error loading comments</div>';
            setTimeout(() => {
                commentsList.style.opacity = '1';
            }, 100);
        }
    }

    /**
     * Render comments list with nested threading (3-layer system)
     */
    renderComments(postId, comments) {
        // Try both naming conventions - focused view uses different ID
        const commentsList = document.getElementById(`comments-list-${postId}`) || 
                            document.getElementById(`comments-container-${postId}`);
        if (!commentsList) return;

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
            return;
        }

        // SIMPLE APPROACH: Flatten all comments into one array
        const allComments = this.flattenCommentTree(comments);
        
        // Render all comments with visual depth capping
        const commentsHtml = allComments.map(comment => this.renderSimpleComment(comment, postId)).join('');
        commentsList.innerHTML = commentsHtml;
    }

    /**
     * Calculate total reply count recursively (all nested replies)
     */
    calculateTotalReplies(comment) {
        if (!comment.replies || comment.replies.length === 0) {
            return 0;
        }
        
        let totalCount = comment.replies.length; // Direct replies
        
        // Add all nested replies recursively
        comment.replies.forEach(reply => {
            totalCount += this.calculateTotalReplies(reply);
        });
        
        return totalCount;
    }

    /**
     * Flatten comment tree into single array with depth tracking
     */
    flattenCommentTree(comments, depth = 0, parentId = null) {
        let result = [];
        
        comments.forEach(comment => {
            // Check if this comment has replies and count them recursively
            const hasReplies = comment.replies && comment.replies.length > 0;
            const replyCount = this.calculateTotalReplies(comment);
            
            // Add this comment with its current depth and parent info
            result.push({ 
                ...comment, 
                depth, 
                parentId,
                hasReplies,
                replyCount
            });
            
            // If it has replies, flatten those too
            if (hasReplies) {
                const childComments = this.flattenCommentTree(comment.replies, depth + 1, comment.id);
                result = result.concat(childComments);
            }
        });
        
        return result;
    }

    /**
     * Render simple comment with visual depth capping
     */
    renderSimpleComment(comment, postId) {
        const user = comment.author || comment.user;
        const displayName = user?.firstName || user?.username || 'Anonymous';
        
        // Cap visual depth at 2 (40px indent maximum)
        const visualDepth = Math.min(comment.depth, 2);
        const marginLeft = visualDepth * 20;
        const isFlattened = comment.depth >= 2;
        
        // Check if this comment has replies (children at next depth level)
        const hasReplies = comment.hasReplies || false;
        
        // Start collapsed for all non-top-level comments
        const isCollapsed = comment.depth > 0;
        const displayStyle = isCollapsed ? 'display: none;' : '';
        
        return `
            <div class="comment ${isFlattened ? 'flattened-comment' : ''} ${isCollapsed ? 'collapsed-thread' : ''}" 
                 data-comment-id="${comment.id}" 
                 data-depth="${visualDepth}" 
                 data-parent-id="${comment.parentId || ''}"
                 style="margin-left: ${marginLeft}px; ${displayStyle}">
                <div class="comment-header">
                    <span class="comment-author">${displayName}</span>
                    <span class="comment-time">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    ${isFlattened ? '<span class="flattened-indicator">↳</span>' : ''}
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    ${this.renderCommentReactions(comment)}
                    ${hasReplies ? `
                        <button class="expand-thread-btn" onclick="postComponent.toggleThread('${comment.id}')">
                            <span class="expand-icon">▶</span> <span class="replies-count">${comment.replyCount || ''} replies</span>
                        </button>
                    ` : ''}
                    <button class="reply-btn" onclick="postComponent.toggleReplyBox('${comment.id}', '${postId}')">
                        💬 Reply
                    </button>
                </div>
                <div class="reply-box" id="reply-box-${comment.id}" style="display: none; margin-top: 10px;">
                    <textarea class="reply-input" id="reply-input-${comment.id}" placeholder="Write a reply..." rows="2"></textarea>
                    <div class="reply-box-actions">
                        <button class="submit-reply-btn" onclick="postComponent.submitReply('${comment.id}', '${postId}')">Post Reply</button>
                        <button class="cancel-reply-btn" onclick="postComponent.cancelReply('${comment.id}')">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render individual comment with nested replies (OLD COMPLEX APPROACH - REPLACED)
     */
    renderComment(comment, postId, depth) {
        // Handle both 'author' and 'user' properties for compatibility
        const user = comment.author || comment.user;
        const displayName = user?.firstName || user?.username || 'Anonymous';
        const hasReplies = comment.replies && comment.replies.length > 0;
        const replyCount = hasReplies ? comment.replies.length : 0;
        
        // Use the depth from the backend if available, otherwise fall back to calculated depth
        const actualDepth = comment.depth !== undefined ? comment.depth : depth;
        
        // DEBUG: Log what depths we're working with
        console.log(`🔍 Comment ${comment.id.slice(-4)}: backend depth=${comment.depth}, passed depth=${depth}, actualDepth=${actualDepth}`);
        
        // SIMPLE FRONTEND-ONLY SOLUTION: Cap visual depth at 2
        const visualDepth = Math.min(actualDepth, 2); // Never show more than 3 visual layers (0, 1, 2)
        const marginLeft = visualDepth * 20; // 0px, 20px, or 40px max
        
        // Show flattened indicator for any comment at visual depth 2 (which includes all actual depths 2+)
        const isFlattened = visualDepth >= 2;
        const flattenedClass = isFlattened ? ' flattened-comment' : '';
        
        console.log(`   → visualDepth=${visualDepth}, marginLeft=${marginLeft}px, flattened=${isFlattened}`);
        
        let commentHtml = `
            <div class="comment${flattenedClass}" data-comment-id="${comment.id}" data-depth="${actualDepth}" style="margin-left: ${marginLeft}px;">
                <div class="comment-header">
                    <span class="comment-author">${displayName}${this.renderUserBadges(user)}</span>
                    <span class="comment-time">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    ${isFlattened ? '<span class="flattened-indicator">↳</span>' : ''}
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    ${this.renderCommentReactions(comment)}
                    <button class="reply-btn" onclick="postComponent.toggleReplyBox('${comment.id}', '${postId}')">
                        💬 Reply
                    </button>
                    ${hasReplies ? `
                        <button class="toggle-replies-btn" onclick="postComponent.toggleReplies('${comment.id}')">
                            <span class="toggle-text">${replyCount > 1 ? `▼ ${replyCount} replies` : `▼ ${replyCount} reply`}</span>
                        </button>
                    ` : ''}
                </div>
                <div class="reply-box" id="reply-box-${comment.id}" style="display: none; margin-top: 10px;">
                    <textarea class="reply-input" id="reply-input-${comment.id}" placeholder="Write a reply..." rows="2"></textarea>
                    <div class="reply-box-actions">
                        <button class="submit-reply-btn" onclick="postComponent.submitReply('${comment.id}', '${postId}')">Post Reply</button>
                        <button class="cancel-reply-btn" onclick="postComponent.cancelReply('${comment.id}')">Cancel</button>
                    </div>
                </div>
        `;

        // Add nested replies if they exist - TRUE FLATTENING
        if (hasReplies) {
            console.log(`   📦 Has ${replyCount} replies, visualDepth=${visualDepth}`);
            
            if (visualDepth >= 2) {
                console.log(`   🔸 COLLECTING flattened comments for root-level display`);
                // Collect ALL replies recursively but render them flat
                this.collectFlattenedReplies(comment.replies, postId);
            } else {
                console.log(`   📦 NESTED rendering (with container) for depth ${visualDepth} parent`);
                // Normal nesting with container ONLY for depth 0 and 1 parents
                commentHtml += `<div class="replies-container" id="replies-${comment.id}">`;
                commentHtml += comment.replies.map(reply => {
                    const replyDepth = reply.depth || actualDepth + 1;
                    console.log(`      → Rendering nested reply with depth=${replyDepth}`);
                    return this.renderComment(reply, postId, replyDepth);
                }).join('');
                commentHtml += `</div>`;
            }
        }

        commentHtml += `</div>`;
        return commentHtml;
    }

    /**
     * Recursively collect all replies for flattening at root level
     */
    collectFlattenedReplies(replies, postId) {
        replies.forEach(reply => {
            console.log(`      → Collecting flattened reply: ${reply.id.slice(-4)} (depth ${reply.depth})`);
            
            // Render this reply as a flat comment (force depth 2 for consistent display)
            if (this.flattenedComments) {
                this.flattenedComments.push(this.renderFlatComment(reply, postId));
            }
            
            // If this reply has replies, collect those too (all flat)
            if (reply.replies && reply.replies.length > 0) {
                this.collectFlattenedReplies(reply.replies, postId);
            }
        });
    }

    /**
     * Render a comment as flat (no recursive reply processing)
     */
    renderFlatComment(comment, postId) {
        const user = comment.author || comment.user;
        const displayName = user?.firstName || user?.username || 'Anonymous';

        // All flattened comments display at depth 2 (40px indent)
        const marginLeft = 40;

        console.log(`         → Rendering flat comment: ${comment.id.slice(-4)} at 40px indent`);

        return `
            <div class="comment flattened-comment" data-comment-id="${comment.id}" data-depth="2" style="margin-left: ${marginLeft}px;">
                <div class="comment-header">
                    <span class="comment-author">${displayName}</span>
                    <span class="comment-time">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    <span class="flattened-indicator">↳</span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    ${this.renderCommentReactions(comment)}
                    <button class="reply-btn" onclick="postComponent.toggleReplyBox('${comment.id}', '${postId}')">
                        💬 Reply
                    </button>
                </div>
                <div class="reply-box" id="reply-box-${comment.id}" style="display: none; margin-top: 10px;">
                    <textarea class="reply-input" id="reply-input-${comment.id}" placeholder="Write a reply..." rows="2"></textarea>
                    <div class="reply-box-actions">
                        <button class="submit-reply-btn" onclick="postComponent.submitReply('${comment.id}', '${postId}')">Post Reply</button>
                        <button class="cancel-reply-btn" onclick="postComponent.cancelReply('${comment.id}')">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Add a comment to a post
     */
    async addComment(postId) {
        console.log('🎯 PostComponent.addComment called for postId:', postId);

        // Use UnifiedPostCreator for comment creation
        try {
            const result = await window.unifiedPostCreator.create({
                type: 'comment',
                textareaId: `comment-input-${postId}`,
                postId: postId,
                onSuccess: (response) => {
                    console.log('✅ Comment created successfully:', response);

                    // Reload comments after successful creation
                    setTimeout(async () => {
                        await this.loadComments(postId, true); // Force cache bypass
                    }, 500);

                    // Update comment count in UI
                    const commentBtn = document.querySelector(`[data-post-id="${postId}"] .comment-btn .action-count`);
                    if (commentBtn) {
                        const currentCount = parseInt(commentBtn.textContent) || 0;
                        commentBtn.textContent = currentCount + 1;
                    }

                    // Show success feedback
                    this.showToast('Comment added successfully!');
                },
                onError: (error) => {
                    console.error('❌ Comment creation failed:', error);

                    // Handle staging environment restriction
                    if (error.error?.includes('staging') || error.error?.includes('admin')) {
                        this.showToast('Staging environment: Admin access required for comments');
                    } else {
                        const errorMsg = error.error || 'Failed to add comment';
                        alert(`Failed to add comment: ${errorMsg}`);
                    }
                },
                clearAfterSuccess: true
            });

            if (!result.success) {
                console.warn('🚨 UnifiedPostCreator returned failure:', result);
            }

        } catch (error) {
            console.error('❌ Error in addComment:', error);
            alert('Error adding comment');
        }
    }

    /**
     * Recursively collapse all descendants of a comment
     */
    collapseAllDescendants(commentId) {
        const directChildren = document.querySelectorAll(`.comment[data-parent-id="${commentId}"]`);
        
        directChildren.forEach(child => {
            // Hide the child comment
            child.style.display = 'none';
            
            // Reset any expand button in this child
            const childExpandBtn = child.querySelector('.expand-thread-btn');
            if (childExpandBtn) {
                childExpandBtn.classList.remove('expanded');
                const icon = childExpandBtn.querySelector('.expand-icon');
                if (icon) icon.textContent = '▶';
            }
            
            // Recursively collapse this child's descendants
            const childId = child.dataset.commentId;
            if (childId) {
                this.collapseAllDescendants(childId);
            }
        });
    }

    /**
     * Toggle thread expansion/collapse
     */
    toggleThread(commentId) {
        console.log('🔄 Toggling thread for comment:', commentId);
        
        // Find all direct child comments of this comment
        const directChildren = document.querySelectorAll(`.comment[data-parent-id="${commentId}"]`);
        const expandBtn = document.querySelector(`.comment[data-comment-id="${commentId}"] .expand-thread-btn`);
        const expandIcon = document.querySelector(`.comment[data-comment-id="${commentId}"] .expand-thread-btn .expand-icon`);
        
        if (directChildren.length === 0) {
            console.log('No child comments found');
            return;
        }
        
        // Check if currently expanded or collapsed
        const isExpanded = directChildren[0].style.display !== 'none';
        
        // Toggle all direct children
        directChildren.forEach(comment => {
            comment.style.display = isExpanded ? 'none' : 'block';
        });
        
        // If collapsing, recursively collapse ALL descendants
        if (isExpanded) {
            directChildren.forEach(child => {
                const childId = child.dataset.commentId;
                if (childId) {
                    this.collapseAllDescendants(childId);
                }
            });
        }
        
        // Update expand/collapse icon and class
        if (expandBtn && expandIcon) {
            if (isExpanded) {
                expandBtn.classList.remove('expanded');
                expandIcon.textContent = '▶';
            } else {
                expandBtn.classList.add('expanded');
                expandIcon.textContent = '▼';
            }
        }
    }

    /**
     * Toggle reply box for a specific comment
     */
    toggleReplyBox(commentId, postId) {
        const replyBox = document.getElementById(`reply-box-${commentId}`);
        if (!replyBox) return;

        const isVisible = replyBox.style.display !== 'none';
        
        // Hide all other reply boxes first
        document.querySelectorAll('.reply-box').forEach(box => {
            if (box.id !== `reply-box-${commentId}`) {
                box.style.display = 'none';
            }
        });

        if (isVisible) {
            replyBox.style.display = 'none';
        } else {
            replyBox.style.display = 'block';
            const input = document.getElementById(`reply-input-${commentId}`);
            if (input) input.focus();
        }
    }

    /**
     * Submit a reply to a comment
     */
    async submitReply(parentId, postId) {
        const currentUser = window.currentUser;
        if (!currentUser) {
            alert('Please log in to reply');
            return;
        }

        const input = document.getElementById(`reply-input-${parentId}`);
        if (!input || !input.value.trim()) return;

        const content = input.value.trim();
        input.disabled = true;

        try {
            const response = await window.apiCall(`/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content, parentId })
            });

            if (response && (response.success || response.comment || response.message === 'Comment added successfully' || response.ok)) {
                input.value = '';
                this.toggleReplyBox(parentId, postId); // Hide reply box
                
                console.log('Reply added successfully, reloading comments...');
                setTimeout(async () => {
                    await this.loadComments(postId);
                }, 200);
                
                // Update comment count
                const commentBtn = document.querySelector(`[data-post-id="${postId}"] .comment-btn .action-count`);
                if (commentBtn) {
                    const currentCount = parseInt(commentBtn.textContent) || 0;
                    commentBtn.textContent = currentCount + 1;
                }
                
                this.showToast('Reply added successfully!');
            } else {
                console.error('Reply submission failed:', response);
                const errorMsg = response.error || response.message || 'Failed to add reply';
                alert(`Failed to add reply: ${errorMsg}`);
            }
        } catch (error) {
            console.error('Error adding reply:', error);
            alert('Error adding reply');
        } finally {
            input.disabled = false;
        }
    }

    /**
     * Cancel reply and hide reply box
     */
    cancelReply(commentId) {
        const replyBox = document.getElementById(`reply-box-${commentId}`);
        const input = document.getElementById(`reply-input-${commentId}`);
        
        if (input) input.value = '';
        if (replyBox) replyBox.style.display = 'none';
    }

    /**
     * Toggle visibility of replies for a comment thread
     */
    toggleReplies(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        const toggleBtn = document.querySelector(`[onclick*="toggleReplies('${commentId}')"] .toggle-text`);
        
        if (!repliesContainer || !toggleBtn) return;

        const isVisible = repliesContainer.style.display !== 'none';
        
        if (isVisible) {
            repliesContainer.style.display = 'none';
            toggleBtn.textContent = toggleBtn.textContent.replace('▼', '▶');
        } else {
            repliesContainer.style.display = 'block';
            toggleBtn.textContent = toggleBtn.textContent.replace('▶', '▼');
        }
    }

    /**
     * Show share options modal
     */
    async sharePost(postId) {
        // Check authentication
        const currentUser = window.currentUser;
        if (!currentUser) {
            alert('Please log in to share posts');
            return;
        }

        // Show share options modal
        this.showShareModal(postId);
    }

    /**
     * Show user card with profile actions (view profile, follow, friend, etc.)
     */
    async showUserCard(event, userId, context = {}) {
        if (!userId) {
            console.warn('PostComponent: No user ID provided for user card');
            return;
        }

        try {
            // Ensure UserCard component is loaded
            if (typeof window.UserCard === 'undefined') {
                console.warn('PostComponent: UserCard component not loaded');
                return;
            }

            // Create UserCard instance if it doesn't exist
            if (!window.userCard) {
                window.userCard = new window.UserCard();
            }

            // Show the user card anchored to the clicked element
            await window.userCard.showCard(event.target.closest('.user-card-trigger'), userId, context);

        } catch (error) {
            console.error('PostComponent: Error showing user card:', error);
            // Fallback to opening user profile page
            window.location.href = `/profile/${userId}`;
        }
    }

    /**
     * Show share modal with options
     */
    showShareModal(postId) {
        const modal = document.createElement('div');
        modal.className = 'modal share-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Share Post</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="share-options">
                        <button class="share-option simple-share" onclick="postComponent.performSimpleShare('${postId}')">
                            <span class="option-icon">🔄</span>
                            <div class="option-text">
                                <span class="option-title">Share</span>
                                <span class="option-desc">Share this post to your timeline</span>
                            </div>
                        </button>

                        <button class="share-option quote-share" onclick="postComponent.showQuoteShareDialog('${postId}')">
                            <span class="option-icon">💬</span>
                            <div class="option-text">
                                <span class="option-title">Quote Share</span>
                                <span class="option-desc">Add your thoughts and share</span>
                            </div>
                        </button>

                        <hr class="menu-divider">

                        <button class="share-option copy-link" onclick="postComponent.copyPostLink('${postId}')">
                            <span class="option-icon">🔗</span>
                            <div class="option-text">
                                <span class="option-title">Copy Link</span>
                                <span class="option-desc">Copy link to clipboard</span>
                            </div>
                        </button>

                        <button class="share-option external-share" onclick="postComponent.externalShare('${postId}')">
                            <span class="option-icon">📱</span>
                            <div class="option-text">
                                <span class="option-title">Share Externally</span>
                                <span class="option-desc">Share via system share menu</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    /**
     * Perform simple share (no commentary)
     */
    async performSimpleShare(postId) {
        try {
            const response = await window.apiCall(`/posts/${postId}/share`, {
                method: 'POST',
                body: JSON.stringify({
                    shareType: 'SIMPLE'
                })
            });

            if (response.ok) {
                this.showToast('Post shared successfully!');
                this.updateShareCount(postId, 1);
                document.querySelector('.share-modal').remove();
            } else {
                console.error('Failed to share post:', response.data?.error);
                this.showToast('Failed to share post', 'error');
            }
        } catch (error) {
            console.error('Error sharing post:', error);
            this.showToast('Error sharing post', 'error');
        }
    }

    /**
     * Show quote share dialog
     */
    showQuoteShareDialog(postId) {
        // Close share modal first
        document.querySelector('.share-modal')?.remove();

        const modal = document.createElement('div');
        modal.className = 'modal quote-share-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Quote Share</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="quote-form">
                        <div class="form-group">
                            <label for="quote-content">Add your thoughts:</label>
                            <textarea id="quote-content"
                                      class="edit-textarea"
                                      placeholder="What do you think about this post?"
                                      rows="4"
                                      maxlength="500"></textarea>
                            <span class="char-count">0/500</span>
                        </div>
                    </div>
                    <div class="quote-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="postComponent.performQuoteShare('${postId}')">Share with Quote</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Add character counting
        const textarea = modal.querySelector('#quote-content');
        const charCount = modal.querySelector('.char-count');
        textarea.addEventListener('input', () => {
            const count = textarea.value.length;
            charCount.textContent = `${count}/500`;
            charCount.style.color = count > 500 ? '#dc3545' : '#666';
        });
    }

    /**
     * Perform quote share with commentary
     */
    async performQuoteShare(postId) {
        const content = document.getElementById('quote-content').value.trim();

        if (!content) {
            this.showToast('Please add your thoughts before sharing', 'error');
            return;
        }

        if (content.length > 500) {
            this.showToast('Commentary must be 500 characters or less', 'error');
            return;
        }

        try {
            const response = await window.apiCall(`/posts/${postId}/share`, {
                method: 'POST',
                body: JSON.stringify({
                    shareType: 'QUOTE',
                    content: content
                })
            });

            if (response.ok) {
                this.showToast('Post shared with your thoughts!');
                this.updateShareCount(postId, 1);
                document.querySelector('.quote-share-modal').remove();
            } else {
                console.error('Failed to share post:', response.data?.error);
                this.showToast('Failed to share post', 'error');
            }
        } catch (error) {
            console.error('Error sharing post:', error);
            this.showToast('Error sharing post', 'error');
        }
    }

    /**
     * Copy post link to clipboard
     */
    async copyPostLink(postId) {
        const postUrl = `${window.location.origin}/post/${postId}`;

        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(postUrl);
                this.showToast('Link copied to clipboard!');
                document.querySelector('.share-modal').remove();
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                this.showToast('Failed to copy link', 'error');
            }
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = postUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Link copied to clipboard!');
            document.querySelector('.share-modal').remove();
        }
    }

    /**
     * Use system share menu
     */
    async externalShare(postId) {
        const postUrl = `${window.location.origin}/post/${postId}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this post on UnitedWeRise',
                    url: postUrl
                });
                document.querySelector('.share-modal').remove();
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                    this.showToast('Share cancelled or failed', 'error');
                }
            }
        } else {
            this.showToast('System sharing not available on this device', 'error');
        }
    }

    /**
     * Update share count in UI
     */
    updateShareCount(postId, increment) {
        const shareBtn = document.querySelector(`[data-post-id="${postId}"] .share-btn .action-count`);
        if (shareBtn) {
            const currentCount = parseInt(shareBtn.textContent) || 0;
            shareBtn.textContent = Math.max(0, currentCount + increment);
        }
    }

    /**
     * Show post menu (edit, delete, etc.)
     */
    showPostMenu(postId) {
        // Create and show post menu modal
        const modalHtml = `
            <div class="modal post-menu-modal" id="postMenu-${postId}">
                <div class="modal-content post-menu-content">
                    <div class="modal-header">
                        <h3>Post Options</h3>
                        <span class="close" onclick="postComponent.closePostMenu('${postId}')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="post-menu-options">
                            <button class="menu-option edit-option" onclick="postComponent.editPost('${postId}')">
                                <span class="option-icon">✏️</span>
                                <div class="option-text">
                                    <span class="option-title">Edit Post</span>
                                    <span class="option-desc">Make changes to your post</span>
                                </div>
                            </button>

                            <button class="menu-option history-option" onclick="postComponent.viewPostHistory('${postId}')">
                                <span class="option-icon">📜</span>
                                <div class="option-text">
                                    <span class="option-title">View Edit History</span>
                                    <span class="option-desc">See all changes made to this post</span>
                                </div>
                            </button>

                            <hr class="menu-divider">

                            <button class="menu-option delete-option danger" onclick="postComponent.deletePost('${postId}')">
                                <span class="option-icon">🗑️</span>
                                <div class="option-text">
                                    <span class="option-title">Delete Post</span>
                                    <span class="option-desc">Permanently remove this post</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing post menu
        const existingMenu = document.getElementById(`postMenu-${postId}`);
        if (existingMenu) {
            existingMenu.remove();
        }

        // Add menu to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show menu
        document.getElementById(`postMenu-${postId}`).style.display = 'block';
    }

    closePostMenu(postId) {
        const menu = document.getElementById(`postMenu-${postId}`);
        if (menu) {
            menu.remove();
        }
    }

    editPost(postId) {
        this.closePostMenu(postId);

        // Find the post element and create inline editing interface
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (!postElement) return;

        const post = this.findPostById(postId);
        if (!post) return;

        // Create edit modal
        const editModalHtml = `
            <div class="modal edit-post-modal" id="editModal-${postId}">
                <div class="modal-content edit-post-content">
                    <div class="modal-header">
                        <h3>Edit Post</h3>
                        <span class="close" onclick="postComponent.closeEditModal('${postId}')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="edit-form">
                            <div class="form-group">
                                <label for="editContent-${postId}">Post Content</label>
                                <textarea id="editContent-${postId}" class="edit-textarea"
                                          maxlength="2000" rows="5">${post.content || ''}</textarea>
                                <small class="char-count">0 / 2000 characters</small>
                            </div>

                            <div class="form-group">
                                <label for="editReason-${postId}">Reason for Edit (Optional)</label>
                                <input type="text" id="editReason-${postId}" class="edit-input"
                                       placeholder="e.g., Fixed typo, Added more context..."
                                       maxlength="200">
                            </div>

                            <div class="edit-actions">
                                <button onclick="postComponent.closeEditModal('${postId}')" class="btn btn-secondary">
                                    Cancel
                                </button>
                                <button onclick="postComponent.submitPostEdit('${postId}')" class="btn btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', editModalHtml);
        document.getElementById(`editModal-${postId}`).style.display = 'block';

        // Add character counter
        const textarea = document.getElementById(`editContent-${postId}`);
        const charCount = document.querySelector(`#editModal-${postId} .char-count`);
        textarea.addEventListener('input', (e) => {
            const count = e.target.value.length;
            charCount.textContent = `${count} / 2000 characters`;
            charCount.style.color = count > 2000 ? '#dc3545' : '#666';
        });

        // Trigger initial count
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
    }

    closeEditModal(postId) {
        const modal = document.getElementById(`editModal-${postId}`);
        if (modal) {
            modal.remove();
        }
    }

    async submitPostEdit(postId) {
        const content = document.getElementById(`editContent-${postId}`).value.trim();
        const editReason = document.getElementById(`editReason-${postId}`).value.trim();

        if (!content) {
            alert('Post content cannot be empty');
            return;
        }

        if (content.length > 2000) {
            alert('Post content must be 2000 characters or less');
            return;
        }

        try {
            const response = await apiCall(`/posts/${postId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content,
                    editReason: editReason || undefined
                })
            });

            if (response.ok) {
                this.closeEditModal(postId);

                // Update the post in the UI
                const updatedPost = response.data.data.post;
                this.updatePostInUI(postId, updatedPost);

                // Show success message
                this.showMessage('Post updated successfully', 'success');

                // Refresh the current view to show updated content
                if (window.location.pathname.includes('profile')) {
                    // Refresh profile if on profile page
                    window.myProfile?.loadCurrentTab();
                } else {
                    // Refresh feed if on main page
                    window.loadMyFeed?.();
                }
            } else {
                throw new Error(response.data?.error || 'Failed to update post');
            }
        } catch (error) {
            console.error('Error updating post:', error);
            this.showMessage(error.message || 'Failed to update post', 'error');
        }
    }

    deletePost(postId) {
        this.closePostMenu(postId);

        // Create delete confirmation modal
        const deleteModalHtml = `
            <div class="modal delete-post-modal" id="deleteModal-${postId}">
                <div class="modal-content delete-post-content">
                    <div class="modal-header">
                        <h3>Delete Post</h3>
                        <span class="close" onclick="postComponent.closeDeleteModal('${postId}')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="delete-warning">
                            <span class="warning-icon">⚠️</span>
                            <p><strong>Are you sure you want to delete this post?</strong></p>
                            <p>This action cannot be undone. The post will be removed from all feeds and searches,
                               but a copy will be archived in your Activity Log for accountability.</p>
                        </div>

                        <div class="form-group">
                            <label for="deleteReason-${postId}">Reason for Deletion (Optional)</label>
                            <input type="text" id="deleteReason-${postId}" class="delete-input"
                                   placeholder="e.g., Posted by mistake, Outdated information..."
                                   maxlength="200">
                        </div>

                        <div class="delete-actions">
                            <button onclick="postComponent.closeDeleteModal('${postId}')" class="btn btn-secondary">
                                Cancel
                            </button>
                            <button onclick="postComponent.confirmDeletePost('${postId}')" class="btn btn-danger">
                                Delete Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', deleteModalHtml);
        document.getElementById(`deleteModal-${postId}`).style.display = 'block';
    }

    closeDeleteModal(postId) {
        const modal = document.getElementById(`deleteModal-${postId}`);
        if (modal) {
            modal.remove();
        }
    }

    async confirmDeletePost(postId) {
        const deleteReason = document.getElementById(`deleteReason-${postId}`).value.trim();

        try {
            const response = await apiCall(`/posts/${postId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    deleteReason: deleteReason || undefined
                })
            });

            if (response.ok) {
                this.closeDeleteModal(postId);

                // Remove post from UI
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                if (postElement) {
                    postElement.style.transition = 'opacity 0.3s ease';
                    postElement.style.opacity = '0';
                    setTimeout(() => {
                        postElement.remove();
                    }, 300);
                }

                // Show success message
                this.showMessage('Post deleted successfully', 'success');

                // Refresh the current view
                if (window.location.pathname.includes('profile')) {
                    window.myProfile?.loadCurrentTab();
                } else {
                    window.loadMyFeed?.();
                }
            } else {
                throw new Error(response.data?.error || 'Failed to delete post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showMessage(error.message || 'Failed to delete post', 'error');
        }
    }

    viewPostHistory(postId) {
        this.closePostMenu(postId);

        // Create history modal
        const historyModalHtml = `
            <div class="modal history-modal" id="historyModal-${postId}">
                <div class="modal-content history-content">
                    <div class="modal-header">
                        <h3>Post Edit History</h3>
                        <span class="close" onclick="postComponent.closeHistoryModal('${postId}')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="historyContent-${postId}" class="history-content">
                            <div class="loading">Loading history...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', historyModalHtml);
        document.getElementById(`historyModal-${postId}`).style.display = 'block';

        // Load history data
        this.loadPostHistory(postId);
    }

    closeHistoryModal(postId) {
        const modal = document.getElementById(`historyModal-${postId}`);
        if (modal) {
            modal.remove();
        }
    }

    async loadPostHistory(postId) {
        try {
            const response = await apiCall(`/posts/${postId}/history`);

            if (response.ok) {
                const history = response.data.data;
                this.displayPostHistory(postId, history);
            } else {
                throw new Error(response.data?.error || 'Failed to load history');
            }
        } catch (error) {
            console.error('Error loading history:', error);
            document.getElementById(`historyContent-${postId}`).innerHTML = `
                <div class="error">Failed to load edit history: ${error.message}</div>
            `;
        }
    }

    displayPostHistory(postId, history) {
        const container = document.getElementById(`historyContent-${postId}`);

        if (!history.history || history.history.length === 0) {
            container.innerHTML = `
                <div class="no-history">
                    <p>This post has not been edited.</p>
                    <div class="original-version">
                        <h4>Original Content</h4>
                        <div class="version-content">${this.formatPostContent(history.currentContent)}</div>
                        <small>Created: ${this.formatDate(new Date(history.createdAt))}</small>
                    </div>
                </div>
            `;
            return;
        }

        let historyHtml = `
            <div class="history-timeline">
                <div class="version current-version">
                    <div class="version-header">
                        <h4>Current Version</h4>
                        <span class="version-date">${this.formatDate(new Date())}</span>
                    </div>
                    <div class="version-content">${this.formatPostContent(history.currentContent)}</div>
                </div>
        `;

        // Display edit history in reverse chronological order
        history.history.reverse().forEach((entry, index) => {
            historyHtml += `
                <div class="version">
                    <div class="version-header">
                        <h4>Version ${entry.version}</h4>
                        <span class="version-date">${this.formatDate(new Date(entry.editedAt))}</span>
                    </div>
                    <div class="version-content">${this.formatPostContent(entry.content)}</div>
                    ${entry.editReason ? `<div class="edit-reason"><strong>Reason:</strong> ${entry.editReason}</div>` : ''}
                </div>
            `;
        });

        if (history.originalContent && history.originalContent !== history.currentContent) {
            historyHtml += `
                <div class="version original-version">
                    <div class="version-header">
                        <h4>Original Version</h4>
                        <span class="version-date">${this.formatDate(new Date(history.createdAt))}</span>
                    </div>
                    <div class="version-content">${this.formatPostContent(history.originalContent)}</div>
                </div>
            `;
        }

        historyHtml += '</div>';
        container.innerHTML = historyHtml;
    }

    // Helper methods
    findPostById(postId) {
        // This method should return the post data from wherever it's stored
        // You may need to implement this based on how posts are managed in your app
        return window.currentPosts?.find(p => p.id === postId) || null;
    }

    updatePostInUI(postId, updatedPost) {
        // Update post content in the UI
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            const contentElement = postElement.querySelector('.post-content');
            if (contentElement) {
                contentElement.innerHTML = this.formatPostContent(updatedPost.content);
            }

            // Add edited indicator
            const headerElement = postElement.querySelector('.post-header');
            if (headerElement && !headerElement.querySelector('.edited-indicator')) {
                headerElement.insertAdjacentHTML('beforeend', `
                    <span class="edited-indicator" title="This post has been edited">
                        (edited)
                    </span>
                `);
            }
        }
    }

    showMessage(message, type = 'info') {
        // Create a temporary message notification
        const messageHtml = `
            <div class="toast toast-${type}" id="postMessage-${Date.now()}">
                ${message}
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', messageHtml);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            const toast = document.querySelector('.toast:last-child');
            if (toast) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * Format post content (handle mentions, hashtags, links)
     */
    formatPostContent(content, post = null) {
        if (!content) return '';
        
        // Convert URLs to links
        content = content.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
        
        // Convert @mentions
        content = content.replace(
            /@(\w+)/g, 
            '<span class="mention">@$1</span>'
        );
        
        // Convert #hashtags
        content = content.replace(
            /#(\w+)/g, 
            '<span class="hashtag">#$1</span>'
        );
        
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        
        // Extended content is now handled via the extendedContent field in the database
        // The "read more" functionality is handled by clicking the post text area or comment button
        
        return content;
    }

    /**
     * Render enhanced reaction system with grouped sentiment/stance buttons
     */
    renderEnhancedReactions(post) {
        return `
            <div class="reaction-groups">
                <div class="sentiment-group">
                    <button class="reaction-btn sentiment-like ${post.userSentiment === 'LIKE' ? 'active' : ''}"
                            onclick="postComponent.toggleReaction('${post.id}', 'sentiment', 'LIKE')"
                            data-reaction-type="sentiment"
                            data-reaction-value="LIKE">
                        <span class="emoji">😊</span>
                        <span class="reaction-count">${post.likesCount || 0}</span>
                    </button>
                    <button class="reaction-btn sentiment-dislike ${post.userSentiment === 'DISLIKE' ? 'active' : ''}"
                            onclick="postComponent.toggleReaction('${post.id}', 'sentiment', 'DISLIKE')"
                            data-reaction-type="sentiment"
                            data-reaction-value="DISLIKE">
                        <span class="emoji">😞</span>
                        <span class="reaction-count">${post.dislikesCount || 0}</span>
                    </button>
                </div>
                <div class="stance-group">
                    <button class="reaction-btn stance-agree ${post.userStance === 'AGREE' ? 'active' : ''}"
                            onclick="postComponent.toggleReaction('${post.id}', 'stance', 'AGREE')"
                            data-reaction-type="stance"
                            data-reaction-value="AGREE">
                        <span class="emoji">👍</span>
                        <span class="reaction-count">${post.agreesCount || 0}</span>
                    </button>
                    <button class="reaction-btn stance-disagree ${post.userStance === 'DISAGREE' ? 'active' : ''}"
                            onclick="postComponent.toggleReaction('${post.id}', 'stance', 'DISAGREE')"
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
     * Render compact reaction buttons for comments
     */
    renderCommentReactions(comment) {
        return `
            <div class="comment-reaction-groups">
                <div class="comment-sentiment-group">
                    <button class="comment-reaction-btn sentiment-like ${comment.userSentiment === 'LIKE' ? 'active' : ''}"
                            onclick="postComponent.toggleCommentReaction('${comment.id}', 'sentiment', 'LIKE')"
                            title="Like this comment">
                        <span class="emoji">😊</span>
                        <span class="reaction-count">${comment.likesCount || 0}</span>
                    </button>
                    <button class="comment-reaction-btn sentiment-dislike ${comment.userSentiment === 'DISLIKE' ? 'active' : ''}"
                            onclick="postComponent.toggleCommentReaction('${comment.id}', 'sentiment', 'DISLIKE')"
                            title="Dislike this comment">
                        <span class="emoji">😞</span>
                        <span class="reaction-count">${comment.dislikesCount || 0}</span>
                    </button>
                </div>
                <div class="comment-stance-group">
                    <button class="comment-reaction-btn stance-agree ${comment.userStance === 'AGREE' ? 'active' : ''}"
                            onclick="postComponent.toggleCommentReaction('${comment.id}', 'stance', 'AGREE')"
                            title="Agree with this comment">
                        <span class="emoji">👍</span>
                        <span class="reaction-count">${comment.agreesCount || 0}</span>
                    </button>
                    <button class="comment-reaction-btn stance-disagree ${comment.userStance === 'DISAGREE' ? 'active' : ''}"
                            onclick="postComponent.toggleCommentReaction('${comment.id}', 'stance', 'DISAGREE')"
                            title="Disagree with this comment">
                        <span class="emoji">👎</span>
                        <span class="reaction-count">${comment.disagreesCount || 0}</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render post media inline like modern social media (Twitter, Instagram, etc.)
     */
    renderPostMedia(photos) {
        if (!photos || photos.length === 0) return '';

        // For single photo - full width, natural aspect ratio
        if (photos.length === 1) {
            const photo = photos[0];
            const isGif = photo.mimeType === 'image/gif';
            return `
                <div class="post-media-inline single-photo" style="margin-top: 12px; border-radius: 12px; overflow: hidden; position: relative;">
                    <img src="${photo.url}"
                         alt="Post image"
                         loading="lazy"
                         onclick="postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
                         style="width: 100%; max-height: 500px; object-fit: cover; cursor: pointer; display: block;">
                    ${isGif ? '<div class="media-type-badge gif-badge" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">GIF</div>' : ''}
                </div>
            `;
        }

        // For multiple photos - grid layout like Twitter/Instagram
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
                                 loading="lazy"
                                 onclick="postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
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
     * Get CSS grid template for photo layouts
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
     * Open media in full-screen viewer with tagging capability
     */
    openMediaViewer(url, mimeType, photoId = null) {
        const overlay = document.createElement('div');
        overlay.className = 'media-viewer-overlay';
        overlay.innerHTML = `
            <div class="media-viewer-content" ${photoId ? `data-photo-id="${photoId}"` : ''}>
                <div class="media-viewer-header">
                    <button class="media-viewer-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                    ${photoId ? '<button class="media-viewer-tag-btn" onclick="postComponent.toggleTaggingMode(this)">🏷️ Tag People</button>' : ''}
                </div>
                <div class="media-viewer-image-container" style="position: relative;">
                    <img src="${url}" alt="Full size image" 
                         style="max-width: 90vw; max-height: 90vh; object-fit: contain;"
                         ${photoId ? `onclick="postComponent.handleImageClick(event, '${photoId}')"` : ''}>
                    ${photoId ? '<div class="photo-tags-overlay"></div>' : ''}
                </div>
                ${mimeType === 'image/gif' ? '<div class="media-viewer-badge">GIF</div>' : ''}
                ${photoId ? '<div class="tag-user-search" style="display: none;"></div>' : ''}
            </div>
        `;
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
        document.body.appendChild(overlay);

        // Load existing tags if photoId provided
        if (photoId) {
            this.loadPhotoTags(photoId);
        }
    }

    /**
     * Toggle tagging mode on/off
     */
    toggleTaggingMode(button) {
        const isTagging = button.classList.contains('active');
        
        if (isTagging) {
            button.classList.remove('active');
            button.textContent = '🏷️ Tag People';
            this.hideUserSearch();
        } else {
            button.classList.add('active');
            button.textContent = '✕ Stop Tagging';
        }
    }

    /**
     * Handle click on image for tagging
     */
    async handleImageClick(event, photoId) {
        const tagBtn = event.target.closest('.media-viewer-content').querySelector('.media-viewer-tag-btn');
        if (!tagBtn || !tagBtn.classList.contains('active')) return;

        const rect = event.target.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        this.showUserSearch(x, y, photoId, event.clientX, event.clientY);
    }

    /**
     * Show user search for tagging
     */
    showUserSearch(x, y, photoId, screenX, screenY) {
        const searchContainer = document.querySelector('.tag-user-search');
        searchContainer.style.display = 'block';
        searchContainer.style.left = `${screenX - 150}px`;
        searchContainer.style.top = `${screenY + 10}px`;
        
        searchContainer.innerHTML = `
            <div class="user-search-box">
                <input type="search" placeholder="Search users..." class="user-search-input"
                       autocomplete="off" autocapitalize="off" spellcheck="false"
                       oninput="postComponent.searchUsers(this.value, ${x}, ${y}, '${photoId}')"
                       onkeydown="if(event.key==='Escape') postComponent.hideUserSearch()">
                <div class="user-search-results"></div>
            </div>
        `;

        searchContainer.querySelector('.user-search-input').focus();
    }

    /**
     * Hide user search
     */
    hideUserSearch() {
        const searchContainer = document.querySelector('.tag-user-search');
        if (searchContainer) {
            searchContainer.style.display = 'none';
        }
    }

    /**
     * Search users for tagging
     */
    async searchUsers(query, x, y, photoId) {
        if (query.length < 2) {
            document.querySelector('.user-search-results').innerHTML = '';
            return;
        }

        try {
            const response = await window.apiCall(`/photo-tags/search-users?q=${encodeURIComponent(query)}`);
            
            if (response && (response.success || response.comment || response.message === 'Comment added successfully' || response.ok)) {
                const users = response.data.users;
                const resultsContainer = document.querySelector('.user-search-results');
                
                resultsContainer.innerHTML = users.map(user => `
                    <div class="user-search-result" onclick="postComponent.tagUser('${user.id}', ${x}, ${y}, '${photoId}')">
                        <div class="user-avatar">${user.avatar ? `<img src="${user.avatar}" alt="">` : user.firstName?.[0] || user.username[0]}</div>
                        <div class="user-info">
                            <div class="user-name">${user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}</div>
                            <div class="user-username">@${user.username}</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('User search error:', error);
        }
    }

    /**
     * Tag a user in the photo
     */
    async tagUser(userId, x, y, photoId) {
        try {
            const response = await window.apiCall('/photo-tags', {
                method: 'POST',
                body: JSON.stringify({
                    photoId,
                    taggedId: userId,
                    x,
                    y
                })
            });

            if (response && (response.success || response.comment || response.message === 'Comment added successfully' || response.ok)) {
                this.hideUserSearch();
                this.loadPhotoTags(photoId); // Reload tags
                this.showToast('User tagged successfully!');
            } else {
                const errorMsg = response.data?.message || 'Failed to tag user';
                this.showToast(errorMsg);
            }
        } catch (error) {
            console.error('Tagging error:', error);
            this.showToast('Failed to tag user');
        }
    }

    /**
     * Load and display photo tags
     */
    async loadPhotoTags(photoId) {
        try {
            const response = await window.apiCall(`/photo-tags/photo/${photoId}`);
            
            if (response && (response.success || response.comment || response.message === 'Comment added successfully' || response.ok)) {
                const tags = response.data.tags;
                const overlay = document.querySelector('.photo-tags-overlay');
                
                overlay.innerHTML = tags.map(tag => `
                    <div class="photo-tag" style="position: absolute; left: ${tag.x}%; top: ${tag.y}%; transform: translate(-50%, -50%);">
                        <div class="tag-indicator"></div>
                        <div class="tag-tooltip">
                            ${tag.tagged.firstName ? `${tag.tagged.firstName} ${tag.tagged.lastName || ''}` : tag.tagged.username}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Load tags error:', error);
        }
    }

    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'just now';
    }

    /**
     * Show toast notification
     */
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Initialize global event listeners
     */
    initializeEventListeners() {
        // Add keyboard shortcuts for comment inputs
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('comment-input')) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    const postId = e.target.id.replace('comment-input-', '');
                    this.addComment(postId);
                }
            }
        });

        // Event delegation for data-action attributes
        document.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                const postId = e.target.dataset.postId;
                const commentId = e.target.dataset.commentId;

                console.log('🎯 PostComponent event delegation:', action, { postId, commentId });

                try {
                    switch (action) {
                        case 'addComment':
                            if (postId) {
                                this.addComment(postId);
                            }
                            break;
                        case 'addCommentFromFocus':
                            if (postId) {
                                this.addCommentFromFocus(postId);
                            }
                            break;
                        case 'handle-post-media-upload':
                            // Media upload is now handled by direct button onclick
                            // This event comes from the file input itself, not the button
                            console.log('📷 PostComponent: File input change detected - handled by navigation-handlers');
                            // No need to do anything here - just acknowledge the event
                            return; // Let navigation-handlers process the file selection
                        case 'create-post-from-feed':
                            // Handled by my-feed.js handler - pass through
                            return;
                        default:
                            console.warn('🚨 PostComponent: Unhandled data-action:', action);
                    }
                } catch (error) {
                    console.error('❌ PostComponent event delegation error:', error);
                }
            }
        });
    }

    /**
     * Render a list of posts
     * UPDATED: Now uses UnifiedPostRenderer for consistent display
     */
    renderPostsList(posts, containerId, options = {}) {
        // Use UnifiedPostRenderer for consistent list rendering
        if (window.unifiedPostRenderer) {
            console.log('✅ PostComponent: Using UnifiedPostRenderer for posts list');
            try {
                const context = options.context || 'feed';
                window.unifiedPostRenderer.renderPostsList(posts, containerId, { context, ...options });
                return;
            } catch (error) {
                console.error('❌ UnifiedPostRenderer failed for posts list, using legacy:', error);
            }
        }

        // Legacy fallback
        const container = document.getElementById(containerId);
        if (!container) return;

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="no-posts">
                    <p>No posts to display</p>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => this.renderPost(post, options)).join('');
    }

    /**
     * Open Post Focus View modal for detailed post viewing with comments
     * @param {string} postId - ID of the post to focus on
     */
    async openPostFocus(postId) {
        console.log('🎯 PostComponent: Opening focused view for post:', postId);
        try {
            // Fetch full post details
            const response = await window.apiCall(`/posts/${postId}`);
            if (!response || (!response.post && !response.ok)) {
                throw new Error('Failed to load post details');
            }
            
            const post = response.data?.post || response.post || response;
            
            // Fetch comments for the post
            const commentsResponse = await window.apiCall(`/posts/${postId}/comments?limit=100`);
            const comments = commentsResponse?.comments || commentsResponse?.data?.comments || [];
            
            // Calculate total comment character count for AI summary threshold
            const totalCommentChars = this.calculateTotalCommentChars(comments);
            
            // Get AI summary if threshold met (10,000+ characters)
            let aiSummary = null;
            if (totalCommentChars >= 10000) {
                aiSummary = await this.generateCommentSummary(post, comments);
            }
            
            // Create and show modal
            console.log('🎯 PostComponent: Displaying focused view with', comments.length, 'comments');
            this.showPostFocusModal(post, comments, aiSummary);
            
        } catch (error) {
            console.error('Failed to open post focus:', error);
            alert('Failed to load post details. Please try again.');
        }
    }

    /**
     * Calculate total character count from all comments and replies
     * @param {Array} comments - Array of comments
     * @returns {number} - Total character count
     */
    calculateTotalCommentChars(comments) {
        let total = 0;
        
        const countComment = (comment) => {
            total += comment.content.length;
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(countComment);
            }
        };
        
        comments.forEach(countComment);
        return total;
    }

    /**
     * Generate AI summary of comment thread using existing Azure OpenAI infrastructure
     * @param {Object} post - The original post
     * @param {Array} comments - Array of comments
     * @returns {Promise<string|null>} - AI generated summary or null
     */
    async generateCommentSummary(post, comments) {
        try {
            // Use new public comment summarization endpoint
            const summaryResponse = await window.apiCall(`/posts/${post.id}/comments/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (summaryResponse.ok && summaryResponse.data) {
                if (summaryResponse.data.summary) {
                    return summaryResponse.data.summary;
                }
                
                // Handle below threshold case - no summary needed
                if (summaryResponse.data.belowThreshold) {
                    return null;
                }
                
                // Handle AI error case
                if (summaryResponse.data.aiError) {
                    console.warn('AI summarization unavailable:', summaryResponse.data.aiError);
                    return null;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Failed to generate comment summary:', error);
            return null;
        }
    }

    /**
     * Show the Post Focus modal with post details and comments
     * @param {Object} post - Post object
     * @param {Array} comments - Comments array  
     * @param {string|null} aiSummary - AI generated summary or null
     */
    showPostFocusModal(post, comments, aiSummary) {
        console.log('🎯 showPostFocusModal: Starting focused view setup');
        // Save current content for back navigation
        const mainContent = document.getElementById('mainContent');
        if (!mainContent.dataset.originalContent) {
            mainContent.dataset.originalContent = mainContent.innerHTML;
        }
        
        // Format full post content (including extended content)
        let fullPostContent = this.formatPostContent(post.content, post);
        if (post.extendedContent) {
            fullPostContent += '<div class="extended-content">' + 
                             this.formatPostContent(post.extendedContent, post) + 
                             '</div>';
        }
        
        const timeAgo = this.getTimeAgo(new Date(post.createdAt));
        const authorName = post.author?.firstName || post.author?.username || 'Anonymous';
        const authorInitial = authorName[0].toUpperCase();

        // === COMPREHENSIVE FOCUSED POST AVATAR DEBUGGING ===
        adminDebugLog('FocusedPostAvatar', '=== FOCUSED POST AVATAR DIAGNOSTIC START ===');
        adminDebugLog('FocusedPostAvatar', 'full post object', post);
        adminDebugLog('FocusedPostAvatar', 'post.author object', post.author);
        adminDebugLog('FocusedPostAvatar', 'post.author.avatar value', post.author?.avatar);
        adminDebugLog('FocusedPostAvatar', 'post.author.avatar type', typeof post.author?.avatar);
        adminDebugLog('FocusedPostAvatar', 'Will show avatar image?', !!post.author?.avatar);
        adminDebugLog('FocusedPostAvatar', 'Avatar URL to use', post.author?.avatar || `placeholder with ${authorInitial}`);
        adminDebugLog('FocusedPostAvatar', '=== FOCUSED POST AVATAR DIAGNOSTIC END ===');

        // Display focused post in main content area
        mainContent.innerHTML = `
            <div class="post-focus-view">
                <div class="post-focus-header">
                    <button class="btn btn-secondary" onclick="postComponent.returnToFeed()" style="margin-bottom: 1rem;">
                        ← Back to Feed
                    </button>
                    <h2>Post Details</h2>
                </div>
                
                <!-- Original Post -->
                <div class="post-component focused-post" style="margin-bottom: 2rem;">
                    <div class="post-header">
                        <div class="post-avatar user-card-trigger"
                             onclick="postComponent.showUserCard(event, '${post.author?.id || ''}', {postId: '${post.id}', context: 'focused'})"
                             style="cursor: pointer;"
                             title="Click to view profile">
                            ${post.author?.avatar ?
                                `<img src="${post.author.avatar}" alt="Profile Picture" class="avatar-img">` :
                                `<div class="avatar-placeholder">${authorInitial}</div>`
                            }
                        </div>
                        <div class="post-author-info">
                            <div class="post-author-name user-card-trigger"
                                 onclick="postComponent.showUserCard(event, '${post.author?.id || ''}', {postId: '${post.id}', context: 'focused'})"
                                 style="cursor: pointer;"
                                 title="Click to view profile">
                                ${authorName}
                                ${post.author?.verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
                                ${this.renderUserBadges(post.author)}
                            </div>
                            <div class="post-timestamp">@${post.author?.username || 'unknown'} • ${timeAgo}</div>
                        </div>
                    </div>
                    
                    <div class="post-content focused-post-content">
                        ${fullPostContent}
                    </div>
                    
                    ${this.renderPostMedia(post.photos)}
                    
                    <div class="post-actions" data-post-id="${post.id}">
                        ${this.renderEnhancedReactions(post)}

                        <button class="post-action-btn comment-btn">
                            <span class="action-icon">💬</span>
                            <span class="action-count">${comments.length}</span>
                        </button>

                        <button class="post-action-btn share-btn ${post.isShared ? 'shared' : ''}" onclick="postComponent.sharePost('${post.id}')">
                            <span class="action-icon">🔄</span>
                            <span class="action-count">${post.sharesCount || 0}</span>
                        </button>

                        <button class="post-action-btn save-btn ${post.isSaved ? 'saved' : ''}"
                                onclick="postComponent.toggleSave('${post.id}')">
                            <span class="action-icon">${post.isSaved ? '🔖' : '🔖'}</span>
                        </button>
                    </div>
                </div>
                
                ${aiSummary ? `
                    <div class="ai-comment-summary" style="margin-bottom: 2rem;">
                        <h4>💡 Discussion Summary</h4>
                        <p>${aiSummary}</p>
                    </div>
                ` : ''}
                
                <!-- Comments Section -->
                <div class="post-focus-comments">
                    <h3>Comments (${comments.length})</h3>
                    
                    <!-- Comment Input -->
                    <div class="comment-input-section" style="margin: 1.5rem 0;">
                        <textarea class="comment-input" id="focus-comment-input-${post.id}" 
                                  placeholder="Write a comment..." rows="3" 
                                  style="width: 100%; margin-bottom: 0.5rem; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;"></textarea>
                        <button class="btn btn-primary" data-action="addCommentFromFocus" data-post-id="${post.id}">
                            Post Comment
                        </button>
                    </div>
                    
                    <!-- Comments List -->
                    <div class="comments-list" id="comments-container-${post.id}">
                        <!-- Comments will be rendered here by existing renderComments method -->
                    </div>
                </div>
            </div>
        `;
        
        console.log('🎯 showPostFocusModal: Main content HTML set, checking elements...');
        const focusView = mainContent.querySelector('.post-focus-view');
        const commentsList = mainContent.querySelector('.comments-list');
        console.log('🎯 Post focus view element:', focusView ? 'Found' : 'Not found');
        console.log('🎯 Comments list element:', commentsList ? 'Found' : 'Not found');
        if (commentsList) {
            const computedStyle = window.getComputedStyle(commentsList);
            console.log('🎯 Comments list CSS - max-height:', computedStyle.maxHeight, 'overflow-y:', computedStyle.overflowY);
            
            // Force CSS application directly via JavaScript as fallback
            console.log('🎯 Applying CSS directly to comments list...');
            commentsList.style.maxHeight = 'none';
            commentsList.style.overflowY = 'visible';
            commentsList.style.overflow = 'visible';
            commentsList.style.height = 'auto';
            
            // Check again after direct application
            setTimeout(() => {
                const newComputedStyle = window.getComputedStyle(commentsList);
                console.log('🎯 After direct CSS - max-height:', newComputedStyle.maxHeight, 'overflow-y:', newComputedStyle.overflowY);
                
                // Also check the body and main content scrolling
                const bodyStyle = window.getComputedStyle(document.body);
                const mainContentStyle = window.getComputedStyle(mainContent);
                console.log('🎯 Body overflow:', bodyStyle.overflow, bodyStyle.overflowY);
                console.log('🎯 Main content overflow:', mainContentStyle.overflow, mainContentStyle.overflowY);
                console.log('🎯 Page scroll height vs client height:', document.body.scrollHeight, 'vs', document.body.clientHeight);
                
                // FIX: Enable scrolling on body and main content for focused view
                console.log('🎯 FIXING: Enabling page scrolling for focused view...');
                document.body.style.overflow = 'auto';
                document.body.style.overflowY = 'auto';
                mainContent.style.overflow = 'auto';
                mainContent.style.overflowY = 'auto';
                
                console.log('🎯 Scrolling should now work!');
            }, 100);
        }
        
        // Render comments using existing system
        if (comments.length > 0) {
            this.renderComments(post.id, comments);
        }
        
        // Add CSS for the focused view if not already present
        this.ensurePostFocusStyles();
    }

    /**
     * Return to feed from focused post view
     */
    returnToFeed() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent.dataset.originalContent) {
            mainContent.innerHTML = mainContent.dataset.originalContent;
            delete mainContent.dataset.originalContent;
        } else {
            // Fallback to toggle feed if original content not saved
            if (typeof window.toggleMyFeed === 'function') {
                window.toggleMyFeed();
            }
        }
        
        // Restore original overflow settings when returning to feed
        console.log('🎯 Restoring original overflow settings...');
        document.body.style.overflow = '';
        document.body.style.overflowY = '';
        mainContent.style.overflow = '';
        mainContent.style.overflowY = '';
    }

    /**
     * Add comment from Post Focus modal
     * @param {string} postId - Post ID
     */
    async addCommentFromFocus(postId) {
        console.log('🎯 PostComponent.addCommentFromFocus called for postId:', postId);

        // Use UnifiedPostCreator for focus comment creation
        try {
            const result = await window.unifiedPostCreator.create({
                type: 'comment',
                textareaId: `focus-comment-input-${postId}`,
                postId: postId,
                onSuccess: (response) => {
                    console.log('✅ Focus comment created successfully:', response);

                    // Refresh the modal with updated comments
                    this.openPostFocus(postId);
                },
                onError: (error) => {
                    console.error('❌ Focus comment creation failed:', error);

                    // Handle staging environment restriction
                    if (error.error?.includes('staging') || error.error?.includes('admin')) {
                        alert('Staging environment: Admin access required for comments');
                    } else {
                        const errorMsg = error.error || 'Failed to post comment';
                        alert(`Failed to post comment: ${errorMsg}`);
                    }
                },
                clearAfterSuccess: true
            });

            if (!result.success) {
                console.warn('🚨 UnifiedPostCreator returned failure:', result);
            }

        } catch (error) {
            console.error('❌ Error in addCommentFromFocus:', error);
            alert('Failed to post comment. Please try again.');
        }
    }

    /**
     * Show user card for profile interactions
     * @param {Event} event - Click event
     * @param {string} userId - User ID to show
     * @param {Object} context - Additional context (postId, etc.)
     */
    async showUserCard(event, userId, context = {}) {
        if (!userId) {
            console.warn('PostComponent: No user ID provided for user card');
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        try {
            // Ensure UserCard component is loaded
            if (typeof window.UserCard === 'undefined') {
                console.warn('PostComponent: UserCard component not loaded');
                return;
            }

            // Create UserCard instance if it doesn't exist
            if (!window.userCard) {
                window.userCard = new window.UserCard();
            }

            // Show the user card anchored to the clicked element
            await window.userCard.showCard(event.target.closest('.user-card-trigger'), userId, context);

        } catch (error) {
            console.error('PostComponent: Error showing user card:', error);
        }
    }

    /**
     * Ensure Post Focus modal styles are loaded
     */
    ensurePostFocusStyles() {
        if (document.querySelector('#post-focus-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'post-focus-styles';
        styles.textContent = `
            .post-focus-modal .modal {
                max-width: 700px;
                max-height: 90vh;
                width: 90vw;
                overflow-y: auto;
            }
            
            .post-focus-view {
                max-width: 700px;
                margin: 0 auto;
                padding: 1rem;
            }
            
            .post-focus-header {
                margin-bottom: 2rem;
            }
            
            .post-focus-header h2 {
                margin: 0;
                color: #1a1a1a;
                font-size: 1.5rem;
            }
            
            .focused-post {
                border-bottom: 2px solid #e1e5e9;
                padding-bottom: 1rem;
                margin-bottom: 1rem;
            }
            
            .focused-post-content {
                font-size: 1.1rem;
                line-height: 1.5;
                cursor: default !important;
            }
            
            .extended-content {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid #e1e5e9;
                color: #666;
            }
            
            .ai-comment-summary {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
            }
            
            .ai-comment-summary h4 {
                margin: 0 0 0.5rem 0;
                color: #495057;
                font-size: 1rem;
            }
            
            .ai-comment-summary p {
                margin: 0;
                font-style: italic;
                color: #6c757d;
            }
            
            .post-focus-comments h4 {
                margin: 1.5rem 0 1rem 0;
                color: #495057;
            }
            
            .comment-input-section {
                margin-bottom: 1.5rem;
            }
            
            .comment-input-section .comment-input {
                width: 100%;
                margin-bottom: 0.5rem;
                padding: 0.75rem;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                resize: vertical;
            }
            
            .comments-list {
                /* Remove height restriction for focused view - let page scroll naturally */
                max-height: none !important;
                overflow-y: visible !important;
            }
            
            .post-focus-view .comments-list,
            .post-focus-view div.comments-list,
            div.post-focus-view .comments-list,
            div.post-focus-view div.comments-list {
                /* Ultra-specific CSS to override any other rules */
                max-height: none !important;
                overflow-y: visible !important;
                overflow: visible !important;
                height: auto !important;
            }
            
            .post-focus-comments {
                margin-top: 2rem;
            }
            
            .post-focus-comments h3 {
                margin-bottom: 1rem;
                color: #1a1a1a;
                font-size: 1.25rem;
            }
            
            @media (max-width: 768px) {
                .post-focus-view {
                    padding: 0.5rem;
                }
                
                .post-focus-modal .modal {
                    width: 95vw;
                    max-height: 95vh;
                }
                
                .focused-post-content {
                    font-size: 1rem;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Render user badges for display in nameplates
     * @param {Object} user - User object containing userBadges array
     * @return {string} HTML string for badges
     */
    renderUserBadges(user) {
        if (!user?.userBadges || !Array.isArray(user.userBadges) || user.userBadges.length === 0) {
            return '';
        }

        // Sort badges by display order and limit to 5
        const displayBadges = user.userBadges
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
            .slice(0, 5);

        return `
            <div class="user-badges">
                ${displayBadges.map(userBadge => {
                    const badge = userBadge.badge;
                    if (!badge) return '';

                    return `
                        <img src="${badge.imageUrl || badge.animatedUrl}"
                             alt="${badge.name}"
                             class="nameplate-badge ${badge.rarity?.toLowerCase() || 'common'}"
                             title="${badge.name} - ${badge.description} (${this.getBadgeRarityText(badge.rarity)})"
                             onmouseover="postComponent.showBadgeTooltip(this, ${JSON.stringify(badge).replace(/"/g, '&quot;')}, '${userBadge.earnedAt}')"
                             onmouseout="postComponent.hideBadgeTooltip(this)"
                             onclick="postComponent.showBadgeDetails(event, ${JSON.stringify(badge).replace(/"/g, '&quot;')}, '${userBadge.earnedAt}')">
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Get human-readable text for badge rarity
     * @param {string} rarity - Badge rarity enum value
     * @return {string} Human-readable rarity text
     */
    getBadgeRarityText(rarity) {
        const rarityMap = {
            'COMMON': 'Common badge',
            'UNCOMMON': 'Uncommon badge',
            'RARE': 'Rare badge',
            'EPIC': 'Epic badge',
            'LEGENDARY': 'Legendary badge'
        };
        return rarityMap[rarity] || 'Badge';
    }

    /**
     * Show badge tooltip on hover
     * @param {HTMLElement} element - Badge image element
     * @param {Object} badge - Badge data
     * @param {string} earnedAt - Date when badge was earned
     */
    showBadgeTooltip(element, badge, earnedAt) {
        // Create or get existing tooltip
        let tooltip = document.querySelector('.badge-tooltip-hover');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'badge-tooltip-hover';
            document.body.appendChild(tooltip);
        }

        // Get rarity percentage (placeholder for now - would come from API)
        const rarityPercentage = this.getRarityPercentage(badge.rarity);

        tooltip.innerHTML = `
            <div class="tooltip-header">
                <img src="${badge.imageUrl || badge.animatedUrl}" alt="${badge.name}">
                <div>
                    <h4>${badge.name}</h4>
                    <span class="rarity ${badge.rarity?.toLowerCase() || 'common'}">${badge.rarity || 'COMMON'}</span>
                </div>
            </div>
            <p>${badge.description}</p>
            <div class="badge-stats">
                <span>Earned by ${rarityPercentage}% of users</span>
                <span>Earned on ${new Date(earnedAt).toLocaleDateString()}</span>
            </div>
        `;

        // Position tooltip near element
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
        tooltip.style.display = 'block';
    }

    /**
     * Hide badge tooltip
     * @param {HTMLElement} element - Badge image element
     */
    hideBadgeTooltip(element) {
        const tooltip = document.querySelector('.badge-tooltip-hover');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Show badge details modal on click
     * @param {Event} event - Click event
     * @param {Object} badge - Badge data
     * @param {string} earnedAt - Date when badge was earned
     */
    showBadgeDetails(event, badge, earnedAt) {
        event.preventDefault();
        event.stopPropagation();

        // Hide any existing tooltip
        this.hideBadgeTooltip();

        // Create modal for badge details
        const modal = document.createElement('div');
        modal.className = 'badge-details-modal modal-overlay';

        const rarityPercentage = this.getRarityPercentage(badge.rarity);

        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Badge Details</h3>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-content">
                    <div class="badge-detail-view">
                        <div class="badge-image-large">
                            <img src="${badge.imageUrl || badge.animatedUrl}" alt="${badge.name}">
                        </div>
                        <div class="badge-info">
                            <h2>${badge.name}</h2>
                            <span class="rarity-tag ${badge.rarity?.toLowerCase() || 'common'}">${badge.rarity || 'COMMON'} BADGE</span>
                            <p class="description">${badge.description}</p>
                            <div class="badge-statistics">
                                <div class="stat">
                                    <span class="label">Rarity:</span>
                                    <span class="value">${rarityPercentage}% of users have this badge</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Earned:</span>
                                    <span class="value">${new Date(earnedAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Category:</span>
                                    <span class="value">${badge.category || 'General'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Add escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    /**
     * Get estimated rarity percentage for a badge
     * @param {string} rarity - Badge rarity enum
     * @return {number} Estimated percentage
     */
    getRarityPercentage(rarity) {
        // Placeholder percentages - in a real app, this would come from the API
        const rarityPercentages = {
            'COMMON': 45,
            'UNCOMMON': 25,
            'RARE': 15,
            'EPIC': 5,
            'LEGENDARY': 1
        };
        return rarityPercentages[rarity] || 30;
    }

    // ==================== POST INTERACTION FUNCTIONS (Phase 2B-7) ====================

    /**
     * Update like count display for a specific post
     * @param {string} postId - The ID of the post
     * @param {boolean} isLiked - Whether the post was liked or unliked
     */
    updateLikeCount(postId, isLiked) {
        // Find the like button for this post and update its count
        const likeButtons = document.querySelectorAll(`[onclick*="likeTrendingPost('${postId}')"]`);
        likeButtons.forEach(button => {
            const currentText = button.textContent;
            const currentCount = parseInt(currentText.match(/\d+/)?.[0] || '0');
            const newCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
            button.innerHTML = `❤️ ${newCount}`;
        });
    }

    /**
     * Show trending comment box for a specific post
     * @param {string} postId - The ID of the post
     */
    showTrendingCommentBox(postId) {
        if (!window.currentUser) {
            alert('Please log in to comment');
            return;
        }
        document.getElementById(`trending-comments-${postId}`).style.display = 'block';
    }

    /**
     * Hide trending comment box for a specific post
     * @param {string} postId - The ID of the post
     */
    hideTrendingCommentBox(postId) {
        document.getElementById(`trending-comments-${postId}`).style.display = 'none';
        document.getElementById(`trending-comment-input-${postId}`).value = '';
    }

    /**
     * Update comment count display for a specific post
     * @param {string} postId - The ID of the post
     */
    updateCommentCount(postId) {
        // Find the comment button for this post and increment its count
        const commentButtons = document.querySelectorAll(`[onclick*="showTrendingCommentBox('${postId}')"]`);
        commentButtons.forEach(button => {
            const currentText = button.textContent;
            const currentCount = parseInt(currentText.match(/\d+/)?.[0] || '0');
            const newCount = currentCount + 1;
            button.innerHTML = `💬 ${newCount}`;
        });
    }

    /**
     * Show comment box for a specific post
     * @param {string} postId - The ID of the post
     */
    showCommentBox(postId) {
        document.getElementById(`comments-${postId}`).style.display = 'block';
    }

    /**
     * Hide comment box for a specific post
     * @param {string} postId - The ID of the post
     */
    hideCommentBox(postId) {
        document.getElementById(`comments-${postId}`).style.display = 'none';
        document.getElementById(`comment-input-${postId}`).value = '';
    }

    /**
     * Display posts in a container using PostComponent rendering or fallback
     * @param {Array} posts - Array of post objects
     * @param {string} containerId - ID of the container element (default: 'postsFeed')
     * @param {boolean} appendMode - Whether to append to existing content (default: false)
     */
    displayPosts(posts, containerId = 'postsFeed', appendMode = false) {
        const feed = document.getElementById(containerId);
        if (!feed) {
            console.warn('Feed container not found:', containerId);
            return;
        }

        if (posts.length === 0) {
            if (!appendMode) {
                feed.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <h2>Your Posts</h2>
                        <p>You haven't posted anything yet. Share your thoughts above!</p>
                    </div>
                `;
            }
            return;
        }

        // Use the standardized PostComponent if available
        if (window.postComponent) {
            let html = '';

            // Only add header in replace mode, not append mode
            if (!appendMode) {
                html += '<div class="posts-list">';
            }

            posts.forEach(post => {
                html += window.postComponent.renderPost(post, {
                    showActions: true,
                    showComments: true,
                    showAuthor: true,
                    showTimestamp: true,
                    compactView: false
                });
            });

            if (!appendMode) {
                html += '</div>';
                feed.innerHTML = html;
            } else {
                // Append to existing content
                feed.insertAdjacentHTML('beforeend', html);
            }

            // Add friend status indicators after posts are rendered
            setTimeout(() => {
                if (typeof addFriendStatusToExistingPosts === 'function') {
                    addFriendStatusToExistingPosts(containerId, posts);
                }
            }, 500);
        } else {
            // Enhanced fallback with friend status indicators
            if (typeof displayPostsWithFriendStatus === 'function') {
                displayPostsWithFriendStatus(posts, containerId, appendMode);
            } else {
                this.displayPostsFallback(posts, containerId, appendMode);
            }
        }
    }

    /**
     * Fallback post display function with basic HTML rendering
     * @param {Array} posts - Array of post objects
     * @param {string} containerId - ID of the container element
     * @param {boolean} appendMode - Whether to append to existing content (default: false)
     */
    displayPostsFallback(posts, containerId, appendMode = false) {
        const feed = document.getElementById(containerId);
        if (!feed) return;

        let html = '';
        posts.forEach(post => {
            const timeAgo = this.getTimeAgo(new Date(post.createdAt));

            html += `
                <div class="post-item" data-post-id="${post.id}">
                    <div class="post-header">
                        <div class="user-avatar">${(post.author.firstName?.[0] || post.author.username[0]).toUpperCase()}</div>
                        <div>
                            <strong>${post.author.firstName || post.author.username}</strong>
                            ${post.author.verified ? '<span style="color: #1976d2;">✓</span>' : ''}
                            <br>
                            <small style="color: #666;">@${post.author.username} • ${timeAgo}</small>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${post.photos && post.photos.length > 0 ? `
                        <div class="post-media" style="margin-top: 12px; margin-bottom: 12px;">
                            ${post.photos.map(photo => `
                                <img src="${photo.url}" alt="Post image"
                                     style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 8px; display: block; cursor: pointer;"
                                     onclick="window.open('${photo.url}', '_blank')"
                                     loading="lazy">
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="post-actions">
                        <span class="post-action" onclick="likePost('${post.id}', event)" style="cursor: pointer; transition: transform 0.2s;">
                            ${post.isLiked ? '❤️' : '👍'} ${post.likesCount || 0}
                        </span>
                        <span class="post-action" onclick="showCommentBox('${post.id}')">
                            💬 Add Comment
                        </span>
                        ${post.commentsCount > 0 ? `<span class="post-action" onclick="viewComments('${post.id}')" style="color: #4b5c09;">👁️ View ${post.commentsCount} Comment${post.commentsCount === 1 ? '' : 's'}</span>` : ''}
                    </div>
                    <div id="comments-${post.id}" class="comments-section" style="display: none; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #eee;">
                        <textarea id="comment-input-${post.id}" placeholder="Add a comment..." style="width: 100%; height: 60px; border: 1px solid #ddd; border-radius: 4px; padding: 0.5rem; box-sizing: border-box; resize: vertical;"></textarea>
                        <div style="margin-top: 0.5rem;">
                            <button data-action="addComment" data-post-id="${post.id}" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Comment</button>
                            <button onclick="hideCommentBox('${post.id}')" style="background: #666; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-left: 0.5rem;">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
        });

        if (appendMode) {
            feed.insertAdjacentHTML('beforeend', html);
        } else {
            feed.innerHTML = html;
        }
    }

    /**
     * Show comments inline for a specific post
     * @param {string} postId - The ID of the post
     * @param {Array} comments - Array of comment objects
     */
    showCommentsInline(postId, comments) {
        let commentsContainer = document.getElementById(`post-comments-${postId}`);

        // Create comments container if it doesn't exist
        if (!commentsContainer) {
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (!postElement) return;

            commentsContainer = document.createElement('div');
            commentsContainer.id = `post-comments-${postId}`;
            commentsContainer.style.cssText = 'margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; background: #f9f9f9; border-radius: 8px; padding: 1rem;';
            postElement.appendChild(commentsContainer);
        }

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0; color: #4b5c09;">Comments (${comments.length})</h4>
                <button onclick="hideComments('${postId}')" style="background: none; border: none; color: #666; cursor: pointer; font-size: 1.2rem;">&times;</button>
            </div>
        `;

        if (comments.length === 0) {
            html += '<div style="text-align: center; color: #666; padding: 1rem;">No comments yet</div>';
        } else {
            comments.forEach(comment => {
                html += `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; background: white; border-radius: 8px; border: 1px solid #ddd;">
                        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                            <img src="${comment.user.avatar || '/default-avatar.png'}" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 0.5rem;">
                            <div>
                                <div style="font-weight: bold; font-size: 0.85rem;">${comment.user.firstName || comment.user.username} ${comment.user.lastName || ''}</div>
                                <div style="color: #666; font-size: 0.75rem;">@${comment.user.username}</div>
                            </div>
                            ${comment.user.verified ? '<span style="color: #1d9bf0; margin-left: 5px; font-size: 0.8rem;">✓</span>' : ''}
                            <div style="margin-left: auto; color: #666; font-size: 0.75rem;">
                                ${new Date(comment.createdAt).toLocaleString()}
                            </div>
                        </div>
                        <div style="margin-left: 32px; line-height: 1.4;">
                            ${comment.content}
                        </div>
                    </div>
                `;
            });
        }

        // Add comment form if user is logged in
        if (window.currentUser) {
            html += `
                <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #ddd;">
                    <textarea id="inline-comment-input-${postId}" placeholder="Add a comment..." style="width: 100%; height: 80px; border: 1px solid #ddd; border-radius: 4px; padding: 0.75rem; box-sizing: border-box; resize: vertical; font-family: inherit; font-size: 0.9rem;"></textarea>
                    <div style="margin-top: 0.75rem; text-align: right;">
                        <button onclick="addInlineComment('${postId}')" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Post Comment</button>
                    </div>
                </div>
            `;
        }

        commentsContainer.innerHTML = html;
        commentsContainer.style.display = 'block';
    }

    /**
     * Hide comments for a specific post
     * @param {string} postId - The ID of the post
     */
    hideComments(postId) {
        const commentsContainer = document.getElementById(`post-comments-${postId}`);
        if (commentsContainer) {
            commentsContainer.style.display = 'none';
        }
    }
}

// Initialize and export
const postComponent = new PostComponent();
window.postComponent = postComponent;

// Global function exposure for backward compatibility (Phase 2B-7)
window.updateLikeCount = (postId, isLiked) => postComponent.updateLikeCount(postId, isLiked);
window.showTrendingCommentBox = (postId) => postComponent.showTrendingCommentBox(postId);
window.hideTrendingCommentBox = (postId) => postComponent.hideTrendingCommentBox(postId);
window.updateCommentCount = (postId) => postComponent.updateCommentCount(postId);
window.showCommentBox = (postId) => postComponent.showCommentBox(postId);
window.hideCommentBox = (postId) => postComponent.hideCommentBox(postId);
window.displayPosts = (posts, containerId, appendMode) => postComponent.displayPosts(posts, containerId, appendMode);
window.displayPostsFallback = (posts, containerId, appendMode) => postComponent.displayPostsFallback(posts, containerId, appendMode);
window.showCommentsInline = (postId, comments) => postComponent.showCommentsInline(postId, comments);
window.hideComments = (postId) => postComponent.hideComments(postId);

console.log('PostComponent: Post interaction functions migrated and exposed globally (Phase 2B-7)');

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostComponent;
}