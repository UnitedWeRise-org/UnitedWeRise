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
            <div class="post-component" data-post-id="${post.id}">
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
                    ${this.formatPostContent(post.content)}
                </div>
                
                ${post.imageUrl ? `
                    <div class="post-image">
                        <img src="${post.imageUrl}" alt="Post image" loading="lazy">
                    </div>
                ` : ''}
                
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
     * Render comments list
     */
    renderComments(postId, comments) {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (!commentsList) return;

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => {
            // Handle both 'author' and 'user' properties for compatibility
            const user = comment.author || comment.user;
            const displayName = user?.firstName || user?.username || 'Anonymous';
            
            return `
                <div class="comment" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-author">${displayName}</span>
                        <span class="comment-time">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    </div>
                    <div class="comment-content">${comment.content}</div>
                </div>
            `;
        }).join('');
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
                const errorMsg = response.error || response.message || 'Failed to add comment';
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
    formatPostContent(content) {
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
        
        return content;
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