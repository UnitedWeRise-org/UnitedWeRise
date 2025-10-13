/**
 * Navigation Handler ES6 Module
 * Manages all navigation functionality including panel toggles, sidebar controls, and view management
 */

import { getEnvironment } from '../utils/environment.js';

class NavigationHandlers {
    constructor() {
        this.currentPanel = null;
        this.mapContainer = null;
        this.setupEventListeners();

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('NavigationHandlers', 'Navigation system initialized');
        }
    }

    setupEventListeners() {
        // Setup event delegation for navigation controls
        document.addEventListener('click', this.handleNavigationClick.bind(this));

        // Setup change event delegation for checkboxes and form elements
        document.addEventListener('change', this.handleNavigationChange.bind(this));

        // Setup specific handlers that need initialization timing
        this.setupCollapseButton();
        this.setupCloseButton();
        this.setupSidebarMapButton();
        this.setupSidebarToggle();
    }

    handleNavigationChange(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const layer = target.dataset.layer;

        switch (action) {
            case 'toggle-map-layer':
                if (typeof window.toggleMapLayer === 'function' && layer) {
                    window.toggleMapLayer(layer);
                }
                break;
            case 'handle-post-media-upload':
                console.log('🔧 Media upload event detected, calling UnifiedPostCreator');
                if (typeof window.unifiedPostCreator !== 'undefined') {
                    // Find the file input element - target might be the label or input itself
                    const fileInput = target.type === 'file' ? target : target.querySelector('input[type="file"]') || document.getElementById(target.getAttribute('for'));
                    if (fileInput) {
                        console.log('📷 Found file input element:', fileInput.id);
                        window.unifiedPostCreator.handleMediaSelection(fileInput);
                    } else {
                        console.error('🔧 Could not find file input element for media upload');
                    }
                } else {
                    console.error('🔧 UnifiedPostCreator not available on window');
                }
                break;
            case 'update-civic-results':
                if (typeof window.updateCivicResults === 'function') {
                    window.updateCivicResults();
                }
                break;
        }
    }

    handleNavigationClick(event) {
        const target = event.target.closest('[data-nav-toggle], [data-nav-action], [data-action]');
        if (!target) return;

        // Don't prevent default behavior for file inputs - they need to open file picker
        if (target.type !== 'file') {
            event.preventDefault();
            event.stopPropagation();
        }

        const action = target.dataset.navToggle || target.dataset.navAction || target.dataset.action;

        switch (action) {
            // Existing navigation actions
            case 'feed':
                this.toggleMyFeed();
                break;
            case 'trending':
                this.toggleTrendingPanel();
                break;
            case 'messages':
                this.toggleMessages();
                break;
            case 'organizing':
                this.openCivicOrganizing();
                break;
            case 'map':
                this.showMapFromSidebar();
                break;
            case 'logout':
                this.logout();
                break;
            case 'close-trending':
                this.closePanel('trending');
                break;
            case 'close-officials':
                this.closePanel('officials');
                break;
            case 'show-elections':
                // Trigger modern elections system
                if (window.electionsSystemIntegration && typeof window.electionsSystemIntegration.toggleElectionsPanel === 'function') {
                    window.electionsSystemIntegration.toggleElectionsPanel();
                } else {
                    console.warn('Elections system not available');
                }
                break;

            // Authentication actions
            case 'open-auth-login':
                if (typeof window.openAuthModal === 'function') {
                    window.openAuthModal('login');
                }
                break;
            case 'open-auth-register':
                if (typeof window.openAuthModal === 'function') {
                    window.openAuthModal('register');
                }
                break;
            case 'close-auth-modal':
                if (typeof window.closeAuthModal === 'function') {
                    window.closeAuthModal();
                }
                break;
            case 'switch-to-login':
                if (typeof window.switchToLogin === 'function') {
                    window.switchToLogin();
                }
                break;
            case 'switch-to-register':
                if (typeof window.switchToRegister === 'function') {
                    window.switchToRegister();
                }
                break;
            case 'handle-login':
                if (typeof window.handleLogin === 'function') {
                    window.handleLogin();
                }
                break;
            case 'handle-register':
                if (typeof window.handleRegister === 'function') {
                    window.handleRegister();
                }
                break;

            // Modal actions
            case 'close-legal-modal':
                if (typeof window.closeLegalModal === 'function') {
                    window.closeLegalModal();
                }
                break;
            case 'open-legal-terms':
                event.preventDefault();
                if (typeof window.openLegalModal === 'function') {
                    window.openLegalModal('terms');
                }
                break;
            case 'open-legal-privacy':
                event.preventDefault();
                if (typeof window.openLegalModal === 'function') {
                    window.openLegalModal('privacy');
                }
                break;

            // Notification actions
            case 'toggle-notifications':
                if (typeof window.toggleNotifications === 'function') {
                    window.toggleNotifications();
                }
                break;

            // Profile actions
            case 'toggle-profile':
                if (typeof window.toggleProfile === 'function') {
                    window.toggleProfile();
                }
                break;

            // Donation actions
            case 'open-donation':
                if (window.donationSystem && window.donationSystem.openDonationModal) {
                    window.donationSystem.openDonationModal();
                } else {
                    alert('Donation system loading...');
                }
                break;

            // Navigation to home
            case 'navigate-home':
                window.location.href = '/';
                break;

            // Mobile navigation
            case 'mobile-feed':
                if (typeof window.showMobileFeed === 'function') {
                    window.showMobileFeed();
                }
                break;
            case 'mobile-discover':
                // Show posts container with discover feed
                {
                    const postsContainer = document.querySelector('.posts-container');
                    if (postsContainer) {
                        postsContainer.style.display = 'block';
                    }
                    // Use FeedToggle if available
                    if (window.feedToggle && typeof window.feedToggle.switchFeed === 'function') {
                        window.feedToggle.switchFeed('discover');
                    } else if (typeof loadMyFeedPosts === 'function') {
                        loadMyFeedPosts();
                    }
                }
                break;
            case 'mobile-search':
                if (typeof window.showMobileSearch === 'function') {
                    window.showMobileSearch();
                }
                break;
            case 'mobile-map':
                if (typeof window.showMobileMap === 'function') {
                    window.showMobileMap();
                }
                break;
            case 'mobile-profile':
                if (typeof window.showMobileProfile === 'function') {
                    window.showMobileProfile();
                }
                break;
            case 'mobile-messages':
                if (typeof window.showMobileMessages === 'function') {
                    window.showMobileMessages();
                }
                break;
            case 'mobile-post':
                // Show My Feed with post creation area
                if (typeof window.showMyFeed === 'function') {
                    window.showMyFeed();
                    // Focus the post creation textarea after feed loads
                    setTimeout(() => {
                        const textarea = document.getElementById('feedPostContent');
                        if (textarea) {
                            textarea.focus();
                            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 300);
                } else {
                    console.error('showMyFeed function not available');
                    alert('Post creation is loading. Please try again in a moment.');
                }
                break;
            case 'mobile-notifications':
                // Toggle notifications panel
                if (typeof window.toggleNotifications === 'function') {
                    window.toggleNotifications();
                } else {
                    console.warn('Notifications system not available');
                }
                break;
            case 'mobile-info':
                // Open About modal
                const aboutModal = document.getElementById('aboutModal');
                if (aboutModal) {
                    aboutModal.style.display = 'block';
                    aboutModal.classList.add('show');
                } else {
                    console.warn('About modal not found');
                }
                break;

            // Feed navigation actions
            case 'feed-discover':
                if (window.feedToggle && typeof window.feedToggle.switchFeed === 'function') {
                    window.feedToggle.switchFeed('discover');
                }
                break;
            case 'feed-following':
                if (window.feedToggle && typeof window.feedToggle.switchFeed === 'function') {
                    window.feedToggle.switchFeed('following');
                }
                break;
            case 'feed-trending':
                // Show trending topics in feed
                if (typeof window.showTrendingTopics === 'function') {
                    window.showTrendingTopics();
                } else {
                    console.warn('Trending topics not implemented yet');
                }
                break;
            case 'feed-saved':
                // Show saved posts view
                if (window.savedPostsView && typeof window.savedPostsView.show === 'function') {
                    window.savedPostsView.show();
                } else {
                    console.error('SavedPostsView not available');
                    alert('Saved Posts feature is loading. Please try again in a moment.');
                }
                break;

            // Civic actions
            case 'civic-elections':
                if (typeof window.showElections === 'function') {
                    window.showElections();
                } else {
                    console.warn('Elections system not available');
                }
                break;
            case 'civic-officials':
                if (typeof window.showOfficials === 'function') {
                    window.showOfficials();
                } else {
                    console.warn('Officials system not available');
                }
                break;
            case 'civic-candidates':
                if (typeof window.showCandidates === 'function') {
                    window.showCandidates();
                } else {
                    console.warn('Candidates system not available');
                }
                break;
            case 'civic-organizing':
                if (typeof window.showCivicOrganizing === 'function') {
                    window.showCivicOrganizing();
                } else {
                    console.warn('Civic organizing not available');
                }
                break;

            // Combined alerts (messages + notifications)
            case 'mobile-alerts':
                // Show mobile-friendly alerts view in main content
                {
                    const mainContent = document.getElementById('mainContent');
                    if (!mainContent) {
                        console.error('mainContent not found');
                        return;
                    }

                    // Check if user is logged in
                    if (!window.currentUser) {
                        mainContent.innerHTML = `
                            <div style="padding: 3rem 2rem; text-align: center;">
                                <h2>📬 Alerts & Notifications</h2>
                                <p style="color: #666; margin-top: 1rem;">Please log in to view your notifications</p>
                                <button onclick="openAuthModal('login')" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #4b5c09; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                                    Log In
                                </button>
                            </div>
                        `;
                        return;
                    }

                    // Show loading state
                    mainContent.innerHTML = `
                        <div style="padding: 2rem; text-align: center;">
                            <h2>📬 Alerts & Notifications</h2>
                            <div style="margin-top: 2rem;">
                                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4b5c09; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                <p style="margin-top: 1rem; color: #666;">Loading notifications...</p>
                            </div>
                        </div>
                    `;

                    // Fetch and display notifications
                    if (typeof window.fetchNotifications === 'function') {
                        window.fetchNotifications().then(() => {
                            const notifications = window.notificationsCache || [];

                            if (notifications.length === 0) {
                                mainContent.innerHTML = `
                                    <div style="padding: 3rem 2rem; text-align: center;">
                                        <h2>📬 Alerts & Notifications</h2>
                                        <div style="margin-top: 2rem; font-size: 3rem; opacity: 0.3;">🔔</div>
                                        <p style="color: #666; margin-top: 1rem;">No notifications yet</p>
                                        <p style="color: #999; font-size: 0.9rem; margin-top: 0.5rem;">You'll see notifications here when you have new activity</p>
                                    </div>
                                `;
                            } else {
                                let notificationsHTML = `
                                    <div style="padding: 1.5rem;">
                                        <h2 style="margin-bottom: 1.5rem;">📬 Alerts & Notifications</h2>
                                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                `;

                                notifications.forEach(notif => {
                                    const timeAgo = window.getTimeAgo ? window.getTimeAgo(new Date(notif.createdAt)) : 'Recently';
                                    const isUnread = !notif.isRead;

                                    notificationsHTML += `
                                        <div onclick="window.handleNotificationClick && window.handleNotificationClick('${notif.id}')"
                                             style="padding: 1rem; background: ${isUnread ? '#f0f8ff' : 'white'}; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; border-left: 4px solid ${isUnread ? '#4b5c09' : '#ddd'};">
                                            <div style="font-weight: ${isUnread ? '600' : '400'};">${notif.message || 'New notification'}</div>
                                            <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">${timeAgo}</div>
                                        </div>
                                    `;
                                });

                                notificationsHTML += `
                                        </div>
                                        ${notifications.some(n => !n.isRead) ? `
                                            <button onclick="window.markAllNotificationsRead && window.markAllNotificationsRead()"
                                                    style="width: 100%; margin-top: 1.5rem; padding: 0.75rem; background: #4b5c09; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem;">
                                                Mark All as Read
                                            </button>
                                        ` : ''}
                                    </div>
                                `;

                                mainContent.innerHTML = notificationsHTML;
                            }
                        }).catch(error => {
                            console.error('Failed to fetch notifications:', error);
                            mainContent.innerHTML = `
                                <div style="padding: 3rem 2rem; text-align: center;">
                                    <h2>📬 Alerts & Notifications</h2>
                                    <div style="margin-top: 2rem; font-size: 3rem; opacity: 0.3;">⚠️</div>
                                    <p style="color: #666; margin-top: 1rem;">Failed to load notifications</p>
                                    <button onclick="document.querySelector('[data-action=\"mobile-alerts\"]').click()"
                                            style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #4b5c09; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                                        Retry
                                    </button>
                                </div>
                            `;
                        });
                    } else {
                        mainContent.innerHTML = `
                            <div style="padding: 3rem 2rem; text-align: center;">
                                <h2>📬 Alerts & Notifications</h2>
                                <p style="color: #666; margin-top: 1rem;">Notifications system is loading...</p>
                            </div>
                        `;
                    }
                }
                break;

            // Map navigation (dead link for now)
            case 'mobile-map':
                alert('Map feature temporarily disabled on mobile. Coming soon!');
                break;

            case 'mobile-hide-map':
                if (typeof window.hideMobileMap === 'function') {
                    window.hideMobileMap();
                }
                break;
            case 'close-civic-organizing':
                if (typeof window.closeCivicOrganizing === 'function') {
                    window.closeCivicOrganizing();
                }
                break;
            case 'create-petition':
                if (typeof window.showPetitionCreator === 'function') {
                    window.showPetitionCreator();
                }
                break;
            case 'organize-event':
                if (typeof window.showEventCreator === 'function') {
                    window.showEventCreator();
                }
                break;
            case 'find-events':
                if (typeof window.showCivicBrowser === 'function') {
                    window.showCivicBrowser();
                }
                break;
            case 'my-activities':
                if (typeof window.showMyOrganizing === 'function') {
                    window.showMyOrganizing();
                }
                break;

            // Detail panel actions
            case 'close-detail':
                if (typeof window.closeDetail === 'function') {
                    window.closeDetail();
                }
                break;

            // Messages toggle (duplicate action for compatibility)
            case 'toggle-messages':
                this.toggleMessages();
                break;

            // Map actions
            case 'toggle-map-view':
                const view = target.dataset.view;
                if (typeof window.toggleMapView === 'function' && view) {
                    window.toggleMapView(view);
                }
                break;
            case 'close-map':
                if (window.map && window.map.closeMap) {
                    window.map.closeMap();
                } else if (typeof window.closeMap === 'function') {
                    window.closeMap();
                }
                break;
            case 'toggle-layer-dropdown':
                if (typeof window.toggleLayerDropdown === 'function') {
                    window.toggleLayerDropdown();
                }
                break;
            case 'toggle-map-layer':
                const layer = target.dataset.layer;
                if (typeof window.toggleMapLayer === 'function' && layer) {
                    window.toggleMapLayer(layer);
                }
                break;

            // Trending actions
            case 'toggle-trending-expansion':
                if (typeof window.toggleTrendingExpansion === 'function') {
                    window.toggleTrendingExpansion();
                }
                break;

            // Badge and Quest actions
            case 'show-badge-vault':
                if (typeof window.badgeVault?.showVault === 'function') {
                    window.badgeVault.showVault();
                }
                break;
            case 'scroll-to-quests':
                const questContainer = document.getElementById('quest-progress-container');
                if (questContainer) {
                    questContainer.scrollIntoView({behavior: 'smooth'});
                }
                break;

            // Detail panel actions
            case 'open-detail':
                const detailTitle = target.dataset.detailTitle;
                const detailLevel = target.dataset.detailLevel;
                if (typeof window.openDetail === 'function' && detailTitle && detailLevel) {
                    window.openDetail(detailTitle, parseInt(detailLevel));
                }
                break;

            default:
                if (action.startsWith('panel-')) {
                    this.togglePanel(action.replace('panel-', ''));
                }
                break;
        }
    }

    // Panel Management Methods
    togglePanel(name) {
        const panel = document.getElementById(`panel-${name}`);
        if (!panel) return;

        const isHidden = panel.classList.contains('hidden');

        if (isHidden) {
            // Panel is hidden, show it (close others first)
            this.closeAllPanels();
            panel.classList.remove('hidden');
            this.currentPanel = name;

            // Load live data when panel opens (enhancement from critical-functions.js)
            // This ensures users always see fresh content when opening panels
            if (name === 'trending') {
                console.log('🔄 Loading live trending data...');
                if (window.loadTrendingPosts && typeof window.loadTrendingPosts === 'function') {
                    window.loadTrendingPosts();
                }
            } else if (name === 'officials') {
                console.log('🔄 Loading live officials content...');
                if (window.loadOfficialsContent && typeof window.loadOfficialsContent === 'function') {
                    window.loadOfficialsContent();
                }
            }
        } else {
            // Panel is visible, hide it and show default view
            panel.classList.add('hidden');
            this.currentPanel = null;
            this.showDefaultView();
        }
    }

    closePanel(name) {
        const panel = document.getElementById(`panel-${name}`);
        if (panel) {
            panel.classList.add('hidden');
            if (this.currentPanel === name) {
                this.currentPanel = null;
            }
        }
    }

    closeAllPanels() {
        document.querySelectorAll('.info-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById('detail-panel')?.classList.add('hidden');
        this.currentPanel = null;
    }

    resetPanelsToDefault() {
        const officialsContent = document.getElementById('officialsContent');
        if (officialsContent) {
            officialsContent.innerHTML = '<p>Please log in and set your address to see your elected officials.</p>';
        }
    }

    // Core Navigation Functions
    toggleMyFeed() {
        if (!window.currentUser) {
            document.getElementById('mainContent').innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2>Please log in to view your feed</h2>
                    <button onclick="openAuthModal('login')" class="btn">Log In</button>
                </div>
            `;
            return;
        }

        const mainContent = document.getElementById('mainContent');
        const isFeedCurrentlyShown = mainContent.querySelector('.my-feed') !== null;

        if (isFeedCurrentlyShown) {
            // Feed is currently shown, hide it and show default view
            this.showDefaultView();
        } else {
            // Feed is not shown, show it
            this.showMyFeedInMain();
        }
    }

    async showMyFeedInMain() {
        console.log('🎯 Showing My Feed in main content area');

        // Hide other main view systems
        this.hideOtherMainViews();

        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="my-feed">
                <div class="my-feed-header">
                    <h2>My Feed</h2>
                    <div class="feed-controls">
                        <!-- Feed controls will be added here -->
                    </div>
                </div>
                <div class="feed-content" id="myFeedContainer">
                    <div style="text-align: center; padding: 2rem;">
                        <div class="loading-spinner">Loading your feed...</div>
                    </div>
                </div>
            </div>
        `;

        // Load the actual feed content
        if (typeof window.showMyFeed === 'function') {
            await window.showMyFeed();
        }
    }

    hideOtherMainViews() {
        // Hide Civic Organizing container
        const civicOrganizing = document.querySelector('.civic-organizing-container');
        if (civicOrganizing) {
            civicOrganizing.style.display = 'none';
        }

        // Hide other main view systems
        const viewSelectors = [
            '.elections-main-view',
            '.officials-main-view',
            '.candidates-main-view'
        ];

        viewSelectors.forEach(selector => {
            const view = document.querySelector(selector);
            if (view) {
                view.style.display = 'none';
            }
        });
    }

    toggleTrendingPanel() {
        const panel = document.getElementById('trendingUpdates');
        if (!panel) return;

        if (panel.classList.contains('show')) {
            panel.classList.remove('show');
        } else {
            if (typeof window.loadTrendingUpdates === 'function') {
                window.loadTrendingUpdates(); // Load fresh data
            }
            panel.classList.add('show');
        }
    }

    toggleMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        if (container.style.display === 'none' || !container.style.display) {
            container.style.display = 'block';
            if (typeof window.loadConversations === 'function') {
                window.loadConversations();
            }
        } else {
            container.style.display = 'none';
            // Show default view when messages are closed
            this.showDefaultView();
        }
    }

    openCivicOrganizing() {
        if (!window.currentUser) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please log in to access organizing tools');
            }
            return;
        }

        // Hide other main view systems when opening
        this.hideOtherMainViews();

        // Hide other panels
        document.querySelectorAll('.detail-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        document.querySelectorAll('.info-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        const container = document.getElementById('civicOrganizingContainer');
        if (container) {
            container.style.display = 'flex';
        }

        // Update sidebar state awareness
        if (typeof window.updateCivicOrganizingForSidebarState === 'function') {
            window.updateCivicOrganizingForSidebarState();
        }

        this.closeAllPanels(); // Close other panels

        if (typeof window.showDefaultOrganizingView === 'function') {
            window.showDefaultOrganizingView();
        }
    }

    showDefaultView() {
        // Hide all side panels
        const profilePanel = document.getElementById('profilePanel');
        if (profilePanel) {
            profilePanel.style.display = 'none';
        }

        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.style.display = 'none';
        }

        this.closeAllPanels();

        // Show My Feed in main content area as default, or map if user is not logged in
        if (window.currentUser) {
            this.showMyFeedInMain();
        } else {
            // For logged-out users, show the map or welcome screen
            if (window.map && typeof window.map.showMap === 'function') {
                window.map.showMap();
            } else {
                // Fallback to welcome screen
                document.getElementById('mainContent').innerHTML = `
                    <div style="text-align: center; padding: 3rem;">
                        <h2>Welcome to United We Rise</h2>
                        <p>Connect with your community and engage in meaningful political discourse.</p>
                        <button onclick="openAuthModal('login')" class="btn">Log In</button>
                        <button onclick="openAuthModal('register')" class="btn" style="margin-left: 1rem;">Sign Up</button>
                    </div>
                `;
            }
        }
    }

    showMapFromSidebar() {
        if (window.map && window.map.showMap) {
            console.log('✅ Calling window.map.showMap()');
            window.map.showMap();
        } else {
            console.log('⚠️ Fallback: showing map container directly');
            const mapContainer = document.getElementById('mapContainer');
            if (mapContainer) {
                mapContainer.style.display = 'block';
                localStorage.removeItem('mapClosed');

                // Hide sidebar button
                const mapThumb = document.getElementById('mapThumb');
                if (mapThumb) {
                    mapThumb.style.display = 'none';
                }
            }
        }
    }

    logout() {
        // Use the existing logout function from the auth system
        if (typeof window.logout === 'function') {
            window.logout();
        } else if (typeof window.Session?.logout === 'function') {
            window.Session.logout();
        } else {
            console.error('❌ No logout function available');
            if (typeof window.showToast === 'function') {
                window.showToast('Logout failed - please refresh the page');
            }
        }
    }

    // Sidebar Setup Functions
    setupCollapseButton() {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('UISystem', 'Setting up collapse button handler');
        }

        // Wait for DOM elements to be available
        setTimeout(() => {
            this.mapContainer = document.getElementById('mapContainer');
            const toggleBtn = document.getElementById('mapToggleBtn');

            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('UISystem', 'mapContainer found', !!this.mapContainer);
                adminDebugLog('UISystem', 'toggleBtn found', !!toggleBtn);
            }

            if (toggleBtn && this.mapContainer) {
                // Remove any existing listeners
                toggleBtn.replaceWith(toggleBtn.cloneNode(true));
                const newToggleBtn = document.getElementById('mapToggleBtn');

                // Add click handler
                newToggleBtn.addEventListener('click', this.handleCollapseClick.bind(this), false);

                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('UISystem', 'Collapse button handler attached successfully');
                }
            } else {
                if (typeof adminDebugError !== 'undefined') {
                    adminDebugError('UISystem', 'Could not find button or container elements');
                }
            }
        }, 2000); // Wait 2 seconds for map to fully load
    }

    handleCollapseClick(event) {
        event.preventDefault();
        event.stopPropagation();

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('UISystem', 'COLLAPSE BUTTON CLICKED');
        }

        // Debug current state
        const isCollapsed = this.mapContainer.classList.contains('collapsed');
        console.log('🔍 Current collapsed state:', isCollapsed);
        console.log('🔍 mapContainer classes before:', this.mapContainer.className);
        console.log('🔍 mapContainer computed width before:', getComputedStyle(this.mapContainer).width);

        // Hide bubbles before transition
        if (window.map && window.map.hideBubbles) {
            window.map.hideBubbles();
        }

        // Toggle the class
        this.mapContainer.classList.toggle('collapsed');
        const newIsCollapsed = this.mapContainer.classList.contains('collapsed');

        // Debug after toggle
        console.log('🔍 mapContainer classes after:', this.mapContainer.className);
        console.log('🔍 mapContainer computed width after:', getComputedStyle(this.mapContainer).width);

        // Update button text
        const toggleBtn = document.getElementById('mapToggleBtn');
        if (toggleBtn) {
            toggleBtn.textContent = isCollapsed ? 'Collapse' : 'Expand';

            // Visual feedback
            toggleBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                toggleBtn.style.transform = '';
            }, 150);
        }

        console.log(`✅ Map should now be ${isCollapsed ? 'expanded' : 'collapsed'}`);

        // Force a style recalculation
        this.mapContainer.offsetHeight; // Trigger reflow

        // Adjust map for new container size with appropriate zoom
        if (window.map && window.map.adjustForContainerState) {
            window.map.adjustForContainerState(newIsCollapsed);
        }

        // Show bubbles after transition completes
        if (window.map && window.map.showBubbles) {
            window.map.showBubbles();
        }
    }

    setupCloseButton() {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('UISystem', 'Setting up close button handler');
        }

        setTimeout(() => {
            const closeBtn = document.querySelector('.map-action-btn.close-btn');
            console.log('🔍 closeBtn found:', !!closeBtn);

            if (closeBtn) {
                // Remove existing onclick and replace with proper handler
                closeBtn.removeAttribute('onclick');
                closeBtn.addEventListener('click', this.handleCloseClick.bind(this));

                console.log('✅ Close button handler attached successfully');
            } else {
                console.error('❌ Could not find close button element');
            }
        }, 2000);
    }

    handleCloseClick(event) {
        event.preventDefault();
        event.stopPropagation();

        console.log('🔥 CLOSE BUTTON CLICKED!');

        if (window.map && window.map.closeMap) {
            console.log('✅ Calling window.map.closeMap()');
            window.map.closeMap();
        } else {
            console.log('⚠️ Fallback: hiding map container directly');
            const mapContainer = document.getElementById('mapContainer');
            if (mapContainer) {
                mapContainer.style.display = 'none';
                localStorage.setItem('mapClosed', 'true');

                // Show sidebar button
                const mapThumb = document.getElementById('mapThumb');
                if (mapThumb) {
                    mapThumb.style.display = 'block';
                }
            }
        }
    }

    setupSidebarMapButton() {
        console.log('🔧 Setting up sidebar map button handler...');

        const mapThumb = document.getElementById('mapThumb');
        console.log('🔍 mapThumb found:', !!mapThumb);

        if (mapThumb) {
            // Remove existing onclick and replace with proper handler
            mapThumb.removeAttribute('onclick');
            mapThumb.addEventListener('click', this.handleSidebarMapClick.bind(this));

            console.log('✅ Sidebar map button handler attached successfully');
        } else {
            console.error('❌ Could not find sidebar map button element');
        }
    }

    handleSidebarMapClick(event) {
        event.preventDefault();
        event.stopPropagation();

        console.log('🔥 SIDEBAR MAP BUTTON CLICKED!');
        this.showMapFromSidebar();
    }

    setupSidebarToggle() {
        const toggleSidebar = document.getElementById('toggleSidebar');
        if (toggleSidebar) {
            // Don't replace existing handler, it's already properly set up
            // Just ensure arrow state is correct on page load
            this.initializeSidebarArrowState();
        }
    }

    initializeSidebarArrowState() {
        const sidebar = document.getElementById('sidebar');
        const toggleButton = document.getElementById('toggleSidebar');
        const arrow = document.querySelector('.arrow-icon');

        if (sidebar && toggleButton && arrow) {
            if (sidebar.classList.contains('expanded')) {
                arrow.textContent = '◀';
                toggleButton.title = 'Collapse Sidebar';
            } else {
                arrow.textContent = '▶';
                toggleButton.title = 'Expand Sidebar';
            }
            console.log('Initial sidebar state set');
        }
    }
}

