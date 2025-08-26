import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { MessageType } from '../types/messaging';

const router = express.Router();
const prisma = new PrismaClient();

// Get conversations list for a user
router.get('/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    let whereClause: any = {
      participants: {
        has: userId
      }
    };

    if (type && (type === 'USER_USER' || type === 'ADMIN_CANDIDATE')) {
      whereClause.type = type;
    }

    const conversations = await prisma.conversationMeta.findMany({
      where: whereClause,
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: 50
    });

    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await prisma.unifiedMessage.findFirst({
          where: {
            conversationId: conv.id
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        return {
          ...conv,
          lastMessage
        };
      })
    );

    res.json({
      success: true,
      data: conversationsWithMessages
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify user is participant in this conversation
    const conversation = await prisma.conversationMeta.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this conversation'
      });
    }

    const messages = await prisma.unifiedMessage.findMany({
      where: {
        conversationId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show chronological order
        conversation,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Send a message (REST endpoint - WebSocket is preferred)
router.post('/send', requireAuth, async (req: AuthRequest, res) => {
  try {
    const senderId = req.user!.id;
    const { type, recipientId, content, conversationId } = req.body;

    if (!type || !recipientId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, recipientId, content'
      });
    }

    if (type !== 'USER_USER' && type !== 'ADMIN_CANDIDATE') {
      return res.status(400).json({
        success: false,
        error: 'Invalid message type'
      });
    }

    // Validate content length
    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content cannot be empty'
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Message content too long (max 5000 characters)'
      });
    }

    // Generate conversation ID if not provided
    let finalConversationId = conversationId;
    if (!finalConversationId) {
      if (type === 'ADMIN_CANDIDATE') {
        const candidateId = senderId === 'admin' ? recipientId : senderId;
        finalConversationId = `admin_candidate_${candidateId}`;
      } else if (type === 'USER_USER') {
        const sortedIds = [senderId, recipientId].sort();
        finalConversationId = `user_${sortedIds[0]}_${sortedIds[1]}`;
      }
    }

    // Create the message
    const message = await prisma.unifiedMessage.create({
      data: {
        type: type as 'USER_USER' | 'ADMIN_CANDIDATE',
        senderId,
        recipientId,
        content: content.trim(),
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
        type: type as 'USER_USER' | 'ADMIN_CANDIDATE',
        participants: type === 'ADMIN_CANDIDATE' 
          ? ['admin', senderId === 'admin' ? recipientId : senderId]
          : [senderId, recipientId],
        lastMessageAt: message.createdAt,
        unreadCount: 1
      }
    });

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Mark messages as read
router.post('/mark-read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { messageIds, conversationId } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        error: 'messageIds must be an array'
      });
    }

    // Mark messages as read (only messages where user is recipient)
    const updateResult = await prisma.unifiedMessage.updateMany({
      where: {
        id: { in: messageIds },
        recipientId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        updatedAt: new Date()
      }
    });

    // Update conversation unread count if conversation ID provided
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

    res.json({
      success: true,
      data: {
        messagesMarkedRead: updateResult.count
      }
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

// Get unread message count for user
router.get('/unread-count', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    let whereClause: any = {
      recipientId: userId,
      isRead: false
    };

    if (type && (type === 'USER_USER' || type === 'ADMIN_CANDIDATE')) {
      whereClause.type = type;
    }

    const unreadCount = await prisma.unifiedMessage.count({
      where: whereClause
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
    });
  }
});

// Admin endpoint: Get admin-candidate messages for a specific candidate
router.get('/admin/candidate/:candidateId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { candidateId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const conversationId = `admin_candidate_${candidateId}`;

    const messages = await prisma.unifiedMessage.findMany({
      where: {
        type: 'ADMIN_CANDIDATE',
        conversationId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Get candidate info
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        user: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    // Get unread count for admin
    const unreadAdminCount = await prisma.unifiedMessage.count({
      where: {
        type: 'ADMIN_CANDIDATE',
        conversationId,
        recipientId: 'admin',
        isRead: false
      }
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        candidate,
        unreadAdminCount,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching admin-candidate messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Candidate endpoint: Get admin messages for current candidate
router.get('/candidate/admin-messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get candidate profile for this user
    const candidate = await prisma.candidate.findUnique({
      where: { userId },
      select: { id: true, name: true }
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate profile not found'
      });
    }

    const conversationId = `admin_candidate_${candidate.id}`;

    const messages = await prisma.unifiedMessage.findMany({
      where: {
        type: 'ADMIN_CANDIDATE',
        conversationId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Get unread count for candidate
    const unreadCandidateCount = await prisma.unifiedMessage.count({
      where: {
        type: 'ADMIN_CANDIDATE',
        conversationId,
        recipientId: candidate.id,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        candidate,
        unreadCandidateCount,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching candidate admin messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

export default router;