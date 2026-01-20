/**
 * NewPostModal Component
 * Responsive modal/bottom sheet for creating posts
 * - Desktop: Center modal with backdrop
 * - Mobile: Bottom sheet slide-up
 */

import { apiCall } from '../js/api-compatibility-shim.js';

export class NewPostModal {
    constructor() {
        this.modal = null;
        this.backdrop = null;
        this.closeBtn = null;
        this.composerMount = null;
        this.init();
    }

    init() {
        // Check if modal exists, create if not
        this.modal = document.getElementById('new-post-modal');
        if (!this.modal) {
            this.createModal();
        }

        this.backdrop = this.modal.querySelector('.new-post-modal-backdrop');
        this.closeBtn = this.modal.querySelector('.new-post-modal-close');
        this.composerMount = this.modal.querySelector('#new-post-composer-mount');

        this.attachEventListeners();
    }

    createModal() {
        const modalHTML = `
            <div id="new-post-modal" class="new-post-modal" style="display: none;">
                <div class="new-post-modal-backdrop"></div>
                <div class="new-post-modal-content">
                    <div class="new-post-modal-header">
                        <h3>Create Post</h3>
                        <button class="new-post-modal-close">✕</button>
                    </div>
                    <div class="new-post-modal-body">
                        <div id="new-post-composer-mount"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('new-post-modal');
    }

    attachEventListeners() {
        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }

        // Backdrop click
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => this.hide());
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
                this.hide();
            }
        });
    }

    show() {
        if (!this.modal || !this.composerMount) {
            console.error('NewPostModal: Modal or mount point not found');
            return;
        }

        // Clear any existing content
        this.composerMount.innerHTML = '';

        // Create inline composer HTML with thread preview support
        const composerHTML = `
            <div class="quick-post-composer" style="width: 100%;">
                <textarea id="modalPostContent" placeholder="What's on your mind?" style="width: 100%; min-height: 120px; border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-family: inherit; font-size: 14px; resize: vertical; box-sizing: border-box; margin-bottom: 8px;"></textarea>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span id="modalThreadIndicator" style="font-size: 0.85rem; color: #4b5c09; display: none;"></span>
                    <span id="modalPostCharCount" style="font-size: 0.85rem; color: #6c757d;">0/500</span>
                </div>

                <!-- Thread Preview Section -->
                <div id="modalThreadPreview" style="display: none; margin-bottom: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #f9f9f9; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: pointer;" id="modalThreadPreviewToggle">
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Preview Thread (<span id="modalThreadPartCount">0</span> parts)</span>
                        <span id="modalThreadPreviewArrow" style="color: #666;">&#9660;</span>
                    </div>
                    <div id="modalThreadPreviewContent" style="display: none;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div style="flex: 1;">
                        <input type="file" id="modalMediaUpload" multiple accept="image/*,video/*" style="display: none;">
                        <button data-post-modal-action="add-media" style="background: #666; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; border: none; display: inline-flex; align-items: center; gap: 6px;">
                            <span>📷</span>
                            <span>Add Media</span>
                        </button>
                        <div id="modalMediaPreview" style="margin-top: 8px;"></div>
                    </div>
                    <div>
                        <button id="modalPostButton" class="btn" style="background: #4b5c09; color: white; padding: 10px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none;">Post</button>
                    </div>
                </div>
            </div>
        `;

        this.composerMount.innerHTML = composerHTML;

        // Setup event listeners for inline composer
        this.setupInlineComposer();

        // Show modal
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scroll

        // Focus textarea
        setTimeout(() => {
            const textarea = this.composerMount.querySelector('#modalPostContent');
            if (textarea) {
                textarea.focus();
            }
        }, 100);
    }

    setupInlineComposer() {
        const textarea = document.getElementById('modalPostContent');
        const charCount = document.getElementById('modalPostCharCount');
        const postButton = document.getElementById('modalPostButton');
        const fileInput = document.getElementById('modalMediaUpload');
        const threadIndicator = document.getElementById('modalThreadIndicator');
        const threadPreview = document.getElementById('modalThreadPreview');
        const threadPreviewToggle = document.getElementById('modalThreadPreviewToggle');
        const threadPreviewContent = document.getElementById('modalThreadPreviewContent');
        const threadPreviewArrow = document.getElementById('modalThreadPreviewArrow');
        const threadPartCount = document.getElementById('modalThreadPartCount');

        // Track thread state
        this.threadMode = false;
        this.threadChunks = [];
        this.previewExpanded = false;

        // Character counter and thread detection
        if (textarea && charCount) {
            const updateCharCountAndThread = () => {
                const content = textarea.value;
                const length = content.length;

                // Analyze content for threading
                if (window.unifiedPostCreator) {
                    const analysis = window.unifiedPostCreator.analyzeContentForThread(content);
                    this.threadMode = analysis.needsThread;
                    this.threadChunks = analysis.chunks;

                    if (analysis.needsThread) {
                        // Thread mode - update UI
                        charCount.textContent = `${length} chars - ${analysis.totalParts} parts`;
                        charCount.style.color = '#4b5c09';
                        threadIndicator.textContent = 'Will post as thread';
                        threadIndicator.style.display = 'inline';
                        threadPreview.style.display = 'block';
                        threadPartCount.textContent = analysis.totalParts;
                        postButton.textContent = `Post Thread (${analysis.totalParts})`;

                        // Update thread preview content
                        this.updateThreadPreview(analysis.chunks);
                    } else {
                        // Single post mode
                        charCount.textContent = `${length}/500`;
                        threadIndicator.style.display = 'none';
                        threadPreview.style.display = 'none';
                        postButton.textContent = 'Post';

                        // Color based on proximity to limit
                        if (length > 500) {
                            charCount.style.color = '#dc3545'; // Red - over limit
                        } else if (length > 400) {
                            charCount.style.color = '#ffc107'; // Yellow - approaching limit
                        } else {
                            charCount.style.color = '#6c757d'; // Gray - normal
                        }
                    }
                } else {
                    // Fallback without UnifiedPostCreator
                    charCount.textContent = `${length}/500`;
                    if (length > 500) {
                        charCount.style.color = '#dc3545';
                    } else if (length > 400) {
                        charCount.style.color = '#ffc107';
                    } else {
                        charCount.style.color = '#6c757d';
                    }
                }
            };

            textarea.addEventListener('input', updateCharCountAndThread);

            // Paste detection - auto-expand preview when pasting long content
            textarea.addEventListener('paste', (e) => {
                // Run after paste is processed
                setTimeout(() => {
                    updateCharCountAndThread();
                    // Auto-expand preview if content is long
                    if (this.threadMode && !this.previewExpanded) {
                        this.previewExpanded = true;
                        if (threadPreviewContent) threadPreviewContent.style.display = 'block';
                        if (threadPreviewArrow) threadPreviewArrow.innerHTML = '&#9650;';
                    }
                }, 0);
            });

            // Restore draft if available
            this.restoreDraft(textarea, updateCharCountAndThread);
        }

        // Thread preview toggle
        if (threadPreviewToggle) {
            threadPreviewToggle.addEventListener('click', () => {
                this.previewExpanded = !this.previewExpanded;
                threadPreviewContent.style.display = this.previewExpanded ? 'block' : 'none';
                threadPreviewArrow.innerHTML = this.previewExpanded ? '&#9650;' : '&#9660;';
            });
        }

        // Post button
        if (postButton) {
            postButton.addEventListener('click', () => {
                this.createPost();
            });
        }

        // File input
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    console.log('📷 Modal media files selected:', e.target.files.length);
                    // Use UnifiedPostCreator if available
                    if (window.unifiedPostCreator) {
                        window.unifiedPostCreator.handleMediaSelection(e.target);
                    }
                }
            });
        }
    }

    /**
     * Update the thread preview with current chunks
     * @param {string[]} chunks - Array of content chunks
     */
    updateThreadPreview(chunks) {
        const previewContent = document.getElementById('modalThreadPreviewContent');
        if (!previewContent) return;

        previewContent.innerHTML = chunks.map((chunk, index) => `
            <div style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 10px; margin-bottom: 8px; ${index === chunks.length - 1 ? 'margin-bottom: 0;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 600; color: #4b5c09; font-size: 0.8rem;">Part ${index + 1}</span>
                    <span style="font-size: 0.75rem; color: #888;">${chunk.length} chars</span>
                </div>
                <div style="font-size: 0.85rem; color: #333; white-space: pre-wrap; word-break: break-word; max-height: 80px; overflow-y: auto;">${this.escapeHtml(chunk)}</div>
            </div>
        `).join('');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Save content as draft to localStorage
     * @param {string} content - Content to save
     */
    saveDraft(content) {
        if (!content || content.trim().length === 0) {
            this.clearDraft();
            return;
        }
        try {
            localStorage.setItem('uwr_post_draft', JSON.stringify({
                content: content,
                timestamp: Date.now()
            }));
            console.log('📝 Draft saved');
        } catch (e) {
            console.warn('Could not save draft:', e);
        }
    }

    /**
     * Restore draft from localStorage
     * @param {HTMLTextAreaElement} textarea - Textarea to restore to
     * @param {Function} updateCallback - Callback to update UI after restore
     */
    restoreDraft(textarea, updateCallback) {
        try {
            const draft = localStorage.getItem('uwr_post_draft');
            if (!draft) return;

            const { content, timestamp } = JSON.parse(draft);
            // Only restore drafts less than 24 hours old
            const maxAge = 24 * 60 * 60 * 1000;
            if (Date.now() - timestamp > maxAge) {
                this.clearDraft();
                return;
            }

            if (content && content.trim().length > 0) {
                textarea.value = content;
                updateCallback();
                console.log('📝 Draft restored');

                // Show toast notification
                if (typeof window.showToast === 'function') {
                    window.showToast('Previous draft restored', 'info');
                }
            }
        } catch (e) {
            console.warn('Could not restore draft:', e);
        }
    }

    /**
     * Clear saved draft
     */
    clearDraft() {
        try {
            localStorage.removeItem('uwr_post_draft');
        } catch (e) {
            console.warn('Could not clear draft:', e);
        }
    }

    async createPost() {
        const textarea = document.getElementById('modalPostContent');
        const postButton = document.getElementById('modalPostButton');
        const content = textarea ? textarea.value.trim() : '';

        if (!content) {
            alert('Please enter some content for your post.');
            return;
        }

        console.log('🎯 Creating post from modal...', { threadMode: this.threadMode, chunks: this.threadChunks?.length });

        // Disable button during submission
        if (postButton) {
            postButton.disabled = true;
            postButton.textContent = this.threadMode ? 'Posting thread...' : 'Posting...';
        }

        try {
            // Use UnifiedPostCreator if available
            if (window.unifiedPostCreator) {
                if (this.threadMode && this.threadChunks && this.threadChunks.length > 1) {
                    // Thread mode - use createThread
                    console.log('🧵 Creating thread with', this.threadChunks.length, 'parts');

                    const result = await window.unifiedPostCreator.createThread({
                        headContent: this.threadChunks[0],
                        continuations: this.threadChunks.slice(1),
                        tags: ['Public Post'],
                        onProgress: (progress) => {
                            if (postButton) {
                                postButton.textContent = progress.message || `Creating part ${progress.step}/${progress.total}...`;
                            }
                        },
                        onSuccess: (result) => {
                            console.log('✅ Thread created successfully from modal:', result.totalPosts, 'posts');
                            this.clearDraft(); // Clear draft on success
                            this.hide();

                            // Prepend head post to feed for instant feedback
                            if (window.myFeedHandlers && window.currentUser && result.headPost) {
                                window.myFeedHandlers.prependUserPostToFeed(result.headPost, window.currentUser);
                            }

                            // Refresh feed cache for next load
                            if (window.feedToggle) {
                                window.feedToggle.clearCache();
                            }

                            // Show success toast
                            if (typeof window.showToast === 'function') {
                                window.showToast(`Thread posted! (${result.totalPosts} parts)`, 'success');
                            }
                        },
                        onError: (error) => {
                            console.error('❌ Thread creation failed:', error);
                            this.saveDraft(content); // Preserve content on error
                            alert(error.error || 'Error creating thread. Please try again.');
                            if (postButton) {
                                postButton.disabled = false;
                                postButton.textContent = `Post Thread (${this.threadChunks.length})`;
                            }
                        }
                    });

                    if (!result.success) {
                        // Error already handled by onError callback
                        return;
                    }
                } else {
                    // Single post mode - validate length
                    if (content.length > 500) {
                        alert('Post content exceeds 500 character limit.');
                        if (postButton) {
                            postButton.disabled = false;
                            postButton.textContent = 'Post';
                        }
                        return;
                    }

                    const result = await window.unifiedPostCreator.create({
                        type: 'post',
                        textareaId: 'modalPostContent',
                        mediaInputId: 'modalMediaUpload',
                        destination: 'feed',
                        tags: ['Public Post'],
                        clearAfterSuccess: true,
                        onSuccess: (result) => {
                            console.log('✅ Post created successfully from modal');
                            this.clearDraft(); // Clear draft on success
                            this.hide();

                            // Prepend new post to feed for instant feedback
                            if (window.myFeedHandlers && window.currentUser) {
                                const post = result.data?.post || result.data;
                                if (post) {
                                    window.myFeedHandlers.prependUserPostToFeed(post, window.currentUser);
                                }
                            }

                            // Refresh feed cache for next load
                            if (window.feedToggle) {
                                window.feedToggle.clearCache();
                            }
                        },
                        onError: (error) => {
                            console.error('❌ Post creation failed:', error);
                            this.saveDraft(content); // Preserve content on error
                            alert(error.error || 'Error creating post. Please try again.');
                            if (postButton) {
                                postButton.disabled = false;
                                postButton.textContent = 'Post';
                            }
                        }
                    });
                }
            } else {
                // Fallback: Direct API call (single posts only)
                if (content.length > 500) {
                    alert('Post content exceeds 500 character limit. Thread creation requires the full post system.');
                    if (postButton) {
                        postButton.disabled = false;
                        postButton.textContent = 'Post';
                    }
                    return;
                }

                if (typeof apiCall !== 'function') {
                    alert('Post creation system not available. Please refresh the page.');
                    if (postButton) {
                        postButton.disabled = false;
                        postButton.textContent = 'Post';
                    }
                    return;
                }

                const response = await apiCall('/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: content,
                        tags: ['Public Post']
                    })
                });

                if (response && (response.success || response.ok)) {
                    console.log('✅ Post created successfully (fallback)');
                    this.clearDraft(); // Clear draft on success
                    this.hide();

                    // Prepend new post to feed for instant feedback
                    if (window.myFeedHandlers && window.currentUser) {
                        const post = response.data?.post || response.post || response.data;
                        if (post) {
                            window.myFeedHandlers.prependUserPostToFeed(post, window.currentUser);
                        }
                    }

                    // Refresh feed cache for next load
                    if (window.feedToggle) {
                        window.feedToggle.clearCache();
                    }
                } else {
                    this.saveDraft(content); // Preserve content on error
                    alert('Error creating post. Please try again.');
                    if (postButton) {
                        postButton.disabled = false;
                        postButton.textContent = 'Post';
                    }
                }
            }
        } catch (error) {
            console.error('❌ Post creation error:', error);
            this.saveDraft(content); // Preserve content on error
            alert('Error creating post. Please try again.');
            if (postButton) {
                postButton.disabled = false;
                postButton.textContent = this.threadMode ? `Post Thread (${this.threadChunks?.length || 0})` : 'Post';
            }
        }
    }

    hide() {
        if (!this.modal) return;

        this.modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scroll

        // Clear composer content
        if (this.composerMount) {
            this.composerMount.innerHTML = '';
        }
    }
}

// Event delegation for post modal actions
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-post-modal-action]');
    if (!target) return;

    const action = target.dataset.postModalAction;
    if (action === 'add-media') {
        document.getElementById('modalMediaUpload')?.click();
    }
});

// Initialize
if (typeof window !== 'undefined') {
    window.newPostModal = new NewPostModal();
}

// Export for module use
export default NewPostModal;
