/**
 * VideoPipeline Service
 *
 * Reusable video processing pipeline supporting reels and post attachments.
 *
 * Architecture:
 * - Stage 1: File validation (size, duration, format, dimensions)
 * - Stage 2: Metadata extraction (FFprobe for duration, codec, dimensions)
 * - Stage 3: Upload raw video to blob storage
 * - Stage 4: Queue encoding job (Azure Media Services)
 * - Stage 5: Thumbnail generation (extract frame at 1s mark)
 * - Stage 6: Database persistence
 *
 * Features:
 * - Structured logging with requestId tracing
 * - Type-safe interfaces
 * - Comprehensive error handling
 * - Extensible for different video types (REEL, POST_ATTACHMENT)
 *
 * @module services/VideoPipeline
 */

import { spawn } from 'child_process';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { logger } from './logger';
import { videoStorageService, VideoUploadResult } from './VideoStorageService';
import { videoEncodingService } from './VideoEncodingService';

// ========================================
// Type Definitions
// ========================================

export interface VideoFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

export interface VideoProcessingOptions {
  userId: string;
  requestId: string;
  file: VideoFile;
  videoType?: 'REEL' | 'POST_ATTACHMENT';
  caption?: string;
  postId?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  codec: string;
  bitrate?: number;
  fps?: number;
}

export interface VideoProcessingResult {
  videoId: string;
  originalUrl: string;
  originalBlobName: string;
  thumbnailUrl?: string;
  requestId: string;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  originalSize: number;
  originalMimeType: string;
  encodingStatus: 'PENDING';
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ========================================
// Constants
// ========================================

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska' // .mkv
];

const ALLOWED_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];

// Configuration from environment or defaults
const MAX_FILE_SIZE = parseInt(process.env.VIDEO_MAX_SIZE_BYTES || '524288000', 10); // 500MB
const MAX_DURATION = parseInt(process.env.VIDEO_MAX_DURATION_SECONDS || '180', 10); // 3 minutes
const MIN_DURATION = 1; // 1 second minimum

const MAX_DIMENSION = 4096; // 4K max
const MIN_DIMENSION = 144; // Min height for 144p

// Aspect ratio detection thresholds
const ASPECT_RATIO_THRESHOLDS = {
  VERTICAL_9_16: { min: 0.5, max: 0.65 }, // 9:16 = 0.5625
  PORTRAIT_4_5: { min: 0.75, max: 0.85 }, // 4:5 = 0.8
  SQUARE_1_1: { min: 0.95, max: 1.05 }, // 1:1 = 1.0
  HORIZONTAL_16_9: { min: 1.7, max: 1.85 } // 16:9 = 1.777
};

// ========================================
// VideoPipeline Class
// ========================================

