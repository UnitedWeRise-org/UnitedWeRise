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
    
    // Create mobile top bar
    const mobileTopBar = document.createElement('div');
    mobileTopBar.className = 'mobile-top-bar';
    mobileTopBar.innerHTML = `
        <div class="mobile-search-container">
            <input type="text" class="mobile-search-input" placeholder="Search..." />
        </div>
        <div class="mobile-logo-container">
            <span>United 🗽 We Rise</span>
            <span class="beta-badge">BETA</span>
        </div>
    `;
    
    // Create mobile sidebar
    const mobileSidebar = document.createElement('div');
    mobileSidebar.className = `mobile-sidebar ${mobileSidebarState}`;
    mobileSidebar.innerHTML = `
        <button class="mobile-sidebar-toggle" onclick="toggleMobileSidebar()">
            <span id="sidebar-toggle-icon">›</span>
        </button>
        <nav class="mobile-sidebar-nav">
            <a href="#" class="mobile-sidebar-item active" onclick="switchMobileView('feed')">
                <div class="mobile-sidebar-icon">📰</div>
                <div class="mobile-sidebar-label">Feed</div>
            </a>
            <a href="#" class="mobile-sidebar-item" onclick="switchMobileView('trending')">
                <div class="mobile-sidebar-icon">📈</div>
                <div class="mobile-sidebar-label">Trending</div>
            </a>
            <a href="#" class="mobile-sidebar-item" onclick="switchMobileView('messages')">
                <div class="mobile-sidebar-icon">💬</div>
                <div class="mobile-sidebar-label">Messages</div>
            </a>
            <a href="#" class="mobile-sidebar-item" onclick="switchMobileView('civic')">
                <div class="mobile-sidebar-icon">🏛️</div>
                <div class="mobile-sidebar-label">Civic</div>
            </a>
            <a href="#" class="mobile-sidebar-item" onclick="switchMobileView('map')">
                <div class="mobile-sidebar-icon">🗺️</div>
                <div class="mobile-sidebar-label">Map</div>
            </a>
            <a href="#" class="mobile-sidebar-item" onclick="switchMobileView('donate')">
                <div class="mobile-sidebar-icon">💰</div>
                <div class="mobile-sidebar-label">Donate</div>
            </a>
            <a href="#" class="mobile-sidebar-item" onclick="switchMobileView('profile')">
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
    
    // Set initial view based on login status
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
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
            loadMyFeedPosts();
        }
    }
}

function showMobileTrending() {
    const trendingContainer = document.querySelector('.trending-updates');
    if (trendingContainer) {
        trendingContainer.style.display = 'block';
    }
    // Create temporary trending view if container doesn't exist
    showTemporaryView('Trending', 'Trending topics and discussions will appear here.');
}

function showMobileMessages() {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.style.display = 'block';
    } else {
        showTemporaryView('Messages', 'Your messages will appear here.');
    }
}

function showMobileCivic() {
    // Show civic engagement features
    showTemporaryView('Civic Engagement', 'Elections, officials, and civic tools will appear here.');
}

function showMobileMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.classList.add('mobile-active');
        mapContainer.style.display = 'block';
    } else {
        showTemporaryView('Map', 'Interactive map will appear here.');
    }
}

function showMobileDonate() {
    // Trigger donation modal
    if (typeof openDonationModal === 'function') {
        openDonationModal();
    } else {
        showTemporaryView('Donate', 'Support civic causes and candidates.');
    }
}

function showMobileProfile() {
    if (typeof showMyProfile === 'function') {
        showMyProfile();
    } else {
        showTemporaryView('Profile', 'Your profile will appear here.');
    }
}

function showMobileLogin() {
    // Open login modal
    if (typeof openLoginModal === 'function') {
        openLoginModal();
    } else {
        showTemporaryView('Login', 'Please log in to continue.');
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