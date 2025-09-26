/**
 * SensitiveContentViewer Component
 * Created: September 26, 2025
 * Purpose: Handle display and interaction with sensitive content after user approval
 * Author: Claude Code Assistant
 *
 * Features:
 * - Wrapper for sensitive content with user controls
 * - Quick hide/report functionality
 * - Accessibility compliant content viewing
 * - Integration with content warning system
 * - User feedback and interaction tracking
 */

class SensitiveContentViewer {
    constructor() {
        this.viewedContent = new Set(); // Track viewed content for session
        this.initializeStyles();
        this.initializeEventListeners();
    }

    /**
     * Wrap sensitive content with viewer controls
     * @param {string} originalContent - Original post content HTML
     * @param {Object} contentFlags - Content moderation flags
     * @param {string} postId - Post ID for tracking
     * @returns {string} HTML string for sensitive content viewer
     */
    wrapSensitiveContent(originalContent, contentFlags, postId) {
        const viewerId = `sensitive-content-${postId}`;
        const isFirstView = !this.viewedContent.has(postId);

        // Mark as viewed
        this.viewedContent.add(postId);

        return `
            <div class="sensitive-content-viewer"
                 id="${viewerId}"
                 data-post-id="${postId}"
                 data-content-flags='${JSON.stringify(contentFlags)}'
                 style="display: none;"
                 tabindex="0"
                 role="region"
                 aria-labelledby="${viewerId}-label"
                 aria-describedby="${viewerId}-description">

                <!-- Content Label -->
                <div class="sensitive-content-header" id="${viewerId}-label">
                    <div class="content-type-indicator">
                        <span class="indicator-icon" aria-hidden="true">👁️</span>
                        <span class="indicator-text">Sensitive Content Visible</span>
                    </div>

                    <div class="viewer-controls">
                        <button type="button"
                                class="btn-hide-content"
                                data-post-id="${postId}"
                                aria-label="Hide this sensitive content"
                                title="Hide Content">
                            <span aria-hidden="true">🙈</span>
                            <span class="sr-only">Hide</span>
                        </button>

                        <button type="button"
                                class="btn-report-content"
                                data-post-id="${postId}"
                                aria-label="Report this content as inappropriately flagged"
                                title="Report Content">
                            <span aria-hidden="true">⚠️</span>
                            <span class="sr-only">Report</span>
                        </button>
                    </div>
                </div>

                <!-- First View Notice -->
                ${isFirstView ? `
                    <div class="first-view-notice" id="${viewerId}-description">
                        <p>You chose to view this content. Use the controls above to hide or report if needed.</p>
                    </div>
                ` : ''}

                <!-- Actual Content -->
                <div class="sensitive-content-body">
                    ${originalContent}
                </div>

                <!-- Content Footer -->
                <div class="sensitive-content-footer">
                    <div class="content-flags-display">
                        ${this.renderContentFlags(contentFlags)}
                    </div>

                    <div class="feedback-controls">
                        <button type="button"
                                class="btn-feedback-helpful"
                                data-post-id="${postId}"
                                aria-label="Mark content warning as helpful">
                            <span>Warning Helpful</span>
                        </button>

                        <button type="button"
                                class="btn-feedback-unhelpful"
                                data-post-id="${postId}"
                                aria-label="Mark content warning as unhelpful">
                            <span>Warning Unhelpful</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render content flags as user-friendly indicators
     * @param {Object} contentFlags - Content moderation flags
     * @returns {string} HTML for content flags display
     */
    renderContentFlags(contentFlags) {
        if (!contentFlags || typeof contentFlags !== 'object') {
            return '<span class="content-flag">General sensitivity</span>';
        }

        const flags = [];

        if (contentFlags.graphicNews) {
            flags.push('<span class="content-flag flag-news">Graphic News</span>');
        }
        if (contentFlags.medicalContent) {
            flags.push('<span class="content-flag flag-medical">Medical Content</span>');
        }
        if (contentFlags.disturbingContent) {
            flags.push('<span class="content-flag flag-disturbing">Potentially Disturbing</span>');
        }
        if (contentFlags.violence) {
            flags.push('<span class="content-flag flag-violence">Violence</span>');
        }
        if (contentFlags.accidents) {
            flags.push('<span class="content-flag flag-accident">Accident/Injury</span>');
        }

        return flags.length > 0 ? flags.join(' ') : '<span class="content-flag">Sensitive Content</span>';
    }

    /**
     * Initialize event listeners for sensitive content interactions
     */
    initializeEventListeners() {
        // Use event delegation for dynamically created viewers
        document.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            if (target.classList.contains('btn-hide-content')) {
                this.handleHideContent(target);
            } else if (target.classList.contains('btn-report-content')) {
                this.handleReportContent(target);
            } else if (target.classList.contains('btn-feedback-helpful')) {
                this.handleFeedback(target, 'helpful');
            } else if (target.classList.contains('btn-feedback-unhelpful')) {
                this.handleFeedback(target, 'unhelpful');
            }
        });

        // Handle keyboard navigation within sensitive content
        document.addEventListener('keydown', (event) => {
            if (event.target.closest('.sensitive-content-viewer')) {
                this.handleKeyboardNavigation(event);
            }
        });

        // Handle focus management
        document.addEventListener('focusin', (event) => {
            if (event.target.closest('.sensitive-content-viewer')) {
                this.handleFocusManagement(event);
            }
        });
    }

    /**
     * Handle hide content action
     * @param {HTMLElement} button - The clicked button
     */
    async handleHideContent(button) {
        const postId = button.dataset.postId;
        const viewer = document.getElementById(`sensitive-content-${postId}`);
        const warningScreen = document.getElementById(`content-warning-${postId}`);

        if (viewer) {
            // Hide viewer with animation
            viewer.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            viewer.style.opacity = '0';
            viewer.style.transform = 'scale(0.95)';

            setTimeout(() => {
                viewer.style.display = 'none';

                // Show warning screen again if it exists
                if (warningScreen) {
                    warningScreen.style.display = 'block';
                    warningScreen.focus();
                }
            }, 300);

            // Track user action for analytics (admin only)
            if (window.currentUser?.isAdmin) {
                await this.trackUserAction(postId, 'hide_after_viewing');
            }
        }
    }

    /**
     * Handle report content action
     * @param {HTMLElement} button - The clicked button
     */
    async handleReportContent(button) {
        const postId = button.dataset.postId;
        const viewer = button.closest('.sensitive-content-viewer');
        const contentFlags = viewer ? JSON.parse(viewer.dataset.contentFlags || '{}') : {};

        // Show report modal
        this.showReportModal(postId, contentFlags);

        // Track user action (admin only)
        if (window.currentUser?.isAdmin) {
            await this.trackUserAction(postId, 'report_content_flagging');
        }
    }

    /**
     * Handle feedback on content warning accuracy
     * @param {HTMLElement} button - The clicked button
     * @param {string} feedbackType - 'helpful' or 'unhelpful'
     */
    async handleFeedback(button, feedbackType) {
        const postId = button.dataset.postId;

        // Visual feedback
        button.style.background = feedbackType === 'helpful' ? '#28a745' : '#dc3545';
        button.style.color = 'white';
        button.disabled = true;

        // Disable the other feedback button
        const viewer = button.closest('.sensitive-content-viewer');
        const otherButton = viewer.querySelector(
            feedbackType === 'helpful' ? '.btn-feedback-unhelpful' : '.btn-feedback-helpful'
        );
        if (otherButton) {
            otherButton.disabled = true;
            otherButton.style.opacity = '0.5';
        }

        // Show thank you message
        this.showFeedbackThankYou(button, feedbackType);

        // Send feedback to backend (if available)
        try {
            await this.submitContentFeedback(postId, feedbackType);
        } catch (error) {
            console.error('SensitiveContentViewer: Error submitting feedback', error);
        }

        // Track user action (admin only)
        if (window.currentUser?.isAdmin) {
            await this.trackUserAction(postId, `feedback_${feedbackType}`);
        }
    }

    /**
     * Handle keyboard navigation within sensitive content viewer
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyboardNavigation(event) {
        const viewer = event.target.closest('.sensitive-content-viewer');
        if (!viewer) return;

        // Handle Escape key to hide content
        if (event.key === 'Escape') {
            const hideButton = viewer.querySelector('.btn-hide-content');
            if (hideButton) {
                hideButton.click();
            }
        }

        // Handle space/enter on viewer container
        if ((event.key === ' ' || event.key === 'Enter') && event.target === viewer) {
            event.preventDefault();
            const firstControl = viewer.querySelector('.btn-hide-content');
            if (firstControl) {
                firstControl.focus();
            }
        }
    }

    /**
     * Handle focus management for accessibility
     * @param {FocusEvent} event - The focus event
     */
    handleFocusManagement(event) {
        const viewer = event.target.closest('.sensitive-content-viewer');
        if (!viewer) return;

        // Add visual focus indicator to viewer container
        viewer.classList.add('has-focus');

        // Remove focus indicator when focus leaves
        const removeFocus = () => {
            viewer.classList.remove('has-focus');
            document.removeEventListener('focusout', removeFocus);
        };

        document.addEventListener('focusout', removeFocus);
    }

    /**
     * Show report modal for content flagging issues
     * @param {string} postId - Post ID
     * @param {Object} contentFlags - Content flags to report
     */
    showReportModal(postId, contentFlags) {
        const modalHTML = `
            <div class="content-report-modal" role="dialog" aria-labelledby="report-modal-title">
                <div class="modal-content">
                    <h2 id="report-modal-title">Report Content Flagging</h2>

                    <p>Help us improve content moderation by reporting issues with this content warning.</p>

                    <div class="report-options">
                        <h3>What's wrong with this content warning?</h3>

                        <label class="report-option">
                            <input type="radio" name="report-reason" value="over-flagged">
                            <span>Content is not actually sensitive</span>
                        </label>

                        <label class="report-option">
                            <input type="radio" name="report-reason" value="under-flagged">
                            <span>Content is more sensitive than indicated</span>
                        </label>

                        <label class="report-option">
                            <input type="radio" name="report-reason" value="wrong-category">
                            <span>Content is flagged in wrong category</span>
                        </label>

                        <label class="report-option">
                            <input type="radio" name="report-reason" value="technical-issue">
                            <span>Technical issue with content display</span>
                        </label>
                    </div>

                    <div class="report-details">
                        <label for="report-details-text">Additional details (optional):</label>
                        <textarea id="report-details-text"
                                  rows="3"
                                  placeholder="Provide any additional context that might help improve our content moderation..."></textarea>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-submit-report" data-post-id="${postId}">
                            Submit Report
                        </button>
                        <button type="button" class="btn-cancel-report">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Add event listeners
        const modal = modalContainer.querySelector('.content-report-modal');
        const submitBtn = modal.querySelector('.btn-submit-report');
        const cancelBtn = modal.querySelector('.btn-cancel-report');

        submitBtn.addEventListener('click', async () => {
            await this.submitContentReport(modal, postId);
            document.body.removeChild(modalContainer);
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });

        // Focus on modal for accessibility
        modal.focus();
    }

