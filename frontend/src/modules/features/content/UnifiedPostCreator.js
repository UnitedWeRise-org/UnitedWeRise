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
import { hasRiseAIMention, triggerRiseAIAnalysis } from '../../../services/riseAIService.js';

class UnifiedPostCreator {
    constructor() {
        this.mediaState = {
            selectedFiles: [],
            uploadedMediaIds: [],
            isUploading: false
        };

        this.config = {
            maxContentLength: 500,
            maxMediaFiles: 10,
            allowedMediaTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
            maxImageSize: 10 * 1024 * 1024, // 10MB
            maxGifSize: 5 * 1024 * 1024,    // 5MB
            maxVideoSize: 50 * 1024 * 1024, // 50MB
            // Thread-specific limits
            threadHeadMaxLength: 500,       // Initial post max chars
            threadContinuationMaxLength: 500, // Continuation max chars (unified with head posts)
            threadPromptThreshold: 300      // Show "Continue in thread" prompt at this char count
        };

        // Thread state for multi-post threads
        this.threadState = {
            isThreadMode: false,
            continuations: []  // Array of continuation content strings
        };
    }

    /**
     * Get thread configuration for UI components
     * @returns {Object} Thread config values
     */
    getThreadConfig() {
        return {
            headMaxLength: this.config.threadHeadMaxLength,
            continuationMaxLength: this.config.threadContinuationMaxLength,
            promptThreshold: this.config.threadPromptThreshold
        };
    }

    /**
     * Smart split content into thread-sized chunks
     * Splits at paragraph breaks first, then sentences if needed
     * Preserves line breaks within chunks (max 30 lines per chunk)
     * @param {string} content - Full content to split
     * @param {number} [maxChars=500] - Maximum chars per chunk
     * @returns {string[]} - Array of content chunks
     */
    smartSplitContent(content, maxChars = 500) {
        if (!content || content.length <= maxChars) {
            return [content];
        }

        const chunks = [];
        // Trim outer edges only, preserve internal formatting
        let remaining = content.trim();

        while (remaining.length > 0) {
            if (remaining.length <= maxChars) {
                // Apply line limit and normalize newlines on final chunk
                chunks.push(this._normalizeChunk(remaining));
                break;
            }

            // Try to split at paragraph break first
            let splitPoint = this._findParagraphBreak(remaining, maxChars);

            // If no paragraph break, try sentence boundary
            if (splitPoint === -1) {
                splitPoint = this._findSentenceBreak(remaining, maxChars);
            }

            // If no sentence break, try word boundary
            if (splitPoint === -1) {
                splitPoint = this._findWordBreak(remaining, maxChars);
            }

            // Last resort: hard split at maxChars
            if (splitPoint === -1) {
                splitPoint = maxChars;
            }

            // Preserve newlines: only remove trailing spaces/tabs, not newlines
            const chunk = remaining.substring(0, splitPoint)
                .replace(/[ \t]+$/, '');  // Remove trailing spaces/tabs only
            chunks.push(this._normalizeChunk(chunk));

            // Remove leading spaces/tabs from remainder, preserve newlines
            remaining = remaining.substring(splitPoint).replace(/^[ \t]+/, '');
        }

        return chunks.filter(chunk => chunk.length > 0);
    }

    /**
     * Normalize chunk: collapse excessive newlines and cap line count
     * @private
     * @param {string} text - Chunk text to normalize
     * @param {number} [maxLines=30] - Maximum lines per chunk
     * @returns {string} - Normalized chunk
     */
    _normalizeChunk(text, maxLines = 30) {
        // Collapse 3+ consecutive newlines to 2 (preserve paragraph breaks)
        let normalized = text.replace(/\n{3,}/g, '\n\n');

        // Cap at maxLines to prevent visual overflow
        const lines = normalized.split('\n');
        if (lines.length > maxLines) {
            normalized = lines.slice(0, maxLines).join('\n');
        }

        return normalized;
    }

    /**
     * Find a paragraph break within maxChars
     * @private
     */
    _findParagraphBreak(text, maxChars) {
        const searchText = text.substring(0, maxChars);
        // Look for double newline (paragraph break) from the end
        const lastBreak = searchText.lastIndexOf('\n\n');
        if (lastBreak > 0) {
            return lastBreak + 2; // Include the newlines in the split
        }
        // Also try single newlines as a fallback
        const lastNewline = searchText.lastIndexOf('\n');
        if (lastNewline > maxChars * 0.5) { // Only if it's past halfway
            return lastNewline + 1;
        }
        return -1;
    }

