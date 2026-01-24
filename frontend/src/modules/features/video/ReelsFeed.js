/**
 * ReelsFeed - TikTok-style full-screen vertical video feed
 *
 * Features:
 * - Full-screen vertical swipe navigation
 * - Auto-play video when visible
 * - Pause when scrolled away
 * - Like, comment, share overlays
 * - Creator info display
 * - Infinite scroll pagination
 *
 * @module ReelsFeed
 */

import { apiClient } from '../../core/api/client.js';
import { VideoPlayer } from './VideoPlayer.js';

/**
 * ReelsFeed class for TikTok-style video browsing
 */
export class ReelsFeed {
    /**
     * Create a ReelsFeed instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {Function} options.onVideoView - Callback when video is viewed
     * @param {Function} options.onLike - Like button callback
     * @param {Function} options.onComment - Comment button callback
     * @param {Function} options.onShare - Share button callback
     */
    constructor(options) {
        this.container = options.container;
        this.onVideoView = options.onVideoView || (() => {});
        this.onLike = options.onLike || (() => {});
        this.onComment = options.onComment || (() => {});
        this.onShare = options.onShare || (() => {});

        this.videos = [];
        this.currentIndex = 0;
        this.players = new Map();
        this.cursor = null;
        this.isLoading = false;
        this.hasMore = true;

        this.init();
    }

    /**
     * Initialize the feed
     */
    async init() {
        if (!this.container) return;

        this.container.innerHTML = this.renderShell();
        this.bindEvents();

        // Load initial videos
        await this.loadVideos();
    }

    /**
     * Render feed shell HTML
     * @returns {string} HTML string
     */
    renderShell() {
        return `
            <div class="reels-feed">
                <div class="reels-feed__container" id="reelsContainer"></div>

                <!-- Loading Indicator -->
                <div class="reels-feed__loading" id="feedLoading">
                    <div class="reels-feed__spinner"></div>
                </div>

                <!-- Empty State -->
                <div class="reels-feed__empty" id="feedEmpty" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                        <line x1="7" y1="2" x2="7" y2="22"/>
                        <line x1="17" y1="2" x2="17" y2="22"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <line x1="2" y1="7" x2="7" y2="7"/>
                        <line x1="2" y1="17" x2="7" y2="17"/>
                        <line x1="17" y1="17" x2="22" y2="17"/>
                        <line x1="17" y1="7" x2="22" y2="7"/>
                    </svg>
                    <h3>No videos yet</h3>
                    <p>Be the first to share a video!</p>
                </div>
            </div>
        `;
    }

    /**
     * Render a single reel item
     * @param {Object} video - Video data
     * @param {number} index - Video index
     * @returns {string} HTML string
     */
    renderReelItem(video, index) {
        return `
            <div class="reels-feed__item" data-video-id="${video.id}" data-index="${index}">
                <!-- Video Container -->
                <div class="reels-feed__video" id="video-${video.id}"></div>

                <!-- Overlay: Creator Info -->
                <div class="reels-feed__info">
                    <a href="/profile/${video.user.username}" class="reels-feed__user">
                        <img
                            class="reels-feed__avatar"
                            src="${video.user.avatar || '/images/default-avatar.png'}"
                            alt="${video.user.displayName || video.user.username}"
                        >
                        <span class="reels-feed__username">
                            @${video.user.username}
                            ${video.user.verified ? '<svg class="reels-feed__verified" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' : ''}
                        </span>
                    </a>
                    ${video.caption ? `<p class="reels-feed__caption">${this.formatCaption(video.caption)}</p>` : ''}
                </div>

                <!-- Overlay: Action Buttons -->
                <div class="reels-feed__actions">
                    <button class="reels-feed__action" data-action="like" data-video-id="${video.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span>${this.formatCount(video.likeCount)}</span>
                    </button>

                    <button class="reels-feed__action" data-action="comment" data-video-id="${video.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span>${this.formatCount(video.commentCount)}</span>
                    </button>

                    <button class="reels-feed__action" data-action="share" data-video-id="${video.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        <span>${this.formatCount(video.shareCount)}</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const container = this.container.querySelector('#reelsContainer');

        // Scroll/swipe handling
        container.addEventListener('scroll', () => this.handleScroll());

        // Touch swipe handling for mobile
        let touchStartY = 0;
        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;

            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.nextVideo();
                } else {
                    this.prevVideo();
                }
            }
        }, { passive: true });

        // Action button clicks
        container.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                const videoId = actionBtn.dataset.videoId;

                switch (action) {
                    case 'like':
                        this.onLike(videoId);
                        break;
                    case 'comment':
                        this.onComment(videoId);
                        break;
                    case 'share':
                        this.onShare(videoId);
                        break;
                }
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible()) return;

            if (e.key === 'ArrowDown' || e.key === 'j') {
                this.nextVideo();
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                this.prevVideo();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.toggleCurrentVideo();
            }
        });
    }

    /**
     * Load videos from API
     */
    async loadVideos() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            const params = new URLSearchParams({ limit: '10' });
            if (this.cursor) {
                params.append('cursor', this.cursor);
            }

            const response = await apiClient.get(`/videos/feed?${params}`);

            if (response.success && response.videos) {
                this.hasMore = !!response.nextCursor;
                this.cursor = response.nextCursor;

                // Append videos
                const container = this.container.querySelector('#reelsContainer');
                const startIndex = this.videos.length;

                response.videos.forEach((video, i) => {
                    this.videos.push(video);
                    container.insertAdjacentHTML('beforeend', this.renderReelItem(video, startIndex + i));
                });

                // Initialize players for new videos
                response.videos.forEach((video) => {
                    this.initializePlayer(video);
                });

                // Show empty state if no videos
                if (this.videos.length === 0) {
                    this.container.querySelector('#feedEmpty').style.display = 'flex';
                }
            }

        } catch (error) {
            console.error('Failed to load videos:', error);
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * Initialize video player for a video
     * @param {Object} video - Video data
     */
    initializePlayer(video) {
        const container = this.container.querySelector(`#video-${video.id}`);
        if (!container) return;

        const player = new VideoPlayer({
            container,
            hlsUrl: video.hlsManifestUrl,
            mp4Url: video.mp4Url,
            thumbnailUrl: video.thumbnailUrl,
            aspectRatio: video.aspectRatio,
            autoplay: false, // We control autoplay
            muted: true,
            loop: true,
            onPlay: () => this.recordView(video.id)
        });

        this.players.set(video.id, player);
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        const container = this.container.querySelector('#reelsContainer');
        const items = container.querySelectorAll('.reels-feed__item');
        const containerRect = container.getBoundingClientRect();

        // Find the most visible item
        let maxVisibility = 0;
        let mostVisibleIndex = this.currentIndex;

        items.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const visibility = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top);
            const ratio = visibility / rect.height;

