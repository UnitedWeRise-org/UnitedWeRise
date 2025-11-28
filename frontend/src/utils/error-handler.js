/**
 * @module utils/error-handler
 * @description User-friendly error handling system that converts technical errors to helpful messages with recovery suggestions
 * Migrated to ES6 modules: October 11, 2025 (Batch 1)
 */

// User-Friendly Error Handling System
// Converts technical errors to helpful messages with recovery suggestions

class ErrorHandler {
    constructor() {
        this.errorMessages = new Map();
        this.setupErrorMessages();
        this.notificationQueue = [];
        this.isShowingError = false;
    }

    setupErrorMessages() {
        // Map technical errors to user-friendly messages
        this.errorMessages.set('NetworkError', {
            title: 'Connection Problem',
            message: 'Unable to connect to United We Rise. Please check your internet connection.',
            actions: ['Retry', 'Check Connection'],
            icon: '🌐',
            severity: 'warning'
        });

        this.errorMessages.set('401', {
            title: 'Please Sign In',
            message: 'You need to sign in to access this feature.',
            actions: ['Sign In', 'Go Home'],
            icon: '🔐',
            severity: 'info'
        });

        this.errorMessages.set('403', {
            title: 'Access Denied',
            message: 'You don\'t have permission to access this feature.',
            actions: ['Go Back', 'Contact Support'],
            icon: '🚫',
            severity: 'warning'
        });

        this.errorMessages.set('404', {
            title: 'Not Found',
            message: 'The content you\'re looking for doesn\'t exist or has been moved.',
            actions: ['Go Home', 'Search'],
            icon: '🔍',
            severity: 'info'
        });

        this.errorMessages.set('429', {
            title: 'Slow Down',
            message: 'You\'re making requests too quickly. Please wait a moment and try again.',
            actions: ['Wait and Retry'],
            icon: '⏱️',
            severity: 'warning'
        });

        this.errorMessages.set('500', {
            title: 'Server Error',
            message: 'Something went wrong on our end. Our team has been notified.',
            actions: ['Retry', 'Report Issue'],
            icon: '⚠️',
            severity: 'error'
        });

        this.errorMessages.set('ValidationError', {
            title: 'Invalid Information',
            message: 'Please check your information and try again.',
            actions: ['Check Form'],
            icon: '📝',
            severity: 'warning'
        });

        this.errorMessages.set('TimeoutError', {
            title: 'Request Timed Out',
            message: 'The request took too long. This might be due to a slow connection.',
            actions: ['Retry', 'Check Connection'],
            icon: '⏰',
            severity: 'warning'
        });

        this.errorMessages.set('DatabaseError', {
            title: 'Service Temporarily Unavailable',
            message: 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
            actions: ['Retry Later', 'Contact Support'],
            icon: '🔧',
            severity: 'error'
        });

        this.errorMessages.set('FileUploadError', {
            title: 'Upload Failed',
            message: 'Unable to upload your file. Please check the file size and format.',
            actions: ['Try Again', 'Check File'],
            icon: '📁',
            severity: 'warning'
        });

        this.errorMessages.set('PaymentError', {
            title: 'Payment Issue',
            message: 'There was a problem processing your payment. Please check your payment method.',
            actions: ['Update Payment', 'Contact Support'],
            icon: '💳',
            severity: 'error'
        });
    }

    // Main error handling function
    handleError(error, context = {}) {
        console.error('🚨 Error occurred:', error, 'Context:', context);

        const errorInfo = this.categorizeError(error);
        const userMessage = this.getUserFriendlyMessage(errorInfo, context);

        // Show notification
        this.showErrorNotification(userMessage);

        // Log for analytics (in production)
        this.logError(error, context, errorInfo);

        return userMessage;
    }

    // Categorize error type
    categorizeError(error) {
        // Network errors
        if (!error.status && (error.message?.includes('fetch') || error.code === 'NETWORK_ERROR')) {
            return { type: 'NetworkError', originalError: error };
        }

        // HTTP status errors
        if (error.status) {
            return { type: error.status.toString(), originalError: error };
        }

        // Validation errors
        if (error.message?.includes('validation') || error.code === 'VALIDATION_ERROR') {
            return { type: 'ValidationError', originalError: error };
        }

        // Timeout errors
        if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
            return { type: 'TimeoutError', originalError: error };
        }

