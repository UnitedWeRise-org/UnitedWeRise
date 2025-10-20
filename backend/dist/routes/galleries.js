"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = require("../lib/prisma.js");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/photos/galleries:
 *   get:
 *     tags: [Gallery]
 *     summary: List user's photo galleries
 *     description: |
 *       Retrieves all active photos organized by gallery name.
 *       Photos with photoType POST_MEDIA are excluded.
 *       Returns galleries with photo counts and complete photo details.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Galleries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 galleries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Gallery name (defaults to "My Photos" if null)
 *                       photos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           description: Complete photo object from Photo model
 *                       count:
 *                         type: integer
 *                         description: Number of photos in gallery
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error retrieving galleries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Failed to retrieve galleries
 */
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const photos = await prisma_js_1.prisma.photo.findMany({
            where: {
                userId,
                isActive: true,
                photoType: { not: 'POST_MEDIA' }
            },
            orderBy: { uploadedAt: 'desc' }
        });
        // Group by gallery
        const galleryMap = new Map();
        photos.forEach(photo => {
            const galleryName = photo.gallery || 'My Photos';
            if (!galleryMap.has(galleryName)) {
                galleryMap.set(galleryName, []);
            }
            galleryMap.get(galleryName).push(photo);
        });
        const galleries = Array.from(galleryMap.entries()).map(([name, photos]) => ({
            name,
            photos,
            count: photos.length
        }));
        return res.json({ success: true, galleries });
    }
    catch (error) {
        console.error('[GET /api/photos/galleries] error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve galleries' });
    }
});
/**
 * @swagger
 * /api/photos/{photoId}/gallery:
 *   put:
 *     tags: [Gallery]
 *     summary: Move photo to gallery
 *     description: |
 *       Updates the gallery assignment for a photo.
 *       User must own the photo (ownership verified).
 *       Gallery name can be set or changed to organize photos.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique photo identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gallery
 *             properties:
 *               gallery:
 *                 type: string
 *                 description: Gallery name to assign photo to (can be new or existing)
 *                 example: "Vacation 2025"
 *     responses:
 *       200:
 *         description: Photo moved to gallery successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 photo:
 *                   type: object
 *                   description: Update result from Prisma updateMany
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - user does not own this photo
 *       404:
 *         description: Photo not found or already deleted
 *       500:
 *         description: Internal server error moving photo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Failed to move photo to gallery
 */
router.put('/:photoId/gallery', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { photoId } = req.params;
        const { gallery } = req.body;
        const userId = req.user.id;
        const photo = await prisma_js_1.prisma.photo.updateMany({
            where: {
                id: photoId,
                userId // Verify ownership
            },
            data: { gallery }
        });
        return res.json({ success: true, photo });
    }
    catch (error) {
        console.error('[PUT /api/photos/:photoId/gallery] error:', error);
        res.status(500).json({ success: false, error: 'Failed to move photo to gallery' });
    }
});
/**
 * @swagger
 * /api/photos/{photoId}:
 *   delete:
 *     tags: [Gallery]
 *     summary: Soft delete photo
 *     description: |
 *       Marks photo as inactive (soft delete) rather than permanently removing it.
 *       Sets isActive to false and records deletion timestamp.
 *       User must own the photo (ownership verified).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique photo identifier
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - user does not own this photo
 *       404:
 *         description: Photo not found
 *       500:
 *         description: Internal server error deleting photo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Failed to delete photo
 */
router.delete('/:photoId', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { photoId } = req.params;
        const userId = req.user.id;
        await prisma_js_1.prisma.photo.updateMany({
            where: {
                id: photoId,
                userId
            },
            data: {
                isActive: false,
                deletedAt: new Date()
            }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('[DELETE /api/photos/:photoId] error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete photo' });
    }
});
/**
 * @swagger
 * /api/photos/{photoId}/set-profile:
 *   post:
 *     tags: [Gallery]
 *     summary: Set photo as user's avatar
 *     description: |
 *       Updates user's profile avatar to use the selected photo's URL.
 *       User must own the photo (ownership verified).
 *       Photo URL is copied to user.avatar field.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique photo identifier
 *     responses:
 *       200:
 *         description: Profile photo set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 avatarUrl:
 *                   type: string
 *                   description: URL of the newly set avatar image
 *                   example: "https://uwrstorage2425.blob.core.windows.net/photos/user_123_abc.webp"
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - user does not own this photo
 *       404:
 *         description: Photo not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Photo not found
 *       500:
 *         description: Internal server error setting profile photo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Failed to set profile photo
 */
router.post('/:photoId/set-profile', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { photoId } = req.params;
        const userId = req.user.id;
        const photo = await prisma_js_1.prisma.photo.findFirst({
            where: {
                id: photoId,
                userId
            }
        });
        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: { avatar: photo.url }
        });
        return res.json({ success: true, avatarUrl: photo.url });
    }
    catch (error) {
        console.error('[POST /api/photos/:photoId/set-profile] error:', error);
        res.status(500).json({ success: false, error: 'Failed to set profile photo' });
    }
});
exports.default = router;
//# sourceMappingURL=galleries.js.map