"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = void 0;
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
// Import webSocketService for real-time notifications
let webSocketService = null;
const getWebSocketService = async () => {
    if (!webSocketService) {
        try {
            const serverModule = await Promise.resolve().then(() => __importStar(require('../server')));
            webSocketService = serverModule.webSocketService;
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'WebSocket service not available');
        }
    }
    return webSocketService;
};
// Using singleton prisma from lib/prisma.ts
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
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0, unreadOnly } = req.query;
        const limitNum = parseInt(limit.toString());
        const offsetNum = parseInt(offset.toString());
        const whereClause = { receiverId: userId };
        if (unreadOnly === 'true') {
            whereClause.read = false;
        }
        const notifications = await prisma_1.prisma.notification.findMany({
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
        const unreadCount = await prisma_1.prisma.notification.count({
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
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get notifications error');
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
router.put('/:notificationId/read', auth_1.requireAuth, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;
        const notification = await prisma_1.prisma.notification.findFirst({
            where: {
                id: notificationId,
                receiverId: userId
            }
        });
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: { read: true }
        });
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, notificationId: req.params.notificationId }, 'Mark notification read error');
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
router.put('/mark-read-batch', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationIds } = req.body;
        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({ error: 'notificationIds array is required' });
        }
        // Verify all notifications belong to the current user
        const userNotifications = await prisma_1.prisma.notification.findMany({
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
        const updateResult = await prisma_1.prisma.notification.updateMany({
            where: {
                id: { in: validIds },
                receiverId: userId
            },
            data: { read: true }
        });
        res.json({
            message: `${updateResult.count} notifications marked as read`,
            updatedCount: updateResult.count,
            requestedCount: notificationIds.length,
            optimized: true // Flag to indicate this is the batched endpoint
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, notificationCount: req.body.notificationIds?.length }, 'Batch mark notifications read error');
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
router.put('/read-all', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        await prisma_1.prisma.notification.updateMany({
            where: {
                receiverId: userId,
                read: false
            },
            data: { read: true }
        });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Mark all notifications read error');
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
const createNotification = async (type, senderId, receiverId, message, postId, commentId) => {
    try {
        // Create notification in database
        const notification = await prisma_1.prisma.notification.create({
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
    }
    catch (error) {
        logger_1.logger.error({ error, type, senderId, receiverId }, 'Create notification error');
    }
};
exports.createNotification = createNotification;
exports.default = router;
//# sourceMappingURL=notifications.js.map