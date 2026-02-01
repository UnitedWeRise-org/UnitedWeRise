/**
 * Page View Tracker
 *
 * Sends lightweight tracking beacons to the backend on page loads
 * and SPA-style navigation events. Uses navigator.sendBeacon for
 * non-blocking, reliable delivery (survives page unload).
 *
 * Privacy: Only sends path, referrer, and userId (if logged in).
 * IP address is extracted server-side and hashed with a daily salt.
 *
 * @module page-tracker
 */

import { getApiBaseUrl } from '../utils/environment.js';

/** @type {string|null} Last tracked path to prevent duplicate beacons */
let lastTrackedPath = null;

/** @type {number} Minimum ms between beacons for the same path */
const DEBOUNCE_MS = 2000;

/** @type {number|null} Debounce timer ID */
let debounceTimer = null;

/**
 * Send a page view beacon to the backend tracking endpoint
 * @param {string} pagePath - The page path to track
 */
function sendPageViewBeacon(pagePath) {
    const apiBase = getApiBaseUrl();
    // apiBase ends with '/api', tracking endpoint is at /api/track/pageview
    const trackingUrl = `${apiBase}/track/pageview`;

    const payload = {
        path: pagePath,
        referrer: document.referrer || undefined,
        userId: window.currentUser?.id || undefined
    };

    // Use text/plain to avoid CORS preflight — sendBeacon cannot handle preflights
    const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });

    if (navigator.sendBeacon) {
        navigator.sendBeacon(trackingUrl, blob);
    } else {
        // Fallback for browsers without sendBeacon
        fetch(trackingUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            keepalive: true
        }).catch(() => {
            // Silently fail - tracking should never break user experience
        });
    }
}

/**
 * Track a page view with debouncing to prevent duplicate beacons
 * @param {string} [path] - Optional override path (defaults to current location)
 */
function trackPageView(path) {
    const pagePath = path || window.location.pathname;

    // Skip if same path was just tracked
    if (pagePath === lastTrackedPath && debounceTimer) {
        return;
    }

    // Clear any pending debounce
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    lastTrackedPath = pagePath;
    sendPageViewBeacon(pagePath);

    // Set debounce timer to prevent rapid duplicate tracking
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
    }, DEBOUNCE_MS);
}

/**
 * Initialize page view tracking
 * Sets up listeners for initial page load and SPA navigation events
 */
export function initPageTracker() {
    // Track initial page load
    trackPageView();

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', () => {
        trackPageView();
    });

    // Listen for pushState/replaceState navigation (SPA-style)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        trackPageView();
    };

    history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        trackPageView();
    };
}
