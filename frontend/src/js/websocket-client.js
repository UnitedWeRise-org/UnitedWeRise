// Unified WebSocket messaging client for both USER_USER and ADMIN_CANDIDATE messaging
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
        
        // Delay initial connection to prevent immediate spam
        setTimeout(() => {
            if (!this.disabled) {
                this.connect();
            }
        }, 2000);
    }

    // Connect to WebSocket server
    connect() {
        if (this.disabled) {
            console.log('🚫 WebSocket disabled due to repeated failures');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn('No auth token available for WebSocket connection');
            return;
        }

        // Connect to backend WebSocket server
        const backendUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001'  // Local development
            : 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io'; // Production
        
        const socketUrl = backendUrl;
        
        try {
            this.socket = io(socketUrl, {
                auth: {
                    token: authToken
                },
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true
            });

            this.setupEventHandlers();
        } catch (error) {
            console.error('Failed to create socket connection:', error);
            this.scheduleReconnect();
        }
    }

    // Set up socket event handlers
    setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected successfully');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.connectionHandlers.forEach(handler => handler(true));
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            this.isConnected = false;
            this.connectionHandlers.forEach(handler => handler(false));
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect
                return;
            }
            
            this.scheduleReconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.isConnected = false;
            this.scheduleReconnect();
        });

        // Handle incoming messages
        this.socket.on('new_message', (payload) => {
            console.log('📨 New message received:', payload);
            const { messageType, data } = payload;
            
            if (this.messageHandlers.has(messageType)) {
                this.messageHandlers.get(messageType).forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        console.error('Error in message handler:', error);
                    }
                });
            }
        });

        // Handle message sent confirmations
        this.socket.on('message_sent', (data) => {
            console.log('✅ Message sent confirmation:', data);
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
            console.log('✅ Messages marked as read:', data);
            if (this.messageHandlers.has('MESSAGES_READ')) {
                this.messageHandlers.get('MESSAGES_READ').forEach(handler => handler(data));
            }
        });

        // Handle errors
        this.socket.on('message_error', (error) => {
            console.error('❌ Message error:', error);
            alert('Failed to send message: ' + error.error);
        });

        this.socket.on('mark_read_error', (error) => {
            console.error('❌ Mark read error:', error);
        });
    }

    // Schedule reconnection attempt
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('🚫 Max WebSocket reconnection attempts reached. WebSocket permanently disabled, using REST API fallback only.');
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
        
        console.log(`⏳ Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected && this.reconnectAttempts <= this.maxReconnectAttempts) {
                console.log(`📡 Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect();
            }
        }, delay);
    }

    // Send a message
    sendMessage(messageType, recipientId, content, conversationId = null) {
        if (!this.isConnected || !this.socket) {
            console.error('WebSocket not connected, cannot send message');
            return false;
        }

        if (!messageType || !recipientId || !content.trim()) {
            console.error('Invalid message parameters');
            return false;
        }

        const messageData = {
            type: messageType,
            recipientId,
            content: content.trim(),
            conversationId
        };

        console.log('📤 Sending message:', messageData);
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

// Global instance
window.unifiedMessaging = new UnifiedMessagingClient();

// Convenience functions for specific message types
window.sendUserMessage = (recipientId, content, conversationId) => {
    return window.unifiedMessaging.sendMessage('USER_USER', recipientId, content, conversationId);
};

window.sendAdminCandidateMessage = (recipientId, content, conversationId) => {
    return window.unifiedMessaging.sendMessage('ADMIN_CANDIDATE', recipientId, content, conversationId);
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedMessagingClient;
}