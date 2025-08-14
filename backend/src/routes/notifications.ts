import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's notifications
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0, unreadOnly } = req.query;

    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());

    const whereClause: any = { receiverId: userId };
    if (unreadOnly === 'true') {
      whereClause.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            verified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        receiverId: userId,
        read: false
      }
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: notifications.length
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        receiverId: userId
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: {
        receiverId: userId,
        read: false
      },
      data: { read: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to create notifications (we'll use this in other routes)
export const createNotification = async (
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED',
  senderId: string | null,
  receiverId: string,
  message: string,
  postId?: string,
  commentId?: string
) => {
  try {
    await prisma.notification.create({
      data: {
        type,
        senderId,
        receiverId,
        message,
        postId,
        commentId
      }
    });
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

export default router;