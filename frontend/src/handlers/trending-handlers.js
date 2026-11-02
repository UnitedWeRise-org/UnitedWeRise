/**
 * Trending Now panel + compatibility helpers.
 *
 * The panel is intentionally compact: top 3 topics / top 3 posts, dynamic
 * category chips, and geography/window selectors. "All" actions open the full
 * Trending Digest, which owns the complete list and AI summaries.
 *
 * @module handlers/trending-handlers
 */

import { apiCall } from '../js/api-compatibility-shim.js';
import { escapeHTML } from '../utils/security.js';
import { getTimeAgo } from '../utils/date-helpers.js';
import { adminDebugLog } from '../../js/adminDebugger.js';

export class TrendingHandlers {
    constructor() {
        this.data = null;
        this.scope = localStorage.getItem('trendingScope') || 'national';
        this.windowHours = 24;
        this.category = 'overall';
        this.view = 'topics';
        this.loading = false;
        this.lastFetchAt = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-trending-now-action]');
            if (!target) return;
            event.preventDefault();
            event.stopPropagation();

            const action = target.dataset.trendingNowAction;
            const topicId = target.dataset.topicId;
            const postId = target.dataset.postId;

            switch (action) {
                case 'refresh':
                    this.loadTrendingUpdates();
                    break;
                case 'view':
                    this.view = target.dataset.view === 'posts' ? 'posts' : 'topics';
                    this.render();
                    break;
                case 'category':
                    this.category = target.dataset.category || 'overall';
                    this.render();
                    break;
                case 'all-topics':
                    this.openDigest('topics');
                    break;
                case 'all-posts':
                    this.openDigest('posts');
                    break;
                case 'open-topic':
                    this.openTopic(topicId);
                    break;
                case 'open-post':
                    if (postId && typeof window.showPostInFeed === 'function') {
                        window.showPostInFeed(postId);
                    }
                    break;
            }
        });

        document.addEventListener('change', (event) => {
            const control = event.target.closest('[data-trending-now-select]');
            if (!control) return;

            const kind = control.dataset.trendingNowSelect;
            if (kind === 'scope') {
                this.scope = control.value;
                localStorage.setItem('trendingScope', this.scope);
                this.category = 'overall';
                this.loadTrendingUpdates();
            } else if (kind === 'window') {
                this.windowHours = Number(control.value) || 24;
                this.loadTrendingUpdates();
            } else if (kind === 'category') {
                this.category = control.value || 'overall';
                this.render();
            }
        });
    }

    async loadTrendingUpdates() {
        if (this.loading) return;
        this.loading = true;

        const body = document.getElementById('trendingUpdatesBody');
        if (body && !this.data) {
            body.innerHTML = '<div class="trending-now-loading">Loading trending topics…</div>';
        }

        try {
            const params = new URLSearchParams({
                scope: this.scope,
                window: String(this.windowHours),
                category: this.category
            });
            const response = await apiCall(`/trending/now?${params.toString()}`, {
                method: 'GET',
                bypassCache: true
            });
            const data = response?.data;
            if (!response?.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to load trending topics');
            }

            this.data = data;
            this.lastFetchAt = Date.now();
            this.render();

            const panel = document.getElementById('trendingUpdates');
            if (panel) panel.classList.add('show');
        } catch (error) {
            adminDebugLog('TrendingNow', 'Load failed', error.message);
            if (body) {
                body.innerHTML = `
                    <div class="trending-now-error">
                        <p>Could not load trending topics.</p>
                        <button type="button" data-trending-now-action="refresh">Retry</button>
                    </div>
                `;
            }
        } finally {
            this.loading = false;
        }
    }

    async loadTrendingPosts() {
        return this.loadTrendingUpdates();
    }

    getCategories() {
        return this.data?.categories || [];
    }

    topCategories() {
        return this.getCategories().slice(0, 3);
    }

    renderCategoryChips() {
        const categories = this.getCategories();
        const top = this.topCategories();
        const current = String(this.category || 'overall').toLowerCase();
        const topNames = new Set(top.map((category) => category.name.toLowerCase()));

        const chips = [
            { name: 'Overall', value: 'overall', icon: '🌐' },
            ...top.map((category) => ({ name: category.name, value: category.name, icon: '🏷️' }))
        ];

        if (current !== 'overall' && !topNames.has(current)) {
            const selected = categories.find((category) => category.name.toLowerCase() === current);
            if (selected) chips.push({ name: selected.name, value: selected.name, icon: '🏷️' });
        }

        return `
            <div class="trending-now-categories">
                ${chips.map((chip) => `
                    <button type="button"
                            class="trending-now-chip ${current === chip.value.toLowerCase() ? 'active' : ''}"
                            data-trending-now-action="category"
                            data-category="${escapeHTML(chip.value)}">
                        ${chip.icon} ${escapeHTML(chip.name)}
                    </button>
                `).join('')}
                ${categories.length > 3 ? `
                    <select class="trending-now-more-category" data-trending-now-select="category" aria-label="More categories">
                        <option value="overall" ${current === 'overall' ? 'selected' : ''}>More…</option>
                        ${categories.map((category) => `
                            <option value="${escapeHTML(category.name)}" ${current === category.name.toLowerCase() ? 'selected' : ''}>${escapeHTML(category.name)}</option>
                        `).join('')}
                    </select>
                ` : ''}
            </div>
        `;
    }

    feelingBar(feeling) {
        if (!feeling || !feeling.total) {
            return '<div class="trending-now-feeling empty">No sentiment yet</div>';
        }
        return `
            <div class="trending-now-feeling" title="Support ${feeling.supportPct}% · Neutral ${feeling.neutralPct}% · Oppose ${feeling.opposePct}%">
                <span class="feeling-support" style="width:${feeling.supportPct}%"></span>
                <span class="feeling-neutral" style="width:${feeling.neutralPct}%"></span>
                <span class="feeling-oppose" style="width:${feeling.opposePct}%"></span>
            </div>
        `;
    }

    renderTopics(topics) {
        if (!topics.length) {
            return `
                <div class="trending-now-empty">
                    <p>No topics yet.</p>
                    <small>Topics appear once at least 3 similar posts are active in this window and area.</small>
                </div>
            `;
        }

        return topics.map((topic) => `
            <button type="button" class="trending-now-topic" data-trending-now-action="open-topic" data-topic-id="${escapeHTML(topic.id)}">
                <div class="trending-now-topic-header">
                    <strong>${escapeHTML(topic.title)}</strong>
                    <span>${escapeHTML(topic.category)}</span>
                </div>
                ${this.feelingBar(topic.feeling)}
                <div class="trending-now-meta">${topic.postCount} posts · ${topic.participantCount} people</div>
            </button>
        `).join('');
    }

    renderPosts(posts) {
        if (!posts.length) {
            return `
                <div class="trending-now-empty">
                    <p>No posts yet.</p>
                    <small>Try a wider window or a different category.</small>
                </div>
            `;
        }

        return posts.map((post) => {
            const author = [post.author?.firstName, post.author?.lastName].filter(Boolean).join(' ') || post.author?.username || 'Someone';
            return `
                <button type="button" class="trending-now-post" data-trending-now-action="open-post" data-post-id="${escapeHTML(post.id)}">
                    <div class="trending-now-post-author">
                        <strong>${escapeHTML(author)}</strong>
                        <span>${escapeHTML(getTimeAgo(new Date(post.createdAt)))}</span>
                    </div>
                    <p>${escapeHTML(String(post.content || '').slice(0, 160))}${String(post.content || '').length > 160 ? '…' : ''}</p>
                </button>
            `;
        }).join('');
    }

    filteredTopics() {
        const topics = this.data?.topics || [];
        const category = String(this.category || 'overall').toLowerCase();
        if (category === 'overall' || category === 'all') return topics;
        return topics.filter((topic) => String(topic.category || '').toLowerCase() === category);
    }

    filteredPosts() {
        const category = String(this.category || 'overall').toLowerCase();
        if (category === 'overall' || category === 'all') {
            return (this.data?.posts || []).slice(0, 3);
        }

        const seen = new Set();
        return this.filteredTopics()
            .flatMap((topic) => topic.posts || [])
            .filter((post) => {
                if (seen.has(post.id)) return false;
                seen.add(post.id);
                return true;
            })
            .sort((a, b) => (b.activeScore || 0) - (a.activeScore || 0))
            .slice(0, 3);
    }

    render() {
        const body = document.getElementById('trendingUpdatesBody');
        if (!body || !this.data) return;

        const topics = this.filteredTopics().slice(0, 3);
        const posts = this.filteredPosts();
        const isTopics = this.view === 'topics';

        body.innerHTML = `
            <div class="trending-now-controls">
                <select data-trending-now-select="scope" aria-label="Trending geography">
                    <option value="national" ${this.scope === 'national' ? 'selected' : ''}>National</option>
                    <option value="state" ${this.scope === 'state' ? 'selected' : ''}>My State</option>
                    <option value="local" ${this.scope === 'local' ? 'selected' : ''}>My Area</option>
                </select>
                <select data-trending-now-select="window" aria-label="Trending window">
                    <option value="24" ${this.windowHours === 24 ? 'selected' : ''}>24h</option>
                    <option value="72" ${this.windowHours === 72 ? 'selected' : ''}>3d</option>
                    <option value="168" ${this.windowHours === 168 ? 'selected' : ''}>7d</option>
                </select>
                <button type="button" class="trending-now-refresh" data-trending-now-action="refresh" title="Refresh">🔄</button>
            </div>

            ${this.renderCategoryChips()}

            <div class="trending-now-view-row">
                <div class="trending-now-view-toggle">
                    <button type="button" class="${isTopics ? 'active' : ''}" data-trending-now-action="view" data-view="topics">🏷️ Topics</button>
                    <button type="button" class="${!isTopics ? 'active' : ''}" data-trending-now-action="view" data-view="posts">📝 Posts</button>
                </div>
                <div class="trending-now-all">
                    <button type="button" data-trending-now-action="all-topics">All Topics</button>
                    <button type="button" data-trending-now-action="all-posts">All Posts</button>
                </div>
            </div>

            <div class="trending-now-list">
                ${isTopics ? this.renderTopics(topics) : this.renderPosts(posts)}
            </div>
        `;
    }

    openDigest(view = 'topics') {
        if (window.trendingSystemIntegration?.openDigest) {
            window.trendingSystemIntegration.openDigest(
                view === 'posts' ? 'posts' : 'topics',
                this.category,
                this.scope,
                this.windowHours
            );
        } else {
            this.openFullTrending();
        }
    }

    openTopic(topicId) {
        if (window.trendingSystemIntegration) {
            if (!document.querySelector('.trending-main-active')) {
                window.trendingSystemIntegration.toggleTrendingMainView();
            }
            setTimeout(() => window.trendingSystemIntegration.showTopicDetail(topicId), 150);
        }
    }

    toggleTrendingExpansion() {
        this.openFullTrending();
    }

    openFullTrending() {
        if (window.trendingSystemIntegration) {
            window.trendingSystemIntegration.toggleTrendingMainView();
        } else if (typeof window.showToast === 'function') {
            window.showToast('Trending Digest is still loading', 3000);
        }
    }

    getCurrentGeographicScope() {
        return this.scope;
    }
}

