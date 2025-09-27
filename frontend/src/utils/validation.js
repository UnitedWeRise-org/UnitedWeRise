/**
 * Validation Utilities
 * Migrated from index.html to modular system
 */

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const isValid = Object.values(requirements).every(req => req);
    const hasContent = password.length > 0;

    // Show/hide requirements based on focus and content
    const reqContainer = document.getElementById('password-requirements');
    const statusIndicator = document.getElementById('password-status');

    if (hasContent && !isValid) {
        // Show detailed requirements when typing but not valid
        reqContainer.style.display = 'block';
        statusIndicator.style.display = 'none';
    } else if (isValid) {
        // Show green checkmark when valid, hide requirements
        reqContainer.style.display = 'none';
        statusIndicator.style.display = 'block';
    } else {
        // Hide both when empty
        reqContainer.style.display = 'none';
        statusIndicator.style.display = 'none';
    }

    // Update individual requirement indicators
    updateRequirement('req-length', requirements.length);
    updateRequirement('req-uppercase', requirements.uppercase);
    updateRequirement('req-lowercase', requirements.lowercase);
    updateRequirement('req-number', requirements.number);
    updateRequirement('req-special', requirements.special);

    return isValid;
}

function updateRequirement(elementId, met) {
    const element = document.getElementById(elementId);
    if (element) {
        if (met) {
            element.classList.add('met');
            element.textContent = element.textContent.replace('• ', '');
        } else {
            element.classList.remove('met');
            if (!element.textContent.startsWith('• ')) {
                element.textContent = '• ' + element.textContent.replace('✓ ', '');
            }
        }
    }
}

// Debug hCaptcha loading
function checkHCaptchaStatus() {
    const widget = document.getElementById('hcaptcha-register');
    const hasIframe = widget && widget.querySelector('iframe');
    const widgetId = widget ? widget.getAttribute('data-hcaptcha-widget-id') : null;
    let response = null;

    try {
        if (window.hcaptcha && window.hcaptcha.getResponse) {
            if (widgetId) {
                response = window.hcaptcha.getResponse(widgetId);
            } else {
                response = window.hcaptcha.getResponse();
            }
        }
    } catch (error) {
        console.log('hCaptcha getResponse error:', error.message);
    }

    console.log('hCaptcha status:', {
        loaded: typeof window.hcaptcha !== 'undefined',
        widgetExists: widget !== null,
        hasIframe: hasIframe !== null,
        widgetId: widgetId,
        sitekey: document.querySelector('[data-sitekey]')?.getAttribute('data-sitekey'),
        currentResponse: response ? 'has response' : 'no response',
        responseLength: response ? response.length : 0,
        domain: window.location.hostname
    });
}

// ES6 Module Exports
export {
    validatePassword,
    updateRequirement,
    checkHCaptchaStatus
};

// Global Exposure (Temporary for transition)
window.validatePassword = validatePassword;
window.updateRequirement = updateRequirement;
window.checkHCaptchaStatus = checkHCaptchaStatus;