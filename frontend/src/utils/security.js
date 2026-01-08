/**
 * @module utils/security
 * @description Security utilities for preventing XSS and other vulnerabilities
 * Created: January 2026 - Security Remediation Phase 1
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string safe for HTML insertion
 */
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') {
        str = String(str);
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Creates safe HTML by escaping all variables in a template
 * @param {string} template - HTML template with ${varName} placeholders
 * @param {Object} variables - Object with variable values to escape and insert
 * @returns {string} - Safe HTML string
 */
export function createSafeHTML(template, variables) {
    const escaped = {};
    for (const [key, value] of Object.entries(variables)) {
        escaped[key] = escapeHTML(value);
    }
    return template.replace(/\$\{(\w+)\}/g, (_, key) => escaped[key] || '');
}

/**
 * Creates a safe text node or element with text content
 * @param {string} tagName - HTML tag name (e.g., 'div', 'span')
 * @param {string} text - Text content (will be safely escaped via textContent)
 * @param {Object} [attributes] - Optional attributes to set
 * @returns {HTMLElement} - Safe DOM element
 */
export function createSafeElement(tagName, text, attributes = {}) {
    const element = document.createElement(tagName);
    element.textContent = text;
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.assign(element.dataset, value);
        } else {
            element.setAttribute(key, value);
        }
    }
    return element;
}

/**
 * Validates URL is safe (http/https protocol only)
 * @param {string} url - URL to validate
 * @returns {boolean} - True if URL is safe
 */
export function isValidURL(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Safely parses JSON from localStorage with error handling
 * @param {string} key - localStorage key
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} - Parsed value or default
 */
export function safeLocalStorageGet(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.warn(`Failed to parse localStorage[${key}]:`, e);
        localStorage.removeItem(key); // Clear corrupted data
        return defaultValue;
    }
}

/**
 * Allowed origins for postMessage communication
 */
export const ALLOWED_ORIGINS = [
    'https://www.unitedwerise.org',
    'https://dev.unitedwerise.org',
    'https://admin.unitedwerise.org',
    'https://dev-admin.unitedwerise.org'
];

// Add localhost for development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:8080');
}

/**
 * Validates if an origin is allowed for postMessage
 * @param {string} origin - The origin to check
 * @returns {boolean} - True if origin is allowed
 */
export function isAllowedOrigin(origin) {
    return ALLOWED_ORIGINS.includes(origin);
}

export default {
    escapeHTML,
    createSafeHTML,
    createSafeElement,
    isValidURL,
    safeLocalStorageGet,
    ALLOWED_ORIGINS,
    isAllowedOrigin
};
