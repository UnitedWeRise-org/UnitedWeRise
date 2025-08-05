import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export const initializeWebSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
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