    /**
     * Submit content report to backend
     * @param {HTMLElement} modal - Report modal element
     * @param {string} postId - Post ID being reported
     */
    async submitContentReport(modal, postId) {
        const selectedReason = modal.querySelector('input[name="report-reason"]:checked');
        const details = modal.querySelector('#report-details-text').value;

        if (!selectedReason) {
            this.showNotification('Please select a reason for reporting.', 'error');
            return;
        }

        const reportData = {
            postId,
            reason: selectedReason.value,
            details: details.trim(),
            reportType: 'content_moderation',
            timestamp: new Date().toISOString()
        };

        try {
            // Submit to backend (implement when endpoint is available)
            // await window.apiCall('/moderation/report', {
            //     method: 'POST',
            //     body: JSON.stringify(reportData)
            // });

            this.showNotification('Thank you for your report. We\'ll review it shortly.', 'success');

            // Track for admin debugging
            if (window.currentUser?.isAdmin) {
                console.log('SensitiveContentViewer: Content report submitted', reportData);
            }
        } catch (error) {
            console.error('SensitiveContentViewer: Error submitting report', error);
            this.showNotification('Sorry, there was an error submitting your report. Please try again.', 'error');
        }
    }

    /**
     * Submit content feedback to backend
     * @param {string} postId - Post ID
     * @param {string} feedbackType - 'helpful' or 'unhelpful'
     */
    async submitContentFeedback(postId, feedbackType) {
        const feedbackData = {
            postId,
            feedbackType,
            timestamp: new Date().toISOString()
        };

        try {
            // Submit to backend (implement when endpoint is available)
            // await window.apiCall('/moderation/feedback', {
            //     method: 'POST',
            //     body: JSON.stringify(feedbackData)
            // });

            // Track for admin debugging
            if (window.currentUser?.isAdmin) {
                console.log('SensitiveContentViewer: Feedback submitted', feedbackData);
            }
        } catch (error) {
            throw error; // Re-throw for caller to handle
        }
    }

