/**
 * FFmpegEncoder Service
 *
 * Handles multi-resolution HLS encoding and MP4 fallback generation
 * using FFmpeg. Outputs are uploaded to Azure Blob Storage.
 *
 * Output Structure:
 * videos-encoded/{videoId}/
 * ├── manifest.m3u8      # Master HLS playlist
 * ├── 720p/playlist.m3u8 # 720p variant
 * ├── 720p/seg_*.ts      # 720p segments
 * ├── 480p/playlist.m3u8 # 480p variant
 * ├── 480p/seg_*.ts      # 480p segments
 * ├── 360p/playlist.m3u8 # 360p variant
 * ├── 360p/seg_*.ts      # 360p segments
 * └── fallback.mp4       # MP4 fallback (720p)
 *
 * @module services/FFmpegEncoder
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { videoStorageService } from './VideoStorageService';
import { prisma } from '../lib/prisma.js';

// ========================================
// Types
// ========================================

export interface EncodingPreset {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
  bandwidth: number; // For HLS manifest
}

export interface EncodingResult {
  success: boolean;
  hlsManifestUrl?: string;
  mp4Url?: string;
  error?: string;
  outputFiles?: string[];
}

// ========================================
// Constants
// ========================================

const ENCODING_PRESETS: EncodingPreset[] = [
  { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k', bandwidth: 2628000 },
  { name: '480p', width: 854, height: 480, videoBitrate: '1200k', audioBitrate: '96k', bandwidth: 1296000 },
  { name: '360p', width: 640, height: 360, videoBitrate: '600k', audioBitrate: '64k', bandwidth: 664000 }
];

const HLS_SEGMENT_DURATION = 6; // seconds
const FFMPEG_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// ========================================
// FFmpegEncoder Class
// ========================================

export class FFmpegEncoder {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'uwr-video-encoding');
  }

  /**
   * Check if FFmpeg is available
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', ['-version']);
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  /**
   * Encode video to HLS with multiple resolutions and MP4 fallback
   *
   * @param videoId - Video record ID
   * @param inputBlobName - Blob name in videos-raw container
   * @returns Encoding result with URLs
   */
  async encode(videoId: string, inputBlobName: string): Promise<EncodingResult> {
    const workDir = path.join(this.tempDir, videoId);

    try {
      // Create work directory
      await fs.mkdir(workDir, { recursive: true });

      // Get SAS URL for input video
      const inputUrl = videoStorageService.generateRawBlobSasUrl(inputBlobName, 30);

      // Update status to ENCODING
      await prisma.video.update({
        where: { id: videoId },
        data: {
          encodingStatus: 'ENCODING',
          encodingStartedAt: new Date()
        }
      });

      logger.info({ videoId, inputBlobName, workDir }, 'Starting FFmpeg encoding');

      // Generate HLS variants
      await this.generateHLS(videoId, inputUrl, workDir);

      // Generate MP4 fallback
      await this.generateMP4Fallback(videoId, inputUrl, workDir);

      // Generate master manifest
      await this.generateMasterManifest(videoId, workDir);

      // Upload all outputs to blob storage
      const { hlsManifestUrl, mp4Url } = await this.uploadOutputs(videoId, workDir);

      // Update database with URLs
      await prisma.video.update({
        where: { id: videoId },
        data: {
          encodingStatus: 'READY',
          encodingCompletedAt: new Date(),
          hlsManifestUrl,
          mp4Url,
          moderationStatus: 'APPROVED', // Auto-approve for now
          audioStatus: 'PASS'
        }
      });

      logger.info({ videoId, hlsManifestUrl, mp4Url }, 'FFmpeg encoding completed successfully');

      return {
        success: true,
        hlsManifestUrl,
        mp4Url
      };

    } catch (error: any) {
      logger.error({ error, videoId }, 'FFmpeg encoding failed');

      // Update status to FAILED
      await prisma.video.update({
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

    } finally {
      // Cleanup work directory
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Generate HLS variants for all presets
   */
  private async generateHLS(videoId: string, inputUrl: string, workDir: string): Promise<void> {
    const promises = ENCODING_PRESETS.map(async (preset) => {
      const outputDir = path.join(workDir, preset.name);
      await fs.mkdir(outputDir, { recursive: true });

      const playlistPath = path.join(outputDir, 'playlist.m3u8');
      const segmentPattern = path.join(outputDir, 'seg_%03d.ts');

      const args = [
        '-i', inputUrl,
        '-vf', `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-b:v', preset.videoBitrate,
        '-maxrate', preset.videoBitrate,
        '-bufsize', `${parseInt(preset.videoBitrate) * 2}k`,
        '-c:a', 'aac',
        '-b:a', preset.audioBitrate,
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', segmentPattern,
        '-f', 'hls',
        playlistPath
      ];

      await this.runFFmpeg(args, `HLS ${preset.name}`);

      logger.info({ videoId, preset: preset.name }, 'HLS variant generated');
    });

    await Promise.all(promises);
  }

  /**
   * Generate MP4 fallback (720p)
   */
  private async generateMP4Fallback(videoId: string, inputUrl: string, workDir: string): Promise<void> {
    const outputPath = path.join(workDir, 'fallback.mp4');

    const args = [
      '-i', inputUrl,
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath
    ];

    await this.runFFmpeg(args, 'MP4 fallback');

    logger.info({ videoId }, 'MP4 fallback generated');
  }

  /**
   * Generate master HLS manifest
   */
  private async generateMasterManifest(videoId: string, workDir: string): Promise<void> {
    const manifestPath = path.join(workDir, 'manifest.m3u8');

    let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

    for (const preset of ENCODING_PRESETS) {
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${preset.bandwidth},RESOLUTION=${preset.width}x${preset.height}\n`;
      content += `${preset.name}/playlist.m3u8\n`;
    }

    await fs.writeFile(manifestPath, content, 'utf-8');

    logger.info({ videoId }, 'Master manifest generated');
  }

  /**
   * Upload all encoded outputs to blob storage
   */
  private async uploadOutputs(videoId: string, workDir: string): Promise<{
    hlsManifestUrl: string;
    mp4Url: string;
  }> {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'uwrstorage2425';
    const baseUrl = `https://${accountName}.blob.core.windows.net/videos-encoded/${videoId}`;

    // Upload master manifest
    const masterManifest = await fs.readFile(path.join(workDir, 'manifest.m3u8'));
    await videoStorageService.uploadEncodedFile(masterManifest, videoId, 'manifest.m3u8', 'application/vnd.apple.mpegurl');

    // Upload HLS variants
    for (const preset of ENCODING_PRESETS) {
      const presetDir = path.join(workDir, preset.name);
      const files = await fs.readdir(presetDir);

      for (const file of files) {
        const filePath = path.join(presetDir, file);
        const fileBuffer = await fs.readFile(filePath);
        const mimeType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
        const blobName = `${preset.name}/${file}`;

        await videoStorageService.uploadEncodedFile(fileBuffer, videoId, blobName, mimeType);
      }

      logger.info({ videoId, preset: preset.name, fileCount: files.length }, 'HLS variant uploaded');
    }

    // Upload MP4 fallback
    const mp4Buffer = await fs.readFile(path.join(workDir, 'fallback.mp4'));
    await videoStorageService.uploadEncodedFile(mp4Buffer, videoId, 'fallback.mp4', 'video/mp4');

    return {
      hlsManifestUrl: `${baseUrl}/manifest.m3u8`,
      mp4Url: `${baseUrl}/fallback.mp4`
    };
  }

  /**
   * Run FFmpeg command with timeout
   */
  private runFFmpeg(args: string[], label: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', ...args]);

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
        } else {
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

// Export singleton instance
export const ffmpegEncoder = new FFmpegEncoder();
