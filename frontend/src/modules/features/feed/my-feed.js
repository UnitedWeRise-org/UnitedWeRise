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
 * Unified media upload function that works consistently across the platform
 * @param {File|File[]} files - Single file or array of files to upload
 * @param {string} photoType - Type: 'POST_MEDIA', 'AVATAR', 'GALLERY', etc.
 * @param {string} purpose - Purpose: 'PERSONAL', 'CIVIC', etc.
 * @param {string} caption - Optional caption for photos
 * @returns {Promise<Object>} Upload response from backend
 */
async function uploadMediaFiles(files, photoType, purpose = 'PERSONAL', caption = '') {
    console.log('📸 uploadMediaFiles called with:', { files, photoType, purpose });
    console.log('📸 Files type:', typeof files);
    console.log('📸 Is array?', Array.isArray(files));
    console.log('📸 Files length:', Array.isArray(files) ? files.length : 'N/A');

    const formData = new FormData();

    // Handle single file or array of files
    if (Array.isArray(files)) {
        console.log('📸 Processing array of files:', files.length);
        files.forEach((file, index) => {
            console.log(`📸 Appending file ${index}:`, file.name, file.size, file.type);
            formData.append('photos', file);
        });
    } else {
        console.log('📸 Processing single file:', files.name, files.size, files.type);
        formData.append('photos', files);
    }

    formData.append('photoType', photoType);
    formData.append('purpose', purpose);

    if (caption.trim()) {
        formData.append('caption', caption.substring(0, 200));
    }

    // Debug FormData contents
    console.log('📸 FormData entries:');
    for (let pair of formData.entries()) {
        console.log('  -', pair[0], ':', pair[1]);
    }

    console.log('📸 About to make API call to /photos/upload');

    const result = await window.apiCall('/photos/upload', {
        method: 'POST',
        body: formData,
        skipContentType: true // Essential for FormData uploads
    });

    console.log('📸 Full API response received:', result);
    return result;
}

/**
 * Load My Feed posts with infinite scroll support
 * Extracted from index.html line 4550
 */
