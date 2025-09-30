/**
 * UnifiedPostCreator - Single source of truth for all post and comment creation
 *
 * Consolidates 11+ separate posting implementations into one unified system
 * Handles: Posts (Feed, Profile, Volunteer), Comments (Main, Focus, Trending)
 *
 * AI Integration (Transparent):
 * - Image AI: Moderation during upload via /api/photos/upload (2-3s blocking)
 * - Text AI: Embedding generation during post creation (50-200ms, non-blocking to user)
 *
 * @module UnifiedPostCreator
 */

import { apiClient } from '../../core/api/client.js';

class UnifiedPostCreator {
    constructor() {
        this.mediaState = {
            selectedFiles: [],
            uploadedMediaIds: [],
            isUploading: false
        };

        this.config = {
            maxContentLength: 5000,
            maxMediaFiles: 10,
            allowedMediaTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
            maxImageSize: 10 * 1024 * 1024, // 10MB
            maxGifSize: 5 * 1024 * 1024,    // 5MB
            maxVideoSize: 50 * 1024 * 1024  // 50MB
        };
    }

    /**
     * Main creation method - handles posts AND comments
     *
     * @param {Object} options - Creation configuration
     * @param {string} options.type - 'post' | 'comment'
     * @param {string} [options.textareaId] - ID of textarea to extract content from
     * @param {string} [options.content] - Direct content (if not using textarea)
     * @param {string} [options.destination] - 'feed' | 'profile' | 'volunteer' | 'trending'
     * @param {string} [options.postId] - Required for comments
     * @param {string[]} [options.tags] - Post tags (e.g., ['Public Post'])
     * @param {File[]} [options.mediaFiles] - Files to upload (images/videos)
     * @param {string} [options.mediaInputId] - ID of file input for media
     * @param {Function} [options.onSuccess] - Success callback
     * @param {Function} [options.onError] - Error callback
     * @param {Function} [options.onMediaUploadStart] - Called when media upload begins
     * @param {Function} [options.onMediaUploadComplete] - Called when media upload completes
     * @param {boolean} [options.clearAfterSuccess=true] - Clear form after success
     * @param {Object} [options.additionalData] - Additional data for API call
     *
     * @returns {Promise<Object>} - { success: boolean, data?: any, error?: string }
     */
    async create(options) {
        console.log('🎯 UnifiedPostCreator.create() called with options:', options);

        try {
            // PHASE 1: Validate options
            const validation = this._validateOptions(options);
            if (!validation.valid) {
                return this._handleError(validation.error, options.onError);
            }

            // PHASE 2: Get and validate content
            const content = this._getContent(options);
            if (!content || content.trim().length === 0) {
                return this._handleError('Please enter some content', options.onError);
            }

            if (content.length > this.config.maxContentLength) {
                return this._handleError(`Content too long (max ${this.config.maxContentLength} characters)`, options.onError);
            }

            // PHASE 3: Upload media if present (AI moderation happens here)
            let mediaIds = [];
            const mediaFiles = options.mediaFiles || this._getMediaFiles(options.mediaInputId);

            if (mediaFiles && mediaFiles.length > 0) {
                console.log(`📷 Uploading ${mediaFiles.length} media file(s)...`);

                if (options.onMediaUploadStart) {
                    options.onMediaUploadStart();
                }

                const uploadResult = await this._uploadMedia(mediaFiles, options.destination);

                if (!uploadResult.success) {
                    if (options.onError) {
                        options.onError(uploadResult);
                    }
                    return uploadResult;
                }

                mediaIds = uploadResult.mediaIds;
                console.log('✅ Media uploaded successfully:', mediaIds);

                if (options.onMediaUploadComplete) {
                    options.onMediaUploadComplete(uploadResult);
                }
            }

            // PHASE 4: Create post or comment (AI embedding happens here for posts)
            let result;
            if (options.type === 'comment') {
                result = await this._createComment({
                    postId: options.postId,
                    content: content,
                    ...options.additionalData
                });
            } else {
                result = await this._createPost({
                    content: content,
                    tags: options.tags || ['Public Post'],
                    mediaIds: mediaIds,
                    destination: options.destination,
                    ...options.additionalData
                });
            }

            // PHASE 5: Handle success
            if (result.success) {
                console.log('✅ Post/comment created successfully:', result.data);

                // Clear form if requested
                if (options.clearAfterSuccess !== false) {
                    this._clearForm(options);
                }

                // Call success callback
                if (options.onSuccess) {
                    options.onSuccess(result);
                }

                return result;
            } else {
                return this._handleError(result.error || 'Creation failed', options.onError);
            }

        } catch (error) {
            console.error('❌ UnifiedPostCreator error:', error);
            return this._handleError(error.message || 'An unexpected error occurred', options.onError);
        }
    }

