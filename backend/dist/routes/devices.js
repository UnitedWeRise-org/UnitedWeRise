"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../services/logger");
const router = (0, express_1.Router)();
/**
 * @swagger
 * components:
 *   schemas:
 *     DeviceToken:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the device token
 *         userId:
 *           type: string
 *           description: User ID this token belongs to
 *         platform:
 *           type: string
 *           enum: [ios, android]
 *           description: Device platform
 *         deviceName:
 *           type: string
 *           nullable: true
 *           description: Optional device name for display
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /api/devices/register:
 *   post:
 *     tags: [Devices]
 *     summary: Register a device token for push notifications
 *     description: |
 *       Registers an APNs (iOS) or FCM (Android) device token for push notification delivery.
 *       If the token already exists for another user, it will be reassigned to the current user.
 *       If the token already exists for the current user, it will be updated.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceToken
 *               - platform
 *             properties:
 *               deviceToken:
 *                 type: string
 *                 description: The push notification token (APNs for iOS, FCM for Android)
 *                 example: "a1b2c3d4e5f6..."
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *                 description: Device platform
 *                 example: "ios"
 *               deviceName:
 *                 type: string
 *                 description: Optional device name for user-facing display
 *                 example: "iPhone 15 Pro"
 *               appVersion:
 *                 type: string
 *                 description: Optional app version for debugging
 *                 example: "1.0.0"
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Device token registered successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DeviceToken'
 *       400:
 *         description: Invalid request - missing or invalid parameters
 *       401:
 *         description: Unauthorized - user not authenticated
 */
router.post('/register', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { deviceToken, platform, deviceName, appVersion } = req.body;
        // Validate required fields
        if (!deviceToken || typeof deviceToken !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Device token is required and must be a string'
            });
        }
        if (!platform || !['ios', 'android'].includes(platform)) {
            return res.status(400).json({
                success: false,
                error: 'Platform is required and must be "ios" or "android"'
            });
        }
        // Validate token format (basic check)
        if (deviceToken.length < 32) {
            return res.status(400).json({
                success: false,
                error: 'Invalid device token format'
            });
        }
        // Upsert the device token
        // If token exists for another user, it gets reassigned (user switched accounts)
        // If token exists for same user, it gets updated
        const device = await prisma_1.prisma.deviceToken.upsert({
            where: { deviceToken },
            create: {
                userId,
                deviceToken,
                platform,
                deviceName: deviceName || null,
                appVersion: appVersion || null
            },
            update: {
                userId, // Reassign if needed
                platform,
                deviceName: deviceName || null,
                appVersion: appVersion || null
            }
        });
        logger_1.logger.info({
            userId,
            platform,
            deviceId: device.id
        }, 'Device token registered for push notifications');
        res.json({
            success: true,
            message: 'Device token registered successfully',
            data: {
                id: device.id,
                platform: device.platform,
                deviceName: device.deviceName,
                createdAt: device.createdAt,
                updatedAt: device.updatedAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to register device token');
        res.status(500).json({
            success: false,
            error: 'Failed to register device token'
        });
    }
});
/**
 * @swagger
 * /api/devices/{deviceToken}:
 *   delete:
 *     tags: [Devices]
 *     summary: Unregister a device token
 *     description: |
 *       Removes a device token from the system. Called during logout to stop
 *       receiving push notifications on that device.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceToken
 *         required: true
 *         schema:
 *           type: string
 *         description: The device token to unregister
 *     responses:
 *       200:
 *         description: Device token unregistered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Device token unregistered successfully"
 *       404:
 *         description: Device token not found
 *       401:
 *         description: Unauthorized - user not authenticated
 */
router.delete('/:deviceToken', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { deviceToken } = req.params;
        // Find the device token
        const device = await prisma_1.prisma.deviceToken.findUnique({
            where: { deviceToken }
        });
        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device token not found'
            });
        }
        // Only allow deletion if the token belongs to the current user
        if (device.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this device token'
            });
        }
        // Delete the device token
        await prisma_1.prisma.deviceToken.delete({
            where: { deviceToken }
        });
        logger_1.logger.info({
            userId,
            deviceId: device.id
        }, 'Device token unregistered');
        res.json({
            success: true,
            message: 'Device token unregistered successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to unregister device token');
        res.status(500).json({
            success: false,
            error: 'Failed to unregister device token'
        });
    }
});
/**
 * @swagger
 * /api/devices:
 *   get:
 *     tags: [Devices]
 *     summary: Get all registered devices for the current user
 *     description: Returns a list of all devices registered for push notifications
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of registered devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       platform:
 *                         type: string
 *                       deviceName:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - user not authenticated
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const devices = await prisma_1.prisma.deviceToken.findMany({
            where: { userId },
            select: {
                id: true,
                platform: true,
                deviceName: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({
            success: true,
            data: devices
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get device tokens');
        res.status(500).json({
            success: false,
            error: 'Failed to get device tokens'
        });
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map