export async function loadMyFeedPosts() {
    console.log('🔄 Loading My Feed posts...');
    
    // Ensure user is authenticated
    if (!window.currentUser) {
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

    // DIAGNOSTIC: Log photo data received from API
    const postsWithPhotos = posts.filter(p => p.photos && p.photos.length > 0);
    console.log(`📸 FRONTEND - ${postsWithPhotos.length} posts have photos out of ${posts.length} total`);
    if (postsWithPhotos.length > 0) {
        console.log(`📸 FRONTEND - Sample post with photos:`, {
            postId: postsWithPhotos[0].id,
            photoCount: postsWithPhotos[0].photos.length,
            photoData: postsWithPhotos[0].photos
        });
    }

    // Use UnifiedPostRenderer for consistent photo rendering across all contexts
    if (window.unifiedPostRenderer) {
        console.log('✅ Using UnifiedPostRenderer for My Feed display');

        if (appendMode) {
            window.unifiedPostRenderer.appendPosts(posts, 'myFeedPosts', {
                context: 'feed',
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true,
                compactView: false
            });
        } else {
            window.unifiedPostRenderer.renderPostsList(posts, 'myFeedPosts', {
                context: 'feed',
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true,
                compactView: false
            });
        }
    } else if (window.postComponent) {
        console.log('⚠️ UnifiedPostRenderer not available, using PostComponent fallback');
        let html = '';

        posts.forEach(post => {
            html += window.postComponent.renderPost(post, {
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true,
                compactView: false
            });
        });

        if (appendMode) {
            container.insertAdjacentHTML('beforeend', html);
        } else {
            container.innerHTML = html;
        }
    } else {
        console.warn('⚠️ Neither UnifiedPostRenderer nor PostComponent available, using fallback');
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
        // Render post media/photos if they exist
        let mediaHtml = '';
        if (post.photos && post.photos.length > 0) {
            if (post.photos.length === 1) {
                const photo = post.photos[0];
                const isGif = photo.mimeType === 'image/gif';
                mediaHtml = `
                    <div class="post-media-inline single-photo" style="margin-top: 12px; border-radius: 12px; overflow: hidden; position: relative;">
                        <img src="${photo.url}"
                             alt="Post image"
                             style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;"
                             onclick="if(window.postComponent) postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
                             loading="lazy">
                        ${isGif ? '<div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">GIF</div>' : ''}
                    </div>
                `;
            } else {
                // Multiple photos - simple grid layout
                mediaHtml = `
                    <div class="post-media-inline multi-photo" style="margin-top: 12px; display: grid; gap: 2px; border-radius: 12px; overflow: hidden; max-height: 400px; grid-template-columns: repeat(2, 1fr);">
                        ${post.photos.slice(0, 4).map((photo, index) => {
                            const isGif = photo.mimeType === 'image/gif';
                            return `
                                <div style="position: relative;">
                                    <img src="${photo.url}"
                                         alt="Post image ${index + 1}"
                                         style="width: 100%; height: 200px; object-fit: cover; display: block;"
                                         onclick="if(window.postComponent) postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
                                         loading="lazy">
                                    ${isGif ? '<div style="position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.7); color: white; padding: 1px 4px; border-radius: 3px; font-size: 10px;">GIF</div>' : ''}
                                    ${post.photos.length > 4 && index === 3 ? `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">+${post.photos.length - 4}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }

        html += `
            <div class="post-item" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;">
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <strong>${post.author?.firstName || post.author?.username || 'Anonymous'}</strong>
                    <span style="color: #666; margin-left: 0.5rem; font-size: 0.9rem;">
                        ${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                    </span>
                </div>
                <div style="margin-bottom: 1rem;">${post.content || ''}</div>
                ${mediaHtml}
                <div style="color: #666; font-size: 0.9rem; margin-top: 1rem;">
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
        // Don't warn on initial setup - container may not exist yet
        // Will be called again when feed is shown
        console.log('📝 myFeedPosts container not ready yet, will setup infinite scroll when needed');
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
    const uploadInput = document.getElementById('feedMediaUpload');
    if (uploadInput) {
        uploadInput.click();
    } else {
        console.error('Feed media upload input not found');
    }
}

export { uploadMediaFiles };

export async function handlePostMediaUpload(input) {
    console.log('🔧 handlePostMediaUpload called with input:', input);
    console.log('🔧 Input element type:', input.type);
    console.log('🔧 Files selected:', input.files?.length || 0);

    const file = input.files[0];
    if (!file) {
        console.log('🔧 No file selected, returning early');
        return;
    }

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

    // DEBUG: Log file at selection time
    console.log('📁 File at SELECTION time:', {
        name: file.name,
        size: file.size,
        type: file.type,
        instanceof: file instanceof File,
        constructor: file.constructor.name
    });

    // Show preview
    const previewArea = document.getElementById('feedMediaPreview');
    if (!previewArea) {
        console.error('Feed media preview container not found');
        return;
    }

    // Create or get the preview content container
    let previewContent = previewArea.querySelector('.media-preview-content');
    if (!previewContent) {
        previewContent = document.createElement('div');
        previewContent.className = 'media-preview-content';
        previewArea.appendChild(previewContent);
    }
    
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

    // Show the preview area
    previewArea.style.display = 'block';
}

export function clearMediaAttachment() {
    selectedPostMedia = null;

    const previewArea = document.getElementById('feedMediaPreview');
    if (previewArea) {
        previewArea.style.display = 'none';
        previewArea.innerHTML = ''; // Clear the preview content
    }

    const uploadInput = document.getElementById('feedMediaUpload');
    if (uploadInput) {
        uploadInput.value = '';
    }
}

/**
 * Reusable posting function - MIGRATED TO UNIFIED SYSTEM
 * Creates posts from any textarea using UnifiedPostCreator
 */
export async function createPostFromTextarea(textareaId, onSuccess = null, options = {}) {
    console.log('🎯 createPostFromTextarea() - using UnifiedPostCreator');

    if (!window.unifiedPostCreator) {
        console.error('❌ UnifiedPostCreator not available');
        alert('Post creation system not loaded. Please refresh the page.');
        return false;
    }

    const result = await window.unifiedPostCreator.create({
        type: 'post',
        textareaId: textareaId,
        mediaInputId: options.mediaInputId,
        destination: options.destination || 'feed',
        tags: options.tags || ['Public Post'],
        clearAfterSuccess: options.clearMedia !== false,
        onSuccess: (result) => {
            console.log('✅ Post created successfully via UnifiedPostCreator');

            // Call the user-provided success callback if provided
            if (onSuccess && typeof onSuccess === 'function') {
                const postData = result.data?.post || result.data;
                onSuccess(postData);
            }

            // Refresh feed if option is set
            if (options.refreshFeed) {
                if (typeof showMyFeed === 'function') {
                    showMyFeed();
                } else if (typeof loadMyFeedPosts === 'function') {
                    loadMyFeedPosts();
                }
            }
        },
        onError: (error) => {
            console.error('❌ Post creation failed:', error);
            alert(error.error || 'Error creating post. Please try again.');
        }
    });

    return result.success;
}

/**
 * Prepend user's newly created post to the top of My Feed for instant gratification
 * This doesn't affect the feed algorithm - just shows the post immediately
 */
function prependUserPostToFeed(post, user) {
    const feedContainer = document.getElementById('myFeedPosts');
    if (!feedContainer) return;

    console.log('📝 Prepending new post to feed:', {
        id: post.id,
        hasPhotos: !!(post.photos?.length),
        photoCount: post.photos?.length || 0
    });

    // Format the post with user data for display
    const postWithUser = {
        ...post,
        author: {
            id: user.id,
            username: user.username,
            firstName: user.firstName || user.username,
            lastName: user.lastName || '',
            avatar: user.avatar || null,
            verified: user.verified || false
        },
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        isLiked: false,
        createdAt: new Date().toISOString(),
        // Ensure photos array exists (backend might not include it immediately)
        photos: post.photos || []
    };

    try {
        // Use the standard PostComponent if available
        if (window.postComponent) {
            const postHtml = window.postComponent.renderPost(postWithUser, {
                showActions: true,
                showComments: true,
                showAuthor: true,
                showTimestamp: true,
                compactView: false
            });

            // Add a subtle indicator that this is a newly created post
            const postWithIndicator = postHtml.replace(
                '<div class="post-component"',
                '<div class="post-component newly-created-post" style="border-left: 3px solid #4CAF50;"'
            );

            feedContainer.insertAdjacentHTML('afterbegin', postWithIndicator);

            // Remove the indicator after a few seconds
            setTimeout(() => {
                const newPost = feedContainer.querySelector('.newly-created-post');
                if (newPost) {
                    newPost.classList.remove('newly-created-post');
                    newPost.style.borderLeft = '';
                }
            }, 3000);
        } else {
            console.warn('PostComponent not available for displaying new post');
        }
    } catch (error) {
        console.error('Error prepending new post to feed:', error);
    }
}

/**
 * Wrapper function for My Feed posting box - MIGRATED TO UNIFIED SYSTEM
 * Uses UnifiedPostCreator for consistent posting across entire platform
 */
export async function createPostFromFeed() {
    console.log('🎯 createPostFromFeed() - using UnifiedPostCreator');

    if (!window.unifiedPostCreator) {
        console.error('❌ UnifiedPostCreator not available');
        alert('Post creation system not loaded. Please refresh the page.');
        return false;
    }

    const result = await window.unifiedPostCreator.create({
        type: 'post',
        textareaId: 'feedPostContent',
        mediaInputId: 'feedMediaUpload',
        destination: 'feed',
        tags: ['Public Post'],
        clearAfterSuccess: true,
        onSuccess: (result) => {
            console.log('✅ Post created successfully via UnifiedPostCreator');

            // Update character counter
            const charCount = document.getElementById('feedPostCharCount');
            if (charCount) charCount.textContent = '0/5000';

            // Prepend new post to feed for instant feedback
            if (result.data?.post && window.currentUser) {
                prependUserPostToFeed(result.data.post, window.currentUser);
            } else if (result.data && window.currentUser) {
                prependUserPostToFeed(result.data, window.currentUser);
            }
        },
        onError: (error) => {
            console.error('❌ Post creation failed:', error);
            alert(error.error || 'Error creating post. Please try again.');
        }
    });

    return result.success;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupMyFeedInfiniteScroll();
        setupUnifiedAuthListener();
    });
} else {
    setupMyFeedInfiniteScroll();
    setupUnifiedAuthListener();
}

/**
 * Setup listener for unified auth manager changes
 */
function setupUnifiedAuthListener() {
    // Listen for authentication state changes to automatically refresh feed
    if (window.unifiedAuthManager) {
        window.unifiedAuthManager.subscribe((authState) => {
            console.log('🎯 My Feed: Auth state changed:', authState.isAuthenticated);
            
            if (authState.isAuthenticated && authState.user) {
                // User just logged in - refresh feed
                console.log('🔄 My Feed: User logged in, auto-loading feed...');
                setTimeout(() => {
                    if (typeof window.showMyFeedInMain === 'function') {
                        window.showMyFeedInMain();
                    } else {
                        loadMyFeedPosts();
                    }
                }, 200);
            }
        });
        console.log('✅ My Feed: Listening to unified auth manager');
    } else {
        console.log('⚠️ My Feed: Unified auth manager not available, using fallback listeners');
        
        // Fallback to custom events
        window.addEventListener('userLoggedIn', () => {
            console.log('🔄 My Feed: User logged in event received');
            setTimeout(() => {
                if (typeof window.showMyFeedInMain === 'function') {
                    window.showMyFeedInMain();
                } else {
                    loadMyFeedPosts();
                }
            }, 200);
        });
    }
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
    window.uploadMediaFiles = uploadMediaFiles; // Unified media upload function
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
    createPostFromFeed,
    uploadMediaFiles
};