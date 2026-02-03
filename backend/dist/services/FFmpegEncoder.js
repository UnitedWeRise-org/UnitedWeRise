"use strict";
/**
 * FFmpegEncoder Service
 *
 * Handles multi-resolution HLS encoding using FFmpeg with two-phase pipeline:
 * - Phase 1: Encode 720p, upload, set READY (video is watchable)
 * - Phase 2: Encode 360p, upload, update manifest (adds adaptive bitrate)
 *
 * Also provides frame extraction (for visual moderation) and audio extraction
 * (for transcription-based moderation).
 *
 * Output Structure:
 * videos-encoded/{videoId}/
 * ├── manifest.m3u8      # Master HLS playlist (720p-only initially, updated with 360p)
 * ├── 720p/playlist.m3u8 # 720p variant
 * ├── 720p/seg_*.ts      # 720p segments
 * ├── 360p/playlist.m3u8 # 360p variant (added in Phase 2)
 * └── 360p/seg_*.ts      # 360p segments (added in Phase 2)
 *
 * @module services/FFmpegEncoder
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ffmpegEncoder = exports.FFmpegEncoder = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger_1 = require("./logger");
const VideoStorageService_1 = require("./VideoStorageService");
const prisma_js_1 = require("../lib/prisma.js");
// ========================================
// Constants
// ========================================
/**
 * Quality levels defined by max long-edge rather than fixed W×H.
 * The encoder computes actual output dimensions per-video to preserve
 * the original aspect ratio (vertical, horizontal, square, etc.).
 */
