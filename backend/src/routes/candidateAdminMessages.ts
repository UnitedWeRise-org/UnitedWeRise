import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /api/candidate/admin-messages:
 *   get:
 *     tags: [Candidate]
 *     summary: Get admin messages for current candidate
 *     description: Retrieve conversation history between candidate and admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to return
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Message ID to paginate before
 *     responses:
 *       200:
 *         description: Conversation history
 *       403:
 *         description: Not a candidate or candidate not found
 */
// GET /api/candidate/admin-messages - Get admin messages for current candidate
router.get('/admin-messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { limit = 50, before } = req.query;

    // Find candidate profile for current user
    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user!.id },
      select: { 
        id: true, 
        name: true, 
        status: true,
        office: { select: { title: true, state: true } }
      }
    });

    if (!candidate) {
      return res.status(403).json({ 
        error: 'Candidate access required',
        message: 'You must have an active candidate profile to access admin messaging'
      });
    }

    const where: any = { candidateId: candidate.id };
    if (before) {
      where.createdAt = { lt: new Date(before as string) };
    }

    const messages = await prisma.candidateAdminMessage.findMany({
      where,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, isAdmin: true } },
        replyTo: { select: { id: true, content: true, createdAt: true, isFromAdmin: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    // Mark candidate messages as read (admin has seen them)
    const unreadCandidateMessages = messages.filter(m => !m.isFromAdmin && !m.isRead);
    if (unreadCandidateMessages.length > 0) {
      await prisma.candidateAdminMessage.updateMany({
        where: {
          id: { in: unreadCandidateMessages.map(m => m.id) },
          isFromAdmin: false,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }

    // Get unread admin messages count
    const unreadAdminCount = await prisma.candidateAdminMessage.count({
      where: {
        candidateId: candidate.id,
        isFromAdmin: true,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          status: candidate.status,
          office: candidate.office
        },
        messages: messages.reverse(), // Show oldest first for chat display
        unreadAdminCount
      }
    });

  } catch (error) {
    console.error('Error fetching candidate admin messages:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

/**
 * @swagger
 * /api/candidate/admin-messages:
 *   post:
 *     tags: [Candidate]
 *     summary: Send message to admin
 *     description: Send a message from candidate to admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               messageType:
 *                 type: string
 *                 enum: [SUPPORT_REQUEST, STATUS_INQUIRY, TECHNICAL_ISSUE, POLICY_QUESTION, FEATURE_REQUEST, APPEAL_MESSAGE, GENERAL]
 *                 default: GENERAL
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *                 default: NORMAL
 *               subject:
 *                 type: string
 *                 description: Optional subject line
 *               replyToId:
 *                 type: string
 *                 description: ID of message being replied to
 *             required:
 *               - content
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       403:
 *         description: Not a candidate or candidate not found
 */
// POST /api/candidate/admin-messages - Send message from candidate to admin
router.post('/admin-messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content, messageType = 'GENERAL', priority = 'NORMAL', subject, replyToId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Find candidate profile for current user
    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user!.id },
      select: { 
        id: true, 
        name: true, 
        status: true,
        office: { select: { title: true, state: true } }
      }
    });

    if (!candidate) {
      return res.status(403).json({ 
        error: 'Candidate access required',
        message: 'You must have an active candidate profile to send admin messages'
      });
    }

    // Generate thread ID if this is a new conversation or reply
    let threadId = null;
    if (replyToId) {
      const replyToMessage = await prisma.candidateAdminMessage.findUnique({
        where: { id: replyToId },
        select: { threadId: true }
      });
      threadId = replyToMessage?.threadId || replyToId;
    } else {
      // New conversation thread
      threadId = `thread_${Date.now()}_${candidate.id}`;
    }

    const message = await prisma.candidateAdminMessage.create({
      data: {
        candidateId: candidate.id,
        senderId: req.user!.id,
        isFromAdmin: false,
        messageType,
        priority,
        subject,
        content: content.trim(),
        threadId,
        replyToId,
        isRead: false
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        candidate: { select: { name: true, office: { select: { title: true, state: true } } } }
      }
    });

    console.log(`✅ Candidate message sent from ${candidate.name} to admin (${messageType})`);

    // TODO: Send notification to admin about new candidate message
    // TODO: Send email notification to admin if urgent priority

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Error sending candidate admin message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @swagger
 * /api/candidate/admin-messages/unread-count:
 *   get:
 *     tags: [Candidate]
 *     summary: Get unread admin message count
 *     description: Get count of unread messages from admin for notification badge
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread message count
 *       403:
 *         description: Not a candidate
 */
// GET /api/candidate/admin-messages/unread-count - Get unread admin message count
router.get('/admin-messages/unread-count', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Find candidate profile for current user
    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user!.id },
      select: { id: true }
    });

    if (!candidate) {
      return res.status(403).json({ 
        error: 'Candidate access required'
      });
    }

    const unreadCount = await prisma.candidateAdminMessage.count({
      where: {
        candidateId: candidate.id,
        isFromAdmin: true,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;