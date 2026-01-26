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
     * Encode video to HLS with multiple resolutions and MP4 fallback
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @returns Encoding result with URLs
     */
    encode(videoId: string, inputBlobName: string): Promise<EncodingResult>;
    /**
     * Generate HLS variants for all presets
     */
    private generateHLS;
    /**
     * Generate MP4 fallback (720p)
     */
    private generateMP4Fallback;
    /**
     * Generate master HLS manifest
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