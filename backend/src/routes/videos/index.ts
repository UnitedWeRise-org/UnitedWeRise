/**
 * Video Routes
 *
 * Endpoints for short-form video (reels) and post video attachments.
 *
 * Features:
 * - Video upload with validation and encoding pipeline
 * - Draft, scheduling, and publishing workflow
 * - Reels feed (TikTok-style vertical video feed)
 * - User video profile
 * - View tracking for analytics
 *
 * @module routes/videos
 */

import express, { Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireStagingAuth, AuthRequest } from '../../middleware/auth';
import { videoPipeline } from '../../services/VideoPipeline';
import { videoStorageService } from '../../services/VideoStorageService';
import { videoEncodingService } from '../../services/VideoEncodingService';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../services/logger';

const router = express.Router();

// ========================================
// Constants
// ========================================

const MAX_FILE_SIZE = parseInt(process.env.VIDEO_MAX_SIZE_BYTES || '524288000', 10); // 500MB
const MAX_DURATION = parseInt(process.env.VIDEO_MAX_DURATION_SECONDS || '180', 10); // 3 minutes

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska'
];

// ========================================
// Multer Configuration
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
  }
});

// ========================================
// Health Check
// ========================================

/**
 * @swagger
 * /api/videos/health:
 *   get:
 *     tags: [Video]
 *     summary: Video service health check
 *     description: Returns the health status of video upload and encoding services
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unavailable]
 *                 storage:
 *                   type: boolean
 *                 encoding:
 *                   type: boolean
 *                 config:
 *                   type: object
 */
router.get('/health', async (req, res) => {
  const storageAvailable = await videoStorageService.isAvailable();
  const encodingAvailable = videoEncodingService.isAvailable();

  const status = storageAvailable && encodingAvailable
    ? 'healthy'
    : storageAvailable
      ? 'degraded'
      : 'unavailable';

  res.json({
    status,
    storage: storageAvailable,
    encoding: encodingAvailable,
    config: {
      maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
      maxDurationSeconds: MAX_DURATION,
      allowedTypes: ALLOWED_MIME_TYPES
    }
  });
});

// ========================================
// Video Upload
// ========================================

/**
 * @swagger
 * /api/videos/upload:
 *   post:
 *     tags: [Video]
 *     summary: Upload a new video
 *     description: |
 *       Uploads a video through the processing pipeline:
 *       - File validation (size, format, duration)
 *       - Metadata extraction (duration, dimensions, aspect ratio)
 *       - Raw video storage
 *       - Encoding job submission (Azure Media Services)
 *       - Thumbnail generation
 *       - Database record creation
 *
 *       Videos are created in DRAFT status and must be explicitly published.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Video file (MP4, WebM, MOV; max 500MB, max 3 min)
 *               videoType:
 *                 type: string
 *                 enum: [REEL, POST_ATTACHMENT]
 *                 default: REEL
 *                 description: Video type (standalone reel or post attachment)
 *               caption:
 *                 type: string
 *                 maxLength: 2200
 *                 description: Video caption with optional hashtags
 *               postId:
 *                 type: string
 *                 format: uuid
 *                 description: Post ID if this is a post attachment
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Invalid file or validation error
 *       401:
 *         description: Not authenticated
 *       413:
 *         description: File too large
 */
