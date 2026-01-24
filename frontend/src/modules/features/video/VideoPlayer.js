/**
 * VideoPlayer - HLS.js based adaptive video player
 *
 * Features:
 * - HLS adaptive streaming support
 * - MP4 fallback for Safari/older browsers
 * - Aspect-ratio-aware container
 * - Play/pause, volume, fullscreen controls
 * - Thumbnail/poster display
 * - Auto-play when visible (IntersectionObserver)
 * - Pause when scrolled away
 *
 * @module VideoPlayer
 */

// HLS.js is loaded via CDN, check if available
const HLS_AVAILABLE = typeof Hls !== 'undefined';

/**
 * VideoPlayer class for HLS video playback
 */
export class VideoPlayer {
    /**
     * Create a VideoPlayer instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {string} options.hlsUrl - HLS manifest URL (.m3u8)
     * @param {string} options.mp4Url - MP4 fallback URL
     * @param {string} options.thumbnailUrl - Poster/thumbnail image URL
     * @param {string} options.aspectRatio - Aspect ratio (VERTICAL_9_16, HORIZONTAL_16_9, etc.)
     * @param {boolean} options.autoplay - Auto-play when visible
     * @param {boolean} options.muted - Start muted
     * @param {boolean} options.loop - Loop video
     * @param {Function} options.onPlay - Play event callback
     * @param {Function} options.onPause - Pause event callback
     * @param {Function} options.onEnded - Ended event callback
     * @param {Function} options.onError - Error event callback
     */
    constructor(options) {
        this.container = options.container;
        this.hlsUrl = options.hlsUrl;
        this.mp4Url = options.mp4Url;
        this.thumbnailUrl = options.thumbnailUrl;
        this.aspectRatio = options.aspectRatio || 'HORIZONTAL_16_9';
        this.autoplay = options.autoplay !== false;
        this.muted = options.muted !== false;
        this.loop = options.loop || false;
        this.onPlay = options.onPlay || (() => {});
        this.onPause = options.onPause || (() => {});
        this.onEnded = options.onEnded || (() => {});
        this.onError = options.onError || (() => {});

        this.hls = null;
        this.videoEl = null;
        this.observer = null;
        this.isPlaying = false;

        this.init();
    }

    /**
     * Initialize the player
     */
    init() {
        if (!this.container) return;

        this.container.innerHTML = this.renderHTML();
        this.videoEl = this.container.querySelector('video');

        this.setupSource();
        this.bindEvents();

        if (this.autoplay) {
            this.setupVisibilityObserver();
        }
    }

    /**
     * Render player HTML
     * @returns {string} HTML string
     */
    renderHTML() {
        const aspectClass = this.getAspectClass();

        return `
            <div class="video-player ${aspectClass}">
                <video
                    class="video-player__video"
                    playsinline
                    ${this.muted ? 'muted' : ''}
                    ${this.loop ? 'loop' : ''}
                    ${this.thumbnailUrl ? `poster="${this.thumbnailUrl}"` : ''}
                    preload="metadata"
                ></video>

                <!-- Play Button Overlay -->
                <div class="video-player__overlay" id="playOverlay">
                    <button class="video-player__play-btn" id="playButton">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5,3 19,12 5,21"/>
                        </svg>
                    </button>
                </div>

                <!-- Controls -->
                <div class="video-player__controls" id="controls">
                    <button class="video-player__btn" id="playPauseBtn">
                        <svg class="video-player__icon-play" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5,3 19,12 5,21"/>
                        </svg>
                        <svg class="video-player__icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
                            <rect x="6" y="4" width="4" height="16"/>
                            <rect x="14" y="4" width="4" height="16"/>
                        </svg>
                    </button>

                    <div class="video-player__progress" id="progressContainer">
                        <div class="video-player__progress-bar" id="progressBar"></div>
                    </div>

                    <button class="video-player__btn" id="muteBtn">
                        <svg class="video-player__icon-volume" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                        <svg class="video-player__icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            <line x1="23" y1="9" x2="17" y2="15"/>
                            <line x1="17" y1="9" x2="23" y2="15"/>
                        </svg>
                    </button>

                    <button class="video-player__btn" id="fullscreenBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 3 21 3 21 9"/>
                            <polyline points="9 21 3 21 3 15"/>
                            <line x1="21" y1="3" x2="14" y2="10"/>
                            <line x1="3" y1="21" x2="10" y2="14"/>
                        </svg>
                    </button>
                </div>

                <!-- Loading Spinner -->
                <div class="video-player__loading" id="loading" style="display:none;">
                    <div class="video-player__spinner"></div>
                </div>
            </div>
        `;
    }

    /**
     * Get CSS class for aspect ratio
     * @returns {string} CSS class
     */
    getAspectClass() {
        const aspectClasses = {
            'VERTICAL_9_16': 'video-player--vertical',
            'PORTRAIT_4_5': 'video-player--portrait',
            'SQUARE_1_1': 'video-player--square',
            'HORIZONTAL_16_9': 'video-player--horizontal'
        };
        return aspectClasses[this.aspectRatio] || 'video-player--horizontal';
    }

