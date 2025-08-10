/* United We Rise - Mobile Navigation System */

// Mobile navigation state management
let currentMobileView = 'feed';

// Initialize mobile navigation
function initMobileNavigation() {
    // Only initialize on mobile screens
    if (window.innerWidth <= 767) {
        setupMobileView();
    }
    
    // Listen for window resize to handle orientation changes
    window.addEventListener('resize', handleMobileResize);
}

function handleMobileResize() {
    if (window.innerWidth <= 767) {
        setupMobileView();
    } else {
        resetDesktopView();
    }
}

function setupMobileView() {
    // Hide all desktop panels and search by default
    hideAllDesktopElements();
    
    // Show the current mobile view
    showMobileView(currentMobileView);
}

function resetDesktopView() {
    // Show desktop elements
    const sidebar = document.querySelector('.sidebar');
    const searchContainer = document.querySelector('.search-container');
    const mapContainer = document.getElementById('mapContainer');
    
    if (sidebar) sidebar.style.display = 'flex';
    if (searchContainer) searchContainer.style.display = 'none'; // Keep hidden until search is opened
    if (mapContainer) {
        mapContainer.classList.remove('mobile-active');
        mapContainer.style.display = 'block';
    }
}

function hideAllDesktopElements() {
    const searchContainer = document.querySelector('.search-container');
    const profilePanel = document.querySelector('.profile-panel');
    const messagesContainer = document.querySelector('.messages-container');
    const mapContainer = document.getElementById('mapContainer');
    
    if (searchContainer) searchContainer.style.display = 'none';
    if (profilePanel) profilePanel.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (mapContainer) mapContainer.classList.remove('mobile-active');
}

function showMobileView(view) {
    // Hide all views first
    hideAllDesktopElements();
    
    // Update navigation active state
    updateMobileNavActive(view);
    
    // Show the requested view
    switch (view) {
        case 'feed':
            showMobileFeed();
            break;
        case 'search':
            showMobileSearch();
            break;
        case 'map':
            showMobileMap();
            break;
        case 'profile':
            showMobileProfile();
            break;
        case 'messages':
            showMobileMessages();
            break;
    }
    
    currentMobileView = view;
}

function updateMobileNavActive(activeView) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to current view
    const viewMap = {
        'feed': 0,
        'search': 1,
        'map': 2,
        'profile': 3,
        'messages': 4
    };
    
    if (navItems[viewMap[activeView]]) {
        navItems[viewMap[activeView]].classList.add('active');
    }
}

// Mobile view functions
function showMobileFeed() {
    if (window.innerWidth > 767) return; // Only on mobile
    
    hideAllDesktopElements();
    
    // Show posts container (should be visible by default in mobile layout)
    const postsContainer = document.querySelector('.posts-container');
    if (postsContainer) {
        postsContainer.style.display = 'flex';
    }
    
    updateMobileNavActive('feed');
    currentMobileView = 'feed';
}

function showMobileSearch() {
    if (window.innerWidth > 767) return; // Only on mobile
    
    hideAllDesktopElements();
    
    // Show search container
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.style.display = 'flex';
        // Focus on search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }
    
    updateMobileNavActive('search');
    currentMobileView = 'search';
}

function showMobileMap() {
    if (window.innerWidth > 767) return; // Only on mobile
    
    hideAllDesktopElements();
    
    // Show map container as full screen
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.classList.add('mobile-active');
        mapContainer.style.display = 'block';
        
        // Trigger map resize after showing
        setTimeout(() => {
            if (window.map) {
                window.map.invalidateSize();
            }
        }, 100);
    }
    
    updateMobileNavActive('map');
    currentMobileView = 'map';
}

function hideMobileMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.classList.remove('mobile-active');
    }
    
    // Return to feed view
    showMobileFeed();
}

function showMobileProfile() {
    if (window.innerWidth > 767) return; // Only on mobile
    
    hideAllDesktopElements();
    
    // Show profile panel
    const profilePanel = document.querySelector('.profile-panel');
    if (profilePanel) {
        profilePanel.style.display = 'block';
    } else {
        // If profile panel doesn't exist, create or trigger profile view
        if (window.myProfile && typeof window.myProfile.showMyProfile === 'function') {
            window.myProfile.showMyProfile();
        }
    }
    
    updateMobileNavActive('profile');
    currentMobileView = 'profile';
}

function showMobileMessages() {
    if (window.innerWidth > 767) return; // Only on mobile
    
    hideAllDesktopElements();
    
    // Show messages container
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.style.display = 'block';
    } else {
        // If messages container doesn't exist, load conversations
        if (typeof loadConversations === 'function') {
            loadConversations();
        }
    }
    
    updateMobileNavActive('messages');
    currentMobileView = 'messages';
}

// Close mobile panels when clicking outside (for search, profile, messages)
document.addEventListener('click', function(event) {
    if (window.innerWidth > 767) return; // Only on mobile
    
    // If clicking on mobile nav, don't close anything
    if (event.target.closest('.mobile-nav')) return;
    
    // Close modals and overlays when clicking outside
    const target = event.target;
    if (!target.closest('.search-container') && 
        !target.closest('.profile-panel') && 
        !target.closest('.messages-container')) {
        
        // Only close if we're not in feed view
        if (currentMobileView !== 'feed') {
            showMobileFeed();
        }
    }
});

// Prevent body scrolling when mobile map is active
function toggleBodyScroll(disable) {
    if (disable) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initMobileNavigation();
});

// Handle back button on mobile
window.addEventListener('popstate', function(event) {
    if (window.innerWidth <= 767) {
        if (currentMobileView !== 'feed') {
            showMobileFeed();
        }
    }
});