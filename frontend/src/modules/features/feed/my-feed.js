/**
 * @module features/feed/my-feed
 * @description My Feed functionality - personalized feed management
 * Extracted from index.html lines 4550-6063
 * 
 * @example
 * import { loadMyFeedPosts, showMyFeed } from '@/modules/features/feed/my-feed';
 * await loadMyFeedPosts();
 */

import { apiClient } from '../../core/api/client.js';
import { userState } from '../../core/state/user.js';

// Variables for infinite scroll functionality
let isLoadingMorePosts = false;
let hasMorePosts = true;
let currentFeedOffset = 0;
let selectedPostMedia = null;

/**
 * Load My Feed posts with infinite scroll support
 * Extracted from index.html line 4550
 */
export async function loadMyFeedPosts() {
    console.log('🔄 Loading My Feed posts...');
    
    // Ensure user is authenticated
    if (!userState.current) {
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
        const response = await apiClient.call('/feed/?limit=15', {
            method: 'GET'
        });
        
        console.log('📦 My Feed API Response:', response);
        
        // Handle different response formats
        let posts = null;
        if (response.posts) {
            // Direct posts array in response
            posts = response.posts;
        } else if (response.success && response.posts) {
            posts = response.posts;
        } else if (response.data && response.data.posts) {
            posts = response.data.posts;
        } else if (response.ok && response.data && response.data.posts) {
            posts = response.data.posts;
        }
        
        if (posts && Array.isArray(posts) && posts.length > 0) {
            console.log(`✅ Found ${posts.length} posts for My Feed`);
            // Reset offset for initial load
            currentFeedOffset = posts.length;
            hasMorePosts = true;
            displayMyFeedPosts(posts);
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
                    <button onclick="loadMyFeedPosts()" class="btn">Retry</button>
                </div>
            `;
        }
    }
}

/**
 * Display posts in My Feed
 * Extracted from index.html line 4620
 */
export function displayMyFeedPosts(posts, appendMode = false) {
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
            displayMyFeedPostsFallback(posts, container, appendMode);
        }
    } catch (error) {
        console.error('❌ Error displaying posts:', error);
        displayMyFeedPostsFallback(posts, container, appendMode);
    }
}

/**
 * Fallback display function for My Feed
 * Extracted from index.html line 4656
 */
function displayMyFeedPostsFallback(posts, container, appendMode = false) {
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
 * Load more posts for infinite scroll
 * Extracted from index.html line 4696
 */
export async function loadMoreMyFeedPosts() {
    if (isLoadingMorePosts || !hasMorePosts) return;
    
    isLoadingMorePosts = true;
    const container = document.getElementById('myFeedPosts');
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'feed-loading';
    loadingDiv.innerHTML = 'Loading more posts...';
    container.appendChild(loadingDiv);

    try {
        // Use offset-based pagination
        console.log(`🔄 Loading more My Feed posts... (offset: ${currentFeedOffset})`);
        const response = await apiClient.call(`/feed/?limit=15&offset=${currentFeedOffset}`, {
            method: 'GET'
        });

        console.log('📦 Load more response:', response);
        
        // Handle different response formats
        let posts = null;
        if (response.success && response.posts) {
            posts = response.posts;
        } else if (response.data && response.data.posts) {
            posts = response.data.posts;
        } else if (response.ok && response.data && response.data.posts) {
            posts = response.data.posts;
        }
        
        // Remove loading indicator
        container.removeChild(loadingDiv);

        if (!posts || posts.length === 0) {
            hasMorePosts = false;
            const endDiv = document.createElement('div');
            endDiv.className = 'feed-end-indicator';
            endDiv.style.cssText = 'text-align: center; padding: 1rem; color: #666; font-style: italic;';
            endDiv.innerHTML = "You're all caught up! 🎉";
            container.appendChild(endDiv);
            return;
        }

        // Append new posts to existing feed
        console.log(`✅ Appending ${posts.length} more posts (total offset: ${currentFeedOffset})`);
        displayMyFeedPosts(posts, true); // true = append mode
        currentFeedOffset += posts.length;
        
        // Check if backend indicates more posts available
        if (response.pagination && response.pagination.hasMore === false) {
            hasMorePosts = false;
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
            <button onclick="loadMoreMyFeedPosts()" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Retry</button>
        `;
        container.appendChild(errorDiv);
    }

    isLoadingMorePosts = false;
}

/**
 * Setup infinite scroll for My Feed
 * Extracted from index.html line 4773
 */
export function setupMyFeedInfiniteScroll() {
    const myFeedContainer = document.getElementById('myFeedPosts');
    if (myFeedContainer) {
        console.log('✅ Setting up infinite scroll for My Feed');
        myFeedContainer.addEventListener('scroll', () => {
            // Skip if already loading
            if (isLoadingMorePosts || !hasMorePosts) {
                return;
            }
            
            const { scrollTop, scrollHeight, clientHeight } = myFeedContainer;
            const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
            
            // Only trigger at the very bottom to prevent multiple requests
            if (distanceFromBottom <= 50) {
                console.log('🔄 Infinite scroll triggered - loading more posts');
                loadMoreMyFeedPosts();
            }
        });
    } else {
        console.warn('⚠️ myFeedPosts container not found for infinite scroll setup');
    }
}

/**
 * Show My Feed - personalized feed based on who user follows
 * Extracted from index.html line 4798
 */
export async function showMyFeed() {
    if (typeof window.showMyFeedInMain === 'function') {
        window.showMyFeedInMain();
    } else {
        await loadMyFeedPosts();
        setupMyFeedInfiniteScroll();
    }
}

/**
 * Media attachment functions
 */
export function attachMediaToPost() {
    document.getElementById('postMediaUpload').click();
}

export async function handlePostMediaUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
        input.value = '';
        return;
    }

    // Validate file size (10MB for images, 5MB for GIFs)
    const maxSize = file.type === 'image/gif' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
        const limitMB = file.type === 'image/gif' ? 5 : 10;
        alert(`File too large. ${file.type === 'image/gif' ? 'GIFs' : 'Images'} must be smaller than ${limitMB}MB`);
        input.value = '';
        return;
    }

    // Store selected file
    selectedPostMedia = file;

    // Show preview
    const previewArea = document.getElementById('mediaPreview');
    const previewContent = previewArea.querySelector('.media-preview-content');
    
    // Create preview element
    const fileURL = URL.createObjectURL(file);
    const isGif = file.type === 'image/gif';
    
    previewContent.innerHTML = `
        <div class="media-item">
            <img src="${fileURL}" alt="Preview" 
                 style="max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover;">
            <div class="media-info">
                <p><strong>${file.name}</strong></p>
                <p>${isGif ? '🎞️ GIF' : '📷 Image'} • ${(file.size / 1024 / 1024).toFixed(1)}MB</p>
            </div>
        </div>
    `;
    
    previewArea.style.display = 'block';
}