const QUALITY_LEVELS = [
    { name: '720p', maxLongEdge: 1280, videoBitrate: '2500k', audioBitrate: '128k', bandwidth: 2628000 },
    { name: '360p', maxLongEdge: 640, videoBitrate: '600k', audioBitrate: '64k', bandwidth: 664000 }
];
/** Primary tier encoded first - video becomes watchable after this tier completes */
const PRIMARY_LEVEL = QUALITY_LEVELS[0]; // 720p
/** Secondary tier encoded after primary - adds adaptive bitrate support */
const SECONDARY_LEVEL = QUALITY_LEVELS[1]; // 360p
const HLS_SEGMENT_DURATION = 6; // seconds
const FFMPEG_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const FRAME_EXTRACT_TIMEOUT = 60 * 1000; // 1 minute for frame extraction
const AUDIO_EXTRACT_TIMEOUT = 2 * 60 * 1000; // 2 minutes for audio extraction
// ========================================
// FFmpegEncoder Class
// ========================================
class FFmpegEncoder {
    tempDir;
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'uwr-video-encoding');
    }
    /**
     * Check if FFmpeg is available
     */
    async isAvailable() {
        return new Promise((resolve) => {
            const proc = (0, child_process_1.spawn)('ffmpeg', ['-version']);
            proc.on('close', (code) => resolve(code === 0));
            proc.on('error', () => resolve(false));
        });
    }
    /**
     * Compute output dimensions for a quality level, preserving input aspect ratio.
     * Scales the long edge down to maxLongEdge (or keeps original if smaller),
     * and ensures both dimensions are even (h264 requirement).
     *
     * @param inputWidth - Original video width
     * @param inputHeight - Original video height
     * @param maxLongEdge - Maximum size for the longer dimension
     * @returns Output width and height preserving original orientation
     */
    computeOutputDimensions(inputWidth, inputHeight, maxLongEdge) {
        const longEdge = Math.max(inputWidth, inputHeight);
        const shortEdge = Math.min(inputWidth, inputHeight);
        const scale = Math.min(1, maxLongEdge / longEdge);
        let outLong = Math.round(longEdge * scale);
        let outShort = Math.round(shortEdge * scale);
        // h264 requires even dimensions
        outLong -= outLong % 2;
        outShort -= outShort % 2;
        return inputWidth >= inputHeight
            ? { width: outLong, height: outShort } // landscape or square
            : { width: outShort, height: outLong }; // portrait
    }
    /**
     * Fetch video dimensions from database and resolve quality levels with
     * computed output dimensions preserving original aspect ratio.
     *
     * @param videoId - Video record ID
     * @param levels - Quality levels to resolve
     * @returns Resolved levels with computed width/height
     */
    async resolveVideoLevels(videoId, levels) {
        const videoRecord = await prisma_js_1.prisma.video.findUnique({
            where: { id: videoId },
            select: { width: true, height: true }
        });
        if (!videoRecord?.width || !videoRecord?.height) {
            throw new Error(`Video ${videoId} missing width/height in database`);
        }
        const resolvedLevels = levels.map(level => ({
            ...level,
            ...this.computeOutputDimensions(videoRecord.width, videoRecord.height, level.maxLongEdge)
        }));
        return {
            inputWidth: videoRecord.width,
            inputHeight: videoRecord.height,
            resolvedLevels
        };
    }
    /**
     * Phase 1: Encode 720p tier and make video watchable.
     *
     * Encodes only the primary (720p) quality level, uploads segments and a
     * single-tier HLS manifest, and sets encodingStatus='READY'. The video
     * becomes publishable and watchable after this phase completes.
     *
     * The work directory is NOT cleaned up — Phase 2 reuses it.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @returns Phase 1 result with manifest URL and work directory path
     */
    async encodePhase1(videoId, inputBlobName) {
        const workDir = path.join(this.tempDir, videoId);
        try {
            await fs_1.promises.mkdir(workDir, { recursive: true });
            const inputUrl = VideoStorageService_1.videoStorageService.generateRawBlobSasUrl(inputBlobName, 30);
            const { inputWidth, inputHeight, resolvedLevels } = await this.resolveVideoLevels(videoId, [PRIMARY_LEVEL]);
            // Update status to ENCODING
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'ENCODING',
                    encodingStartedAt: new Date()
                }
            });
            logger_1.logger.info({ videoId, inputBlobName, workDir, inputWidth, inputHeight }, 'Starting Phase 1 encoding (720p)');
            // Encode 720p only
            await this.generateHLS(videoId, inputUrl, workDir, resolvedLevels);
            // Generate single-tier manifest
            await this.generateMasterManifest(videoId, workDir, resolvedLevels);
            // Upload 720p outputs + manifest
            const { hlsManifestUrl } = await this.uploadOutputs(videoId, workDir, resolvedLevels);
            // Video is now watchable — set READY with PARTIAL tiers
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'READY',
                    encodingCompletedAt: new Date(),
                    hlsManifestUrl,
                    mp4Url: null,
                    encodingTiersStatus: 'PARTIAL'
                }
            });
            logger_1.logger.info({ videoId, hlsManifestUrl }, 'Phase 1 encoding complete — video is watchable at 720p');
            return {
                success: true,
                hlsManifestUrl,
                workDir
            };
        }
        catch (error) {
            logger_1.logger.error({ error, videoId }, 'Phase 1 encoding failed');
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'FAILED',
                    encodingCompletedAt: new Date(),
                    encodingError: error.message,
                    encodingTiersStatus: 'NONE'
                }
            });
            // Cleanup on failure
            try {
                await fs_1.promises.rm(workDir, { recursive: true, force: true });
            }
            catch {
                // Ignore cleanup errors
            }
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Phase 2: Encode 360p tier and update manifest for adaptive bitrate.
     *
     * Encodes the secondary (360p) quality level, uploads segments, and
     * regenerates the master manifest to include both 720p and 360p tiers.
     * The same manifest URL is overwritten so existing players pick up the
     * new tier on their next manifest fetch.
     *
     * Non-fatal: if this fails, the video remains watchable at 720p.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @returns Phase 2 result
     */
    async encodePhase2(videoId, inputBlobName) {
        const workDir = path.join(this.tempDir, videoId);
        try {
            await fs_1.promises.mkdir(workDir, { recursive: true });
            // Fresh SAS URL for Phase 2 (Phase 1's may have expired)
            const inputUrl = VideoStorageService_1.videoStorageService.generateRawBlobSasUrl(inputBlobName, 30);
            const { resolvedLevels: secondaryLevels } = await this.resolveVideoLevels(videoId, [SECONDARY_LEVEL]);
            const { resolvedLevels: allLevels } = await this.resolveVideoLevels(videoId, QUALITY_LEVELS);
            logger_1.logger.info({ videoId }, 'Starting Phase 2 encoding (360p)');
            // Encode 360p only
            await this.generateHLS(videoId, inputUrl, workDir, secondaryLevels);
            // Regenerate master manifest with BOTH tiers
            await this.generateMasterManifest(videoId, workDir, allLevels);
            // Upload 360p outputs + updated manifest
            await this.uploadOutputs(videoId, workDir, secondaryLevels);
            // Re-upload the updated master manifest (overwrites 720p-only manifest)
            const masterManifest = await fs_1.promises.readFile(path.join(workDir, 'manifest.m3u8'));
            await VideoStorageService_1.videoStorageService.uploadEncodedFile(masterManifest, videoId, 'manifest.m3u8', 'application/vnd.apple.mpegurl');
            // All tiers complete
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: { encodingTiersStatus: 'ALL' }
            });
            logger_1.logger.info({ videoId }, 'Phase 2 encoding complete — adaptive bitrate enabled (720p + 360p)');
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error, videoId }, 'Phase 2 encoding failed — video remains 720p-only');
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: { encodingTiersStatus: 'PARTIAL_FAILED' }
            });
            return {
                success: false,
                error: error.message
            };
        }
        finally {
            // Phase 2 is terminal — always cleanup work directory
            try {
                await fs_1.promises.rm(workDir, { recursive: true, force: true });
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Legacy single-pass encode (both tiers in parallel).
     * Retained as fallback when VIDEO_ENCODING_TWO_PHASE is not enabled.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @returns Encoding result with URLs
     */
    async encode(videoId, inputBlobName) {
        const workDir = path.join(this.tempDir, videoId);
        try {
            await fs_1.promises.mkdir(workDir, { recursive: true });
            const inputUrl = VideoStorageService_1.videoStorageService.generateRawBlobSasUrl(inputBlobName, 30);
            const { inputWidth, inputHeight, resolvedLevels } = await this.resolveVideoLevels(videoId, QUALITY_LEVELS);
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'ENCODING',
                    encodingStartedAt: new Date()
                }
            });
            logger_1.logger.info({ videoId, inputBlobName, workDir, inputWidth, inputHeight }, 'Starting FFmpeg encoding (legacy single-pass)');
            await this.generateHLS(videoId, inputUrl, workDir, resolvedLevels);
            await this.generateMasterManifest(videoId, workDir, resolvedLevels);
            const { hlsManifestUrl } = await this.uploadOutputs(videoId, workDir, resolvedLevels);
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'READY',
                    encodingCompletedAt: new Date(),
                    hlsManifestUrl,
                    mp4Url: null,
                    encodingTiersStatus: 'ALL'
                }
            });
            logger_1.logger.info({ videoId, hlsManifestUrl }, 'FFmpeg encoding completed successfully (legacy single-pass)');
            return {
                success: true,
                hlsManifestUrl
            };
        }
        catch (error) {
            logger_1.logger.error({ error, videoId }, 'FFmpeg encoding failed');
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'FAILED',
                    encodingCompletedAt: new Date(),
                    encodingError: error.message
                }
            });
            return {
                success: false,
                error: error.message
            };
        }
        finally {
            try {
                await fs_1.promises.rm(workDir, { recursive: true, force: true });
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Extract evenly-spaced frames from a video for visual content moderation.
     * Uses FFmpeg to select frames at regular intervals throughout the video.
     *
     * @param inputUrl - SAS URL or local path to the video file
     * @param workDir - Directory to write extracted frame images
     * @param frameCount - Number of frames to extract (default 6)
     * @param duration - Video duration in seconds (used to calculate intervals)
     * @returns Array of file paths to extracted JPEG frames
     */
    async extractFrames(inputUrl, workDir, frameCount = 6, duration = 60) {
        const framesDir = path.join(workDir, 'moderation-frames');
        await fs_1.promises.mkdir(framesDir, { recursive: true });
        // Calculate interval between frames (avoid first/last 5% of video)
        const safeStart = Math.max(0.5, duration * 0.05);
        const safeEnd = Math.max(1, duration * 0.95);
        const interval = (safeEnd - safeStart) / Math.max(1, frameCount - 1);
        const framePaths = [];
        for (let i = 0; i < frameCount; i++) {
            const timestamp = safeStart + (interval * i);
            const outputPath = path.join(framesDir, `frame_${String(i).padStart(3, '0')}.jpg`);
            const args = [
                '-ss', String(timestamp),
                '-i', inputUrl,
                '-vframes', '1',
                '-q:v', '2',
                outputPath
            ];
            try {
                await this.runFFmpeg(args, `frame extraction ${i + 1}/${frameCount}`, FRAME_EXTRACT_TIMEOUT);
                framePaths.push(outputPath);
            }
            catch (error) {
                logger_1.logger.warn({ error, frameIndex: i, timestamp }, 'Failed to extract frame, skipping');
            }
        }
        logger_1.logger.info({ frameCount: framePaths.length, requestedCount: frameCount }, 'Frame extraction complete');
        return framePaths;
    }
    /**
     * Extract audio track from a video as a WAV file for speech-to-text transcription.
     *
     * @param inputUrl - SAS URL or local path to the video file
     * @param workDir - Directory to write the extracted audio file
     * @returns Path to extracted WAV file, or null if no audio track
     */
    async extractAudio(inputUrl, workDir) {
        const audioPath = path.join(workDir, 'audio.wav');
        const args = [
            '-i', inputUrl,
            '-vn', // No video
            '-acodec', 'pcm_s16le', // 16-bit PCM WAV
            '-ar', '16000', // 16kHz sample rate (optimal for speech recognition)
            '-ac', '1', // Mono
            audioPath
        ];
        try {
            await this.runFFmpeg(args, 'audio extraction', AUDIO_EXTRACT_TIMEOUT);
            // Verify the file exists and has content
            const stats = await fs_1.promises.stat(audioPath);
            if (stats.size < 1000) {
                logger_1.logger.info('Extracted audio file too small — video likely has no audio track');
                return null;
            }
            logger_1.logger.info({ audioPath, sizeBytes: stats.size }, 'Audio extraction complete');
            return audioPath;
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Audio extraction failed — video may have no audio track');
            return null;
        }
    }
    /**
     * Generate HLS variants for specified quality levels with orientation-aware dimensions.
     *
     * @param videoId - Video record ID for logging
     * @param inputUrl - SAS URL to the raw video blob
     * @param workDir - Local temp directory for FFmpeg output
     * @param levels - Quality levels with computed output dimensions
     */
    async generateHLS(videoId, inputUrl, workDir, levels) {
        // Encode each level sequentially to avoid CPU contention on container
        for (const level of levels) {
            const outputDir = path.join(workDir, level.name);
            await fs_1.promises.mkdir(outputDir, { recursive: true });
            const playlistPath = path.join(outputDir, 'playlist.m3u8');
            const segmentPattern = path.join(outputDir, 'seg_%03d.ts');
            const args = [
                '-i', inputUrl,
                '-vf', `scale=${level.width}:${level.height}`,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-b:v', level.videoBitrate,
                '-maxrate', level.videoBitrate,
                '-bufsize', `${parseInt(level.videoBitrate) * 2}k`,
                '-c:a', 'aac',
                '-b:a', level.audioBitrate,
                '-hls_time', String(HLS_SEGMENT_DURATION),
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', segmentPattern,
                '-f', 'hls',
                playlistPath
            ];
            await this.runFFmpeg(args, `HLS ${level.name}`);
            logger_1.logger.info({ videoId, level: level.name, width: level.width, height: level.height }, 'HLS variant generated');
        }
    }
    /**
     * Generate master HLS manifest with actual computed dimensions per level.
     *
     * @param videoId - Video record ID for logging
     * @param workDir - Local temp directory containing variant playlists
     * @param levels - Quality levels with computed output dimensions
     */
    async generateMasterManifest(videoId, workDir, levels) {
        const manifestPath = path.join(workDir, 'manifest.m3u8');
        let content = '#EXTM3U\n#EXT-X-VERSION:3\n';
        for (const level of levels) {
            content += `#EXT-X-STREAM-INF:BANDWIDTH=${level.bandwidth},RESOLUTION=${level.width}x${level.height}\n`;
            content += `${level.name}/playlist.m3u8\n`;
        }
        await fs_1.promises.writeFile(manifestPath, content, 'utf-8');
        logger_1.logger.info({ videoId, levels: levels.map(l => l.name) }, 'Master manifest generated');
    }
    /**
     * Upload encoded outputs (segments, playlists, manifest) to blob storage.
     *
     * @param videoId - Video record ID
     * @param workDir - Local temp directory containing encoded files
     * @param levels - Quality levels whose outputs should be uploaded
     * @returns Object with HLS manifest URL
     */
    async uploadOutputs(videoId, workDir, levels) {
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'uwrstorage2425';
        const baseUrl = `https://${accountName}.blob.core.windows.net/videos-encoded/${videoId}`;
        // Upload master manifest
        const manifestPath = path.join(workDir, 'manifest.m3u8');
        try {
            const masterManifest = await fs_1.promises.readFile(manifestPath);
            await VideoStorageService_1.videoStorageService.uploadEncodedFile(masterManifest, videoId, 'manifest.m3u8', 'application/vnd.apple.mpegurl');
        }
        catch {
            // Manifest may not exist yet if uploading only secondary tier segments
        }
        // Upload HLS variant segments for specified levels only
        for (const level of levels) {
            const levelDir = path.join(workDir, level.name);
            const files = await fs_1.promises.readdir(levelDir);
            for (const file of files) {
                const filePath = path.join(levelDir, file);
                const fileBuffer = await fs_1.promises.readFile(filePath);
                const mimeType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
                const blobName = `${level.name}/${file}`;
                await VideoStorageService_1.videoStorageService.uploadEncodedFile(fileBuffer, videoId, blobName, mimeType);
            }
            logger_1.logger.info({ videoId, level: level.name, fileCount: files.length }, 'HLS variant uploaded');
        }
        return {
            hlsManifestUrl: `${baseUrl}/manifest.m3u8`
        };
    }
    /**
     * Run FFmpeg command with timeout
     *
     * @param args - FFmpeg arguments
     * @param label - Human-readable label for logging
     * @param timeout - Timeout in milliseconds (defaults to FFMPEG_TIMEOUT)
     */
    runFFmpeg(args, label, timeout = FFMPEG_TIMEOUT) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', ...args]);
            let stderr = '';
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            const timer = setTimeout(() => {
                proc.kill('SIGKILL');
                reject(new Error(`FFmpeg ${label} timed out after ${timeout / 1000}s`));
            }, timeout);
            proc.on('close', (code) => {
                clearTimeout(timer);
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`FFmpeg ${label} failed with code ${code}: ${stderr.slice(-500)}`));
                }
            });
            proc.on('error', (error) => {
                clearTimeout(timer);
                reject(new Error(`FFmpeg ${label} error: ${error.message}`));
            });
        });
    }
}
exports.FFmpegEncoder = FFmpegEncoder;
// Export singleton instance
exports.ffmpegEncoder = new FFmpegEncoder();
//# sourceMappingURL=FFmpegEncoder.js.map