// Initialize the navigation system
const navigationHandlers = new NavigationHandlers();

// Export for module use
export default NavigationHandlers;

// Legacy global compatibility
window.NavigationHandlers = NavigationHandlers;

// Export key functions for global access during transition
window.toggleMyFeed = () => navigationHandlers.toggleMyFeed();
window.toggleTrendingPanel = () => navigationHandlers.toggleTrendingPanel();
window.togglePanel = (name) => navigationHandlers.togglePanel(name);
window.closePanel = (name) => navigationHandlers.closePanel(name);
window.closeAllPanels = () => navigationHandlers.closeAllPanels();
window.toggleMessages = () => navigationHandlers.toggleMessages();
window.openCivicOrganizing = () => navigationHandlers.openCivicOrganizing();
window.showDefaultView = () => navigationHandlers.showDefaultView();
window.resetPanelsToDefault = () => navigationHandlers.resetPanelsToDefault();
window.showMapFromSidebar = () => navigationHandlers.showMapFromSidebar();
window.setupCollapseButton = () => navigationHandlers.setupCollapseButton();
window.setupCloseButton = () => navigationHandlers.setupCloseButton();
window.setupSidebarMapButton = () => navigationHandlers.setupSidebarMapButton();

// Note: logout is handled by the existing auth system, so we don't override it