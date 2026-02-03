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
export interface EncodingPreset {
    name: string;
    width: number;
    height: number;
    videoBitrate: string;
    audioBitrate: string;
    bandwidth: number;
}
export interface EncodingResult {
    success: boolean;
    hlsManifestUrl?: string;
    mp4Url?: string;
    error?: string;
    outputFiles?: string[];
}
/** Result from Phase 1 (720p) encoding */
export interface Phase1Result {
    success: boolean;
    hlsManifestUrl?: string;
    workDir?: string;
    error?: string;
}
/** Result from Phase 2 (360p) encoding */
export interface Phase2Result {
    success: boolean;
    error?: string;
}
export declare class FFmpegEncoder {
    private tempDir;
    constructor();
    /**
     * Check if FFmpeg is available
     */
    isAvailable(): Promise<boolean>;
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
    private computeOutputDimensions;
    /**
     * Fetch video dimensions from database and resolve quality levels with
     * computed output dimensions preserving original aspect ratio.
     *
     * @param videoId - Video record ID
     * @param levels - Quality levels to resolve
     * @returns Resolved levels with computed width/height
     */
    private resolveVideoLevels;
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
    encodePhase1(videoId: string, inputBlobName: string): Promise<Phase1Result>;
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
    encodePhase2(videoId: string, inputBlobName: string): Promise<Phase2Result>;
    /**
     * Legacy single-pass encode (both tiers in parallel).
     * Retained as fallback when VIDEO_ENCODING_TWO_PHASE is not enabled.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @returns Encoding result with URLs
     */
    encode(videoId: string, inputBlobName: string): Promise<EncodingResult>;
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
    extractFrames(inputUrl: string, workDir: string, frameCount?: number, duration?: number): Promise<string[]>;
    /**
     * Extract audio track from a video as a WAV file for speech-to-text transcription.
     *
     * @param inputUrl - SAS URL or local path to the video file
     * @param workDir - Directory to write the extracted audio file
     * @returns Path to extracted WAV file, or null if no audio track
     */
    extractAudio(inputUrl: string, workDir: string): Promise<string | null>;
    /**
     * Generate HLS variants for specified quality levels with orientation-aware dimensions.
     *
     * @param videoId - Video record ID for logging
     * @param inputUrl - SAS URL to the raw video blob
     * @param workDir - Local temp directory for FFmpeg output
     * @param levels - Quality levels with computed output dimensions
     */
    private generateHLS;
    /**
     * Generate master HLS manifest with actual computed dimensions per level.
     *
     * @param videoId - Video record ID for logging
     * @param workDir - Local temp directory containing variant playlists
     * @param levels - Quality levels with computed output dimensions
     */
    private generateMasterManifest;
    /**
     * Upload encoded outputs (segments, playlists, manifest) to blob storage.
     *
     * @param videoId - Video record ID
     * @param workDir - Local temp directory containing encoded files
     * @param levels - Quality levels whose outputs should be uploaded
     * @returns Object with HLS manifest URL
     */
    private uploadOutputs;
    /**
     * Run FFmpeg command with timeout
     *
     * @param args - FFmpeg arguments
     * @param label - Human-readable label for logging
     * @param timeout - Timeout in milliseconds (defaults to FFMPEG_TIMEOUT)
     */
    private runFFmpeg;
}
export declare const ffmpegEncoder: FFmpegEncoder;
//# sourceMappingURL=FFmpegEncoder.d.ts.map