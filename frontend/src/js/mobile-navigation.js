/* United We Rise - Mobile Navigation System */

// Mobile sidebar state management
let mobileSidebarState = 'icons-only'; // 'collapsed', 'icons-only', 'expanded'
let currentMobileView = 'feed';

// Initialize mobile navigation
function initMobileNavigation() {
    // Only initialize on mobile screens
    if (window.innerWidth <= 767) {
        setupMobileInterface();
        setupMobileSidebarEvents();
        
        // Override map functions to prevent map from showing on mobile
        if (window.map) {
            window.map.showMap = function() {
                console.log('Map disabled on mobile');
            };
        }
    }
    
    // Listen for window resize to handle orientation changes
    window.addEventListener('resize', handleMobileResize);
}

function handleMobileResize() {
    if (window.innerWidth <= 767) {
        setupMobileInterface();
    } else {
        removeMobileInterface();
    }
}

function setupMobileInterface() {
    // Remove any existing mobile interface
    removeMobileInterface();
    
    // Hide map container on mobile
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.style.display = 'none';
    }
    
    // Create mobile top bar
    const mobileTopBar = document.createElement('div');
    mobileTopBar.className = 'mobile-top-bar';
    mobileTopBar.innerHTML = `
        <div class="mobile-search-container">
            <input type="search" class="mobile-search-input" placeholder="Search..." autocomplete="off" autocapitalize="off" spellcheck="false" />
        </div>
        <div class="mobile-logo-container">
            <div class="site-title-container" data-mobile-action="go-home" title="United We Rise - Home">
                <span class="site-title-left">United</span>
                <div class="logo">
                    <img src="UWR Logo on Circle.png" alt="United We Rise" class="logo-circle">
                </div>
                <span class="site-title-right">We Ris<span class="rise-e">e<span class="beta-badge">Beta</span></span></span>
            </div>
        </div>
    `;
    
    // Create mobile sidebar
    const mobileSidebar = document.createElement('div');
    mobileSidebar.className = `mobile-sidebar ${mobileSidebarState}`;
    mobileSidebar.innerHTML = `
        <button class="mobile-sidebar-toggle" data-mobile-action="toggle-sidebar">
            <span id="sidebar-toggle-icon">›</span>
        </button>
        <nav class="mobile-sidebar-nav">
            <a href="#" class="mobile-sidebar-item active" data-mobile-action="switch-view" data-view="feed">
                <div class="mobile-sidebar-icon">📰</div>
                <div class="mobile-sidebar-label">Feed</div>
            </a>
            <a href="#" class="mobile-sidebar-item" data-mobile-action="switch-view" data-view="trending">
                <div class="mobile-sidebar-icon">📈</div>
                <div class="mobile-sidebar-label">Trending</div>
            </a>
            <a href="#" class="mobile-sidebar-item" data-mobile-action="switch-view" data-view="messages">
                <div class="mobile-sidebar-icon">💬</div>
                <div class="mobile-sidebar-label">Messages</div>
            </a>
            <a href="#" class="mobile-sidebar-item" data-mobile-action="switch-view" data-view="civic">
                <div class="mobile-sidebar-icon">🏛️</div>
                <div class="mobile-sidebar-label">Civic</div>
            </a>
            <a href="#" class="mobile-sidebar-item" data-mobile-action="switch-view" data-view="map">
                <div class="mobile-sidebar-icon">🗺️</div>
                <div class="mobile-sidebar-label">Map</div>
            </a>
            <a href="#" class="mobile-sidebar-item" data-mobile-action="switch-view" data-view="donate">
                <div class="mobile-sidebar-icon">💰</div>
                <div class="mobile-sidebar-label">Donate</div>
            </a>
            <a href="#" class="mobile-sidebar-item" data-mobile-action="switch-view" data-view="profile">
                <div class="mobile-sidebar-icon">👤</div>
                <div class="mobile-sidebar-label">Profile</div>
            </a>
        </nav>
    `;
    
    // Add mobile interface to body
    document.body.appendChild(mobileTopBar);
    document.body.appendChild(mobileSidebar);
    
    // Wrap main content for proper spacing
    wrapMainContent();
    
    // Update top bar height reference in JavaScript
    document.documentElement.style.setProperty('--mobile-top-bar-height', '50px');
    
    // Set initial view based on login status
    const isAuthenticated = window.authUtils?.isUserAuthenticated() ||
                           window.currentUser ||
                           (window.userState && window.userState.current);

    if (!isAuthenticated) {
        // Show login if not authenticated
        showMobileLogin();
    } else {
        // Show feed if authenticated
        switchMobileView('feed');
    }
}

