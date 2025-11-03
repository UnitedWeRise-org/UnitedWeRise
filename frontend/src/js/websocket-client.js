// Unified WebSocket messaging client for both USER_USER and ADMIN_CANDIDATE messaging
import { getWebSocketUrl } from '../utils/environment.js';

/**
 * Extract cookie value by name
 * Note: This cannot access httpOnly cookies (authToken is httpOnly for security)
 * However, we can attempt to read it in case browser allows it in specific contexts
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

class UnifiedMessagingClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3; // Reduced attempts
        this.messageHandlers = new Map();
        this.typingHandlers = new Map();
        this.connectionHandlers = [];
        this.disabled = false; // Circuit breaker

        // Only connect after user authentication completes
        this.initializeWhenAuthenticated();
    }

    // Initialize WebSocket connection only after user is authenticated
    initializeWhenAuthenticated() {
        if (window.currentUser && window.csrfToken) {
            // User already authenticated, connect now
            console.log('WebSocket: User authenticated, connecting...');
            this.connect();
        } else {
            // Wait for authentication
            console.log('WebSocket: Waiting for authentication before connecting...');
            window.addEventListener('userLoggedIn', () => {
                // Small delay to ensure csrfToken is set
                setTimeout(() => {
                    console.log('WebSocket: Authentication complete, connecting...');
                    this.connect();
                }, 500);
            }, { once: true });
        }
    }

    // Connect to WebSocket server
    connect() {
        if (this.disabled) {
            adminDebugWarn('WebSocket', 'WebSocket disabled due to repeated failures');
            return;
        }

        // Verify user is still authenticated (belt and suspenders check)
        if (!window.currentUser || !window.csrfToken) {
            adminDebugWarn('WebSocket', 'No user authentication available for WebSocket connection');
            return;
        }

        // Connect to backend WebSocket server using centralized URL detection
        const socketUrl = window.API_CONFIG
            ? window.API_CONFIG.BASE_URL.replace(/\/api$/, '') // Use centralized config - only remove trailing /api
            : getWebSocketUrl(); // Use centralized environment detection
        
        try {
            // WebSocket auth uses httpOnly cookie (like REST API)
            // Note: authToken is httpOnly and cannot be read by JavaScript (security feature)
            // However, legacy localStorage token may be available for backward compatibility

            // Try multiple token sources in priority order:
            // 1. httpOnly cookie (won't work, but withCredentials will try)
            // 2. Legacy localStorage token (deprecated but still set by some flows)
            // 3. Direct cookie access (last resort, won't work for httpOnly)
            let authToken = null;

            // Check localStorage for legacy token (deprecated but still used)
            const legacyToken = localStorage.getItem('authToken');
            if (legacyToken && legacyToken !== 'null' && legacyToken !== 'None') {
                authToken = legacyToken;
                console.log('WebSocket: Using legacy localStorage token for auth');
            }

            // Fallback: try to read from cookie (won't work for httpOnly, but try anyway)
            if (!authToken) {
                authToken = getCookie('authToken');
                if (authToken) {
                    console.log('WebSocket: Using cookie token for auth');
                }
            }

            const socketConfig = {
                transports: ['websocket', 'polling'],
                withCredentials: true, // Enable credential sharing for httpOnly cookies
                timeout: 20000,
                forceNew: true,
                // Explicitly configure transports to send cookies
                transportOptions: {
                    polling: {
                        extraHeaders: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    },
                    websocket: {
                        extraHeaders: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }
                }
            };

            // If we have a token, pass it explicitly via auth object
            // Backend has fallback to check socket.handshake.auth.token
            if (authToken) {
                socketConfig.auth = { token: authToken };
                console.log('WebSocket: Passing explicit auth token to backend');
            } else {
                console.warn('WebSocket: No token available, relying on httpOnly cookie only');
            }

            this.socket = io(socketUrl, socketConfig);

            this.setupEventHandlers();
        } catch (error) {
            adminDebugError('WebSocket', 'Failed to create socket connection', error);
            this.scheduleReconnect();
        }
    }

    // Set up socket event handlers
    setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            adminDebugLog('WebSocket', '✅ WebSocket connected and authenticated via cookie');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.connectionHandlers.forEach(handler => handler(true));
        });

        this.socket.on('connect_error', (error) => {
            // Connection errors include authentication failures from middleware
            const errorMessage = error?.message || error;
            if (errorMessage.includes('token') || errorMessage.includes('auth')) {
                adminDebugError('WebSocket', 'WebSocket authentication failed', errorMessage);
            } else {
                adminDebugError('WebSocket', 'WebSocket connection error', error);
            }
            this.isConnected = false;
            this.scheduleReconnect();
        });

        this.socket.on('disconnect', (reason) => {
            adminDebugLog('WebSocket', 'WebSocket disconnected', reason);
            this.isConnected = false;
            this.connectionHandlers.forEach(handler => handler(false));

            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect
                return;
            }

            this.scheduleReconnect();
        });

        // Handle incoming messages
        this.socket.on('new_message', (payload) => {
            adminDebugSensitive('WebSocket', 'New message received', payload);
            const { messageType, data } = payload;
            
            if (this.messageHandlers.has(messageType)) {
                this.messageHandlers.get(messageType).forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        adminDebugError('WebSocket', 'Error in message handler', error);
                    }
                });
            }
        });

        // Handle message sent confirmations
        this.socket.on('message_sent', (data) => {
            adminDebugLog('WebSocket', 'Message sent confirmation', data);
            // Trigger any UI updates for sent message
            if (this.messageHandlers.has('MESSAGE_SENT')) {
                this.messageHandlers.get('MESSAGE_SENT').forEach(handler => {
                    handler(data);
                });
            }
        });

        // Handle typing indicators
        this.socket.on('typing_start', (data) => {
            if (this.typingHandlers.has('TYPING_START')) {
                this.typingHandlers.get('TYPING_START').forEach(handler => handler(data));
            }
        });

        this.socket.on('typing_stop', (data) => {
            if (this.typingHandlers.has('TYPING_STOP')) {
                this.typingHandlers.get('TYPING_STOP').forEach(handler => handler(data));
            }
        });

        // Handle read receipts
        this.socket.on('messages_marked_read', (data) => {
            adminDebugLog('WebSocket', 'Messages marked as read', data);
            if (this.messageHandlers.has('MESSAGES_READ')) {
                this.messageHandlers.get('MESSAGES_READ').forEach(handler => handler(data));
            }
        });

        // Handle real-time notifications
        this.socket.on('new_notification', (notification) => {
            adminDebugSensitive('WebSocket', 'New notification received', notification);
            
            // Update notification UI
            if (typeof updateNotificationUI === 'function') {
                updateNotificationUI(notification);
            }
            
            // Update notification badge
            if (typeof updateNotificationBadge === 'function') {
                updateNotificationBadge();
            }
            
            // Show notification popup/toast if implemented
            if (typeof showNotificationToast === 'function') {
                showNotificationToast(notification);
            }
        });

        // Handle errors
        this.socket.on('message_error', (error) => {
            adminDebugError('WebSocket', 'Message error', error);
            alert('Failed to send message: ' + error.error);
        });

        this.socket.on('mark_read_error', (error) => {
            adminDebugError('WebSocket', 'Mark read error', error);
        });
    }

    // Schedule reconnection attempt
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            adminDebugWarn('WebSocket', 'Max WebSocket reconnection attempts reached. WebSocket permanently disabled, using REST API fallback only.');
            // Permanently disable WebSocket
            this.disabled = true;
            // Clear any existing socket to prevent further attempts
            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
                this.socket = null;
            }
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        adminDebugLog('WebSocket', `Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected && this.reconnectAttempts <= this.maxReconnectAttempts) {
                adminDebugLog('WebSocket', `Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect();
            }
        }, delay);
    }

    // Send a message
    sendMessage(messageType, recipientId, content, conversationId = null) {
        if (!this.isConnected || !this.socket) {
            adminDebugError('WebSocket', 'WebSocket not connected, cannot send message');
            return false;
        }

        if (!messageType || !recipientId || !content.trim()) {
            adminDebugError('WebSocket', 'Invalid message parameters');
            return false;
        }

        const messageData = {
            type: messageType,
            recipientId,
            content: content.trim(),
            conversationId
        };

        adminDebugSensitive('WebSocket', 'Sending message', messageData);
        this.socket.emit('send_message', messageData);
        return true;
    }

    // Send typing indicator
    startTyping(messageType, recipientId) {
        if (!this.isConnected || !this.socket) return;
        
        this.socket.emit('typing_start', {
            type: messageType,
            recipientId
        });
    }

    stopTyping(messageType, recipientId) {
        if (!this.isConnected || !this.socket) return;
        
        this.socket.emit('typing_stop', {
            type: messageType,
            recipientId
        });
    }

    // Mark messages as read
    markMessagesAsRead(messageIds, conversationId) {
        if (!this.isConnected || !this.socket) return false;
        
        this.socket.emit('mark_read', {
            messageIds,
            conversationId
        });
        return true;
    }

    // Register message handler
    onMessage(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
        
        // Return unsubscribe function
        return () => {
            const handlers = this.messageHandlers.get(messageType);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    }

    // Register typing handler
    onTyping(eventType, handler) {
        if (!this.typingHandlers.has(eventType)) {
            this.typingHandlers.set(eventType, []);
        }
        this.typingHandlers.get(eventType).push(handler);
        
        return () => {
            const handlers = this.typingHandlers.get(eventType);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    }

    // Register connection handler
    onConnection(handler) {
        this.connectionHandlers.push(handler);
        
        // Call immediately with current state
        handler(this.isConnected);
        
        return () => {
            const index = this.connectionHandlers.indexOf(handler);
            if (index > -1) {
                this.connectionHandlers.splice(index, 1);
            }
        };
    }

    // Get connection status
    isWebSocketConnected() {
        return this.isConnected;
    }

    // Disconnect
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }
}

// Create single global instance (avoid duplicate instantiation)
const unifiedMessaging = new UnifiedMessagingClient();
window.unifiedMessaging = unifiedMessaging;

// Convenience functions for specific message types
window.sendUserMessage = (recipientId, content, conversationId) => {
    return window.unifiedMessaging.sendMessage('USER_USER', recipientId, content, conversationId);
};

window.sendAdminCandidateMessage = (recipientId, content, conversationId) => {
    return window.unifiedMessaging.sendMessage('ADMIN_CANDIDATE', recipientId, content, conversationId);
};

window.sendUserCandidateMessage = (candidateId, content, conversationId) => {
    return window.unifiedMessaging.sendMessage('USER_CANDIDATE', candidateId, content, conversationId);
};

// ES6 Module Exports
export { UnifiedMessagingClient };
export { unifiedMessaging };