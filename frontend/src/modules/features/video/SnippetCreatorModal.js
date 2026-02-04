/**
 * SnippetCreatorModal - Modal wrapper for video snippet creation
 *
 * Provides a modal interface that wraps the existing VideoUploader component
 * for creating new video snippets.
 *
 * Context-aware publishing:
 * - 'feed' context: Auto-publish video so it appears in feed immediately
 * - 'dashboard' context: Save as draft for manual publishing later
 *
 * @module features/video/SnippetCreatorModal
 */

import { VideoUploader } from './VideoUploader.js';
import { apiCall } from '../../../js/api-compatibility-shim.js';

export class SnippetCreatorModal {
    /**
     * Create a SnippetCreatorModal instance
     */
    constructor() {
        this.modal = null;
        this.uploader = null;
        this.isOpen = false;
        this.context = 'dashboard'; // Default context
    }

    /**
     * Open the snippet creator modal
     * @param {string} context - Context of creation: 'feed' (auto-publish) or 'dashboard' (draft)
     */
    open(context = 'dashboard') {
        if (this.isOpen) {
            return;
        }

        // Store context for post-upload behavior
        this.context = context;

        // Create modal element
        this.modal = document.createElement('div');
        this.modal.id = 'snippetCreatorModal';
        this.modal.className = 'snippet-creator-modal';
        this.modal.innerHTML = `
            <div class="modal-backdrop" data-action="close-snippet-modal"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎬 Create Snippet</h3>
                    <button class="modal-close-btn" data-action="close-snippet-modal" aria-label="Close">×</button>
                </div>
                <div class="modal-body" id="snippetUploaderMount">
                    <!-- VideoUploader will be mounted here -->
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.isOpen = true;

        // Attach event listeners
        this.attachEventListeners();

        // Initialize the video uploader
        this.initUploader();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.isOpen || !this.modal) {
            return;
        }

        // Cleanup uploader
        if (this.uploader && typeof this.uploader.destroy === 'function') {
            this.uploader.destroy();
        }
        this.uploader = null;

        // Remove modal
        this.modal.remove();
        this.modal = null;
        this.isOpen = false;

        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Attach event listeners for modal interactions
     */
    attachEventListeners() {
        if (!this.modal) return;

        // Close on backdrop click
        this.modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            this.close();
        });

        // Close button
        this.modal.querySelector('.modal-close-btn')?.addEventListener('click', () => {
            this.close();
        });

        // Close on ESC key
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escHandler);
    }

    /**
     * Initialize the VideoUploader component
     */
    async initUploader() {
        const mountPoint = document.getElementById('snippetUploaderMount');
        if (!mountPoint) {
            console.error('SnippetCreatorModal: Mount point not found');
            return;
        }

        try {
            this.uploader = new VideoUploader({
                container: mountPoint,
                videoType: 'REEL',
                maxDuration: 180, // 3 minutes max for reels
                maxSize: 500 * 1024 * 1024, // 500MB
                onUploadStart: () => {
                    this.disableClose();
                },
                onUploadProgress: (progress) => {
                    this.updateProgress(progress);
                },
                onUploadComplete: (video) => {
                    this.handleUploadComplete(video);
                },
                onUploadError: (error) => {
                    this.handleUploadError(error);
                },
                onCancel: () => {
                    this.enableClose();
                }
            });
        } catch (error) {
            console.error('SnippetCreatorModal: Failed to initialize uploader:', error);
            mountPoint.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #dc3545;">
                    <p>Failed to load video uploader</p>
                    <button onclick="window.openSnippetCreator()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4169E1; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Disable closing the modal during upload
     */
    disableClose() {
        if (!this.modal) return;

        this.modal.querySelector('.modal-backdrop')?.classList.add('disabled');
        this.modal.querySelector('.modal-close-btn')?.setAttribute('disabled', 'true');
    }

    /**
     * Re-enable closing the modal
     */
    enableClose() {
        if (!this.modal) return;

        this.modal.querySelector('.modal-backdrop')?.classList.remove('disabled');
        this.modal.querySelector('.modal-close-btn')?.removeAttribute('disabled');
    }

    /**
     * Update progress display
     * @param {number} progress - Upload progress 0-100
     */
    updateProgress(progress) {
        // Progress is handled by VideoUploader internally
        console.log('Upload progress:', progress);
    }

    /**
     * Handle successful upload completion
     * Context-aware behavior:
     * - 'feed' context: Auto-publish and refresh feed
     * - 'dashboard' context: Keep as draft and open dashboard
     * @param {Object} video - Uploaded video data
     */
    async handleUploadComplete(video) {
        console.log('Upload complete:', video, 'Context:', this.context);

        // Re-enable close
        this.enableClose();

        // Context-aware post-upload behavior
        if (this.context === 'feed') {
            // Auto-publish the video for immediate feed visibility
            try {
                const publishResponse = await apiCall(`/videos/${video.id}/publish`, {
                    method: 'PATCH'
                });

                if (publishResponse?.success || publishResponse?.ok) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('Snippet published! It now appears in the feed.');
                    }

                    // Close modal
                    this.close();

                    // Refresh the snippets feed to show the new video
                    if (window.feedToggle && typeof window.feedToggle.loadFeed === 'function') {
                        window.feedToggle.clearCache('snippets');
                        await window.feedToggle.loadFeed('snippets', true);
                    }
                } else {
                    // Publish failed, but video was uploaded as draft
                    console.warn('Auto-publish failed, video saved as draft:', publishResponse);
                    if (typeof window.showToast === 'function') {
                        window.showToast('Snippet saved as draft. You can publish it from the dashboard.');
                    }
                    this.close();
                    if (typeof window.openSnippetsDashboard === 'function') {
                        window.openSnippetsDashboard();
                    }
                }
            } catch (error) {
                console.error('Failed to auto-publish video:', error);
                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet saved as draft. You can publish it from the dashboard.');
                }
                this.close();
                if (typeof window.openSnippetsDashboard === 'function') {
                    window.openSnippetsDashboard();
                }
            }
        } else {
            // Dashboard context: Keep as draft, notify existing dashboard to refresh
            if (typeof window.showToast === 'function') {
                window.showToast('Snippet created! You can find it in your Snippets dashboard.');
            }

            // Close modal after brief delay, then refresh dashboard
            setTimeout(() => {
                this.close();

                // Open/refresh snippets dashboard (handles both init and data refresh)
                if (typeof window.openSnippetsDashboard === 'function') {
                    window.openSnippetsDashboard();
                }
            }, 1500);
        }
    }

    /**
     * Handle upload error
     * @param {Error} error - Upload error
     */
    handleUploadError(error) {
        console.error('Upload error:', error);

        // Show error message
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to upload video. Please try again.');
        }

        // Re-enable close
        this.enableClose();
    }

    /**
     * Destroy the modal and cleanup
     */
    destroy() {
        // Remove ESC handler
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }

        // Close if open
        this.close();
    }
}

// Export default
export default SnippetCreatorModal;