    /**
     * Setup video source (HLS or MP4)
     */
    setupSource() {
        if (this.hlsUrl && HLS_AVAILABLE && Hls.isSupported()) {
            // Use HLS.js for adaptive streaming
            this.hls = new Hls({
                startLevel: -1, // Auto quality
                capLevelToPlayerSize: true
            });

            this.hls.loadSource(this.hlsUrl);
            this.hls.attachMedia(this.videoEl);

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    this.handleError('HLS error: ' + data.type);
                }
            });

        } else if (this.hlsUrl && this.videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            this.videoEl.src = this.hlsUrl;

        } else if (this.mp4Url) {
            // MP4 fallback
            this.videoEl.src = this.mp4Url;

        } else {
            this.handleError('No playable video source');
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const playOverlay = this.container.querySelector('#playOverlay');
        const playButton = this.container.querySelector('#playButton');
        const playPauseBtn = this.container.querySelector('#playPauseBtn');
        const muteBtn = this.container.querySelector('#muteBtn');
        const fullscreenBtn = this.container.querySelector('#fullscreenBtn');
        const progressContainer = this.container.querySelector('#progressContainer');

        // Play overlay click
        playOverlay.addEventListener('click', () => this.togglePlay());
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay();
        });

        // Control buttons
        playPauseBtn.addEventListener('click', () => this.togglePlay());
        muteBtn.addEventListener('click', () => this.toggleMute());
        fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Progress bar click
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seekTo(percent);
        });

        // Video events
        this.videoEl.addEventListener('play', () => this.handlePlay());
        this.videoEl.addEventListener('pause', () => this.handlePause());
        this.videoEl.addEventListener('ended', () => this.handleEnded());
        this.videoEl.addEventListener('timeupdate', () => this.updateProgress());
        this.videoEl.addEventListener('waiting', () => this.showLoading(true));
        this.videoEl.addEventListener('playing', () => this.showLoading(false));
        this.videoEl.addEventListener('error', () => this.handleError('Video playback error'));

        // Click video to toggle play (for non-overlay clicks)
        this.videoEl.addEventListener('click', () => this.togglePlay());
    }

    /**
     * Setup IntersectionObserver for auto-play
     */
    setupVisibilityObserver() {
        if (!('IntersectionObserver' in window)) return;

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    this.play();
                } else {
                    this.pause();
                }
            });
        }, { threshold: 0.5 });

        this.observer.observe(this.container);
    }

    /**
     * Play video
     */
    async play() {
        try {
            await this.videoEl.play();
        } catch (error) {
            // Auto-play blocked, show play button
            this.container.querySelector('#playOverlay').style.display = 'flex';
        }
    }

    /**
     * Pause video
     */
    pause() {
        this.videoEl.pause();
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.videoEl.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.videoEl.muted = !this.videoEl.muted;
        this.updateMuteButton();
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.container.requestFullscreen();
        }
    }

    /**
     * Seek to position
     * @param {number} percent - Position (0-1)
     */
    seekTo(percent) {
        this.videoEl.currentTime = this.videoEl.duration * percent;
    }

    /**
     * Handle play event
     */
    handlePlay() {
        this.isPlaying = true;
        this.container.querySelector('#playOverlay').style.display = 'none';
        this.updatePlayPauseButton();
        this.onPlay();
    }

    /**
     * Handle pause event
     */
    handlePause() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.onPause();
    }

    /**
     * Handle ended event
     */
    handleEnded() {
        this.isPlaying = false;
        this.container.querySelector('#playOverlay').style.display = 'flex';
        this.updatePlayPauseButton();
        this.onEnded();
    }

    /**
     * Handle error
     * @param {string} message - Error message
     */
    handleError(message) {
        console.error('VideoPlayer error:', message);
        this.onError(new Error(message));
    }

    /**
     * Update progress bar
     */
    updateProgress() {
        const percent = (this.videoEl.currentTime / this.videoEl.duration) * 100;
        this.container.querySelector('#progressBar').style.width = `${percent}%`;
    }

    /**
     * Update play/pause button state
     */
    updatePlayPauseButton() {
        const playIcon = this.container.querySelector('.video-player__icon-play');
        const pauseIcon = this.container.querySelector('.video-player__icon-pause');

        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    /**
     * Update mute button state
     */
    updateMuteButton() {
        const volumeIcon = this.container.querySelector('.video-player__icon-volume');
        const mutedIcon = this.container.querySelector('.video-player__icon-muted');

        if (this.videoEl.muted) {
            volumeIcon.style.display = 'none';
            mutedIcon.style.display = 'block';
        } else {
            volumeIcon.style.display = 'block';
            mutedIcon.style.display = 'none';
        }
    }

    /**
     * Show/hide loading spinner
     * @param {boolean} show - Show or hide
     */
    showLoading(show) {
        this.container.querySelector('#loading').style.display = show ? 'flex' : 'none';
    }

    /**
     * Destroy the player
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }

        if (this.hls) {
            this.hls.destroy();
        }

        if (this.videoEl) {
            this.videoEl.pause();
            this.videoEl.src = '';
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for module usage
export default VideoPlayer;
