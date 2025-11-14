/**
 * Admin-only debugging utilities for secure logging
 * Following CLAUDE.md security standards - using Pino structured logging
 *
 * Migration: Phase 3-4 Pino structured logging
 * Date: 2025-11-13
 */

import { getEnvironment } from './environment.js';
import { logger } from '../services/logger.js';

// Create admin child logger for all admin debug operations
const adminLogger = logger.child({ component: 'admin-debug' });

/**
 * Admin-only debug logging function
 * @param {string} service - Service name (e.g., 'ModerationResultsService')
 * @param {string} message - Debug message
 * @param {object} data - Optional data to log (automatically sanitized)
 */
export async function adminDebugLog(service, message, data = {}) {
  // Only log in development/staging environments
  if (getEnvironment() !== 'production') {
    adminLogger.debug({
      service,
      data: sanitizeLogData(data),
      environment: getEnvironment()
    }, `[ADMIN-DEBUG] ${message}`);
  }
}

/**
 * Admin-only error logging function
 * @param {string} service - Service name
 * @param {string} message - Error message
 * @param {Error|object} error - Error object or data
 */
export async function adminDebugError(service, message, error = {}) {
  // Always log errors, even in production (but sanitized)
  adminLogger.error({
    service,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: getEnvironment() !== 'production' ? error.stack : undefined
    } : sanitizeLogData(error),
    environment: getEnvironment()
  }, `[ADMIN-ERROR] ${message}`);
}

/**
 * Admin-only warning logging function
 * @param {string} service - Service name
 * @param {string} message - Warning message
 * @param {object} data - Optional data to log
 */
export async function adminDebugWarn(service, message, data = {}) {
  adminLogger.warn({
    service,
    data: sanitizeLogData(data),
    environment: getEnvironment()
  }, `[ADMIN-WARN] ${message}`);
}

/**
 * Admin-only table logging for structured data
 * @param {string} service - Service name
 * @param {string} message - Message
 * @param {Array|object} tableData - Data to display in table format
 */
export async function adminDebugTable(service, message, tableData) {
  if (getEnvironment() !== 'production') {
    // Log table data as structured JSON (Azure Log Analytics can query this)
    adminLogger.info({
      service,
      tableData: sanitizeLogData(tableData),
      environment: getEnvironment()
    }, `[ADMIN-TABLE] ${message}`);
  }
}

/**
 * Admin-only sensitive data logging with extra security
 * @param {string} service - Service name
 * @param {string} message - Message
 * @param {object} sensitiveData - Sensitive data (will be heavily sanitized)
 */
export async function adminDebugSensitive(service, message, sensitiveData = {}) {
  if (getEnvironment() !== 'production') {
    const sanitized = sanitizeSensitiveData(sensitiveData);
    await adminDebugLog(service, `[SENSITIVE] ${message}`, sanitized);
  }
}

/**
 * Sanitize log data to prevent sensitive information leakage
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'email', 'phone', 'ssn', 'address', 'userId', 'id'
  ];

  const sanitized = JSON.parse(JSON.stringify(data));

  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field name suggests sensitive data
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof value === 'string' && value.length > 0) {
          obj[key] = `[REDACTED-${value.length}chars]`;
        } else {
          obj[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      }
    }
  }

  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * Extra sanitization for sensitive data logging
 * @param {any} data - Sensitive data
 * @returns {any} Heavily sanitized data
 */
function sanitizeSensitiveData(data) {
  const sanitized = sanitizeLogData(data);

  // Additional sanitization for sensitive contexts
  if (typeof sanitized === 'object' && sanitized !== null) {
    // Only keep basic structure information, remove most values
    const structure = {};
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        structure[key] = '[OBJECT]';
      } else if (Array.isArray(value)) {
        structure[key] = `[ARRAY-${value.length}]`;
      } else if (typeof value === 'string') {
        structure[key] = `[STRING-${value.length}]`;
      } else {
        structure[key] = `[${typeof value}]`;
      }
    }
    return structure;
  }

  return sanitized;
}