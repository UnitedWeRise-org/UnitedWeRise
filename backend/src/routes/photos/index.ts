/**
 * Layer 5: Photo Upload with Database Persistence
 *
 * Purpose: Store photo metadata in database for retrieval and management
 * Features: Authentication + File Validation + EXIF Stripping + AI Moderation + Database
 * Layers:
 *   - Layer 0: Basic file transport ✅
 *   - Layer 1: Authentication ✅
 *   - Layer 2: File validation ✅
 *   - Layer 3: EXIF stripping and WebP conversion ✅
 *   - Layer 4: AI content moderation ✅
 *   - Layer 5: Database persistence ✅
 * Logging: Every step logs with requestId for tracing
 */

import express, { Response } from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { imageContentModerationService } from '../../services/imageContentModerationService';
import { prisma } from '../../lib/prisma.js';

const router = express.Router();

// Layer 2: File validation constants
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_FILE_SIZE = 100; // 100 bytes (prevents empty files)

const MAX_DIMENSION = 8000; // 8000px max width/height
const MIN_DIMENSION = 10;   // 10px min width/height

// File signature validation (magic numbers)
const FILE_SIGNATURES: { [key: string]: number[][] } = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]] // "RIFF" header
};

// Configure Multer for memory storage (5MB limit for safety)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Structured logging helper (stderr = unbuffered, shows immediately)
const log = (requestId: string, stage: string, data: any = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    stage,
    ...data
  };
  process.stderr.write(JSON.stringify(logEntry) + '\n');
};

// Layer 2: File validation helper
const validateFileSignature = (buffer: Buffer, mimeType: string): boolean => {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
};

// Layer 2: Extract image dimensions from buffer
const getImageDimensions = (buffer: Buffer, mimeType: string): { width: number; height: number } | null => {
  try {
    if (mimeType === 'image/png') {
      // PNG: dimensions at bytes 16-23 (big-endian)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      // JPEG: scan for SOF marker (0xFFC0, 0xFFC1, 0xFFC2)
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] === 0xFF) {
          const marker = buffer[offset + 1];
          if (marker >= 0xC0 && marker <= 0xC2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          const segmentLength = buffer.readUInt16BE(offset + 2);
          offset += segmentLength + 2;
        } else {
          offset++;
        }
      }
    } else if (mimeType === 'image/gif') {
      // GIF: dimensions at bytes 6-9 (little-endian)
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    } else if (mimeType === 'image/webp') {
      // WebP: check for VP8/VP8L/VP8X chunks
      if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        const chunkType = buffer.toString('ascii', 12, 16);
        if (chunkType === 'VP8 ') {
          // Lossy WebP
          const width = buffer.readUInt16LE(26) & 0x3fff;
          const height = buffer.readUInt16LE(28) & 0x3fff;
          return { width, height };
        } else if (chunkType === 'VP8L') {
          // Lossless WebP
          const bits = buffer.readUInt32LE(21);
          const width = ((bits & 0x3FFF) + 1);
          const height = (((bits >> 14) & 0x3FFF) + 1);
          return { width, height };
        } else if (chunkType === 'VP8X') {
          // Extended WebP
          const width = (buffer.readUIntLE(24, 3) + 1);
          const height = (buffer.readUIntLE(27, 3) + 1);
          return { width, height };
        }
      }
    }
  } catch (error) {
    return null;
  }

  return null;
};

/**
 * POST /api/photos/upload
 *
 * Layer 2: Validated upload endpoint
 * - ✅ JWT authentication (Layer 1)
 * - ✅ File validation (Layer 2)
 * - NO processing (coming in Layers 3-4)
 * - Flow: Auth → Validate → File → Azure Blob → Return URL
 */
