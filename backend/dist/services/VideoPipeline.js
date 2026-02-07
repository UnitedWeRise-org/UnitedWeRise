"use strict";
/**
 * VideoPipeline Service
 *
 * Reusable video processing pipeline supporting reels and post attachments.
 *
 * Architecture:
 * - Stage 1: File validation (size, duration, format, dimensions)
 * - Stage 2: Metadata extraction (FFprobe for duration, codec, dimensions)
 * - Stage 3: Upload raw video to blob storage
 * - Stage 4: Thumbnail generation (extract frame at 0.5s mark)
 * - Stage 5: Database persistence (MUST happen before encoding)
 * - Stage 6: Queue encoding job (record must exist for encoding to update)
 *
 * CRITICAL: Stages 5-6 order matters! The database record must exist
 * before encoding runs, or the encoding service cannot update the record
 * with mp4Url/hlsManifestUrl when encoding completes.
 *
 * Features:
 * - Structured logging with requestId tracing
 * - Type-safe interfaces
 * - Comprehensive error handling
 * - Extensible for different video types (REEL, POST_ATTACHMENT)
 *
 * @module services/VideoPipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoPipeline = exports.VideoPipeline = void 0;
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const prisma_js_1 = require("../lib/prisma.js");
const logger_1 = require("./logger");
const VideoStorageService_1 = require("./VideoStorageService");
const VideoEncodingService_1 = require("./VideoEncodingService");
const moderationService_1 = require("./moderationService");
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
class VideoPipeline {
    // ========================================
    // Logging
    // ========================================
    log(requestId, stage, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            requestId,
            stage,
            ...data
        };
        logger_1.logger.info(logEntry, `VideoPipeline: ${stage}`);
    }
    // ========================================
    // Stage 1: File Validation
    // ========================================
    async validateFile(file, requestId) {
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
    async extractMetadata(filePath, requestId) {
        this.log(requestId, 'METADATA_EXTRACTION_START', { filePath });
        return new Promise((resolve, reject) => {
            const ffprobe = (0, child_process_1.spawn)('ffprobe', [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                '-select_streams', 'v:0',
                '-i', filePath
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
                    let width = videoStream.width;
                    let height = videoStream.height;
                    const duration = parseFloat(format?.duration || videoStream.duration || '0');
                    // Detect rotation from metadata — phones record landscape with rotation tag
                    let rotation = 0;
                    // Method 1: tags.rotate (older MP4/MOV containers)
                    if (videoStream.tags?.rotate) {
                        rotation = parseInt(videoStream.tags.rotate, 10) || 0;
                    }
                    // Method 2: side_data_list Display Matrix (modern containers)
                    if (!rotation && Array.isArray(videoStream.side_data_list)) {
                        const displayMatrix = videoStream.side_data_list.find((sd) => sd.side_data_type === 'Display Matrix');
                        if (displayMatrix?.rotation !== undefined) {
                            rotation = displayMatrix.rotation;
                        }
                    }
                    // Swap dimensions for 90/270 degree rotation (portrait videos)
                    const absRotation = Math.abs(rotation) % 360;
                    if (absRotation === 90 || absRotation === 270) {
                        [width, height] = [height, width];
                        this.log(requestId, 'ROTATION_DETECTED', { rotation, swapped: true, displayWidth: width, displayHeight: height });
                    }
                    // Determine aspect ratio category
                    const ratio = width / height;
                    let aspectRatio = 'CUSTOM';
                    if (ratio >= ASPECT_RATIO_THRESHOLDS.VERTICAL_9_16.min &&
                        ratio <= ASPECT_RATIO_THRESHOLDS.VERTICAL_9_16.max) {
                        aspectRatio = 'VERTICAL_9_16';
                    }
                    else if (ratio >= ASPECT_RATIO_THRESHOLDS.PORTRAIT_4_5.min &&
                        ratio <= ASPECT_RATIO_THRESHOLDS.PORTRAIT_4_5.max) {
                        aspectRatio = 'PORTRAIT_4_5';
                    }
                    else if (ratio >= ASPECT_RATIO_THRESHOLDS.SQUARE_1_1.min &&
                        ratio <= ASPECT_RATIO_THRESHOLDS.SQUARE_1_1.max) {
                        aspectRatio = 'SQUARE_1_1';
                    }
                    else if (ratio >= ASPECT_RATIO_THRESHOLDS.HORIZONTAL_16_9.min &&
                        ratio <= ASPECT_RATIO_THRESHOLDS.HORIZONTAL_16_9.max) {
                        aspectRatio = 'HORIZONTAL_16_9';
                    }
                    else if (ratio < 1) {
                        aspectRatio = 'PORTRAIT_CUSTOM';
                    }
                    else {
                        aspectRatio = 'LANDSCAPE_CUSTOM';
                    }
                    const metadata = {
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
                }
                catch (error) {
                    this.log(requestId, 'METADATA_EXTRACTION_PARSE_ERROR', { error, stdout });
                    reject(new Error('Failed to parse video metadata'));
                }
            });
            ffprobe.on('error', (error) => {
                this.log(requestId, 'METADATA_EXTRACTION_ERROR', { error: error.message });
                reject(new Error(`FFprobe error: ${error.message}. Make sure ffmpeg is installed.`));
            });
        });
    }
    // ========================================
    // Stage 3: Upload Raw Video
    // ========================================
    async uploadRawVideo(filePath, videoId, mimeType, originalname, fileSize, requestId) {
        this.log(requestId, 'RAW_UPLOAD_START', { videoId, filePath, size: fileSize });
        const result = await VideoStorageService_1.videoStorageService.uploadRawVideo(filePath, videoId, mimeType, originalname);
        this.log(requestId, 'RAW_UPLOAD_COMPLETE', { videoId, blobName: result.blobName });
        return result;
    }
    // ========================================
    // Stage 4: Queue Encoding Job
    // ========================================
    async queueEncodingJob(videoId, inputUrl, requestId) {
        this.log(requestId, 'ENCODING_QUEUE_START', { videoId });
        if (!VideoEncodingService_1.videoEncodingService.isAvailable()) {
            this.log(requestId, 'ENCODING_SERVICE_UNAVAILABLE', { videoId });
            // Return null to indicate encoding is not available
            // Video will remain in PENDING state until manually processed
            return null;
        }
        const jobName = await VideoEncodingService_1.videoEncodingService.submitEncodingJob(videoId, inputUrl);
        this.log(requestId, 'ENCODING_QUEUE_COMPLETE', { videoId, jobName });
        return jobName;
    }
    // ========================================
    // Stage 5: Thumbnail Generation
    // ========================================
    async generateThumbnail(filePath, videoId, requestId) {
        this.log(requestId, 'THUMBNAIL_GENERATION_START', { videoId, filePath });
        // Diagnostic: Check if FFmpeg is available
        try {
            const { execSync } = require('child_process');
            const ffmpegPath = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
            this.log(requestId, 'THUMBNAIL_FFMPEG_CHECK', { videoId, ffmpegPath, status: 'found' });
        }
        catch (ffmpegCheckError) {
            logger_1.logger.error({ videoId, requestId, error: ffmpegCheckError }, 'FFmpeg not found on system PATH - thumbnail generation will fail');
            this.log(requestId, 'THUMBNAIL_FFMPEG_CHECK', { videoId, status: 'not_found' });
            return undefined;
        }
        return new Promise((resolve) => {
            const ffmpeg = (0, child_process_1.spawn)('ffmpeg', [
                '-i', filePath,
                '-ss', '0.5', // Seek to 0.5 seconds (earlier for short videos)
                '-vframes', '1', // Extract 1 frame
                '-f', 'image2pipe',
                '-vcodec', 'mjpeg',
                '-q:v', '2', // Quality (2 is high quality)
                'pipe:1'
            ]);
            const chunks = [];
            let stderrOutput = '';
            ffmpeg.stdout.on('data', (data) => {
                chunks.push(data);
            });
            ffmpeg.stderr.on('data', (data) => {
                stderrOutput += data.toString();
            });
            ffmpeg.on('close', async (code) => {
                if (code !== 0 || chunks.length === 0) {
                    this.log(requestId, 'THUMBNAIL_GENERATION_FAILED', {
                        videoId,
                        code,
                        chunksLength: chunks.length,
                        stderr: stderrOutput.slice(-500) // Last 500 chars for diagnostics
                    });
                    resolve(undefined);
                    return;
                }
                const thumbnailBuffer = Buffer.concat(chunks);
                try {
                    const result = await VideoStorageService_1.videoStorageService.uploadThumbnail(thumbnailBuffer, videoId, 'image/jpeg');
                    this.log(requestId, 'THUMBNAIL_GENERATION_COMPLETE', {
                        videoId,
                        url: result.url
                    });
                    resolve(result.url);
                }
                catch (error) {
                    this.log(requestId, 'THUMBNAIL_UPLOAD_FAILED', { videoId, error });
                    resolve(undefined);
                }
            });
            ffmpeg.on('error', (error) => {
                this.log(requestId, 'THUMBNAIL_GENERATION_ERROR', { videoId, error: error.message });
                resolve(undefined);
            });
        });
    }
    // ========================================
    // Stage 6: Database Persistence
    // ========================================
    async persistToDatabase(videoId, userId, uploadResult, metadata, originalSize, originalMimeType, thumbnailUrl, options, requestId) {
        this.log(requestId, 'DB_PERSIST_START', { videoId, userId });
        // Extract hashtags from caption
        const hashtags = this.extractHashtags(options.caption);
        const videoRecord = await prisma_js_1.prisma.video.create({
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
    async process(options) {
        const { userId, requestId, file, videoType = 'REEL', caption, postId } = options;
        const videoId = (0, uuid_1.v4)();
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
            const metadata = await this.extractMetadata(file.path, requestId);
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
            // Stage 3: Upload raw video (streams from disk, no buffer in memory)
            const uploadResult = await this.uploadRawVideo(file.path, videoId, file.mimetype, file.originalname, file.size, requestId);
            // Stage 4: Generate thumbnail (with timeout, reads from disk file)
            const thumbnailPromise = this.generateThumbnail(file.path, videoId, requestId);
            let thumbnailUrl;
            try {
                thumbnailUrl = await Promise.race([
                    thumbnailPromise,
                    new Promise((resolve) => {
                        setTimeout(() => {
                            this.log(requestId, 'THUMBNAIL_GENERATION_TIMEOUT', { videoId });
                            resolve(undefined);
                        }, 30000);
                    })
                ]);
            }
            catch {
                thumbnailUrl = undefined;
            }
            if (!thumbnailUrl) {
                this.log(requestId, 'THUMBNAIL_GENERATION_RESOLVED_EMPTY', { videoId });
            }
            // Stage 5: Persist to database FIRST (before encoding)
            // CRITICAL: Record must exist before encoding tries to update it
            await this.persistToDatabase(videoId, userId, uploadResult, metadata, file.size, file.mimetype, thumbnailUrl, { videoType, caption, postId }, requestId);
            // Stage 5b: Caption text moderation (before encoding to save resources)
            if (caption && caption.trim().length > 0) {
                try {
                    this.log(requestId, 'CAPTION_MODERATION_START', { videoId });
                    await moderationService_1.moderationService.analyzeContent(caption, 'VIDEO', videoId);
                    // Check if caption moderation rejected the video
                    const moderationCheck = await prisma_js_1.prisma.video.findUnique({
                        where: { id: videoId },
                        select: { moderationStatus: true, moderationReason: true }
                    });
                    if (moderationCheck?.moderationStatus === 'REJECTED') {
                        this.log(requestId, 'CAPTION_MODERATION_REJECTED', {
                            videoId,
                            reason: moderationCheck.moderationReason
                        });
                        // Still return the video record — frontend shows rejection reason
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
                    }
                    this.log(requestId, 'CAPTION_MODERATION_PASSED', { videoId });
                }
                catch (error) {
                    logger_1.logger.error({ error, videoId, requestId }, 'Caption moderation failed — proceeding with encoding');
                }
            }
            // Stage 6: Queue encoding job (always async via worker)
            try {
                this.log(requestId, 'ENCODING_JOB_QUEUING', { videoId });
                await this.queueEncodingJob(videoId, uploadResult.url, requestId);
                this.log(requestId, 'ENCODING_JOB_QUEUED', { videoId });
            }
            catch (error) {
                logger_1.logger.error({ error, videoId, requestId }, 'Failed to queue encoding job');
                // Continue - video record exists, can be retried
            }
            this.log(requestId, 'PIPELINE_COMPLETE', { videoId });
            // Always return with current status (encoding happens async via worker)
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
        }
        catch (error) {
            this.log(requestId, 'PIPELINE_FAILED', {
                videoId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Attempt cleanup
            try {
                await VideoStorageService_1.videoStorageService.deleteVideo(videoId);
            }
            catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }
    // ========================================
    // Private Helpers
    // ========================================
    parseFps(frameRate) {
        if (!frameRate)
            return undefined;
        const [num, den] = frameRate.split('/').map(Number);
        return den ? num / den : num;
    }
    extractHashtags(caption) {
        if (!caption)
            return [];
        const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
        const matches = caption.match(hashtagRegex);
        return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
    }
}
exports.VideoPipeline = VideoPipeline;
// Export singleton instance
exports.videoPipeline = new VideoPipeline();
//# sourceMappingURL=VideoPipeline.js.map