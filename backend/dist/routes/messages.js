"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
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
router.get('/conversations', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        const conversations = await prisma_1.prisma.conversationParticipant.findMany({
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
            conversations: formattedConversations,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: conversations.length
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get conversations error');
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
router.post('/conversations', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { participantId } = req.body;
        if (!participantId) {
            return res.status(400).json({ error: 'Participant ID is required' });
        }
        if (participantId === userId) {
            return res.status(400).json({ error: 'Cannot start conversation with yourself' });
        }
        // Check if participant exists
        const participant = await prisma_1.prisma.user.findUnique({
            where: { id: participantId },
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
        });
        if (!participant) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if conversation already exists between these users
        const existingConversation = await prisma_1.prisma.conversation.findFirst({
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
                message: 'Conversation already exists',
                conversation: {
                    id: existingConversation.id,
                    participants: existingConversation.participants.map(p => p.user).filter(u => u.id !== userId)
                }
            });
        }
        // Create new conversation
        const conversation = await prisma_1.prisma.conversation.create({
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
            message: 'Conversation created successfully',
            conversation: {
                id: conversation.id,
                participants: conversation.participants.map(p => p.user).filter(u => u.id !== userId)
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, participantId: req.body.participantId }, 'Create conversation error');
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
router.get('/conversations/:conversationId/messages', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const { limit = 50, offset = 0, before } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        // Verify user is participant in conversation
        const participant = await prisma_1.prisma.conversationParticipant.findUnique({
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
        const whereClause = { conversationId };
        if (before) {
            whereClause.createdAt = { lt: new Date(before.toString()) };
        }
        const messages = await prisma_1.prisma.message.findMany({
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
        await prisma_1.prisma.conversationParticipant.update({
            where: {
                userId_conversationId: {
                    userId,
                    conversationId
                }
            },
            data: { lastReadAt: new Date() }
        });
        res.json({
            messages: messages.reverse(), // Return in chronological order
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                count: messages.length,
                before: messages.length > 0 ? messages[0].createdAt : null
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, conversationId: req.params.conversationId }, 'Get messages error');
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
router.post('/conversations/:conversationId/messages', auth_1.requireAuth, rateLimiting_1.messageLimiter, validation_1.validateMessage, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        // Verify user is participant
        const participant = await prisma_1.prisma.conversationParticipant.findUnique({
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
        // Create message
        const message = await prisma_1.prisma.message.create({
            data: {
                content: content.trim(),
                senderId: userId,
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
        await prisma_1.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessageAt: new Date(),
                lastMessageContent: content.trim(),
                lastMessageSenderId: userId
            }
        });
        res.status(201).json({
            message: 'Message sent successfully',
            data: message
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, conversationId: req.params.conversationId }, 'Send message error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map