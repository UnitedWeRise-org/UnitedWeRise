/**
 * @module services/captchaFallback
 * @description Fallback bot protection when hCaptcha is blocked by ad blockers.
 *
 * Detects hCaptcha load failure, shows an informative warning banner,
 * and provides invisible fallback checks (honeypot + timing) so users
 * can still register without disabling their ad blocker.
 *
 * Created: 2026-03-11
 */

import { isCaptchaWidgetRendered } from '../integrations/hcaptcha-integration.js';
import { adminDebugLog } from '../../js/adminDebugger.js';

// ============================================================================
// STATE
// ============================================================================

/** @type {boolean} Whether hCaptcha has been detected as blocked */
let captchaBlocked = false;

/** @type {number|null} Timestamp when the register form was opened */
let formOpenTimestamp = null;

/** @type {boolean} Whether detection has already run */
let detectionComplete = false;

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Detect whether hCaptcha failed to load or is non-functional.
 * Checks script presence, iframe render, AND functional getResponse() call.
 * Content blockers can partially load hCaptcha (iframe exists) while blocking
 * the scripts inside it, so iframe presence alone is not sufficient.
 * @returns {boolean} True if hCaptcha appears to be blocked or non-functional
 */
function detectCaptchaBlocked() {
    const hcaptchaScriptLoaded = typeof window.hcaptcha !== 'undefined';
    const widgetRendered = isCaptchaWidgetRendered();

    // If script didn't load or widget didn't render, definitely blocked
    if (!hcaptchaScriptLoaded || !widgetRendered) {
        captchaBlocked = true;
        detectionComplete = true;
        return captchaBlocked;
    }

    // Script loaded and iframe exists, but test if getResponse() is functional
    // Content blockers can block scripts inside the hCaptcha iframe,
    // causing getResponse() to throw "No hCaptcha exists"
    try {
        if (window.hcaptcha && typeof window.hcaptcha.getResponse === 'function') {
            window.hcaptcha.getResponse();
            // No error — hCaptcha is functional (returns empty string if not completed)
            captchaBlocked = false;
        } else {
            captchaBlocked = true;
        }
    } catch {
        // getResponse() threw — hCaptcha is loaded but non-functional
        captchaBlocked = true;
    }

    detectionComplete = true;
    return captchaBlocked;
}

/**
 * Check if hCaptcha is blocked. Runs detection if not yet complete.
 * @returns {boolean} True if hCaptcha is blocked
 */
export function isCaptchaBlocked() {
    if (!detectionComplete) {
        detectCaptchaBlocked();
    }
    return captchaBlocked;
}

// ============================================================================
// WARNING BANNER
// ============================================================================

/**
 * Show a warning banner in place of the hCaptcha widget when it's blocked.
 * Informs the user but does not prevent registration.
 */
function showCaptchaBlockedWarning() {
    const widget = document.getElementById('hcaptcha-register');
    if (!widget) return;

    // Don't add duplicate warnings
    if (widget.parentNode?.querySelector('.captcha-blocked-warning')) return;

    const warning = document.createElement('div');
    warning.className = 'captcha-blocked-warning';
    warning.innerHTML =
        '<strong>Security verification blocked</strong>' +
        'Your browser or ad blocker is preventing our security check (hCaptcha) from loading. ' +
        'You can still register &mdash; we\'ll use alternative security checks. ' +
        'For the best experience, consider disabling your ad blocker for this site.';

    // Insert warning after the hCaptcha widget container
    widget.style.display = 'none';
    widget.parentNode.insertBefore(warning, widget.nextSibling);

    adminDebugLog('CaptchaFallback', 'hCaptcha blocked — warning banner displayed');
}

// ============================================================================
// HONEYPOT
// ============================================================================

/**
 * Inject a hidden honeypot field into the registration form.
 * Bots will auto-fill it; humans cannot see or interact with it.
 */
function injectHoneypot() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    // Don't add duplicate honeypots
    if (registerForm.querySelector('[data-hp]')) return;

    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'company_url';
    honeypot.setAttribute('data-hp', 'true');
    honeypot.setAttribute('aria-hidden', 'true');
    honeypot.setAttribute('tabindex', '-1');
    honeypot.setAttribute('autocomplete', 'off');
    honeypot.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;';

    registerForm.appendChild(honeypot);
}

/**
 * Check if the honeypot field is clean (empty).
 * @returns {boolean} True if honeypot was not filled (likely human)
 */
function isHoneypotClean() {
    const honeypot = document.querySelector('[data-hp]');
    if (!honeypot) return true; // No honeypot injected — treat as clean
    return !honeypot.value || honeypot.value.trim() === '';
}

// ============================================================================
// TIMING
// ============================================================================

/**
 * Start the form timing tracker.
 * Called when the register form becomes visible.
 */
function startFormTimer() {
    formOpenTimestamp = Date.now();
}

/**
 * Get the number of seconds elapsed since the form was opened.
 * @returns {number} Elapsed seconds (0 if timer wasn't started)
 */
function getFormTimingSeconds() {
    if (!formOpenTimestamp) return 0;
    return (Date.now() - formOpenTimestamp) / 1000;
}

// ============================================================================
// FALLBACK PROOF
// ============================================================================

/**
 * Generate a fallback proof object for the backend.
 * Contains honeypot status, timing data, and block detection flag.
 * @returns {Object} Fallback proof for server-side validation
 */
export function generateFallbackProof() {
    return {
        honeypotClean: isHoneypotClean(),
        timingSeconds: Math.round(getFormTimingSeconds() * 100) / 100,
        captchaBlockDetected: true
    };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the captcha fallback system.
 * Should be called when the registration form is shown.
 * Starts timing, injects honeypot, and schedules detection.
 */
export function initCaptchaFallback() {
    // Start timing when form opens
    startFormTimer();

    // Always inject honeypot (invisible, no cost)
    injectHoneypot();

    // Schedule detection after grace period for hCaptcha to load
    // hCaptcha loads async/defer, so give it time to render
    setTimeout(() => {
        if (detectCaptchaBlocked()) {
            showCaptchaBlockedWarning();
            adminDebugLog('CaptchaFallback', 'hCaptcha detected as blocked — fallback mode active', {
                hcaptchaGlobal: typeof window.hcaptcha !== 'undefined',
                widgetRendered: isCaptchaWidgetRendered()
            });
        }
    }, 4000);
}
