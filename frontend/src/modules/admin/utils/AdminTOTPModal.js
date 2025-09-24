/**
 * AdminTOTPModal - TOTP confirmation modal for admin actions
 * Extracted from inline HTML scripts for proper ES6 module architecture
 *
 * Provides secure TOTP confirmation for sensitive admin operations
 */

class AdminTOTPModal {
    constructor() {
        this.currentModal = null;
        this.countdownInterval = null;
        this.timeLeft = 30;

        // Bind methods
        this.requestTOTPConfirmation = this.requestTOTPConfirmation.bind(this);
        this.createModal = this.createModal.bind(this);
        this.updateCountdown = this.updateCountdown.bind(this);
        this.cleanup = this.cleanup.bind(this);
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
    }

    /**
     * Request TOTP confirmation for an admin action
     * Replaces the inline requestTOTPConfirmation function
     *
     * @param {string} actionDescription - Description of the action requiring TOTP
     * @param {Object} options - Additional options (additionalInfo, timeout, etc.)
     * @returns {Promise} Promise that resolves with TOTP token or rejects on cancel/timeout
     */
    async requestTOTPConfirmation(actionDescription, options = {}) {
        return new Promise((resolve, reject) => {
            // Clean up any existing modal
            this.cleanup();

            // Create new modal
            const modal = this.createModal(actionDescription, options);
            this.currentModal = modal;

            // Reset timer
            this.timeLeft = options.timeout || 30;

            // Setup event handlers
            this.setupModalHandlers(modal, resolve, reject);

            // Start countdown
            this.startCountdown();

            // Show modal
            document.body.appendChild(modal);

            // Focus input
            const input = modal.querySelector('#totp-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        });
    }

    /**
     * Create the TOTP modal element
     */
    createModal(actionDescription, options) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 2000;
            display: flex; align-items: center; justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 2rem; max-width: 450px; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔐</div>
                    <h2 style="margin: 0; color: #2c3e50;">Security Verification Required</h2>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; border-left: 4px solid #e74c3c;">
                    <p style="margin: 0; font-weight: 600; color: #2c3e50;">Action: ${actionDescription}</p>
                    ${options.additionalInfo ? `<p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #7f8c8d;">${options.additionalInfo}</p>` : ''}
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2c3e50;">
                        Enter your current TOTP code:
                    </label>
                    <input type="text" id="totp-input" placeholder="000000" maxlength="6"
                           style="width: 100%; padding: 0.75rem; border: 2px solid #bdc3c7; border-radius: 6px; font-size: 1.2rem; text-align: center; font-family: monospace;"
                           autocomplete="off" inputmode="numeric" pattern="[0-9]*">
                    <div style="text-align: center; margin-top: 0.5rem; font-size: 0.9rem; color: #7f8c8d;">
                        Time remaining: <span id="totp-countdown" style="font-weight: 600;">${this.timeLeft}</span>s
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="totp-cancel" class="nav-button" style="background: #95a5a6; border-color: #95a5a6; color: white; flex: 1;">Cancel</button>
                    <button id="totp-confirm" class="nav-button" style="background: #e74c3c; border-color: #e74c3c; color: white; flex: 1;">Confirm Action</button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers(modal, resolve, reject) {
        const input = modal.querySelector('#totp-input');
        const confirmBtn = modal.querySelector('#totp-confirm');
        const cancelBtn = modal.querySelector('#totp-cancel');

        // Confirm button handler
        confirmBtn.onclick = () => this.handleConfirm(input, resolve, reject);

        // Cancel button handler
        cancelBtn.onclick = () => this.handleCancel(reject);

        // Enter key handler
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.length === 6) {
                this.handleConfirm(input, resolve, reject);
            }
        });

        // Input validation (numbers only)
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
        });

        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.handleCancel(reject);
            }
        });
    }

    /**
     * Handle confirm button click
     */
    handleConfirm(input, resolve, reject) {
        const totpCode = input.value.trim();

        if (totpCode.length !== 6) {
            // Shake the input to indicate error
            input.style.animation = 'shake 0.5s';
            input.style.borderColor = '#e74c3c';
            setTimeout(() => {
                input.style.animation = '';
                input.style.borderColor = '#bdc3c7';
            }, 500);

            // Show error message briefly
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Please enter a 6-digit TOTP code';
            errorMsg.style.cssText = 'color: #e74c3c; font-size: 0.85rem; text-align: center; margin-top: 0.5rem;';
            input.parentNode.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 3000);
            return;
        }

        this.cleanup();
        resolve({ totpToken: totpCode });
    }

    /**
     * Handle cancel button click
     */
    handleCancel(reject) {
        this.cleanup();
        reject(new Error('TOTP cancelled'));
    }

    /**
     * Start the countdown timer
     */
    startCountdown() {
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }

    /**
     * Update countdown display
     */
    updateCountdown() {
        if (!this.currentModal) return;

        const countdownElement = this.currentModal.querySelector('#totp-countdown');
        if (countdownElement) {
            countdownElement.textContent = this.timeLeft;
            if (this.timeLeft <= 10) {
                countdownElement.style.color = '#e74c3c';
                countdownElement.style.fontWeight = 'bold';
            }
        }

        this.timeLeft--;

        if (this.timeLeft < 0) {
            clearInterval(this.countdownInterval);
            this.cleanup();
            // The reject will be handled by the promise that's waiting
        }
    }

    /**
     * Clean up modal and intervals
     */
    cleanup() {
        // Clear countdown interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Clear input value
        if (this.currentModal) {
            const totpInput = this.currentModal.querySelector('#totp-input');
            if (totpInput) totpInput.value = '';
        }

        // Remove modal from DOM
        if (this.currentModal && this.currentModal.parentNode) {
            this.currentModal.parentNode.removeChild(this.currentModal);
        }

        this.currentModal = null;
        this.timeLeft = 30;
    }

    /**
     * Check if modal is currently active
     */
    isActive() {
        return this.currentModal !== null;
    }
}

// Create global instance
const adminTOTPModal = new AdminTOTPModal();

// Export as ES6 module
export { AdminTOTPModal, adminTOTPModal };

// Global compatibility - replace the inline function
window.requestTOTPConfirmation = adminTOTPModal.requestTOTPConfirmation;
window.AdminTOTPModal = AdminTOTPModal;

// Add CSS for shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);