/**
 * Top Bar Controller
 * Manages auto-hide behavior for mobile top bar based on scroll direction
 */

export class TopBarController {
    constructor() {
        this.topBar = null;
        this.visible = true;
        this.lastScrollY = 0;
        this.threshold = 50; // Pixels to scroll before triggering
        this.accumulatedScroll = 0;
        this.isLocked = false; // Prevent auto-hide when locked
        this.scrollTimeout = null;

        this.init();
    }

    init() {
        // Only run on mobile
        if (window.innerWidth > 767) {
            return;
        }

        this.topBar = document.querySelector('.top-bar');
        if (!this.topBar) {
            console.warn('TopBarController: .top-bar element not found');
            return;
        }

        this.attachScrollListener();

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('TopBarController', 'Auto-hide top bar initialized');
        }
    }

    attachScrollListener() {
        // Use passive listener for better scroll performance
        window.addEventListener('scroll', () => {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => this.handleScroll(), 10);
        }, { passive: true });
    }

    handleScroll() {
        // Skip if locked or not on mobile
        if (this.isLocked || window.innerWidth > 767) {
            return;
        }

        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDelta = currentScrollY - this.lastScrollY;

        // Always show when at top of page
        if (currentScrollY < 10) {
            this.show();
            this.lastScrollY = currentScrollY;
            return;
        }

        // Determine scroll direction and show/hide
        if (scrollDelta > 0) {
            // Scrolling down (reading down the page)
            this.accumulatedScroll += scrollDelta;

            if (this.accumulatedScroll > this.threshold && this.visible) {
                this.hide();
            }
        } else if (scrollDelta < 0) {
            // Scrolling up (going back up the page)
            this.accumulatedScroll = 0; // Reset accumulator
            if (!this.visible) {
                this.show();
            }
        }

        this.lastScrollY = currentScrollY;
    }

    show() {
        if (!this.topBar || this.visible) return;

        this.topBar.classList.remove('hidden');
        this.visible = true;
        this.accumulatedScroll = 0;

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('TopBarController', 'Top bar shown');
        }
    }

    hide() {
        if (!this.topBar || !this.visible) return;

        this.topBar.classList.add('hidden');
        this.visible = false;

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('TopBarController', 'Top bar hidden');
        }
    }

    lock() {
        this.isLocked = true;
        this.show(); // Always show when locked
    }

    unlock() {
        this.isLocked = false;
    }

    isVisible() {
        return this.visible;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.topBarController = new TopBarController();
    });
} else {
    window.topBarController = new TopBarController();
}

// Export for module use
export default TopBarController;
