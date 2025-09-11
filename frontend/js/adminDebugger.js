/**
 * Secure Admin-Only Debugging System
 * 
 * Provides debugging functionality that only works for authenticated admin users
 * Uses existing admin verification endpoint to ensure security
 * 
 * Usage:
 *   await adminDebugLog('Component initialized', componentData);
 *   await adminDebugError('API call failed', errorDetails);
 *   await adminDebugTable('Database results', queryResults);
 */

class AdminDebugger {
    constructor() {
        this.adminVerified = null; // null = not checked, true/false = result cached
        this.verificationExpiry = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Verify admin status using existing admin dashboard endpoint
     * Caches result for performance (5 minute cache)
     */
    async verifyAdminStatus() {
        // Use cached result if still valid
        if (this.adminVerified !== null && 
            this.verificationExpiry && 
            Date.now() < this.verificationExpiry) {
            return this.adminVerified;
        }

        try {
            // Use regular apiCall function available on main site
            if (typeof window.apiCall !== 'function') {
                console.warn('🔧 AdminDebugger: apiCall not available');
                this.adminVerified = false;
                this.verificationExpiry = Date.now() + this.CACHE_DURATION;
                return false;
            }

            // Check if user is logged in first
            if (!window.authToken) {
                // User not logged in - can't be admin (silently fail)
                this.adminVerified = false;
                this.verificationExpiry = Date.now() + this.CACHE_DURATION;
                return false;
            }

            // Try a simple admin endpoint that doesn't require TOTP - check users with limit 1
            const response = await window.apiCall('/admin/users?limit=1');
            this.adminVerified = response.ok;
            this.verificationExpiry = Date.now() + this.CACHE_DURATION;
            
            if (!this.adminVerified && response.status === 403) {
                console.log('🔧 AdminDebugger: Access denied - not admin or TOTP required');
            } else if (!this.adminVerified && response.status === 401) {
                console.log('🔧 AdminDebugger: Unauthorized - auth token invalid or expired');
            }
            
            return this.adminVerified;
        } catch (error) {
            // Fail secure - if verification fails, assume not admin
            console.warn('🔧 AdminDebugger: Admin verification failed, disabling debug output');
            this.adminVerified = false;
            this.verificationExpiry = Date.now() + this.CACHE_DURATION;
            return false;
        }
    }

    /**
     * Clear admin verification cache (force re-check on next debug call)
     */
    clearCache() {
        this.adminVerified = null;
        this.verificationExpiry = null;
    }

    /**
     * Standard debug logging - only visible to admins
     */
    async log(component, message, data = null) {
        if (await this.verifyAdminStatus()) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`🔧 [${timestamp}] [${component}] ${message}`, data);
        }
    }

    /**
     * Error debugging - only visible to admins
     */
    async error(component, message, errorData = null) {
        if (await this.verifyAdminStatus()) {
            const timestamp = new Date().toLocaleTimeString();
            console.error(`🚨 [${timestamp}] [${component}] ERROR: ${message}`, errorData);
        }
    }

    /**
     * Warning debugging - only visible to admins
     */
    async warn(component, message, data = null) {
        if (await this.verifyAdminStatus()) {
            const timestamp = new Date().toLocaleTimeString();
            console.warn(`⚠️ [${timestamp}] [${component}] WARNING: ${message}`, data);
        }
    }

    /**
     * Table debugging - only visible to admins
     */
    async table(component, message, tableData) {
        if (await this.verifyAdminStatus()) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`📋 [${timestamp}] [${component}] ${message}`);
            console.table(tableData);
        }
    }

    /**
     * Sensitive data debugging - extra security verification
     */
    async sensitive(component, message, sensitiveData = null) {
        if (await this.verifyAdminStatus()) {
            // Double-check admin status for sensitive data
            try {
                const recheck = await adminApiCall('/api/admin/dashboard');
                if (recheck.ok) {
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`🔒 [${timestamp}] [${component}] SENSITIVE: ${message}`, sensitiveData);
                } else {
                    console.warn('🔒 Admin verification failed for sensitive debug data');
                }
            } catch (error) {
                console.warn('🔒 Could not verify admin status for sensitive debug data');
            }
        }
    }

    /**
     * Performance timing - only visible to admins
     */
    async time(component, label) {
        if (await this.verifyAdminStatus()) {
            console.time(`⏱️ [${component}] ${label}`);
        }
    }

    async timeEnd(component, label) {
        if (await this.verifyAdminStatus()) {
            console.timeEnd(`⏱️ [${component}] ${label}`);
        }
    }
}

// Create global instance
const adminDebugger = new AdminDebugger();

// Export convenience functions for easy use
window.adminDebugLog = async (component, message, data) => {
    await adminDebugger.log(component, message, data);
};

window.adminDebugError = async (component, message, errorData) => {
    await adminDebugger.error(component, message, errorData);
};

window.adminDebugWarn = async (component, message, data) => {
    await adminDebugger.warn(component, message, data);
};

window.adminDebugTable = async (component, message, tableData) => {
    await adminDebugger.table(component, message, tableData);
};

window.adminDebugSensitive = async (component, message, sensitiveData) => {
    await adminDebugger.sensitive(component, message, sensitiveData);
};

window.adminDebugTime = async (component, label) => {
    await adminDebugger.time(component, label);
};

window.adminDebugTimeEnd = async (component, label) => {
    await adminDebugger.timeEnd(component, label);
};

// Export the instance for advanced usage
window.adminDebugger = adminDebugger;

console.log('🔧 Admin-only debugging system loaded');
console.log('🔧 Available functions: adminDebugLog, adminDebugError, adminDebugWarn, adminDebugTable, adminDebugSensitive');
console.log('🔧 Debugging output will only appear for verified admin users');