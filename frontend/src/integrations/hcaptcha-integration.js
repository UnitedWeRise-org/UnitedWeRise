/**
 * @module integrations/hcaptcha-integration
 * @description HCaptcha integration for CAPTCHA verification
 *
 * Provides callback function required by external HCaptcha library.
 * This MUST remain globally accessible as window.onHCaptchaCallback
 * because it's called by the third-party HCaptcha widget.
 *
 * Created: October 11, 2025 (Batch 3 - extracted from critical-functions.js)
 */

// ============================================================================
// HCAPTCHA CALLBACK
// ============================================================================

/**
 * HCaptcha verification callback
 * Called by HCaptcha widget after user completes challenge
 * @param {string} token - Verification token from HCaptcha
 */
function onHCaptchaCallback(token) {
    console.log('✅ HCaptcha verification successful', {
        tokenLength: token ? token.length : 0
    });

    // Store token for form submission
    window.hCaptchaToken = token;

    // Dispatch event for other components that might be listening
    window.dispatchEvent(new CustomEvent('hcaptcha-verified', {
        detail: { token }
    }));
}

// ============================================================================
// HCAPTCHA HELPER FUNCTIONS
// ============================================================================

/**
 * Get current HCaptcha token
 * @returns {string|null} Current token or null
 */
function getHCaptchaToken() {
    // Check for stored token first
    if (window.hCaptchaToken) {
        return window.hCaptchaToken;
    }

    // Fallback: Get the hCaptcha token from the API
    if (window.hcaptcha && window.hcaptcha.getResponse) {
        const widget = document.getElementById('hcaptcha-register');

        if (widget) {
            try {
                // Try to get widget-specific response
                const widgetId = widget.getAttribute('data-hcaptcha-widget-id');
                if (widgetId) {
                    return window.hcaptcha.getResponse(widgetId);
                } else {
                    return window.hcaptcha.getResponse();
                }
            } catch (error) {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('HCaptchaIntegration', 'hCaptcha not ready yet', error.message);
                }
            }
        }
    }

    return null;
}

/**
 * Reset HCaptcha widget
 * Clears the current token and resets the widget UI
 */
function resetHCaptcha() {
    // Clear stored token
    window.hCaptchaToken = null;

    // Reset the widget
    if (window.hcaptcha && window.hcaptcha.reset) {
        const widget = document.getElementById('hcaptcha-register');

        if (widget) {
            try {
                // Try to reset widget-specific instance
                const widgetId = widget.getAttribute('data-hcaptcha-widget-id');
                if (widgetId) {
                    window.hcaptcha.reset(widgetId);
                } else {
                    window.hcaptcha.reset();
                }
            } catch (error) {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('HCaptchaIntegration', 'Could not reset hCaptcha', error.message);
                }
            }
        }
    }
}

/**
 * Check if HCaptcha has been completed
 * @returns {boolean} True if HCaptcha has been verified
 */
function isHCaptchaComplete() {
    const token = getHCaptchaToken();
    return token !== null && token.length > 0;
}

/**
 * Add HCaptcha widget to registration form
 * Creates the HCaptcha container if not already present
 */
function addHCaptchaToRegistration() {
    const registrationForm = document.getElementById('register-form');
    if (!registrationForm) return;

    // Check if HCaptcha is already present
    const existingCaptcha = document.getElementById('hcaptcha-register');
    if (existingCaptcha) return;

    // Create HCaptcha container
    const captchaContainer = document.createElement('div');
    captchaContainer.id = 'hcaptcha-register';
    captchaContainer.className = 'h-captcha';
    captchaContainer.setAttribute('data-sitekey', 'YOUR_SITE_KEY'); // Replace with actual site key

    // Insert before submit button
    const submitButton = registrationForm.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.parentNode.insertBefore(captchaContainer, submitButton);
    } else {
        registrationForm.appendChild(captchaContainer);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export callback and helper functions
export {
    onHCaptchaCallback,
    getHCaptchaToken,
    resetHCaptcha,
    isHCaptchaComplete,
    addHCaptchaToRegistration
};

// ============================================================================
// GLOBAL ACCESS (REQUIRED FOR EXTERNAL HCAPTCHA LIBRARY)
// ============================================================================

// CRITICAL: Must remain on window for external HCaptcha library
if (typeof window !== 'undefined') {
    window.onHCaptchaCallback = onHCaptchaCallback;
    window.getHCaptchaToken = getHCaptchaToken;
    window.resetHCaptcha = resetHCaptcha;
    window.isHCaptchaComplete = isHCaptchaComplete;
}