router.post(
  '/upload',
  requireStagingAuth,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    const requestId = uuidv4();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No video file provided'
        });
      }

      const { videoType = 'REEL', caption, postId } = req.body;

      // Validate videoType
      if (!['REEL', 'POST_ATTACHMENT'].includes(videoType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid videoType. Must be REEL or POST_ATTACHMENT'
        });
      }

      // If postId provided, verify it exists and belongs to user
      if (postId) {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { authorId: true }
        });

        if (!post) {
          return res.status(404).json({
            success: false,
            error: 'Post not found'
          });
        }

        if (post.authorId !== req.user?.id) {
          return res.status(403).json({
            success: false,
            error: 'Cannot attach video to another user\'s post'
          });
        }
      }

      const result = await videoPipeline.process({
        userId: req.user?.id!,
        requestId,
        file: {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          size: req.file.size,
          originalname: req.file.originalname
        },
        videoType: videoType as 'REEL' | 'POST_ATTACHMENT',
        caption,
        postId
      });

      // Set response headers for metadata
      res.setHeader('X-Request-Id', requestId);
      res.setHeader('X-Video-Id', result.videoId);
      res.setHeader('X-Encoding-Status', result.encodingStatus);

      res.status(201).json({
        success: true,
        video: {
          id: result.videoId,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          width: result.width,
          height: result.height,
          aspectRatio: result.aspectRatio,
          originalSize: result.originalSize,
          encodingStatus: result.encodingStatus,
          publishStatus: 'DRAFT'
        },
        requestId
      });

    } catch (error: any) {
      logger.error({ error, requestId }, 'Video upload failed');

      // Determine status code based on error type
      let statusCode = 500;
      if (error.message?.includes('too large')) {
        statusCode = 413;
      } else if (error.message?.includes('Invalid') || error.message?.includes('too')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message || 'Video upload failed',
        requestId
      });
    }
  }
);

// ========================================
// IMPORTANT: Literal routes must be defined before /:id routes
// Express matches routes in order, so /feed, /drafts, /scheduled
// must come before /:id or they'll be caught as video IDs.
// ========================================

// ========================================
// Reels Feed
// ========================================

/**
 * @swagger
 * /api/videos/feed:
 *   get:
 *     tags: [Video]
 *     summary: Get reels feed
 *     description: Returns a paginated feed of published reels for TikTok-style viewing
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Number of videos to return
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (video ID)
 *     responses:
 *       200:
 *         description: Reels feed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 videos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 *                 nextCursor:
 *                   type: string
 */
router.get('/feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursor = req.query.cursor as string | undefined;

    const videos = await prisma.video.findMany({
      where: {
        videoType: 'REEL',
        publishStatus: 'PUBLISHED',
        isActive: true,
        encodingStatus: 'READY',
        moderationStatus: 'APPROVED',
        deletedAt: null
      },
      orderBy: [
        { publishedAt: 'desc' },
        { id: 'desc' }
      ],
      take: limit + 1, // Fetch one extra to check for more
      ...(cursor ? {
        cursor: { id: cursor },
        skip: 1
      } : {}),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        }
      }
    });

    const hasMore = videos.length > limit;
    const feedVideos = hasMore ? videos.slice(0, -1) : videos;
    const nextCursor = hasMore ? feedVideos[feedVideos.length - 1]?.id : undefined;

    res.json({
      success: true,
      videos: feedVideos.map(video => ({
        id: video.id,
        hlsManifestUrl: video.hlsManifestUrl,
        mp4Url: video.mp4Url,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        aspectRatio: video.aspectRatio,
        caption: video.caption,
        hashtags: video.hashtags,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        shareCount: video.shareCount,
        publishedAt: video.publishedAt,
        user: video.user
      })),
      nextCursor
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get feed');
    res.status(500).json({
      success: false,
      error: 'Failed to get feed'
    });
  }
});

// ========================================
// Draft Management
// ========================================

/**
 * @swagger
 * /api/videos/drafts:
 *   get:
 *     tags: [Video]
 *     summary: Get user's draft videos
 *     description: Returns videos in DRAFT status for the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Draft videos
 */
router.get('/drafts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        userId: req.user?.id,
        publishStatus: 'DRAFT',
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        thumbnailUrl: true,
        duration: true,
        caption: true,
        encodingStatus: true,
        moderationStatus: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      videos
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get drafts');
    res.status(500).json({
      success: false,
      error: 'Failed to get drafts'
    });
  }
});

/**
 * @swagger
 * /api/videos/scheduled:
 *   get:
 *     tags: [Video]
 *     summary: Get user's scheduled videos
 *     description: Returns videos scheduled for future publishing
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Scheduled videos
 */
router.get('/scheduled', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        userId: req.user?.id,
        publishStatus: 'SCHEDULED',
        deletedAt: null
      },
      orderBy: { scheduledPublishAt: 'asc' },
      select: {
        id: true,
        thumbnailUrl: true,
        duration: true,
        caption: true,
        scheduledPublishAt: true,
        encodingStatus: true,
        moderationStatus: true
      }
    });

    res.json({
      success: true,
      videos
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get scheduled videos');
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduled videos'
    });
  }
});