export function clearMediaAttachment() {
    selectedPostMedia = null;
    document.getElementById('mediaPreview').style.display = 'none';
    document.getElementById('postMediaUpload').value = '';
}

/**
 * Reusable posting function - creates posts from any textarea
 * Extracted from index.html line 4875
 */
export async function createPostFromTextarea(textareaId, onSuccess = null, options = {}) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
        console.error(`Textarea with ID '${textareaId}' not found`);
        return false;
    }

    const content = textarea.value.trim();
    
    // Check if we have content or media
    if (!content && !selectedPostMedia) {
        alert('Please enter some content or attach media for your post');
        return false;
    }

    try {
        let mediaId = null;

        // Upload media first if selected
        if (selectedPostMedia) {
            const formData = new FormData();
            formData.append('photos', selectedPostMedia);
            formData.append('photoType', 'POST_MEDIA');
            formData.append('purpose', 'PERSONAL');

            console.log('🖼️ Uploading media for post...');
            const mediaResponse = await apiClient.call('/photos/upload', {
                method: 'POST',
                body: formData
            });

            if (!mediaResponse.ok) {
                const errorData = mediaResponse.data || {};
                const errorMessage = errorData.message || errorData.error || 'Failed to upload media';
                alert(`Media upload failed: ${errorMessage}`);
                return false;
            }

            // Get the uploaded photo ID
            mediaId = mediaResponse.data.photos[0]?.id;
            console.log('✅ Media uploaded successfully:', mediaId);
        }

        // Create the post using unified system
        const result = await window.createPostPublic(content, { mediaId });

        if (result.success) {
            // Clear the textarea
            textarea.value = '';
            
            // Clear media if option is set (default true)
            if (options.clearMedia !== false && selectedPostMedia) {
                clearMediaAttachment();
            }
            
            console.log('✅ Post created successfully');
            
            // Call the success callback if provided
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(result.post);
            }
            
            // Refresh feed if option is set
            if (options.refreshFeed) {
                if (typeof showMyFeed === 'function') {
                    showMyFeed();
                } else if (typeof loadMyFeedPosts === 'function') {
                    loadMyFeedPosts();
                }
            }
            
            return true;
        } else {
            alert(result.error || 'Failed to create post. Please try again.');
            return false;
        }
    } catch (error) {
        console.error('Post creation error:', error);
        alert('Error creating post. Please check your connection and try again.');
        return false;
    }
}

