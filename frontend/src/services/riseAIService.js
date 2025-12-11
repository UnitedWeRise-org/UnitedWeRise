/**
 * RiseAI Service - Frontend integration for @RiseAI mentions
 *
 * Detects @RiseAI mentions in content and triggers backend analysis.
 * RiseAI will automatically respond with a comment on the post.
 *
 * @module riseAIService
 */

import { apiClient } from '../modules/core/api/client.js';

// Regex patterns matching backend (case-insensitive)
const MENTION_PATTERNS = [
    /@riseai\b/gi,
    /@rise-ai\b/gi,
    /@rise_ai\b/gi
];

/**
 * Check if content contains an @RiseAI mention
 * @param {string} content - Text content to check
 * @returns {boolean}
 */
export function hasRiseAIMention(content) {
    if (!content) return false;

    return MENTION_PATTERNS.some(pattern => {
        pattern.lastIndex = 0; // Reset regex state
        return pattern.test(content);
    });
}

/**
 * Trigger RiseAI analysis on a post or comment
 * Analysis runs asynchronously - RiseAI will post a reply comment when complete
 *
 * @param {Object} params
 * @param {string} params.postId - The post ID containing the mention
 * @param {string} [params.commentId] - Optional comment ID if mention is in a comment
 * @param {string} params.content - The content containing the @RiseAI mention
 * @returns {Promise<Object>} - { success: boolean, interactionId?: string, error?: string }
 */
export async function triggerRiseAIAnalysis({ postId, commentId, content }) {
    try {
        console.log('🤖 Triggering RiseAI analysis for post:', postId);

        const response = await apiClient.call('/riseai/analyze', {
            method: 'POST',
            body: {
                postId,
                commentId,
                content
            }
        });

        if (response?.interactionId) {
            console.log('✅ RiseAI analysis started, interactionId:', response.interactionId);
            return {
                success: true,
                interactionId: response.interactionId,
                message: 'RiseAI is analyzing your post and will reply shortly.'
            };
        }

        // Handle rate limit or other errors
        if (response?.error) {
            console.warn('⚠️ RiseAI error:', response.error);
            return {
                success: false,
                error: response.error,
                rateLimitInfo: response.rateLimitInfo
            };
        }

        return { success: false, error: 'Unknown error triggering RiseAI' };

    } catch (error) {
        console.error('❌ RiseAI trigger error:', error);
        return {
            success: false,
            error: error.message || 'Failed to trigger RiseAI analysis'
        };
    }
}

/**
 * Check user's RiseAI rate limit status
 * @returns {Promise<Object>} - { allowed: boolean, remaining: number, limit: number, resetTime: Date }
 */
export async function checkRiseAIRateLimit() {
    try {
        const response = await apiClient.call('/riseai/rate-limit');
        return response;
    } catch (error) {
        console.error('❌ Failed to check RiseAI rate limit:', error);
        return { allowed: false, remaining: 0, limit: 0 };
    }
}

/**
 * Get RiseAI settings (public portion)
 * @returns {Promise<Object>} - { isEnabled: boolean, dailyLimitNonAdmin: number }
 */
export async function getRiseAISettings() {
    try {
        const response = await apiClient.call('/riseai/settings');
        return response;
    } catch (error) {
        console.error('❌ Failed to get RiseAI settings:', error);
        return { isEnabled: false, dailyLimitNonAdmin: 0 };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.riseAIService = {
        hasRiseAIMention,
        triggerRiseAIAnalysis,
        checkRiseAIRateLimit,
        getRiseAISettings
    };
}
