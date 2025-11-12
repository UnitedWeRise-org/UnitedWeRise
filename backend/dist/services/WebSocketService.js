"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const environment_1 = require("../utils/environment");
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const messaging_1 = require("../types/messaging");
const sessionManager_1 = require("./sessionManager");
const auth_1 = require("../utils/auth");
const prisma = new client_1.PrismaClient();
class WebSocketService {
    constructor(httpServer) {
        this.userSockets = new Map();
        // Environment-aware CORS configuration
        // Explicit origins required (cannot use wildcard with credentials: true)
        const allowedOrigins = [
            'https://www.unitedwerise.org', // Production frontend
            'https://admin.unitedwerise.org', // Production admin dashboard
            'https://dev.unitedwerise.org', // Staging frontend
            'https://dev-admin.unitedwerise.org', // Staging admin dashboard
            'https://yellow-mud-043d1ca0f.2.azurestaticapps.net', // Azure Static Web Apps (backward compatibility)
            'http://localhost:3000', // Local development
            'http://localhost:5173', // Vite dev server
            'http://localhost:8080' // Alternative local port
        ];
        if ((0, environment_1.enableRequestLogging)()) {
            console.log('🔌 WebSocket CORS - Allowed Origins:', allowedOrigins);
            console.log('🌍 WebSocket CORS - NODE_ENV:', process.env.NODE_ENV);
        }
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true // CRITICAL: Allows httpOnly cookies
            },
            transports: ['websocket', 'polling']
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.io.use(this.authenticateSocket.bind(this));
        this.io.on('connection', async (socket) => {
            const userId = socket.data.userId;
            console.log(`User ${userId} connected via WebSocket`);
            // Track user's active sockets
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(socket.id);
            // Update user online status in database
            await prisma.user.update({
                where: { id: userId },
                data: {
                    isOnline: true,
                    lastSeenAt: new Date()
                }
            });
            // Join user to their personal room for targeted messages
            socket.join(`user:${userId}`);
            // Join admin users to admin room
            if (socket.data.isAdmin) {
                socket.join('admin:room');
            }
            // Handle sending messages
            socket.on('send_message', this.handleSendMessage.bind(this, socket));
            // Handle typing indicators
            socket.on('typing_start', this.handleTypingStart.bind(this, socket));
            socket.on('typing_stop', this.handleTypingStop.bind(this, socket));
            // Handle message read receipts
            socket.on('mark_read', this.handleMarkRead.bind(this, socket));
            // Handle disconnection
            socket.on('disconnect', async () => {
                console.log(`User ${userId} disconnected`);
                const userSocketSet = this.userSockets.get(userId);
                if (userSocketSet) {
                    userSocketSet.delete(socket.id);
                    if (userSocketSet.size === 0) {
                        this.userSockets.delete(userId);
                        // Update user offline status in database (only when last socket disconnects)
                        await prisma.user.update({
                            where: { id: userId },
                            data: {
                                isOnline: false,
                                lastSeenAt: new Date()
                            }
                        });
                    }
                }
            });
        });
    }
    async authenticateSocket(socket, next) {
        try {
            console.log('🔌 WebSocket connection attempt from:', socket.handshake.address);
            let userId;
            let authMethod = 'none';
            // Parse cookies once for both access and refresh tokens
            const cookieHeader = socket.handshake.headers.cookie;
            let cookies = {};
            if (cookieHeader) {
                if ((0, environment_1.enableRequestLogging)()) {
                    console.log('🍪 Cookie header present:', !!cookieHeader);
                    console.log('🍪 Cookie header length:', cookieHeader.length);
                    console.log('🍪 All cookies:', cookieHeader.split(';').map((c) => c.trim().split('=')[0]));
                }
                // Parse cookie header to extract tokens
                cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});
            }
            // PRIMARY AUTHENTICATION: Try access token first (short-lived, 30 min)
            let accessToken = cookies.authToken;
            // Fallback for explicit token in auth or header
            if (!accessToken) {
                accessToken = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if ((0, environment_1.enableRequestLogging)()) {
                    console.log('🔑 Token from auth.token or Bearer header:', accessToken ? '[REDACTED]' : 'not found');
                }
            }
            else {
                if ((0, environment_1.enableRequestLogging)()) {
                    console.log('🔑 authToken from cookie:', accessToken ? '[REDACTED]' : 'not found');
                }
            }
            // Try to verify access token
            if (accessToken) {
                const decoded = (0, auth_1.verifyToken)(accessToken);
                if (decoded) {
                    // Check if access token is blacklisted
                    const tokenId = crypto_1.default.createHash('sha256').update(accessToken).digest('hex');
                    if (await sessionManager_1.sessionManager.isTokenBlacklisted(tokenId)) {
                        if ((0, environment_1.enableRequestLogging)()) {
                            console.log('⚠️ Access token blacklisted, will try refresh token');
                        }
                    }
                    else {
                        userId = decoded.userId;
                        authMethod = 'access_token';
                        if ((0, environment_1.enableRequestLogging)()) {
                            console.log('✅ Access token valid, userId:', userId);
                        }
                    }
                }
                else {
                    if ((0, environment_1.enableRequestLogging)()) {
                        console.log('⚠️ Access token invalid or expired, will try refresh token');
                    }
                }
            }
            // FALLBACK AUTHENTICATION: Try refresh token for long-lived connections (30-90 days)
            if (!userId) {
                const refreshToken = cookies.refreshToken;
                if ((0, environment_1.enableRequestLogging)()) {
                    console.log('🔑 refreshToken from cookie:', refreshToken ? '[REDACTED]' : 'not found');
                }
                if (refreshToken) {
                    const tokenData = await sessionManager_1.sessionManager.validateRefreshToken(refreshToken);
                    if (tokenData) {
                        userId = tokenData.userId;
                        authMethod = 'refresh_token';
                        if ((0, environment_1.enableRequestLogging)()) {
                            console.log('✅ Refresh token valid, userId:', userId);
                        }
                    }
                    else {
                        if ((0, environment_1.enableRequestLogging)()) {
                            console.log('❌ Refresh token invalid or expired');
                        }
                    }
                }
            }
            // If no valid token found, reject connection
            if (!userId) {
                console.error('❌ WebSocket auth failed: No valid access or refresh token provided');
                return next(new Error('Authentication error: No valid token provided'));
            }
            // Get user details from database
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, isAdmin: true, isSuspended: true }
            });
            if (!user) {
                console.error('❌ WebSocket auth failed: User not found for userId:', userId);
                return next(new Error('Authentication error: User not found'));
            }
            if (user.isSuspended) {
                console.error('❌ WebSocket auth failed: User is suspended:', userId);
                return next(new Error('Authentication error: User account is suspended'));
            }
            socket.data.userId = user.id;
            socket.data.username = user.username;
            socket.data.isAdmin = user.isAdmin;
            console.log('✅ WebSocket authentication successful for user:', user.username, 'via', authMethod);
            next();
        }
        catch (error) {
            console.error('❌ WebSocket authentication error:', error instanceof Error ? error.message : error);
            next(new Error('Authentication error: Invalid token'));
        }
    }
    async handleSendMessage(socket, data) {
        try {
            const senderId = socket.data.userId;
            const { type, recipientId, content, conversationId } = data;
            // Validate message content
            if (!content.trim()) {
                socket.emit('message_error', { error: 'Message content cannot be empty' });
                return;
            }
            // Create unified message
            const message = await this.createUnifiedMessage({
                type,
                senderId,
                recipientId,
                content: content.trim(),
                conversationId
            });
            // Emit to sender for confirmation
            socket.emit('message_sent', {
                messageId: message.id,
                type,
                content: message.content,
                recipientId,
                conversationId: message.conversationId,
                timestamp: message.createdAt
            });
            // Emit to recipient if online
            const payload = {
                type: 'NEW_MESSAGE',
                messageType: type,
                data: {
                    id: message.id,
                    senderId,
                    senderUsername: socket.data.username,
                    content: message.content,
                    type,
                    conversationId: message.conversationId,
                    timestamp: message.createdAt
                },
                timestamp: new Date()
            };
            // Send to recipient
            if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId !== 'admin') {
                // Admin to candidate message
                // Special case: If admin is messaging themselves (testing scenario), use io.to instead of broadcast
                if (senderId === recipientId) {
                    // Admin messaging their own candidate profile - include sender
                    this.io.to(`user:${recipientId}`).emit('new_message', payload);
                    console.log(`Admin self-message: ${senderId} messaging own candidate profile`);
                }
                else {
                    // Normal case: exclude sender to prevent duplicates
                    socket.broadcast.to(`user:${recipientId}`).emit('new_message', payload);
                }
            }
            else if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
                // Candidate to admin message - send to admin room (exclude sender)
                socket.broadcast.to('admin:room').emit('new_message', payload);
            }
            else if (type === messaging_1.MessageType.USER_CANDIDATE) {
                // User to candidate message - send to candidate (exclude sender)
                socket.broadcast.to(`user:${recipientId}`).emit('new_message', payload);
            }
            else if (type === messaging_1.MessageType.USER_USER) {
                // User to user message - send to recipient (exclude sender)
                socket.broadcast.to(`user:${recipientId}`).emit('new_message', payload);
            }
            console.log(`Message sent: ${type} from ${senderId} to ${recipientId}`);
        }
        catch (error) {
            console.error('Error handling send_message:', error);
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    }
    handleTypingStart(socket, data) {
        const { recipientId, type } = data;
        const senderId = socket.data.userId;
        if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
            this.io.to('admin:room').emit('typing_start', { senderId, senderUsername: socket.data.username });
        }
        else if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId !== 'admin') {
            this.io.to(`user:${recipientId}`).emit('typing_start', { senderId, senderUsername: socket.data.username });
        }
        else if (type === messaging_1.MessageType.USER_CANDIDATE) {
            this.io.to(`user:${recipientId}`).emit('typing_start', { senderId, senderUsername: socket.data.username });
        }
        else if (type === messaging_1.MessageType.USER_USER) {
            this.io.to(`user:${recipientId}`).emit('typing_start', { senderId, senderUsername: socket.data.username });
        }
    }
    handleTypingStop(socket, data) {
        const { recipientId, type } = data;
        const senderId = socket.data.userId;
        if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
            this.io.to('admin:room').emit('typing_stop', { senderId });
        }
        else if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId !== 'admin') {
            this.io.to(`user:${recipientId}`).emit('typing_stop', { senderId });
        }
        else if (type === messaging_1.MessageType.USER_CANDIDATE) {
            this.io.to(`user:${recipientId}`).emit('typing_stop', { senderId });
        }
        else if (type === messaging_1.MessageType.USER_USER) {
            this.io.to(`user:${recipientId}`).emit('typing_stop', { senderId });
        }
    }
    async handleMarkRead(socket, data) {
        try {
            const userId = socket.data.userId;
            const { messageIds, conversationId } = data;
            // Mark messages as read in database
            await prisma.unifiedMessage.updateMany({
                where: {
                    id: { in: messageIds },
                    recipientId: userId
                },
                data: {
                    isRead: true,
                    updatedAt: new Date()
                }
            });
            // Update conversation metadata
            if (conversationId) {
                const unreadCount = await prisma.unifiedMessage.count({
                    where: {
                        conversationId,
                        recipientId: userId,
                        isRead: false
                    }
                });
                await prisma.conversationMeta.update({
                    where: { id: conversationId },
                    data: { unreadCount }
                });
            }
            socket.emit('messages_marked_read', { messageIds, conversationId });
        }
        catch (error) {
            console.error('Error marking messages as read:', error);
            socket.emit('mark_read_error', { error: 'Failed to mark messages as read' });
        }
    }
    async createUnifiedMessage(data) {
        const { type, senderId, recipientId, content, conversationId } = data;
        // Generate conversation ID if not provided
        let finalConversationId = conversationId;
        if (!finalConversationId) {
            if (type === messaging_1.MessageType.ADMIN_CANDIDATE) {
                // For admin-candidate messages, always use candidate user ID
                const candidateUserId = senderId === 'admin' ? recipientId : senderId;
                finalConversationId = `admin_${candidateUserId}`;
            }
            else if (type === messaging_1.MessageType.USER_CANDIDATE) {
                // For user-candidate messages, use candidate user ID with user prefix
                finalConversationId = `candidate_${recipientId}_user_${senderId}`;
            }
            else if (type === messaging_1.MessageType.USER_USER) {
                // For user-user messages, sort IDs for consistent conversation ID
                const sortedIds = [senderId, recipientId].sort();
                finalConversationId = `user_${sortedIds[0]}_${sortedIds[1]}`;
            }
        }
        // Create the message
        const message = await prisma.unifiedMessage.create({
            data: {
                type: type === messaging_1.MessageType.USER_USER ? 'USER_USER' :
                    type === messaging_1.MessageType.USER_CANDIDATE ? 'USER_CANDIDATE' : 'ADMIN_CANDIDATE',
                senderId,
                recipientId,
                content,
                conversationId: finalConversationId,
                isRead: false
            }
        });
        // Update or create conversation metadata
        await prisma.conversationMeta.upsert({
            where: { id: finalConversationId },
            update: {
                lastMessageAt: message.createdAt,
                unreadCount: {
                    increment: 1
                }
            },
            create: {
                id: finalConversationId,
                type: type === messaging_1.MessageType.USER_USER ? 'USER_USER' :
                    type === messaging_1.MessageType.USER_CANDIDATE ? 'USER_CANDIDATE' : 'ADMIN_CANDIDATE',
                participants: type === messaging_1.MessageType.ADMIN_CANDIDATE
                    ? ['admin', senderId === 'admin' ? recipientId : senderId]
                    : type === messaging_1.MessageType.USER_CANDIDATE
                        ? [senderId, recipientId]
                        : [senderId, recipientId],
                lastMessageAt: message.createdAt,
                unreadCount: 1
            }
        });
        return {
            id: message.id,
            type: type,
            senderId: message.senderId,
            recipientId: message.recipientId,
            content: message.content,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            conversationId: message.conversationId,
            isRead: message.isRead
        };
    }
    // Public method to send server-initiated messages
    async sendMessage(data) {
        const message = await this.createUnifiedMessage(data);
        const payload = {
            type: 'NEW_MESSAGE',
            messageType: data.type,
            data: {
                id: message.id,
                senderId: data.senderId,
                content: message.content,
                type: data.type,
                conversationId: message.conversationId,
                timestamp: message.createdAt
            },
            timestamp: new Date()
        };
        if (data.type === messaging_1.MessageType.ADMIN_CANDIDATE && data.recipientId !== 'admin') {
            this.io.to(`user:${data.recipientId}`).emit('new_message', payload);
        }
        else if (data.type === messaging_1.MessageType.ADMIN_CANDIDATE && data.recipientId === 'admin') {
            this.io.to('admin:room').emit('new_message', payload);
        }
        else if (data.type === messaging_1.MessageType.USER_CANDIDATE) {
            this.io.to(`user:${data.recipientId}`).emit('new_message', payload);
        }
        else if (data.type === messaging_1.MessageType.USER_USER) {
            this.io.to(`user:${data.recipientId}`).emit('new_message', payload);
        }
        return message;
    }
    // Check if user is online
    isUserOnline(userId) {
        return this.userSockets.has(userId);
    }
    // Get online users count
    getOnlineUsersCount() {
        return this.userSockets.size;
    }
    // Emit notification to user
    emitNotification(receiverId, notification) {
        try {
            this.io.to(`user:${receiverId}`).emit('new_notification', notification);
            console.log(`Notification emitted to user ${receiverId}:`, notification.type);
        }
        catch (error) {
            console.error('Error emitting notification:', error);
        }
    }
}
exports.WebSocketService = WebSocketService;
exports.default = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map