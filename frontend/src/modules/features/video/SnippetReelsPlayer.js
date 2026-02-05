/**
 * SnippetReelsPlayer - Fullscreen vertical reels player for video snippets
 *
 * A standalone class for displaying video snippets in a TikTok-style vertical scrolling
 * reels interface. Used by both SnippetsDashboard and feed navigation.
 *
 * @module SnippetReelsPlayer
 */

import { VideoPlayer } from './VideoPlayer.js';

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Map aspect ratio enum to CSS class suffix
 * @param {string} aspectRatio - Aspect ratio string (e.g., 'VERTICAL_9_16')
 * @returns {string} CSS class suffix (e.g., 'vertical')
 */
function getAspectClass(aspectRatio) {
    const map = {
        'VERTICAL_9_16': 'vertical',
        'PORTRAIT_4_5': 'portrait',
        'SQUARE_1_1': 'square',
        'HORIZONTAL_16_9': 'horizontal'
    };
    return map[aspectRatio] || 'vertical';
}

/**
 * SnippetReelsPlayer class
 *
 * Opens a fullscreen reels overlay with vertical scroll-snap navigation.
 * Implements lazy loading, IntersectionObserver-based autoplay, and
 * touch velocity damping for precise scroll control.
 */
export class SnippetReelsPlayer {
    /**
     * Create a SnippetReelsPlayer instance
     * @param {Object} options - Configuration options
     * @param {Array} options.snippets - Array of snippet objects with video data
     * @param {string} options.startVideoId - ID of the video to start at
     * @param {Function} [options.onClose] - Callback when reels overlay is closed
     */
    constructor({ snippets, startVideoId, onClose }) {
        this.snippets = snippets || [];
        this.startVideoId = startVideoId;
        this.onClose = onClose;

        /** @type {Map<string, VideoPlayer>} */
        this.players = new Map();
        /** @type {IntersectionObserver|null} */
        this.observer = null;
        /** @type {HTMLElement|null} */
        this.overlay = null;
        /** @type {string|null} */
        this.currentlyPlaying = null;
        /** @type {Function|null} */
        this.escHandler = null;

        // Touch tracking for velocity damping
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isTouchScrolling = false;
    }

    /**
     * Open the reels overlay and start playback
     */
    open() {
        const startIndex = this.snippets.findIndex(s => s.id === this.startVideoId);
        if (startIndex === -1) {
            console.warn('SnippetReelsPlayer: Start video not found in snippets');
            return;
        }

        // Validate the target has playable content
        const target = this.snippets[startIndex];
        if (!target.hlsManifestUrl && !target.mp4Url && !target.originalUrl) {
            console.warn('SnippetReelsPlayer: Target video is still encoding');
            return;
        }

        this.createOverlay(startIndex);
        this.setupObserver();
        this.setupTouchHandlers();
        this.setupKeyboardHandler();

        // Scroll to start video
        const startItem = this.overlay.querySelector(`[data-index="${startIndex}"]`);
        if (startItem) {
            startItem.scrollIntoView({ behavior: 'instant' });
        }

        // Load initial videos
        this.ensurePlayerLoaded(startIndex);
        this.ensurePlayerLoaded(startIndex + 1);
        this.ensurePlayerLoaded(startIndex + 2);
    }

    /**
     * Create the fullscreen overlay DOM
     * @param {number} startIndex - Index of starting video
     * @private
     */
    createOverlay(startIndex) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'snippets-reels-overlay';

        const itemsHtml = this.snippets.map((snippet, i) => {
            const aspectClass = getAspectClass(snippet.aspectRatio);
            const captionHtml = snippet.caption
                ? `<div class="snippets-reels-caption"><p>${escapeHtml(snippet.caption)}</p></div>`
                : '';

            return `
                <div class="snippets-reels-item" data-index="${i}" data-video-id="${snippet.id}">
                    <div class="snippets-reels-video reels-video--${aspectClass}" id="reelsPlayer-${snippet.id}"></div>
                    ${captionHtml}
                </div>
            `;
        }).join('');

        this.overlay.innerHTML = `
            <button class="snippets-reels-close">&times;</button>
            <div class="snippets-reels-container">
                ${itemsHtml}
            </div>
        `;

        document.body.appendChild(this.overlay);
        document.body.style.overflow = 'hidden';

