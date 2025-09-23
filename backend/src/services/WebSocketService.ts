import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { isProduction } from '../utils/environment';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { MessageType, WebSocketMessagePayload, UnifiedMessage } from '../types/messaging';

const prisma = new PrismaClient();

export class WebSocketService {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: isProduction()
          ? ['https://www.unitedwerise.org', 'https://yellow-mud-043d1ca0f.2.azurestaticapps.net']
          : ['http://localhost:3000', 'http://localhost:8080'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      console.log(`User ${userId} connected via WebSocket`);

      // Track user's active sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

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
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });
    });
  }

  private async authenticateSocket(socket: any, next: any) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const userId = decoded.userId;

      // Get user details from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, isAdmin: true, isSuspended: true }
      });

      if (!user || user.isSuspended) {
        return next(new Error('Authentication error: Invalid or suspended user'));
      }

      socket.data.userId = user.id;
      socket.data.username = user.username;
      socket.data.isAdmin = user.isAdmin;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
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
          console.log(`Admin self-message: ${senderId} messaging own candidate profile`);
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

      console.log(`Message sent: ${type} from ${senderId} to ${recipientId}`);
    } catch (error) {
      console.error('Error handling send_message:', error);
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
      console.error('Error marking messages as read:', error);
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
      console.log(`Notification emitted to user ${receiverId}:`, notification.type);
    } catch (error) {
      console.error('Error emitting notification:', error);
    }
  }
}

export default WebSocketService;