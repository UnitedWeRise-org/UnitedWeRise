/**
 * AdminTabsManager - Handles tab functionality for admin dashboard
 * Extracted from inline HTML scripts for proper ES6 module architecture
 *
 * Handles analytics tabs, custom date range visibility, and other tab-based UI
 */

class AdminTabsManager {
    constructor() {
        this.tabs = new Map();
        this.panels = new Map();
        this.activeTab = null;

        // Bind methods
        this.init = this.init.bind(this);
        this.setupAnalyticsTabs = this.setupAnalyticsTabs.bind(this);
        this.switchTab = this.switchTab.bind(this);
        this.handleCustomDateRange = this.handleCustomDateRange.bind(this);
        this.registerTab = this.registerTab.bind(this);
    }

    /**
     * Initialize all tab managers
     */
    init() {
        try {
            this.setupAnalyticsTabs();
            console.log('✅ AdminTabsManager initialized');
        } catch (error) {
            console.error('❌ AdminTabsManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup analytics tab switching functionality
     * Replaces the inline setupAnalyticsTabs function
     */
    setupAnalyticsTabs() {
        const tabs = document.querySelectorAll('.analytics-tab');
        const panels = document.querySelectorAll('.tab-panel');

        // Store tab and panel references
        tabs.forEach(tab => {
            this.tabs.set(tab.dataset.tab, tab);
        });

        panels.forEach(panel => {
            this.panels.set(panel.id.replace('Tab', ''), panel);
        });

        // Add click handlers
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // Handle custom date range visibility
        this.handleCustomDateRange();

        console.log(`✅ Analytics tabs setup: ${tabs.length} tabs, ${panels.length} panels`);
    }

    /**
     * Switch to a specific tab
     */
    switchTab(targetTab) {
        try {
            // Remove active class from all tabs and panels
            this.tabs.forEach(tab => tab.classList.remove('active'));
            this.panels.forEach(panel => panel.classList.remove('active'));

            // Add active class to target tab
            const targetTabElement = this.tabs.get(targetTab);
            if (targetTabElement) {
                targetTabElement.classList.add('active');
                this.activeTab = targetTab;
            }

            // Show corresponding panel
            const targetPanel = document.getElementById(targetTab + 'Tab');
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            console.log(`Switched to analytics tab: ${targetTab}`);
        } catch (error) {
            console.error('Error switching tab:', error);
        }
    }

    /**
     * Handle custom date range visibility
     */
    handleCustomDateRange() {
        const dateRangeSelect = document.getElementById('analyticsDateRange');
        const customDateRange = document.querySelector('.custom-date-range');

        if (dateRangeSelect && customDateRange) {
            dateRangeSelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customDateRange.style.display = 'flex';
                } else {
                    customDateRange.style.display = 'none';
                }
            });
            console.log('✅ Custom date range handler setup');
        }
    }

    /**
     * Register a new tab for management
     */
    registerTab(tabId, tabElement, panelElement) {
        this.tabs.set(tabId, tabElement);
        this.panels.set(tabId, panelElement);

        // Add click handler
        tabElement.addEventListener('click', () => {
            this.switchTab(tabId);
        });
    }

    /**
     * Get current active tab
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.tabs.clear();
        this.panels.clear();
        this.activeTab = null;
        console.log('AdminTabsManager destroyed');
    }
}

// Export as ES6 module
export { AdminTabsManager };

// Global compatibility for legacy code
window.AdminTabsManager = AdminTabsManager;