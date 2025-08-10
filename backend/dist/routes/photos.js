"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const photoService_1 = require("../services/photoService");
const client_1 = require("@prisma/client");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
// Rate limiting for photo uploads
const uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 uploads per 15 minutes
    message: {
        error: 'Too many upload attempts',
        message: 'Please wait before uploading more photos'
    }
});
// Configure multer
const upload = photoService_1.PhotoService.getMulterConfig();
/**
 * @swagger
 * /api/photos/upload:
 *   post:
 *     tags: [Photos]
 *     summary: Upload photo(s)
 *     description: Upload one or more photos with automatic resizing and optimization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Photo files to upload
 *               photoType:
 *                 type: string
 *                 enum: [AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY]
 *                 description: Type of photo being uploaded
 *               purpose:
 *                 type: string
 *                 enum: [PERSONAL, CAMPAIGN, BOTH]
 *                 default: PERSONAL
 *                 description: How the photo will be used
 *               candidateId:
 *                 type: string
 *                 description: Candidate ID if uploading campaign photos
 *     responses:
 *       201:
 *         description: Photos uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 photos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                       thumbnailUrl:
 *                         type: string
 *                       width:
 *                         type: integer
 *                       height:
 *                         type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: File too large
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/upload', uploadLimiter, auth_1.requireAuth, upload.array('photos', 5), async (req, res) => {
    try {
        const { user } = req;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                error: 'No files provided',
                message: 'Please select at least one photo to upload'
            });
        }
        const { photoType, purpose = 'PERSONAL', candidateId } = req.body;
        if (!photoType || !Object.values(client_1.PhotoType).includes(photoType)) {
            return res.status(400).json({
                error: 'Invalid photo type',
                message: 'Photo type must be one of: AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY'
            });
        }
        if (!Object.values(client_1.PhotoPurpose).includes(purpose)) {
            return res.status(400).json({
                error: 'Invalid purpose',
                message: 'Purpose must be one of: PERSONAL, CAMPAIGN, BOTH'
            });
        }
        // Validate candidate relationship for campaign photos
        if ((purpose === 'CAMPAIGN' || purpose === 'BOTH' || photoType === 'CAMPAIGN') && !candidateId) {
            return res.status(400).json({
                error: 'Candidate ID required',
                message: 'Candidate ID is required for campaign photos'
            });
        }
        console.log(`📸 Processing ${files.length} photo(s) for user ${user.username}`);
        const uploadOptions = {
            userId: user.id,
            photoType: photoType,
            purpose: purpose,
            candidateId: candidateId || undefined
        };
        const results = await photoService_1.PhotoService.uploadMultiplePhotos(files, uploadOptions);
        res.status(201).json({
            message: `Successfully uploaded ${results.length} photo(s)`,
            photos: results,
            pendingModeration: photoType === 'CAMPAIGN' || photoType === 'VERIFICATION'
        });
    }
    catch (error) {
        console.error('Photo upload error:', error);
        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({
                error: 'Invalid file type',
                message: 'Only JPEG, PNG, and WebP files are allowed'
            });
        }
        if (error.message.includes('File too large')) {
            return res.status(413).json({
                error: 'File too large',
                message: 'Photos must be smaller than 10MB'
            });
        }
        res.status(500).json({
            error: 'Upload failed',
            message: 'Failed to upload photos. Please try again.'
        });
    }
});
/**
 * @swagger
 * /api/photos/my:
 *   get:
 *     tags: [Photos]
 *     summary: Get my photos
 *     description: Retrieve the authenticated user's photos with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: photoType
 *         schema:
 *           type: string
 *           enum: [AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY]
 *         description: Filter by photo type
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *           enum: [PERSONAL, CAMPAIGN, BOTH]
 *         description: Filter by photo purpose
 *       - in: query
 *         name: candidateId
 *         schema:
 *           type: string
 *         description: Filter by candidate (for campaign photos)
 *     responses:
 *       200:
 *         description: User photos retrieved successfully
 */