    /**
     * Validate creation options
     * @private
     */
    _validateOptions(options) {
        if (!options.type) {
            return { valid: false, error: 'Type is required (post or comment)' };
        }

        if (options.type !== 'post' && options.type !== 'comment') {
            return { valid: false, error: 'Type must be "post" or "comment"' };
        }

        if (options.type === 'comment' && !options.postId) {
            return { valid: false, error: 'postId is required for comments' };
        }

        if (!options.textareaId && !options.content) {
            return { valid: false, error: 'Either textareaId or content is required' };
        }

        return { valid: true };
    }

    /**
     * Get content from textarea or direct content
     * @private
     */
    _getContent(options) {
        if (options.content) {
            return options.content.trim();
        }

        if (options.textareaId) {
            const textarea = document.getElementById(options.textareaId);
            if (!textarea) {
                console.error(`Textarea with id "${options.textareaId}" not found`);
                return '';
            }
            return textarea.value.trim();
        }

        return '';
    }

    /**
     * Get media files from file input
     * @private
     */
    _getMediaFiles(inputId) {
        if (!inputId) return null;

        const input = document.getElementById(inputId);
        if (!input || !input.files || input.files.length === 0) {
            return null;
        }

        return Array.from(input.files);
    }

    /**
     * Upload media files with AI moderation
     * @private
     */
    async _uploadMedia(files, destination) {
        console.log('🔧 _uploadMedia called with files:', files);

        try {
            // Validate files
            for (const file of files) {
                const validation = this._validateMediaFile(file);
                if (!validation.valid) {
                    return { success: false, error: validation.error };
                }
            }

            // Determine photo type based on destination
            let photoType = 'POST_MEDIA';
            if (destination === 'profile') {
                photoType = 'PROFILE_PICTURE';
            } else if (destination === 'volunteer') {
                photoType = 'POST_MEDIA';
            }

            // Use existing uploadMediaFiles function which has AI moderation built-in
            if (typeof window.uploadMediaFiles !== 'function') {
                return { success: false, error: 'Media upload system not available' };
            }

            const result = await window.uploadMediaFiles(files, photoType, 'PERSONAL');
            console.log('📸 Upload result from uploadMediaFiles:', result);
            console.log('📸 Upload result.ok:', result.ok);
            console.log('📸 Upload result.data:', result.data);
            console.log('📸 Upload result.data.photos:', result.data?.photos);
            console.log('📸 Upload result.data.photos length:', result.data?.photos?.length);

            if (result.ok && result.data?.photos) {
                const mediaIds = result.data.photos.map(photo => photo.id);
                console.log('📸 Extracted mediaIds:', mediaIds);
                return {
                    success: true,
                    mediaIds: mediaIds,
                    photos: result.data.photos
                };
            } else {
                console.log('📸 Upload failed - checking error details:');
                console.log('📸 result.error:', result.error);
                console.log('📸 result.data?.error:', result.data?.error);
                const errorMessage = result.error || result.data?.error || 'Media upload failed';
                return { success: false, error: errorMessage };
            }

        } catch (error) {
            console.error('❌ Media upload error:', error);

            // Check if it's a moderation error
            if (error.message?.includes('moderation') || error.message?.includes('content policy')) {
                return {
                    success: false,
                    error: 'Your image cannot be uploaded due to content policy. Please select a different image.',
                    isModerationError: true
                };
            }

            return {
                success: false,
                error: error.message || 'Media upload failed. Please try again.'
            };
        }
    }

    /**
     * Validate individual media file
     * @private
     */
    _validateMediaFile(file) {
        if (!this.config.allowedMediaTypes.includes(file.type)) {
            return {
                valid: false,
                error: `File type not supported: ${file.type}. Please use images (JPEG, PNG, WebP, GIF) or videos (MP4, WebM).`
            };
        }

        let maxSize = this.config.maxImageSize;
        if (file.type === 'image/gif') {
            maxSize = this.config.maxGifSize;
        } else if (file.type.startsWith('video/')) {
            maxSize = this.config.maxVideoSize;
        }

        if (file.size > maxSize) {
            const sizeMB = Math.round(maxSize / (1024 * 1024));
            return {
                valid: false,
                error: `File too large. Maximum size: ${sizeMB}MB`
            };
        }

        return { valid: true };
    }

