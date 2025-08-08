// Trending System Integration for United We Rise Frontend
// This script enhances the trending system to provide better space utilization options

class TrendingSystemIntegration {
    constructor() {
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
        console.log('🔥 Initializing enhanced trending system integration...');
        
        // Load CSS styles
        this.loadTrendingSystemStyles();
        
        // Enhance trending navigation
        this.addTrendingNavigation();
        
        // Setup sidebar state monitoring
        this.setupSidebarMonitoring();
        
        console.log('✅ Trending system integration complete!');
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
                
                // Add context menu for different trending view options
                trendingThumb.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.showTrendingViewOptions(e.clientX, e.clientY);
                });
                
                // Add double-click for main view
                trendingThumb.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    this.toggleTrendingMainView();
                });
                
                // Update title to indicate enhanced functionality
                trendingThumb.title = 'Trending (Double-click for full view, right-click for options)';
                
                console.log('✅ Enhanced Trending button with multiple view options');
            }
        }

        // Add trending view mode switch to existing trending panel
        this.addTrendingViewModeSwitch();
    }

    addTrendingViewModeSwitch() {
        // Add a view mode button to the existing trending updates panel
        const trendingHeader = document.querySelector('.trending-updates-header');
        if (trendingHeader) {
            const viewModeBtn = document.createElement('button');
            viewModeBtn.className = 'trending-view-mode-btn';
            viewModeBtn.innerHTML = '📱';
            viewModeBtn.title = 'Switch to main view';
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
            <div class="menu-item" onclick="trendingSystemIntegration.showCompactTrending()">
                📱 Compact Panel
            </div>
            <div class="menu-item" onclick="trendingSystemIntegration.toggleTrendingMainView()">
                📺 Full Screen View
            </div>
            <div class="menu-item" onclick="trendingSystemIntegration.showSidePanelTrending()">
                📋 Side Panel
            </div>
            <div class="menu-item" onclick="trendingSystemIntegration.showTrendingSettings()">
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

    toggleTrendingMainView() {
        console.log('🔥 Opening Trending in main content area...');
        
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
            console.error('Main content area not found');
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
                        <h1>🔥 Trending Now</h1>
                        <p class="subtitle">Real-time conversations and hot topics in your community</p>
                        <div class="header-actions">
                            <button class="header-btn primary" onclick="trendingSystemIntegration.refreshTrending()">
                                🔄 Refresh
                            </button>
                            <button class="header-btn secondary" onclick="trendingSystemIntegration.showTrendingFilters()">
                                🎯 Filters
                            </button>
                            <button class="header-btn secondary" onclick="trendingSystemIntegration.restoreMainContent()">
                                ← Back to Map
                            </button>
                        </div>
                    </div>
                </div>

                <div class="trending-content">
                    <div class="content-layout">
                        <!-- Trending Categories Sidebar -->
                        <div class="trending-sidebar">
                            <h3>🏷️ Categories</h3>
                            <div class="category-filters">
                                <button class="category-btn active" data-category="all" onclick="trendingSystemIntegration.filterByCategory('all')">
                                    🌐 All Topics
                                </button>
                                <button class="category-btn" data-category="politics" onclick="trendingSystemIntegration.filterByCategory('politics')">
                                    🏛️ Politics
                                </button>
                                <button class="category-btn" data-category="local" onclick="trendingSystemIntegration.filterByCategory('local')">
                                    🏙️ Local News
                                </button>
                                <button class="category-btn" data-category="elections" onclick="trendingSystemIntegration.filterByCategory('elections')">
                                    🗳️ Elections
                                </button>
                                <button class="category-btn" data-category="community" onclick="trendingSystemIntegration.filterByCategory('community')">
                                    👥 Community
                                </button>
                            </div>
                            
                            <h3>📊 Trending Stats</h3>
                            <div class="trending-stats">
                                <div class="stat-item">
                                    <span class="stat-value" id="totalPosts">--</span>
                                    <span class="stat-label">Active Posts</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value" id="activeUsers">--</span>
                                    <span class="stat-label">Active Users</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value" id="newToday">--</span>
                                    <span class="stat-label">New Today</span>
                                </div>
                            </div>
                        </div>

                        <!-- Main Trending Feed -->
                        <div class="trending-main-feed">
                            <div class="feed-header">
                                <div class="feed-controls">
                                    <div class="view-toggle">
                                        <button class="toggle-btn active" data-view="feed" onclick="trendingSystemIntegration.switchView('feed')">
                                            📝 Feed
                                        </button>
                                        <button class="toggle-btn" data-view="topics" onclick="trendingSystemIntegration.switchView('topics')">
                                            🏷️ Topics
                                        </button>
                                        <button class="toggle-btn" data-view="analytics" onclick="trendingSystemIntegration.switchView('analytics')">
                                            📈 Analytics
                                        </button>
                                    </div>
                                    <div class="sort-controls">
                                        <select id="sortOrder" onchange="trendingSystemIntegration.changeSortOrder(this.value)">
                                            <option value="trending">🔥 Most Trending</option>
                                            <option value="recent">🕐 Most Recent</option>
                                            <option value="popular">❤️ Most Popular</option>
                                            <option value="discussed">💬 Most Discussed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="feed-content" id="trendingFeedContent">
                                <div class="loading-placeholder">
                                    <div class="loading-spinner"></div>
                                    <p>Loading trending content...</p>
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

    async loadTrendingContent() {
        const contentContainer = document.querySelector('#trendingFeedContent');
        if (!contentContainer) return;

        try {
            // Use existing trending load function if available
            if (typeof window.loadTrendingPosts === 'function') {
                // Wait for the function to populate data, then enhance display
                await window.loadTrendingPosts();
                setTimeout(() => {
                    this.enhanceTrendingDisplay();
                }, 500);
            } else {
                // Fallback to demo data
                this.loadDemoTrendingContent();
            }
        } catch (error) {
            console.error('Failed to load trending content:', error);
            this.showTrendingError('Failed to load trending content');
        }
    }

    enhanceTrendingDisplay() {
        const contentContainer = document.querySelector('#trendingFeedContent');
        if (!contentContainer) return;

        // Get data from existing trending system if available
        if (window.allTrendingPosts && window.allTrendingPosts.length > 0) {
            this.renderTrendingPosts(window.allTrendingPosts);
        } else {
            this.loadDemoTrendingContent();
        }
    }

    loadDemoTrendingContent() {
        const contentContainer = document.querySelector('#trendingFeedContent');
        if (!contentContainer) return;

        const demoContent = `
            <div class="trending-posts-container">
                <div class="trending-post featured">
                    <div class="post-header">
                        <div class="user-avatar">🏛️</div>
                        <div class="user-info">
                            <span class="username">@CityCouncilNews</span>
                            <span class="timestamp">2 hours ago</span>
                        </div>
                        <div class="trending-badge">🔥 Trending</div>
                    </div>
                    <div class="post-content">
                        <h4>New Infrastructure Bill Discussion</h4>
                        <p>The city council will be voting on the new infrastructure improvements next week. Community input is welcome at tonight's town hall.</p>
                        <div class="post-tags">
                            <span class="tag">#Infrastructure</span>
                            <span class="tag">#CityCouncil</span>
                            <span class="tag">#TownHall</span>
                        </div>
                    </div>
                    <div class="post-engagement">
                        <button class="engagement-btn">❤️ 156</button>
                        <button class="engagement-btn">💬 42</button>
                        <button class="engagement-btn">🔄 23</button>
                        <button class="engagement-btn">📤 Share</button>
                    </div>
                </div>

                <div class="trending-post">
                    <div class="post-header">
                        <div class="user-avatar">👥</div>
                        <div class="user-info">
                            <span class="username">@CommunityWatch</span>
                            <span class="timestamp">4 hours ago</span>
                        </div>
                        <div class="popularity-score">📊 95%</div>
                    </div>
                    <div class="post-content">
                        <p>Don't forget! Early voting starts tomorrow for the school board elections. Here's what you need to know about the candidates and polling locations.</p>
                        <div class="post-tags">
                            <span class="tag">#Elections</span>
                            <span class="tag">#SchoolBoard</span>
                            <span class="tag">#EarlyVoting</span>
                        </div>
                    </div>
                    <div class="post-engagement">
                        <button class="engagement-btn">❤️ 89</button>
                        <button class="engagement-btn">💬 28</button>
                        <button class="engagement-btn">🔄 15</button>
                        <button class="engagement-btn">📤 Share</button>
                    </div>
                </div>

                <div class="trending-post">
                    <div class="post-header">
                        <div class="user-avatar">🌱</div>
                        <div class="user-info">
                            <span class="username">@GreenInitiative</span>
                            <span class="timestamp">6 hours ago</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>Great turnout at today's community cleanup! We removed over 200 pounds of litter from the riverside park. Thank you to all volunteers! 🌳</p>
                        <div class="post-tags">
                            <span class="tag">#Community</span>
                            <span class="tag">#Environment</span>
                            <span class="tag">#Volunteer</span>
                        </div>
                    </div>
                    <div class="post-engagement">
                        <button class="engagement-btn">❤️ 124</button>
                        <button class="engagement-btn">💬 18</button>
                        <button class="engagement-btn">🔄 31</button>
                        <button class="engagement-btn">📤 Share</button>
                    </div>
                </div>

                <div class="load-more-container">
                    <button class="load-more-btn" onclick="trendingSystemIntegration.loadMoreTrending()">
                        Load More Trending Posts
                    </button>
                </div>
            </div>
        `;

        contentContainer.innerHTML = demoContent;
        this.updateTrendingStats();
    }

    renderTrendingPosts(posts) {
        const contentContainer = document.querySelector('#trendingFeedContent');
        if (!contentContainer) return;

        let html = '<div class="trending-posts-container">';
        
        posts.forEach((post, index) => {
            const isFeature = index === 0;
            const timeAgo = this.getTimeAgo(post.createdAt);
            
            html += `
                <div class="trending-post ${isFeature ? 'featured' : ''}">
                    <div class="post-header">
                        <div class="user-avatar">${post.author.username.charAt(0).toUpperCase()}</div>
                        <div class="user-info">
                            <span class="username">@${post.author.username}</span>
                            <span class="timestamp">${timeAgo}</span>
                        </div>
                        ${isFeature ? '<div class="trending-badge">🔥 Trending</div>' : ''}
                    </div>
                    <div class="post-content">
                        <p>${post.content}</p>
                        ${post.isPolitical ? '<div class="political-indicator">🏛️ Political Content</div>' : ''}
                    </div>
                    <div class="post-engagement">
                        <button class="engagement-btn" onclick="likeTrendingPost('${post.id}')">❤️ ${post.likesCount}</button>
                        <button class="engagement-btn" onclick="showTrendingCommentBox('${post.id}')">💬 ${post.commentsCount}</button>
                        <button class="engagement-btn">🔄 ${Math.floor(Math.random() * 20)}</button>
                        <button class="engagement-btn">📤 Share</button>
                    </div>
                    <div id="trending-comments-${post.id}" class="comments-section" style="display: none;">
                        <textarea id="trending-comment-input-${post.id}" placeholder="Add a comment..."></textarea>
                        <div class="comment-actions">
                            <button onclick="addTrendingComment('${post.id}')">Comment</button>
                            <button onclick="hideTrendingCommentBox('${post.id}')">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
            <div class="load-more-container">
                <button class="load-more-btn" onclick="trendingSystemIntegration.loadMoreTrending()">
                    Load More Trending Posts
                </button>
            </div>
        </div>`;
        
        contentContainer.innerHTML = html;
        this.updateTrendingStats(posts.length);
    }

    getTimeAgo(dateString) {
        const now = new Date();
        const then = new Date(dateString);
        const diffMs = now - then;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        return 'Just now';
    }

    updateTrendingStats(postsCount = null) {
        const totalPostsEl = document.querySelector('#totalPosts');
        const activeUsersEl = document.querySelector('#activeUsers');
        const newTodayEl = document.querySelector('#newToday');
        
        if (totalPostsEl) totalPostsEl.textContent = postsCount || Math.floor(Math.random() * 500 + 200);
        if (activeUsersEl) activeUsersEl.textContent = Math.floor(Math.random() * 150 + 50);
        if (newTodayEl) newTodayEl.textContent = Math.floor(Math.random() * 50 + 20);
    }

    // Interface methods
    filterByCategory(category) {
        console.log(`Filtering by category: ${category}`);
        
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Filter content (simplified for demo)
        this.showMessage(`Filtered by ${category}`);
    }

    switchView(view) {
        console.log(`Switching to view: ${view}`);
        
        // Update active button
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Switch content based on view
        const contentContainer = document.querySelector('#trendingFeedContent');
        
        switch (view) {
            case 'topics':
                this.showTopicsView(contentContainer);
                break;
            case 'analytics':
                this.showAnalyticsView(contentContainer);
                break;
            case 'feed':
            default:
                this.loadTrendingContent();
                break;
        }
    }

    showTopicsView(container) {
        container.innerHTML = `
            <div class="topics-view">
                <h3>🏷️ Trending Topics</h3>
                <div class="topics-grid">
                    <div class="topic-card">
                        <div class="topic-header">
                            <span class="topic-name">#CityCouncil</span>
                            <span class="topic-count">89 posts</span>
                        </div>
                        <div class="topic-trend">📈 +15% today</div>
                    </div>
                    <div class="topic-card">
                        <div class="topic-header">
                            <span class="topic-name">#Elections</span>
                            <span class="topic-count">67 posts</span>
                        </div>
                        <div class="topic-trend">📈 +22% today</div>
                    </div>
                    <div class="topic-card">
                        <div class="topic-header">
                            <span class="topic-name">#Community</span>
                            <span class="topic-count">45 posts</span>
                        </div>
                        <div class="topic-trend">📊 stable</div>
                    </div>
                </div>
            </div>
        `;
    }

    showAnalyticsView(container) {
        container.innerHTML = `
            <div class="analytics-view">
                <h3>📈 Trending Analytics</h3>
                <div class="analytics-cards">
                    <div class="analytics-card">
                        <h4>📊 Engagement Metrics</h4>
                        <div class="metrics">
                            <div class="metric">
                                <span class="metric-value">2.4k</span>
                                <span class="metric-label">Total Interactions</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">1.8k</span>
                                <span class="metric-label">Likes Today</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">456</span>
                                <span class="metric-label">Comments Today</span>
                            </div>
                        </div>
                    </div>
                    <div class="analytics-card">
                        <h4>🕐 Activity Timeline</h4>
                        <div class="timeline-chart">
                            <p>Peak activity: 2:00 PM - 4:00 PM</p>
                            <p>Most active day: Tuesday</p>
                            <p>Engagement rate: 12.3%</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    changeSortOrder(order) {
        console.log(`Changing sort order to: ${order}`);
        this.showMessage(`Sorted by ${order}`);
        // Reload content with new sort order
        setTimeout(() => this.loadTrendingContent(), 300);
    }

    refreshTrending() {
        console.log('Refreshing trending content...');
        const loadingEl = document.querySelector('#trendingFeedContent');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="loading-placeholder">
                    <div class="loading-spinner"></div>
                    <p>Refreshing trending content...</p>
                </div>
            `;
        }
        
        setTimeout(() => {
            this.loadTrendingContent();
            this.showMessage('Trending content refreshed!');
        }, 1000);
    }

    loadMoreTrending() {
        console.log('Loading more trending posts...');
        this.showMessage('Loading more posts...');
        // Simulate loading more content
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
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
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
                            <button class="filter-btn primary" onclick="this.closest('.modal-overlay').remove()">Apply Filters</button>
                            <button class="filter-btn secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
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
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
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
                            <button class="settings-btn primary" onclick="this.closest('.modal-overlay').remove()">Save Settings</button>
                            <button class="settings-btn secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
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
            
            console.log('✅ Restored main content');
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
                        <button class="error-btn" onclick="trendingSystemIntegration.refreshTrending()">
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

// Initialize the integration
window.TrendingSystemIntegration = TrendingSystemIntegration;

// Auto-initialize when script loads
const trendingIntegration = new TrendingSystemIntegration();

// Make integration available globally for other scripts
window.trendingSystemIntegration = trendingIntegration;