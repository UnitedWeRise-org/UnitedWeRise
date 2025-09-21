// Simple Smart Loading System
// Load JavaScript only when users actually need it

class SmartLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.loadingPromises = new Map();
    }

    // Load script only when needed
    async loadWhenNeeded(scriptPath, triggerSelector, description = '') {
        // If trigger element exists, load immediately
        const triggerElement = document.querySelector(triggerSelector);
        if (triggerElement) {
            console.log(`🚀 Loading ${description} (element found: ${triggerSelector})`);
            return this.loadScript(scriptPath);
        }

        // Otherwise, wait for the element to appear
        return new Promise((resolve) => {
            const observer = new MutationObserver(() => {
                const element = document.querySelector(triggerSelector);
                if (element) {
                    console.log(`🎯 Loading ${description} (trigger activated: ${triggerSelector})`);
                    observer.disconnect();
                    this.loadScript(scriptPath).then(resolve);
                }
            });

            // Use document.body if available, otherwise use document.documentElement
            const targetNode = document.body || document.documentElement;
            if (targetNode) {
                observer.observe(targetNode, {
                    childList: true,
                    subtree: true
                });
            } else {
                // If neither exists, wait for DOM ready and try again
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        observer.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                    });
                } else {
                    // DOM is already ready but no body - this shouldn't happen
                    console.warn('SmartLoader: Cannot observe DOM - no body element found');
                    resolve(null);
                }
            }
        });
    }

    // Load script on user action
    loadOnClick(scriptPath, buttonSelector, description = '') {
        document.addEventListener('click', (e) => {
            if (e.target.matches(buttonSelector) || e.target.closest(buttonSelector)) {
                console.log(`👆 Loading ${description} (clicked: ${buttonSelector})`);
                this.loadScript(scriptPath);
            }
        });
    }

    // Load script when user scrolls to section
    loadOnScroll(scriptPath, sectionSelector, description = '') {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log(`📜 Loading ${description} (scrolled to: ${sectionSelector})`);
                    this.loadScript(scriptPath);
                    observer.disconnect();
                }
            });
        });

        // Wait for the section to exist
        const waitForSection = () => {
            const section = document.querySelector(sectionSelector);
            if (section) {
                observer.observe(section);
            } else {
                setTimeout(waitForSection, 100);
            }
        };

        waitForSection();
    }

    // Core script loading function
    async loadScript(src) {
        // Return if already loaded
        if (this.loadedScripts.has(src)) {
            return Promise.resolve();
        }

        // Return existing promise if already loading
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src);
        }

        // Create loading promise
        const loadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            script.onload = () => {
                this.loadedScripts.add(src);
                console.log(`✅ Loaded: ${src}`);
                resolve();
            };

            script.onerror = () => {
                console.error(`❌ Failed to load: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });

        this.loadingPromises.set(src, loadingPromise);

        try {
            await loadingPromise;
        } finally {
            this.loadingPromises.delete(src);
        }

        return loadingPromise;
    }

    // Simple preload function
    preload(src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = src;
        document.head.appendChild(link);
        console.log(`🔮 Preloaded: ${src}`);
    }
}

// Create global instance
const smartLoader = new SmartLoader();

// PRACTICAL EXAMPLES - Only load what users actually use:

// 1. 🗺️ MAPS - Only load when user clicks "View Map" or goes to map page
smartLoader.loadOnClick('/src/js/map-maplibre.js', '[data-action="show-map"], .map-toggle, #map-view-btn', 'Map System');

// 2. 💳 PAYMENTS - Only load when user clicks "Donate" or "Pay"
smartLoader.loadOnClick('/src/js/donation-system.js', '[data-action="donate"], .donate-btn, #donation-button', 'Payment System');

// 3. 👨‍💼 CANDIDATE SYSTEM - Only load on candidate registration page
smartLoader.loadWhenNeeded('/src/components/CandidateSystem.js', '#candidate-registration, .candidate-form', 'Candidate Registration');

// 4. 📊 ADMIN - Only load on admin dashboard
smartLoader.loadWhenNeeded('/admin-scripts.js', '#admin-dashboard, .admin-panel', 'Admin Dashboard');

// 5. 📸 PHOTO SYSTEM - Only when user clicks "Add Photo"
smartLoader.loadOnClick('/src/components/PhotoSystem.js', '[data-action="upload-photo"], .photo-upload-btn', 'Photo Upload');

// 6. 💬 MESSAGING - Only when user clicks on messages
smartLoader.loadOnClick('/src/components/MessagingSystem.js', '[data-action="open-messages"], .messages-btn', 'Messaging System');

// 7. 🔍 ADVANCED SEARCH - Only when user uses search
smartLoader.loadOnClick('/src/modules/features/search/global-search.js', '[data-action="search"], #advanced-search', 'Advanced Search');

// Export for manual use
window.smartLoader = smartLoader;

console.log('🧠 Smart loading system ready - scripts will load only when needed!');