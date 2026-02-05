/**
 * SnippetsDashboard - Management interface for user's video snippets
 *
 * Provides a unified list interface with filters for:
 * - All videos with status badges (Draft, Scheduled, Published)
 * - Filter by status (All, Drafts, Scheduled, Published)
 * - Sort by date (Newest/Oldest first)
 *
 * Features real-time state updates without page reload when
 * publishing, scheduling, or deleting videos.
 *
 * @module features/video/SnippetsDashboard
 */

import { apiCall } from '../../../js/api-compatibility-shim.js';
import { adminDebugLog } from '../../../../js/adminDebugger.js';

/** Inline SVG placeholder for videos without thumbnails - prevents 404 errors */
const VIDEO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 16' fill='%231a1a1a'%3E%3Crect width='9' height='16'/%3E%3Cpath d='M3.5 5.5l3 2.5-3 2.5z' fill='white'/%3E%3C/svg%3E";

export class SnippetsDashboard {
    /**
     * Create a SnippetsDashboard instance
     * @param {HTMLElement} container - Container element for dashboard content
     */
    constructor(container) {
        this.container = container;
        /** @type {Array} All user snippets in a unified list */
        this.allSnippets = [];
        /** @type {string} Current filter value: 'all', 'DRAFT', 'SCHEDULED', 'PUBLISHED' */
        this.currentFilter = 'all';
        /** @type {string} Current sort value: 'newest', 'oldest' */
        this.currentSort = 'newest';
        this.loading = false;
        /** @type {number|null} Polling timer for encoding status updates */
        this.encodingPollTimer = null;
        /** @type {string} Current encoding service name from backend */
        this.encodingService = 'ffmpeg';
        /** @type {boolean} Guard to prevent duplicate reels overlays */
        this.reelsOpen = false;

        // Listen for upload events from SnippetCreatorModal
        window.addEventListener('snippetUploaded', () => {
            this.loadSnippets();
        });
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        this.render();
        this.attachEventListeners();
        await this.loadSnippets();
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
     * Attach event listeners for filters and actions
     */
    attachEventListeners() {
        // Filter dropdown
        const filterSelect = document.getElementById('snippetsStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderFilteredSnippets();
            });
        }

