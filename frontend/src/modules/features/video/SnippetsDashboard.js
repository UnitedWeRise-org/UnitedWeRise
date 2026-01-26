/**
 * SnippetsDashboard - Management interface for user's video snippets
 *
 * Provides tabbed interface for:
 * - Drafts: Unpublished videos that can be edited/published/scheduled
 * - Scheduled: Videos scheduled for future publication
 * - Published: Live videos with analytics (views, likes, comments)
 *
 * @module features/video/SnippetsDashboard
 */

import { apiCall } from '../../../js/api-compatibility-shim.js';

/** Inline SVG placeholder for videos without thumbnails - prevents 404 errors */
const VIDEO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 16' fill='%231a1a1a'%3E%3Crect width='9' height='16'/%3E%3Cpath d='M3.5 5.5l3 2.5-3 2.5z' fill='white'/%3E%3C/svg%3E";

export class SnippetsDashboard {
    /**
     * Create a SnippetsDashboard instance
     * @param {HTMLElement} container - Container element for dashboard content
     */
    constructor(container) {
        this.container = container;
        this.currentTab = 'drafts';
        this.snippets = {
            drafts: [],
            scheduled: [],
            published: []
        };
        this.loading = false;
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        this.render();
        this.attachEventListeners();
        await this.loadTab(this.currentTab);
    }

