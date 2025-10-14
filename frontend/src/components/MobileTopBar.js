/**
 * Mobile Top Bar Component
 * Provides mobile-specific top navigation with search and logo
 */

export class MobileTopBar {
    constructor() {
        this.topBar = null;
        this.init();
    }

    init() {
        try {
            // Check if mobile
            const isMobile = window.innerWidth <= 767 ||
                           /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

            if (!isMobile) {
                return;
            }

            this.render();
            this.attachEventListeners();

            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('MobileTopBar', 'Mobile top bar initialized');
            }
        } catch (error) {
            console.error('❌ MobileTopBar init error:', error);
        }
    }

    render() {
        try {
            // Remove existing mobile-top-bar if present
            const existingTopBar = document.querySelector('.mobile-top-bar');
            if (existingTopBar) {
                existingTopBar.remove();
            }

            // Create mobile top bar element
            const mobileTopBar = document.createElement('div');
            mobileTopBar.className = 'mobile-top-bar';
            mobileTopBar.innerHTML = `
                <div class="mobile-search-container">
                    <input
                        type="search"
                        class="mobile-search-input"
                        placeholder="Search..."
                        id="mobileSearchInput"
                        autocomplete="off"
                        autocapitalize="off"
                        spellcheck="false"
                    />
                </div>
                <div class="mobile-logo-container">
                    <div class="site-title-container" title="United We Rise - Home">
                        <span class="site-title-left">United</span>
                        <div class="logo">
                            <img src="UWR Logo on Circle.png" alt="United We Rise" class="logo-circle">
                        </div>
                        <span class="site-title-right">We Ris<span class="rise-e">e<span class="beta-badge">Beta</span></span></span>
                    </div>
                </div>
            `;

            // Insert at beginning of body
            document.body.insertBefore(mobileTopBar, document.body.firstChild);

            // Hide desktop top bar on mobile
            const desktopTopBar = document.querySelector('.top-bar');
            if (desktopTopBar) {
                desktopTopBar.style.display = 'none';
            }

            this.topBar = mobileTopBar;
        } catch (error) {
            console.error('❌ MobileTopBar render error:', error);
            throw error;
        }
    }

    attachEventListeners() {
        if (!this.topBar) return;

        // Logo click - navigate to home
        const logoContainer = this.topBar.querySelector('.site-title-container');
        if (logoContainer) {
            logoContainer.addEventListener('click', () => {
                window.location.href = '/';
            });
            logoContainer.style.cursor = 'pointer';
        }

        // Search input
        const searchInput = this.topBar.querySelector('#mobileSearchInput');
        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                if (typeof openSearch === 'function') {
                    openSearch();
                }
            });

            searchInput.addEventListener('input', (e) => {
                if (typeof performGlobalSearch === 'function') {
                    performGlobalSearch(e.target.value);
                }
            });
        }
    }

    refresh() {
        // Re-render on orientation change or resize
        const isMobile = window.innerWidth <= 767;
        const exists = document.querySelector('.mobile-top-bar');

        if (isMobile && !exists) {
            this.render();
            this.attachEventListeners();
        } else if (!isMobile && exists) {
            this.remove();
        }
    }

    remove() {
        if (this.topBar) {
            this.topBar.remove();
            this.topBar = null;

            // Re-show desktop top bar
            const desktopTopBar = document.querySelector('.top-bar');
            if (desktopTopBar) {
                desktopTopBar.style.display = '';
            }
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileTopBar = new MobileTopBar();
    });
} else {
    window.mobileTopBar = new MobileTopBar();
}

// Handle resize events
window.addEventListener('resize', () => {
    if (window.mobileTopBar) {
        window.mobileTopBar.refresh();
    }
});

// Export for module use
export default MobileTopBar;
