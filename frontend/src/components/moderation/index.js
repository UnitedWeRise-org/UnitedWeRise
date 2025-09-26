/**
 * Content Moderation System - ES6 Module Integration
 * Created: September 26, 2025
 * Purpose: Initialize and coordinate content moderation components
 * Author: Claude Code Assistant
 *
 * This module provides a centralized way to initialize the content moderation system
 * and ensures proper component integration with the existing PostComponent system.
 */

import { ContentWarningScreen } from './ContentWarningScreen.js';
import { SensitiveContentViewer } from './SensitiveContentViewer.js';

/**
 * Content Moderation Manager
 * Coordinates between content warning and sensitive content viewing components
 */
class ContentModerationManager {
    constructor() {
        this.isInitialized = false;
        this.warningScreen = null;
        this.sensitiveViewer = null;
        this.userPreferences = null;
    }

    /**
     * Initialize the content moderation system
     * Should be called after DOM is ready
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('ContentModeration: Already initialized');
            return;
        }

        try {
            // Initialize components
            this.warningScreen = new ContentWarningScreen();
            this.sensitiveViewer = new SensitiveContentViewer();

            // Load user preferences
            await this.loadUserPreferences();

            // Initialize event coordination
            this.initializeEventCoordination();

            // Mark as initialized
            this.isInitialized = true;

            // Make components globally available for PostComponent integration
            window.ContentWarningScreen = ContentWarningScreen;
            window.SensitiveContentViewer = SensitiveContentViewer;
            window.contentModerationManager = this;

            console.log('ContentModeration: System initialized successfully');

            // Debug logging for admin users
            if (window.currentUser?.isAdmin) {
                console.log('ContentModeration: Admin mode - enhanced logging enabled');
            }

        } catch (error) {
            console.error('ContentModeration: Initialization failed', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Load user preferences from localStorage
     */
    async loadUserPreferences() {
        try {
            const stored = localStorage.getItem('content-moderation-preferences');
            this.userPreferences = stored ? JSON.parse(stored) : {
                showGraphicNews: false,
                showMedicalContent: false,
                showDisturbingContent: false,
                autoHideSensitiveContent: true,
                rememberChoices: false
            };

            // Apply preferences to components
            if (this.warningScreen) {
                this.warningScreen.userPreferences = this.userPreferences;
            }

        } catch (error) {
            console.error('ContentModeration: Error loading user preferences', error);
            this.userPreferences = {
                showGraphicNews: false,
                showMedicalContent: false,
                showDisturbingContent: false,
                autoHideSensitiveContent: true,
                rememberChoices: false
            };
        }
    }

    /**
     * Save user preferences to localStorage
     * @param {Object} preferences - Updated preferences object
     */
    async saveUserPreferences(preferences) {
        try {
            this.userPreferences = { ...this.userPreferences, ...preferences };
            localStorage.setItem('content-moderation-preferences', JSON.stringify(this.userPreferences));

            // Update components
            if (this.warningScreen) {
                this.warningScreen.userPreferences = this.userPreferences;
            }

            // Log for admin debugging
            if (window.currentUser?.isAdmin) {
                console.log('ContentModeration: User preferences updated', this.userPreferences);
            }

        } catch (error) {
            console.error('ContentModeration: Error saving user preferences', error);
        }
    }

    /**
     * Initialize event coordination between components
     */
    initializeEventCoordination() {
        // Listen for content preference changes
        document.addEventListener('content-preferences-changed', (event) => {
            this.saveUserPreferences(event.detail.preferences);
        });

        // Listen for content warning dismissals
        document.addEventListener('content-warning-dismissed', (event) => {
            if (window.currentUser?.isAdmin) {
                console.log('ContentModeration: Warning dismissed', event.detail);
            }
        });

        // Listen for sensitive content views
        document.addEventListener('sensitive-content-viewed', (event) => {
            if (window.currentUser?.isAdmin) {
                console.log('ContentModeration: Sensitive content viewed', event.detail);
            }
        });

        // Listen for content reports
        document.addEventListener('content-moderation-reported', (event) => {
            this.handleContentReport(event.detail);
        });
    }

