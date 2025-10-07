/**
 * Mobile Bottom Bar Component
 * Provides iOS-style bottom navigation with 5-button layout and submenu support
 */

export class MobileBottomBar {
    constructor() {
        this.activeButton = 'feed';
        this.submenuOpen = null;
        this.isAuthenticated = false;

        this.init();
    }

    init() {
        try {
            // Check authentication state
            this.isAuthenticated = !!window.currentUser;

            // Better mobile detection - check both width and user agent
            const isMobile = window.innerWidth <= 767 ||
                           /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

            if (!isMobile) {
                console.log('MobileBottomBar: Desktop detected, skipping mobile nav');
                return;
            }

            console.log('MobileBottomBar: Mobile detected, rendering...');

            this.render();
            this.attachEventListeners();
            this.restoreState();

            console.log('✅ MobileBottomBar: Initialized successfully');

            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('MobileBottomBar', 'Mobile bottom navigation initialized');
            }
        } catch (error) {
            console.error('❌ MobileBottomBar init error:', error);
            // Try to render anyway after a delay
            setTimeout(() => {
                console.log('MobileBottomBar: Retrying render...');
                try {
                    this.render();
                    this.attachEventListeners();
                } catch (retryError) {
                    console.error('❌ MobileBottomBar retry failed:', retryError);
                }
            }, 1000);
        }
    }

    render() {
        try {
            console.log('MobileBottomBar: Starting render...');

            // Find or create the mobile-nav element
            let mobileNav = document.querySelector('.mobile-nav');

            if (!mobileNav) {
                console.log('MobileBottomBar: Creating new mobile-nav element');
                mobileNav = document.createElement('nav');
                mobileNav.className = 'mobile-nav';
                document.body.appendChild(mobileNav);
            } else {
                console.log('MobileBottomBar: Found existing mobile-nav element');
            }

            // Render buttons based on authentication state
            if (this.isAuthenticated) {
                console.log('MobileBottomBar: Rendering authenticated nav');
                mobileNav.innerHTML = this.renderAuthenticatedNav();
            } else {
                console.log('MobileBottomBar: Rendering unauthenticated nav');
                mobileNav.innerHTML = this.renderUnauthenticatedNav();
            }

            // Verify it's visible
            const computed = window.getComputedStyle(mobileNav);
            console.log('MobileBottomBar: display =', computed.display, ', visibility =', computed.visibility);

            // Create submenu container
            this.createSubmenuContainer();

            console.log('✅ MobileBottomBar: Render complete');
        } catch (error) {
            console.error('❌ MobileBottomBar render error:', error);
            throw error;
        }
    }

    renderAuthenticatedNav() {
        return `
            <a href="#" class="mobile-nav-item ${this.activeButton === 'feed' ? 'active' : ''}" data-action="mobile-feed" data-has-submenu="true">
                <div class="mobile-nav-icon">🏠</div>
                <div class="mobile-nav-label">Feed</div>
            </a>
            <a href="#" class="mobile-nav-item ${this.activeButton === 'discover' ? 'active' : ''}" data-action="mobile-discover" data-has-submenu="true">
                <div class="mobile-nav-icon">🔥</div>
                <div class="mobile-nav-label">Discover</div>
            </a>
            <a href="#" class="mobile-nav-item ${this.activeButton === 'post' ? 'active' : ''}" data-action="mobile-post">
                <div class="mobile-nav-icon">➕</div>
                <div class="mobile-nav-label">Post</div>
            </a>
            <a href="#" class="mobile-nav-item ${this.activeButton === 'notifications' ? 'active' : ''}" data-action="mobile-notifications">
                <div class="mobile-nav-icon">🔔</div>
                <div class="mobile-nav-label">Alerts</div>
            </a>
            <a href="#" class="mobile-nav-item ${this.activeButton === 'profile' ? 'active' : ''}" data-action="mobile-profile" data-has-submenu="true">
                <div class="mobile-nav-icon">👤</div>
                <div class="mobile-nav-label">Menu</div>
            </a>
        `;
    }

    renderUnauthenticatedNav() {
        return `
            <a href="#" class="mobile-nav-item ${this.activeButton === 'discover' ? 'active' : ''}" data-action="mobile-discover">
                <div class="mobile-nav-icon">🔥</div>
                <div class="mobile-nav-label">Discover</div>
            </a>
            <a href="#" class="mobile-nav-item ${this.activeButton === 'search' ? 'active' : ''}" data-action="mobile-search">
                <div class="mobile-nav-icon">🔍</div>
                <div class="mobile-nav-label">Search</div>
            </a>
            <a href="#" class="mobile-nav-item" data-action="open-auth-login">
                <div class="mobile-nav-icon">🔑</div>
                <div class="mobile-nav-label">Login</div>
            </a>
            <a href="#" class="mobile-nav-item" data-action="open-auth-register">
                <div class="mobile-nav-icon">✨</div>
                <div class="mobile-nav-label">Sign Up</div>
            </a>
            <a href="#" class="mobile-nav-item" data-action="mobile-info">
                <div class="mobile-nav-icon">ℹ️</div>
                <div class="mobile-nav-label">Info</div>
            </a>
        `;
    }

    createSubmenuContainer() {
        // Remove existing submenu if present
        const existingSubmenu = document.getElementById('mobile-nav-submenu');
        if (existingSubmenu) {
            existingSubmenu.remove();
        }

        const existingBackdrop = document.getElementById('mobile-nav-submenu-backdrop');
        if (existingBackdrop) {
            existingBackdrop.remove();
        }

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'mobile-nav-submenu-backdrop';
        backdrop.className = 'mobile-nav-submenu-backdrop';
        document.body.appendChild(backdrop);

        // Create submenu container
        const submenu = document.createElement('div');
        submenu.id = 'mobile-nav-submenu';
        submenu.className = 'mobile-nav-submenu';
        document.body.appendChild(submenu);
    }

    attachEventListeners() {
        const mobileNav = document.querySelector('.mobile-nav');
        if (!mobileNav) return;

        // Click event delegation for nav buttons
        mobileNav.addEventListener('click', (e) => {
            e.preventDefault();
            const button = e.target.closest('.mobile-nav-item');
            if (!button) return;

            const action = button.dataset.action;
            const hasSubmenu = button.dataset.hasSubmenu === 'true';

            // If button has submenu, show it
            if (hasSubmenu) {
                this.showSubmenu(action);
            } else {
                // Navigate directly
                this.navigate(action);
            }
        });

        // Backdrop click to close submenu
        const backdrop = document.getElementById('mobile-nav-submenu-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                this.hideSubmenu();
            });
        }
    }

    showSubmenu(buttonAction) {
        const submenuContent = this.getSubmenuContent(buttonAction);
        if (!submenuContent) return;

        const submenu = document.getElementById('mobile-nav-submenu');
        const backdrop = document.getElementById('mobile-nav-submenu-backdrop');

        if (!submenu || !backdrop) return;

        submenu.innerHTML = submenuContent;

        // Show with animation
        requestAnimationFrame(() => {
            backdrop.classList.add('show');
            submenu.classList.add('show');
        });

        // Attach submenu item click handlers
        submenu.querySelectorAll('.mobile-nav-submenu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const action = item.dataset.action;
                this.hideSubmenu();
                this.navigate(action);
            });
        });

        this.submenuOpen = buttonAction;
    }

    hideSubmenu() {
        const submenu = document.getElementById('mobile-nav-submenu');
        const backdrop = document.getElementById('mobile-nav-submenu-backdrop');

        if (!submenu || !backdrop) return;

        submenu.classList.remove('show');
        backdrop.classList.remove('show');

        this.submenuOpen = null;
    }

    getSubmenuContent(buttonAction) {
        switch (buttonAction) {
            case 'mobile-feed':
                return `
                    <a href="#" class="mobile-nav-submenu-item" data-action="feed-following">
                        <span class="mobile-nav-submenu-icon">👥</span>
                        <span class="mobile-nav-submenu-label">Following Feed</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="feed-discover">
                        <span class="mobile-nav-submenu-icon">🔥</span>
                        <span class="mobile-nav-submenu-label">Discover Feed</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="feed-trending">
                        <span class="mobile-nav-submenu-icon">📈</span>
                        <span class="mobile-nav-submenu-label">Trending Topics</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="feed-saved">
                        <span class="mobile-nav-submenu-icon">🔖</span>
                        <span class="mobile-nav-submenu-label">Saved Posts</span>
                    </a>
                `;

            case 'mobile-discover':
                return `
                    <a href="#" class="mobile-nav-submenu-item" data-action="discover-trending">
                        <span class="mobile-nav-submenu-icon">🔥</span>
                        <span class="mobile-nav-submenu-label">Trending Now</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="discover-popular">
                        <span class="mobile-nav-submenu-icon">⭐</span>
                        <span class="mobile-nav-submenu-label">Popular Today</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="discover-topics">
                        <span class="mobile-nav-submenu-icon">🏷️</span>
                        <span class="mobile-nav-submenu-label">Topic Discovery</span>
                    </a>
                `;

            case 'mobile-profile':
                return `
                    <a href="#" class="mobile-nav-submenu-item" data-action="toggle-profile">
                        <span class="mobile-nav-submenu-icon">👤</span>
                        <span class="mobile-nav-submenu-label">My Profile</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="mobile-messages">
                        <span class="mobile-nav-submenu-icon">💬</span>
                        <span class="mobile-nav-submenu-label">Messages</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="organizing">
                        <span class="mobile-nav-submenu-icon">🏛️</span>
                        <span class="mobile-nav-submenu-label">Civic Organizing</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="open-donation">
                        <span class="mobile-nav-submenu-icon">💰</span>
                        <span class="mobile-nav-submenu-label">Donations</span>
                    </a>
                    <a href="#" class="mobile-nav-submenu-item" data-action="mobile-settings">
                        <span class="mobile-nav-submenu-icon">⚙️</span>
                        <span class="mobile-nav-submenu-label">Settings</span>
                    </a>
                `;

            default:
                return null;
        }
    }

    navigate(action) {
        // Set active button
        this.setActive(action);

        // The action will be handled by navigation-handlers.js via event delegation
        // We just need to trigger a click event on a button with this action
        const event = new CustomEvent('mobile-nav-action', {
            detail: { action },
            bubbles: true
        });

        // Find button with this action and dispatch event
        const button = document.querySelector(`[data-action="${action}"]`);
        if (button) {
            button.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            }));
        }

        // Store preference
        localStorage.setItem('mobileNavActive', action);
    }

    setActive(buttonAction) {
        // Map submenu actions to main buttons
        const actionMap = {
            'feed-following': 'mobile-feed',
            'feed-discover': 'mobile-feed',
            'feed-trending': 'mobile-feed',
            'feed-saved': 'mobile-feed',
            'discover-trending': 'mobile-discover',
            'discover-popular': 'mobile-discover',
            'discover-topics': 'mobile-discover',
            'toggle-profile': 'mobile-profile',
            'mobile-settings': 'mobile-profile'
        };

        const mainAction = actionMap[buttonAction] || buttonAction;
        this.activeButton = mainAction.replace('mobile-', '');

        // Update UI
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-action="${mainAction}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    restoreState() {
        const savedActive = localStorage.getItem('mobileNavActive');
        if (savedActive) {
            this.setActive(savedActive);
        }
    }

    refresh() {
        // Check authentication state and re-render
        const wasAuthenticated = this.isAuthenticated;
        this.isAuthenticated = !!window.currentUser;

        if (wasAuthenticated !== this.isAuthenticated) {
            this.render();
            this.attachEventListeners();
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileBottomBar = new MobileBottomBar();
    });
} else {
    window.mobileBottomBar = new MobileBottomBar();
}

// Export for module use
export default MobileBottomBar;

console.log('✅ MobileBottomBar component loaded');
