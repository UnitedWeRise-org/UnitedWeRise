/**
 * @module js/api-compatibility-shim
 * @description Temporary compatibility layer for gradual ES6 migration
 *
 * Maintains window.apiCall during transition period while 165+ call sites
 * are migrated from global window.apiCall to ES6 imports.
 *
 * This file will be DELETED once all 40 files are migrated to ES6 imports.
 *
 * Created: October 11, 2025 (Batch 3)
 * Status: TEMPORARY - Remove after Batches 4-10 complete
 */

// Import decorated apiCall from reputation-integration
import { apiCall } from './reputation-integration.js';

// Re-export for ES6 imports
export { apiCall };

// Maintain global access during transition (TEMPORARY)
if (typeof window !== 'undefined') {
    window.apiCall = apiCall;
}
