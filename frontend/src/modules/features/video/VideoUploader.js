/**
 * VideoUploader - Video upload component with progress tracking
 *
 * Features:
 * - Drag-and-drop or file picker
 * - Progress bar for upload
 * - Preview before upload
 * - Client-side validation (size, duration, format)
 * - Caption input with hashtag detection
 * - Chunked upload support for large files
 *
 * @module VideoUploader
 */

import { apiClient } from '../../core/api/client.js';

// Configuration
const VIDEO_CONFIG = {
    maxSize: 500 * 1024 * 1024, // 500MB
    maxDuration: 180, // 3 minutes in seconds
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov']
};

/**
 * VideoUploader class for handling video uploads
 */
export class VideoUploader {
    /**
     * Create a VideoUploader instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {string} options.videoType - 'REEL' or 'POST_ATTACHMENT'
     * @param {Function} options.onUploadComplete - Callback on successful upload
     * @param {Function} options.onUploadError - Callback on upload error
     * @param {Function} options.onProgress - Progress callback (0-100)
     */
    constructor(options) {
        this.container = options.container;
        this.videoType = options.videoType || 'REEL';
        this.onUploadComplete = options.onUploadComplete || (() => {});
        this.onUploadError = options.onUploadError || (() => {});
        this.onProgress = options.onProgress || (() => {});

        this.selectedFile = null;
        this.videoPreviewUrl = null;
        this.isUploading = false;

        this.init();
    }

    /**
     * Initialize the uploader UI
     */
    init() {
        if (!this.container) return;

        this.container.innerHTML = this.renderHTML();
        this.bindEvents();
    }