    /**
     * Track user actions for analytics
     * @param {string} postId - Post ID
     * @param {string} action - Action taken
     */
    async trackUserAction(postId, action) {
        try {
            const trackingData = {
                postId,
                action,
                timestamp: new Date().toISOString(),
                sessionId: this.getSessionId()
            };

            // Log for admin debugging
            console.log('SensitiveContentViewer: User action tracked', trackingData);

            // Could implement backend tracking here
            // await window.apiCall('/moderation/track', {
            //     method: 'POST',
            //     body: JSON.stringify(trackingData)
            // });
        } catch (error) {
            console.error('SensitiveContentViewer: Error tracking user action', error);
        }
    }

    /**
     * Get or create session ID for tracking
     * @returns {string} Session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('content-viewer-session');
        if (!sessionId) {
            sessionId = 'cv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('content-viewer-session', sessionId);
        }
        return sessionId;
    }

    /**
     * Show feedback thank you message
     * @param {HTMLElement} button - Button that was clicked
     * @param {string} feedbackType - Type of feedback given
     */
    showFeedbackThankYou(button, feedbackType) {
        const message = feedbackType === 'helpful'
            ? 'Thank you! Your feedback helps improve content warnings.'
            : 'Thank you! We\'ll work to improve our content detection.';

        const thankYou = document.createElement('div');
        thankYou.className = 'feedback-thank-you';
        thankYou.textContent = message;
        thankYou.style.cssText = `
            position: absolute;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
            color: #495057;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        button.style.position = 'relative';
        button.appendChild(thankYou);

        // Animate in
        setTimeout(() => {
            thankYou.style.opacity = '1';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            if (thankYou.parentNode) {
                thankYou.style.opacity = '0';
                setTimeout(() => {
                    if (thankYou.parentNode) {
                        button.removeChild(thankYou);
                    }
                }, 300);
            }
        }, 3000);
    }

    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - 'success', 'error', or 'info'
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `sensitive-content-notification ${type}`;
        notification.textContent = message;

        const bgColor = type === 'success' ? '#28a745' :
                       type === 'error' ? '#dc3545' : '#007bff';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            max-width: 300px;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    /**
     * Initialize CSS styles for sensitive content viewer
     */
    initializeStyles() {
        if (document.getElementById('sensitive-content-viewer-styles')) {
            return; // Styles already loaded
        }

        const styles = document.createElement('style');
        styles.id = 'sensitive-content-viewer-styles';
        styles.textContent = `
            /* Sensitive Content Viewer Styles */
            .sensitive-content-viewer {
                border: 1px solid #28a745;
                border-radius: 8px;
                background: #f8f9fa;
                margin: 1rem 0;
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .sensitive-content-viewer:focus {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }

            .sensitive-content-viewer.has-focus {
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
            }

            .sensitive-content-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: linear-gradient(90deg, #e8f5e8 0%, #f0f8f0 100%);
                border-bottom: 1px solid #28a745;
            }

            .content-type-indicator {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
                color: #155724;
                font-weight: 500;
            }

            .indicator-icon {
                font-size: 1.1rem;
                line-height: 1;
            }

            .viewer-controls {
                display: flex;
                gap: 0.5rem;
            }

            .viewer-controls button {
                background: white;
                border: 1px solid #28a745;
                border-radius: 4px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 1rem;
            }

            .viewer-controls button:hover {
                background: #28a745;
                color: white;
                transform: translateY(-1px);
            }

            .viewer-controls button:focus {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }

            .first-view-notice {
                padding: 0.75rem 1rem;
                background: #fff3cd;
                border-bottom: 1px solid #ffeaa7;
                font-size: 0.9rem;
                color: #856404;
            }

            .first-view-notice p {
                margin: 0;
                line-height: 1.4;
            }

            .sensitive-content-body {
                padding: 1rem;
                background: white;
            }

            .sensitive-content-footer {
                padding: 0.75rem 1rem;
                background: #f8f9fa;
                border-top: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .content-flags-display {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            .content-flag {
                background: #6c757d;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-size: 0.75rem;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }

            .content-flag.flag-news {
                background: #dc3545;
            }

            .content-flag.flag-medical {
                background: #007bff;
            }

            .content-flag.flag-disturbing {
                background: #fd7e14;
            }

            .content-flag.flag-violence {
                background: #6f42c1;
            }

            .content-flag.flag-accident {
                background: #e83e8c;
            }

            .feedback-controls {
                display: flex;
                gap: 0.5rem;
            }

            .feedback-controls button {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 0.375rem 0.75rem;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
                color: #495057;
            }

            .feedback-controls button:hover {
                border-color: #007bff;
                color: #007bff;
            }

            .feedback-controls button:disabled {
                cursor: not-allowed;
                opacity: 0.6;
            }

            .feedback-thank-you {
                animation: fadeInScale 0.3s ease;
            }

            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) scale(1);
                }
            }

            /* Content Report Modal */
            .content-report-modal {
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

            .content-report-modal .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }

            .report-options {
                margin: 1.5rem 0;
            }

            .report-options h3 {
                margin-bottom: 1rem;
                color: #495057;
                font-size: 1rem;
            }

            .report-option {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 0;
                cursor: pointer;
                transition: background-color 0.2s ease;
                border-radius: 4px;
                margin: 0.25rem 0;
            }

            .report-option:hover {
                background: #f8f9fa;
            }

            .report-option input[type="radio"] {
                margin: 0;
            }

            .report-details {
                margin: 1.5rem 0;
            }

            .report-details label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 500;
                color: #495057;
            }

            .report-details textarea {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-family: inherit;
                resize: vertical;
                min-height: 80px;
            }

            .report-details textarea:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
            }