        // File upload errors
        if (error.message?.includes('upload') || error.code === 'FILE_ERROR') {
            return { type: 'FileUploadError', originalError: error };
        }

        // Payment errors
        if (error.message?.includes('payment') || error.code === 'PAYMENT_ERROR') {
            return { type: 'PaymentError', originalError: error };
        }

        // Database errors
        if (error.message?.includes('database') || error.code === 'DATABASE_ERROR') {
            return { type: 'DatabaseError', originalError: error };
        }

        // Default to server error
        return { type: '500', originalError: error };
    }

    // Get user-friendly message
    getUserFriendlyMessage(errorInfo, context) {
        const template = this.errorMessages.get(errorInfo.type) || this.errorMessages.get('500');

        return {
            ...template,
            context,
            timestamp: new Date(),
            errorId: this.generateErrorId(),
            originalError: errorInfo.originalError
        };
    }

    // Show error notification
    showErrorNotification(errorMessage) {
        // Queue notification if one is already showing
        if (this.isShowingError) {
            this.notificationQueue.push(errorMessage);
            return;
        }

        this.isShowingError = true;
        const notification = this.createErrorNotification(errorMessage);
        document.body.appendChild(notification);

        // Auto-dismiss after 8 seconds for non-critical errors
        if (errorMessage.severity !== 'error') {
            setTimeout(() => {
                this.dismissNotification(notification);
            }, 8000);
        }
    }

    // Create error notification element
    createErrorNotification(errorMessage) {
        const notification = document.createElement('div');
        notification.className = `error-notification severity-${errorMessage.severity}`;
        notification.innerHTML = `
            <div class="error-content">
                <div class="error-header">
                    <span class="error-icon">${errorMessage.icon}</span>
                    <h4 class="error-title">${errorMessage.title}</h4>
                    <button class="error-close" data-error-action="close">&times;</button>
                </div>
                <p class="error-message">${errorMessage.message}</p>
                <div class="error-actions">
                    ${errorMessage.actions.map(action => `
                        <button class="error-action" data-action="${action.toLowerCase().replace(' ', '-')}">${action}</button>
                    `).join('')}
                </div>
                <div class="error-details">
                    <small>Error ID: ${errorMessage.errorId} | ${errorMessage.timestamp.toLocaleTimeString()}</small>
                </div>
            </div>
        `;

        // Add click handlers for actions using event delegation
        notification.addEventListener('click', (e) => {
            if (e.target.classList.contains('error-action')) {
                this.handleErrorAction(e.target.dataset.action, errorMessage);
            }
            if (e.target.closest('[data-error-action="close"]')) {
                this.dismissNotification(notification);
            }
        });

        return notification;
    }

    // Handle error action buttons
    handleErrorAction(action, errorMessage) {
        switch (action) {
            case 'retry':
                if (errorMessage.context.retryCallback) {
                    errorMessage.context.retryCallback();
                } else {
                    window.location.reload();
                }
                break;

            case 'sign-in':
                // Trigger sign-in modal or redirect
                if (window.authModal) {
                    window.authModal.show();
                } else {
                    window.location.href = '#signin';
                }
                break;

            case 'go-home':
                window.location.href = '/';
                break;

            case 'go-back':
                window.history.back();
                break;

            case 'contact-support':
                window.open('mailto:support@unitedwerise.org?subject=Error Report&body=' +
                    encodeURIComponent(`Error ID: ${errorMessage.errorId}\nTime: ${errorMessage.timestamp}\nPage: ${window.location.href}`));
                break;

            case 'check-connection':
                // Check connection status
                this.checkConnectionStatus();
                break;

            case 'report-issue':
                this.showReportIssueModal(errorMessage);
                break;

            case 'wait-and-retry':
                setTimeout(() => {
                    if (errorMessage.context.retryCallback) {
                        errorMessage.context.retryCallback();
                    }
                }, 3000);
                break;

            default:
                console.log('Unhandled error action:', action);
        }

        // Dismiss notification after action
        const notification = document.querySelector('.error-notification');
        if (notification) {
            this.dismissNotification(notification);
        }
    }

    // Dismiss notification and show next in queue
    dismissNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
            this.isShowingError = false;

            // Show next notification in queue
            if (this.notificationQueue.length > 0) {
                const nextError = this.notificationQueue.shift();
                this.showErrorNotification(nextError);
            }
        }, 300);
    }

    // Check connection status
    async checkConnectionStatus() {
        try {
            const response = await fetch('/health', { method: 'HEAD' });
            if (response.ok) {
                this.showSuccessMessage('Connection restored! ✅');
            } else {
                this.showWarningMessage('Still having connection issues. Please try again later.');
            }
        } catch (error) {
            this.showWarningMessage('Unable to reach our servers. Please check your internet connection.');
        }
    }

    // Show success/warning messages
    showSuccessMessage(message) {
        this.showSimpleNotification(message, 'success', '✅');
    }

    showWarningMessage(message) {
        this.showSimpleNotification(message, 'warning', '⚠️');
    }

    showSimpleNotification(message, type, icon) {
        const notification = document.createElement('div');
        notification.className = `simple-notification ${type}`;
        notification.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Generate unique error ID
    generateErrorId() {
        return 'ERR-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
    }

    // Log error for analytics
    logError(error, context, errorInfo) {
        // In production, send to error tracking service
        const errorLog = {
            errorId: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                status: error.status
            },
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: window.currentUser?.id
        };

        // For now, just log to console
        console.log('📊 Error logged:', errorLog);

        // In production, uncomment this:
        // fetch('/api/errors/log', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(errorLog)
        // });
    }
}

