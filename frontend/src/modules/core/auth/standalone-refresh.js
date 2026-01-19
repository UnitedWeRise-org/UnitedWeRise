/**
 * Standalone Token Refresh Module
 * Minimal token refresh for standalone pages without full auth system
 *
 * @module core/auth/standalone-refresh
 */

/**
 * Detect API base URL based on current hostname
 * @returns {string} API base URL
 */
function detectApiBase() {
    const hostname = window.location.hostname;
    if (hostname === 'dev.unitedwerise.org' ||
        hostname === 'dev-admin.unitedwerise.org' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1') {
        return 'https://dev-api.unitedwerise.org/api';
    }
    return 'https://api.unitedwerise.org/api';
}

const API_BASE = detectApiBase();

/**
 * Standalone auth refresh manager for pages without full auth system
 * Handles proactive token refresh and visibility-based refresh
 */
class StandaloneAuthRefresh {
    constructor() {
        this._isRefreshing = false;
        this._proactiveTimer = null;
        this._visibilityDebounce = null;
        this._lastRefresh = Date.now();
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }

    /**
     * Start proactive token refresh timer
     */
    start() {
        this._startProactiveTimer();
        console.log('[StandaloneRefresh] Started');
    }

    /**
     * Stop token refresh (cleanup)
     */
    stop() {
        if (this._proactiveTimer) {
            clearInterval(this._proactiveTimer);
            this._proactiveTimer = null;
        }
        if (this._visibilityDebounce) {
            clearTimeout(this._visibilityDebounce);
            this._visibilityDebounce = null;
        }
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
        console.log('[StandaloneRefresh] Stopped');
    }

    /**
     * Refresh the auth token
     * @returns {Promise<boolean>} True if refresh succeeded
     */
    async refreshToken() {
        if (this._isRefreshing) return false;
        this._isRefreshing = true;

        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                // Update CSRF token if provided
                if (data.csrfToken) {
                    window.csrfToken = data.csrfToken;
                }
                this._lastRefresh = Date.now();
                console.log('[StandaloneRefresh] Token refreshed successfully');
                return true;
            } else if (response.status === 401 || response.status === 403) {
                // Session expired - redirect to login
                console.warn('[StandaloneRefresh] Session expired, redirecting to login');
                window.location.href = '/#login';
                return false;
            }
            console.warn('[StandaloneRefresh] Refresh failed with status:', response.status);
            return false;
        } catch (error) {
            console.error('[StandaloneRefresh] Error:', error);
            return false;
        } finally {
            this._isRefreshing = false;
        }
    }

    /**
     * Start proactive refresh timer
     * Runs every 14 minutes (half of 30-min JWT expiration)
     * @private
     */
    _startProactiveTimer() {
        if (this._proactiveTimer) {
            clearInterval(this._proactiveTimer);
        }
        // 14 minutes = 840000 ms
        this._proactiveTimer = setInterval(() => {
            if (!document.hidden) {
                this.refreshToken();
            }
        }, 14 * 60 * 1000);
    }

    /**
     * Handle visibility change for refresh on tab focus
     * @private
     */
    _handleVisibilityChange() {
        if (this._visibilityDebounce) {
            clearTimeout(this._visibilityDebounce);
        }

        if (!document.hidden) {
            const minsSinceRefresh = (Date.now() - this._lastRefresh) / 1000 / 60;
            // Refresh if more than 5 minutes since last refresh
            if (minsSinceRefresh > 5) {
                // Small delay to debounce rapid tab switching
                this._visibilityDebounce = setTimeout(() => {
                    this.refreshToken();
                }, 1000);
            }
        }
    }
}

export const standaloneAuthRefresh = new StandaloneAuthRefresh();
export default standaloneAuthRefresh;
