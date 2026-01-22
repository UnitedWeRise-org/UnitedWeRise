/**
 * Toast Notification Utilities
 * Migrated from index.html to modular system
 */

// Simple toast notification function
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification show';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Rate limit toast state
let rateLimitToastElement = null;
let rateLimitCountdownInterval = null;

/**
 * Show a rate limit toast with countdown timer
 * @param {number} retryAfterSeconds - Seconds until rate limit resets
 */
function showRateLimitToast(retryAfterSeconds) {
    // Clear any existing rate limit toast
    hideRateLimitToast();

    // Create toast container
    const toast = document.createElement('div');
    toast.id = 'rate-limit-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        animation: slideUp 0.3s ease-out;
    `;

    // Add animation keyframes if not already present
    if (!document.getElementById('rate-limit-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'rate-limit-toast-styles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.id = 'rate-limit-message';
    messageSpan.textContent = `Rate limit reached. Please wait `;

    // Create countdown span
    const countdownSpan = document.createElement('span');
    countdownSpan.id = 'rate-limit-countdown';
    countdownSpan.style.fontWeight = 'bold';
    countdownSpan.textContent = formatCountdown(retryAfterSeconds);

    // Create dismiss button
    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '×';
    dismissBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0 4px;
        margin-left: 8px;
        opacity: 0.8;
        line-height: 1;
    `;
    dismissBtn.onclick = hideRateLimitToast;
    dismissBtn.onmouseover = () => dismissBtn.style.opacity = '1';
    dismissBtn.onmouseout = () => dismissBtn.style.opacity = '0.8';

    // Assemble toast
    toast.appendChild(messageSpan);
    toast.appendChild(countdownSpan);
    toast.appendChild(dismissBtn);
    document.body.appendChild(toast);

    rateLimitToastElement = toast;

    // Start countdown
    let remaining = retryAfterSeconds;
    rateLimitCountdownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            hideRateLimitToast();
        } else {
            countdownSpan.textContent = formatCountdown(remaining);
        }
    }, 1000);
}

/**
 * Format seconds as M:SS or S
 * @param {number} seconds - Seconds to format
 * @returns {string} - Formatted time string
 */
function formatCountdown(seconds) {
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
}

/**
 * Hide and cleanup the rate limit toast
 */
function hideRateLimitToast() {
    if (rateLimitCountdownInterval) {
        clearInterval(rateLimitCountdownInterval);
        rateLimitCountdownInterval = null;
    }
    if (rateLimitToastElement) {
        rateLimitToastElement.remove();
        rateLimitToastElement = null;
    }
}

// ES6 Module Exports
export {
    showToast,
    showRateLimitToast,
    hideRateLimitToast
};

// Global Exposure (Temporary for transition)
window.showToast = showToast;
window.showRateLimitToast = showRateLimitToast;
window.hideRateLimitToast = hideRateLimitToast;