router.get('/my', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = req;
        const { photoType, purpose, candidateId } = req.query;
        const photos = await photoService_1.PhotoService.getUserPhotos(user.id, photoType, purpose, candidateId);
        res.json({
            photos,
            count: photos.length
        });
    }
    catch (error) {
        console.error('Failed to retrieve user photos:', error);
        res.status(500).json({ error: 'Failed to retrieve photos' });
    }
});
/**
 * @swagger
 * /api/photos/candidate/{candidateId}:
 *   get:
 *     tags: [Photos]
 *     summary: Get candidate photos
 *     description: Retrieve campaign photos for a specific candidate
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Candidate photos retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/candidate/:candidateId', async (req, res) => {
    try {
        const { candidateId } = req.params;
        const photos = await photoService_1.PhotoService.getCandidatePhotos(candidateId);
        res.json({
            photos,
            count: photos.length
        });
    }
    catch (error) {
        console.error('Failed to retrieve candidate photos:', error);
        res.status(500).json({ error: 'Failed to retrieve candidate photos' });
    }
});
/**
 * @swagger
 * /api/photos/{photoId}/purpose:
 *   put:
 *     tags: [Photos]
 *     summary: Update photo purpose
 *     description: Change how a photo is used (personal vs campaign)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               purpose:
 *                 type: string
 *                 enum: [PERSONAL, CAMPAIGN, BOTH]
 *               candidateId:
 *                 type: string
 *                 description: Required if setting purpose to CAMPAIGN or BOTH
 *     responses:
 *       200:
 *         description: Photo purpose updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:photoId/purpose', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = req;
        const { photoId } = req.params;
        const { purpose, candidateId } = req.body;
        if (!purpose || !Object.values(client_1.PhotoPurpose).includes(purpose)) {
            return res.status(400).json({
                error: 'Invalid purpose',
                message: 'Purpose must be one of: PERSONAL, CAMPAIGN, BOTH'
            });
        }
        await photoService_1.PhotoService.setPhotoPurpose(photoId, user.id, purpose, candidateId);
        res.json({
            message: 'Photo purpose updated successfully'
        });
    }
    catch (error) {
        console.error('Failed to update photo purpose:', error);
        if (error.message.includes('not found') || error.message.includes('permission denied')) {
            return res.status(404).json({
                error: 'Photo not found',
                message: 'Photo not found or you do not have permission to modify it'
            });
        }
        res.status(500).json({ error: 'Failed to update photo purpose' });
    }
});
/**
 * @swagger
 * /api/photos/{photoId}:
 *   delete:
 *     tags: [Photos]
 *     summary: Delete photo
 *     description: Delete a photo (marks as inactive)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID
 *     responses:
 *       204:
 *         description: Photo deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:photoId', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = req;
        const { photoId } = req.params;
        await photoService_1.PhotoService.deletePhoto(photoId, user.id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Failed to delete photo:', error);
        if (error.message.includes('not found') || error.message.includes('Permission denied')) {
            return res.status(404).json({
                error: 'Photo not found',
                message: 'Photo not found or you do not have permission to delete it'
            });
        }
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});
/**
 * @swagger
 * /api/photos/{photoId}/flag:
 *   post:
 *     tags: [Photos]
 *     summary: Flag photo for moderation
 *     description: Report a photo for violating community guidelines
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for flagging the photo
 *             required:
 *               - reason
 *     responses:
 *       200:
 *         description: Photo flagged successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/:photoId/flag', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = req;
        const { photoId } = req.params;
        const { reason } = req.body;
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                error: 'Reason required',
                message: 'Please provide a reason for flagging this photo'
            });
        }
        await photoService_1.PhotoService.flagPhoto(photoId, user.id, reason.trim());
        res.json({
            message: 'Photo flagged for moderation review'
        });
    }
    catch (error) {
        console.error('Failed to flag photo:', error);
        res.status(500).json({ error: 'Failed to flag photo' });
    }
});
// Admin/Moderator routes
/**
 * @swagger
 * /api/photos/moderation/pending:
 *   get:
 *     tags: [Photos]
 *     summary: Get photos pending moderation (Moderator only)
 *     description: Retrieve photos that need moderator approval
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending photos retrieved successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/moderation/pending', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = req;
        if (!user.isModerator && !user.isAdmin) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Moderator access required'
            });
        }
        const photos = await photoService_1.PhotoService.getPendingModeration();
        res.json({
            photos,
            count: photos.length
        });
    }
    catch (error) {
        console.error('Failed to retrieve pending photos:', error);
        res.status(500).json({ error: 'Failed to retrieve pending photos' });
    }
});
/**
 * @swagger
 * /api/photos/{photoId}/approve:
 *   post:
 *     tags: [Photos]
 *     summary: Approve photo (Moderator only)
 *     description: Approve a flagged or pending photo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo approved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/:photoId/approve', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = req;
        const { photoId } = req.params;
        if (!user.isModerator && !user.isAdmin) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Moderator access required'
            });
        }
        await photoService_1.PhotoService.approvePhoto(photoId, user.id);
        res.json({
            message: 'Photo approved successfully'
        });
    }
    catch (error) {
        console.error('Failed to approve photo:', error);
        res.status(500).json({ error: 'Failed to approve photo' });
    }
});
/**
 * @swagger
 * /api/photos/stats:
 *   get:
 *     tags: [Photos]
 *     summary: Get photo storage statistics (Admin only)
 *     description: Retrieve photo storage and usage statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photo statistics retrieved successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = req;
        if (!user.isAdmin) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }
        const stats = await photoService_1.PhotoService.getStorageStats();
        res.json({
            message: 'Photo statistics retrieved successfully',
            ...stats
        });
    }
    catch (error) {
        console.error('Failed to retrieve photo stats:', error);
        res.status(500).json({ error: 'Failed to retrieve photo statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=photos.js.map