// Error notification CSS
const errorCSS = `
    .error-notification {
        position: fixed;
        top: 2rem;
        right: 2rem;
        max-width: 400px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        border-left: 4px solid;
    }

    .error-notification.severity-error {
        border-left-color: #f44336;
    }

    .error-notification.severity-warning {
        border-left-color: #ff9800;
    }

    .error-notification.severity-info {
        border-left-color: #2196f3;
    }

    .error-content {
        padding: 1rem;
    }

    .error-header {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .error-icon {
        font-size: 1.5rem;
        margin-right: 0.5rem;
    }

    .error-title {
        flex: 1;
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
    }

    .error-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .error-message {
        margin: 0 0 1rem 0;
        color: #666;
        line-height: 1.4;
    }

    .error-actions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    .error-action {
        padding: 0.4rem 0.8rem;
        border: 1px solid #ddd;
        background: #f8f9fa;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
    }

    .error-action:hover {
        background: #e9ecef;
        border-color: #adb5bd;
    }

    .error-details {
        color: #999;
        font-size: 0.75rem;
        border-top: 1px solid #eee;
        padding-top: 0.5rem;
    }

    .simple-notification {
        position: fixed;
        top: 1rem;
        right: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10001;
        animation: slideIn 0.3s ease;
    }

    .simple-notification.success {
        background: #4caf50;
    }

    .simple-notification.warning {
        background: #ff9800;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    @media (max-width: 768px) {
        .error-notification {
            top: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: none;
        }

        .error-actions {
            flex-direction: column;
        }

        .error-action {
            width: 100%;
        }
    }
`;

// Add CSS to document
function addErrorCSS() {
    if (!document.getElementById('error-handler-styles')) {
        const style = document.createElement('style');
        style.id = 'error-handler-styles';
        style.textContent = errorCSS;
        document.head.appendChild(style);
    }
}

// Initialize error handler
const globalErrorHandler = new ErrorHandler();

// Enhanced apiCall wrapper with error handling
function createErrorAwareApiCall(originalApiCall) {
    return async function(endpoint, options = {}) {
        try {
            const result = await originalApiCall(endpoint, options);
            return result;
        } catch (error) {
            const context = {
                endpoint,
                options,
                retryCallback: () => originalApiCall(endpoint, options)
            };

            globalErrorHandler.handleError(error, context);
            throw error; // Re-throw to allow caller to handle if needed
        }
    };
}

// Global error event listeners
window.addEventListener('error', (event) => {
    globalErrorHandler.handleError(event.error, {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.handleError(event.reason, {
        type: 'promise',
        source: 'unhandledrejection'
    });
    event.preventDefault(); // Prevent console error
});

// ES6 Module Exports
export { globalErrorHandler, createErrorAwareApiCall, ErrorHandler };
export default globalErrorHandler;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.globalErrorHandler = globalErrorHandler;
    window.createErrorAwareApiCall = createErrorAwareApiCall;
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    addErrorCSS();
});

console.log('🛡️ Error handling system loaded');