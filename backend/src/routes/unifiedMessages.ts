import express from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { MessageType } from '../types/messaging';
import { logger } from '../services/logger';
import { safePaginationParams } from '../utils/safeJson';

const router = express.Router();

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

    if (type && (type === 'USER_USER' || type === 'ADMIN_CANDIDATE' || type === 'USER_CANDIDATE')) {
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
    logger.error({ error, userId: req.user?.id, type: req.query.type }, 'Error fetching conversations');
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
    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

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
    logger.error({ error, conversationId: req.params.conversationId, userId: req.user?.id }, 'Error fetching messages');
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

    if (type !== 'USER_USER' && type !== 'ADMIN_CANDIDATE' && type !== 'USER_CANDIDATE') {
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
        const candidateUserId = senderId === 'admin' ? recipientId : senderId;
        finalConversationId = `admin_${candidateUserId}`;
      } else if (type === 'USER_CANDIDATE') {
        finalConversationId = `candidate_${recipientId}_user_${senderId}`;
      } else if (type === 'USER_USER') {
        const sortedIds = [senderId, recipientId].sort();
        finalConversationId = `user_${sortedIds[0]}_${sortedIds[1]}`;
      }
    }

    // Create the message
    const message = await prisma.unifiedMessage.create({
      data: {
        type: type as 'USER_USER' | 'ADMIN_CANDIDATE' | 'USER_CANDIDATE',
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
        type: type as 'USER_USER' | 'ADMIN_CANDIDATE' | 'USER_CANDIDATE',
        participants: type === 'ADMIN_CANDIDATE' 
          ? ['admin', senderId === 'admin' ? recipientId : senderId]
          : type === 'USER_CANDIDATE'
          ? [senderId, recipientId]
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
    logger.error({ error, senderId: req.user?.id, type: req.body.type }, 'Error sending message');
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
    logger.error({ error, userId: req.user?.id, conversationId: req.body.conversationId }, 'Error marking messages as read');
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

    if (type && (type === 'USER_USER' || type === 'ADMIN_CANDIDATE' || type === 'USER_CANDIDATE')) {
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
    logger.error({ error, userId: req.user?.id, type: req.query.type }, 'Error fetching unread count');
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
    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

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
    logger.error({ error, candidateId: req.params.candidateId, userId: req.user?.id }, 'Error fetching admin-candidate messages');
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
    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

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
    logger.error({ error, userId: req.user?.id }, 'Error fetching candidate admin messages');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Candidate endpoint: Get user messages for current candidate
router.get('/candidate/user-messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

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

    // Get all conversations for this candidate (USER_CANDIDATE type)
    const conversations = await prisma.conversationMeta.findMany({
      where: {
        type: 'USER_CANDIDATE',
        participants: { has: userId }
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Get messages for each conversation with sender details
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await prisma.unifiedMessage.findMany({
          where: {
            conversationId: conv.id,
            type: 'USER_CANDIDATE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Last 10 messages per conversation
        });

        // Get sender details for each unique sender
        const senderIds = [...new Set(messages.map(m => m.senderId))];
        const senders = await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, username: true, firstName: true, lastName: true }
        });

        const sendersMap = senders.reduce((acc, sender) => {
          acc[sender.id] = sender;
          return acc;
        }, {} as Record<string, any>);

        const messagesWithSenders = messages.map(msg => ({
          ...msg,
          sender: sendersMap[msg.senderId]
        }));

        return {
          ...conv,
          messages: messagesWithSenders.reverse(), // Chronological order
          unreadCount: await prisma.unifiedMessage.count({
            where: {
              conversationId: conv.id,
              recipientId: userId,
              isRead: false
            }
          })
        };
      })
    );

    res.json({
      success: true,
      data: {
        conversations: conversationsWithMessages,
        candidate,
        hasMore: conversations.length === limit
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error fetching candidate user messages');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user messages'
    });
  }
});

export default router;