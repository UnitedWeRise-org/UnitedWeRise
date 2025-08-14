import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PhotoTaggingService } from '../services/photoTaggingService';
import { PhotoPrivacyRequestType } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for tagging actions
const taggingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 tagging actions per 15 minutes
  message: {
    error: 'Too many tagging attempts',
    message: 'Please wait before creating more tags'
  }
});

/**
 * @swagger
 * /api/photo-tags:
 *   post:
 *     tags: [Photo Tags]
 *     summary: Create a photo tag
 *     description: Tag a user in a photo at specific coordinates
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               photoId:
 *                 type: string
 *                 description: ID of the photo to tag
 *               taggedId:
 *                 type: string
 *                 description: ID of the user being tagged
 *               x:
 *                 type: number
 *                 description: X coordinate as percentage (0-100)
 *               y:
 *                 type: number
 *                 description: Y coordinate as percentage (0-100)
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       400:
 *         description: Invalid input or tagging not allowed
 *       401:
 *         description: Authentication required
 */
router.post('/', requireAuth, taggingLimiter, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoId, taggedId, x, y } = req.body;

    // Validate input
    if (!photoId || !taggedId || x == null || y == null) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'photoId, taggedId, x, and y coordinates are required'
      });
    }

    if (x < 0 || x > 100 || y < 0 || y > 100) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'x and y must be between 0 and 100'
      });
    }

    if (taggedId === user!.id) {
      return res.status(400).json({
        error: 'Cannot tag yourself',
        message: 'You cannot tag yourself in photos'
      });
    }

    const tag = await PhotoTaggingService.createTag({
      photoId,
      taggedById: user!.id,
      taggedId,
      x: parseFloat(x),
      y: parseFloat(y)
    });

    res.status(201).json({
      message: 'Tag created successfully',
      tag
    });

  } catch (error: any) {
    console.error('Photo tagging error:', error);

    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return res.status(404).json({
        error: 'Photo not found',
        message: 'The specified photo does not exist or is no longer available'
      });
    }

    if (error.message.includes('disabled') || error.message.includes('only allows')) {
      return res.status(403).json({
        error: 'Tagging not allowed',
        message: error.message
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Tag already exists',
        message: 'This user is already tagged in this photo'
      });
    }

    res.status(500).json({
      error: 'Tagging failed',
      message: 'Failed to create photo tag. Please try again.'
    });
  }
});

/**
 * @swagger
 * /api/photo-tags/{tagId}/respond:
 *   post:
 *     tags: [Photo Tags]
 *     summary: Respond to a photo tag
 *     description: Approve or decline a photo tag request
 *     security:
 *       - bearerAuth: []
 */
router.post('/:tagId/respond', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { tagId } = req.params;
    const { approve } = req.body;

    if (typeof approve !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid response',
        message: 'approve field must be true or false'
      });
    }

    const tag = await PhotoTaggingService.respondToTag({
      tagId,
      userId: user!.id,
      approve
    });

    res.json({
      message: `Tag ${approve ? 'approved' : 'declined'} successfully`,
      tag
    });

  } catch (error: any) {
    console.error('Tag response error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Tag not found',
        message: 'The specified tag does not exist'
      });
    }

    if (error.message.includes('only the tagged user') || error.message.includes('already been responded')) {
      return res.status(403).json({
        error: 'Action not allowed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Response failed',
      message: 'Failed to respond to tag. Please try again.'
    });
  }
});

/**
 * @swagger
 * /api/photo-tags/{tagId}:
 *   delete:
 *     tags: [Photo Tags]
 *     summary: Remove a photo tag
 *     description: Remove a tag from a photo (tagged user, tagger, or photo owner)
 */
router.delete('/:tagId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { tagId } = req.params;

    await PhotoTaggingService.removeTag(tagId, user!.id);

    res.json({
      message: 'Tag removed successfully'
    });

  } catch (error: any) {
    console.error('Tag removal error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Tag not found',
        message: 'The specified tag does not exist'
      });
    }

    if (error.message.includes('Permission denied')) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'You can only remove your own tags or tags on your photos'
      });
    }

    res.status(500).json({
      error: 'Removal failed',
      message: 'Failed to remove tag. Please try again.'
    });
  }
});