router.post('/upload', requireAuth, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  const requestId = uuidv4();

  log(requestId, 'REQUEST_RECEIVED', {
    userId: req.user?.id,
    hasFile: !!req.file,
    fileSize: req.file?.size,
    mimeType: req.file?.mimetype,
    fileName: req.file?.originalname
  });

  // Layer 1: Authentication validation
  if (!req.user) {
    log(requestId, 'AUTH_FAILED', { reason: 'no_user_in_request' });
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      requestId
    });
  }

  log(requestId, 'AUTH_VERIFIED', { userId: req.user.id, username: req.user.username });

  try {
    // Step 1: Validate file exists
    if (!req.file) {
      log(requestId, 'VALIDATION_FAILED', { reason: 'no_file' });
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        requestId
      });
    }

    log(requestId, 'FILE_RECEIVED', {
      size: req.file.size,
      type: req.file.mimetype
    });

    // Layer 2: File size validation
    if (req.file.size < MIN_FILE_SIZE) {
      log(requestId, 'VALIDATION_FAILED', { reason: 'file_too_small', size: req.file.size });
      return res.status(400).json({
        success: false,
        error: `File too small. Minimum size is ${MIN_FILE_SIZE} bytes.`,
        requestId
      });
    }

    if (req.file.size > MAX_FILE_SIZE) {
      log(requestId, 'VALIDATION_FAILED', { reason: 'file_too_large', size: req.file.size });
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        requestId
      });
    }

    // Layer 2: MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      log(requestId, 'VALIDATION_FAILED', { reason: 'invalid_mime_type', mimeType: req.file.mimetype });
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        requestId
      });
    }

    // Layer 2: File extension validation
    const fileExtension = (req.file.originalname.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      log(requestId, 'VALIDATION_FAILED', { reason: 'invalid_extension', extension: fileExtension });
      return res.status(400).json({
        success: false,
        error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
        requestId
      });
    }

    // Layer 2: File signature validation (magic numbers)
    if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
      log(requestId, 'VALIDATION_FAILED', {
        reason: 'invalid_signature',
        mimeType: req.file.mimetype,
        firstBytes: Array.from(req.file.buffer.slice(0, 8))
      });
      return res.status(400).json({
        success: false,
        error: 'File signature does not match declared type. File may be corrupted or misnamed.',
        requestId
      });
    }

    // Layer 2: Image dimension validation
    const dimensions = getImageDimensions(req.file.buffer, req.file.mimetype);
    if (!dimensions) {
      log(requestId, 'VALIDATION_FAILED', { reason: 'cannot_read_dimensions' });
      return res.status(400).json({
        success: false,
        error: 'Unable to read image dimensions. File may be corrupted.',
        requestId
      });
    }

    if (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION) {
      log(requestId, 'VALIDATION_FAILED', {
        reason: 'dimensions_too_small',
        width: dimensions.width,
        height: dimensions.height
      });
      return res.status(400).json({
        success: false,
        error: `Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}px`,
        requestId
      });
    }

    if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) {
      log(requestId, 'VALIDATION_FAILED', {
        reason: 'dimensions_too_large',
        width: dimensions.width,
        height: dimensions.height
      });
      return res.status(400).json({
        success: false,
        error: `Image too large. Maximum dimensions: ${MAX_DIMENSION}x${MAX_DIMENSION}px`,
        requestId
      });
    }

    log(requestId, 'VALIDATION_PASSED', {
      size: req.file.size,
      mimeType: req.file.mimetype,
      extension: fileExtension,
      dimensions: dimensions
    });

    // Layer 3: EXIF stripping and format optimization
    const originalSize = req.file.size;
    let processedBuffer: Buffer;
    let finalMimeType: string;
    let finalExtension: string;

    if (req.file.mimetype === 'image/gif') {
      // GIFs: Strip metadata but preserve animation
      const sharpInstance = sharp(req.file.buffer, { animated: true });
      processedBuffer = await sharpInstance
        .gif()
        .toBuffer();
      finalMimeType = 'image/gif';
      finalExtension = 'gif';

      log(requestId, 'EXIF_STRIPPED', {
        format: 'gif',
        originalSize,
        processedSize: processedBuffer.length,
        reduction: ((originalSize - processedBuffer.length) / originalSize * 100).toFixed(2) + '%',
        preserved: 'animation'
      });
    } else {
      // Static images: Strip EXIF and convert to WebP
      processedBuffer = await sharp(req.file.buffer)
        .webp({ quality: 85 })
        .toBuffer();
      finalMimeType = 'image/webp';
      finalExtension = 'webp';

      log(requestId, 'EXIF_STRIPPED', {
        format: 'webp',
        originalFormat: req.file.mimetype,
        originalSize,
        processedSize: processedBuffer.length,
        reduction: ((originalSize - processedBuffer.length) / originalSize * 100).toFixed(2) + '%',
        quality: 85
      });
    }

    // Layer 4: AI Content Moderation
    log(requestId, 'MODERATION_START', {
      bufferSize: processedBuffer.length,
      userId: req.user.id
    });

    let moderationResult;
    try {
      moderationResult = await imageContentModerationService.analyzeImage({
        imageBuffer: processedBuffer,
        mimeType: finalMimeType,
        userId: req.user.id,
        photoType: 'POST_MEDIA'
      });

      log(requestId, 'MODERATION_COMPLETE', {
        category: moderationResult.category,
        approved: moderationResult.approved,
        contentType: moderationResult.contentType,
        confidence: moderationResult.confidence,
        processingTime: moderationResult.processingTime
      });

      // Block if moderation rejected
      if (!moderationResult.approved) {
        log(requestId, 'MODERATION_BLOCKED', {
          reason: moderationResult.reason,
          category: moderationResult.category,
          contentType: moderationResult.contentType
        });

        return res.status(422).json({
          success: false,
          error: 'Content moderation failed',
          details: moderationResult.reason,
          category: moderationResult.category,
          requestId
        });
      }

    } catch (moderationError: any) {
      log(requestId, 'MODERATION_ERROR', {
        error: moderationError.message,
        stack: moderationError.stack
      });

      // In production, fail safe and block on moderation errors
      // In development/staging, log and continue
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          success: false,
          error: 'Content moderation service unavailable',
          requestId
        });
      }

      // Development/staging: continue with warning
      moderationResult = {
        category: 'WARN',
        approved: true,
        reason: 'Moderation service error - approved for development',
        description: moderationError.message,
        contentType: 'UNKNOWN',
        confidence: 0.1,
        processingTime: 0
      };
    }

    // Step 2: Check environment variables
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;

    if (!connectionString || !accountName) {
      log(requestId, 'ENV_VARS_MISSING', {
        hasConnectionString: !!connectionString,
        hasAccountName: !!accountName
      });
      return res.status(500).json({
        success: false,
        error: 'Server misconfigured',
        requestId
      });
    }

    log(requestId, 'ENV_VARS_VERIFIED', { accountName });

    // Step 3: Initialize Azure Blob client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient('photos');

    log(requestId, 'AZURE_CLIENT_CREATED', { container: 'photos' });

    // Step 4: Ensure container exists
    await containerClient.createIfNotExists({ access: 'blob' });

    log(requestId, 'CONTAINER_VERIFIED', { container: 'photos' });

    // Step 5: Generate unique blob name with processed extension
    const blobName = `${req.user.id}/${requestId}.${finalExtension}`;

    log(requestId, 'BLOB_NAME_GENERATED', { blobName, userId: req.user.id });

    // Step 6: Get blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Step 7: Upload to Azure (use processed buffer and mime type)
    await blockBlobClient.uploadData(processedBuffer, {
      blobHTTPHeaders: {
        blobContentType: finalMimeType
      }
    });

    log(requestId, 'AZURE_UPLOAD_SUCCESS', { blobName });

    // Step 8: Construct public URL
    const photoUrl = `https://${accountName}.blob.core.windows.net/photos/${blobName}`;

    // Layer 5: Database Persistence
    log(requestId, 'DB_PERSIST_START', {
      userId: req.user.id,
      blobName
    });

    let photoRecord;
    try {
      photoRecord = await prisma.photo.create({
        data: {
          userId: req.user.id,
          url: photoUrl,
          blobName: blobName,
          mimeType: finalMimeType,
          originalMimeType: req.file.mimetype,
          originalSize: originalSize,
          processedSize: processedBuffer.length,
          width: dimensions?.width || null,
          height: dimensions?.height || null,
          moderationStatus: moderationResult.category,
          moderationReason: moderationResult.reason || null,
          moderationConfidence: moderationResult.confidence || null,
          moderationType: moderationResult.contentType || null,
          exifStripped: true
        }
      });

      log(requestId, 'DB_PERSIST_COMPLETE', {
        photoId: photoRecord.id,
        userId: req.user.id
      });

    } catch (dbError: any) {
      log(requestId, 'DB_PERSIST_ERROR', {
        error: dbError.message,
        stack: dbError.stack
      });

      // Note: Photo already uploaded to blob - log error but return success
      // Alternative: Could delete blob and return error
      console.error('Database persistence failed but blob uploaded:', dbError);
    }

    log(requestId, 'UPLOAD_COMPLETE', {
      url: photoUrl,
      photoId: photoRecord?.id,
      duration: Date.now() - new Date(requestId.split('-')[0]).getTime()
    });

    // Step 9: Return success with processing metadata
    return res.status(201).json({
      success: true,
      data: {
        photoId: photoRecord?.id,
        url: photoUrl,
        blobName,
        requestId,
        originalSize,
        processedSize: processedBuffer.length,
        sizeReduction: ((originalSize - processedBuffer.length) / originalSize * 100).toFixed(2) + '%',
        originalMimeType: req.file.mimetype,
        finalMimeType,
        dimensions,
        exifStripped: true,
        moderation: {
          decision: moderationResult.category,
          approved: moderationResult.approved,
          reason: moderationResult.reason,
          contentType: moderationResult.contentType,
          confidence: moderationResult.confidence,
          processingTime: moderationResult.processingTime
        }
      }
    });

  } catch (error: any) {
    log(requestId, 'ERROR', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });

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
    layer: 5,
    description: 'Authenticated photo upload with validation, EXIF stripping, AI moderation, and database persistence',
    features: {
      authentication: true,
      validation: true,
      exifStripping: true,
      webpConversion: true,
      moderation: true,
      database: true
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

export default router;
