/**
 * VideoCard - Render video thumbnails with play overlay for feed context
 *
 * Provides consistent video card display across:
 * - Snippets feed toggle
 * - Profile video grid
 * - Search results
 * - Embedded video posts
 *
 * @module features/video/VideoCard
 */

/** Inline SVG placeholder for videos without thumbnails - prevents 404 errors */
const VIDEO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 16' fill='%231a1a1a'%3E%3Crect width='9' height='16'/%3E%3Cpath d='M3.5 5.5l3 2.5-3 2.5z' fill='white'/%3E%3C/svg%3E";

export class VideoCard {
    /**
     * Create a VideoCard renderer
     * @param {Object} options - Configuration options
     * @param {string} options.size - Card size: 'small', 'medium', 'large'
     * @param {boolean} options.showUser - Whether to show user info
     * @param {boolean} options.showStats - Whether to show view/like counts
     */
    constructor(options = {}) {
        this.options = {
            size: 'medium',
            showUser: true,
            showStats: true,
            ...options
        };
    }

    /**
     * Render a video card
     * @param {Object} video - Video object from API
     * @returns {string} HTML string for the video card
     */
    render(video) {
        if (!video || !video.id) {
            console.error('VideoCard: Invalid video data');
            return '';
        }

        const thumbnailUrl = video.thumbnailUrl || VIDEO_PLACEHOLDER;
        const duration = this.formatDuration(video.duration || 0);
        const caption = video.caption || '';

        return `
            <div class="video-card video-card--${this.options.size}"
                 data-video-id="${video.id}"
                 data-action="open-snippet-player">
                <div class="video-card__thumbnail">
                    <img src="${thumbnailUrl}"
                         alt="${this.escapeHtml(caption)}"
                         loading="lazy"
                         onerror="this.src='${VIDEO_PLACEHOLDER}'">
                    <div class="video-card__play-overlay">
                        <span class="video-card__play-icon">▶</span>
                    </div>
                    <span class="video-card__duration">${duration}</span>
                </div>
                ${this.options.showUser ? this.renderUserInfo(video) : ''}
                ${this.options.showStats ? this.renderStats(video) : ''}
                ${caption ? this.renderCaption(caption) : ''}
            </div>
        `;
    }

    /**
     * Render user info section
     * @param {Object} video - Video object
     * @returns {string} HTML string
     */
    renderUserInfo(video) {
        const user = video.user || {};
        const username = user.username || 'Unknown';
        const avatar = user.avatar || '';

        return `
            <div class="video-card__info">
                ${avatar
                    ? `<img src="${avatar}" class="video-card__avatar" alt="${this.escapeHtml(username)}">`
                    : `<div class="video-card__avatar-placeholder">${username[0]?.toUpperCase() || '?'}</div>`
                }
                <span class="video-card__username">@${this.escapeHtml(username)}</span>
            </div>
        `;
    }

    /**
     * Render stats section
     * @param {Object} video - Video object
     * @returns {string} HTML string
     */
    renderStats(video) {
        const viewCount = this.formatCount(video.viewCount || 0);
        const likeCount = this.formatCount(video.likeCount || 0);

        return `
            <div class="video-card__stats">
                <span title="Views">👁 ${viewCount}</span>
                <span title="Likes">❤️ ${likeCount}</span>
            </div>
        `;
    }

    /**
     * Render caption section
     * @param {string} caption - Video caption
     * @returns {string} HTML string
     */
    renderCaption(caption) {
        const truncated = this.truncate(caption, 50);
        return `
            <div class="video-card__caption" title="${this.escapeHtml(caption)}">
                ${this.escapeHtml(truncated)}
            </div>
        `;
    }

    /**
     * Render a grid of video cards
     * @param {Array} videos - Array of video objects
     * @param {Object} gridOptions - Grid options
     * @returns {string} HTML string for the grid
     */
    renderGrid(videos, gridOptions = {}) {
        if (!videos || videos.length === 0) {
            return this.renderEmptyState();
        }

        const cardsHtml = videos.map(video => this.render(video)).join('');
        const gridClass = gridOptions.compact ? 'video-cards-grid--compact' : 'video-cards-grid';

        return `
            <div class="${gridClass}">
                ${cardsHtml}
            </div>
        `;
    }

    /**
     * Render empty state
     * @returns {string} HTML string
     */
    renderEmptyState() {
        return `
            <div class="video-cards-empty" style="text-align: center; padding: 3rem; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎬</div>
                <p style="margin: 0;">No videos to display</p>
            </div>
        `;
    }

    /**
     * Render video in post context (thumbnail with play button)
     * @param {Object} video - Video object
     * @returns {string} HTML string for post video display
     */
    renderForPost(video) {
        const thumbnailUrl = video.thumbnailUrl || VIDEO_PLACEHOLDER;
        const duration = this.formatDuration(video.duration || 0);

        return `
            <div class="post-video-item"
                 data-video-id="${video.id}"
                 data-action="playPostVideo">
                <img src="${thumbnailUrl}"
                     alt="Video"
                     loading="lazy"
                     onerror="this.src='${VIDEO_PLACEHOLDER}'"
                <div class="video-play-overlay">
                    <span class="play-icon">▶</span>
                </div>
                <span class="video-duration">${duration}</span>
            </div>
        `;
    }

    /**
     * Render multiple videos for post context
     * @param {Array} videos - Array of video objects
     * @returns {string} HTML string
     */
    renderVideosForPost(videos) {
        if (!videos || videos.length === 0) return '';

        return `
            <div class="post-videos">
                ${videos.map(video => this.renderForPost(video)).join('')}
            </div>
        `;
    }

    // ============ Utility Methods ============

    /**
     * Format duration in seconds to MM:SS
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format count with K/M suffix
     * @param {number} count - Count to format
     * @returns {string} Formatted count
     */
    formatCount(count) {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} length - Max length
     * @returns {string} Truncated text
     */
    truncate(text, length) {
        if (!text || text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create singleton instance for convenience
const videoCard = new VideoCard();

// Export both class and instance
export { videoCard };
export default VideoCard;
