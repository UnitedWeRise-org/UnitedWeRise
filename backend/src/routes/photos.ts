import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PhotoService } from '../services/photoService';
import { SASTokenService } from '../services/sasTokenService';
import { PhotoType, PhotoPurpose } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for photo uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per 15 minutes (increased for testing/debugging)
  message: {
    error: 'Too many upload attempts',
    message: 'Please wait before uploading more photos'
  }
});

/**
 * @swagger
 * /api/photos/upload/sas-token:
 *   post:
 *     tags: [Photos]
 *     summary: Generate SAS token for direct-to-blob upload
 *     description: Get a time-limited SAS token to upload photos directly to Azure Blob Storage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - photoType
 *               - filename
 *               - mimeType
 *               - fileSize
 *             properties:
 *               photoType:
 *                 type: string
 *                 enum: [AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA]
 *                 description: Type of photo being uploaded
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               mimeType:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp, image/gif]
 *                 description: MIME type of the file
 *               fileSize:
 *                 type: integer
 *                 description: File size in bytes (max 10MB)
 *               purpose:
 *                 type: string
 *                 enum: [PERSONAL, CAMPAIGN, BOTH]
 *                 default: PERSONAL
 *                 description: How the photo will be used
 *               candidateId:
 *                 type: string
 *                 description: Candidate ID if uploading campaign photos
 *     responses:
 *       200:
 *         description: SAS token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sasUrl:
 *                   type: string
 *                   description: Full URL with SAS token for upload
 *                 blobName:
 *                   type: string
 *                   description: Blob name to reference in confirmation
 *                 uploadId:
 *                   type: string
 *                   description: Unique upload identifier
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Token expiration time (15 minutes)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: File too large
 */
router.post('/upload/sas-token', uploadLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoType, filename, mimeType, fileSize, purpose, candidateId } = req.body;

    // Validate required fields
    if (!photoType || !filename || !mimeType || !fileSize) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'photoType, filename, mimeType, and fileSize are required'
      });
    }

    // Validate photo type
    if (!Object.values(PhotoType).includes(photoType)) {
      return res.status(400).json({
        error: 'Invalid photo type',
        message: 'Photo type must be one of: AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA'
      });
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only JPEG, PNG, WebP, and GIF files are allowed'
      });
    }

    // Validate file size
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(413).json({
        error: 'File too large',
        message: 'Photos must be smaller than 10MB'
      });
    }

    // Special GIF size limit
    if (mimeType === 'image/gif' && fileSize > 5 * 1024 * 1024) {
      return res.status(413).json({
        error: 'GIF too large',
        message: 'GIF files must be smaller than 5MB'
      });
    }

    // Validate candidate relationship for campaign photos
    if ((purpose === 'CAMPAIGN' || purpose === 'BOTH' || photoType === 'CAMPAIGN') && !candidateId) {
      return res.status(400).json({
        error: 'Candidate ID required',
        message: 'Candidate ID is required for campaign photos'
      });
    }

    // Check storage limit before generating token
    await PhotoService.validateStorageLimit(user!.id, fileSize);

    // Generate SAS token
    const tokenData = await SASTokenService.generateUploadToken({
      userId: user!.id,
      photoType: photoType as PhotoType,
      filename,
      mimeType,
      fileSize
    });

    console.log(`🔐 SAS token issued for user ${user!.username}: ${tokenData.uploadId}`);

    res.json({
      sasUrl: tokenData.sasUrl,
      blobName: tokenData.blobName,
      uploadId: tokenData.uploadId,
      expiresAt: tokenData.expiresAt
    });

  } catch (error: any) {
    console.error('SAS token generation failed:', error);

    if (error.message.includes('Storage limit exceeded')) {
      return res.status(413).json({
        error: 'Storage limit exceeded',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Token generation failed',
      message: 'Failed to generate upload token. Please try again.'
    });
  }
});

