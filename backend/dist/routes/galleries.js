"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = require("../lib/prisma.js");
const router = (0, express_1.Router)();
// GET /api/photos/galleries - List user's galleries
router.get('/', auth_js_1.requireAuth, async (req, res) => {
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
});
// PUT /api/photos/:photoId/gallery - Move photo to gallery
router.put('/:photoId/gallery', auth_js_1.requireAuth, async (req, res) => {
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
});
// DELETE /api/photos/:photoId - Soft delete photo
router.delete('/:photoId', auth_js_1.requireAuth, async (req, res) => {
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
});
// POST /api/photos/:photoId/set-profile - Set as avatar
router.post('/:photoId/set-profile', auth_js_1.requireAuth, async (req, res) => {
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
});
exports.default = router;
//# sourceMappingURL=galleries.js.map