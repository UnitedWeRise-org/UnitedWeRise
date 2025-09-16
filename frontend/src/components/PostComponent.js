/**
 * Reusable Post Component System
 * Handles all post interactions: likes, comments, shares, etc.
 * Created to standardize post behavior across all views
 */

class PostComponent {
    constructor() {
        this.apiBase = window.API_BASE || '/api';
        this.initializeEventListeners();
    }

    /**
     * Renders a single post with all interactive elements
     * @param {Object} post - Post data object
     * @param {Object} options - Rendering options (showActions, showComments, etc.)
     * @returns {string} HTML string for the post
     */
    renderPost(post, options = {}) {
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
        
        return `
            <div class="post-component" data-post-id="${post.id}" data-author-reputation="${post.authorReputation || 70}">
                ${settings.showAuthor ? `
                    <div class="post-header">
                        <div class="post-avatar">${authorInitial}</div>
                        <div class="post-author-info">
                            <div class="post-author-name">
                                ${authorName}
                                ${post.author?.verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
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
                        <button class="post-action-btn like-btn ${post.isLiked ? 'liked' : ''}" 
                                onclick="postComponent.toggleLike('${post.id}')"
                                data-liked="${post.isLiked || false}">
                            <span class="action-icon">${post.isLiked ? '❤️' : '🤍'}</span>
                            <span class="action-count">${post.likesCount || 0}</span>
                        </button>
                        
                        <button class="post-action-btn comment-btn" 
                                onclick="postComponent.toggleComments('${post.id}')">
                            <span class="action-icon">💬</span>
                            <span class="action-count">${post.commentsCount || 0}</span>
                        </button>
                        
                        <button class="post-action-btn share-btn" 
                                onclick="postComponent.sharePost('${post.id}')">
                            <span class="action-icon">🔄</span>
                            <span class="action-count">${post.sharesCount || 0}</span>
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
                                        onclick="postComponent.addComment('${post.id}')">
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
    }

    /**
     * Toggle like/unlike for a post
     */
    async toggleLike(postId) {
        // Check authentication using the same pattern as the main app
        const authToken = localStorage.getItem('authToken') || window.authToken;
        if (!authToken) {
            alert('Please log in to like posts');
            return;
        }

        const likeBtn = document.querySelector(`[data-post-id="${postId}"] .like-btn`);
        if (!likeBtn) return;

        const isLiked = likeBtn.dataset.liked === 'true';
        const endpoint = isLiked ? 'unlike' : 'like';

        // Optimistic UI update
        const icon = likeBtn.querySelector('.action-icon');
        const count = likeBtn.querySelector('.action-count');
        const currentCount = parseInt(count.textContent) || 0;

        if (isLiked) {
            icon.textContent = '🤍';
            count.textContent = Math.max(0, currentCount - 1);
            likeBtn.classList.remove('liked');
            likeBtn.dataset.liked = 'false';
        } else {
            icon.textContent = '❤️';
            count.textContent = currentCount + 1;
            likeBtn.classList.add('liked');
            likeBtn.dataset.liked = 'true';
        }

        try {
            const response = await window.apiClient.call(`/posts/${postId}/${endpoint}`, {
                method: 'POST'
            });

            if (!response.success && !response.ok) {
                // Revert on error
                if (isLiked) {
                    icon.textContent = '❤️';
                    count.textContent = currentCount;
                    likeBtn.classList.add('liked');
                    likeBtn.dataset.liked = 'true';
                } else {
                    icon.textContent = '🤍';
                    count.textContent = currentCount;
                    likeBtn.classList.remove('liked');
                    likeBtn.dataset.liked = 'false';
                }
                console.error('Failed to toggle like');
            }
        } catch (error) {
            console.error('Error toggling like:', error);
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
     * Show extended content inline when comments are expanded
     */
    async showExtendedContentInline(postId) {
        try {
            // Get the post data to check for extended content
            const postResponse = await window.apiClient.call(`/posts/${postId}`);
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
            const response = await window.apiClient.call(`/posts/${postId}/comments`, {
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
                    <span class="comment-author">${displayName}</span>
                    <span class="comment-time">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    ${isFlattened ? '<span class="flattened-indicator">↳</span>' : ''}
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
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
        // Check authentication using current user data
        if (!window.currentUser) {
            alert('Please log in to comment');
            return;
        }

        const input = document.getElementById(`comment-input-${postId}`);
        if (!input || !input.value.trim()) return;

        const content = input.value.trim();
        input.disabled = true;

        try {
            const response = await window.apiClient.call(`/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            if (response && (response.success || response.comment || response.message === 'Comment added successfully' || response.ok)) {
                input.value = '';
                console.log('Comment added successfully, reloading comments...');
                // Delay to ensure the comment is saved on the server, then reload with cache bypass
                setTimeout(async () => {
                    await this.loadComments(postId, true); // Force cache bypass
                }, 500);
                
                // Update comment count
                const commentBtn = document.querySelector(`[data-post-id="${postId}"] .comment-btn .action-count`);
                if (commentBtn) {
                    const currentCount = parseInt(commentBtn.textContent) || 0;
                    commentBtn.textContent = currentCount + 1;
                }
                
                // Show success feedback
                this.showToast('Comment added successfully!');
            } else {
                console.error('Comment submission failed:', response);
                console.error('Full response data:', response.data);
                // Check for error in different possible locations
                let errorMsg = 'Failed to add comment';
                if (response.data?.error) {
                    errorMsg = response.data.error;
                } else if (response.data?.message) {
                    errorMsg = response.data.message;
                } else if (response.data?.errors) {
                    // Handle validation errors array
                    errorMsg = response.data.errors.map(e => e.msg || e.message).join(', ');
                }
                console.error('Error details:', errorMsg);
                alert(`Failed to add comment: ${errorMsg}`);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Error adding comment');
        } finally {
            input.disabled = false;
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
        if (!window.currentUser) {
            alert('Please log in to reply');
            return;
        }

        const input = document.getElementById(`reply-input-${parentId}`);
        if (!input || !input.value.trim()) return;

        const content = input.value.trim();
        input.disabled = true;

        try {
            const response = await window.apiClient.call(`/posts/${postId}/comments`, {
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
     * Share a post
     */
    async sharePost(postId) {
        // For now, just copy link to clipboard
        const postUrl = `${window.location.origin}/post/${postId}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this post',
                    url: postUrl
                });
            } catch (err) {
                console.log('Share cancelled or failed');
            }
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(postUrl);
            this.showToast('Link copied to clipboard!');
        } else {
            alert('Share URL: ' + postUrl);
        }
    }

    /**
     * Show post menu (edit, delete, etc.)
     */
    showPostMenu(postId) {
        // TODO: Implement post menu with edit/delete options
        alert('Post menu coming soon!');
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
     * Render post media attachments (photos/GIFs)
     */
    renderPostMedia(photos) {
        if (!photos || photos.length === 0) return '';

        return `
            <div class="post-media">
                ${photos.map(photo => {
                    const isGif = photo.mimeType === 'image/gif';
                    return `
                        <div class="post-media-item">
                            <img src="${photo.url}" 
                                 alt="Post attachment" 
                                 loading="lazy"
                                 onclick="postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
                                 style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;">
                            ${isGif ? '<div class="media-type-badge gif-badge">GIF</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
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
                <input type="text" placeholder="Search users..." class="user-search-input" 
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
            const response = await window.apiClient.call(`/photo-tags/search-users?q=${encodeURIComponent(query)}`);
            
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
            const response = await window.apiClient.call('/photo-tags', {
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
            const response = await window.apiClient.call(`/photo-tags/photo/${photoId}`);
            
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
    }

    /**
     * Render a list of posts
     */
    renderPostsList(posts, containerId, options = {}) {
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
            const response = await window.apiClient.call(`/posts/${postId}`);
            if (!response || (!response.post && !response.ok)) {
                throw new Error('Failed to load post details');
            }
            
            const post = response.data?.post || response.post || response;
            
            // Fetch comments for the post
            const commentsResponse = await window.apiClient.call(`/posts/${postId}/comments?limit=100`);
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
            const summaryResponse = await window.apiClient.call(`/posts/${post.id}/comments/summarize`, {
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
                        <div class="post-avatar">${authorInitial}</div>
                        <div class="post-author-info">
                            <div class="post-author-name">
                                ${authorName}
                                ${post.author?.verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
                            </div>
                            <div class="post-timestamp">@${post.author?.username || 'unknown'} • ${timeAgo}</div>
                        </div>
                    </div>
                    
                    <div class="post-content focused-post-content">
                        ${fullPostContent}
                    </div>
                    
                    ${this.renderPostMedia(post.photos)}
                    
                    <div class="post-actions" data-post-id="${post.id}">
                        <button class="post-action-btn like-btn ${post.isLiked ? 'liked' : ''}" 
                                onclick="postComponent.toggleLike('${post.id}')">
                            <span class="action-icon">${post.isLiked ? '❤️' : '🤍'}</span>
                            <span class="action-count">${post.likesCount || 0}</span>
                        </button>
                        
                        <button class="post-action-btn comment-btn">
                            <span class="action-icon">💬</span>
                            <span class="action-count">${comments.length}</span>
                        </button>
                        
                        <button class="post-action-btn share-btn" onclick="postComponent.sharePost('${post.id}')">
                            <span class="action-icon">🔄</span>
                            <span class="action-count">${post.sharesCount || 0}</span>
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
                        <button class="btn btn-primary" onclick="postComponent.addCommentFromFocus('${post.id}')">
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
        const textarea = document.getElementById(`focus-comment-input-${postId}`);
        const content = textarea.value.trim();
        
        if (!content) {
            alert('Please enter a comment');
            return;
        }
        
        try {
            const response = await window.apiClient.call(`/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            if (response && (response.success || response.comment || response.message === 'Comment added successfully' || response.ok)) {
                // Clear textarea
                textarea.value = '';
                
                // Refresh the modal with updated comments
                this.openPostFocus(postId);
            } else {
                throw new Error('Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment. Please try again.');
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
}

// Initialize and export
const postComponent = new PostComponent();
window.postComponent = postComponent;

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostComponent;
}