/**
 * @swagger
 * /api/photos/upload/confirm:
 *   post:
 *     tags: [Photos]
 *     summary: Confirm direct blob upload and create database record
 *     description: Verify blob upload completed successfully and create photo record
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blobName
 *               - uploadId
 *               - photoType
 *             properties:
 *               blobName:
 *                 type: string
 *                 description: Blob name from SAS token response
 *               uploadId:
 *                 type: string
 *                 description: Upload ID from SAS token response
 *               photoType:
 *                 type: string
 *                 enum: [AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA]
 *               purpose:
 *                 type: string
 *                 enum: [PERSONAL, CAMPAIGN, BOTH]
 *                 default: PERSONAL
 *               candidateId:
 *                 type: string
 *                 description: Candidate ID if campaign photo
 *               gallery:
 *                 type: string
 *                 description: Gallery name for organization
 *               caption:
 *                 type: string
 *                 description: Photo caption (max 200 chars)
 *     responses:
 *       201:
 *         description: Photo confirmed and record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 photo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     url:
 *                       type: string
 *                     thumbnailUrl:
 *                       type: string
 *                     width:
 *                       type: integer
 *                     height:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Blob not found or upload incomplete
 */
router.post('/upload/confirm', uploadLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { blobName, uploadId, photoType, purpose = 'PERSONAL', candidateId, gallery, caption } = req.body;

    // Validate required fields
    if (!blobName || !uploadId || !photoType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'blobName, uploadId, and photoType are required'
      });
    }

    // Validate photo type
    if (!Object.values(PhotoType).includes(photoType)) {
      return res.status(400).json({
        error: 'Invalid photo type',
        message: 'Photo type must be one of: AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA'
      });
    }

    // Validate purpose
    if (!Object.values(PhotoPurpose).includes(purpose)) {
      return res.status(400).json({
        error: 'Invalid purpose',
        message: 'Purpose must be one of: PERSONAL, CAMPAIGN, BOTH'
      });
    }

    console.log(`📸 Confirming upload for user ${user!.username}: ${uploadId}`);

    // Get blob metadata (size, contentType, URL)
    const blobMetadata = await SASTokenService.getBlobMetadata(blobName);
    if (!blobMetadata) {
      return res.status(500).json({
        error: 'Metadata error',
        message: 'Failed to retrieve blob metadata'
      });
    }

    // Validate user permissions (reuse PhotoService validation)
    await PhotoService.validateUserPermissions(user!.id, candidateId);

    // Create database record using PhotoService method
    const photoRecord = await PhotoService.createPhotoRecordFromBlob({
      userId: user!.id,
      blobName,
      blobUrl: blobMetadata.url,
      photoType: photoType as PhotoType,
      purpose: purpose as PhotoPurpose,
      candidateId: candidateId || undefined,
      gallery: gallery || undefined,
      caption: caption || undefined,
      fileSize: blobMetadata.size,
      mimeType: blobMetadata.contentType
    });

    console.log(`✅ Photo record created: ${photoRecord.id}`);

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo: {
        id: photoRecord.id,
        url: photoRecord.url,
        thumbnailUrl: photoRecord.thumbnailUrl,
        width: photoRecord.width,
        height: photoRecord.height
      },
      pendingModeration: photoType === 'CAMPAIGN' || photoType === 'VERIFICATION'
    });

  } catch (error: any) {
    console.error('Upload confirmation failed:', error);

    if (error.message.includes('Permission denied') || error.message.includes('Invalid candidate')) {
      return res.status(403).json({
        error: 'Permission denied',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Confirmation failed',
      message: 'Failed to confirm photo upload. Please try again.'
    });
  }
});

