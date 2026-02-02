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
     * Encode video to HLS with multiple resolutions.
     * Queries the database for original dimensions to produce orientation-aware
     * output (vertical input → vertical output, horizontal → horizontal).
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @returns Encoding result with URLs
     */
    encode(videoId: string, inputBlobName: string): Promise<EncodingResult>;
    /**
     * Generate HLS variants for all quality levels with orientation-aware dimensions.
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
     * Upload all encoded outputs to blob storage
     */
    private uploadOutputs;
    /**
     * Run FFmpeg command with timeout
     */
    private runFFmpeg;
}
export declare const ffmpegEncoder: FFmpegEncoder;
//# sourceMappingURL=FFmpegEncoder.d.ts.map