        // Sort dropdown
        const sortSelect = document.getElementById('snippetsSortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderFilteredSnippets();
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
                case 'play': {
                    const playTarget = this.findSnippetById(videoId);
                    if (playTarget && playTarget.encodingStatus && playTarget.encodingStatus !== 'READY') {
                        this.showToast('This video is still encoding. Please wait...');
                        break;
                    }
                    this.playSnippet(videoId);
                    break;
                }
            }
        });
    }

    /**
     * Load all snippets from the unified endpoint
     */
    async loadSnippets() {
        const content = document.getElementById('snippetsTabContent');
        if (!content) return;

        // Show loading state
        content.innerHTML = `
            <div class="snippets-loading" style="text-align: center; padding: 2rem;">
                <div class="loading-spinner"></div>
                <p>Loading snippets...</p>
            </div>
        `;

        this.loading = true;

        try {
            const response = await apiCall('/videos/my-snippets', { method: 'GET' });
            this.allSnippets = response?.data?.videos || response?.videos || [];
            this.encodingService = response?.data?.encodingService || response?.encodingService || 'ffmpeg';
            this.renderFilteredSnippets();
            this.startEncodingPoll();
        } catch (error) {
            console.error('Failed to load snippets:', error);
            content.innerHTML = `
                <div class="snippets-error" style="text-align: center; padding: 2rem; color: #dc3545;">
                    <p>Failed to load snippets</p>
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
     * Get filtered and sorted snippets based on current selections
     * @returns {Array} Filtered and sorted snippets
     */
    getFilteredSnippets() {
        let snippets = [...this.allSnippets];

        // Apply filter
        if (this.currentFilter !== 'all') {
            snippets = snippets.filter(s => s.publishStatus === this.currentFilter);
        }

        // Apply sort
        snippets.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return this.currentSort === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return snippets;
    }

    /**
     * Render snippets with current filter and sort applied
     */
    renderFilteredSnippets() {
        const content = document.getElementById('snippetsTabContent');
        if (!content) return;

        const filteredSnippets = this.getFilteredSnippets();
        this.renderSnippets(filteredSnippets, content);
    }

    /**
     * Render snippets list
     * @param {Array} snippets - Array of snippet objects
     * @param {HTMLElement} container - Container to render into
     */
    renderSnippets(snippets, container) {
        if (!snippets || snippets.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        const cardsHtml = snippets.map(snippet => this.renderSnippetCard(snippet)).join('');
        container.innerHTML = `<div class="snippets-grid">${cardsHtml}</div>`;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const filterMessages = {
            'all': {
                icon: '🎬',
                title: 'No snippets yet',
                description: 'Start creating your first snippet!'
            },
            'DRAFT': {
                icon: '📝',
                title: 'No drafts',
                description: 'All your videos have been published or scheduled'
            },
            'SCHEDULED': {
                icon: '📅',
                title: 'Nothing scheduled',
                description: 'Schedule snippets to publish them later'
            },
            'PUBLISHED': {
                icon: '✅',
                title: 'No published snippets',
                description: 'Publish your drafts to share with the world'
            }
        };

        const msg = filterMessages[this.currentFilter] || filterMessages.all;

        return `
            <div class="snippets-empty" style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${msg.icon}</div>
                <h3 style="margin: 0 0 0.5rem 0;">${msg.title}</h3>
                <p style="color: #666; margin: 0;">${msg.description}</p>
                ${this.currentFilter === 'all' || this.currentFilter === 'DRAFT' ? `
                    <button data-action="create-snippet" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #4169E1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        + Create Snippet
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Get encoding status badge HTML for a snippet.
     * Shows milestone-based status: queued, encoding (with service), or failed.
     * @param {Object} snippet - Snippet data
     * @returns {string} Badge HTML or empty string if ready
     */
    getEncodingBadge(snippet) {
        const { encodingStatus, encodingTiersStatus } = snippet;
        const service = this.encodingService || 'ffmpeg';

        if (!encodingStatus || encodingStatus === 'READY') return '';

        if (encodingStatus === 'FAILED') {
            return `<div class="snippet-encoding-badge snippet-encoding-badge--failed">
                      Encoding failed
                    </div>`;
        }

        if (encodingStatus === 'PENDING') {
            return `<div class="snippet-encoding-badge">
                      <span class="encoding-spinner"></span> Queued for encoding...
                    </div>`;
        }

        // ENCODING status — show phase info
        if (encodingTiersStatus === 'PARTIAL') {
            return `<div class="snippet-encoding-badge">
                      <span class="encoding-spinner"></span> Encoding 360p via ${service}...
                    </div>`;
        }

        return `<div class="snippet-encoding-badge">
                  <span class="encoding-spinner"></span> Encoding 720p via ${service}...
                </div>`;
    }

    /**
     * Render a single snippet card with status badge
     * @param {Object} snippet - Snippet data
     */
    renderSnippetCard(snippet) {
        const thumbnailUrl = snippet.thumbnailUrl || VIDEO_PLACEHOLDER;
        const caption = snippet.caption || 'No caption';
        const duration = this.formatDuration(snippet.duration || 0);
        const encodingBadge = this.getEncodingBadge(snippet);

        return `
            <div class="snippet-card" data-video-id="${snippet.id}">
                <div class="snippet-card__thumb-container" data-snippet-action="play" data-video-id="${snippet.id}">
                    <img src="${thumbnailUrl}" alt="Snippet thumbnail" class="snippet-card__thumb" loading="lazy">
                    ${encodingBadge}
                    <div class="snippet-card__play-overlay">
                        <span class="snippet-card__play-icon">▶</span>
                    </div>
                    <span class="snippet-card__duration">${duration}</span>
                </div>
                <div class="snippet-card__info">
                    <p class="snippet-card__caption" title="${this.escapeHtml(caption)}">${this.escapeHtml(this.truncate(caption, 60))}</p>
                    <p class="snippet-card__timestamp">${snippet.publishStatus === 'PUBLISHED' && snippet.publishedAt
                        ? this.formatDate(snippet.publishedAt)
                        : this.formatDate(snippet.createdAt)}</p>
                    ${this.renderStatusBadge(snippet)}
                    ${snippet.publishStatus === 'SCHEDULED' && snippet.scheduledPublishAt ? `
                        <div class="snippet-card__scheduled-time">
                            📅 ${this.formatDate(snippet.scheduledPublishAt)}
                        </div>
                    ` : ''}
                </div>
                ${snippet.publishStatus === 'PUBLISHED' ? this.renderStats(snippet) : ''}
                <div class="snippet-card__actions">
                    ${this.renderActions(snippet)}
                </div>
            </div>
        `;
    }

    /**
     * Render status badge based on publishStatus
     * @param {Object} snippet - Snippet data
     */
    renderStatusBadge(snippet) {
        const statusConfig = {
            'DRAFT': { class: 'draft', text: 'Draft' },
            'SCHEDULED': { class: 'scheduled', text: 'Scheduled' },
            'PUBLISHED': { class: 'published', text: 'Published' }
        };

        const config = statusConfig[snippet.publishStatus] || statusConfig.DRAFT;

        return `<span class="snippet-card__status snippet-card__status--${config.class}">${config.text}</span>`;
    }

    /**
     * Render snippet stats (for published snippets)
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
     * Render action buttons based on publish status
     * @param {Object} snippet - Snippet data
     */
    renderActions(snippet) {
        switch (snippet.publishStatus) {
            case 'DRAFT':
                return `
                    <button class="snippet-action-btn snippet-action-btn--primary" data-snippet-action="publish" data-video-id="${snippet.id}" title="Publish now">Publish</button>
                    <button class="snippet-action-btn" data-snippet-action="schedule" data-video-id="${snippet.id}" title="Schedule for later">Schedule</button>
                    <button class="snippet-action-btn" data-snippet-action="edit" data-video-id="${snippet.id}" title="Edit caption">Edit</button>
                    <button class="snippet-action-btn snippet-action-btn--danger" data-snippet-action="delete" data-video-id="${snippet.id}" title="Delete">🗑</button>
                `;
            case 'SCHEDULED':
                return `
                    <button class="snippet-action-btn" data-snippet-action="schedule" data-video-id="${snippet.id}" title="Change schedule">Reschedule</button>
                    <button class="snippet-action-btn" data-snippet-action="unschedule" data-video-id="${snippet.id}" title="Move to drafts">Unschedule</button>
                    <button class="snippet-action-btn snippet-action-btn--danger" data-snippet-action="delete" data-video-id="${snippet.id}" title="Delete">🗑</button>
                `;
            case 'PUBLISHED':
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
     * Publish a snippet immediately - updates local state for real-time UX
     * @param {string} videoId - Video ID
     */
    async publishSnippet(videoId) {
        try {
            const response = await apiCall(`/videos/${videoId}/publish`, { method: 'PATCH' });
            if (response?.ok !== false && response?.success !== false) {
                // Update local state immediately (real-time update)
                const snippet = this.findSnippetById(videoId);
                if (snippet) {
                    snippet.publishStatus = 'PUBLISHED';
                    snippet.publishedAt = new Date().toISOString();
                    snippet.scheduledPublishAt = null;
                }

                // Re-render with current filter
                this.renderFilteredSnippets();

                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet published successfully!');
                }
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
     * Schedule a snippet for future publication - updates local state
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
                // Update local state immediately
                const snippet = this.findSnippetById(videoId);
                if (snippet) {
                    snippet.publishStatus = 'SCHEDULED';
                    snippet.scheduledPublishAt = scheduledAt;
                }

                this.renderFilteredSnippets();

                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet scheduled successfully!');
                }
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
     * Unschedule a snippet (move back to drafts) - updates local state
     * @param {string} videoId - Video ID
     */
    async unscheduleSnippet(videoId) {
        try {
            const response = await apiCall(`/videos/${videoId}/unschedule`, { method: 'PATCH' });
            if (response?.ok !== false && response?.success !== false) {
                // Update local state immediately
                const snippet = this.findSnippetById(videoId);
                if (snippet) {
                    snippet.publishStatus = 'DRAFT';
                    snippet.scheduledPublishAt = null;
                }

                this.renderFilteredSnippets();

                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet unscheduled');
                }
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
     * Unpublish a snippet (move back to drafts) - updates local state
     * @param {string} videoId - Video ID
     */
    async unpublishSnippet(videoId) {
        if (!confirm('Are you sure you want to unpublish this snippet?')) return;

        try {
            const response = await apiCall(`/videos/${videoId}/unpublish`, { method: 'PATCH' });
            if (response?.ok !== false && response?.success !== false) {
                // Update local state immediately
                const snippet = this.findSnippetById(videoId);
                if (snippet) {
                    snippet.publishStatus = 'DRAFT';
                    snippet.publishedAt = null;
                }

                this.renderFilteredSnippets();

                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet unpublished');
                }
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
     * Delete a snippet - removes from local state
     * @param {string} videoId - Video ID
     */
    async deleteSnippet(videoId) {
        if (!confirm('Are you sure you want to delete this snippet? This cannot be undone.')) return;

        try {
            const response = await apiCall(`/videos/${videoId}`, { method: 'DELETE' });
            if (response?.ok !== false && response?.success !== false) {
                // Remove from local state immediately
                this.allSnippets = this.allSnippets.filter(s => s.id !== videoId);

                this.renderFilteredSnippets();

                if (typeof window.showToast === 'function') {
                    window.showToast('Snippet deleted');
                }
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
        const snippet = this.findSnippetById(videoId);
        if (!snippet) return;

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
                    // Update local state
                    snippet.caption = caption;
                    snippet.hashtags = hashtags;

                    this.renderFilteredSnippets();

                    if (typeof window.showToast === 'function') {
                        window.showToast('Snippet updated');
                    }
                    modal.remove();
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
        const snippet = this.findSnippetById(videoId);
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
     * Play a snippet in a reels-style fullscreen scroll feed
     * Opens at the clicked video's position within the current filtered list.
     * Uses IntersectionObserver for auto-play/pause on scroll.
     * @param {string} videoId - Video ID to start at
     */
    async playSnippet(videoId) {
        if (this.reelsOpen) return;
        this.reelsOpen = true;
        this.stopEncodingPoll();

        const filteredSnippets = this.getFilteredSnippets();
        const startIndex = filteredSnippets.findIndex(s => s.id === videoId);
        if (startIndex === -1) {
            this.reelsOpen = false;
            return;
        }

        const targetSnippet = filteredSnippets[startIndex];
        if (!targetSnippet.hlsManifestUrl && !targetSnippet.mp4Url && !targetSnippet.originalUrl) {
            this.showToast('This video is still encoding. Please wait...');
            this.reelsOpen = false;
            return;
        }

        try {
            const { SnippetReelsPlayer } = await import('./SnippetReelsPlayer.js');
            this.reelsPlayer = new SnippetReelsPlayer({
                snippets: filteredSnippets,
                startVideoId: videoId,
                onClose: () => {
                    this.startEncodingPoll();
                    this.reelsOpen = false;
                    this.reelsPlayer = null;
                }
            });
            this.reelsPlayer.open();
        } catch (error) {
            this.reelsOpen = false;
            console.error('Failed to open reels player:', error);
            // Fallback: open video URL directly
            const snippet = this.findSnippetById(videoId);
            if (snippet && (snippet.mp4Url || snippet.originalUrl)) {
                window.open(snippet.mp4Url || snippet.originalUrl, '_blank');
            }
        }
    }

    /**
     * Find a snippet by ID from the unified list
     * @param {string} videoId - Video ID
     * @returns {Object|null} Snippet object or null
     */
    findSnippetById(videoId) {
        return this.allSnippets?.find(s => s.id === videoId) || null;
    }

    /**
     * Get CSS class for modal sizing based on aspect ratio
     * @param {string} aspectRatio - Aspect ratio string (e.g., 'VERTICAL_9_16')
     * @returns {string} CSS class name
     */
    getAspectRatioClass(aspectRatio) {
        const ratioMap = {
            'VERTICAL_9_16': 'video-player-modal--vertical_9_16',
            'HORIZONTAL_16_9': 'video-player-modal--horizontal_16_9',
            'SQUARE_1_1': 'video-player-modal--square_1_1'
        };
        return ratioMap[aspectRatio] || 'video-player-modal--vertical_9_16';
    }

    // ============ Encoding Poll & Toast ============

    /**
     * Start polling for encoding status updates if any snippets are pending/encoding.
     * Automatically stops when no more pending videos remain.
     */
    startEncodingPoll() {
        if (this.encodingPollTimer) return;

        const hasPending = this.allSnippets.some(s =>
            s.encodingStatus === 'PENDING' || s.encodingStatus === 'ENCODING'
        );
        if (!hasPending) return;

        this.encodingPollTimer = setInterval(async () => {
            try {
                const response = await apiCall('/videos/my-snippets', { method: 'GET' });
                const videos = response?.data?.videos || response?.videos || [];
                const service = response?.data?.encodingService || response?.encodingService || 'ffmpeg';
                this.encodingService = service;

                let toastMessages = [];

                for (const video of videos) {
                    const prev = this.allSnippets.find(s => s.id === video.id);
                    if (!prev) continue;

                    // Detect encoding started (PENDING → ENCODING)
                    if (prev.encodingStatus === 'PENDING' && video.encodingStatus === 'ENCODING') {
                        toastMessages.push(`Encoding started via ${service}`);
                    }

                    // Detect Phase 1 complete (tiers NONE → PARTIAL)
                    if (prev.encodingTiersStatus === 'NONE' && video.encodingTiersStatus === 'PARTIAL') {
                        toastMessages.push('720p ready — encoding 360p...');
                    }

                    // Detect fully ready
                    if (prev.encodingStatus !== 'READY' && video.encodingStatus === 'READY') {
                        toastMessages.push('Video ready to play!');
                    }

                    // Detect failure
                    if (prev.encodingStatus !== 'FAILED' && video.encodingStatus === 'FAILED') {
                        toastMessages.push('Video encoding failed');
                    }
                }

                // Update state and re-render if any changes detected
                if (toastMessages.length > 0) {
                    this.allSnippets = videos;
                    this.renderFilteredSnippets();
                    for (const msg of toastMessages) {
                        this.showToast(msg);
                    }
                }

                const stillPending = videos.some(s =>
                    s.encodingStatus === 'PENDING' || s.encodingStatus === 'ENCODING'
                );
                if (!stillPending) {
                    this.stopEncodingPoll();
                }
            } catch {
                // Silent fail — poll will retry
            }
        }, 10000);
    }

    /**
     * Stop the encoding poll timer
     */
    stopEncodingPoll() {
        if (this.encodingPollTimer) {
            clearInterval(this.encodingPollTimer);
            this.encodingPollTimer = null;
        }
    }

    /**
     * Show a brief toast notification
     * @param {string} message - Message to display
     */
    showToast(message) {
        const existing = document.querySelector('.snippets-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'snippets-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
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
