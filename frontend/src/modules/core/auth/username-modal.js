/**
 * @module modules/core/auth/username-modal
 * @description Username selection modal for OAuth onboarding
 *
 * Shows a modal prompting new OAuth users to select a username
 * before completing their registration.
 */

import { getApiBaseUrl } from '../../../utils/environment.js';
import { showAuthMessage, closeAuthModal } from './modal.js';
import { unifiedAuthManager } from './unified-manager.js';

export class UsernameModal {
    constructor() {
        this.modalElement = null;
        this.onComplete = null;
    }

    /**
     * Show username selection modal for OAuth users
     * @param {Object} userData - User data from OAuth response
     * @param {string} csrfToken - CSRF token for API calls
     * @param {Function} onComplete - Callback when username is selected
     */
    show(userData, csrfToken, onComplete) {
        this.onComplete = onComplete;
        this.csrfToken = csrfToken;
        this.userData = userData;

        // Create modal HTML
        const modalHtml = `
            <div class="auth-modal-overlay" id="usernameModalOverlay" style="display: block;">
                <div class="auth-modal">
                    <div class="auth-modal-header">
                        <h2>Welcome to United We Rise!</h2>
                        <p>Please choose a username to complete your registration</p>
                    </div>

                    <form id="usernameSelectionForm" class="auth-form">
                        <div class="form-group">
                            <label for="usernameInput">Username</label>
                            <input
                                type="text"
                                id="usernameInput"
                                name="username"
                                required
                                minlength="3"
                                maxlength="30"
                                pattern="[a-zA-Z0-9_]+"
                                placeholder="Choose a username"
                                autocomplete="off"
                            />
                            <small class="form-help">
                                3-30 characters, letters, numbers, and underscores only
                            </small>
                            <div id="username-validation" style="margin-top: 5px; min-height: 20px;">
                                <span id="username-status" style="display: none;">✓</span>
                                <span id="username-error" style="display: none;">✗</span>
                                <span id="username-message"></span>
                            </div>
                        </div>

                        <div id="usernameErrorMessage" class="error-message" style="display: none;"></div>

                        <button type="submit" class="btn btn-primary" id="usernameSubmitButton">
                            Complete Registration
                        </button>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modal if present
        this.hide();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modalElement = document.getElementById('usernameModalOverlay');

        // Setup event listeners
        this.setupEventListeners();

        // Focus username input
        setTimeout(() => {
            document.getElementById('usernameInput')?.focus();
        }, 100);
    }

    /**
     * Setup event listeners for the modal
     */
    setupEventListeners() {
        const form = document.getElementById('usernameSelectionForm');
        const usernameInput = document.getElementById('usernameInput');

        // Real-time username validation
        let usernameCheckTimeout;
        usernameInput.addEventListener('input', (event) => {
            clearTimeout(usernameCheckTimeout);
            const username = event.target.value;

            // Clear validation if too short
            if (username.length < 3) {
                this.updateValidationUI(null);
                return;
            }

            // Check format
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                this.updateValidationUI({
                    type: 'error',
                    message: 'Only letters, numbers, and underscores allowed'
                });
                return;
            }

            // Debounced availability check
            usernameCheckTimeout = setTimeout(() => {
                this.checkUsernameAvailability(username);
            }, 500);
        });

        // Form submission
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.submitUsername();
        });
    }

    /**
     * Check username availability via API
     */
    async checkUsernameAvailability(username) {
        try {
            const apiBase = getApiBaseUrl();
            const response = await fetch(`${apiBase}/auth/check-username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (data.available) {
                this.updateValidationUI({
                    type: 'success',
                    message: 'Username is available'
                });
            } else {
                this.updateValidationUI({
                    type: 'error',
                    message: 'Username is already taken'
                });
            }
        } catch (error) {
            console.error('Username check failed:', error);
            this.updateValidationUI(null);
        }
    }

    /**
     * Update validation UI
     */
    updateValidationUI(validation) {
        const statusElement = document.getElementById('username-status');
        const errorElement = document.getElementById('username-error');
        const messageElement = document.getElementById('username-message');

        if (!statusElement || !errorElement || !messageElement) {
            return;
        }

        // Hide all first
        statusElement.style.display = 'none';
        errorElement.style.display = 'none';
        messageElement.style.display = 'none';

        if (validation) {
            if (validation.type === 'success') {
                statusElement.style.display = 'inline';
                messageElement.innerHTML = `<span style="color: #27ae60;">${validation.message}</span>`;
                messageElement.style.display = 'inline';
            } else if (validation.type === 'error') {
                errorElement.style.display = 'inline';
                messageElement.innerHTML = `<span style="color: #e74c3c;">${validation.message}</span>`;
                messageElement.style.display = 'inline';
            }
        }
    }

    /**
     * Submit selected username to complete onboarding
     */
    async submitUsername() {
        const usernameInput = document.getElementById('usernameInput');
        const submitButton = document.getElementById('usernameSubmitButton');
        const errorMessage = document.getElementById('usernameErrorMessage');
        const username = usernameInput.value.trim();

        // Validate username
        if (username.length < 3) {
            errorMessage.textContent = 'Username must be at least 3 characters';
            errorMessage.style.display = 'block';
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorMessage.textContent = 'Username can only contain letters, numbers, and underscores';
            errorMessage.style.display = 'block';
            return;
        }

        // Disable form during submission
        usernameInput.disabled = true;
        submitButton.disabled = true;
        submitButton.textContent = 'Completing Registration...';
        errorMessage.style.display = 'none';

        try {
            const apiBase = getApiBaseUrl();
            const response = await fetch(`${apiBase}/auth/complete-onboarding`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (response.ok) {
                // Update user data with new username
                const updatedUser = { ...this.userData, ...data.user };

                // Close modal
                this.hide();

                // Update unified auth manager
                await unifiedAuthManager.setAuthenticatedUser(updatedUser, this.csrfToken);

                // Close any auth modals
                closeAuthModal();

                // Show success message
                showAuthMessage('Welcome to United We Rise! Your account is ready.', 'success');

                // Call completion callback
                if (this.onComplete) {
                    this.onComplete(updatedUser);
                }
            } else {
                // Show error
                errorMessage.textContent = data.error || 'Failed to set username. Please try again.';
                errorMessage.style.display = 'block';

                // Re-enable form
                usernameInput.disabled = false;
                submitButton.disabled = false;
                submitButton.textContent = 'Complete Registration';
            }
        } catch (error) {
            console.error('Complete onboarding error:', error);
            errorMessage.textContent = 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';

            // Re-enable form
            usernameInput.disabled = false;
            submitButton.disabled = false;
            submitButton.textContent = 'Complete Registration';
        }
    }

    /**
     * Hide and remove the modal
     */
    hide() {
        const existingModal = document.getElementById('usernameModalOverlay');
        if (existingModal) {
            existingModal.remove();
        }
        this.modalElement = null;
    }
}

// Create and export singleton instance
export const usernameModal = new UsernameModal();
