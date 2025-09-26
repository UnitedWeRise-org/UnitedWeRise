/**
 * ContentWarningScreen Component
 * Created: September 26, 2025
 * Purpose: Display content warnings for potentially sensitive content
 * Author: Claude Code Assistant
 *
 * Features:
 * - Professional warning overlay for sensitive content
 * - Accessibility compliant (ARIA labels, keyboard navigation)
 * - Mobile responsive design
 * - User choice to view or hide content
 * - Integration with existing PostComponent system
 */

class ContentWarningScreen {
    constructor() {
        this.userPreferences = this.loadUserPreferences();
        this.initializeStyles();
    }

    /**
     * Load user preferences for content viewing
     * @returns {Object} User preferences object
     */
    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('content-warning-preferences');
            return prefs ? JSON.parse(prefs) : {
                showGraphicNews: false,
                showMedicalContent: false,
                showDisturbingContent: false,
                rememberChoice: false
            };
        } catch (error) {
            console.error('ContentWarning: Error loading user preferences', error);
            return {
                showGraphicNews: false,
                showMedicalContent: false,
                showDisturbingContent: false,
                rememberChoice: false
            };
        }
    }

    /**
     * Save user preferences for content viewing
     * @param {Object} preferences - Updated preferences object
     */
    saveUserPreferences(preferences) {
        try {
            localStorage.setItem('content-warning-preferences', JSON.stringify(preferences));
            this.userPreferences = preferences;
        } catch (error) {
            console.error('ContentWarning: Error saving user preferences', error);
        }
    }

    /**
     * Check if content should be hidden based on user preferences and content flags
     * @param {Object} contentFlags - Content moderation flags from backend
     * @returns {boolean} True if content should be hidden
     */
    shouldHideContent(contentFlags) {
        if (!contentFlags || typeof contentFlags !== 'object') {
            return false;
        }

        // Check each content type against user preferences
        if (contentFlags.graphicNews && !this.userPreferences.showGraphicNews) {
            return true;
        }
        if (contentFlags.medicalContent && !this.userPreferences.showMedicalContent) {
            return true;
        }
        if (contentFlags.disturbingContent && !this.userPreferences.showDisturbingContent) {
            return true;
        }

        return false;
    }

    /**
     * Generate content warning message based on flags
     * @param {Object} contentFlags - Content moderation flags
     * @returns {string} Warning message
     */
    getWarningMessage(contentFlags) {
        if (!contentFlags) return 'This content may be sensitive.';

        const warnings = [];
        if (contentFlags.graphicNews) {
            warnings.push('graphic news content');
        }
        if (contentFlags.medicalContent) {
            warnings.push('medical or educational content');
        }
        if (contentFlags.disturbingContent) {
            warnings.push('potentially disturbing material');
        }

        if (warnings.length === 0) {
            return 'This content may be sensitive.';
        }

        if (warnings.length === 1) {
            return `This content contains ${warnings[0]}.`;
        }

        return `This content contains ${warnings.slice(0, -1).join(', ')} and ${warnings[warnings.length - 1]}.`;
    }

    /**
     * Render content warning overlay
     * @param {Object} contentFlags - Content moderation flags
     * @param {string} postId - Post ID for tracking
     * @returns {string} HTML string for warning overlay
     */
    renderWarningScreen(contentFlags, postId) {
        const warningMessage = this.getWarningMessage(contentFlags);
        const warningId = `content-warning-${postId}`;
        const contentId = `sensitive-content-${postId}`;

        return `
            <div class="content-warning-overlay"
                 id="${warningId}"
                 data-post-id="${postId}"
                 role="dialog"
                 aria-labelledby="${warningId}-title"
                 aria-describedby="${warningId}-description"
                 tabindex="0">

                <div class="content-warning-container">
                    <div class="content-warning-icon" aria-hidden="true">
                        ⚠️
                    </div>

                    <h3 class="content-warning-title" id="${warningId}-title">
                        Sensitive Content Warning
                    </h3>

                    <p class="content-warning-description" id="${warningId}-description">
                        ${warningMessage}
                    </p>

                    <div class="content-warning-actions">
                        <button type="button"
                                class="btn-view-content"
                                data-content-id="${contentId}"
                                data-post-id="${postId}"
                                aria-describedby="${warningId}-description">
                            <span>View Content</span>
                            <span class="sr-only">Show the flagged content</span>
                        </button>

                        <button type="button"
                                class="btn-hide-content"
                                data-post-id="${postId}"
                                aria-describedby="${warningId}-description">
                            <span>Keep Hidden</span>
                            <span class="sr-only">Keep content hidden and skip this post</span>
                        </button>
                    </div>

                    <div class="content-warning-preferences">
                        <label class="preference-checkbox">
                            <input type="checkbox"
                                   id="remember-choice-${postId}"
                                   data-post-id="${postId}">
                            <span class="checkmark" aria-hidden="true"></span>
                            Remember my choice for similar content
                        </label>
                    </div>

                    <div class="content-warning-footer">
                        <button type="button"
                                class="btn-settings-link"
                                aria-label="Open content filtering settings">
                            Content Settings
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize event listeners for content warning interactions
     */
    initializeEventListeners() {
        // Use event delegation for dynamically created warning screens
        document.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            if (target.classList.contains('btn-view-content')) {
                this.handleViewContent(target);
            } else if (target.classList.contains('btn-hide-content')) {
                this.handleHideContent(target);
            } else if (target.classList.contains('btn-settings-link')) {
                this.handleSettingsClick(target);
            }
        });

        // Handle checkbox changes for preference saving
        document.addEventListener('change', (event) => {
            if (event.target.matches('input[type="checkbox"][id^="remember-choice-"]')) {
                this.handlePreferenceChange(event.target);
            }
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (event.target.closest('.content-warning-overlay')) {
                this.handleKeyboardNavigation(event);
            }
        });
    }

    /**
     * Handle view content button click
     * @param {HTMLElement} button - The clicked button
     */
    handleViewContent(button) {
        const postId = button.dataset.postId;
        const contentId = button.dataset.contentId;
        const warningOverlay = document.getElementById(`content-warning-${postId}`);
        const sensitiveContent = document.getElementById(contentId);

        if (warningOverlay && sensitiveContent) {
            // Hide warning overlay
            warningOverlay.style.display = 'none';

            // Show sensitive content
            sensitiveContent.style.display = 'block';

            // Focus on content for accessibility
            sensitiveContent.focus();

            // Handle remember choice if checked
            const rememberCheckbox = document.getElementById(`remember-choice-${postId}`);
            if (rememberCheckbox && rememberCheckbox.checked) {
                this.updatePreferencesFromContent(warningOverlay, true);
            }

            // Log for debugging (admin only)
            if (window.currentUser?.isAdmin) {
                console.log(`ContentWarning: User chose to view content for post ${postId}`);
            }
        }
    }

    /**
     * Handle hide content button click
     * @param {HTMLElement} button - The clicked button
     */
    handleHideContent(button) {
        const postId = button.dataset.postId;
        const postElement = button.closest('.post-component');

        if (postElement) {
            // Handle remember choice if checked
            const rememberCheckbox = document.getElementById(`remember-choice-${postId}`);
            if (rememberCheckbox && rememberCheckbox.checked) {
                this.updatePreferencesFromContent(button.closest('.content-warning-overlay'), false);
            }

            // Hide entire post with smooth animation
            postElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            postElement.style.opacity = '0';
            postElement.style.transform = 'translateY(-20px)';

            setTimeout(() => {
                postElement.style.display = 'none';
            }, 300);

            // Log for debugging (admin only)
            if (window.currentUser?.isAdmin) {
                console.log(`ContentWarning: User chose to hide content for post ${postId}`);
            }
        }
    }

    /**
     * Handle settings button click
     * @param {HTMLElement} button - The clicked button
     */
    handleSettingsClick(button) {
        // TODO: Integrate with user settings modal when available
        this.showContentPreferencesModal();
    }

    /**
     * Handle keyboard navigation within warning overlay
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyboardNavigation(event) {
        const overlay = event.target.closest('.content-warning-overlay');
        if (!overlay) return;

        // Handle Escape key
        if (event.key === 'Escape') {
            const hideButton = overlay.querySelector('.btn-hide-content');
            if (hideButton) {
                hideButton.click();
            }
        }

        // Handle Tab navigation
        if (event.key === 'Tab') {
            const focusableElements = overlay.querySelectorAll(
                'button, input[type="checkbox"], [tabindex]:not([tabindex="-1"])'
            );

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Update user preferences based on content type and choice
     * @param {HTMLElement} warningElement - Warning overlay element
     * @param {boolean} showContent - Whether user chose to show content
     */
    updatePreferencesFromContent(warningElement, showContent) {
        // This would need to be enhanced based on specific content flags
        // For now, implement basic preference updating
        const newPreferences = { ...this.userPreferences };
        newPreferences.rememberChoice = true;

        // Update based on content type (would need content flags from backend)
        // This is a simplified implementation
        newPreferences.showGraphicNews = showContent;

        this.saveUserPreferences(newPreferences);
    }

    /**
     * Show content preferences modal
     */
    showContentPreferencesModal() {
        // Create modal for content preferences
        const modalHTML = `
            <div class="content-preferences-modal" role="dialog" aria-labelledby="content-prefs-title">
                <div class="modal-content">
                    <h2 id="content-prefs-title">Content Filtering Preferences</h2>

                    <div class="preference-group">
                        <h3>Content Types</h3>

                        <label class="preference-item">
                            <input type="checkbox"
                                   id="pref-graphic-news"
                                   ${this.userPreferences.showGraphicNews ? 'checked' : ''}>
                            <span>Show graphic news content</span>
                        </label>

                        <label class="preference-item">
                            <input type="checkbox"
                                   id="pref-medical-content"
                                   ${this.userPreferences.showMedicalContent ? 'checked' : ''}>
                            <span>Show medical/educational content</span>
                        </label>

                        <label class="preference-item">
                            <input type="checkbox"
                                   id="pref-disturbing-content"
                                   ${this.userPreferences.showDisturbingContent ? 'checked' : ''}>
                            <span>Show potentially disturbing content</span>
                        </label>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-save-preferences">Save Preferences</button>
                        <button type="button" class="btn-cancel-preferences">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Add event listeners for modal
        const modal = modalContainer.querySelector('.content-preferences-modal');
        const saveBtn = modal.querySelector('.btn-save-preferences');
        const cancelBtn = modal.querySelector('.btn-cancel-preferences');

        saveBtn.addEventListener('click', () => {
            this.savePreferencesFromModal(modal);
            document.body.removeChild(modalContainer);
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });

        // Focus on modal for accessibility
        modal.focus();
    }

    /**
     * Save preferences from modal form
     * @param {HTMLElement} modal - Modal element
     */
    savePreferencesFromModal(modal) {
        const newPreferences = {
            showGraphicNews: modal.querySelector('#pref-graphic-news').checked,
            showMedicalContent: modal.querySelector('#pref-medical-content').checked,
            showDisturbingContent: modal.querySelector('#pref-disturbing-content').checked,
            rememberChoice: true
        };

        this.saveUserPreferences(newPreferences);

        // Show success message
        this.showNotification('Content preferences saved successfully!');
    }

    /**
     * Show notification message
     * @param {string} message - Notification message
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'content-warning-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Initialize CSS styles for content warning system
     */
    initializeStyles() {
        if (document.getElementById('content-warning-styles')) {
            return; // Styles already loaded
        }

        const styles = document.createElement('style');
        styles.id = 'content-warning-styles';
        styles.textContent = `
            /* Content Warning Overlay Styles */
            .content-warning-overlay {
                background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
                border: 2px solid #ffc107;
                border-radius: 12px;
                padding: 2rem;
                margin: 1rem 0;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                position: relative;
                max-width: 500px;
                margin-left: auto;
                margin-right: auto;
            }

            .content-warning-overlay:focus {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }

            .content-warning-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }

            .content-warning-icon {
                font-size: 3rem;
                line-height: 1;
                margin-bottom: 0.5rem;
            }

            .content-warning-title {
                color: #dc3545;
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0;
                line-height: 1.3;
            }

            .content-warning-description {
                color: #495057;
                font-size: 1rem;
                line-height: 1.5;
                margin: 0;
                max-width: 400px;
            }

            .content-warning-actions {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                justify-content: center;
                margin-top: 0.5rem;
            }

            .content-warning-actions button {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 6px;
                font-size: 0.95rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 120px;
            }

            .btn-view-content {
                background: #007bff;
                color: white;
            }

            .btn-view-content:hover {
                background: #0056b3;
                transform: translateY(-1px);
            }

            .btn-hide-content {
                background: #6c757d;
                color: white;
            }

            .btn-hide-content:hover {
                background: #545b62;
                transform: translateY(-1px);
            }

            .content-warning-preferences {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid #dee2e6;
                width: 100%;
            }

            .preference-checkbox {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                font-size: 0.9rem;
                color: #6c757d;
                cursor: pointer;
            }

            .preference-checkbox input[type="checkbox"] {
                margin: 0;
            }

            .content-warning-footer {
                margin-top: 0.5rem;
                padding-top: 0.5rem;
                border-top: 1px solid #e9ecef;
                width: 100%;
            }

            .btn-settings-link {
                background: none;
                border: none;
                color: #007bff;
                text-decoration: underline;
                cursor: pointer;
                font-size: 0.85rem;
                padding: 0.25rem 0.5rem;
            }

            .btn-settings-link:hover {
                color: #0056b3;
            }

            /* Screen reader only text */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }

            /* Content Preferences Modal */
            .content-preferences-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }

            .content-preferences-modal .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }

            .preference-group h3 {
                margin-bottom: 1rem;
                color: #495057;
            }

            .preference-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 0;
                cursor: pointer;
            }

            .modal-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid #dee2e6;
            }

            .modal-actions button {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            }

            .btn-save-preferences {
                background: #28a745;
                color: white;
            }

            .btn-cancel-preferences {
                background: #6c757d;
                color: white;
            }

            /* Mobile Responsive Design */
            @media (max-width: 768px) {
                .content-warning-overlay {
                    margin: 0.5rem;
                    padding: 1.5rem;
                }

                .content-warning-actions {
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .content-warning-actions button {
                    width: 100%;
                    min-width: auto;
                }

                .content-warning-icon {
                    font-size: 2.5rem;
                }

                .content-warning-title {
                    font-size: 1.1rem;
                }

                .content-preferences-modal .modal-content {
                    margin: 1rem;
                    padding: 1.5rem;
                }

                .modal-actions {
                    flex-direction: column;
                }
            }

            @media (max-width: 480px) {
                .content-warning-overlay {
                    margin: 0.25rem;
                    padding: 1rem;
                }

                .content-warning-description {
                    font-size: 0.9rem;
                }
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .content-warning-overlay {
                    border: 3px solid #000;
                    background: #fff;
                }

                .content-warning-title {
                    color: #000;
                }

                .btn-view-content {
                    background: #000;
                    color: #fff;
                    border: 2px solid #000;
                }

                .btn-hide-content {
                    background: #fff;
                    color: #000;
                    border: 2px solid #000;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .content-warning-overlay,
                .content-warning-actions button,
                .content-warning-notification {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Initialize global instance and export
window.ContentWarningScreen = ContentWarningScreen;
export { ContentWarningScreen };