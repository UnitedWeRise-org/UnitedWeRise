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

// Mobile view functions (expose globally for HTML onclick handlers)
window.showMobileFeed = function showMobileFeed() {
    if (window.innerWidth > 767) return; // Only on mobile
    
    hideAllDesktopElements();
    
    // Show posts container (should be visible by default in mobile layout)
    const postsContainer = document.querySelector('.posts-container');
    if (postsContainer) {
        postsContainer.style.display = 'flex';
    }
    
    updateMobileNavActive('feed');
    currentMobileView = 'feed';
};

window.showMobileSearch = function showMobileSearch() {
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
};

window.showMobileMap = function showMobileMap() {
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
};

window.hideMobileMap = function hideMobileMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.classList.remove('mobile-active');
    }
    
    // Return to feed view
    showMobileFeed();
};

window.showMobileProfile = function showMobileProfile() {
    if (window.innerWidth > 767) return; // Only on mobile
    
    hideAllDesktopElements();
    
    // Show profile panel
    const profilePanel = document.querySelector('.profile-panel');
    if (profilePanel) {
        profilePanel.style.display = 'block';
    } else {
        // If profile panel doesn't exist, use the desktop profile function
        if (typeof showMyProfile === 'function') {
            showMyProfile();
        }
    }
    
    updateMobileNavActive('profile');
    currentMobileView = 'profile';
};

window.showMobileMessages = function showMobileMessages() {
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

// Check if user is logged in (looks for authToken)
function isUserLoggedIn() {
    return localStorage.getItem('authToken') !== null || window.authToken !== null;
}

// Show/hide mobile navigation based on login status
function updateMobileNavVisibility() {
    const mobileNav = document.querySelector('.mobile-nav');
    if (!mobileNav) return;
    
    if (window.innerWidth <= 767) {
        if (isUserLoggedIn()) {
            mobileNav.style.display = 'flex';
        } else {
            mobileNav.style.display = 'none';
            // Show only search and map for logged-out mobile users
            showLoggedOutMobileView();
        }
    } else {
        mobileNav.style.display = 'none'; // Hide on desktop
    }
}

// Show limited mobile view for logged-out users
function showLoggedOutMobileView() {
    if (window.innerWidth > 767) return;
    
    // Hide authenticated features
    const postsContainer = document.querySelector('.posts-container');
    const profilePanel = document.querySelector('.profile-panel');
    const messagesContainer = document.querySelector('.messages-container');
    
    if (postsContainer) postsContainer.style.display = 'none';
    if (profilePanel) profilePanel.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'none';
    
    // Show search by default for logged-out users
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.style.display = 'flex';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initMobileNavigation();
    updateMobileNavVisibility();
    
    // Listen for auth changes
    window.addEventListener('authStateChanged', updateMobileNavVisibility);
});

// Handle back button on mobile
window.addEventListener('popstate', function(event) {
    if (window.innerWidth <= 767) {
        if (currentMobileView !== 'feed') {
            showMobileFeed();
        }
    }
});

// Mobile search toggle function
function toggleMobileSearch() {
    if (window.innerWidth <= 767) {
        showMobileSearch();
    }
}

// Notification functions
function toggleNotifications() {
    // TODO: Implement notification panel
    console.log('Notifications clicked - to be implemented');
}

// Update authentication UI elements
function updateAuthenticationUI(isLoggedIn, user = null) {
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const notificationSection = document.getElementById('notificationSection');
    const logoutThumb = document.getElementById('logoutThumb');
    
    if (isLoggedIn && user) {
        // Show authenticated UI
        if (authSection) authSection.style.display = 'none';
        if (userSection) {
            userSection.style.display = 'flex';
            const userGreeting = document.getElementById('userGreeting');
            if (userGreeting) {
                userGreeting.textContent = `Hello, ${user.firstName || user.username}!`;
            }
        }
        if (notificationSection) notificationSection.style.display = 'block';
        if (logoutThumb) logoutThumb.style.display = 'block';
        
        // Update mobile nav visibility
        updateMobileNavVisibility();
        
    } else {
        // Show logged-out UI  
        if (authSection) authSection.style.display = 'block';
        if (userSection) userSection.style.display = 'none';
        if (notificationSection) notificationSection.style.display = 'none';
        if (logoutThumb) logoutThumb.style.display = 'none';
        
        // Update mobile nav visibility
        updateMobileNavVisibility();
    }
}

// Listen for auth state changes and update UI
window.addEventListener('load', function() {
    // Check initial auth state
    const isLoggedIn = isUserLoggedIn();
    if (isLoggedIn) {
        // Get user data from storage - fixed to use correct key 'currentUser'
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        // Only update UI if we have valid user data with firstName
        if (userData && userData.id && userData.firstName) {
            updateAuthenticationUI(true, userData);
        }
        // Otherwise let the main auth flow handle it - don't interfere
    } else {
        updateAuthenticationUI(false);
    }
});