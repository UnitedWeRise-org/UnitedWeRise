"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoStorageService = exports.VideoStorageService = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const logger_1 = require("./logger");
// ========================================
// Constants
// ========================================
const CONTAINER_RAW = 'videos-raw';
const CONTAINER_ENCODED = 'videos-encoded';
const CONTAINER_THUMBNAILS = 'videos-thumbnails';
// Cache control settings
const CACHE_CONTROL_HLS_SEGMENT = 'public, max-age=31536000'; // 1 year for .ts segments
const CACHE_CONTROL_HLS_MANIFEST = 'public, max-age=300'; // 5 min for .m3u8
const CACHE_CONTROL_MP4 = 'public, max-age=31536000'; // 1 year for MP4
const CACHE_CONTROL_THUMBNAIL = 'public, max-age=31536000'; // 1 year for thumbnails
// ========================================
// VideoStorageService Class
// ========================================
class VideoStorageService {
    blobServiceClient;
    accountName;
    cdnEndpoint;
    initialized = false;
    // Container clients (lazy initialized)
    rawContainer;
    encodedContainer;
    thumbnailsContainer;
    constructor(config) {
        const connectionString = config?.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
        const accountName = config?.accountName || process.env.AZURE_STORAGE_ACCOUNT_NAME;
        this.cdnEndpoint = config?.cdnEndpoint || process.env.AZURE_CDN_ENDPOINT;
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable not set');
        }
        if (!accountName) {
            throw new Error('AZURE_STORAGE_ACCOUNT_NAME environment variable not set');
        }
        this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        this.accountName = accountName;
    }
    /**
     * Initialize containers (create if not exists)
     */
    async initialize() {
        if (this.initialized)
            return;
        logger_1.logger.info('Initializing VideoStorageService containers');
        try {
            // Initialize raw container (private)
            this.rawContainer = this.blobServiceClient.getContainerClient(CONTAINER_RAW);
            await this.rawContainer.createIfNotExists({
                access: undefined // Private access
            });
            // Initialize encoded container (public)
            this.encodedContainer = this.blobServiceClient.getContainerClient(CONTAINER_ENCODED);
            await this.encodedContainer.createIfNotExists({
                access: 'blob'
            });
            // Initialize thumbnails container (public)
            this.thumbnailsContainer = this.blobServiceClient.getContainerClient(CONTAINER_THUMBNAILS);
            await this.thumbnailsContainer.createIfNotExists({
                access: 'blob'
            });
            this.initialized = true;
            logger_1.logger.info('VideoStorageService initialized successfully');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to initialize VideoStorageService');
            throw error;
        }
    }
    /**
     * Upload raw video file (original upload)
     */
    async uploadRawVideo(buffer, videoId, mimeType, originalFilename) {
        await this.ensureInitialized();
        const extension = this.getExtensionFromMimeType(mimeType);
        const blobName = `${videoId}/original.${extension}`;
        const blockBlobClient = this.rawContainer.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: {
                blobContentType: mimeType,
                blobContentDisposition: originalFilename
                    ? `attachment; filename="${originalFilename}"`
                    : 'attachment'
            }
        });
        logger_1.logger.info({ videoId, blobName, size: buffer.length }, 'Raw video uploaded');
        return {
            blobName,
            url: blockBlobClient.url,
            container: CONTAINER_RAW
        };
    }
    /**
     * Upload encoded video segment or manifest
     */
    async uploadEncodedFile(buffer, videoId, filename, mimeType) {
        await this.ensureInitialized();
        const blobName = `${videoId}/${filename}`;
        const blockBlobClient = this.encodedContainer.getBlockBlobClient(blobName);
        // Determine cache control based on file type
        const cacheControl = filename.endsWith('.m3u8')
            ? CACHE_CONTROL_HLS_MANIFEST
            : filename.endsWith('.ts')
                ? CACHE_CONTROL_HLS_SEGMENT
                : CACHE_CONTROL_MP4;
        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: {
                blobContentType: mimeType,
                blobCacheControl: cacheControl,
                blobContentDisposition: 'inline'
            }
        });
        // Return CDN URL if available, otherwise blob URL
        const url = this.cdnEndpoint
            ? `${this.cdnEndpoint}/${blobName}`
            : blockBlobClient.url;
        logger_1.logger.info({ videoId, blobName, mimeType }, 'Encoded file uploaded');
        return {
            blobName,
            url,
            container: CONTAINER_ENCODED
        };
    }
    /**
     * Upload video thumbnail
     */
    async uploadThumbnail(buffer, videoId, mimeType = 'image/jpeg') {
        await this.ensureInitialized();
        const extension = mimeType === 'image/png' ? 'png' : 'jpg';
        const blobName = `${videoId}/thumbnail.${extension}`;
        const blockBlobClient = this.thumbnailsContainer.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: {
                blobContentType: mimeType,
                blobCacheControl: CACHE_CONTROL_THUMBNAIL,
                blobContentDisposition: 'inline'
            }
        });
        const url = `https://${this.accountName}.blob.core.windows.net/${CONTAINER_THUMBNAILS}/${blobName}`;
        logger_1.logger.info({ videoId, blobName }, 'Thumbnail uploaded');
        return {
            blobName,
            url,
            container: CONTAINER_THUMBNAILS
        };
    }
    /**
     * Delete all files associated with a video
     */
    async deleteVideo(videoId) {
        await this.ensureInitialized();
        const containers = [
            { client: this.rawContainer, name: CONTAINER_RAW },
            { client: this.encodedContainer, name: CONTAINER_ENCODED },
            { client: this.thumbnailsContainer, name: CONTAINER_THUMBNAILS }
        ];
        for (const { client, name } of containers) {
            try {
                // List and delete all blobs with videoId prefix
                const prefix = `${videoId}/`;
                for await (const blob of client.listBlobsFlat({ prefix })) {
                    await client.deleteBlob(blob.name);
                    logger_1.logger.info({ videoId, blobName: blob.name, container: name }, 'Blob deleted');
                }
            }
            catch (error) {
                logger_1.logger.error({ error, videoId, container: name }, 'Failed to delete blobs');
            }
        }
    }
    /**
     * Copy video from raw container to encoded container (for dev stub)
     * Uses Azure server-side copy for efficiency
     *
     * @param videoId - The video record ID
     * @param rawBlobName - The blob name in the raw container (e.g., "videoId/original.mp4")
     * @returns VideoUploadResult with the public URL
     */
    async copyRawToEncoded(videoId, rawBlobName) {
        await this.ensureInitialized();
        // Source blob in videos-raw
        const sourceBlob = this.rawContainer.getBlockBlobClient(rawBlobName);
        // Destination in videos-encoded
        const destBlobName = `${videoId}/video.mp4`;
        const destBlob = this.encodedContainer.getBlockBlobClient(destBlobName);
        // Server-side copy (no download/upload needed)
        const copyPoller = await destBlob.beginCopyFromURL(sourceBlob.url);
        await copyPoller.pollUntilDone();
        // Set proper headers on copied blob
        await destBlob.setHTTPHeaders({
            blobContentType: 'video/mp4',
            blobCacheControl: CACHE_CONTROL_MP4,
            blobContentDisposition: 'inline'
        });
        const url = `https://${this.accountName}.blob.core.windows.net/${CONTAINER_ENCODED}/${destBlobName}`;
        logger_1.logger.info({ videoId, destBlobName }, 'Video copied to encoded container');
        return {
            blobName: destBlobName,
            url,
            container: CONTAINER_ENCODED
        };
    }
    /**
     * Get public URL for encoded video
     */
    getEncodedVideoUrl(videoId, filename) {
        const blobName = `${videoId}/${filename}`;
        return this.cdnEndpoint
            ? `${this.cdnEndpoint}/${blobName}`
            : `https://${this.accountName}.blob.core.windows.net/${CONTAINER_ENCODED}/${blobName}`;
    }
    /**
     * Get HLS manifest URL
     */
    getHlsManifestUrl(videoId) {
        return this.getEncodedVideoUrl(videoId, 'manifest.m3u8');
    }
    /**
     * Get MP4 fallback URL
     */
    getMp4Url(videoId) {
        return this.getEncodedVideoUrl(videoId, 'video.mp4');
    }
    /**
     * Get thumbnail URL
     */
    getThumbnailUrl(videoId) {
        return `https://${this.accountName}.blob.core.windows.net/${CONTAINER_THUMBNAILS}/${videoId}/thumbnail.jpg`;
    }
    /**
     * Check if storage service is available
     */
    async isAvailable() {
        try {
            await this.ensureInitialized();
            await this.encodedContainer.getProperties();
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'VideoStorageService not available');
            return false;
        }
    }
    // ========================================
    // Private Helpers
    // ========================================
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    getExtensionFromMimeType(mimeType) {
        const mimeToExt = {
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'video/quicktime': 'mov',
            'video/x-msvideo': 'avi',
            'video/x-matroska': 'mkv'
        };
        return mimeToExt[mimeType] || 'mp4';
    }
}
exports.VideoStorageService = VideoStorageService;
// Export singleton instance
exports.videoStorageService = new VideoStorageService();
//# sourceMappingURL=VideoStorageService.js.map