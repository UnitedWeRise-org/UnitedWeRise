/**
 * @module utils/admin-redirect
 * @description Admin subdomain redirect handler
 *
 * CRITICAL: This module MUST execute before any other modules to prevent
 * flash of wrong content on admin subdomains.
 *
 * EXECUTION ORDER: First script tag in index.html (before main.js)
 *
 * DESIGN RATIONALE:
 * - admin.unitedwerise.org → Redirect to /admin-dashboard.html
 * - dev-admin.unitedwerise.org → Redirect to /admin-dashboard.html
 * - www.unitedwerise.org → No redirect (normal operation)
 * - dev.unitedwerise.org → No redirect (normal operation)
 *
 * EDGE CASES HANDLED:
 * 1. Preserve query parameters (email verification tokens, etc.)
 * 2. Prevent redirect loops (don't redirect if already on admin-dashboard.html)
 * 3. Only redirect from root path (/)
 * 4. Handle bookmarks to admin.unitedwerise.org/some-page (no redirect)
 * 5. Performance: <10ms execution time (synchronous, no async)
 */

/**
 * Check if current hostname is an admin subdomain
 * @returns {boolean} True if on admin subdomain
 */
function isAdminSubdomain() {
    const hostname = window.location.hostname;
    return hostname === 'admin.unitedwerise.org' ||
           hostname === 'dev-admin.unitedwerise.org';
}

/**
 * Check if already on admin dashboard page
 * @returns {boolean} True if on admin-dashboard.html
 */
function isOnAdminDashboard() {
    const pathname = window.location.pathname;
    return pathname.includes('admin-dashboard.html');
}

/**
 * Check if on root path (/) or index.html
 * @returns {boolean} True if on root path
 */
function isRootPath() {
    const pathname = window.location.pathname;
    return pathname === '/' || pathname === '/index.html';
}

/**
 * Build redirect URL with preserved query parameters
 * @returns {string} Full redirect URL
 */
function buildRedirectUrl() {
    const search = window.location.search; // Preserves ?token=xyz etc.
    const hash = window.location.hash;     // Preserves #section etc.

    return `/admin-dashboard.html${search}${hash}`;
}

/**
 * Main redirect logic - executes immediately
 */
(function executeRedirect() {
    // Performance tracking
    const startTime = performance.now();

    try {
        // SAFETY CHECK 1: Only redirect from admin subdomains
        if (!isAdminSubdomain()) {
            // Not an admin subdomain - no action needed
            return;
        }

        // SAFETY CHECK 2: Prevent redirect loop
        if (isOnAdminDashboard()) {
            // Already on admin dashboard - no redirect needed
            return;
        }

        // SAFETY CHECK 3: Only redirect from root path
        if (!isRootPath()) {
            // User bookmarked a specific page (e.g., admin.unitedwerise.org/profile)
            // This is likely an error, but don't redirect to avoid breaking bookmarks
            console.warn('[Admin Redirect] Non-root path on admin subdomain:', window.location.pathname);
            console.warn('[Admin Redirect] Expected behavior: Admin subdomain should only serve admin-dashboard.html');
            return;
        }

        // ALL CHECKS PASSED - Execute redirect
        const redirectUrl = buildRedirectUrl();

        // Log for debugging (production-safe)
        console.log('[Admin Redirect] Redirecting to admin dashboard:', redirectUrl);

        // Execute redirect (synchronous, immediate)
        window.location.replace(redirectUrl); // Use replace() to prevent back button loop

    } catch (error) {
        // CRITICAL ERROR HANDLING: Never break page load
        console.error('[Admin Redirect] Redirect failed:', error);
        console.error('[Admin Redirect] Continuing with normal page load as fallback');
        // Allow page to load normally - better to show wrong content than blank page
    } finally {
        // Performance measurement
        const executionTime = performance.now() - startTime;
        if (executionTime > 10) {
            console.warn(`[Admin Redirect] Slow execution: ${executionTime.toFixed(2)}ms (target: <10ms)`);
        }
    }
})();

// Export for testing purposes only (not used in production)
export { isAdminSubdomain, isOnAdminDashboard, isRootPath, buildRedirectUrl };