// OBSOLETE MULTIPART UPLOAD ENDPOINT REMOVED
// All photo uploads now use the secure direct-to-blob flow with:
// - AI content moderation
// - EXIF metadata stripping
// - Magic byte validation
// See /upload/sas-token and /upload/confirm endpoints above

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
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoType, purpose, candidateId } = req.query;

    const photos = await PhotoService.getUserPhotos(
      user!.id,
      photoType as PhotoType,
      purpose as PhotoPurpose,
      candidateId as string
    );

    res.json({
      photos,
      count: photos.length
    });

  } catch (error) {
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

    const photos = await PhotoService.getCandidatePhotos(candidateId);

    res.json({
      photos,
      count: photos.length
    });

  } catch (error) {
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
router.put('/:photoId/purpose', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoId } = req.params;
    const { purpose, candidateId } = req.body;

    if (!purpose || !Object.values(PhotoPurpose).includes(purpose)) {
      return res.status(400).json({
        error: 'Invalid purpose',
        message: 'Purpose must be one of: PERSONAL, CAMPAIGN, BOTH'
      });
    }

    await PhotoService.setPhotoPurpose(photoId, user!.id, purpose, candidateId);

    res.json({
      message: 'Photo purpose updated successfully'
    });

  } catch (error: any) {
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
router.delete('/:photoId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoId } = req.params;

    await PhotoService.deletePhoto(photoId, user!.id);

    res.status(204).send();

  } catch (error: any) {
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
router.post('/:photoId/flag', requireAuth, async (req: AuthRequest, res) => {
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

    await PhotoService.flagPhoto(photoId, user!.id, reason.trim());

    res.json({
      message: 'Photo flagged for moderation review'
    });

  } catch (error) {
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
router.get('/moderation/pending', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    
    if (!user!.isModerator && !user!.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Moderator access required'
      });
    }

    const photos = await PhotoService.getPendingModeration();

    res.json({
      photos,
      count: photos.length
    });

  } catch (error) {
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
router.post('/:photoId/approve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoId } = req.params;
    
    if (!user!.isModerator && !user!.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Moderator access required'
      });
    }

    await PhotoService.approvePhoto(photoId, user!.id);

    res.json({
      message: 'Photo approved successfully'
    });

  } catch (error) {
    console.error('Failed to approve photo:', error);
    res.status(500).json({ error: 'Failed to approve photo' });
  }
});

/**
 * @swagger
 * /api/photos/galleries:
 *   get:
 *     tags: [Photos]
 *     summary: Get user's photo galleries
 *     description: Retrieve user's photos organized by gallery/folder
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photo galleries retrieved successfully
 */
router.get('/galleries', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    console.log(`📸 Fetching galleries for user: ${user!.id}`);
    
    const galleries = await PhotoService.getUserGalleries(user!.id);
    
    console.log(`📸 Returning ${galleries.galleries.length} galleries with total ${galleries.totalStorageUsed} bytes used`);
    
    res.json(galleries);
  } catch (error) {
    console.error('Failed to retrieve galleries:', error);
    res.status(500).json({ error: 'Failed to retrieve photo galleries' });
  }
});

/**
 * @swagger
 * /api/photos/{photoId}/gallery:
 *   put:
 *     tags: [Photos]
 *     summary: Move photo to gallery
 *     description: Move a photo to a different gallery/folder
 *     security:
 *       - bearerAuth: []
 */
router.put('/:photoId/gallery', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoId } = req.params;
    const { gallery } = req.body;

    if (!gallery || gallery.trim().length === 0) {
      return res.status(400).json({
        error: 'Gallery name required',
        message: 'Please provide a gallery name'
      });
    }

    await PhotoService.movePhotoToGallery(photoId, user!.id, gallery);
    res.json({ message: 'Photo moved to gallery successfully' });
  } catch (error: any) {
    console.error('Failed to move photo:', error);
    if (error.message.includes('not found') || error.message.includes('permission denied')) {
      return res.status(404).json({ error: 'Photo not found or permission denied' });
    }
    res.status(500).json({ error: 'Failed to move photo to gallery' });
  }
});

/**
 * @swagger
 * /api/photos/{photoId}/set-profile:
 *   post:
 *     tags: [Photos]
 *     summary: Set as profile picture
 *     description: Set a gallery photo as the user's profile picture
 *     security:
 *       - bearerAuth: []
 */
router.post('/:photoId/set-profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoId } = req.params;

    await PhotoService.setAsProfilePicture(photoId, user!.id);
    res.json({ message: 'Profile picture updated successfully' });
  } catch (error: any) {
    console.error('Failed to set profile picture:', error);
    if (error.message.includes('not found') || error.message.includes('permission denied')) {
      return res.status(404).json({ error: 'Photo not found or permission denied' });
    }
    if (error.message.includes('Only gallery photos')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to set profile picture' });
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
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    
    if (!user!.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const stats = await PhotoService.getStorageStats();

    res.json({
      message: 'Photo statistics retrieved successfully',
      ...stats
    });

  } catch (error) {
    console.error('Failed to retrieve photo stats:', error);
    res.status(500).json({ error: 'Failed to retrieve photo statistics' });
  }
});

export default router;