const trendingHandlers = new TrendingHandlers();

export const loadTrendingUpdates = () => trendingHandlers.loadTrendingUpdates();
export const loadTrendingPosts = () => trendingHandlers.loadTrendingUpdates();
export const startTrendingRefresh = () => trendingHandlers.loadTrendingUpdates();
export const stopTrendingRefresh = () => {};
export const updateTrendingTopicsPanel = () => trendingHandlers.loadTrendingUpdates();
export const updateTrendingUpdatesPanel = () => trendingHandlers.loadTrendingUpdates();
export const toggleTrendingExpansion = () => trendingHandlers.toggleTrendingExpansion();
export const enterTopicMode = (topicId) => trendingHandlers.openTopic(topicId);
export const exitTopicMode = () => window.trendingSystemIntegration?.exitTopicMode?.();
export const updateMyFeedWithTopic = () => {};
export const updateTrendingWithTopicMode = () => {};
export const openFullTrending = () => trendingHandlers.openFullTrending();
export const viewTrendingPost = (postId) => window.showPostInFeed?.(postId);
export const getCurrentGeographicScope = () => trendingHandlers.getCurrentGeographicScope();

export const likeTrendingPost = async (postId) => {
    if (!window.currentUser) {
        alert('Please log in to react to posts');
        return;
    }
    const response = await apiCall(`/posts/${postId}/like`, { method: 'POST' });
    if (!response?.ok) console.error('Failed to like trending post');
};