    /**
     * Handle content reports from users
     * @param {Object} reportData - Report data from user
     */
    async handleContentReport(reportData) {
        try {
            // Log report for admin review
            if (window.currentUser?.isAdmin) {
                console.log('ContentModeration: Content report received', reportData);
            }

            // Could send to backend here when endpoint is available
            // await window.apiCall('/moderation/report', {
            //     method: 'POST',
            //     body: JSON.stringify(reportData)
            // });

            // Show confirmation to user
            this.showUserNotification('Thank you for your report. We\'ll review it shortly.', 'success');

        } catch (error) {
            console.error('ContentModeration: Error handling content report', error);
            this.showUserNotification('Sorry, there was an error submitting your report.', 'error');
        }
    }

    /**
     * Check if content should be filtered based on flags and user preferences
     * @param {Object} contentFlags - Content moderation flags from backend
     * @returns {Object} Filtering decision and reason
     */
    evaluateContent(contentFlags) {
        if (!contentFlags || typeof contentFlags !== 'object') {
            return { shouldFilter: false, reason: 'no-flags' };
        }

        const prefs = this.userPreferences;

        // Check each content type against user preferences
        if (contentFlags.graphicNews && !prefs.showGraphicNews) {
            return { shouldFilter: true, reason: 'graphic-news', flags: contentFlags };
        }

        if (contentFlags.medicalContent && !prefs.showMedicalContent) {
            return { shouldFilter: true, reason: 'medical-content', flags: contentFlags };
        }

        if (contentFlags.disturbingContent && !prefs.showDisturbingContent) {
            return { shouldFilter: true, reason: 'disturbing-content', flags: contentFlags };
        }

        if (contentFlags.violence && !prefs.showViolentContent) {
            return { shouldFilter: true, reason: 'violence', flags: contentFlags };
        }

        return { shouldFilter: false, reason: 'user-preferences-allow', flags: contentFlags };
    }

    /**
     * Generate user-friendly content description from flags
     * @param {Object} contentFlags - Content flags object
     * @returns {string} Human-readable description
     */
    getContentDescription(contentFlags) {
        if (!contentFlags) return 'sensitive content';

        const descriptions = [];
        if (contentFlags.graphicNews) descriptions.push('graphic news');
        if (contentFlags.medicalContent) descriptions.push('medical content');
        if (contentFlags.disturbingContent) descriptions.push('disturbing material');
        if (contentFlags.violence) descriptions.push('violent content');
        if (contentFlags.accidents) descriptions.push('accident footage');

        if (descriptions.length === 0) return 'sensitive content';
        if (descriptions.length === 1) return descriptions[0];

        const last = descriptions.pop();
        return descriptions.join(', ') + ' and ' + last;
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - 'success', 'error', 'warning', or 'info'
     */
    showUserNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `content-moderation-notification ${type}`;
        notification.textContent = message;

        const bgColors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#007bff'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColors[type] || bgColors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            max-width: 350px;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            font-size: 14px;
            line-height: 1.4;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, type === 'error' ? 5000 : 3000);
    }

    /**
     * Handle initialization errors gracefully
     * @param {Error} error - Initialization error
     */
    handleInitializationError(error) {
        // Provide fallback functionality
        window.ContentWarningScreen = class {
            shouldHideContent() { return false; }
            renderWarningScreen() { return ''; }
        };

        window.SensitiveContentViewer = class {
            wrapSensitiveContent(content) { return content; }
        };

        // Show error to admin users only
        if (window.currentUser?.isAdmin) {
            this.showUserNotification('Content moderation system failed to initialize', 'error');
        }
    }

    /**
     * Get system status for debugging
     * @returns {Object} System status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            warningScreenAvailable: !!this.warningScreen,
            sensitiveViewerAvailable: !!this.sensitiveViewer,
            userPreferences: this.userPreferences,
            lastError: this.lastError || null
        };
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const manager = new ContentModerationManager();
    await manager.initialize();
});

// Export for manual initialization if needed
export { ContentModerationManager, ContentWarningScreen, SensitiveContentViewer };