export class VideoPipeline {

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
    logger.info(logEntry, `VideoPipeline: ${stage}`);
  }

  // ========================================
  // Stage 1: File Validation
  // ========================================

  async validateFile(file: VideoFile, requestId: string): Promise<ValidationResult> {
    this.log(requestId, 'VALIDATION_START', {
      size: file.size,
      mimeType: file.mimetype,
      originalname: file.originalname
    });

    // Size validation
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

    this.log(requestId, 'VALIDATION_PASSED', {
      size: file.size,
      mimeType: file.mimetype
    });

    return { valid: true };
  }

  // ========================================
  // Stage 2: Metadata Extraction (FFprobe)
  // ========================================

  async extractMetadata(buffer: Buffer, requestId: string): Promise<VideoMetadata> {
    this.log(requestId, 'METADATA_EXTRACTION_START', { bufferSize: buffer.length });

    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '-select_streams', 'v:0',
        '-i', 'pipe:0'
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          this.log(requestId, 'METADATA_EXTRACTION_FAILED', { code, stderr });
          reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          const videoStream = result.streams?.[0];
          const format = result.format;

          if (!videoStream) {
            throw new Error('No video stream found');
          }

          const width = videoStream.width;
          const height = videoStream.height;
          const duration = parseFloat(format?.duration || videoStream.duration || '0');

          // Determine aspect ratio category
          const ratio = width / height;
          let aspectRatio = 'CUSTOM';

          if (ratio >= ASPECT_RATIO_THRESHOLDS.VERTICAL_9_16.min &&
              ratio <= ASPECT_RATIO_THRESHOLDS.VERTICAL_9_16.max) {
            aspectRatio = 'VERTICAL_9_16';
          } else if (ratio >= ASPECT_RATIO_THRESHOLDS.PORTRAIT_4_5.min &&
                     ratio <= ASPECT_RATIO_THRESHOLDS.PORTRAIT_4_5.max) {
            aspectRatio = 'PORTRAIT_4_5';
          } else if (ratio >= ASPECT_RATIO_THRESHOLDS.SQUARE_1_1.min &&
                     ratio <= ASPECT_RATIO_THRESHOLDS.SQUARE_1_1.max) {
            aspectRatio = 'SQUARE_1_1';
          } else if (ratio >= ASPECT_RATIO_THRESHOLDS.HORIZONTAL_16_9.min &&
                     ratio <= ASPECT_RATIO_THRESHOLDS.HORIZONTAL_16_9.max) {
            aspectRatio = 'HORIZONTAL_16_9';
          } else if (ratio < 1) {
            aspectRatio = 'PORTRAIT_CUSTOM';
          } else {
            aspectRatio = 'LANDSCAPE_CUSTOM';
          }

          const metadata: VideoMetadata = {
            duration,
            width,
            height,
            aspectRatio,
            codec: videoStream.codec_name || 'unknown',
            bitrate: parseInt(format?.bit_rate || '0', 10) || undefined,
            fps: this.parseFps(videoStream.r_frame_rate)
          };

          this.log(requestId, 'METADATA_EXTRACTION_COMPLETE', metadata);
          resolve(metadata);
        } catch (error) {
          this.log(requestId, 'METADATA_EXTRACTION_PARSE_ERROR', { error, stdout });
          reject(new Error('Failed to parse video metadata'));
        }
      });

      ffprobe.on('error', (error) => {
        this.log(requestId, 'METADATA_EXTRACTION_ERROR', { error: error.message });
        reject(new Error(`FFprobe error: ${error.message}. Make sure ffmpeg is installed.`));
      });

      // Write buffer to stdin
      const readable = Readable.from(buffer);
      readable.pipe(ffprobe.stdin);
    });
  }

  // ========================================
  // Stage 3: Upload Raw Video
  // ========================================

  async uploadRawVideo(
    buffer: Buffer,
    videoId: string,
    mimeType: string,
    originalname: string | undefined,
    requestId: string
  ): Promise<VideoUploadResult> {
    this.log(requestId, 'RAW_UPLOAD_START', { videoId, size: buffer.length });

    const result = await videoStorageService.uploadRawVideo(
      buffer,
      videoId,
      mimeType,
      originalname
    );

    this.log(requestId, 'RAW_UPLOAD_COMPLETE', { videoId, blobName: result.blobName });
    return result;
  }

  // ========================================
  // Stage 4: Queue Encoding Job
  // ========================================

  async queueEncodingJob(videoId: string, inputUrl: string, requestId: string): Promise<string | null> {
    this.log(requestId, 'ENCODING_QUEUE_START', { videoId });

    if (!videoEncodingService.isAvailable()) {
      this.log(requestId, 'ENCODING_SERVICE_UNAVAILABLE', { videoId });
      // Return null to indicate encoding is not available
      // Video will remain in PENDING state until manually processed
      return null;
    }

    const jobName = await videoEncodingService.submitEncodingJob(videoId, inputUrl);

    this.log(requestId, 'ENCODING_QUEUE_COMPLETE', { videoId, jobName });
    return jobName;
  }

  // ========================================
  // Stage 5: Thumbnail Generation
  // ========================================

  async generateThumbnail(
    buffer: Buffer,
    videoId: string,
    requestId: string
  ): Promise<string | undefined> {
    this.log(requestId, 'THUMBNAIL_GENERATION_START', { videoId });

    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-ss', '1', // Seek to 1 second
        '-vframes', '1', // Extract 1 frame
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-q:v', '2', // Quality (2 is high quality)
        'pipe:1'
      ]);

      const chunks: Buffer[] = [];

      ffmpeg.stdout.on('data', (data) => {
        chunks.push(data);
      });

      ffmpeg.on('close', async (code) => {
        if (code !== 0 || chunks.length === 0) {
          this.log(requestId, 'THUMBNAIL_GENERATION_FAILED', { videoId, code });
          resolve(undefined);
          return;
        }

        const thumbnailBuffer = Buffer.concat(chunks);

        try {
          const result = await videoStorageService.uploadThumbnail(
            thumbnailBuffer,
            videoId,
            'image/jpeg'
          );

          this.log(requestId, 'THUMBNAIL_GENERATION_COMPLETE', {
            videoId,
            url: result.url
          });

          resolve(result.url);
        } catch (error) {
          this.log(requestId, 'THUMBNAIL_UPLOAD_FAILED', { videoId, error });
          resolve(undefined);
        }
      });

      ffmpeg.on('error', (error) => {
        this.log(requestId, 'THUMBNAIL_GENERATION_ERROR', { videoId, error: error.message });
        resolve(undefined);
      });

      // Write buffer to stdin
      const readable = Readable.from(buffer);
      readable.pipe(ffmpeg.stdin);
    });
  }

  // ========================================
  // Stage 6: Database Persistence
  // ========================================

  async persistToDatabase(
    videoId: string,
    userId: string,
    uploadResult: VideoUploadResult,
    metadata: VideoMetadata,
    originalSize: number,
    originalMimeType: string,
    thumbnailUrl: string | undefined,
    options: {
      videoType: string;
      caption?: string;
      postId?: string;
    },
    requestId: string
  ): Promise<any> {
    this.log(requestId, 'DB_PERSIST_START', { videoId, userId });

    // Extract hashtags from caption
    const hashtags = this.extractHashtags(options.caption);

    const videoRecord = await prisma.video.create({
      data: {
        id: videoId,
        userId,
        postId: options.postId || null,
        videoType: options.videoType,
        originalUrl: uploadResult.url,
        originalBlobName: uploadResult.blobName,
        thumbnailUrl,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.aspectRatio,
        originalSize,
        originalMimeType,
        encodingStatus: 'PENDING',
        moderationStatus: 'PENDING',
        audioStatus: 'PENDING',
        caption: options.caption,
        hashtags,
        publishStatus: 'DRAFT',
        isActive: false
      }
    });

    this.log(requestId, 'DB_PERSIST_COMPLETE', { videoId: videoRecord.id });
    return videoRecord;
  }

  // ========================================
  // Main Orchestration Method
  // ========================================

  async process(options: VideoProcessingOptions): Promise<VideoProcessingResult> {
    const {
      userId,
      requestId,
      file,
      videoType = 'REEL',
      caption,
      postId
    } = options;

    const videoId = uuidv4();

    this.log(requestId, 'PIPELINE_START', {
      videoId,
      userId,
      fileSize: file.size,
      mimeType: file.mimetype,
      videoType
    });

    try {
      // Stage 1: Validate file
      const validationResult = await this.validateFile(file, requestId);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Stage 2: Extract metadata
      const metadata = await this.extractMetadata(file.buffer, requestId);

      // Validate duration
      if (metadata.duration < MIN_DURATION) {
        throw new Error(`Video too short. Minimum duration is ${MIN_DURATION} second.`);
      }
      if (metadata.duration > MAX_DURATION) {
        throw new Error(`Video too long. Maximum duration is ${MAX_DURATION} seconds (${MAX_DURATION / 60} minutes).`);
      }

      // Validate dimensions
      if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
        throw new Error(`Video resolution too low. Minimum dimension is ${MIN_DIMENSION}px.`);
      }
      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        throw new Error(`Video resolution too high. Maximum dimension is ${MAX_DIMENSION}px.`);
      }

      // Stage 3: Upload raw video
      const uploadResult = await this.uploadRawVideo(
        file.buffer,
        videoId,
        file.mimetype,
        file.originalname,
        requestId
      );

      // Stage 4: Queue encoding job (non-blocking)
      // Don't await this - let it run in background
      this.queueEncodingJob(videoId, uploadResult.url, requestId).catch((error) => {
        logger.error({ error, videoId }, 'Failed to queue encoding job');
      });

      // Stage 5: Generate thumbnail (non-blocking for fast response)
      const thumbnailPromise = this.generateThumbnail(file.buffer, videoId, requestId);

      // Wait for thumbnail (with timeout)
      let thumbnailUrl: string | undefined;
      try {
        thumbnailUrl = await Promise.race([
          thumbnailPromise,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 10000))
        ]);
      } catch {
        thumbnailUrl = undefined;
      }

      // Stage 6: Persist to database
      await this.persistToDatabase(
        videoId,
        userId,
        uploadResult,
        metadata,
        file.size,
        file.mimetype,
        thumbnailUrl,
        { videoType, caption, postId },
        requestId
      );

      this.log(requestId, 'PIPELINE_COMPLETE', { videoId });

      return {
        videoId,
        originalUrl: uploadResult.url,
        originalBlobName: uploadResult.blobName,
        thumbnailUrl,
        requestId,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.aspectRatio,
        originalSize: file.size,
        originalMimeType: file.mimetype,
        encodingStatus: 'PENDING'
      };

    } catch (error) {
      this.log(requestId, 'PIPELINE_FAILED', {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Attempt cleanup
      try {
        await videoStorageService.deleteVideo(videoId);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  // ========================================
  // Private Helpers
  // ========================================

  private parseFps(frameRate: string | undefined): number | undefined {
    if (!frameRate) return undefined;
    const [num, den] = frameRate.split('/').map(Number);
    return den ? num / den : num;
  }

  private extractHashtags(caption: string | undefined): string[] {
    if (!caption) return [];
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const matches = caption.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  }
}

// Export singleton instance
export const videoPipeline = new VideoPipeline();