    /**
     * Find a sentence break within maxChars
     * @private
     */
    _findSentenceBreak(text, maxChars) {
        const searchText = text.substring(0, maxChars);
        // Look for sentence endings from the end
        const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        let lastBreak = -1;

        for (const ender of sentenceEnders) {
            const idx = searchText.lastIndexOf(ender);
            if (idx > lastBreak) {
                lastBreak = idx + ender.length;
            }
        }

        // Only use sentence break if it's past 40% of the way
        if (lastBreak > maxChars * 0.4) {
            return lastBreak;
        }
        return -1;
    }

    /**
     * Find a word break within maxChars
     * @private
     */
    _findWordBreak(text, maxChars) {
        const searchText = text.substring(0, maxChars);
        const lastSpace = searchText.lastIndexOf(' ');
        if (lastSpace > maxChars * 0.7) { // Only if past 70%
            return lastSpace + 1;
        }
        return -1;
    }

    /**
     * Check if content needs to be split into a thread
     * @param {string} content - Content to check
     * @returns {Object} - { needsThread: boolean, chunks: string[], totalParts: number }
     */
    analyzeContentForThread(content) {
        if (!content || content.length <= this.config.maxContentLength) {
            return {
                needsThread: false,
                chunks: [content || ''],
                totalParts: 1
            };
        }

        const chunks = this.smartSplitContent(content, this.config.maxContentLength);
        return {
            needsThread: chunks.length > 1,
            chunks,
            totalParts: chunks.length
        };
    }

    /**
     * Create a thread (head post + continuation posts) using batch endpoint
     * @param {Object} options - Thread creation options
     * @param {string} options.headContent - Content for the head post (max 500 chars)
     * @param {string[]} options.continuations - Array of continuation content strings (max 500 chars each)
     * @param {string[]} [options.tags] - Post tags
     * @param {File[]} [options.mediaFiles] - Files to upload (attached to head post only)
     * @param {Function} [options.onProgress] - Progress callback (called with { step, total, message })
     * @param {Function} [options.onSuccess] - Success callback
     * @param {Function} [options.onError] - Error callback
     * @returns {Promise<Object>} - { success, headPost, continuationPosts, error }
     */
    async createThread(options) {
        console.log('🧵 UnifiedPostCreator.createThread() called with:', {
            headLength: options.headContent?.length,
            continuationCount: options.continuations?.length
        });

        const { headContent, continuations = [], tags = ['Public Post'], mediaFiles, onProgress, onSuccess, onError } = options;

        try {
            // Validate head content
            if (!headContent || headContent.trim().length === 0) {
                return this._handleError('Please enter content for your post', onError);
            }

            if (headContent.length > this.config.threadHeadMaxLength) {
                return this._handleError(`First post exceeds ${this.config.threadHeadMaxLength} characters. Please shorten it or move content to a continuation.`, onError);
            }

            // Validate continuations
            for (let i = 0; i < continuations.length; i++) {
                if (continuations[i].length > this.config.threadContinuationMaxLength) {
                    return this._handleError(`Continuation ${i + 1} exceeds ${this.config.threadContinuationMaxLength} characters. Please shorten it.`, onError);
                }
            }

            // Step 1: Upload media if present (attached to head post)
            let mediaIds = [];
            if (mediaFiles && mediaFiles.length > 0) {
                onProgress?.({ step: 1, total: 2, message: 'Uploading media...' });
                const uploadResult = await this._uploadMedia(mediaFiles);
                if (!uploadResult.success) {
                    return this._handleError(uploadResult.error, onError);
                }
                mediaIds = uploadResult.mediaIds;
            }

            // Step 2: Create entire thread via batch endpoint (single API call)
            onProgress?.({ step: 2, total: 2, message: 'Creating thread...' });

            const response = await apiClient.call('/posts/thread', {
                method: 'POST',
                body: {
                    headContent: headContent.trim(),
                    continuations: continuations.map(c => c.trim()),
                    tags,
                    mediaIds
                }
            });

            if (!response || !response.success) {
                // Check for rate limit response
                if (response?.error?.includes('Too many') || response?.retryAfter) {
                    return this._handleRateLimitError(response, onError);
                }
                return this._handleError(response?.error || 'Failed to create thread', onError);
            }

            console.log('✅ Thread created via batch endpoint:', {
                headPostId: response.headPost?.id,
                totalPosts: response.totalPosts
            });

            // Check for RiseAI mentions in head and continuations
            await this._checkForRiseAIMention(headContent, response.headPost, 'post', null);
            for (let i = 0; i < continuations.length; i++) {
                if (response.continuationPosts[i]) {
                    await this._checkForRiseAIMention(continuations[i], response.continuationPosts[i], 'post', null);
                }
            }

            const result = {
                success: true,
                headPost: response.headPost,
                continuationPosts: response.continuationPosts,
                totalPosts: response.totalPosts
            };

            onSuccess?.(result);
            return result;

        } catch (error) {
            console.error('❌ Thread creation error:', error);
            // Check for rate limit in error response
            if (error.retryAfter) {
                return this._handleRateLimitError(error, onError);
            }
            return this._handleError(error.message || 'Failed to create thread', onError);
        }
    }

