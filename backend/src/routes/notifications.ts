import { prisma } from '../lib/prisma';
import { NotificationType } from '@prisma/client';
import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../services/logger';
import { safePaginationParams } from '../utils/safeJson';

const router = express.Router();

// Import webSocketService for real-time notifications
let webSocketService: any = null;
const getWebSocketService = async () => {
  if (!webSocketService) {
    try {
      const serverModule = await import('../server');
      webSocketService = serverModule.webSocketService;
    } catch (error) {
      logger.warn({ error }, 'WebSocket service not available');
    }
  }
  return webSocketService;
};
// Using singleton prisma from lib/prisma.ts

/**
 * Default notification preferences. These are merged over the user's stored
 * JSON so new preference keys default on without a migration.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  browserNotifications: true,
  browserNotifyNewMessages: true,
  browserNotifyLikes: false,
  browserNotifyComments: true,
  emailNotifications: true,
  emailNotifyImportantMessages: true,
  emailNotifyWeeklyDigest: false,
  emailNotifySecurityAlerts: true,
  candidateInboxNotifications: true,
  candidateElectionReminders: true,
  // In-app bell preferences
  inAppNotifyFollows: true,
  inAppNotifyFriendRequests: true,
  inAppNotifyLikes: true,
  inAppNotifyComments: true,
  inAppNotifyMentions: true,
  inAppNotifyNewPosts: true,
  inAppNotifyMessages: true
};

/**
 * Maps a notification type to the in-app preference that controls it.
 * Types not listed (verification, org, system) are always delivered.
 */
const IN_APP_PREFERENCE_BY_TYPE: Partial<Record<NotificationType, string>> = {
  FOLLOW: 'inAppNotifyFollows',
  FRIEND_REQUEST: 'inAppNotifyFriendRequests',
  FRIEND_ACCEPTED: 'inAppNotifyFriendRequests',
  LIKE: 'inAppNotifyLikes',
  REACTION: 'inAppNotifyLikes',
  COMMENT: 'inAppNotifyComments',
  MENTION: 'inAppNotifyMentions',
  NEW_POST: 'inAppNotifyNewPosts',
  MESSAGE_REQUEST: 'inAppNotifyMessages'
};

/**
 * Check whether a user's in-app preferences allow a notification type.
 * @param type - Notification type
 * @param preferences - User's notificationPreferences JSON
 * @returns True when the notification should be created
 */
