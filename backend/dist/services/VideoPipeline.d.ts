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
import { VideoUploadResult } from './VideoStorageService';
export interface VideoFile {
    path: string;
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
    encodingStatus: 'PENDING' | 'ENCODING' | 'READY' | 'FAILED';
    mp4Url?: string;
    hlsManifestUrl?: string;
}
interface ValidationResult {
    valid: boolean;
    error?: string;
}
export declare class VideoPipeline {
    private log;
    validateFile(file: VideoFile, requestId: string): Promise<ValidationResult>;
    extractMetadata(filePath: string, requestId: string): Promise<VideoMetadata>;
    uploadRawVideo(filePath: string, videoId: string, mimeType: string, originalname: string | undefined, fileSize: number, requestId: string): Promise<VideoUploadResult>;
    queueEncodingJob(videoId: string, inputUrl: string, requestId: string): Promise<string | null>;
    generateThumbnail(filePath: string, videoId: string, requestId: string): Promise<string | undefined>;
    persistToDatabase(videoId: string, userId: string, uploadResult: VideoUploadResult, metadata: VideoMetadata, originalSize: number, originalMimeType: string, thumbnailUrl: string | undefined, options: {
        videoType: string;
        caption?: string;
        postId?: string;
    }, requestId: string): Promise<any>;
    process(options: VideoProcessingOptions): Promise<VideoProcessingResult>;
    private parseFps;
    private extractHashtags;
}
export declare const videoPipeline: VideoPipeline;
export {};
//# sourceMappingURL=VideoPipeline.d.ts.map