// ========================================
// Parameterized routes (/:id) below
// These must come AFTER literal routes
// ========================================

// ========================================
// Get Video Details
// ========================================

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     tags: [Video]
 *     summary: Get video details
 *     description: Returns video metadata and streaming URLs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Video'
 *       404:
 *         description: Video not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        }
      }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Don't return unpublished videos to non-owners
    if (video.publishStatus !== 'PUBLISHED' && video.userId !== (req as AuthRequest).user?.id) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    res.json({
      success: true,
      video: {
        id: video.id,
        videoType: video.videoType,
        hlsManifestUrl: video.hlsManifestUrl,
        mp4Url: video.mp4Url,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        width: video.width,
        height: video.height,
        aspectRatio: video.aspectRatio,
        caption: video.caption,
        hashtags: video.hashtags,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        shareCount: video.shareCount,
        encodingStatus: video.encodingStatus,
        publishStatus: video.publishStatus,
        publishedAt: video.publishedAt,
        createdAt: video.createdAt,
        user: video.user
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get video');
    res.status(500).json({
      success: false,
      error: 'Failed to get video'
    });
  }
});

// ========================================
// Stream Video (Redirect to HLS)
// ========================================

/**
 * @swagger
 * /api/videos/{id}/stream:
 *   get:
 *     tags: [Video]
 *     summary: Get video streaming URL
 *     description: Redirects to HLS manifest URL for adaptive streaming
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       302:
 *         description: Redirect to HLS manifest
 *       404:
 *         description: Video not found or not ready
 */
router.get('/:id/stream', async (req, res) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        hlsManifestUrl: true,
        mp4Url: true,
        encodingStatus: true,
        publishStatus: true,
        isActive: true
      }
    });

    if (!video || !video.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    if (video.encodingStatus !== 'READY') {
      return res.status(404).json({
        success: false,
        error: 'Video is still processing'
      });
    }

    // Prefer HLS, fallback to MP4
    const streamUrl = video.hlsManifestUrl || video.mp4Url;

    if (!streamUrl) {
      return res.status(404).json({
        success: false,
        error: 'Streaming URL not available'
      });
    }

    res.redirect(302, streamUrl);

  } catch (error) {
    logger.error({ error }, 'Failed to get stream URL');
    res.status(500).json({
      success: false,
      error: 'Failed to get stream URL'
    });
  }
});

// ========================================
// Delete Video
// ========================================

/**
 * @swagger
 * /api/videos/{id}:
 *   delete:
 *     tags: [Video]
 *     summary: Delete a video
 *     description: Soft deletes a video (marks as deleted, removes from feeds)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted
 *       404:
 *         description: Video not found
 *       403:
 *         description: Not authorized to delete this video
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    if (video.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this video'
      });
    }

    // Soft delete
    await prisma.video.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    // Cleanup storage and encoding resources in background
    videoStorageService.deleteVideo(id).catch((error) => {
      logger.error({ error, videoId: id }, 'Failed to delete video storage');
    });

    videoEncodingService.cleanupResources(id).catch((error) => {
      logger.error({ error, videoId: id }, 'Failed to cleanup encoding resources');
    });

    res.json({
      success: true,
      message: 'Video deleted'
    });

  } catch (error) {
    logger.error({ error }, 'Failed to delete video');
    res.status(500).json({
      success: false,
      error: 'Failed to delete video'
    });
  }
});

// ========================================
// User's Videos
// ========================================

/**
 * @swagger
 * /api/videos/user/{userId}:
 *   get:
 *     tags: [Video]
 *     summary: Get user's videos
 *     description: Returns paginated list of a user's published videos
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's videos
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const videos = await prisma.video.findMany({
      where: {
        userId,
        publishStatus: 'PUBLISHED',
        isActive: true,
        encodingStatus: 'READY',
        deletedAt: null
      },
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? {
        cursor: { id: cursor },
        skip: 1
      } : {}),
      select: {
        id: true,
        thumbnailUrl: true,
        duration: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true
      }
    });

    const hasMore = videos.length > limit;
    const userVideos = hasMore ? videos.slice(0, -1) : videos;
    const nextCursor = hasMore ? userVideos[userVideos.length - 1]?.id : undefined;

    res.json({
      success: true,
      videos: userVideos,
      nextCursor
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get user videos');
    res.status(500).json({
      success: false,
      error: 'Failed to get user videos'
    });
  }
});

// ========================================
// Record View
// ========================================

/**
 * @swagger
 * /api/videos/{id}/view:
 *   post:
 *     tags: [Video]
 *     summary: Record video view
 *     description: Increments view count for analytics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: View recorded
 */
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count atomically
    await prisma.video.update({
      where: { id },
      data: {
        viewCount: { increment: 1 }
      }
    });

    res.json({ success: true });

  } catch (error) {
    // Don't fail the request for view tracking errors
    res.json({ success: true });
  }
});