export function isInAppNotificationEnabled(
  type: NotificationType,
  preferences?: Record<string, any> | null
): boolean {
  const key = IN_APP_PREFERENCE_BY_TYPE[type];
  if (!key) return true;
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(preferences || {}) };
  return prefs[key] !== false;
}

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notification]
 *     summary: Get user's notifications with pagination
 *     description: Retrieves notifications for the authenticated user with optional filtering and pagination
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of notifications to skip for pagination
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: If 'true', returns only unread notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Notification unique identifier
 *                       type:
 *                         type: string
 *                         enum: [LIKE, COMMENT, FOLLOW, MENTION, FRIEND_REQUEST, FRIEND_ACCEPTED, REACTION]
 *                         description: Type of notification
 *                       message:
 *                         type: string
 *                         description: Human-readable notification message
 *                       read:
 *                         type: boolean
 *                         description: Whether notification has been read
 *                       senderId:
 *                         type: string
 *                         nullable: true
 *                         description: ID of user who triggered notification (null for system notifications)
 *                       sender:
 *                         type: object
 *                         nullable: true
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
 *                           verified:
 *                             type: boolean
 *                       postId:
 *                         type: string
 *                         nullable: true
 *                         description: Associated post ID if applicable
 *                       commentId:
 *                         type: string
 *                         nullable: true
 *                         description: Associated comment ID if applicable
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Notification creation timestamp
 *                 unreadCount:
 *                   type: integer
 *                   description: Total count of unread notifications for user
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                       description: Number of notifications returned in this response
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// Get user's notifications
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { unreadOnly } = req.query;
    const { limit: limitNum, offset: offsetNum } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

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
    logger.error({ error, userId: req.user?.id }, 'Get notifications error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notification]
 *     summary: Get unread notification count
 *     description: Lightweight endpoint for badge refresh (focus/polling fallback).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', requireAuth, async (req: AuthRequest, res) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: { receiverId: req.user!.id, read: false }
    });
    res.json({ unreadCount });
  } catch (error) {
    logger.error({ error, userId: req.user!.id }, 'Get unread notification count error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   put:
 *     tags: [Notification]
 *     summary: Mark a single notification as read
 *     description: Marks a specific notification as read for the authenticated user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification unique identifier
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *       404:
 *         description: Notification not found or does not belong to user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Notification not found
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
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

    const unreadCount = await prisma.notification.count({
      where: { receiverId: userId, read: false }
    });

    res.json({ message: 'Notification marked as read', unreadCount });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, notificationId: req.params.notificationId }, 'Mark notification read error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/mark-read-batch:
 *   put:
 *     tags: [Notification]
 *     summary: Mark multiple notifications as read in batch (optimized)
 *     description: Efficiently marks multiple notifications as read in a single database operation. Replaces N individual API calls with one batched operation.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of notification IDs to mark as read
 *                 example: ["notif_123", "notif_456", "notif_789"]
 *     responses:
 *       200:
 *         description: Notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 3 notifications marked as read
 *                 updatedCount:
 *                   type: integer
 *                   description: Number of notifications successfully updated
 *                 requestedCount:
 *                   type: integer
 *                   description: Number of notification IDs requested
 *                 optimized:
 *                   type: boolean
 *                   description: Flag indicating this is the batched endpoint
 *                   example: true
 *       400:
 *         description: Validation error - invalid or empty notificationIds array
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: notificationIds array is required
 *       404:
 *         description: No valid notifications found belonging to user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No valid notifications found
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
// 🎯 OPTIMIZED: Mark multiple notifications as read in batch (replaces N individual calls)
router.put('/mark-read-batch', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'notificationIds array is required' });
    }

    // Verify all notifications belong to the current user
    const userNotifications = await prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
        receiverId: userId
      },
      select: { id: true }
    });

    const validIds = userNotifications.map(n => n.id);
    
    if (validIds.length === 0) {
      return res.status(404).json({ error: 'No valid notifications found' });
    }

    // Batch update all valid notifications
    const updateResult = await prisma.notification.updateMany({
      where: {
        id: { in: validIds },
        receiverId: userId
      },
      data: { read: true }
    });

    const unreadCount = await prisma.notification.count({
      where: { receiverId: userId, read: false }
    });

    res.json({ 
      message: `${updateResult.count} notifications marked as read`,
      updatedCount: updateResult.count,
      requestedCount: notificationIds.length,
      unreadCount,
      optimized: true // Flag to indicate this is the batched endpoint
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, notificationCount: req.body.notificationIds?.length }, 'Batch mark notifications read error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notification]
 *     summary: Mark all unread notifications as read
 *     description: Marks all unread notifications for the authenticated user as read in a single operation
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All notifications marked as read
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
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

    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Mark all notifications read error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Creates a new notification and emits it via WebSocket for real-time delivery
 *
 * This helper function is used across the application to create notifications
 * for various user actions (likes, comments, follows, etc.). It creates the
 * notification in the database and simultaneously emits it via WebSocket for
 * instant delivery to online users.
 *
 * @param type - Type of notification (LIKE, COMMENT, FOLLOW, MENTION, FRIEND_REQUEST, FRIEND_ACCEPTED, REACTION)
 * @param senderId - ID of user who triggered the notification (null for system notifications)
 * @param receiverId - ID of user who will receive the notification
 * @param message - Human-readable notification message
 * @param postId - Optional ID of associated post
 * @param commentId - Optional ID of associated comment
 * @returns Promise<Notification | undefined> The created notification object or undefined on error
 *
 * @example
 * // Create a like notification
 * await createNotification(
 *   'LIKE',
 *   'user_123',
 *   'user_456',
 *   'John Doe liked your post',
 *   'post_789'
 * );
 *
 * @example
 * // Create a follow notification
 * await createNotification(
 *   'FOLLOW',
 *   'user_123',
 *   'user_456',
 *   'John Doe started following you'
 * );
 */
// Helper function to create notifications (we'll use this in other routes)
export const createNotification = async (
  type: NotificationType,
  senderId: string | null,
  receiverId: string,
  message: string,
  postId?: string,
  commentId?: string,
  receiverPreferences?: Record<string, any> | null
) => {
  try {
    let preferences = receiverPreferences;
    if (preferences === undefined) {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { notificationPreferences: true }
      });
      preferences = (receiver?.notificationPreferences as Record<string, any> | null) || null;
    }

    if (!isInAppNotificationEnabled(type, preferences)) {
      return null;
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        type,
        senderId,
        receiverId,
        message,
        postId,
        commentId
      },
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
      }
    });

    // Emit real-time notification via WebSocket
    const wsService = await getWebSocketService();
    if (wsService) {
      wsService.emitNotification(receiverId, {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        sender: notification.sender,
        createdAt: notification.createdAt,
        read: false,
        postId: notification.postId,
        commentId: notification.commentId
      });
    }

    return notification;
  } catch (error) {
    logger.error({ error, type, senderId, receiverId }, 'Create notification error');
  }
};

export default router;