            if (ratio > maxVisibility) {
                maxVisibility = ratio;
                mostVisibleIndex = index;
            }
        });

        // Update current video if changed
        if (mostVisibleIndex !== this.currentIndex) {
            this.setCurrentVideo(mostVisibleIndex);
        }

        // Load more if near end
        if (mostVisibleIndex >= this.videos.length - 3) {
            this.loadVideos();
        }
    }

    /**
     * Set current video by index
     * @param {number} index - Video index
     */
    setCurrentVideo(index) {
        if (index < 0 || index >= this.videos.length) return;

        // Pause previous video
        if (this.currentIndex !== index && this.videos[this.currentIndex]) {
            const prevPlayer = this.players.get(this.videos[this.currentIndex].id);
            if (prevPlayer) prevPlayer.pause();
        }

        this.currentIndex = index;

        // Play current video
        const currentVideo = this.videos[index];
        if (currentVideo) {
            const player = this.players.get(currentVideo.id);
            if (player) player.play();
        }
    }

    /**
     * Navigate to next video
     */
    nextVideo() {
        if (this.currentIndex < this.videos.length - 1) {
            this.scrollToVideo(this.currentIndex + 1);
        }
    }

    /**
     * Navigate to previous video
     */
    prevVideo() {
        if (this.currentIndex > 0) {
            this.scrollToVideo(this.currentIndex - 1);
        }
    }

    /**
     * Scroll to specific video
     * @param {number} index - Video index
     */
    scrollToVideo(index) {
        const container = this.container.querySelector('#reelsContainer');
        const items = container.querySelectorAll('.reels-feed__item');

        if (items[index]) {
            items[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Toggle play/pause on current video
     */
    toggleCurrentVideo() {
        const currentVideo = this.videos[this.currentIndex];
        if (currentVideo) {
            const player = this.players.get(currentVideo.id);
            if (player) player.togglePlay();
        }
    }

    /**
     * Record video view
     * @param {string} videoId - Video ID
     */
    async recordView(videoId) {
        try {
            await apiClient.post(`/videos/${videoId}/view`);
            this.onVideoView(videoId);
        } catch (error) {
            // Ignore view tracking errors
        }
    }

    /**
     * Format caption with hashtag links
     * @param {string} caption - Raw caption
     * @returns {string} Formatted HTML
     */
    formatCaption(caption) {
        if (!caption) return '';

        // Escape HTML
        const escaped = caption
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Link hashtags
        return escaped.replace(/#(\w+)/g, '<a href="/explore/tag/$1" class="reels-feed__hashtag">#$1</a>');
    }

    /**
     * Format count for display
     * @param {number} count - Count value
     * @returns {string} Formatted string
     */
    formatCount(count) {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    /**
     * Show/hide loading indicator
     * @param {boolean} show - Show or hide
     */
    showLoading(show) {
        const loading = this.container.querySelector('#feedLoading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Check if feed is currently visible
     * @returns {boolean} Is visible
     */
    isVisible() {
        const rect = this.container.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    /**
     * Destroy the feed
     */
    destroy() {
        // Destroy all players
        this.players.forEach(player => player.destroy());
        this.players.clear();

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for module usage
export default ReelsFeed;
