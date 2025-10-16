import { prisma } from './lib/prisma';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sessionManager } from './services/sessionManager';

// Using singleton prisma from lib/prisma.ts
// SECURITY: JWT_SECRET must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set for WebSocket authentication');
}

export const initializeWebSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware - reads JWT from httpOnly cookie (like REST API)
  io.use(async (socket: any, next) => {
    try {
      console.log('🔌 WebSocket connection attempt from:', socket.handshake.address);

      // Parse cookies from socket handshake headers
      const cookieHeader = socket.handshake.headers.cookie;
      console.log('🍪 Cookie header present:', !!cookieHeader);
      if (cookieHeader) {
        console.log('🍪 Cookie header length:', cookieHeader.length);
      }

      let token: string | undefined;

      if (cookieHeader) {
        // Parse cookie header to extract authToken
        const cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});

        token = cookies.authToken;
        console.log('🔑 authToken from cookie:', token ? `${token.substring(0, 20)}...` : 'not found');
      }

      // Fallback: Check auth.token for manual token passing (backwards compatibility)
      if (!token) {
        token = socket.handshake.auth.token;
        console.log('🔑 Token from auth.token:', token ? `${token.substring(0, 20)}...` : 'not found');
      }

      if (!token) {
        console.error('❌ WebSocket auth failed: No token provided in cookies or auth.token');
        return next(new Error('No token provided'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      console.log('✅ JWT decoded successfully, userId:', decoded.userId);

      // SECURITY FIX: Check if token is blacklisted
      const tokenId = crypto.createHash('sha256').update(token).digest('hex');
      if (await sessionManager.isTokenBlacklisted(tokenId)) {
        console.error('❌ WebSocket auth failed: Token has been revoked');
        return next(new Error('Token has been revoked'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true }
      });

      if (!user) {
        console.error('❌ WebSocket auth failed: User not found for userId:', decoded.userId);
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      console.log('✅ WebSocket authentication successful for user:', user.username);
      next();
    } catch (error) {
      console.error('❌ WebSocket auth error:', error instanceof Error ? error.message : error);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket: any) => {
    console.log(`User ${socket.user?.username} connected`);

    // Update user online status
    await prisma.user.update({
      where: { id: socket.userId },
      data: { 
        isOnline: true,
        lastSeenAt: new Date()
      }
    });

    // Join user to their conversation rooms
    const userConversations = await prisma.conversationParticipant.findMany({
      where: { userId: socket.userId },
      select: { conversationId: true }
    });

    // Fixed forEach with proper typing
    for (const conv of userConversations) {
      socket.join(`conversation:${conv.conversationId}`);
    }

    // Handle sending messages
    socket.on('send_message', async (data: any) => {
      try {
        const { conversationId, content } = data;

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            userId_conversationId: {
              userId: socket.userId,
              conversationId
            }
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'Not authorized for this conversation' });
          return;
        }

        // Create the message
        const message = await prisma.message.create({
          data: {
            content,
            senderId: socket.userId,
            conversationId
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        });

        // Update conversation
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            lastMessageContent: content,
            lastMessageSenderId: socket.userId
          }
        });

        // Send to all participants
        io.to(`conversation:${conversationId}`).emit('new_message', message);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle joining conversations
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('disconnect', async () => {
      console.log(`User ${socket.user?.username} disconnected`);
      
      await prisma.user.update({
        where: { id: socket.userId },
        data: { 
          isOnline: false,
          lastSeenAt: new Date()
        }
      });
    });
  });

  return io;
};