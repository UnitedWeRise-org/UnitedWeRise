import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../services/logger';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PublicKey:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the public key record
 *         deviceId:
 *           type: string
 *           description: Device identifier (stable UUID per app install)
 *         publicKey:
 *           type: string
 *           description: Base64-encoded Curve25519 public key
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the key was first registered
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the key was last updated
 */

/**
 * @swagger
 * /api/keys/upload:
 *   post:
 *     summary: Upload a public key for E2EE messaging
 *     description: |
 *       Uploads a Curve25519 public key for end-to-end encrypted messaging.
 *       Each device has one key; uploading again from the same device updates it.
 *     tags: [Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deviceId, publicKey]
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Stable device UUID
 *               publicKey:
 *                 type: string
 *                 description: Base64-encoded Curve25519 public key
 *     responses:
 *       200:
 *         description: Public key uploaded successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Authentication required
 */
router.post('/upload', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { deviceId, publicKey } = req.body;

    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    if (!publicKey || typeof publicKey !== 'string' || publicKey.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'publicKey is required' });
    }

    // Validate base64 format (Curve25519 public key = 32 bytes = 44 base64 chars)
    if (publicKey.length < 40 || publicKey.length > 100) {
      return res.status(400).json({ success: false, error: 'Invalid public key format' });
    }

    const key = await prisma.publicKey.upsert({
      where: { userId_deviceId: { userId, deviceId: deviceId.trim() } },
      update: { publicKey: publicKey.trim() },
      create: {
        userId,
        deviceId: deviceId.trim(),
        publicKey: publicKey.trim()
      },
      select: { id: true, deviceId: true, createdAt: true, updatedAt: true }
    });

    logger.info({ userId, deviceId: key.deviceId }, 'Public key uploaded');

    res.json({ success: true, data: key });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error uploading public key');
    res.status(500).json({ success: false, error: 'Failed to upload public key' });
  }
});

/**
 * @swagger
 * /api/keys/{userId}:
 *   get:
 *     summary: Get public keys for a user
 *     description: |
 *       Returns all public keys for a user (one per device).
 *       Used by the sender to encrypt messages for the recipient.
 *     tags: [Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to fetch keys for
 *     responses:
 *       200:
 *         description: Public keys retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const keys = await prisma.publicKey.findMany({
      where: { userId },
      select: { id: true, deviceId: true, publicKey: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: keys });
  } catch (error) {
    logger.error({ error, targetUserId: req.params.userId }, 'Error fetching public keys');
    res.status(500).json({ success: false, error: 'Failed to fetch public keys' });
  }
});

/**
 * @swagger
 * /api/keys/{deviceId}:
 *   delete:
 *     summary: Remove a public key
 *     description: |
 *       Removes a public key for a specific device.
 *       Only the key owner can delete their own keys.
 *     tags: [Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The device ID to remove the key for
 *     responses:
 *       200:
 *         description: Public key removed successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Public key not found for this device
 */
router.delete('/:deviceId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { deviceId } = req.params;

    const existing = await prisma.publicKey.findUnique({
      where: { userId_deviceId: { userId, deviceId } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Public key not found for this device' });
    }

    await prisma.publicKey.delete({
      where: { userId_deviceId: { userId, deviceId } }
    });

    logger.info({ userId, deviceId }, 'Public key removed');

    res.json({ success: true, message: 'Public key removed successfully' });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, deviceId: req.params.deviceId }, 'Error removing public key');
    res.status(500).json({ success: false, error: 'Failed to remove public key' });
  }
});

export default router;
