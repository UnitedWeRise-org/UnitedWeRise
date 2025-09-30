/**
 * @module utils/photo-upload-utils
 * @description Utility functions for direct-to-blob photo uploads
 *
 * This module provides helper functions for the new direct-to-blob upload architecture:
 * 1. Get image dimensions from File objects
 * 2. Calculate image hashes for deduplication
 * 3. Retry logic for network failures
 * 4. Progress tracking utilities
 */

/**
 * Get dimensions of an image file
 * @param {File} file - Image file to analyze
 * @returns {Promise<{width: number, height: number}>} - Image dimensions
 */
export async function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            const dimensions = {
                width: img.naturalWidth,
                height: img.naturalHeight
            };
            URL.revokeObjectURL(objectUrl); // Clean up
            resolve(dimensions);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image for dimension calculation'));
        };

        img.src = objectUrl;
    });
}

/**
 * Calculate a simple hash of file contents for deduplication
 * @param {File} file - File to hash
 * @returns {Promise<string>} - Hash string
 */
export async function calculateFileHash(file) {
    // Read first 8KB and last 8KB for fast hashing
    const chunkSize = 8192;
    const chunks = [];

    // Read beginning
    const startChunk = file.slice(0, Math.min(chunkSize, file.size));
    const startBuffer = await startChunk.arrayBuffer();
    chunks.push(new Uint8Array(startBuffer));

    // Read end if file is large enough
    if (file.size > chunkSize) {
        const endChunk = file.slice(Math.max(0, file.size - chunkSize));
        const endBuffer = await endChunk.arrayBuffer();
        chunks.push(new Uint8Array(endBuffer));
    }

    // Simple hash: combine file size, name length, and sample bytes
    let hash = file.size + file.name.length;
    chunks.forEach(chunk => {
        for (let i = 0; i < Math.min(100, chunk.length); i++) {
            hash = ((hash << 5) - hash) + chunk[i];
            hash = hash & hash; // Convert to 32-bit integer
        }
    });

    return Math.abs(hash).toString(36);
}

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<any>} - Result of the function
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on certain errors
            if (error.message?.includes('moderation') ||
                error.message?.includes('policy') ||
                error.message?.includes('unauthorized')) {
                throw error;
            }

            if (attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt);
                console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @param {Object} config - Validation configuration
 * @returns {{valid: boolean, error?: string}}
 */
export function validateImageFile(file, config = {}) {
    const maxImageSize = config.maxImageSize || 10 * 1024 * 1024; // 10MB default
    const maxGifSize = config.maxGifSize || 5 * 1024 * 1024;      // 5MB default
    const allowedTypes = config.allowedTypes || [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
    ];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `File type ${file.type} not allowed. Please use JPG, PNG, WebP, or GIF.`
        };
    }

    // Check file size
    const maxSize = file.type === 'image/gif' ? maxGifSize : maxImageSize;
    if (file.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(1);
        return {
            valid: false,
            error: `File too large. Maximum size is ${sizeMB}MB.`
        };
    }

    return { valid: true };
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string (e.g., "2.5 MB")
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    getImageDimensions,
    calculateFileHash,
    retryWithBackoff,
    validateImageFile,
    formatBytes
};
