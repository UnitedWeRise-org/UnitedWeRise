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

        // Create inline composer HTML (minimal version)
        const composerHTML = `
            <div class="quick-post-composer" style="width: 100%;">
                <textarea id="modalPostContent" placeholder="What's on your mind?" style="width: 100%; min-height: 120px; border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-family: inherit; font-size: 14px; resize: vertical; box-sizing: border-box; margin-bottom: 12px;"></textarea>
                <div style="text-align: right; margin-bottom: 8px;">
                    <span id="modalPostCharCount" style="font-size: 0.85rem; color: #6c757d; display: none;">0/5000</span>
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

        // Character counter
        if (textarea && charCount) {
            const updateCharCount = () => {
                const length = textarea.value.length;
                if (length >= 4900) {
                    charCount.style.display = 'inline';
                    charCount.textContent = `${length}/5000`;
                    charCount.style.color = length > 5000 ? '#dc3545' : '#ffc107';
                } else {
                    charCount.style.display = 'none';
                }
            };

            textarea.addEventListener('input', updateCharCount);
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

    async createPost() {
        const textarea = document.getElementById('modalPostContent');
        const content = textarea ? textarea.value.trim() : '';

        if (!content) {
            alert('Please enter some content for your post.');
            return;
        }

        if (content.length > 5000) {
            alert('Post content exceeds 5000 character limit.');
            return;
        }

        console.log('🎯 Creating post from modal...');

        // Use UnifiedPostCreator if available
        if (window.unifiedPostCreator) {
            const result = await window.unifiedPostCreator.create({
                type: 'post',
                textareaId: 'modalPostContent',
                mediaInputId: 'modalMediaUpload',
                destination: 'feed',
                tags: ['Public Post'],
                clearAfterSuccess: true,
                onSuccess: (result) => {
                    console.log('✅ Post created successfully from modal');
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
                    alert(error.error || 'Error creating post. Please try again.');
                }
            });
        } else {
            // Fallback: Direct API call
            try {
                if (typeof apiCall !== 'function') {
                    alert('Post creation system not available. Please refresh the page.');
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
                    alert('Error creating post. Please try again.');
                }
            } catch (error) {
                console.error('❌ Post creation error:', error);
                alert('Error creating post. Please try again.');
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