    /**
     * Handle rate limit errors with countdown info
     * @private
     */
    _handleRateLimitError(response, errorCallback) {
        const retryAfter = response.retryAfter;
        const result = {
            success: false,
            error: response.error || 'Rate limit exceeded',
            isRateLimited: true,
            retryAfter: retryAfter
        };

        // Show rate limit toast if available
        if (typeof window.showRateLimitToast === 'function' && retryAfter) {
            window.showRateLimitToast(retryAfter);
        } else if (typeof window.showToast === 'function') {
            const minutes = Math.ceil(retryAfter / 60);
            window.showToast(`Rate limit reached. Please wait ${minutes} minute${minutes > 1 ? 's' : ''}.`, 'warning');
        }

        if (errorCallback) {
            errorCallback(result);
        }

        return result;
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

                // PHASE 5.5: Check for @RiseAI mention and trigger analysis
                await this._checkForRiseAIMention(content, result.data, options.type, options.postId);

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
                photoType = 'AVATAR';  // Fixed: Use correct PhotoType enum value
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
                    {
                        mediaId: data.mediaIds?.[0],
                        threadHeadId: data.threadHeadId  // Pass thread head ID for continuations
                    }
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
     * Check for @RiseAI mention and trigger analysis
     * @private
     * @param {string} content - The content to check for mentions
     * @param {Object} responseData - The API response data
     * @param {string} type - 'post' or 'comment'
     * @param {string} [originalPostId] - The original postId from options (for comments)
     */
    async _checkForRiseAIMention(content, responseData, type, originalPostId = null) {
        try {
            // Check if content has @RiseAI mention
            if (!hasRiseAIMention(content)) {
                return;
            }

            console.log('🤖 @RiseAI mention detected, triggering analysis...');

            // Get the post ID - for posts it's in the response, for comments we use originalPostId
            let postId, commentId;

            if (type === 'post') {
                // Response data is the created post
                postId = responseData?.id || responseData?.post?.id;
            } else if (type === 'comment') {
                // For comments, use originalPostId (from options) as primary source
                // Fall back to responseData.postId if available
                postId = originalPostId || responseData?.postId;
                commentId = responseData?.id || responseData?.comment?.id;
            }

            if (!postId) {
                console.warn('⚠️ Could not determine postId for RiseAI analysis');
                return;
            }

            // Trigger RiseAI analysis (runs asynchronously - will post reply when done)
            const result = await triggerRiseAIAnalysis({
                postId,
                commentId,
                content
            });

            if (result.success) {
                console.log('✅ RiseAI analysis triggered:', result.interactionId);
                // Optionally show a toast notification
                if (typeof window.showToast === 'function') {
                    window.showToast('RiseAI is analyzing your post and will reply shortly.', 'info');
                }
            } else if (result.error?.includes('Rate limit')) {
                console.warn('⚠️ RiseAI rate limit reached');
                if (typeof window.showToast === 'function') {
                    window.showToast('RiseAI rate limit reached. Try again later.', 'warning');
                }
            } else {
                console.warn('⚠️ RiseAI analysis not triggered:', result.error);
            }

        } catch (error) {
            // Don't fail the post creation if RiseAI fails
            console.error('❌ RiseAI check error (non-fatal):', error);
        }
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