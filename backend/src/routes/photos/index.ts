/**
 * Layer 6: Photo Upload with Pipeline Architecture
 *
 * Purpose: Clean route handler using reusable PhotoPipeline service
 * Features: Authentication + File Validation + EXIF Stripping + AI Moderation + Database
 * Layers:
 *   - Layer 0: Basic file transport ✅
 *   - Layer 1: Authentication ✅
 *   - Layer 2: File validation ✅
 *   - Layer 3: EXIF stripping and WebP conversion ✅
 *   - Layer 4: AI content moderation ✅
 *   - Layer 5: Database persistence ✅
 *   - Layer 6: Pipeline architecture ✅
 * Architecture: All processing logic extracted to PhotoPipeline service for reusability
 */

import express, { Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { photoPipeline } from '../../services/PhotoPipeline';
import galleryRoutes from '../galleries.js';

const router = express.Router();

// Configure Multer for memory storage (5MB limit for safety)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Validation constants (for health endpoint)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_FILE_SIZE = 100;
const MAX_DIMENSION = 8000;
const MIN_DIMENSION = 10;

/**
 * POST /api/photos/upload
 *
 * Layer 6: Clean upload endpoint using PhotoPipeline service
 * - Flow: Auth → Multer → PhotoPipeline.process() → Return Result
 * - All validation, processing, moderation, upload, and database logic in PhotoPipeline
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const requestId = uuidv4();

  try {
    // Basic file check
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        requestId
      });
    }

    // Extract metadata from request body
    const photoType = req.body.photoType || 'POST_MEDIA';
    const gallery = req.body.gallery;
    const caption = req.body.caption;

    // Process through pipeline
    const result = await photoPipeline.process({
      userId: req.user!.id,
      requestId,
      file: {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname
      },
      photoType,
      gallery,
      caption
    });

    return res.status(201).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    // Handle moderation failures
    if (error.moderationResult) {
      return res.status(422).json({
        success: false,
        error: 'Content moderation failed',
        details: error.moderationResult.reason,
        category: error.moderationResult.category,
        requestId
      });
    }

    // Generic error handling
    return res.status(500).json({
      success: false,
      error: error.message,
      requestId
    });
  }
});

/**
 * GET /api/photos/health
 *
 * Health check endpoint
 */
router.get('/health', (req: AuthRequest, res: Response) => {
  const envCheck = {
    hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    hasAccountName: !!process.env.AZURE_STORAGE_ACCOUNT_NAME,
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    hasAzureOpenAI: !!process.env.AZURE_OPENAI_ENDPOINT && !!process.env.AZURE_OPENAI_API_KEY
  };

  return res.json({
    status: 'ok',
    layer: 6,
    description: 'Pipeline-based photo upload with reusable architecture',
    features: {
      authentication: true,
      validation: true,
      exifStripping: true,
      webpConversion: true,
      moderation: true,
      database: true,
      pipelineArchitecture: true
    },
    validation: {
      allowedTypes: ALLOWED_MIME_TYPES,
      allowedExtensions: ALLOWED_EXTENSIONS,
      maxSize: MAX_FILE_SIZE,
      minSize: MIN_FILE_SIZE,
      maxDimension: MAX_DIMENSION,
      minDimension: MIN_DIMENSION
    },
    environment: envCheck
  });
});

// Mount gallery routes
router.use('/galleries', galleryRoutes);

export default router;