function removeMobileInterface() {
    // Remove mobile top bar
    const topBar = document.querySelector('.mobile-top-bar');
    if (topBar) topBar.remove();
    
    // Remove mobile sidebar
    const sidebar = document.querySelector('.mobile-sidebar');
    if (sidebar) sidebar.remove();
    
    // Unwrap main content
    unwrapMainContent();
}

function wrapMainContent() {
    // Check if already wrapped
    if (document.querySelector('.mobile-content-wrapper')) return;
    
    // Get main content areas
    const mainContent = document.querySelector('.main');
    if (!mainContent) return;
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'mobile-content-wrapper';
    
    // Wrap the main content
    mainContent.parentNode.insertBefore(wrapper, mainContent);
    wrapper.appendChild(mainContent);
}

function unwrapMainContent() {
    const wrapper = document.querySelector('.mobile-content-wrapper');
    if (!wrapper) return;
    
    const mainContent = wrapper.querySelector('.main');
    if (mainContent) {
        wrapper.parentNode.insertBefore(mainContent, wrapper);
    }
    wrapper.remove();
}

function setupMobileSidebarEvents() {
    // Add swipe gesture support for sidebar
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    }, false);
    
    function handleSwipeGesture() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0 && touchStartX < 50) {
                // Swipe right from left edge - expand sidebar
                if (mobileSidebarState === 'collapsed') {
                    setMobileSidebarState('icons-only');
                } else if (mobileSidebarState === 'icons-only') {
                    setMobileSidebarState('expanded');
                }
            } else if (swipeDistance < 0) {
                // Swipe left - collapse sidebar
                if (mobileSidebarState === 'expanded') {
                    setMobileSidebarState('icons-only');
                } else if (mobileSidebarState === 'icons-only') {
                    setMobileSidebarState('collapsed');
                }
            }
        }
    }
}

// Toggle mobile sidebar state
window.toggleMobileSidebar = function() {
    if (mobileSidebarState === 'collapsed') {
        setMobileSidebarState('icons-only');
    } else if (mobileSidebarState === 'icons-only') {
        setMobileSidebarState('expanded');
    } else {
        setMobileSidebarState('collapsed');
    }
};

function setMobileSidebarState(state) {
    mobileSidebarState = state;
    const sidebar = document.querySelector('.mobile-sidebar');
    if (!sidebar) return;
    
    // Remove all state classes
    sidebar.classList.remove('collapsed', 'icons-only', 'expanded');
    // Add new state class
    sidebar.classList.add(state);
    
    // Update toggle icon
    const toggleIcon = document.getElementById('sidebar-toggle-icon');
    if (toggleIcon) {
        if (state === 'collapsed') {
            toggleIcon.textContent = '›';
        } else if (state === 'icons-only') {
            toggleIcon.textContent = '‹›';
        } else {
            toggleIcon.textContent = '‹';
        }
    }
    
    // Save preference
    localStorage.setItem('mobileSidebarState', state);
}

