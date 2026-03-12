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
import { adminDebugLog } from '../js/adminDebugger.js';

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
 * Detect whether hCaptcha failed to load.
 * Checks for both the global hcaptcha object and a rendered iframe in the widget.
 * @returns {boolean} True if hCaptcha appears to be blocked
 */
function detectCaptchaBlocked() {
    const hcaptchaScriptLoaded = typeof window.hcaptcha !== 'undefined';
    const widgetRendered = isCaptchaWidgetRendered();

    captchaBlocked = !hcaptchaScriptLoaded || !widgetRendered;
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
