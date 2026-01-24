/**
 * VideoStorageService
 *
 * Azure Blob Storage service for video files.
 * Manages three containers:
 * - videos-raw: Original uploads (private)
 * - videos-encoded: HLS/MP4 outputs (public via CDN)
 * - videos-thumbnails: Poster images (public)
 *
 * @module services/VideoStorageService
 */
export interface VideoUploadResult {
    blobName: string;
    url: string;
    container: 'videos-raw' | 'videos-encoded' | 'videos-thumbnails';
}
export interface VideoStorageConfig {
    connectionString: string;
    accountName: string;
    cdnEndpoint?: string;
}
export declare class VideoStorageService {
    private blobServiceClient;
    private accountName;
    private cdnEndpoint?;
    private initialized;
    private rawContainer?;
    private encodedContainer?;
    private thumbnailsContainer?;
    constructor(config?: VideoStorageConfig);
    /**
     * Initialize containers (create if not exists)
     */
    initialize(): Promise<void>;
    /**
     * Upload raw video file (original upload)
     */
    uploadRawVideo(buffer: Buffer, videoId: string, mimeType: string, originalFilename?: string): Promise<VideoUploadResult>;
    /**
     * Upload encoded video segment or manifest
     */
    uploadEncodedFile(buffer: Buffer, videoId: string, filename: string, mimeType: string): Promise<VideoUploadResult>;
    /**
     * Upload video thumbnail
     */
    uploadThumbnail(buffer: Buffer, videoId: string, mimeType?: string): Promise<VideoUploadResult>;
    /**
     * Delete all files associated with a video
     */
    deleteVideo(videoId: string): Promise<void>;
    /**
     * Get public URL for encoded video
     */
    getEncodedVideoUrl(videoId: string, filename: string): string;
    /**
     * Get HLS manifest URL
     */
    getHlsManifestUrl(videoId: string): string;
    /**
     * Get MP4 fallback URL
     */
    getMp4Url(videoId: string): string;
    /**
     * Get thumbnail URL
     */
    getThumbnailUrl(videoId: string): string;
    /**
     * Check if storage service is available
     */
    isAvailable(): Promise<boolean>;
    private ensureInitialized;
    private getExtensionFromMimeType;
}
export declare const videoStorageService: VideoStorageService;
//# sourceMappingURL=VideoStorageService.d.ts.map