export const addTrendingComment = async (postId, content) => {
    if (!content) return;
    await apiCall(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
    });
};

if (typeof window !== 'undefined') {
    window.loadTrendingUpdates = loadTrendingUpdates;
    window.loadTrendingPosts = loadTrendingPosts;
    window.startTrendingRefresh = startTrendingRefresh;
    window.stopTrendingRefresh = stopTrendingRefresh;
    window.updateTrendingTopicsPanel = updateTrendingTopicsPanel;
    window.updateTrendingUpdatesPanel = updateTrendingUpdatesPanel;
    window.toggleTrendingExpansion = toggleTrendingExpansion;
    window.enterTopicMode = enterTopicMode;
    window.exitTopicMode = exitTopicMode;
    window.updateMyFeedWithTopic = updateMyFeedWithTopic;
    window.updateTrendingWithTopicMode = updateTrendingWithTopicMode;
    window.openFullTrending = openFullTrending;
    window.viewTrendingPost = viewTrendingPost;
    window.likeTrendingPost = likeTrendingPost;
    window.addTrendingComment = addTrendingComment;
    window.getCurrentGeographicScope = getCurrentGeographicScope;
    window.trendingHandlers = trendingHandlers;
    window.allTrendingPosts = [];
    window.allTrendingTopics = [];
    window.trendingExpanded = false;
    window.displayMode = 'topics';
    window.currentTopicMode = null;
    window.trendingRefreshInterval = null;
}