    /**
     * Render the dashboard structure
     */
    render() {
        this.container.innerHTML = `
            <div class="snippets-dashboard-content">
                <div id="snippetsTabContent" class="snippets-tab-content">
                    <div class="snippets-loading" style="text-align: center; padding: 2rem;">
                        <div class="loading-spinner"></div>
                        <p>Loading snippets...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners for tab switching and actions
     */
    attachEventListeners() {
        // Tab switching (on the parent dashboard element)
        const tabContainer = document.querySelector('.snippets-dashboard__tabs');
        if (tabContainer) {
            tabContainer.addEventListener('click', (e) => {
                const tabBtn = e.target.closest('.tab');
                if (tabBtn) {
                    const tab = tabBtn.dataset.tab;
                    this.switchTab(tab);
                }
            });
        }

        // Action buttons via event delegation on container
        this.container.addEventListener('click', async (e) => {
            const target = e.target.closest('[data-snippet-action]');
            if (!target) return;

            const action = target.dataset.snippetAction;
            const videoId = target.dataset.videoId;

            switch (action) {
                case 'publish':
                    await this.publishSnippet(videoId);
                    break;
                case 'schedule':
                    this.showScheduleDialog(videoId);
                    break;
                case 'unschedule':
                    await this.unscheduleSnippet(videoId);
                    break;
                case 'unpublish':
                    await this.unpublishSnippet(videoId);
                    break;
                case 'edit':
                    this.editSnippet(videoId);
                    break;
                case 'delete':
                    await this.deleteSnippet(videoId);
                    break;
                case 'view-analytics':
                    this.viewAnalytics(videoId);
                    break;
                case 'play':
                    this.playSnippet(videoId);
                    break;
            }
        });
    }

    /**
     * Switch to a different tab
     * @param {string} tab - Tab name (drafts, scheduled, published)
     */
    async switchTab(tab) {
        if (tab === this.currentTab) return;

        // Update tab buttons
        document.querySelectorAll('.snippets-dashboard__tabs .tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        this.currentTab = tab;
        await this.loadTab(tab);
    }

    /**
     * Load snippets for a specific tab
     * @param {string} tab - Tab name
     */
    async loadTab(tab) {
        const content = document.getElementById('snippetsTabContent');
        if (!content) return;

        // Show loading state
        content.innerHTML = `
            <div class="snippets-loading" style="text-align: center; padding: 2rem;">
                <div class="loading-spinner"></div>
                <p>Loading ${tab}...</p>
            </div>
        `;

        this.loading = true;

        try {
            let snippets = [];

            switch (tab) {
                case 'drafts':
                    snippets = await this.fetchDrafts();
                    break;
                case 'scheduled':
                    snippets = await this.fetchScheduled();
                    break;
                case 'published':
                    snippets = await this.fetchPublished();
                    break;
            }

            this.snippets[tab] = snippets;
            this.renderSnippets(snippets, tab, content);
        } catch (error) {
            console.error(`Failed to load ${tab}:`, error);
            content.innerHTML = `
                <div class="snippets-error" style="text-align: center; padding: 2rem; color: #dc3545;">
                    <p>Failed to load ${tab}</p>
                    <button onclick="window.openSnippetsDashboard()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4169E1; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        } finally {
            this.loading = false;
        }
    }

    /**
     * Fetch user's draft snippets
     */
    async fetchDrafts() {
        const response = await apiCall('/videos/drafts', { method: 'GET' });
        return response?.data?.videos || response?.videos || [];
    }

    /**
     * Fetch user's scheduled snippets
     */
    async fetchScheduled() {
        const response = await apiCall('/videos/scheduled', { method: 'GET' });
        return response?.data?.videos || response?.videos || [];
    }

    /**
     * Fetch user's published snippets
     */
    async fetchPublished() {
        const userId = window.currentUser?.id;
        if (!userId) return [];

        const response = await apiCall(`/videos/user/${userId}`, { method: 'GET' });
        return response?.data?.videos || response?.videos || [];
    }

    /**
     * Render snippets for a tab
     * @param {Array} snippets - Array of snippet objects
     * @param {string} tab - Current tab name
     * @param {HTMLElement} container - Container to render into
     */
    renderSnippets(snippets, tab, container) {
        if (!snippets || snippets.length === 0) {
            container.innerHTML = this.renderEmptyState(tab);
            return;
        }

        const cardsHtml = snippets.map(snippet => this.renderSnippetCard(snippet, tab)).join('');
        container.innerHTML = `<div class="snippets-grid">${cardsHtml}</div>`;
    }

    /**
     * Render empty state for a tab
     * @param {string} tab - Tab name
     */
    renderEmptyState(tab) {
        const messages = {
            drafts: {
                icon: '📝',
                title: 'No drafts yet',
                description: 'Start creating your first snippet!'
            },
            scheduled: {
                icon: '📅',
                title: 'Nothing scheduled',
                description: 'Schedule snippets to publish them later'
            },
            published: {
                icon: '🎬',
                title: 'No published snippets',
                description: 'Publish your drafts to share with the world'
            }
        };

        const msg = messages[tab] || messages.drafts;

        return `
            <div class="snippets-empty" style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${msg.icon}</div>
                <h3 style="margin: 0 0 0.5rem 0;">${msg.title}</h3>
                <p style="color: #666; margin: 0;">${msg.description}</p>
                ${tab === 'drafts' ? `
                    <button data-action="create-snippet" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #4169E1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        + Create Snippet
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render a single snippet card
     * @param {Object} snippet - Snippet data
     * @param {string} tab - Current tab name
     */
    renderSnippetCard(snippet, tab) {
        const thumbnailUrl = snippet.thumbnailUrl || VIDEO_PLACEHOLDER;
        const caption = snippet.caption || 'No caption';
        const duration = this.formatDuration(snippet.duration || 0);

        return `
            <div class="snippet-card" data-video-id="${snippet.id}">
                <div class="snippet-card__thumb-container" data-snippet-action="play" data-video-id="${snippet.id}">
                    <img src="${thumbnailUrl}" alt="Snippet thumbnail" class="snippet-card__thumb" loading="lazy">
                    <div class="snippet-card__play-overlay">
                        <span class="snippet-card__play-icon">▶</span>
                    </div>
                    <span class="snippet-card__duration">${duration}</span>
                </div>
                <div class="snippet-card__info">
                    <p class="snippet-card__caption" title="${this.escapeHtml(caption)}">${this.escapeHtml(this.truncate(caption, 60))}</p>
                    <p class="snippet-card__timestamp">${this.formatDate(snippet.createdAt)}</p>
                    ${this.renderStatusBadge(snippet, tab)}
                    ${tab === 'scheduled' && snippet.scheduledAt ? `
                        <div class="snippet-card__scheduled-time">
                            📅 ${this.formatDate(snippet.scheduledAt)}
                        </div>
                    ` : ''}
                </div>
                ${tab === 'published' ? this.renderStats(snippet) : ''}
                <div class="snippet-card__actions">
                    ${this.renderActions(snippet, tab)}
                </div>
            </div>
        `;
    }

    /**
     * Render status badge
     * @param {Object} snippet - Snippet data
     * @param {string} tab - Current tab
     */
    renderStatusBadge(snippet, tab) {
        const statusConfig = {
            drafts: { class: 'draft', text: 'Draft' },
            scheduled: { class: 'scheduled', text: 'Scheduled' },
            published: { class: 'published', text: 'Published' }
        };

        const config = statusConfig[tab] || statusConfig.drafts;

        return `<span class="snippet-card__status snippet-card__status--${config.class}">${config.text}</span>`;
    }

    /**
     * Render snippet stats (for published tab)
     * @param {Object} snippet - Snippet data
     */
    renderStats(snippet) {
        return `
            <div class="snippet-card__stats">
                <span title="Views">👁 ${this.formatCount(snippet.viewCount || 0)}</span>
                <span title="Likes">❤️ ${this.formatCount(snippet.likeCount || 0)}</span>
                <span title="Comments">💬 ${this.formatCount(snippet.commentCount || 0)}</span>
            </div>
        `;
    }

    /**
     * Render action buttons based on tab
     * @param {Object} snippet - Snippet data
     * @param {string} tab - Current tab
     */
    renderActions(snippet, tab) {
        switch (tab) {
            case 'drafts':
                return `
                    <button class="snippet-action-btn snippet-action-btn--primary" data-snippet-action="publish" data-video-id="${snippet.id}" title="Publish now">Publish</button>
                    <button class="snippet-action-btn" data-snippet-action="schedule" data-video-id="${snippet.id}" title="Schedule for later">Schedule</button>
                    <button class="snippet-action-btn" data-snippet-action="edit" data-video-id="${snippet.id}" title="Edit caption">Edit</button>
                    <button class="snippet-action-btn snippet-action-btn--danger" data-snippet-action="delete" data-video-id="${snippet.id}" title="Delete">🗑</button>
                `;
            case 'scheduled':
                return `
                    <button class="snippet-action-btn" data-snippet-action="schedule" data-video-id="${snippet.id}" title="Change schedule">Reschedule</button>
                    <button class="snippet-action-btn" data-snippet-action="unschedule" data-video-id="${snippet.id}" title="Move to drafts">Unschedule</button>
                    <button class="snippet-action-btn snippet-action-btn--danger" data-snippet-action="delete" data-video-id="${snippet.id}" title="Delete">🗑</button>
                `;
            case 'published':
                return `
                    <button class="snippet-action-btn" data-snippet-action="view-analytics" data-video-id="${snippet.id}" title="View analytics">📊 Stats</button>
                    <button class="snippet-action-btn" data-snippet-action="unpublish" data-video-id="${snippet.id}" title="Move to drafts">Unpublish</button>
                    <button class="snippet-action-btn snippet-action-btn--danger" data-snippet-action="delete" data-video-id="${snippet.id}" title="Delete">🗑</button>
                `;
            default:
                return '';
        }
    }

    /**
     * Publish a snippet immediately
     * @param {string} videoId - Video ID
     */
    async publishSnippet(videoId) {
        try {
            const response = await apiCall(`/videos/${videoId}/publish`, { method: 'PATCH' });
            if (response?.ok !== false && response?.success !== false) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet published successfully!');
                }

                // Remove the card from current view with animation
                const card = document.querySelector(`[data-video-id="${videoId}"]`)?.closest('.snippet-card');
                if (card) {
                    card.style.transition = 'opacity 0.3s, transform 0.3s';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    setTimeout(() => card.remove(), 300);
                }

                // Clear cache so next tab load gets fresh data
                this.snippets.drafts = null;
                this.snippets.published = null;
            } else {
                throw new Error(response?.error || 'Failed to publish');
            }
        } catch (error) {
            console.error('Failed to publish snippet:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to publish snippet');
            }
        }
    }

    /**
     * Show schedule dialog for a snippet
     * @param {string} videoId - Video ID
     */
    showScheduleDialog(videoId) {
        // Create a simple datetime picker modal
        const modal = document.createElement('div');
        modal.className = 'schedule-dialog-overlay';
        modal.innerHTML = `
            <div class="schedule-dialog">
                <h3>Schedule Snippet</h3>
                <p>Choose when to publish this snippet:</p>
                <input type="datetime-local" id="scheduleDateTime" min="${this.getMinDateTime()}" style="width: 100%; padding: 0.5rem; margin: 1rem 0; border: 1px solid #ccc; border-radius: 4px;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="schedule-dialog-cancel" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button class="schedule-dialog-confirm" style="padding: 0.5rem 1rem; border: none; background: #4169E1; color: white; border-radius: 4px; cursor: pointer;">Schedule</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event handlers
        modal.querySelector('.schedule-dialog-cancel').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.schedule-dialog-overlay').addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        modal.querySelector('.schedule-dialog-confirm').addEventListener('click', async () => {
            const dateInput = document.getElementById('scheduleDateTime');
            if (!dateInput.value) {
                alert('Please select a date and time');
                return;
            }

            const scheduledAt = new Date(dateInput.value).toISOString();
            await this.scheduleSnippet(videoId, scheduledAt);
            modal.remove();
        });
    }

    /**
     * Schedule a snippet for future publication
     * @param {string} videoId - Video ID
     * @param {string} scheduledAt - ISO date string
     */
    async scheduleSnippet(videoId, scheduledAt) {
        try {
            const response = await apiCall(`/videos/${videoId}/schedule`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledAt })
            });

            if (response?.ok !== false && response?.success !== false) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet scheduled successfully!');
                }
                await this.loadTab(this.currentTab);
            } else {
                throw new Error(response?.error || 'Failed to schedule');
            }
        } catch (error) {
            console.error('Failed to schedule snippet:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to schedule snippet');
            }
        }
    }

    /**
     * Unschedule a snippet (move back to drafts)
     * @param {string} videoId - Video ID
     */
    async unscheduleSnippet(videoId) {
        try {
            const response = await apiCall(`/videos/${videoId}/unschedule`, { method: 'PATCH' });
            if (response?.ok !== false && response?.success !== false) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet unscheduled');
                }
                await this.loadTab(this.currentTab);
            } else {
                throw new Error(response?.error || 'Failed to unschedule');
            }
        } catch (error) {
            console.error('Failed to unschedule snippet:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to unschedule snippet');
            }
        }
    }

    /**
     * Unpublish a snippet (move back to drafts)
     * @param {string} videoId - Video ID
     */
    async unpublishSnippet(videoId) {
        if (!confirm('Are you sure you want to unpublish this snippet?')) return;

        try {
            const response = await apiCall(`/videos/${videoId}/unpublish`, { method: 'PATCH' });
            if (response?.ok !== false && response?.success !== false) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet unpublished');
                }
                await this.loadTab(this.currentTab);
            } else {
                throw new Error(response?.error || 'Failed to unpublish');
            }
        } catch (error) {
            console.error('Failed to unpublish snippet:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to unpublish snippet');
            }
        }
    }

    /**
     * Delete a snippet
     * @param {string} videoId - Video ID
     */
    async deleteSnippet(videoId) {
        if (!confirm('Are you sure you want to delete this snippet? This cannot be undone.')) return;

        try {
            const response = await apiCall(`/videos/${videoId}`, { method: 'DELETE' });
            if (response?.ok !== false && response?.success !== false) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet deleted');
                }
                await this.loadTab(this.currentTab);
            } else {
                throw new Error(response?.error || 'Failed to delete');
            }
        } catch (error) {
            console.error('Failed to delete snippet:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to delete snippet');
            }
        }
    }

    /**
     * Edit snippet caption/hashtags
     * @param {string} videoId - Video ID
     */
    editSnippet(videoId) {
        const snippet = this.snippets[this.currentTab].find(s => s.id === videoId);
        if (!snippet) return;

        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'schedule-dialog-overlay';
        modal.innerHTML = `
            <div class="schedule-dialog" style="max-width: 500px;">
                <h3>Edit Snippet</h3>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Caption</label>
                <textarea id="editCaption" style="width: 100%; min-height: 80px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical;">${this.escapeHtml(snippet.caption || '')}</textarea>
                <label style="display: block; margin: 1rem 0 0.5rem; font-weight: 500;">Hashtags</label>
                <input type="text" id="editHashtags" value="${this.escapeHtml((snippet.hashtags || []).join(', '))}" placeholder="tag1, tag2, tag3" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
                    <button class="edit-dialog-cancel" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button class="edit-dialog-confirm" style="padding: 0.5rem 1rem; border: none; background: #4169E1; color: white; border-radius: 4px; cursor: pointer;">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.edit-dialog-cancel').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('.edit-dialog-confirm').addEventListener('click', async () => {
            const caption = document.getElementById('editCaption').value;
            const hashtagsInput = document.getElementById('editHashtags').value;
            const hashtags = hashtagsInput.split(',').map(t => t.trim()).filter(t => t);

            try {
                const response = await apiCall(`/videos/${videoId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caption, hashtags })
                });

                if (response?.ok !== false && response?.success !== false) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('Snippet updated');
                    }
                    modal.remove();
                    await this.loadTab(this.currentTab);
                } else {
                    throw new Error(response?.error || 'Failed to update');
                }
            } catch (error) {
                console.error('Failed to update snippet:', error);
                if (typeof window.showToast === 'function') {
                    window.showToast('Failed to update snippet');
                }
            }
        });
    }

    /**
     * View analytics for a snippet
     * @param {string} videoId - Video ID
     */
    viewAnalytics(videoId) {
        const snippet = this.snippets.published.find(s => s.id === videoId);
        if (!snippet) return;

        const modal = document.createElement('div');
        modal.className = 'schedule-dialog-overlay';
        modal.innerHTML = `
            <div class="schedule-dialog" style="max-width: 400px;">
                <h3>📊 Snippet Analytics</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0;">
                    <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${this.formatCount(snippet.viewCount || 0)}</div>
                        <div style="color: #666; font-size: 0.875rem;">Views</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${this.formatCount(snippet.likeCount || 0)}</div>
                        <div style="color: #666; font-size: 0.875rem;">Likes</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${this.formatCount(snippet.commentCount || 0)}</div>
                        <div style="color: #666; font-size: 0.875rem;">Comments</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${this.formatCount(snippet.shareCount || 0)}</div>
                        <div style="color: #666; font-size: 0.875rem;">Shares</div>
                    </div>
                </div>
                <p style="color: #666; font-size: 0.875rem; margin: 0;">Published: ${this.formatDate(snippet.publishedAt || snippet.createdAt)}</p>
                <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
                    <button class="analytics-close" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('.analytics-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    /**
     * Play a snippet in the video player
     * @param {string} videoId - Video ID
     */
    async playSnippet(videoId) {
        const snippet = this.snippets[this.currentTab].find(s => s.id === videoId);
        if (!snippet) return;

        try {
            // Try to use ReelsFeed for playback
            const { VideoPlayer } = await import('./VideoPlayer.js');

            // Create fullscreen player modal
            const modal = document.createElement('div');
            modal.className = 'video-player-overlay';
            modal.innerHTML = `
                <div class="video-player-modal">
                    <button class="video-player-close" style="position: absolute; top: 1rem; right: 1rem; z-index: 100; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.5rem;">×</button>
                    <div id="snippetPlayerContainer"></div>
                </div>
            `;

            document.body.appendChild(modal);

            // Initialize player with correct parameters
            const player = new VideoPlayer({
                container: document.getElementById('snippetPlayerContainer'),
                hlsUrl: snippet.hlsManifestUrl,
                mp4Url: snippet.mp4Url || snippet.originalUrl,
                thumbnailUrl: snippet.thumbnailUrl,
                aspectRatio: snippet.aspectRatio,
                autoplay: true
            });

            modal.querySelector('.video-player-close').addEventListener('click', () => {
                player.destroy?.();
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    player.destroy?.();
                    modal.remove();
                }
            });
        } catch (error) {
            console.error('Failed to open video player:', error);
            // Fallback: open video URL directly
            if (snippet.videoUrl) {
                window.open(snippet.videoUrl, '_blank');
            }
        }
    }

    // ============ Utility Methods ============

    /**
     * Format duration in seconds to MM:SS
     * @param {number} seconds - Duration in seconds
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
     */
    formatCount(count) {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    /**
     * Get minimum datetime for scheduling (now + 5 minutes)
     */
    getMinDateTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        return now.toISOString().slice(0, 16);
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} length - Max length
     */
    truncate(text, length) {
        if (!text || text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export default
export default SnippetsDashboard;
