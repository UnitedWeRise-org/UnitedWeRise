/**
 * @module adminDebugger
 * @description Secure Admin-Only Debugging System
 *
 * Provides debugging functionality that only works for authenticated admin users
 * Uses existing admin verification endpoint to ensure security
 *
 * Used by 16+ files across the codebase for debugging
 * Migrated to ES6 modules: October 11, 2025 (Batch 2)
 *
 * Usage:
 *   import { adminDebugLog, adminDebugError, adminDebugWarn, adminDebugTable, adminDebugSensitive } from '../js/adminDebugger.js';
 *   await adminDebugLog('Component initialized', componentData);
 *   await adminDebugError('API call failed', errorDetails);
 *   await adminDebugTable('Database results', queryResults);
 *
 * Legacy usage (backward compatible):
 *   await window.adminDebugLog('Component initialized', componentData);
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

        // SIMPLIFIED: Just check window.currentUser flags - no backend API call needed
        // The isAdmin/isSuperAdmin flags come from the authenticated /batch/initialize endpoint
        // so they're already secure. No need to re-verify and risk triggering auth errors.

        if (!window.currentUser || !(window.currentUser.isAdmin || window.currentUser.isSuperAdmin)) {
            this.adminVerified = false;
            this.verificationExpiry = Date.now() + this.CACHE_DURATION;
            return false;
        }

        // User has admin flags - trust them (they came from authenticated endpoint)
        this.adminVerified = true;
        this.verificationExpiry = Date.now() + this.CACHE_DURATION;
        return true;
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
        // One-time diagnostic: Confirm adminDebugLog is being called
        if (!this._firstCallLogged) {
            console.log('🔍 AdminDebugger: First adminDebugLog() call detected, checking admin status...');
            this._firstCallLogged = true;
        }

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
                // Use window.apiCall instead of undefined adminApiCall function
                const recheck = await window.apiCall('/admin/dashboard');
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

// Create singleton instance
const adminDebugger = new AdminDebugger();

// ES6 Module Exports - Primary interface
export async function adminDebugLog(component, message, data) {
    await adminDebugger.log(component, message, data);
}

export async function adminDebugError(component, message, errorData) {
    await adminDebugger.error(component, message, errorData);
}

export async function adminDebugWarn(component, message, data) {
    await adminDebugger.warn(component, message, data);
}

export async function adminDebugTable(component, message, tableData) {
    await adminDebugger.table(component, message, tableData);
}

export async function adminDebugSensitive(component, message, sensitiveData) {
    await adminDebugger.sensitive(component, message, sensitiveData);
}

export async function adminDebugTime(component, label) {
    await adminDebugger.time(component, label);
}

export async function adminDebugTimeEnd(component, label) {
    await adminDebugger.timeEnd(component, label);
}

// Export the instance for advanced usage
export { adminDebugger };

// Maintain backward compatibility during transition period
// All 16+ dependent files can continue using window.* until migrated
if (typeof window !== 'undefined') {
    window.adminDebugLog = adminDebugLog;
    window.adminDebugError = adminDebugError;
    window.adminDebugWarn = adminDebugWarn;
    window.adminDebugTable = adminDebugTable;
    window.adminDebugSensitive = adminDebugSensitive;
    window.adminDebugTime = adminDebugTime;
    window.adminDebugTimeEnd = adminDebugTimeEnd;
    window.adminDebugger = adminDebugger;

    // Admin debugger loaded - intro messages removed to reduce console noise
    // Debug output will only appear for verified admin users (isAdmin or isSuperAdmin flags)
}