// ========================================
// Publishing
// ========================================

/**
 * @swagger
 * /api/videos/{id}/publish:
 *   patch:
 *     tags: [Video]
 *     summary: Publish a video immediately
 *     description: Changes video status from DRAFT to PUBLISHED
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video published
 *       400:
 *         description: Video not ready for publishing
 *       403:
 *         description: Not authorized
 */
router.patch('/:id/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        userId: true,
        encodingStatus: true,
        moderationStatus: true,
        publishStatus: true
      }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    if (video.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Check if video is ready for publishing
    if (video.encodingStatus !== 'READY') {
      return res.status(400).json({
        success: false,
        error: 'Video encoding not complete'
      });
    }

    if (video.moderationStatus !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Video not approved for publishing'
      });
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        publishStatus: 'PUBLISHED',
        publishedAt: new Date(),
        isActive: true,
        scheduledPublishAt: null // Clear any scheduled time
      },
      select: {
        id: true,
        publishStatus: true,
        publishedAt: true
      }
    });

    res.json({
      success: true,
      video: updatedVideo
    });

  } catch (error) {
    logger.error({ error }, 'Failed to publish video');
    res.status(500).json({
      success: false,
      error: 'Failed to publish video'
    });
  }
});

/**
 * @swagger
 * /api/videos/{id}/schedule:
 *   patch:
 *     tags: [Video]
 *     summary: Schedule video for future publishing
 *     description: Sets a scheduled publish time for a draft video
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publishAt
 *             properties:
 *               publishAt:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 datetime for scheduled publish
 *     responses:
 *       200:
 *         description: Video scheduled
 */
router.patch('/:id/schedule', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { publishAt } = req.body;

    if (!publishAt) {
      return res.status(400).json({
        success: false,
        error: 'publishAt is required'
      });
    }

    const scheduledTime = new Date(publishAt);
    if (isNaN(scheduledTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (scheduledTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time must be in the future'
      });
    }

    const video = await prisma.video.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    if (video.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        publishStatus: 'SCHEDULED',
        scheduledPublishAt: scheduledTime
      },
      select: {
        id: true,
        publishStatus: true,
        scheduledPublishAt: true
      }
    });

    res.json({
      success: true,
      video: updatedVideo
    });

  } catch (error) {
    logger.error({ error }, 'Failed to schedule video');
    res.status(500).json({
      success: false,
      error: 'Failed to schedule video'
    });
  }
});

/**
 * @swagger
 * /api/videos/{id}/unschedule:
 *   patch:
 *     tags: [Video]
 *     summary: Cancel scheduled publish
 *     description: Moves video from SCHEDULED back to DRAFT
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Schedule cancelled
 */
router.patch('/:id/unschedule', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      select: { userId: true, publishStatus: true }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    if (video.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    if (video.publishStatus !== 'SCHEDULED') {
      return res.status(400).json({
        success: false,
        error: 'Video is not scheduled'
      });
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        publishStatus: 'DRAFT',
        scheduledPublishAt: null
      },
      select: {
        id: true,
        publishStatus: true
      }
    });

    res.json({
      success: true,
      video: updatedVideo
    });

  } catch (error) {
    logger.error({ error }, 'Failed to unschedule video');
    res.status(500).json({
      success: false,
      error: 'Failed to unschedule video'
    });
  }
});

export default router;