    /**
     * Create post via API (AI embedding generation happens in backend)
     * @private
     */
    async _createPost(data) {
        console.log('🔧 _createPost called with data:', data);

        try {
            // Use existing createPostWithTag function if available
            if (typeof window.createPostWithTag === 'function') {
                const response = await window.createPostWithTag(
                    data.content,
                    data.tags || ['Public Post'],
                    { mediaId: data.mediaIds?.[0] } // Use first media ID
                );

                if (response.success) {
                    return { success: true, data: response.post };
                } else {
                    return { success: false, error: response.error || 'Post creation failed' };
                }
            }

            // Fallback to direct API call
            const response = await apiClient.call('/posts', {
                method: 'POST',
                body: {
                    content: data.content,
                    tags: data.tags || ['Public Post'],
                    mediaId: data.mediaIds?.[0],
                    ...data
                }
            });

            if (response) {
                return { success: true, data: response };
            } else {
                return { success: false, error: 'Post creation failed' };
            }

        } catch (error) {
            console.error('❌ Post creation error:', error);
            return { success: false, error: error.message || 'Post creation failed' };
        }
    }

    /**
     * Create comment via API
     * @private
     */
    async _createComment(data) {
        console.log('🔧 _createComment called with data:', data);

        try {
            const response = await apiClient.call(`/posts/${data.postId}/comments`, {
                method: 'POST',
                body: {
                    content: data.content,
                    ...data
                }
            });

            if (response) {
                return { success: true, data: response };
            } else {
                return { success: false, error: 'Comment creation failed' };
            }

        } catch (error) {
            console.error('❌ Comment creation error:', error);
            return { success: false, error: error.message || 'Comment creation failed' };
        }
    }

    /**
     * Clear form after successful submission
     * @private
     */
    _clearForm(options) {
        // Clear textarea
        if (options.textareaId) {
            const textarea = document.getElementById(options.textareaId);
            if (textarea) {
                textarea.value = '';
            }
        }

        // Clear media input
        if (options.mediaInputId) {
            const input = document.getElementById(options.mediaInputId);
            if (input) {
                input.value = '';
            }
        }

        // Clear media preview if it exists
        const previewId = options.mediaInputId?.replace('Upload', 'Preview') || 'mediaPreview';
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.innerHTML = '';
        }

        // Reset media state
        this.mediaState = {
            selectedFiles: [],
            uploadedMediaIds: [],
            isUploading: false
        };
    }

    /**
     * Handle errors consistently
     * @private
     */
    _handleError(errorMessage, errorCallback) {
        console.error('❌ UnifiedPostCreator error:', errorMessage);

        const result = {
            success: false,
            error: errorMessage
        };

        if (errorCallback) {
            errorCallback(result);
        }

        return result;
    }

    /**
     * Handle media file selection (for event delegation)
     */
    handleMediaSelection(inputElement) {
        console.log('📷 UnifiedPostCreator.handleMediaSelection called');
        console.log('📷 Input element:', inputElement);
        console.log('📷 Files:', inputElement?.files);

        if (!inputElement || !inputElement.files || inputElement.files.length === 0) {
            console.log('📷 No files selected or input element invalid');
            return;
        }

        const files = Array.from(inputElement.files);
        this.mediaState.selectedFiles = files;

        // Show preview
        const previewId = inputElement.id.replace('Upload', 'Preview') || 'mediaPreview';
        const preview = document.getElementById(previewId);

        if (preview) {
            this._showMediaPreview(files, preview);
        }
    }

    /**
     * Show media preview
     * @private
     */
    _showMediaPreview(files, previewContainer) {
        previewContainer.innerHTML = '';

        // Store file references with unique IDs to avoid array mutation issues
        const fileArray = Array.from(files);

        fileArray.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewDiv = document.createElement('div');
                previewDiv.style.cssText = 'display: inline-block; margin: 5px; position: relative;';
                previewDiv.dataset.fileIndex = index;  // Track original index

                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.cssText = 'max-width: 100px; max-height: 100px; border-radius: 4px;';
                    previewDiv.appendChild(img);
                } else if (file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = e.target.result;
                    video.style.cssText = 'max-width: 100px; max-height: 100px; border-radius: 4px;';
                    video.controls = false;
                    previewDiv.appendChild(video);
                }

                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.style.cssText = 'position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 14px; line-height: 1;';
                removeBtn.onclick = () => {
                    // Remove from preview
                    previewDiv.remove();

                    // Create new array without this file (safe - no mutation during iteration)
                    const remainingFiles = this.mediaState.selectedFiles.filter((f, i) => i !== index);
                    this.mediaState.selectedFiles = remainingFiles;

                    console.log(`🗑️ Removed file at index ${index}, ${remainingFiles.length} files remaining`);
                };
                previewDiv.appendChild(removeBtn);

                previewContainer.appendChild(previewDiv);
            };
            reader.readAsDataURL(file);
        });
    }
}

// Create singleton instance
const unifiedPostCreator = new UnifiedPostCreator();

// Export for ES6 module system
export { unifiedPostCreator, UnifiedPostCreator };

// Make globally available for legacy compatibility
if (typeof window !== 'undefined') {
    window.unifiedPostCreator = unifiedPostCreator;
    window.UnifiedPostCreator = UnifiedPostCreator;
}

console.log('✅ UnifiedPostCreator module loaded');