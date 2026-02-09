"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const environment_1 = require("../utils/environment");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const messaging_1 = require("../types/messaging");
const sessionManager_1 = require("./sessionManager");
const auth_1 = require("../utils/auth");
const cookies_1 = require("../utils/cookies");
const logger_1 = require("./logger");
class WebSocketService {
    io;
    userSockets = new Map();
    constructor(httpServer) {
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
            logger_1.logger.info({ allowedOrigins, nodeEnv: process.env.NODE_ENV }, 'WebSocket CORS configuration');
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
            logger_1.logger.info({ userId }, 'User connected via WebSocket');
            // Track user's active sockets
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(socket.id);
            // Update user online status in database
            await prisma_1.prisma.user.update({
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
            // Handle typing indicators
            socket.on('typing_start', this.handleTypingStart.bind(this, socket));
            socket.on('typing_stop', this.handleTypingStop.bind(this, socket));
            // Handle message read receipts
            socket.on('mark_read', this.handleMarkRead.bind(this, socket));
            // Handle conversation room management
            socket.on('join_conversation', this.handleJoinConversation.bind(this, socket));
            socket.on('leave_conversation', this.handleLeaveConversation.bind(this, socket));
            // Broadcast presence to other connected clients
            socket.broadcast.emit('user_online', { userId });
            // Handle disconnection
            socket.on('disconnect', async () => {
                logger_1.logger.info({ userId }, 'User disconnected');
                const userSocketSet = this.userSockets.get(userId);
                if (userSocketSet) {
                    userSocketSet.delete(socket.id);
                    if (userSocketSet.size === 0) {
                        this.userSockets.delete(userId);
                        // Update user offline status in database (only when last socket disconnects)
                        await prisma_1.prisma.user.update({
                            where: { id: userId },
                            data: {
                                isOnline: false,
                                lastSeenAt: new Date()
                            }
                        });
                        // Broadcast offline status (only when last socket disconnects)
                        socket.broadcast.emit('user_offline', { userId });
                    }
                }
            });
        });
    }
    async authenticateSocket(socket, next) {
        try {
            logger_1.logger.info({ address: socket.handshake.address }, 'WebSocket connection attempt');
            let userId;
            let authMethod = 'none';
            // Parse cookies once for both access and refresh tokens
            const cookieHeader = socket.handshake.headers.cookie;
            let cookies = {};
            if (cookieHeader) {
                if ((0, environment_1.enableRequestLogging)()) {
                    logger_1.logger.debug({
                        hasCookie: !!cookieHeader,
                        cookieLength: cookieHeader.length,
                        cookieNames: cookieHeader.split(';').map((c) => c.trim().split('=')[0])
                    }, 'Cookie header present');
                }
                // Parse cookie header to extract tokens
                cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});
            }
            // PRIMARY AUTHENTICATION: Try access token first (short-lived, 30 min)
            let accessToken = cookies[cookies_1.COOKIE_NAMES.AUTH_TOKEN];
            // Fallback for explicit token in auth or header
            if (!accessToken) {
                accessToken = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if ((0, environment_1.enableRequestLogging)()) {
                    logger_1.logger.debug({ hasToken: !!accessToken }, 'Token from auth.token or Bearer header');
                }
            }
            else {
                if ((0, environment_1.enableRequestLogging)()) {
                    logger_1.logger.debug({ hasToken: !!accessToken }, 'authToken from cookie');
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
                            logger_1.logger.warn('Access token blacklisted, will try refresh token');
                        }
                    }
                    else {
                        userId = decoded.userId;
                        authMethod = 'access_token';
                        if ((0, environment_1.enableRequestLogging)()) {
                            logger_1.logger.debug({ userId }, 'Access token valid');
                        }
                    }
                }
                else {
                    if ((0, environment_1.enableRequestLogging)()) {
                        logger_1.logger.warn('Access token invalid or expired, will try refresh token');
                    }
                }
            }
            // FALLBACK AUTHENTICATION: Try refresh token for long-lived connections (30-90 days)
            if (!userId) {
                const refreshToken = cookies[cookies_1.COOKIE_NAMES.REFRESH_TOKEN];
                if ((0, environment_1.enableRequestLogging)()) {
                    logger_1.logger.debug({ hasRefreshToken: !!refreshToken }, 'refreshToken from cookie');
                }
                if (refreshToken) {
                    const tokenData = await sessionManager_1.sessionManager.validateRefreshToken(refreshToken);
                    if (tokenData) {
                        userId = tokenData.userId;
                        authMethod = 'refresh_token';
                        if ((0, environment_1.enableRequestLogging)()) {
                            logger_1.logger.debug({ userId }, 'Refresh token valid');
                        }
                    }
                    else {
                        if ((0, environment_1.enableRequestLogging)()) {
                            logger_1.logger.error('Refresh token invalid or expired');
                        }
                    }
                }
            }
            // If no valid token found, reject connection
            if (!userId) {
                logger_1.logger.error('WebSocket auth failed: No valid access or refresh token provided');
                return next(new Error('Authentication error: No valid token provided'));
            }
            // Get user details from database
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, isAdmin: true, isSuspended: true }
            });
            if (!user) {
                logger_1.logger.error({ userId }, 'WebSocket auth failed: User not found');
                return next(new Error('Authentication error: User not found'));
            }
            if (user.isSuspended) {
                logger_1.logger.error({ userId }, 'WebSocket auth failed: User is suspended');
                return next(new Error('Authentication error: User account is suspended'));
            }
            socket.data.userId = user.id;
            socket.data.username = user.username;
            socket.data.isAdmin = user.isAdmin;
            logger_1.logger.info({ username: user.username, authMethod }, 'WebSocket authentication successful');
            next();
        }
        catch (error) {
            logger_1.logger.error({ error: error instanceof Error ? error.message : error }, 'WebSocket authentication error');
            next(new Error('Authentication error: Invalid token'));
        }
    }
    /**
     * Handle typing start event.
     * Accepts two formats for backwards compatibility:
     * - Web frontend: { recipientId, type } (legacy)
     * - iOS app: { conversationId } (resolves recipient from ConversationParticipant)
     */
    async handleTypingStart(socket, data) {
        const senderId = socket.data.userId;
        let recipientId = data.recipientId;
        let conversationId = data.conversationId;
        const type = data.type;
        // iOS format: resolve recipientId from conversationId
        if (!recipientId && conversationId) {
            try {
                const otherParticipant = await prisma_1.prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId: { not: senderId } },
                    select: { userId: true }
                });
                if (otherParticipant) {
                    recipientId = otherParticipant.userId;
                }
            }
            catch (error) {
                logger_1.logger.error({ error, conversationId }, 'Error resolving typing recipient');
                return;
            }
        }
        if (!recipientId)
            return;
        // Superset payload: includes fields for both iOS and web clients
        const payload = { senderId, senderUsername: socket.data.username, userId: senderId, conversationId };
        if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
            this.io.to('admin:room').emit('typing_start', payload);
        }
        else {
            this.io.to(`user:${recipientId}`).emit('typing_start', payload);
        }
    }
    /**
     * Handle typing stop event.
     * Accepts two formats for backwards compatibility:
     * - Web frontend: { recipientId, type } (legacy)
     * - iOS app: { conversationId } (resolves recipient from ConversationParticipant)
     */
    async handleTypingStop(socket, data) {
        const senderId = socket.data.userId;
        let recipientId = data.recipientId;
        let conversationId = data.conversationId;
        const type = data.type;
        // iOS format: resolve recipientId from conversationId
        if (!recipientId && conversationId) {
            try {
                const otherParticipant = await prisma_1.prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId: { not: senderId } },
                    select: { userId: true }
                });
                if (otherParticipant) {
                    recipientId = otherParticipant.userId;
                }
            }
            catch (error) {
                logger_1.logger.error({ error, conversationId }, 'Error resolving typing recipient');
                return;
            }
        }
        if (!recipientId)
            return;
        // Superset payload: includes fields for both iOS and web clients
        const payload = { senderId, senderUsername: socket.data.username, userId: senderId, conversationId };
        if (type === messaging_1.MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
            this.io.to('admin:room').emit('typing_stop', payload);
        }
        else {
            this.io.to(`user:${recipientId}`).emit('typing_stop', payload);
        }
    }
    /**
     * Handle mark_read event.
     * Accepts two formats for backwards compatibility:
     * - Web frontend: { messageIds: string[], conversationId? }
     * - iOS app: { messageId: string } (singular — wrapped into array)
     *
     * Operates on the Message table (consolidated system).
     * Broadcasts message_read event to other conversation participants.
     */
    async handleMarkRead(socket, data) {
        try {
            const userId = socket.data.userId;
            // Accept both formats: singular messageId (iOS) or plural messageIds (web)
            const messageIds = data.messageIds || (data.messageId ? [data.messageId] : []);
            if (messageIds.length === 0)
                return;
            let conversationId = data.conversationId;
            // If no conversationId provided, look it up from the first message
            if (!conversationId && messageIds.length > 0) {
                const firstMessage = await prisma_1.prisma.message.findUnique({
                    where: { id: messageIds[0] },
                    select: { conversationId: true }
                });
                conversationId = firstMessage?.conversationId;
            }
            // Update lastReadAt on the ConversationParticipant record
            if (conversationId) {
                await prisma_1.prisma.conversationParticipant.updateMany({
                    where: { conversationId, userId },
                    data: { lastReadAt: new Date() }
                });
            }
            // Acknowledge to sender
            socket.emit('messages_marked_read', { messageIds, conversationId });
            // Broadcast message_read to other participants so they see read receipts
            if (conversationId) {
                const otherParticipants = await prisma_1.prisma.conversationParticipant.findMany({
                    where: { conversationId, userId: { not: userId } },
                    select: { userId: true }
                });
                for (const participant of otherParticipants) {
                    for (const messageId of messageIds) {
                        this.io.to(`user:${participant.userId}`).emit('message_read', {
                            messageId,
                            userId,
                            conversationId
                        });
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Error marking messages as read');
            socket.emit('mark_read_error', { error: 'Failed to mark messages as read' });
        }
    }
    /**
     * Handle join_conversation event.
     * Joins the socket to a conversation-specific room for targeted delivery.
     * Verifies user is a participant before allowing the join.
     */
    async handleJoinConversation(socket, data) {
        const { conversationId } = data;
        if (!conversationId)
            return;
        const userId = socket.data.userId;
        try {
            const participant = await prisma_1.prisma.conversationParticipant.findFirst({
                where: { conversationId, userId }
            });
            if (participant) {
                socket.join(`conversation:${conversationId}`);
            }
        }
        catch (error) {
            logger_1.logger.error({ error, conversationId, userId }, 'Error joining conversation room');
        }
    }
    /**
     * Handle leave_conversation event.
     * Removes the socket from a conversation-specific room.
     */
    handleLeaveConversation(socket, data) {
        const { conversationId } = data;
        if (!conversationId)
            return;
        socket.leave(`conversation:${conversationId}`);
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
            logger_1.logger.info({ receiverId, notificationType: notification.type }, 'Notification emitted');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Error emitting notification');
        }
    }
    /// Emit a real-time message to a specific user via Socket.IO
    emitMessage(userId, message) {
        try {
            this.io.to(`user:${userId}`).emit('new_message', message);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Error emitting message');
        }
    }
}
exports.WebSocketService = WebSocketService;
exports.default = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map