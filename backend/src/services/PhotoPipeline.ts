/**
 * PhotoPipeline Service
 *
 * Reusable photo processing pipeline supporting multiple photo types (avatar, post, gallery, etc.)
 *
 * Architecture:
 * - Stage 1: File validation (size, type, dimensions, signatures)
 * - Stage 2: Image processing (EXIF stripping, WebP conversion, optimization)
 * - Stage 3: AI content moderation (Azure OpenAI Vision)
 * - Stage 4: Azure Blob Storage upload
 * - Stage 5: Database persistence
 *
 * Features:
 * - Structured logging with requestId tracing
 * - Type-safe interfaces
 * - Comprehensive error handling
 * - Extensible for different photo types
 */

import sharp from 'sharp';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { imageContentModerationService } from './imageContentModerationService';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger';
import { getEnvironment } from '../utils/environment';

// ========================================
// Type Definitions
// ========================================

export interface PhotoFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

export interface PhotoProcessingOptions {
  userId: string;
  requestId: string;
  file: PhotoFile;
  photoType?: string;
  gallery?: string;
  caption?: string;
}

export interface PhotoProcessingResult {
  photoId: string;
  url: string;
  blobName: string;
  requestId: string;
  originalSize: number;
  processedSize: number;
  sizeReduction: string;
  dimensions: { width: number; height: number } | null;
  mimeType: string;
  originalMimeType: string;
  moderation: {
    decision: string;
    approved: boolean;
    reason?: string;
    contentType?: string;
    confidence?: number;
    processingTime?: number;
  };
  exifStripped: boolean;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
}

interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalSize: number;
}

interface ModerationResult {
  category: string;
  approved: boolean;
  reason?: string;
  description?: string;
  contentType?: string;
  confidence?: number;
  processingTime?: number;
}

// ========================================
// Constants
// ========================================

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_FILE_SIZE = 100; // 100 bytes

const MAX_DIMENSION = 8000; // 8000px
const MIN_DIMENSION = 10;   // 10px

const FILE_SIGNATURES: { [key: string]: number[][] } = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]]
};

// ========================================
// PhotoPipeline Class
// ========================================

export class PhotoPipeline {

  // ========================================
  // Logging
  // ========================================