// Switch between mobile views
window.switchMobileView = function(view) {
    currentMobileView = view;
    
    // Update active state
    document.querySelectorAll('.mobile-sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the correct item
    document.querySelectorAll('.mobile-sidebar-item').forEach(item => {
        const label = item.querySelector('.mobile-sidebar-label');
        if (label && label.textContent.toLowerCase() === view) {
            item.classList.add('active');
        }
    });
    
    // Hide all desktop panels
    hideAllDesktopElements();
    
    // Show the appropriate view
    switch (view) {
        case 'feed':
            showMobileFeed();
            break;
        case 'trending':
            showMobileTrending();
            break;
        case 'messages':
            showMobileMessages();
            break;
        case 'civic':
            showMobileCivic();
            break;
        case 'map':
            showMobileMap();
            break;
        case 'donate':
            showMobileDonate();
            break;
        case 'profile':
            showMobileProfile();
            break;
    }
    
    // Auto-collapse sidebar after selection on very small screens
    if (window.innerWidth < 400 && mobileSidebarState === 'expanded') {
        setMobileSidebarState('icons-only');
    }
};

// Individual view functions
function showMobileFeed() {
    const postsContainer = document.querySelector('.posts-container');
    if (postsContainer) {
        postsContainer.style.display = 'block';
        // Trigger feed loading if needed
        if (typeof loadMyFeedPosts === 'function') {
            try {
                loadMyFeedPosts();
            } catch (error) {
                console.error('Error loading feed:', error);
                showTemporaryView('Feed', 'Unable to load feed. Please refresh the page.');
            }
        } else if (typeof window.loadMyFeed === 'function') {
            // Try alternative function name
            try {
                window.loadMyFeed();
            } catch (error) {
                console.error('Error loading feed:', error);
                showTemporaryView('Feed', 'Unable to load feed. Please refresh the page.');
            }
        } else {
            console.warn('Feed loading functions not available');
        }
    }
}

function showMobileTrending() {
    // Try to load trending content from the real functions
    try {
        if (typeof loadTrendingUpdates === 'function') {
            loadTrendingUpdates();

            // Show trending container if it exists
            const trendingContainer = document.querySelector('.trending-updates');
            if (trendingContainer) {
                trendingContainer.style.display = 'block';
            }

            // Also try to show the trending panel
            const trendingPanel = document.getElementById('panel-trending');
            if (trendingPanel) {
                trendingPanel.style.display = 'block';
                trendingPanel.classList.remove('hidden');
            }
        }
        // Try alternative trending function
        else if (typeof loadTrendingPosts === 'function') {
            loadTrendingPosts();
        }
        // Fallback to showing existing content
        else {
            const trendingContainer = document.querySelector('.trending-updates');
            if (trendingContainer) {
                trendingContainer.style.display = 'block';
            } else {
                showTemporaryView('Trending', 'Trending topics are loading. Please wait a moment.');
            }
            console.warn('Trending functions not available');
        }
    } catch (error) {
        console.error('Error loading trending content:', error);
        showTemporaryView('Trending', 'Unable to load trending topics. Please try again later.');
    }
}

function showMobileMessages() {
    // Check if user is logged in
    const isAuthenticated = window.authUtils?.isUserAuthenticated() ||
                           window.currentUser ||
                           (window.userState && window.userState.current);

    if (!isAuthenticated) {
        showTemporaryView('Messages', 'Please log in to view your messages.');
        return;
    }

    try {
        // Call the real loadConversations function from index.html
        if (typeof loadConversations === 'function') {
            loadConversations();

            // Show messages container if it exists
            const messagesContainer = document.querySelector('.messages-container');
            if (messagesContainer) {
                messagesContainer.style.display = 'block';
            }
        } else if (typeof window.loadConversations === 'function') {
            // Try window scope
            window.loadConversations();

            const messagesContainer = document.querySelector('.messages-container');
            if (messagesContainer) {
                messagesContainer.style.display = 'block';
            }
        } else {
            showTemporaryView('Messages', 'Messages feature is loading. Please wait.');
            console.warn('loadConversations function not available');
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showTemporaryView('Messages', 'Unable to load messages. Please try again.');
    }
}

function showMobileCivic() {
    // Check if user is logged in
    const isAuthenticated = window.authUtils?.isUserAuthenticated() ||
                           window.currentUser ||
                           (window.userState && window.userState.current);

    if (!isAuthenticated) {
        showTemporaryView('Civic Engagement', 'Please log in to access civic organizing tools.');
        return;
    }

    try {
        // Call the real openCivicOrganizing function from index.html
        if (typeof openCivicOrganizing === 'function') {
            openCivicOrganizing();
        } else if (typeof window.openCivicOrganizing === 'function') {
            // Try window scope
            window.openCivicOrganizing();
        } else {
            // Fallback - try to show civic elements manually
            const civicElements = document.querySelectorAll('[id*="civic"], [class*="civic"]');
            if (civicElements.length > 0) {
                civicElements.forEach(element => {
                    element.style.display = 'block';
                });
            } else {
                showTemporaryView('Civic Engagement', 'Civic organizing tools are loading.');
            }
            console.warn('openCivicOrganizing function not available');
        }
    } catch (error) {
        console.error('Error loading civic tools:', error);
        showTemporaryView('Civic Engagement', 'Unable to load civic tools. Please try again.');
    }
}

function showMobileMap() {
    // Don't show map by default - it's not functional yet
    showTemporaryView('Map', 'Interactive map feature coming soon. This feature is currently in development.');
}

function showMobileDonate() {
    // Try donation system first (preferred method)
    if (window.donationSystem && typeof window.donationSystem.openDonationModal === 'function') {
        window.donationSystem.openDonationModal();
    } 
    // Fallback to global function if available
    else if (typeof openDonationModal === 'function') {
        openDonationModal();
    }
    // Final fallback - manual modal trigger
    else {
        // Look for donation modal in DOM
        const donationModal = document.querySelector('#donationModal, .donation-modal');
        if (donationModal) {
            donationModal.style.display = 'block';
        } else {
            showTemporaryView('Donate', 'Loading donation system...');
        }
        console.warn('Donation system not fully loaded');
    }
}

function showMobileProfile() {
    try {
        if (typeof showProfile === 'function') {
            showProfile();
        } else if (typeof window.showProfile === 'function') {
            // Try window scope
            window.showProfile();
        } else if (typeof toggleProfile === 'function') {
            // Try alternative function
            toggleProfile();
        } else {
            showTemporaryView('Profile', 'Your profile is loading. Please wait.');
            console.warn('Profile functions not available');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showTemporaryView('Profile', 'Unable to load profile. Please refresh the page.');
    }
}

function showMobileLogin() {
    try {
        // Open login modal
        if (typeof openLoginModal === 'function') {
            openLoginModal();
        } else if (typeof window.openLoginModal === 'function') {
            // Try window scope
            window.openLoginModal();
        } else if (typeof window.authModal?.open === 'function') {
            // Try modular auth system
            window.authModal.open();
        } else {
            showTemporaryView('Login', 'Login system is loading. Please wait a moment and try again.');
            console.warn('Login modal function not available');
        }
    } catch (error) {
        console.error('Error opening login modal:', error);
        showTemporaryView('Login', 'Unable to open login. Please refresh the page.');
    }
}

function hideAllDesktopElements() {
    // Hide all major containers
    const elements = [
        '.posts-container',
        '.search-container',
        '.profile-panel',
        '.messages-container',
        '.trending-updates',
        '#mapContainer'
    ];
    
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
            element.classList.remove('mobile-active');
        }
    });
    
    // Remove any temporary views
    const tempView = document.querySelector('.mobile-temp-view');
    if (tempView) tempView.remove();
}