    /**
     * Render the uploader HTML
     * @returns {string} HTML string
     */
    renderHTML() {
        return `
            <div class="video-uploader">
                <!-- Drop Zone -->
                <div class="video-uploader__dropzone" id="videoDropzone">
                    <div class="video-uploader__dropzone-content">
                        <svg class="video-uploader__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <p class="video-uploader__text">Drag & drop video here or click to browse</p>
                        <p class="video-uploader__subtext">MP4, WebM, MOV - Max ${VIDEO_CONFIG.maxSize / (1024 * 1024)}MB, ${VIDEO_CONFIG.maxDuration / 60} minutes</p>
                    </div>
                    <input type="file" id="videoFileInput" accept="${VIDEO_CONFIG.allowedTypes.join(',')}" hidden>
                </div>

                <!-- Preview Section (hidden initially) -->
                <div class="video-uploader__preview" id="videoPreview" style="display: none;">
                    <video id="videoPreviewPlayer" controls muted playsinline></video>
                    <button class="video-uploader__remove" id="removeVideo" title="Remove video">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <!-- Caption Input -->
                <div class="video-uploader__caption" id="captionSection" style="display: none;">
                    <textarea
                        id="videoCaption"
                        placeholder="Add a caption... Use #hashtags for discovery"
                        maxlength="2200"
                        rows="3"
                    ></textarea>
                    <div class="video-uploader__caption-meta">
                        <span id="captionCount">0/2200</span>
                        <span id="hashtagCount">0 hashtags</span>
                    </div>
                </div>

                <!-- Progress Bar (hidden initially) -->
                <div class="video-uploader__progress" id="uploadProgress" style="display: none;">
                    <div class="video-uploader__progress-bar" id="progressBar"></div>
                    <span class="video-uploader__progress-text" id="progressText">0%</span>
                </div>

                <!-- Upload Button -->
                <button class="video-uploader__submit" id="uploadButton" disabled>
                    Upload Video
                </button>

                <!-- Error Message -->
                <div class="video-uploader__error" id="uploadError" style="display: none;"></div>
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const dropzone = this.container.querySelector('#videoDropzone');
        const fileInput = this.container.querySelector('#videoFileInput');
        const removeBtn = this.container.querySelector('#removeVideo');
        const uploadBtn = this.container.querySelector('#uploadButton');
        const captionInput = this.container.querySelector('#videoCaption');

        // Dropzone events
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('video-uploader__dropzone--dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('video-uploader__dropzone--dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('video-uploader__dropzone--dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileSelect(file);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileSelect(file);
        });

        // Remove video
        removeBtn.addEventListener('click', () => this.clearSelection());

        // Upload button
        uploadBtn.addEventListener('click', () => this.upload());

        // Caption input
        captionInput.addEventListener('input', () => this.updateCaptionCount());
    }

    /**
     * Handle file selection
     * @param {File} file - Selected file
     */
    async handleFileSelect(file) {
        // Reset error
        this.showError(null);

        // Validate file type
        if (!VIDEO_CONFIG.allowedTypes.includes(file.type)) {
            this.showError(`Invalid file type. Allowed: ${VIDEO_CONFIG.allowedExtensions.join(', ')}`);
            return;
        }

        // Validate file size
        if (file.size > VIDEO_CONFIG.maxSize) {
            this.showError(`File too large. Maximum size: ${VIDEO_CONFIG.maxSize / (1024 * 1024)}MB`);
            return;
        }

        // Create preview
        this.selectedFile = file;
        this.videoPreviewUrl = URL.createObjectURL(file);

        const previewSection = this.container.querySelector('#videoPreview');
        const dropzone = this.container.querySelector('#videoDropzone');
        const captionSection = this.container.querySelector('#captionSection');
        const uploadBtn = this.container.querySelector('#uploadButton');
        const videoPlayer = this.container.querySelector('#videoPreviewPlayer');

        videoPlayer.src = this.videoPreviewUrl;

        // Validate duration when metadata loads
        videoPlayer.addEventListener('loadedmetadata', () => {
            if (videoPlayer.duration > VIDEO_CONFIG.maxDuration) {
                this.showError(`Video too long. Maximum duration: ${VIDEO_CONFIG.maxDuration / 60} minutes`);
                this.clearSelection();
                return;
            }
        }, { once: true });

        dropzone.style.display = 'none';
        previewSection.style.display = 'block';
        captionSection.style.display = 'block';
        uploadBtn.disabled = false;
    }

    /**
     * Clear file selection
     */
    clearSelection() {
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }

        this.selectedFile = null;
        this.videoPreviewUrl = null;

        const previewSection = this.container.querySelector('#videoPreview');
        const dropzone = this.container.querySelector('#videoDropzone');
        const captionSection = this.container.querySelector('#captionSection');
        const uploadBtn = this.container.querySelector('#uploadButton');
        const videoPlayer = this.container.querySelector('#videoPreviewPlayer');
        const fileInput = this.container.querySelector('#videoFileInput');

        videoPlayer.src = '';
        fileInput.value = '';

        dropzone.style.display = 'block';
        previewSection.style.display = 'none';
        captionSection.style.display = 'none';
        uploadBtn.disabled = true;
    }

    /**
     * Update caption character count
     */
    updateCaptionCount() {
        const captionInput = this.container.querySelector('#videoCaption');
        const countDisplay = this.container.querySelector('#captionCount');
        const hashtagDisplay = this.container.querySelector('#hashtagCount');

        const text = captionInput.value;
        countDisplay.textContent = `${text.length}/2200`;

        // Count hashtags
        const hashtags = text.match(/#[\w]+/g) || [];
        hashtagDisplay.textContent = `${hashtags.length} hashtag${hashtags.length !== 1 ? 's' : ''}`;
    }

    /**
     * Upload the video
     */
    async upload() {
        if (!this.selectedFile || this.isUploading) return;

        this.isUploading = true;
        const uploadBtn = this.container.querySelector('#uploadButton');
        const progressSection = this.container.querySelector('#uploadProgress');
        const progressBar = this.container.querySelector('#progressBar');
        const progressText = this.container.querySelector('#progressText');

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        progressSection.style.display = 'block';

        try {
            const caption = this.container.querySelector('#videoCaption').value;

            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('videoType', this.videoType);
            if (caption) {
                formData.append('caption', caption);
            }

            // Upload with progress tracking
            const response = await this.uploadWithProgress(formData, (progress) => {
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
                this.onProgress(progress);
            });

            if (response.success) {
                this.onUploadComplete(response.video);
                this.clearSelection();
                progressSection.style.display = 'none';
            } else {
                throw new Error(response.error || 'Upload failed');
            }

        } catch (error) {
            this.showError(error.message);
            this.onUploadError(error);
        } finally {
            this.isUploading = false;
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload Video';
        }
    }

    /**
     * Upload with progress tracking
     * @param {FormData} formData - Form data to upload
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Upload response
     */
    uploadWithProgress(formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    onProgress(progress);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        resolve({ success: true });
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error || `Upload failed: ${xhr.status}`));
                    } catch {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));
            xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

            xhr.open('POST', window.API_CONFIG.url('videos/upload'));
            xhr.withCredentials = true;

            // Add CSRF token for cross-origin POST request
            const csrfToken = window.csrfToken || document.cookie.match(/csrf-token(?:_dev)?=([^;]+)/)?.[1];
            if (csrfToken) {
                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
            }

            xhr.send(formData);
        });
    }

    /**
     * Show error message
     * @param {string|null} message - Error message or null to clear
     */
    showError(message) {
        const errorEl = this.container.querySelector('#uploadError');
        if (message) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        } else {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    /**
     * Destroy the uploader
     */
    destroy() {
        this.clearSelection();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for module usage
export default VideoUploader;
