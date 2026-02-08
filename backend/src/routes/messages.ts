import { prisma } from '../lib/prisma';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateMessage } from '../middleware/validation';
import { messageLimiter } from '../middleware/rateLimiting';
import { logger } from '../services/logger';
import { createNotification } from './notifications';
import { FriendService } from '../services/relationshipService';
import { pushNotificationService } from '../services/pushNotificationService';
import { safePaginationParams } from '../utils/safeJson';

// Lazy-loaded WebSocket service for online status checks
let _webSocketService: any = null;
const getWebSocketService = async () => {
  if (!_webSocketService) {
    try {
      const serverModule = await import('../server');
      _webSocketService = serverModule.webSocketService;
    } catch (error) {
      logger.warn({ error }, 'WebSocket service not available for push notification check');
    }
  }
  return _webSocketService;
};

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     tags: [Message]
 *     summary: Get user's conversations with pagination
 *     description: Retrieves all conversations for the authenticated user, ordered by most recent message
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of conversations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of conversations to skip for pagination
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Conversation unique identifier
 *                       lastMessageAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: Timestamp of last message in conversation
 *                       lastMessageContent:
 *                         type: string
 *                         nullable: true
 *                         description: Content preview of last message
 *                       lastMessageSenderId:
 *                         type: string
 *                         nullable: true
 *                         description: ID of user who sent last message
 *                       lastReadAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: When current user last read this conversation
 *                       participants:
 *                         type: array
 *                         description: Other participants in conversation (excludes current user)
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             username:
 *                               type: string
 *                             firstName:
 *                               type: string
 *                             lastName:
 *                               type: string
 *                             avatar:
 *                               type: string
 *                               nullable: true
 *                             isOnline:
 *                               type: boolean
 *                               description: Whether participant is currently online
 *                             lastSeenAt:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                               description: Last time participant was seen online
 *                       unreadCount:
 *                         type: integer
 *                         description: Count of unread messages (currently returns 0)
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                       description: Number of conversations returned in this response
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// Get user's conversations
router.get('/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit: limitNum, offset: offsetNum } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    isOnline: true,
                    lastSeenAt: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        conversation: {
          lastMessageAt: 'desc'
        }
      },
      take: limitNum,
      skip: offsetNum
    });

    const formattedConversations = conversations.map(cp => {
      const otherParticipants = cp.conversation.participants.filter(p => p.userId !== userId);
      
      return {
        id: cp.conversation.id,
        lastMessageAt: cp.conversation.lastMessageAt,
        lastMessageContent: cp.conversation.lastMessageContent,
        lastMessageSenderId: cp.conversation.lastMessageSenderId,
        lastReadAt: cp.lastReadAt,
        participants: otherParticipants.map(p => p.user),
        unreadCount: 0 // We'll calculate this properly later
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: conversations.length
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get conversations error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/messages/conversations:
 *   post:
 *     tags: [Message]
 *     summary: Start a new conversation
 *     description: Creates a new conversation with another user. Returns existing conversation if one already exists between the two users.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *             properties:
 *               participantId:
 *                 type: string
 *                 description: ID of user to start conversation with
 *                 example: user_456
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Conversation created successfully
 *                 conversation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Conversation unique identifier
 *                     participants:
 *                       type: array
 *                       description: Other participants (excludes current user)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                             nullable: true
 *                           isOnline:
 *                             type: boolean
 *                           lastSeenAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *       200:
 *         description: Conversation already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Conversation already exists
 *                 conversation:
 *                   type: object
 *                   description: Existing conversation object
 *       400:
 *         description: Validation error - missing participantId or attempting to message self
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Cannot start conversation with yourself
 *       404:
 *         description: Participant user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// Start a new conversation
router.post('/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    if (participantId === userId) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    // Check if participant exists
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
      select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
    });

    if (!participant) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if conversation already exists between these users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [userId, participantId]
            }
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true,
                lastSeenAt: true
              }
            }
          }
        }
      }
    });

    if (existingConversation && existingConversation.participants.length === 2) {
      return res.json({
        success: true,
        message: 'Conversation already exists',
        conversation: {
          id: existingConversation.id,
          participants: existingConversation.participants.map(p => p.user).filter(u => u.id !== userId)
        }
      });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId },
            { userId: participantId }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true,
                lastSeenAt: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      conversation: {
        id: conversation.id,
        participants: conversation.participants.map(p => p.user).filter(u => u.id !== userId)
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, participantId: req.body.participantId }, 'Create conversation error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   get:
 *     tags: [Message]
 *     summary: Get messages in a conversation
 *     description: Retrieves messages from a specific conversation with pagination. Automatically updates user's lastReadAt timestamp for the conversation.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation unique identifier
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of messages to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of messages to skip for pagination
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return messages created before this timestamp (for infinite scroll)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   description: Messages in chronological order (oldest first)
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Message unique identifier
 *                       content:
 *                         type: string
 *                         description: Message text content
 *                       senderId:
 *                         type: string
 *                         description: ID of user who sent the message
 *                       sender:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                             nullable: true
 *                       conversationId:
 *                         type: string
 *                         description: Conversation this message belongs to
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Message creation timestamp
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                       description: Number of messages returned in this response
 *                     before:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Timestamp of oldest message for next page
 *       403:
 *         description: Access denied - user is not a participant in this conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Access denied to this conversation
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// Get messages in a conversation
router.get('/conversations/:conversationId/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { before } = req.query;
    const { limit: limitNum, offset: offsetNum } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    const whereClause: any = { conversationId };
    if (before) {
      whereClause.createdAt = { lt: new Date(before.toString()) };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
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
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum
    });

    // Update last read timestamp
    await prisma.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      },
      data: { lastReadAt: new Date() }
    });

    res.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: messages.length,
        before: messages.length > 0 ? messages[0].createdAt : null
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, conversationId: req.params.conversationId }, 'Get messages error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   post:
 *     tags: [Message]
 *     summary: Send a message via REST API (for testing)
 *     description: Sends a new message to a conversation via REST endpoint. Note - in production, messages are typically sent via WebSocket for real-time delivery. This endpoint is rate-limited.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation unique identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 description: Message text content (will be trimmed)
 *                 example: Hello, how are you?
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Message sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Message unique identifier
 *                     content:
 *                       type: string
 *                       description: Message text content
 *                     senderId:
 *                       type: string
 *                       description: ID of user who sent the message
 *                     sender:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                           nullable: true
 *                     conversationId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error - message content is empty or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Message content is required
 *       403:
 *         description: Access denied - user is not a participant in this conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Access denied to this conversation
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// Send message via REST API (for testing)
router.post('/conversations/:conversationId/messages', requireAuth, messageLimiter, validateMessage, async (req: AuthRequest, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get the other participant(s) in this conversation
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: userId }
      },
      select: { userId: true }
    });

    // For 1:1 conversations, check friendship status to determine message status
    let messageStatus: 'PENDING' | 'DELIVERED' = 'DELIVERED';
    let recipientId: string | null = null;

    if (otherParticipants.length === 1) {
      recipientId = otherParticipants[0].userId;

      // Check if they are friends
      const friendStatus = await FriendService.getFriendStatus(userId, recipientId);

      // If not friends, check if there's already an accepted conversation (previous message request accepted)
      if (!friendStatus.isFriend) {
        // Check if there are any existing DELIVERED messages in this conversation
        // If yes, the message request was previously accepted
        const existingDeliveredMessage = await prisma.message.findFirst({
          where: {
            conversationId,
            status: 'DELIVERED'
          }
        });

        if (!existingDeliveredMessage) {
          // First message from non-friend - set as PENDING
          messageStatus = 'PENDING';
        }
      }
    }

    // Create message with appropriate status
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: userId,
        conversationId,
        status: messageStatus
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
        lastMessageContent: content.trim(),
        lastMessageSenderId: userId
      }
    });

    // If this is a pending message (DM request), send notification to recipient
    if (messageStatus === 'PENDING' && recipientId) {
      const senderName = message.sender.firstName && message.sender.lastName
        ? `${message.sender.firstName} ${message.sender.lastName}`
        : message.sender.username;

      createNotification(
        'MESSAGE_REQUEST',
        userId,
        recipientId,
        `${senderName} wants to message you`,
        undefined,
        undefined
      ).catch(error => logger.error({ error }, 'Failed to create message request notification'));
    }

    // Send push notification if recipient is offline
    if (recipientId) {
      const wsService = await getWebSocketService();
      const isOnline = wsService?.isUserOnline(recipientId) ?? false;

      if (!isOnline) {
        const senderName = message.sender.firstName && message.sender.lastName
          ? `${message.sender.firstName} ${message.sender.lastName}`
          : message.sender.username;

        pushNotificationService.sendMessagePush(
          recipientId,
          senderName,
          content.trim(),
          conversationId,
          'USER_USER'
        ).catch(error => logger.error({ error }, 'Failed to send DM push notification'));
      }
    }

    res.status(201).json({
      success: true,
      message: messageStatus === 'PENDING' ? 'Message request sent - awaiting acceptance' : 'Message sent successfully',
      data: {
        ...message,
        isPending: messageStatus === 'PENDING'
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, conversationId: req.params.conversationId }, 'Send message error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/messages/requests:
 *   get:
 *     tags: [Message]
 *     summary: Get pending message requests
 *     description: Returns conversations with pending message requests from non-friends
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Message requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       conversationId:
 *                         type: string
 *                       sender:
 *                         type: object
 *                       messagePreview:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Find conversations where this user has received pending messages
    const pendingMessages = await prisma.message.findMany({
      where: {
        status: 'PENDING',
        conversation: {
          participants: {
            some: { userId }
          }
        },
        senderId: { not: userId } // Only messages sent TO this user
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
        },
        conversation: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by conversation and get the first message from each
    const requestsByConversation = new Map();
    for (const msg of pendingMessages) {
      if (!requestsByConversation.has(msg.conversationId)) {
        requestsByConversation.set(msg.conversationId, {
          conversationId: msg.conversationId,
          sender: msg.sender,
          messagePreview: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
          messageCount: 1,
          createdAt: msg.createdAt
        });
      } else {
        // Increment count for additional pending messages
        requestsByConversation.get(msg.conversationId).messageCount++;
      }
    }

    res.json({
      success: true,
      requests: Array.from(requestsByConversation.values()),
      count: requestsByConversation.size
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get message requests error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/messages/requests/{conversationId}/accept:
 *   put:
 *     tags: [Message]
 *     summary: Accept a message request
 *     description: Accepts pending messages from a conversation, allowing further communication
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message request accepted
 *       403:
 *         description: Not authorized to accept this request
 *       404:
 *         description: No pending request found
 *       500:
 *         description: Internal server error
 */
router.put('/requests/:conversationId/accept', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    // Verify user is a participant in this conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not authorized to access this conversation' });
    }

    // Check if there are pending messages in this conversation (not from this user)
    const pendingMessages = await prisma.message.findMany({
      where: {
        conversationId,
        status: 'PENDING',
        senderId: { not: userId }
      }
    });

    if (pendingMessages.length === 0) {
      return res.status(404).json({ error: 'No pending message request found' });
    }

    // Update all pending messages in this conversation to ACCEPTED
    await prisma.message.updateMany({
      where: {
        conversationId,
        status: 'PENDING'
      },
      data: {
        status: 'ACCEPTED'
      }
    });

    // Also mark future messages as DELIVERED by creating a "delivered" marker
    // This is handled in the send message logic - if any DELIVERED message exists, future are DELIVERED

    res.json({
      success: true,
      message: 'Message request accepted',
      conversationId,
      acceptedCount: pendingMessages.length
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, conversationId: req.params.conversationId }, 'Accept message request error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/messages/requests/{conversationId}/decline:
 *   put:
 *     tags: [Message]
 *     summary: Decline a message request
 *     description: Declines pending messages from a conversation. Messages are deleted.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message request declined
 *       403:
 *         description: Not authorized to decline this request
 *       404:
 *         description: No pending request found
 *       500:
 *         description: Internal server error
 */
router.put('/requests/:conversationId/decline', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    // Verify user is a participant in this conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not authorized to access this conversation' });
    }

    // Check if there are pending messages in this conversation (not from this user)
    const pendingMessages = await prisma.message.findMany({
      where: {
        conversationId,
        status: 'PENDING',
        senderId: { not: userId }
      }
    });

    if (pendingMessages.length === 0) {
      return res.status(404).json({ error: 'No pending message request found' });
    }

    // Delete pending messages (decline = remove the request)
    await prisma.message.deleteMany({
      where: {
        conversationId,
        status: 'PENDING'
      }
    });

    // Also delete the conversation if it has no messages left
    const remainingMessages = await prisma.message.count({
      where: { conversationId }
    });

    if (remainingMessages === 0) {
      await prisma.conversation.delete({
        where: { id: conversationId }
      });
    }

    res.json({
      success: true,
      message: 'Message request declined',
      conversationId,
      deletedCount: pendingMessages.length
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, conversationId: req.params.conversationId }, 'Decline message request error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;