/**
 * @swagger
 * /api/photo-tags/photo/{photoId}:
 *   get:
 *     tags: [Photo Tags]
 *     summary: Get tags for a photo
 *     description: Get all approved tags for a specific photo
 */
router.get('/photo/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;

    const tags = await PhotoTaggingService.getPhotoTags(photoId);

    res.json({
      tags,
      count: tags.length
    });

  } catch (error) {
    console.error('Get photo tags error:', error);
    res.status(500).json({
      error: 'Failed to get photo tags'
    });
  }
});

/**
 * @swagger
 * /api/photo-tags/pending:
 *   get:
 *     tags: [Photo Tags]
 *     summary: Get pending tag approvals
 *     description: Get all pending photo tags for the authenticated user
 */
router.get('/pending', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;

    const pendingTags = await PhotoTaggingService.getPendingTags(user!.id);

    res.json({
      pendingTags,
      count: pendingTags.length
    });

  } catch (error) {
    console.error('Get pending tags error:', error);
    res.status(500).json({
      error: 'Failed to get pending tags'
    });
  }
});

/**
 * @swagger
 * /api/photo-tags/search-users:
 *   get:
 *     tags: [Photo Tags]
 *     summary: Search users for tagging
 *     description: Search for users who can be tagged in photos
 */
router.get('/search-users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await PhotoTaggingService.searchUsersForTagging(q.trim(), user!.id);

    res.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Failed to search users'
    });
  }
});

/**
 * @swagger
 * /api/photo-tags/privacy-request:
 *   post:
 *     tags: [Photo Tags]
 *     summary: Create privacy request
 *     description: Request tag removal or photo removal
 */
router.post('/privacy-request', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoId, type, reason } = req.body;

    if (!photoId || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'photoId and type are required'
      });
    }

    if (!Object.values(PhotoPrivacyRequestType).includes(type)) {
      return res.status(400).json({
        error: 'Invalid request type',
        message: 'Type must be REMOVE_TAG, REMOVE_PHOTO, or BLOCK_FUTURE'
      });
    }

    const request = await PhotoTaggingService.createPrivacyRequest({
      photoId,
      userId: user!.id,
      type,
      reason
    });

    res.status(201).json({
      message: 'Privacy request created successfully',
      request
    });

  } catch (error: any) {
    console.error('Privacy request error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Photo not found',
        message: 'The specified photo does not exist'
      });
    }

    if (error.message.includes('existing request')) {
      return res.status(409).json({
        error: 'Request already exists',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Request failed',
      message: 'Failed to create privacy request. Please try again.'
    });
  }
});

/**
 * @swagger
 * /api/photo-tags/preferences:
 *   put:
 *     tags: [Photo Tags]
 *     summary: Update tagging preferences
 *     description: Update user's photo tagging privacy preferences
 */
router.put('/preferences', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoTaggingEnabled, requireTagApproval, allowTagsByFriendsOnly } = req.body;

    const preferences: any = {};

    if (typeof photoTaggingEnabled === 'boolean') {
      preferences.photoTaggingEnabled = photoTaggingEnabled;
    }
    if (typeof requireTagApproval === 'boolean') {
      preferences.requireTagApproval = requireTagApproval;
    }
    if (typeof allowTagsByFriendsOnly === 'boolean') {
      preferences.allowTagsByFriendsOnly = allowTagsByFriendsOnly;
    }

    if (Object.keys(preferences).length === 0) {
      return res.status(400).json({
        error: 'No preferences specified',
        message: 'At least one preference must be provided'
      });
    }

    await PhotoTaggingService.updateTaggingPreferences(user!.id, preferences);

    res.json({
      message: 'Tagging preferences updated successfully',
      preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'Failed to update preferences. Please try again.'
    });
  }
});

export default router;