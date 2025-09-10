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
            console.warn('WebSocket service not available:', error);
        }
    }
    return webSocketService;
};
// Using singleton prisma from lib/prisma.ts
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
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        console.error('Batch mark notifications read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        console.error('Create notification error:', error);
    }
};
exports.createNotification = createNotification;
exports.default = router;
//# sourceMappingURL=notifications.js.map