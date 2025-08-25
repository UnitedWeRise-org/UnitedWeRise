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
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
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
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        console.error('Create conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map