            /* Mobile Responsive Design */
            @media (max-width: 768px) {
                .sensitive-content-header {
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: flex-start;
                }

                .viewer-controls {
                    align-self: flex-end;
                }

                .sensitive-content-footer {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.75rem;
                }

                .content-flags-display,
                .feedback-controls {
                    width: 100%;
                    justify-content: flex-start;
                }

                .content-report-modal .modal-content {
                    margin: 1rem;
                    padding: 1.5rem;
                }
            }

            @media (max-width: 480px) {
                .sensitive-content-viewer {
                    margin: 0.5rem 0;
                }

                .sensitive-content-header {
                    padding: 0.5rem;
                }

                .sensitive-content-body {
                    padding: 0.75rem;
                }

                .sensitive-content-footer {
                    padding: 0.5rem;
                }

                .viewer-controls button {
                    width: 32px;
                    height: 32px;
                    font-size: 0.9rem;
                }
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

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .sensitive-content-viewer {
                    border: 2px solid #000;
                }

                .sensitive-content-header {
                    background: #fff;
                    color: #000;
                    border-bottom: 2px solid #000;
                }

                .viewer-controls button {
                    border: 2px solid #000;
                    background: #fff;
                    color: #000;
                }

                .viewer-controls button:hover {
                    background: #000;
                    color: #fff;
                }

                .content-flag {
                    background: #000;
                    color: #fff;
                    border: 1px solid #fff;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .sensitive-content-viewer,
                .viewer-controls button,
                .feedback-controls button,
                .feedback-thank-you {
                    transition: none;
                }

                @keyframes fadeInScale {
                    from, to {
                        opacity: 1;
                        transform: translateX(-50%) scale(1);
                    }
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Initialize global instance and export
window.SensitiveContentViewer = SensitiveContentViewer;
export { SensitiveContentViewer };