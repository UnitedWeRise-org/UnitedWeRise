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
                
                <div class="post-content">
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
            const response = await window.apiCall(`/posts/${postId}/${endpoint}`, {
                method: 'POST'
            });

            if (!response.ok) {
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
     * Toggle comments section visibility
     */
    async toggleComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (!commentsSection) return;

        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
            await this.loadComments(postId);
            // Auto-scroll to make comment box visible
            setTimeout(() => {
                commentsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }, 100);
        } else {
            commentsSection.style.display = 'none';
        }
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

            if (response.ok) {
                const data = response.data;
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
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (!commentsList) return;

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => this.renderComment(comment, postId, 0)).join('');
    }

    /**
     * Render individual comment with nested replies
     */
    renderComment(comment, postId, depth) {
        // Handle both 'author' and 'user' properties for compatibility
        const user = comment.author || comment.user;
        const displayName = user?.firstName || user?.username || 'Anonymous';
        const hasReplies = comment.replies && comment.replies.length > 0;
        const replyCount = hasReplies ? comment.replies.length : 0;
        
        // Use the depth from the backend if available, otherwise fall back to calculated depth
        const actualDepth = comment.depth !== undefined ? comment.depth : depth;
        
        // Calculate indentation based on depth (max 3 layers)
        const indentLevel = Math.min(actualDepth, 2); // 0, 1, or 2 for visual indentation
        const marginLeft = indentLevel * 20; // 0px, 20px, or 40px
        
        // Determine if this is a flattened comment (depth 3+)
        const isFlattened = actualDepth >= 2;
        const flattenedClass = isFlattened ? ' flattened-comment' : '';
        
        let commentHtml = `
            <div class="comment${flattenedClass}" data-comment-id="${comment.id}" data-depth="${actualDepth}" style="margin-left: ${marginLeft}px;">
                <div class="comment-header">
                    <span class="comment-author">${displayName}</span>
                    <span class="comment-time">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    ${actualDepth >= 2 ? '<span class="flattened-indicator">↳</span>' : ''}
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

        // Add nested replies if they exist
        if (hasReplies) {
            commentHtml += `<div class="replies-container" id="replies-${comment.id}">`;
            commentHtml += comment.replies.map(reply => this.renderComment(reply, postId, reply.depth !== undefined ? reply.depth : depth + 1)).join('');
            commentHtml += `</div>`;
        }

        commentHtml += `</div>`;
        return commentHtml;
    }

    /**
     * Add a comment to a post
     */
    async addComment(postId) {
        // Check authentication using the same pattern as the main app
        const authToken = localStorage.getItem('authToken') || window.authToken;
        if (!authToken) {
            alert('Please log in to comment');
            return;
        }

        const input = document.getElementById(`comment-input-${postId}`);
        if (!input || !input.value.trim()) return;

        const content = input.value.trim();
        input.disabled = true;

        try {
            const response = await window.apiCall(`/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                input.value = '';
                console.log('Comment added successfully, reloading comments...');
                // Small delay to ensure the comment is saved on the server
                setTimeout(async () => {
                    await this.loadComments(postId);
                }, 200);
                
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
        const authToken = localStorage.getItem('authToken') || window.authToken;
        if (!authToken) {
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

            if (response.ok) {
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
        
        // Add "continue to thread" link for posts that were truncated using the continuation feature
        if (post && window.truncatedPosts && window.truncatedPosts.has(post.id)) {
            content += ` <span class="continue-thread-link" onclick="postComponent.toggleComments('${post.id}')" style="color: #1da1f2; cursor: pointer; font-size: 0.9em;">... (continue to thread)</span>`;
        }
        
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
            const response = await window.apiCall(`/photo-tags/search-users?q=${encodeURIComponent(query)}`);
            
            if (response.ok) {
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

            if (response.ok) {
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
            
            if (response.ok) {
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
}

// Initialize and export
const postComponent = new PostComponent();
window.postComponent = postComponent;

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostComponent;
}