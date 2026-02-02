"use strict";
/**
 * FFmpegEncoder Service
 *
 * Handles multi-resolution HLS encoding using FFmpeg.
 * Outputs are uploaded to Azure Blob Storage.
 *
 * Output Structure:
 * videos-encoded/{videoId}/
 * ├── manifest.m3u8      # Master HLS playlist
 * ├── 720p/playlist.m3u8 # 720p variant
 * ├── 720p/seg_*.ts      # 720p segments
 * ├── 360p/playlist.m3u8 # 360p variant
 * └── 360p/seg_*.ts      # 360p segments
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
const HLS_SEGMENT_DURATION = 6; // seconds
const FFMPEG_TIMEOUT = 10 * 60 * 1000; // 10 minutes
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
     * Encode video to HLS with multiple resolutions.
     * Queries the database for original dimensions to produce orientation-aware
     * output (vertical input → vertical output, horizontal → horizontal).
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @returns Encoding result with URLs
     */
    async encode(videoId, inputBlobName) {
        const workDir = path.join(this.tempDir, videoId);
        try {
            // Create work directory
            await fs_1.promises.mkdir(workDir, { recursive: true });
            // Get SAS URL for input video
            const inputUrl = VideoStorageService_1.videoStorageService.generateRawBlobSasUrl(inputBlobName, 30);
            // Fetch original dimensions from DB (set by VideoPipeline before encoding)
            const videoRecord = await prisma_js_1.prisma.video.findUnique({
                where: { id: videoId },
                select: { width: true, height: true }
            });
            if (!videoRecord?.width || !videoRecord?.height) {
                throw new Error(`Video ${videoId} missing width/height in database`);
            }
            const inputWidth = videoRecord.width;
            const inputHeight = videoRecord.height;
            // Compute per-level output dimensions preserving original aspect ratio
            const levelDimensions = QUALITY_LEVELS.map(level => ({
                ...level,
                ...this.computeOutputDimensions(inputWidth, inputHeight, level.maxLongEdge)
            }));
            // Update status to ENCODING
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'ENCODING',
                    encodingStartedAt: new Date()
                }
            });
            logger_1.logger.info({ videoId, inputBlobName, workDir, inputWidth, inputHeight }, 'Starting FFmpeg encoding');
            // Generate HLS variants
            await this.generateHLS(videoId, inputUrl, workDir, levelDimensions);
            // Generate master manifest
            await this.generateMasterManifest(videoId, workDir, levelDimensions);
            // Upload all outputs to blob storage
            const { hlsManifestUrl } = await this.uploadOutputs(videoId, workDir);
            // Update database with URLs
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'READY',
                    encodingCompletedAt: new Date(),
                    hlsManifestUrl,
                    mp4Url: null,
                    moderationStatus: 'APPROVED', // Auto-approve for now
                    audioStatus: 'PASS'
                }
            });
            logger_1.logger.info({ videoId, hlsManifestUrl }, 'FFmpeg encoding completed successfully');
            return {
                success: true,
                hlsManifestUrl
            };
        }
        catch (error) {
            logger_1.logger.error({ error, videoId }, 'FFmpeg encoding failed');
            // Update status to FAILED
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
            // Cleanup work directory
            try {
                await fs_1.promises.rm(workDir, { recursive: true, force: true });
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Generate HLS variants for all quality levels with orientation-aware dimensions.
     *
     * @param videoId - Video record ID for logging
     * @param inputUrl - SAS URL to the raw video blob
     * @param workDir - Local temp directory for FFmpeg output
     * @param levels - Quality levels with computed output dimensions
     */
    async generateHLS(videoId, inputUrl, workDir, levels) {
        const promises = levels.map(async (level) => {
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
        });
        await Promise.all(promises);
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
        logger_1.logger.info({ videoId }, 'Master manifest generated');
    }
    /**
     * Upload all encoded outputs to blob storage
     */
    async uploadOutputs(videoId, workDir) {
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'uwrstorage2425';
        const baseUrl = `https://${accountName}.blob.core.windows.net/videos-encoded/${videoId}`;
        // Upload master manifest
        const masterManifest = await fs_1.promises.readFile(path.join(workDir, 'manifest.m3u8'));
        await VideoStorageService_1.videoStorageService.uploadEncodedFile(masterManifest, videoId, 'manifest.m3u8', 'application/vnd.apple.mpegurl');
        // Upload HLS variants
        for (const level of QUALITY_LEVELS) {
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
     */
    runFFmpeg(args, label) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', ...args]);
            let stderr = '';
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            const timeout = setTimeout(() => {
                proc.kill('SIGKILL');
                reject(new Error(`FFmpeg ${label} timed out after ${FFMPEG_TIMEOUT / 1000}s`));
            }, FFMPEG_TIMEOUT);
            proc.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`FFmpeg ${label} failed with code ${code}: ${stderr.slice(-500)}`));
                }
            });
            proc.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`FFmpeg ${label} error: ${error.message}`));
            });
        });
    }
}
exports.FFmpegEncoder = FFmpegEncoder;
// Export singleton instance
exports.ffmpegEncoder = new FFmpegEncoder();
//# sourceMappingURL=FFmpegEncoder.js.map