import { apiCall } from '../js/api-compatibility-shim.js';
import { escapeHTML } from '../utils/security.js';
import { getTimeAgo } from '../utils/date-helpers.js';
import { adminDebugLog, adminDebugError } from '../../js/adminDebugger.js';

/**
 * @module integrations/trending-system-integration
 * @description Trending System Integration for United We Rise Frontend
 * This script enhances the trending system to provide better space utilization options
 * Migrated to ES6 modules: October 11, 2025 (Batch 9)
 */

class TrendingSystemIntegration {
    constructor() {
        this.currentScope = localStorage.getItem('trendingScope') || 'national';
        this.currentWindow = 24;
        this.currentCategory = 'overall';
        this.currentView = 'topics';
        this.currentSort = 'active';
        this.digestData = null;
        this.currentTopic = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('TrendingSystem', 'Initializing enhanced trending system integration...');
        }

        // Load CSS styles
        this.loadTrendingSystemStyles();

        // Setup event delegation for all trending actions
        this.setupEventDelegation();
        document.addEventListener('change', (e) => this.handleControlChange(e));

        // Enhance trending navigation
        this.addTrendingNavigation();

        // Setup sidebar state monitoring
        this.setupSidebarMonitoring();

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('TrendingSystem', 'Trending system integration complete!');
        }
    }

    /**
     * Setup event delegation for all trending system actions
     */
    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-trending-system-action]');
            if (!target) return;

            e.preventDefault();
            e.stopPropagation();

            const action = target.dataset.trendingSystemAction;
            const category = target.dataset.category;
            const view = target.dataset.view;
            const topicId = target.dataset.topicId;

            switch (action) {
                case 'showCompactTrending':
                    this.showCompactTrending();
                    break;
                case 'toggleTrendingMainView':
                    this.toggleTrendingMainView();
                    break;
                case 'showSidePanelTrending':
                    this.showSidePanelTrending();
                    break;
                case 'showTrendingSettings':
                    this.showTrendingSettings();
                    break;
                case 'refreshTrending':
                    this.refreshTrending();
                    break;
                case 'showTrendingFilters':
                    this.showTrendingFilters();
                    break;
                case 'restoreMainContent':
                    this.restoreMainContent();
                    break;
                case 'filterByCategory':
                    if (category) this.filterByCategory(category);
                    break;
                case 'switchView':
                    if (view) this.switchView(view);
                    break;
                case 'enterTopicMode':
                    if (topicId) this.enterTopicMode(topicId);
                    break;
                case 'showTopicPreview':
                    if (topicId) this.showTopicPreview(topicId);
                    break;
                case 'discoverMoreTopics':
                    this.discoverMoreTopics();
                    break;
                case 'loadMoreTrending':
                    this.loadMoreTrending();
                    break;
                case 'exitTopicMode':
                case 'backToDigest':
                    this.exitTopicMode();
                    break;
                case 'openDigestPost': {
                    const postId = target.dataset.postId;
                    if (postId && typeof window.showPostInFeed === 'function') {
                        window.showPostInFeed(postId);
                    }
                    break;
                }
                case 'likePost':
                    const postIdLike = target.dataset.postId;
                    if (typeof window.likeTrendingPost === 'function' && postIdLike) {
                        window.likeTrendingPost(postIdLike);
                    }
                    break;
                case 'showCommentBox':
                    const postIdComment = target.dataset.postId;
                    if (typeof window.showTrendingCommentBox === 'function' && postIdComment) {
                        window.showTrendingCommentBox(postIdComment);
                    }
                    break;
                case 'closeModal':
                    target.closest('.modal-overlay')?.remove();
                    break;
                case 'enterTopicModeAndClose':
                    if (topicId) this.enterTopicMode(topicId);
                    target.closest('.modal-overlay')?.remove();
                    break;
            }
        });
    }

    /**
     * Handle digest scope/window/category/sort controls.
     */
    handleControlChange(event) {
        const control = event.target.closest('[data-trending-control]');
        if (!control) return;
        const kind = control.dataset.trendingControl;
        const value = control.value;

        if (kind === 'scope') {
            this.currentScope = value;
            localStorage.setItem('trendingScope', value);
            this.currentCategory = 'overall';
            this.loadTrendingContent();
        } else if (kind === 'window') {
            this.currentWindow = Number(value) || 24;
            this.loadTrendingContent();
        } else if (kind === 'category') {
            this.currentCategory = value || 'overall';
            this.renderCategories(this.digestData?.categories || []);
            this.renderCurrentView();
        } else if (kind === 'sort') {
            this.currentSort = value || 'active';
            if (this.currentTopic) {
                this.showTopicDetail(this.currentTopic.id, this.currentSort);
            } else {
                this.renderCurrentView();
            }
        }
    }

    loadTrendingSystemStyles() {
        // Check if styles are already loaded
        if (document.querySelector('#trending-system-styles')) {
            return;
        }

        const link = document.createElement('link');
        link.id = 'trending-system-styles';
        link.rel = 'stylesheet';
        link.href = 'src/styles/trending-system.css';
        document.head.appendChild(link);
    }

    addTrendingNavigation() {
        // Find the existing Trending thumb button and enhance it
        const sidebar = document.querySelector('#sidebar .thumbs');
        if (sidebar) {
            const trendingThumb = Array.from(sidebar.children).find(thumb => 
                thumb.textContent.includes('Trending')
            );
            
            if (trendingThumb) {
                // Store original onclick handler
                const originalOnclick = trendingThumb.onclick;
                
                // Add single click for main view (removed double-click requirement)
                trendingThumb.addEventListener('click', (e) => {
                    // Allow default panel toggle, but prevent if we want full view
                    // For now, keep the default panel behavior
                });

                // Add context menu for different trending view options
                trendingThumb.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.showTrendingViewOptions(e.clientX, e.clientY);
                });

                // Update title to indicate enhanced functionality
                trendingThumb.title = 'Trending (Right-click for full view options)';
                
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('TrendingSystem', 'Enhanced Trending button with multiple view options');
                }
            }
        }

        // Add trending view mode switch to existing trending panel
        this.addTrendingViewModeSwitch();
    }

    addTrendingViewModeSwitch() {
        // Add a view mode button to the existing trending updates panel header
        const trendingHeader = document.querySelector('.trending-updates-header');
        if (trendingHeader) {
            const viewModeBtn = document.createElement('button');
            viewModeBtn.className = 'trending-view-mode-btn';
            viewModeBtn.innerHTML = '📱';
            viewModeBtn.title = 'View Full Trending Digest';
            viewModeBtn.onclick = () => this.toggleTrendingMainView();

            viewModeBtn.style.cssText = `
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                padding: 0.25rem 0.5rem;
                margin-left: 0.5rem;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.2s;
            `;

            trendingHeader.appendChild(viewModeBtn);
        }

        // Add a "View Full Digest" button at the bottom of the trendingUpdates panel
        const trendingPanel = document.getElementById('trendingUpdates');
        if (trendingPanel) {
            // Check if button already exists
            if (!trendingPanel.querySelector('.view-full-trending-btn')) {
                const fullViewBtn = document.createElement('button');
                fullViewBtn.className = 'view-full-trending-btn';
                fullViewBtn.innerHTML = '📊 View Full Trending Digest';
                fullViewBtn.onclick = () => this.toggleTrendingMainView();

                fullViewBtn.style.cssText = `
                    display: block;
                    width: 100%;
                    padding: 0.75rem;
                    margin-top: 1rem;
                    background: #4b5c09;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    transition: background 0.2s;
                `;

                fullViewBtn.addEventListener('mouseenter', () => {
                    fullViewBtn.style.background = '#3a4807';
                });

                fullViewBtn.addEventListener('mouseleave', () => {
                    fullViewBtn.style.background = '#4b5c09';
                });

                trendingPanel.appendChild(fullViewBtn);
            }
        }
    }

    showTrendingViewOptions(x, y) {
        // Create context menu for trending view options
        const menu = document.createElement('div');
        menu.className = 'trending-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${y}px;
            left: ${x}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            min-width: 180px;
        `;
        
        menu.innerHTML = `
            <div class="menu-item" data-trending-system-action="showCompactTrending">
                📱 Compact Panel
            </div>
            <div class="menu-item" data-trending-system-action="toggleTrendingMainView">
                📺 Full Screen View
            </div>
            <div class="menu-item" data-trending-system-action="showSidePanelTrending">
                📋 Side Panel
            </div>
            <div class="menu-item" data-trending-system-action="showTrendingSettings">
                ⚙️ Trending Settings
            </div>
        `;
        
        // Add styles for menu items
        const style = document.createElement('style');
        style.textContent = `
            .trending-context-menu .menu-item {
                padding: 0.75rem 1rem;
                cursor: pointer;
                border-bottom: 1px solid #eee;
                transition: background-color 0.2s;
            }
            .trending-context-menu .menu-item:last-child {
                border-bottom: none;
            }
            .trending-context-menu .menu-item:hover {
                background: #f5f5f5;
            }
            .trending-context-menu .menu-item:first-child {
                border-radius: 6px 6px 0 0;
            }
            .trending-context-menu .menu-item:last-child {
                border-radius: 0 0 6px 6px;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(menu);
        
        // Close menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }

    showCompactTrending() {
        // Use the existing trending panel functionality
        if (typeof window.toggleTrendingPanel === 'function') {
            window.toggleTrendingPanel();
        }
        this.showMessage('Showing compact trending panel');
    }

    showSidePanelTrending() {
        // Use the original sidebar trending panel
        if (typeof window.togglePanel === 'function') {
            window.togglePanel('trending');
        }
        this.showMessage('Showing side panel trending view');
    }

    /**
     * Open the Digest from the compact panel (or update it if already open).
     * @param {string} view
     * @param {string} category
     * @param {string} scope
     * @param {number} windowHours
     */
    openDigest(view = 'topics', category = 'overall', scope = this.currentScope, windowHours = this.currentWindow) {
        const nextScope = scope || this.currentScope;
        const nextWindow = Number(windowHours) || this.currentWindow;
        const needsReload = nextScope !== this.currentScope || nextWindow !== this.currentWindow;

        this.currentView = ['topics', 'posts', 'overview'].includes(view) ? view : 'topics';
        this.currentCategory = category || 'overall';
        this.currentScope = nextScope;
        this.currentWindow = nextWindow;
        this.currentTopic = null;

        const mainContent = document.querySelector('#mainContent') || document.querySelector('.main');
        if (mainContent?.classList.contains('trending-main-active') && this.digestData) {
            if (needsReload) {
                this.loadTrendingContent();
            } else {
                this.renderCategories(this.digestData.categories || []);
                this.renderCurrentView();
            }
            return;
        }

        this.toggleTrendingMainView();
    }

    toggleTrendingMainView() {
        adminDebugLog('🔥 Opening Trending in main content area...');
        
        // Hide other detail panels
        document.querySelectorAll('.detail-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide existing info panels
        document.querySelectorAll('.info-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide existing trending updates panel
        const trendingUpdates = document.querySelector('#trendingUpdates');
        if (trendingUpdates) {
            trendingUpdates.classList.remove('show');
        }

        // Get main content area
        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main') ||
                           document.querySelector('main');
        
        if (!mainContent) {
            adminDebugError('Main content area not found');
            return;
        }

        // Check if we're already showing trending main view
        if (mainContent.classList.contains('trending-main-active')) {
            this.restoreMainContent();
            return;
        }

        // Clear existing content and show trending
        this.showTrendingMainView(mainContent);
    }

    showTrendingMainView(mainContent) {
        // Store original content so we can restore it later
        if (!mainContent.dataset.originalContent) {
            mainContent.dataset.originalContent = mainContent.innerHTML;
        }

        mainContent.classList.add('trending-main-active');

        // Create full-width trending interface
        mainContent.innerHTML = `
            <div class="trending-main-view">
                <div class="trending-header">
                    <div class="header-content">
                        <h1>📊 Trending Digest</h1>
                        <p class="subtitle">AI summaries of the public discussions and debates shaping your area</p>
                        <div class="header-actions">
                            <button class="header-btn primary" data-trending-system-action="refreshTrending">
                                🔄 Refresh
                            </button>
                            <button class="header-btn secondary" data-trending-system-action="restoreMainContent">
                                ← Back to Map
                            </button>
                        </div>
                    </div>
                </div>

                <div class="trending-content">
                    <div class="content-layout">
                        <div class="trending-sidebar">
                            <h3>🏷️ Categories</h3>
                            <div class="category-filters" id="trendingDigestCategories">
                                <div class="trending-digest-muted">Loading categories…</div>
                            </div>

                            <h3>🌎 Geography</h3>
                            <select class="trending-digest-select" data-trending-control="scope">
                                <option value="national" ${this.currentScope === 'national' ? 'selected' : ''}>National</option>
                                <option value="state" ${this.currentScope === 'state' ? 'selected' : ''}>My State</option>
                                <option value="local" ${this.currentScope === 'local' ? 'selected' : ''}>My Local Area</option>
                            </select>

                            <h3>📅 Window</h3>
                            <select class="trending-digest-select" data-trending-control="window">
                                <option value="24" ${this.currentWindow === 24 ? 'selected' : ''}>Last 24 hours</option>
                                <option value="72" ${this.currentWindow === 72 ? 'selected' : ''}>Last 3 days</option>
                                <option value="168" ${this.currentWindow === 168 ? 'selected' : ''}>Last 7 days</option>
                            </select>

                            <h3>📊 Digest Stats</h3>
                            <div class="trending-stats" id="trendingDigestStats">
                                <div class="stat-item">
                                    <span class="stat-value" id="totalPosts">--</span>
                                    <span class="stat-label">Active Posts</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value" id="activeUsers">--</span>
                                    <span class="stat-label">Participants</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value" id="newToday">--</span>
                                    <span class="stat-label">Topics</span>
                                </div>
                            </div>
                        </div>

                        <div class="trending-main-feed">
                            <div class="feed-header">
                                <div class="feed-controls">
                                    <div class="view-toggle">
                                        <button class="toggle-btn ${this.currentView === 'topics' ? 'active' : ''}" data-view="topics" data-trending-system-action="switchView">
                                            🏷️ Topics
                                        </button>
                                        <button class="toggle-btn ${this.currentView === 'posts' ? 'active' : ''}" data-view="posts" data-trending-system-action="switchView">
                                            📝 Posts
                                        </button>
                                        <button class="toggle-btn ${this.currentView === 'overview' ? 'active' : ''}" data-view="overview" data-trending-system-action="switchView">
                                            📊 Overview
                                        </button>
                                    </div>
                                    <div class="sort-controls">
                                        <select id="sortOrder" data-trending-control="sort">
                                            <option value="active" ${this.currentSort === 'top' || this.currentSort === 'relevant' ? '' : 'selected'}>🔥 Most Active</option>
                                            <option value="top" ${this.currentSort === 'top' ? 'selected' : ''}>⭐ Top Rated</option>
                                            <option value="relevant" ${this.currentSort === 'relevant' ? 'selected' : ''}>🎯 Most Relevant</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="feed-content" id="trendingFeedContent">
                                <div class="loading-placeholder">
                                    <div class="loading-spinner"></div>
                                    <p>Building the Trending Digest…</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add comprehensive styles for the main view
        this.addTrendingMainViewStyles();

        // Update panel positioning based on current sidebar state
        this.updatePanelForSidebarState();

        // Adjust map if needed (make it smaller/overlay)
        this.adjustMapForTrendingView();

        // Load trending content
        this.loadTrendingContent();
    }

    /**
     * Load the full Trending Digest snapshot for the selected scope/window.
     */
    async loadTrendingContent() {
        const contentContainer = document.querySelector('#trendingFeedContent');
        if (!contentContainer) return;

        contentContainer.innerHTML = `
            <div class="loading-placeholder">
                <div class="loading-spinner"></div>
                <p>Building the Trending Digest…</p>
            </div>
        `;

        try {
            // Always fetch the full catalog; category filtering is client-side
            // so switching tabs does not require another snapshot request.
            const params = new URLSearchParams({
                scope: this.currentScope,
                window: String(this.currentWindow)
            });
            const response = await apiCall(`/trending/digest?${params.toString()}`, {
                method: 'GET',
                bypassCache: true
            });
            const data = response?.data;
            if (!response?.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to load Trending Digest');
            }

            this.digestData = data;
            this.currentTopic = null;
            this.renderCategories(data.categories || []);
            this.updateTrendingStats(data);
            this.renderCurrentView();
        } catch (error) {
            adminDebugError('Failed to load trending digest:', error);
            contentContainer.innerHTML = `
                <div class="trending-error">
                    <div class="error-icon">🔥</div>
                    <h3>Could not load the Trending Digest</h3>
                    <p>${escapeHTML(error.message || 'Please try again.')}</p>
                    <button class="error-btn" data-trending-system-action="refreshTrending">Retry</button>
                </div>
            `;
        }
    }

    getFilteredTopics() {
        const topics = this.digestData?.topics || [];
        const category = String(this.currentCategory || 'overall').toLowerCase();
        if (!category || category === 'overall' || category === 'all') return topics;
        return topics.filter((topic) => String(topic.category || '').toLowerCase() === category);
    }

    getFilteredPosts() {
        const category = String(this.currentCategory || 'overall').toLowerCase();
        let posts;
        if (!category || category === 'overall' || category === 'all') {
            posts = this.digestData?.posts || [];
        } else {
            const seen = new Set();
            posts = this.getFilteredTopics()
                .flatMap((topic) => topic.posts || [])
                .filter((post) => {
                    if (seen.has(post.id)) return false;
                    seen.add(post.id);
                    return true;
                });
        }
        return this.sortPosts(posts, this.currentSort);
    }

    sortPosts(posts, sort = 'active') {
        const key = sort === 'top' ? 'topScore' : sort === 'relevant' ? 'relevanceScore' : 'activeScore';
        return [...posts].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
    }

    renderCurrentView() {
        const container = document.querySelector('#trendingFeedContent');
        if (!container || !this.digestData) return;

        document.querySelectorAll('.trending-main-view .toggle-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.view === this.currentView);
        });

        if (this.currentView === 'overview') {
            this.renderDigestOverview(container);
        } else if (this.currentView === 'posts') {
            this.renderDigestPosts(container);
        } else {
            this.renderDigestTopics(container);
        }
    }

    renderCategories(categories) {
        const container = document.querySelector('#trendingDigestCategories');
        if (!container) return;

        const items = [
            { name: 'Overall', value: 'overall', icon: '🌐' },
            ...categories.map((category) => ({
                name: category.name,
                value: category.name,
                icon: '🏷️'
            }))
        ];

        container.innerHTML = items.map((category) => `
            <button class="category-btn ${String(this.currentCategory).toLowerCase() === String(category.value).toLowerCase() ? 'active' : ''}"
                    data-category="${escapeHTML(category.value)}"
                    data-trending-system-action="filterByCategory">
                ${category.icon} ${escapeHTML(category.name)}
            </button>
        `).join('');
    }

    updateTrendingStats(data = this.digestData) {
        const topics = data?.topics || [];
        const totalPosts = topics.reduce((sum, topic) => sum + (topic.postCount || 0), 0);
        const participants = topics.reduce((sum, topic) => sum + (topic.participantCount || 0), 0);
        const totalTopics = topics.length;

        const totalPostsEl = document.querySelector('#totalPosts');
        const activeUsersEl = document.querySelector('#activeUsers');
        const newTodayEl = document.querySelector('#newToday');

        if (totalPostsEl) totalPostsEl.textContent = totalPosts;
        if (activeUsersEl) activeUsersEl.textContent = participants;
        if (newTodayEl) newTodayEl.textContent = totalTopics;
    }

    feelingBar(feeling) {
        if (!feeling || !feeling.total) {
            return `<div class="trending-feeling-bar empty"><span>No sentiment reactions yet</span></div>`;
        }
        const support = Math.max(0, feeling.supportPct || 0);
        const neutral = Math.max(0, feeling.neutralPct || 0);
        const oppose = Math.max(0, feeling.opposePct || 0);
        return `
            <div class="trending-feeling-bar" title="Support ${support}% · Neutral ${neutral}% · Oppose ${oppose}%">
                <span class="feeling-support" style="width:${support}%"></span>
                <span class="feeling-neutral" style="width:${neutral}%"></span>
                <span class="feeling-oppose" style="width:${oppose}%"></span>
            </div>
            <div class="trending-feeling-labels">
                <span>🙂 ${support}% support</span>
                <span>😐 ${neutral}% neutral</span>
                <span>😠 ${oppose}% oppose</span>
            </div>
        `;
    }

    topicCard(topic, featured = false) {
        const quotes = (topic.quotes || []).slice(0, 2);
        return `
            <div class="topic-card ${featured ? 'featured-topic' : ''}" data-topic-id="${escapeHTML(topic.id)}">
                <div class="topic-header">
                    <div class="topic-icon">🏷️</div>
                    <div class="topic-info">
                        <h3 class="topic-title">${escapeHTML(topic.title)}</h3>
                        <span class="topic-meta">${topic.postCount} posts • ${topic.participantCount} participants • ${escapeHTML(topic.category)}</span>
                    </div>
                    ${featured ? '<div class="trending-badge">🔥 Leading topic</div>' : ''}
                </div>

                <div class="topic-summary">
                    <p class="topic-neutral-summary">${escapeHTML(topic.summary || '')}</p>
                    <div class="prevailing-position">
                        <h4>📍 Prevailing position</h4>
                        <p>${escapeHTML(topic.prevailingPosition || '')}</p>
                    </div>
                    <div class="leading-critique">
                        <h4>⚡ Leading critique</h4>
                        <p>${escapeHTML(topic.leadingCritique || '')}</p>
                    </div>
                </div>

                ${this.feelingBar(topic.feeling)}

                ${quotes.length ? `
                    <div class="topic-quotes">
                        ${quotes.map((quote) => `
                            <button type="button" class="topic-quote" data-trending-system-action="openDigestPost" data-post-id="${escapeHTML(quote.postId)}">
                                “${escapeHTML(quote.content)}”
                                <span>— ${escapeHTML(quote.author)}</span>
                            </button>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="topic-engagement">
                    <button class="topic-btn primary" data-trending-system-action="enterTopicMode" data-topic-id="${escapeHTML(topic.id)}">
                        💬 View posts (${topic.postCount})
                    </button>
                </div>
            </div>
        `;
    }

    postCard(post) {
        const authorName = [post.author?.firstName, post.author?.lastName].filter(Boolean).join(' ') || post.author?.username || 'Someone';
        const initial = authorName.charAt(0).toUpperCase();
        return `
            <div class="trending-post" data-post-id="${escapeHTML(post.id)}" data-trending-system-action="openDigestPost">
                <div class="post-header">
                    <div class="user-avatar">${post.author?.avatar
                        ? `<img src="${escapeHTML(post.author.avatar)}" alt="">`
                        : escapeHTML(initial)}</div>
                    <div class="user-info">
                        <span class="username">${escapeHTML(authorName)}</span>
                        <span class="timestamp">${escapeHTML(getTimeAgo(new Date(post.createdAt)))}</span>
                    </div>
                </div>
                <div class="post-content"><p>${escapeHTML(post.content || '')}</p></div>
                <div class="post-engagement">
                    <span class="engagement-btn">🔥 ${Math.round(post.activeScore || 0)} activity</span>
                    ${post.topScore !== undefined ? `<span class="engagement-btn">⭐ ${Math.round(post.topScore * 10) / 10} quality</span>` : ''}
                    ${post.relevanceScore !== undefined ? `<span class="engagement-btn">🎯 ${post.relevanceScore} relevance</span>` : ''}
                </div>
            </div>
        `;
    }

    renderDigestTopics(container) {
        const topics = this.getFilteredTopics();
        if (topics.length === 0) {
            container.innerHTML = `
                <div class="trending-empty">
                    <h3>No trending topics yet</h3>
                    <p>Topics appear once at least 3 similar posts are active in the selected window and area.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `<div class="semantic-topics-container">
            ${topics.map((topic, index) => this.topicCard(topic, index === 0)).join('')}
        </div>`;
    }

    renderDigestPosts(container) {
        const posts = this.getFilteredPosts();
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="trending-empty">
                    <h3>No posts in this view</h3>
                    <p>Try a wider window or a different category.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `<div class="trending-posts-container">
            ${posts.map((post) => this.postCard(post)).join('')}
        </div>`;
    }

    renderDigestOverview(container) {
        const data = this.digestData;
        const topics = this.getFilteredTopics();
        container.innerHTML = `
            <div class="trending-overview">
                <section class="digest-overview-card">
                    <h2>📊 Today's overview</h2>
                    <p>${escapeHTML(data.dailyOverview || 'No digest overview available yet.')}</p>
                </section>

                <section class="digest-overview-card">
                    <h2>🏷️ Categories</h2>
                    <div class="digest-category-list">
                        ${(data.categories || []).map((category) => `
                            <button class="digest-category-row" data-trending-system-action="filterByCategory" data-category="${escapeHTML(category.name)}">
                                <span>${escapeHTML(category.name)}</span>
                                <span>${category.topicCount} topics</span>
                            </button>
                        `).join('') || '<p>No categories yet.</p>'}
                    </div>
                </section>

                <section class="digest-overview-card">
                    <h2>🔥 Leading topics</h2>
                    ${topics.slice(0, 3).map((topic) => `
                        <div class="digest-leading-topic">
                            <strong>${escapeHTML(topic.title)}</strong>
                            <div>${this.feelingBar(topic.feeling)}</div>
                        </div>
                    `).join('') || '<p>No topics yet.</p>'}
                </section>
            </div>
        `;
    }

    async showTopicDetail(topicId, sort = this.currentSort) {
        const container = document.querySelector('#trendingFeedContent');
        if (!container) return;

        this.currentSort = sort || 'active';
        this.currentTopic = (this.digestData?.topics || []).find((topic) => topic.id === topicId) || { id: topicId };
        container.innerHTML = `
            <div class="loading-placeholder">
                <div class="loading-spinner"></div>
                <p>Loading topic posts…</p>
            </div>
        `;

        try {
            const params = new URLSearchParams({
                scope: this.currentScope,
                window: String(this.currentWindow),
                sort: this.currentSort
            });
            const response = await apiCall(`/trending/topics/${encodeURIComponent(topicId)}/posts?${params.toString()}`, {
                method: 'GET',
                bypassCache: true
            });
            const topic = response?.data?.topic;
            if (!response?.ok || !topic) throw new Error('Topic not found');
            this.currentTopic = topic;
            this.renderTopicDetail(container, topic);
        } catch (error) {
            container.innerHTML = `
                <div class="trending-error">
                    <h3>Could not load this topic</h3>
                    <p>${escapeHTML(error.message || 'Please try again.')}</p>
                    <button class="error-btn" data-trending-system-action="backToDigest">Back to Digest</button>
                </div>
            `;
        }
    }

    renderTopicDetail(container, topic) {
        const posts = this.sortPosts(topic.posts || [], this.currentSort);
        container.innerHTML = `
            <div class="trending-topic-detail">
                <button class="header-btn secondary digest-back-btn" data-trending-system-action="backToDigest">← Back to Digest</button>
                <div class="topic-card featured-topic">
                    <div class="topic-header">
                        <div class="topic-icon">🏷️</div>
                        <div class="topic-info">
                            <h3 class="topic-title">${escapeHTML(topic.title)}</h3>
                            <span class="topic-meta">${topic.postCount} posts • ${topic.participantCount} participants • ${escapeHTML(topic.category)}</span>
                        </div>
                        <div class="trending-badge">🔥 Trending</div>
                    </div>
                    <div class="topic-summary">
                        <p class="topic-neutral-summary">${escapeHTML(topic.summary || '')}</p>
                        <div class="prevailing-position">
                            <h4>📍 Prevailing position</h4>
                            <p>${escapeHTML(topic.prevailingPosition || '')}</p>
                        </div>
                        <div class="leading-critique">
                            <h4>⚡ Leading critique</h4>
                            <p>${escapeHTML(topic.leadingCritique || '')}</p>
                        </div>
                    </div>
                    ${this.feelingBar(topic.feeling)}
                </div>

                <div class="digest-topic-sort">
                    <label>Sort posts</label>
                    <select data-trending-control="sort">
                        <option value="active" ${this.currentSort === 'active' ? 'selected' : ''}>🔥 Most Active</option>
                        <option value="top" ${this.currentSort === 'top' ? 'selected' : ''}>⭐ Top Rated</option>
                        <option value="relevant" ${this.currentSort === 'relevant' ? 'selected' : ''}>🎯 Most Relevant</option>
                    </select>
                </div>

                <div class="trending-posts-container">
                    ${posts.map((post) => this.postCard(post)).join('') || '<p>No posts in this topic.</p>'}
                </div>
            </div>
        `;
    }

    getTimeAgo(dateString) {
        return getTimeAgo(new Date(dateString));
    }

    filterByCategory(category) {
        this.currentCategory = category || 'overall';
        this.currentTopic = null;
        this.renderCategories(this.digestData?.categories || []);
        this.renderCurrentView();
    }

    switchView(view) {
        this.currentView = ['topics', 'posts', 'overview'].includes(view) ? view : 'topics';
        this.currentTopic = null;
        this.renderCurrentView();
    }

    changeSortOrder(order) {
        this.currentSort = ['active', 'top', 'relevant'].includes(order) ? order : 'active';
        if (this.currentTopic) {
            this.showTopicDetail(this.currentTopic.id, this.currentSort);
        } else {
            this.renderCurrentView();
        }
    }

    refreshTrending() {
        this.digestData = null;
        this.currentTopic = null;
        this.loadTrendingContent();
    }

    loadMoreTrending() {
        this.currentView = 'posts';
        this.currentTopic = null;
        this.renderCurrentView();
    }

    showTopicPreview(topicId) {
        this.showTopicDetail(topicId, this.currentSort);
    }

    enterTopicMode(topicId) {
        this.showTopicDetail(topicId, this.currentSort);
    }

    exitTopicMode() {
        this.currentTopic = null;
        this.renderCurrentView();
    }

    showTrendingFilters() {
        // Show filters modal
        this.showTrendingFiltersModal();
    }

    showTrendingFiltersModal() {
        const modal = document.createElement('div');
        modal.className = 'trending-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>🎯 Trending Filters</h3>
                    <button class="modal-close" data-trending-system-action="closeModal">×</button>
                </div>
                <div class="modal-body">
                    <div class="filter-options">
                        <div class="filter-section">
                            <h4>📅 Time Range</h4>
                            <div class="filter-group">
                                <label><input type="radio" name="timeRange" value="1h" checked> Last Hour</label>
                                <label><input type="radio" name="timeRange" value="24h"> Last 24 Hours</label>
                                <label><input type="radio" name="timeRange" value="7d"> Last Week</label>
                                <label><input type="radio" name="timeRange" value="30d"> Last Month</label>
                            </div>
                        </div>
                        
                        <div class="filter-section">
                            <h4>🏷️ Content Types</h4>
                            <div class="filter-group">
                                <label><input type="checkbox" checked> Political Content</label>
                                <label><input type="checkbox" checked> Community News</label>
                                <label><input type="checkbox" checked> Local Events</label>
                                <label><input type="checkbox" checked> General Discussion</label>
                            </div>
                        </div>
                        
                        <div class="filter-section">
                            <h4>🎯 Engagement Level</h4>
                            <div class="filter-group">
                                <label><input type="radio" name="engagement" value="all" checked> All Posts</label>
                                <label><input type="radio" name="engagement" value="high"> High Engagement Only</label>
                                <label><input type="radio" name="engagement" value="recent"> Recently Active</label>
                            </div>
                        </div>
                        
                        <div class="filter-actions">
                            <button class="filter-btn primary" data-trending-system-action="closeModal">Apply Filters</button>
                            <button class="filter-btn secondary" data-trending-system-action="closeModal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showTrendingSettings() {
        // Show settings modal for trending preferences
        const modal = document.createElement('div');
        modal.className = 'trending-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>⚙️ Trending Settings</h3>
                    <button class="modal-close" data-trending-system-action="closeModal">×</button>
                </div>
                <div class="modal-body">
                    <div class="settings-options">
                        <div class="setting-group">
                            <h4>🔄 Auto-Refresh</h4>
                            <label class="toggle-switch">
                                <input type="checkbox" checked>
                                <span class="slider"></span>
                                Auto-refresh trending content
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <h4>🔔 Notifications</h4>
                            <label class="toggle-switch">
                                <input type="checkbox">
                                <span class="slider"></span>
                                Notify about hot topics
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <h4>🎨 Display Preferences</h4>
                            <div class="radio-group">
                                <label><input type="radio" name="density" value="compact" checked> Compact View</label>
                                <label><input type="radio" name="density" value="comfortable"> Comfortable View</label>
                                <label><input type="radio" name="density" value="spacious"> Spacious View</label>
                            </div>
                        </div>
                        
                        <div class="settings-actions">
                            <button class="settings-btn primary" data-trending-system-action="closeModal">Save Settings</button>
                            <button class="settings-btn secondary" data-trending-system-action="closeModal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    addTrendingMainViewStyles() {
        // Check if styles already added
        if (document.querySelector('#trending-main-view-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'trending-main-view-styles';
        style.textContent = `
            .trending-main-view {
                left: 3.5vw;
                right: 26%;
                height: calc(100vh - 6vh);
                position: fixed;
                top: 6vh;
                background: #f5f5f5;
                overflow-y: auto;
                z-index: 15;
                box-sizing: border-box;
                transition: left 0.3s ease;
            }

            .trending-main-view.sidebar-expanded {
                left: 10.5vw;
            }

            .trending-header {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 2rem 2rem 1.5rem 2rem;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }

            .trending-header .header-content h1 {
                margin: 0 0 0.5rem 0;
                font-size: 2.5rem;
                font-weight: 600;
            }

            .trending-header .subtitle {
                margin: 0 0 1.5rem 0;
                font-size: 1.1rem;
                opacity: 0.9;
                font-weight: 300;
            }

            .trending-header .header-actions {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .header-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.95rem;
            }

            .header-btn.primary {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
            }

            .header-btn.primary:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-1px);
            }

            .header-btn.secondary {
                background: transparent;
                color: white;
                border: 1px solid rgba(255,255,255,0.5);
            }

            .header-btn.secondary:hover {
                background: rgba(255,255,255,0.1);
                border-color: white;
            }

            .trending-content {
                padding: 0;
                height: calc(100vh - 140px);
            }

            .content-layout {
                display: grid;
                grid-template-columns: 280px 1fr;
                height: 100%;
            }

            .trending-sidebar {
                background: white;
                border-right: 1px solid #e9ecef;
                padding: 1.5rem;
                overflow-y: auto;
            }

            .trending-sidebar h3 {
                margin: 0 0 1rem 0;
                color: #333;
                font-size: 1.1rem;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #ff6b35;
            }

            .category-filters {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 2rem;
            }

            .category-btn {
                padding: 0.75rem;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.9rem;
            }

            .category-btn.active {
                background: #ff6b35;
                color: white;
                border-color: #ff6b35;
            }

            .category-btn:hover:not(.active) {
                background: #e9ecef;
                border-color: #ff6b35;
            }

            .trending-stats {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .stat-item {
                text-align: center;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
            }

            .stat-value {
                display: block;
                font-size: 1.5rem;
                font-weight: bold;
                color: #ff6b35;
                margin-bottom: 0.25rem;
            }

            .stat-label {
                font-size: 0.85rem;
                color: #666;
            }

            .trending-main-feed {
                background: white;
                overflow-y: auto;
            }

            .feed-header {
                background: #f8f9fa;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid #e9ecef;
                position: sticky;
                top: 0;
                z-index: 10;
            }

            .feed-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
            }

            .view-toggle {
                display: flex;
                gap: 0.5rem;
            }

            .toggle-btn {
                padding: 0.5rem 1rem;
                background: transparent;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.2s;
            }

            .toggle-btn.active {
                background: #ff6b35;
                color: white;
                border-color: #ff6b35;
            }

            .toggle-btn:hover:not(.active) {
                border-color: #ff6b35;
            }

            .sort-controls select {
                padding: 0.5rem;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                background: white;
                font-size: 0.85rem;
            }

            .feed-content {
                padding: 1.5rem;
            }

            .loading-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 4rem 2rem;
                color: #666;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #ff6b35;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 1rem;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .trending-posts-container {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .trending-post {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 12px;
                padding: 1.5rem;
                transition: all 0.2s;
                position: relative;
            }

            .trending-post.featured {
                border-left: 4px solid #ff6b35;
                background: linear-gradient(135deg, #fff5f3, #ffffff);
            }

            .trending-post:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }

            .post-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .user-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #ff6b35;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }

            .user-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .username {
                font-weight: 600;
                color: #333;
            }

            .timestamp {
                font-size: 0.85rem;
                color: #666;
            }

            .trending-badge {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .popularity-score {
                background: #28a745;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .post-content h4 {
                margin: 0 0 0.5rem 0;
                color: #333;
                font-size: 1.1rem;
            }

            .post-content p {
                margin: 0 0 1rem 0;
                line-height: 1.6;
                color: #555;
            }

            .post-tags {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
                margin-bottom: 1rem;
            }

            .tag {
                background: #e9ecef;
                color: #495057;
                padding: 0.25rem 0.5rem;
                border-radius: 10px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .political-indicator {
                background: #e3f2fd;
                color: #1565c0;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
                display: inline-block;
                margin-top: 0.5rem;
            }

            .post-engagement {
                display: flex;
                gap: 1rem;
                padding-top: 1rem;
                border-top: 1px solid #e9ecef;
            }

            .engagement-btn {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 0.85rem;
                padding: 0.5rem;
                border-radius: 6px;
                transition: all 0.2s;
            }

            .engagement-btn:hover {
                background: #f8f9fa;
                color: #ff6b35;
            }

            .comments-section {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid #e9ecef;
            }

            .comments-section textarea {
                width: 100%;
                min-height: 60px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 0.75rem;
                font-size: 0.9rem;
                resize: vertical;
                font-family: inherit;
            }

            .comment-actions {
                margin-top: 0.5rem;
                display: flex;
                gap: 0.5rem;
            }

            .comment-actions button {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.2s;
            }

            .comment-actions button:first-child {
                background: #ff6b35;
                color: white;
            }

            .comment-actions button:last-child {
                background: #6c757d;
                color: white;
            }

            .load-more-container {
                text-align: center;
                padding: 2rem;
            }

            .load-more-btn {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 500;
                transition: all 0.2s;
            }

            .load-more-btn:hover {
                background: linear-gradient(135deg, #e55a2b, #d67e1a);
                transform: translateY(-1px);
            }

            /* Topics and Analytics Views */
            .topics-view, .analytics-view {
                padding: 2rem;
            }

            .topics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }

            .topic-card {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1.5rem;
                transition: all 0.2s;
            }

            .topic-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .topic-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .topic-name {
                font-weight: bold;
                color: #ff6b35;
            }

            .topic-count {
                font-size: 0.85rem;
                color: #666;
            }

            .topic-trend {
                font-size: 0.85rem;
                color: #28a745;
            }

            .analytics-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
                margin-top: 1rem;
            }

            .analytics-card {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1.5rem;
            }

            .metrics {
                display: flex;
                justify-content: space-around;
                margin-top: 1rem;
            }

            .metric {
                text-align: center;
            }

            .metric-value {
                display: block;
                font-size: 1.5rem;
                font-weight: bold;
                color: #ff6b35;
            }

            .metric-label {
                font-size: 0.85rem;
                color: #666;
            }

            /* Responsive Design */
            @media (max-width: 1200px) {
                .content-layout {
                    grid-template-columns: 240px 1fr;
                }
            }

            @media (max-width: 768px) {
                .content-layout {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto 1fr;
                }

                .trending-sidebar {
                    max-height: 200px;
                    overflow-y: auto;
                }

                .trending-header {
                    padding: 1.5rem 1rem;
                }

                .trending-header .header-content h1 {
                    font-size: 2rem;
                }

                .feed-controls {
                    flex-direction: column;
                    gap: 1rem;
                }

                .view-toggle {
                    justify-content: center;
                }

                .post-engagement {
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    adjustMapForTrendingView() {
        const mapContainer = document.querySelector('#mapContainer');
        if (mapContainer) {
            // Make map smaller and positioned as overlay
            mapContainer.style.cssText += `
                position: fixed !important;
                width: 300px !important;
                height: 200px !important;
                top: 70px !important;
                right: 20px !important;
                z-index: 1000 !important;
                border: 2px solid #ff6b35 !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                transition: all 0.3s ease !important;
            `;

            // Add a minimize/restore button to the map
            if (!mapContainer.querySelector('.map-toggle-btn')) {
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'map-toggle-btn';
                toggleBtn.innerHTML = '−';
                toggleBtn.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(255, 107, 53, 0.9);
                    color: white;
                    border: none;
                    width: 25px;
                    height: 25px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    z-index: 1001;
                `;
                
                toggleBtn.onclick = () => this.toggleMapSize();
                mapContainer.appendChild(toggleBtn);
            }
        }
    }

    toggleMapSize() {
        const mapContainer = document.querySelector('#mapContainer');
        const toggleBtn = document.querySelector('.map-toggle-btn');
        
        if (mapContainer && toggleBtn) {
            const isMinimized = mapContainer.style.height === '40px';
            
            if (isMinimized) {
                // Restore
                mapContainer.style.height = '200px';
                mapContainer.style.width = '300px';
                toggleBtn.innerHTML = '−';
            } else {
                // Minimize
                mapContainer.style.height = '40px';
                mapContainer.style.width = '150px';
                toggleBtn.innerHTML = '+';
            }
        }
    }

    restoreMainContent() {
        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main');
        
        if (mainContent) {
            mainContent.classList.remove('trending-main-active');
            
            if (mainContent.dataset.originalContent) {
                mainContent.innerHTML = mainContent.dataset.originalContent;
                delete mainContent.dataset.originalContent;
            }
            
            // Restore map to original state
            const mapContainer = document.querySelector('#mapContainer');
            if (mapContainer) {
                mapContainer.style.cssText = mapContainer.style.cssText.replace(/position: fixed.*?transition: all 0\.3s ease !important;/s, '');
                
                // Remove toggle button
                const toggleBtn = mapContainer.querySelector('.map-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.remove();
                }
            }
            
            adminDebugLog('✅ Restored main content');
        }
    }

    showTrendingError(message) {
        const contentContainer = document.querySelector('#trendingFeedContent');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="trending-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Trending Content</h3>
                    <p>${message}</p>
                    <div class="error-actions">
                        <button class="error-btn" data-trending-system-action="refreshTrending">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }

    setupSidebarMonitoring() {
        // Monitor sidebar state changes
        const sidebar = document.querySelector('#sidebar');
        if (sidebar) {
            // Use MutationObserver to watch for class changes on sidebar
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        this.updatePanelForSidebarState();
                    }
                });
            });
            
            observer.observe(sidebar, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            // Also check current state
            this.updatePanelForSidebarState();
        }
    }

    updatePanelForSidebarState() {
        const sidebar = document.querySelector('#sidebar');
        const trendingPanel = document.querySelector('.trending-main-view');
        
        if (sidebar && trendingPanel) {
            const isExpanded = sidebar.classList.contains('expanded');
            trendingPanel.classList.toggle('sidebar-expanded', isExpanded);
        }
    }

    async discoverMoreTopics() {
        this.showMessage('Discovering more topics...');
        await this.loadTrendingContent();
    }

    addSemanticTopicsStyles() {
        if (document.querySelector('#semantic-topics-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'semantic-topics-styles';
        style.textContent = `
            .semantic-topics-container {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .topic-card {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 12px;
                padding: 1.5rem;
                transition: all 0.2s;
            }
            
            .topic-card.featured-topic {
                border-left: 4px solid #ff6b35;
                background: linear-gradient(135deg, #fff5f3, #ffffff);
            }
            
            .topic-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }
            
            .topic-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .topic-icon {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #ff6b35;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
            }
            
            .topic-info {
                flex: 1;
            }
            
            .topic-title {
                margin: 0 0 0.25rem 0;
                color: #333;
                font-size: 1.2rem;
                font-weight: 600;
            }
            
            .topic-meta {
                color: #666;
                font-size: 0.9rem;
            }
            
            .topic-summary {
                margin-bottom: 1.5rem;
            }
            
            .prevailing-position, .leading-critique {
                margin-bottom: 1rem;
            }
            
            .topic-summary h4 {
                margin: 0 0 0.5rem 0;
                font-size: 0.95rem;
                color: #666;
            }
            
            .topic-summary p {
                margin: 0;
                line-height: 1.5;
                color: #555;
                background: #f8f9fa;
                padding: 0.75rem;
                border-radius: 6px;
                border-left: 3px solid #dee2e6;
            }
            
            .prevailing-position p {
                border-left-color: #28a745;
            }
            
            .leading-critique p {
                border-left-color: #dc3545;
            }
            
            .topic-engagement {
                display: flex;
                gap: 1rem;
            }
            
            .topic-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.9rem;
            }
            
            .topic-btn.primary {
                background: #ff6b35;
                color: white;
            }
            
            .topic-btn.primary:hover {
                background: #e55a2b;
                transform: translateY(-1px);
            }
            
            .topic-btn.secondary {
                background: transparent;
                color: #666;
                border: 1px solid #e9ecef;
            }
            
            .topic-btn.secondary:hover {
                border-color: #ff6b35;
                color: #ff6b35;
            }
        `;
        
        document.head.appendChild(style);
    }

    addTopicModeStyles() {
        if (document.querySelector('#topic-mode-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'topic-mode-styles';
        style.textContent = `
            .topic-mode-container {
                padding: 1rem;
                max-width: 800px;
                margin: 0 auto;
            }
            
            .topic-mode-header {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            }
            
            .topic-breadcrumb {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            
            .breadcrumb-btn {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                color: #666;
                text-decoration: none;
                transition: all 0.2s;
            }
            
            .breadcrumb-btn:hover {
                background: #e9ecef;
                color: #ff6b35;
            }
            
            .breadcrumb-divider {
                color: #ccc;
            }
            
            .current-topic {
                font-weight: 600;
                color: #333;
            }
            
            .topic-summary-compact p {
                margin: 0.5rem 0;
                color: #555;
                font-size: 0.9rem;
            }
            
            .topic-posts-feed {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .topic-post {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1rem;
                transition: all 0.2s;
            }
            
            .topic-post:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .no-posts {
                text-align: center;
                color: #666;
                padding: 2rem;
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
            }
        `;
        
        document.head.appendChild(style);
    }

    showMessage(message) {
        // Create a simple message notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-info';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #17a2b8;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Auto-initialize when script loads
const trendingIntegration = new TrendingSystemIntegration();

// ES6 Module Exports
export { TrendingSystemIntegration, trendingIntegration };
export default trendingIntegration;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.TrendingSystemIntegration = TrendingSystemIntegration;
    window.trendingSystemIntegration = trendingIntegration;
}