  private log(requestId: string, stage: string, data: any = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      stage,
      ...data
    };
    process.stderr.write(JSON.stringify(logEntry) + '\n');
  }

  // ========================================
  // Stage 1: File Validation
  // ========================================

  private validateFileSignature(buffer: Buffer, mimeType: string): boolean {
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
  }

  private getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
    try {
      if (mimeType === 'image/png') {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
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
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        return { width, height };
      } else if (mimeType === 'image/webp') {
        if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
          const chunkType = buffer.toString('ascii', 12, 16);
          if (chunkType === 'VP8 ') {
            const width = buffer.readUInt16LE(26) & 0x3fff;
            const height = buffer.readUInt16LE(28) & 0x3fff;
            return { width, height };
          } else if (chunkType === 'VP8L') {
            const bits = buffer.readUInt32LE(21);
            const width = ((bits & 0x3FFF) + 1);
            const height = (((bits >> 14) & 0x3FFF) + 1);
            return { width, height };
          } else if (chunkType === 'VP8X') {
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
  }

  async validateFile(file: PhotoFile, requestId: string): Promise<ValidationResult> {
    this.log(requestId, 'VALIDATION_START', {
      size: file.size,
      mimeType: file.mimetype,
      originalname: file.originalname
    });

    // Size validation
    if (file.size < MIN_FILE_SIZE) {
      this.log(requestId, 'VALIDATION_FAILED', { reason: 'file_too_small', size: file.size });
      return {
        valid: false,
        error: `File too small. Minimum size is ${MIN_FILE_SIZE} bytes.`
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      this.log(requestId, 'VALIDATION_FAILED', { reason: 'file_too_large', size: file.size });
      return {
        valid: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      };
    }

    // MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      this.log(requestId, 'VALIDATION_FAILED', { reason: 'invalid_mime_type', mimeType: file.mimetype });
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      };
    }

    // Extension validation
    if (file.originalname) {
      const fileExtension = (file.originalname.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        this.log(requestId, 'VALIDATION_FAILED', { reason: 'invalid_extension', extension: fileExtension });
        return {
          valid: false,
          error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
        };
      }
    }

    // File signature validation
    if (!this.validateFileSignature(file.buffer, file.mimetype)) {
      this.log(requestId, 'VALIDATION_FAILED', {
        reason: 'invalid_signature',
        mimeType: file.mimetype,
        firstBytes: Array.from(file.buffer.slice(0, 8))
      });
      return {
        valid: false,
        error: 'File signature does not match declared type. File may be corrupted or misnamed.'
      };
    }

    // Dimension validation
    const dimensions = this.getImageDimensions(file.buffer, file.mimetype);
    if (!dimensions) {
      this.log(requestId, 'VALIDATION_FAILED', { reason: 'cannot_read_dimensions' });
      return {
        valid: false,
        error: 'Unable to read image dimensions. File may be corrupted.'
      };
    }

    if (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION) {
      this.log(requestId, 'VALIDATION_FAILED', {
        reason: 'dimensions_too_small',
        width: dimensions.width,
        height: dimensions.height
      });
      return {
        valid: false,
        error: `Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}px`
      };
    }

    if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) {
      this.log(requestId, 'VALIDATION_FAILED', {
        reason: 'dimensions_too_large',
        width: dimensions.width,
        height: dimensions.height
      });
      return {
        valid: false,
        error: `Image too large. Maximum dimensions: ${MAX_DIMENSION}x${MAX_DIMENSION}px`
      };
    }

    this.log(requestId, 'VALIDATION_PASSED', {
      size: file.size,
      mimeType: file.mimetype,
      dimensions
    });

    return { valid: true, dimensions };
  }

  // ========================================
  // Stage 2: Image Processing (EXIF + WebP)
  // ========================================

  async processImage(buffer: Buffer, mimeType: string, requestId: string): Promise<ProcessedImage> {
    const originalSize = buffer.length;

    this.log(requestId, 'PROCESSING_START', {
      originalSize,
      mimeType
    });

    let processedBuffer: Buffer;
    let finalMimeType: string;
    let finalExtension: string;

    if (mimeType === 'image/gif') {
      // GIFs: Strip metadata but preserve animation
      const sharpInstance = sharp(buffer, { animated: true });
      processedBuffer = await sharpInstance.gif().toBuffer();
      finalMimeType = 'image/gif';
      finalExtension = 'gif';

      this.log(requestId, 'PROCESSING_COMPLETE', {
        format: 'gif',
        originalSize,
        processedSize: processedBuffer.length,
        reduction: ((originalSize - processedBuffer.length) / originalSize * 100).toFixed(2) + '%',
        preserved: 'animation'
      });
    } else {
      // Static images: Strip EXIF and convert to WebP
      processedBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();
      finalMimeType = 'image/webp';
      finalExtension = 'webp';

      this.log(requestId, 'PROCESSING_COMPLETE', {
        format: 'webp',
        originalFormat: mimeType,
        originalSize,
        processedSize: processedBuffer.length,
        reduction: ((originalSize - processedBuffer.length) / originalSize * 100).toFixed(2) + '%',
        quality: 85
      });
    }

    return {
      buffer: processedBuffer,
      mimeType: finalMimeType,
      extension: finalExtension,
      originalSize
    };
  }

  // ========================================
  // Stage 3: AI Content Moderation
  // ========================================

  async moderateContent(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    requestId: string,
    photoType: string = 'POST_MEDIA'
  ): Promise<ModerationResult> {
    this.log(requestId, 'MODERATION_START', {
      bufferSize: buffer.length,
      userId,
      photoType
    });

    try {
      const result = await imageContentModerationService.analyzeImage({
        imageBuffer: buffer,
        mimeType,
        userId,
        photoType
      });

      this.log(requestId, 'MODERATION_COMPLETE', {
        category: result.category,
        approved: result.approved,
        contentType: result.contentType,
        confidence: result.confidence,
        processingTime: result.processingTime
      });

      if (!result.approved) {
        this.log(requestId, 'MODERATION_BLOCKED', {
          reason: result.reason,
          category: result.category,
          contentType: result.contentType
        });

        // 🚨 ADMIN ALERT: Log blocked content for admin dashboard
        logger.error('🚨 MODERATION BLOCKED - Admin Alert', {
          userId,
          category: result.category,
          reason: result.reason,
          contentType: result.contentType,
          confidence: result.confidence,
          timestamp: new Date().toISOString()
        });
      }

      return result;

    } catch (moderationError: any) {
      this.log(requestId, 'MODERATION_ERROR', {
        error: moderationError.message,
        stack: moderationError.stack
      });

      // 🚨 CRITICAL: Moderation service failure - log for admin monitoring
      logger.error('🚨 MODERATION SERVICE FAILURE - Critical Admin Alert', {
        userId,
        error: moderationError.message,
        stack: moderationError.stack,
        environment: getEnvironment(),
        timestamp: new Date().toISOString(),
        photoId: requestId
      });

      // SECURITY FIX: Block upload in ALL environments when moderation fails
      // Previous behavior (approved: true in staging) was a security vulnerability
      throw new Error(`Content moderation service error: ${moderationError.message}`);
    }
  }

  // ========================================
  // Stage 4: Azure Blob Upload
  // ========================================

  async uploadToBlob(
    buffer: Buffer,
    blobName: string,
    mimeType: string,
    requestId: string
  ): Promise<string> {
    this.log(requestId, 'BLOB_UPLOAD_START', { blobName });

    // Check environment variables
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;

    if (!connectionString || !accountName) {
      this.log(requestId, 'ENV_VARS_MISSING', {
        hasConnectionString: !!connectionString,
        hasAccountName: !!accountName
      });
      throw new Error('Azure Storage not configured');
    }

    this.log(requestId, 'ENV_VARS_VERIFIED', { accountName });

    // Initialize Azure Blob client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient('photos');

    this.log(requestId, 'AZURE_CLIENT_CREATED', { container: 'photos' });

    // Ensure container exists
    await containerClient.createIfNotExists({ access: 'blob' });

    this.log(requestId, 'CONTAINER_VERIFIED', { container: 'photos' });

    // Upload to Azure
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobContentDisposition: 'inline', // Photos safe to display in browser
        blobCacheControl: 'public, max-age=31536000' // 1 year cache
      }
    });

    this.log(requestId, 'BLOB_UPLOAD_COMPLETE', { blobName });

    // Construct public URL
    const photoUrl = `https://${accountName}.blob.core.windows.net/photos/${blobName}`;
    return photoUrl;
  }

  // ========================================
  // Stage 5: Database Persistence
  // ========================================

  async persistToDatabase(
    userId: string,
    url: string,
    blobName: string,
    mimeType: string,
    originalMimeType: string,
    originalSize: number,
    processedSize: number,
    dimensions: { width: number; height: number } | null,
    moderationResult: ModerationResult,
    photoType: string,
    gallery: string | undefined,
    caption: string | undefined,
    requestId: string
  ): Promise<any> {
    this.log(requestId, 'DB_PERSIST_START', {
      userId,
      blobName,
      photoType,
      gallery,
      caption
    });

    try {
      const photoRecord = await prisma.photo.create({
        data: {
          userId,
          url,
          blobName,
          mimeType,
          originalMimeType,
          originalSize,
          processedSize,
          width: dimensions?.width || null,
          height: dimensions?.height || null,
          moderationStatus: moderationResult.category,
          moderationReason: moderationResult.reason || null,
          moderationConfidence: moderationResult.confidence || null,
          moderationType: moderationResult.contentType || null,
          exifStripped: true,
          photoType,
          gallery: gallery || null,
          caption: caption || null
        }
      });

      this.log(requestId, 'DB_PERSIST_COMPLETE', {
        photoId: photoRecord.id,
        userId,
        photoType
      });

      // If this is an avatar upload, update the user's avatar field
      if (photoType === 'AVATAR') {
        await prisma.user.update({
          where: { id: userId },
          data: { avatar: photoRecord.url }
        });

        this.log(requestId, 'AVATAR_UPDATE_COMPLETE', {
          userId,
          avatarUrl: photoRecord.url
        });
      }

      return photoRecord;

    } catch (dbError: any) {
      this.log(requestId, 'DB_PERSIST_ERROR', {
        error: dbError.message,
        stack: dbError.stack
      });

      throw dbError;
    }
  }

  // ========================================
  // Main Orchestration Method
  // ========================================

  async process(options: PhotoProcessingOptions): Promise<PhotoProcessingResult> {
    const { userId, requestId, file, photoType = 'POST_MEDIA', gallery, caption } = options;

    // EXPLICIT ERROR LOGGING FOR GUARANTEED VISIBILITY IN AZURE
    logger.error('🚨🚨🚨 PHOTOPIPELINE STARTED 🚨🚨🚨', {
      requestId,
      userId,
      fileSize: file.size,
      mimeType: file.mimetype,
      photoType
    });

    this.log(requestId, 'PIPELINE_START', {
      userId,
      fileSize: file.size,
      mimeType: file.mimetype,
      photoType,
      gallery,
      caption
    });

    // Stage 1: Validate
    const validationResult = await this.validateFile(file, requestId);
    if (!validationResult.valid) {
      logger.error('🚨 VALIDATION FAILED', { requestId, error: validationResult.error });
      throw new Error(validationResult.error);
    }

    // Stage 2: Process (EXIF + WebP)
    const processed = await this.processImage(file.buffer, file.mimetype, requestId);
    logger.error('✅ IMAGE PROCESSED', { requestId, newMimeType: processed.mimeType });

    // Stage 3: Moderate
    logger.error('🔍 CALLING VISION AI MODERATION', { requestId, userId });
    const moderationResult = await this.moderateContent(
      processed.buffer,
      processed.mimeType,
      userId,
      requestId,
      photoType
    );

    logger.error('📊 MODERATION RESULT', {
      requestId,
      approved: moderationResult.approved,
      category: moderationResult.category,
      reason: moderationResult.reason,
      contentType: moderationResult.contentType
    });

    if (!moderationResult.approved) {
      logger.error('🚨 MODERATION BLOCKED UPLOAD', { requestId, reason: moderationResult.reason });
      const error: any = new Error('Content moderation failed');
      error.moderationResult = moderationResult;
      throw error;
    }

    // Stage 4: Upload to blob
    const blobName = `${userId}/${requestId}.${processed.extension}`;
    const photoUrl = await this.uploadToBlob(
      processed.buffer,
      blobName,
      processed.mimeType,
      requestId
    );

    // Stage 5: Persist to database
    const photoRecord = await this.persistToDatabase(
      userId,
      photoUrl,
      blobName,
      processed.mimeType,
      file.mimetype,
      file.size,
      processed.buffer.length,
      validationResult.dimensions || null,
      moderationResult,
      photoType,
      gallery,
      caption,
      requestId
    );

    this.log(requestId, 'PIPELINE_COMPLETE', {
      photoId: photoRecord.id,
      url: photoUrl
    });

    return {
      photoId: photoRecord.id,
      url: photoUrl,
      blobName,
      requestId,
      originalSize: file.size,
      processedSize: processed.buffer.length,
      sizeReduction: ((file.size - processed.buffer.length) / file.size * 100).toFixed(2) + '%',
      dimensions: validationResult.dimensions || null,
      mimeType: processed.mimeType,
      originalMimeType: file.mimetype,
      moderation: {
        decision: moderationResult.category,
        approved: moderationResult.approved,
        reason: moderationResult.reason,
        contentType: moderationResult.contentType,
        confidence: moderationResult.confidence,
        processingTime: moderationResult.processingTime
      },
      exifStripped: true
    };
  }
}

// Export singleton instance
export const photoPipeline = new PhotoPipeline();