        // Close button handler
        this.overlay.querySelector('.snippets-reels-close').addEventListener('click', () => {
            this.close();
        });
    }

    /**
     * Set up IntersectionObserver for autoplay and lazy loading
     * @private
     */
    setupObserver() {
        const scrollContainer = this.overlay.querySelector('.snippets-reels-container');

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const vid = entry.target.dataset.videoId;
                const visibleIndex = parseInt(entry.target.dataset.index);

                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    // Pre-load next 2 ahead
                    this.ensurePlayerLoaded(visibleIndex + 1);
                    this.ensurePlayerLoaded(visibleIndex + 2);

                    if (vid !== this.currentlyPlaying) {
                        // Pause old player
                        const oldPlayer = this.players.get(this.currentlyPlaying);
                        if (oldPlayer) oldPlayer.pause();

                        // Ensure new player loaded, then play
                        this.ensurePlayerLoaded(visibleIndex);
                        const newPlayer = this.players.get(vid);
                        if (newPlayer) {
                            newPlayer.whenReady().then(() => {
                                newPlayer.play();
                            });
                        }
                        this.currentlyPlaying = vid;
                    }
                }
            });
        }, { root: scrollContainer, threshold: 0.5 });

        this.overlay.querySelectorAll('.snippets-reels-item').forEach(item => {
            this.observer.observe(item);
        });
    }

    /**
     * Set up touch handlers for velocity-damped scrolling
     * @private
     */
    setupTouchHandlers() {
        const scrollContainer = this.overlay.querySelector('.snippets-reels-container');

        scrollContainer.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
            this.touchStartTime = Date.now();
            this.isTouchScrolling = true;
        }, { passive: true });

        scrollContainer.addEventListener('touchend', (e) => {
            if (!this.isTouchScrolling) return;
            this.isTouchScrolling = false;

            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();

            const deltaY = this.touchStartY - touchEndY;
            const deltaTime = touchEndTime - this.touchStartTime;

            // Calculate velocity (pixels per millisecond)
            const velocity = Math.abs(deltaY) / deltaTime;

            // Thresholds for velocity control
            const minDistance = 50; // Minimum swipe distance
            const velocityThreshold = 0.8; // pixels/ms - fast swipe threshold

            // If fast swipe, programmatically scroll to exactly one item
            if (Math.abs(deltaY) > minDistance && velocity > velocityThreshold) {
                const direction = deltaY > 0 ? 1 : -1; // 1 = down (next), -1 = up (prev)
                const currentItem = this.overlay.querySelector('.snippets-reels-item[data-video-id="' + this.currentlyPlaying + '"]');
                if (currentItem) {
                    const currentIndex = parseInt(currentItem.dataset.index);
                    const targetIndex = Math.max(0, Math.min(this.snippets.length - 1, currentIndex + direction));
                    const targetItem = this.overlay.querySelector(`[data-index="${targetIndex}"]`);
                    if (targetItem && targetIndex !== currentIndex) {
                        // Smooth scroll to exactly one item in the swipe direction
                        targetItem.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        }, { passive: true });
    }

    /**
     * Set up keyboard handler for Escape key
     * @private
     */
    setupKeyboardHandler() {
        this.escHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.escHandler);
    }

    /**
     * Create a VideoPlayer for a specific index if not already loaded
     * @param {number} index - Index in snippets array
     * @private
     */
    ensurePlayerLoaded(index) {
        if (index < 0 || index >= this.snippets.length) return;

        const snippet = this.snippets[index];
        if (this.players.has(snippet.id)) return;
        if (!snippet.hlsManifestUrl && !snippet.mp4Url && !snippet.originalUrl) return;

        const container = document.getElementById(`reelsPlayer-${snippet.id}`);
        if (!container) return;

        const player = new VideoPlayer({
            container,
            hlsUrl: snippet.hlsManifestUrl,
            mp4Url: snippet.mp4Url || snippet.originalUrl,
            thumbnailUrl: snippet.thumbnailUrl,
            aspectRatio: snippet.aspectRatio,
            autoplay: false,
            muted: true,
            loop: true
        });
        this.players.set(snippet.id, player);

        // Hide play overlay in reels mode (playback is auto-managed)
        const playOverlay = container.querySelector('#playOverlay');
        if (playOverlay) playOverlay.style.display = 'none';
    }

    /**
     * Close the reels overlay and clean up resources
     */
    close() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        this.players.forEach(p => p.destroy());
        this.players.clear();

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        document.body.style.overflow = '';

        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }

        if (typeof this.onClose === 'function') {
            this.onClose();
        }
    }
}

export default SnippetReelsPlayer;
