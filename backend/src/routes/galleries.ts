import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/photos/galleries - List user's galleries
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const photos = await prisma.photo.findMany({
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
router.put('/:photoId/gallery', requireAuth, async (req: AuthRequest, res: Response) => {
    const { photoId } = req.params;
    const { gallery } = req.body;
    const userId = req.user!.id;

    const photo = await prisma.photo.updateMany({
        where: {
            id: photoId,
            userId // Verify ownership
        },
        data: { gallery }
    });

    return res.json({ success: true, photo });
});

// DELETE /api/photos/:photoId - Soft delete photo
router.delete('/:photoId', requireAuth, async (req: AuthRequest, res: Response) => {
    const { photoId } = req.params;
    const userId = req.user!.id;

    await prisma.photo.updateMany({
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
router.post('/:photoId/set-profile', requireAuth, async (req: AuthRequest, res: Response) => {
    const { photoId } = req.params;
    const userId = req.user!.id;

    const photo = await prisma.photo.findFirst({
        where: {
            id: photoId,
            userId
        }
    });

    if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
    }

    await prisma.user.update({
        where: { id: userId },
        data: { avatar: photo.url }
    });

    return res.json({ success: true, avatarUrl: photo.url });
});

export default router;