/**
 * Wrapper function for My Feed posting box
 * Extracted from index.html line 4959
 */
export async function createPostFromFeed() {
    const textarea = document.getElementById('feedPostContent');
    if (!textarea) return false;

    const content = textarea.value.trim();
    if (!content) return false;

    // Check if content exceeds maximum limit (5000 chars)
    if (content.length > 5000) {
        alert('Post exceeds 5000 characters. Please shorten your post.');
        return false;
    }

    // Get media attachment if any
    const mediaId = window.currentMediaId || null;
    const imageUrl = null; // Handled by mediaId

    try {
        const result = await window.createPostPublic(content, { 
            mediaId,
            imageUrl
        });

        if (result.success) {
            textarea.value = '';
            // Clear media attachment
            if (window.currentMediaId) {
                window.currentMediaId = null;
                // Clear media preview if exists
                const mediaPreview = document.getElementById('media-preview');
                if (mediaPreview) mediaPreview.style.display = 'none';
            }
            
            // Update character counter
            const charCount = document.getElementById('feedPostCharCount');
            if (charCount) charCount.textContent = '0/5000';
            
            // Refresh feed
            if (typeof window.showMyFeedInMain === 'function') {
                window.showMyFeedInMain();
            }
            
            return true;
        } else {
            alert('Error creating post: ' + (result.error || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('Feed post creation error:', error);
        alert('Error creating post');
        return false;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMyFeedInfiniteScroll);
} else {
    setupMyFeedInfiniteScroll();
}

// Maintain backward compatibility by exposing functions globally
if (typeof window !== 'undefined') {
    window.loadMyFeedPosts = loadMyFeedPosts;
    window.displayMyFeedPosts = displayMyFeedPosts;
    window.loadMoreMyFeedPosts = loadMoreMyFeedPosts;
    window.setupMyFeedInfiniteScroll = setupMyFeedInfiniteScroll;
    window.showMyFeed = showMyFeed;
    window.attachMediaToPost = attachMediaToPost;
    window.handlePostMediaUpload = handlePostMediaUpload;
    window.clearMediaAttachment = clearMediaAttachment;
    window.createPostFromTextarea = createPostFromTextarea;
    window.createPostFromFeed = createPostFromFeed;
}

export default {
    loadMyFeedPosts,
    displayMyFeedPosts,
    loadMoreMyFeedPosts,
    setupMyFeedInfiniteScroll,
    showMyFeed,
    attachMediaToPost,
    handlePostMediaUpload,
    clearMediaAttachment,
    createPostFromTextarea,
    createPostFromFeed
};