import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { isProduction, enableRequestLogging } from '../utils/environment';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { MessageType, WebSocketMessagePayload, UnifiedMessage } from '../types/messaging';
import { sessionManager } from './sessionManager';
import { verifyToken } from '../utils/auth';
import { COOKIE_NAMES } from '../utils/cookies';
import { logger } from './logger';

const prisma = new PrismaClient();

export class WebSocketService {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    // Environment-aware CORS configuration
    // Explicit origins required (cannot use wildcard with credentials: true)
    const allowedOrigins = [
      'https://www.unitedwerise.org',        // Production frontend
      'https://admin.unitedwerise.org',      // Production admin dashboard
      'https://dev.unitedwerise.org',        // Staging frontend
      'https://dev-admin.unitedwerise.org',  // Staging admin dashboard
      'https://yellow-mud-043d1ca0f.2.azurestaticapps.net',  // Azure Static Web Apps (backward compatibility)
      'http://localhost:3000',               // Local development
      'http://localhost:5173',               // Vite dev server
      'http://localhost:8080'                // Alternative local port
    ];

    if (enableRequestLogging()) {
      logger.info({ allowedOrigins, nodeEnv: process.env.NODE_ENV }, 'WebSocket CORS configuration');
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true  // CRITICAL: Allows httpOnly cookies
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', async (socket) => {
      const userId = socket.data.userId;
      logger.info({ userId }, 'User connected via WebSocket');

      // Track user's active sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

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
        logger.info({ userId }, 'User disconnected');
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

  private async authenticateSocket(socket: any, next: any) {
    try {
      logger.info({ address: socket.handshake.address }, 'WebSocket connection attempt');

      let userId: string | undefined;
      let authMethod: string = 'none';

      // Parse cookies once for both access and refresh tokens
      const cookieHeader = socket.handshake.headers.cookie;

      let cookies: any = {};
      if (cookieHeader) {
        if (enableRequestLogging()) {
          logger.debug({
            hasCookie: !!cookieHeader,
            cookieLength: cookieHeader.length,
            cookieNames: cookieHeader.split(';').map((c: string) => c.trim().split('=')[0])
          }, 'Cookie header present');
        }

        // Parse cookie header to extract tokens
        cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
      }

      // PRIMARY AUTHENTICATION: Try access token first (short-lived, 30 min)
      let accessToken = cookies[COOKIE_NAMES.AUTH_TOKEN];

      // Fallback for explicit token in auth or header
      if (!accessToken) {
        accessToken = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (enableRequestLogging()) {
          logger.debug({ hasToken: !!accessToken }, 'Token from auth.token or Bearer header');
        }
      } else {
        if (enableRequestLogging()) {
          logger.debug({ hasToken: !!accessToken }, 'authToken from cookie');
        }
      }

      // Try to verify access token
      if (accessToken) {
        const decoded = verifyToken(accessToken);
        if (decoded) {
          // Check if access token is blacklisted
          const tokenId = crypto.createHash('sha256').update(accessToken).digest('hex');
          if (await sessionManager.isTokenBlacklisted(tokenId)) {
            if (enableRequestLogging()) {
              logger.warn('Access token blacklisted, will try refresh token');
            }
          } else {
            userId = decoded.userId;
            authMethod = 'access_token';
            if (enableRequestLogging()) {
              logger.debug({ userId }, 'Access token valid');
            }
          }
        } else {
          if (enableRequestLogging()) {
            logger.warn('Access token invalid or expired, will try refresh token');
          }
        }
      }

      // FALLBACK AUTHENTICATION: Try refresh token for long-lived connections (30-90 days)
      if (!userId) {
        const refreshToken = cookies[COOKIE_NAMES.REFRESH_TOKEN];
        if (enableRequestLogging()) {
          logger.debug({ hasRefreshToken: !!refreshToken }, 'refreshToken from cookie');
        }

        if (refreshToken) {
          const tokenData = await sessionManager.validateRefreshToken(refreshToken);
          if (tokenData) {
            userId = tokenData.userId;
            authMethod = 'refresh_token';
            if (enableRequestLogging()) {
              logger.debug({ userId }, 'Refresh token valid');
            }
          } else {
            if (enableRequestLogging()) {
              logger.error('Refresh token invalid or expired');
            }
          }
        }
      }

      // If no valid token found, reject connection
      if (!userId) {
        logger.error('WebSocket auth failed: No valid access or refresh token provided');
        return next(new Error('Authentication error: No valid token provided'));
      }

      // Get user details from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, isAdmin: true, isSuspended: true }
      });

      if (!user) {
        logger.error({ userId }, 'WebSocket auth failed: User not found');
        return next(new Error('Authentication error: User not found'));
      }

      if (user.isSuspended) {
        logger.error({ userId }, 'WebSocket auth failed: User is suspended');
        return next(new Error('Authentication error: User account is suspended'));
      }

      socket.data.userId = user.id;
      socket.data.username = user.username;
      socket.data.isAdmin = user.isAdmin;

      logger.info({ username: user.username, authMethod }, 'WebSocket authentication successful');
      next();
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'WebSocket authentication error');
      next(new Error('Authentication error: Invalid token'));
    }
  }

  private async handleSendMessage(socket: any, data: { 
    type: MessageType; 
    recipientId: string; 
    content: string; 
    conversationId?: string; 
  }) {
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
      const payload: WebSocketMessagePayload = {
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
      if (type === MessageType.ADMIN_CANDIDATE && recipientId !== 'admin') {
        // Admin to candidate message
        // Special case: If admin is messaging themselves (testing scenario), use io.to instead of broadcast
        if (senderId === recipientId) {
          // Admin messaging their own candidate profile - include sender
          this.io.to(`user:${recipientId}`).emit('new_message', payload);
          logger.debug({ senderId }, 'Admin self-message: messaging own candidate profile');
        } else {
          // Normal case: exclude sender to prevent duplicates
          socket.broadcast.to(`user:${recipientId}`).emit('new_message', payload);
        }
      } else if (type === MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
        // Candidate to admin message - send to admin room (exclude sender)
        socket.broadcast.to('admin:room').emit('new_message', payload);
      } else if (type === MessageType.USER_CANDIDATE) {
        // User to candidate message - send to candidate (exclude sender)
        socket.broadcast.to(`user:${recipientId}`).emit('new_message', payload);
      } else if (type === MessageType.USER_USER) {
        // User to user message - send to recipient (exclude sender)
        socket.broadcast.to(`user:${recipientId}`).emit('new_message', payload);
      }

      logger.info({ type, senderId, recipientId }, 'Message sent');
    } catch (error) {
      logger.error({ error }, 'Error handling send_message');
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  }

  private handleTypingStart(socket: any, data: { recipientId: string; type: MessageType }) {
    const { recipientId, type } = data;
    const senderId = socket.data.userId;

    if (type === MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
      this.io.to('admin:room').emit('typing_start', { senderId, senderUsername: socket.data.username });
    } else if (type === MessageType.ADMIN_CANDIDATE && recipientId !== 'admin') {
      this.io.to(`user:${recipientId}`).emit('typing_start', { senderId, senderUsername: socket.data.username });
    } else if (type === MessageType.USER_CANDIDATE) {
      this.io.to(`user:${recipientId}`).emit('typing_start', { senderId, senderUsername: socket.data.username });
    } else if (type === MessageType.USER_USER) {
      this.io.to(`user:${recipientId}`).emit('typing_start', { senderId, senderUsername: socket.data.username });
    }
  }

  private handleTypingStop(socket: any, data: { recipientId: string; type: MessageType }) {
    const { recipientId, type } = data;
    const senderId = socket.data.userId;

    if (type === MessageType.ADMIN_CANDIDATE && recipientId === 'admin') {
      this.io.to('admin:room').emit('typing_stop', { senderId });
    } else if (type === MessageType.ADMIN_CANDIDATE && recipientId !== 'admin') {
      this.io.to(`user:${recipientId}`).emit('typing_stop', { senderId });
    } else if (type === MessageType.USER_CANDIDATE) {
      this.io.to(`user:${recipientId}`).emit('typing_stop', { senderId });
    } else if (type === MessageType.USER_USER) {
      this.io.to(`user:${recipientId}`).emit('typing_stop', { senderId });
    }
  }

  private async handleMarkRead(socket: any, data: { messageIds: string[]; conversationId?: string }) {
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
    } catch (error) {
      logger.error({ error }, 'Error marking messages as read');
      socket.emit('mark_read_error', { error: 'Failed to mark messages as read' });
    }
  }

  private async createUnifiedMessage(data: {
    type: MessageType;
    senderId: string;
    recipientId: string;
    content: string;
    conversationId?: string;
  }): Promise<UnifiedMessage> {
    const { type, senderId, recipientId, content, conversationId } = data;

    // Generate conversation ID if not provided
    let finalConversationId = conversationId;
    if (!finalConversationId) {
      if (type === MessageType.ADMIN_CANDIDATE) {
        // For admin-candidate messages, always use candidate user ID
        const candidateUserId = senderId === 'admin' ? recipientId : senderId;
        finalConversationId = `admin_${candidateUserId}`;
      } else if (type === MessageType.USER_CANDIDATE) {
        // For user-candidate messages, use candidate user ID with user prefix
        finalConversationId = `candidate_${recipientId}_user_${senderId}`;
      } else if (type === MessageType.USER_USER) {
        // For user-user messages, sort IDs for consistent conversation ID
        const sortedIds = [senderId, recipientId].sort();
        finalConversationId = `user_${sortedIds[0]}_${sortedIds[1]}`;
      }
    }

    // Create the message
    const message = await prisma.unifiedMessage.create({
      data: {
        type: type === MessageType.USER_USER ? 'USER_USER' : 
              type === MessageType.USER_CANDIDATE ? 'USER_CANDIDATE' : 'ADMIN_CANDIDATE',
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
        type: type === MessageType.USER_USER ? 'USER_USER' : 
              type === MessageType.USER_CANDIDATE ? 'USER_CANDIDATE' : 'ADMIN_CANDIDATE',
        participants: type === MessageType.ADMIN_CANDIDATE 
          ? ['admin', senderId === 'admin' ? recipientId : senderId]
          : type === MessageType.USER_CANDIDATE
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
  public async sendMessage(data: {
    type: MessageType;
    senderId: string;
    recipientId: string;
    content: string;
    conversationId?: string;
  }) {
    const message = await this.createUnifiedMessage(data);

    const payload: WebSocketMessagePayload = {
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

    if (data.type === MessageType.ADMIN_CANDIDATE && data.recipientId !== 'admin') {
      this.io.to(`user:${data.recipientId}`).emit('new_message', payload);
    } else if (data.type === MessageType.ADMIN_CANDIDATE && data.recipientId === 'admin') {
      this.io.to('admin:room').emit('new_message', payload);
    } else if (data.type === MessageType.USER_CANDIDATE) {
      this.io.to(`user:${data.recipientId}`).emit('new_message', payload);
    } else if (data.type === MessageType.USER_USER) {
      this.io.to(`user:${data.recipientId}`).emit('new_message', payload);
    }

    return message;
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Get online users count
  public getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  // Emit notification to user
  public emitNotification(receiverId: string, notification: any): void {
    try {
      this.io.to(`user:${receiverId}`).emit('new_notification', notification);
      logger.info({ receiverId, notificationType: notification.type }, 'Notification emitted');
    } catch (error) {
      logger.error({ error }, 'Error emitting notification');
    }
  }
}

export default WebSocketService;