function showTemporaryView(title, message) {
    // Remove any existing temp view
    const existing = document.querySelector('.mobile-temp-view');
    if (existing) existing.remove();
    
    // Create temporary view
    const tempView = document.createElement('div');
    tempView.className = 'mobile-temp-view';
    tempView.style.cssText = `
        padding: 20px;
        text-align: center;
        margin-top: 100px;
    `;
    tempView.innerHTML = `
        <h2>${title}</h2>
        <p style="margin-top: 20px; color: #666;">${message}</p>
    `;
    
    const wrapper = document.querySelector('.mobile-content-wrapper');
    if (wrapper) {
        wrapper.appendChild(tempView);
    } else {
        document.body.appendChild(tempView);
    }
}

// Load saved sidebar state
document.addEventListener('DOMContentLoaded', function() {
    const savedState = localStorage.getItem('mobileSidebarState');
    if (savedState) {
        mobileSidebarState = savedState;
    }
});

// Event delegation for mobile navigation actions
document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-mobile-action]');
    if (!target) return;

    e.preventDefault();
    const action = target.dataset.mobileAction;
    const view = target.dataset.view;

    switch (action) {
        case 'go-home':
            window.location.href = '/';
            break;
        case 'toggle-sidebar':
            toggleMobileSidebar();
            break;
        case 'switch-view':
            if (view) switchMobileView(view);
            break;
    }
});