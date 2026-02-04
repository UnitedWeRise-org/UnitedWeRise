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

import { BlobServiceClient, ContainerClient, BlockBlobClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream } from 'fs';
import { logger } from './logger';

// ========================================
// Types
// ========================================

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

export class VideoStorageService {
  private blobServiceClient: BlobServiceClient;
  private accountName: string;
  private accountKey: string;
  private cdnEndpoint?: string;
  private initialized: boolean = false;

  // Container clients (lazy initialized)
  private rawContainer?: ContainerClient;
  private encodedContainer?: ContainerClient;
  private thumbnailsContainer?: ContainerClient;

  constructor(config?: VideoStorageConfig) {
    const connectionString = config?.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = config?.accountName || process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.cdnEndpoint = config?.cdnEndpoint || process.env.AZURE_CDN_ENDPOINT;

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable not set');
    }
    if (!accountName) {
      throw new Error('AZURE_STORAGE_ACCOUNT_NAME environment variable not set');
    }

    // Extract account key from connection string for SAS generation
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);
    if (!accountKeyMatch) {
      throw new Error('AccountKey not found in connection string');
    }
    this.accountKey = accountKeyMatch[1];

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.accountName = accountName;
  }

  /**
   * Initialize containers (create if not exists)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing VideoStorageService containers');

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
      logger.info('VideoStorageService initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize VideoStorageService');
      throw error;
    }
  }

  /**
   * Upload raw video file from disk (streams to Azure, no buffer in memory)
   *
   * @param filePath - Path to the temp file on disk
   * @param videoId - The video record ID
   * @param mimeType - The MIME type of the video
   * @param originalFilename - Original filename for content disposition
   * @returns Upload result with blob name and URL
   */
  async uploadRawVideo(
    filePath: string,
    videoId: string,
    mimeType: string,
    originalFilename?: string
  ): Promise<VideoUploadResult> {
    await this.ensureInitialized();

    const extension = this.getExtensionFromMimeType(mimeType);
    const blobName = `${videoId}/original.${extension}`;

    const blockBlobClient = this.rawContainer!.getBlockBlobClient(blobName);

    const stream = createReadStream(filePath);
    await blockBlobClient.uploadStream(stream, undefined, undefined, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobContentDisposition: originalFilename
          ? `attachment; filename="${originalFilename}"`
          : 'attachment'
      }
    });

    logger.info({ videoId, blobName, filePath }, 'Raw video uploaded from disk');

    return {
      blobName,
      url: blockBlobClient.url,
      container: CONTAINER_RAW
    };
  }

  /**
   * Upload encoded video segment or manifest
   */
  async uploadEncodedFile(
    buffer: Buffer,
    videoId: string,
    filename: string,
    mimeType: string
  ): Promise<VideoUploadResult> {
    await this.ensureInitialized();

    const blobName = `${videoId}/${filename}`;
    const blockBlobClient = this.encodedContainer!.getBlockBlobClient(blobName);

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

    logger.info({ videoId, blobName, mimeType }, 'Encoded file uploaded');

    return {
      blobName,
      url,
      container: CONTAINER_ENCODED
    };
  }

  /**
   * Upload video thumbnail
   */
  async uploadThumbnail(
    buffer: Buffer,
    videoId: string,
    mimeType: string = 'image/jpeg'
  ): Promise<VideoUploadResult> {
    await this.ensureInitialized();

    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const blobName = `${videoId}/thumbnail.${extension}`;

    const blockBlobClient = this.thumbnailsContainer!.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobCacheControl: CACHE_CONTROL_THUMBNAIL,
        blobContentDisposition: 'inline'
      }
    });

    const url = `https://${this.accountName}.blob.core.windows.net/${CONTAINER_THUMBNAILS}/${blobName}`;

    logger.info({ videoId, blobName }, 'Thumbnail uploaded');

    return {
      blobName,
      url,
      container: CONTAINER_THUMBNAILS
    };
  }

  /**
   * Delete all files associated with a video
   */
  async deleteVideo(videoId: string): Promise<void> {
    await this.ensureInitialized();

    const containers = [
      { client: this.rawContainer!, name: CONTAINER_RAW },
      { client: this.encodedContainer!, name: CONTAINER_ENCODED },
      { client: this.thumbnailsContainer!, name: CONTAINER_THUMBNAILS }
    ];

    for (const { client, name } of containers) {
      try {
        // List and delete all blobs with videoId prefix
        const prefix = `${videoId}/`;
        for await (const blob of client.listBlobsFlat({ prefix })) {
          await client.deleteBlob(blob.name);
          logger.info({ videoId, blobName: blob.name, container: name }, 'Blob deleted');
        }
      } catch (error) {
        logger.error({ error, videoId, container: name }, 'Failed to delete blobs');
      }
    }
  }

  /**
   * Generate a SAS URL for a blob in the raw container (for server-side copy)
   * @param blobName - The blob name in the raw container
   * @param expiresInMinutes - How long the SAS should be valid (default 15 minutes)
   * @returns SAS URL for the blob
   */
  generateRawBlobSasUrl(blobName: string, expiresInMinutes: number = 15): string {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey
    );

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters({
      containerName: CONTAINER_RAW,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // Read-only
      startsOn,
      expiresOn
    }, sharedKeyCredential).toString();

    return `https://${this.accountName}.blob.core.windows.net/${CONTAINER_RAW}/${blobName}?${sasToken}`;
  }

  /**
   * Copy video from raw container to encoded container (for dev stub)
   * Uses Azure server-side copy for efficiency
   *
   * @param videoId - The video record ID
   * @param rawBlobName - The blob name in the raw container (e.g., "videoId/original.mp4")
   * @returns VideoUploadResult with the public URL
   */
  async copyRawToEncoded(videoId: string, rawBlobName: string): Promise<VideoUploadResult> {
    await this.ensureInitialized();

    logger.info({ videoId, rawBlobName }, 'Starting copy from raw to encoded container');

    // Generate SAS URL for source blob (raw container is private)
    const sourceSasUrl = this.generateRawBlobSasUrl(rawBlobName);

    // Destination in videos-encoded
    const destBlobName = `${videoId}/video.mp4`;
    const destBlob = this.encodedContainer!.getBlockBlobClient(destBlobName);

    // Server-side copy using SAS URL (no download/upload needed)
    const copyPoller = await destBlob.beginCopyFromURL(sourceSasUrl);
    await copyPoller.pollUntilDone();

    // Set proper headers on copied blob
    await destBlob.setHTTPHeaders({
      blobContentType: 'video/mp4',
      blobCacheControl: CACHE_CONTROL_MP4,
      blobContentDisposition: 'inline'
    });

    const url = `https://${this.accountName}.blob.core.windows.net/${CONTAINER_ENCODED}/${destBlobName}`;

    logger.info({ videoId, destBlobName, url }, 'Copy to encoded container complete');

    return {
      blobName: destBlobName,
      url,
      container: CONTAINER_ENCODED
    };
  }

  /**
   * Get public URL for encoded video
   */
  getEncodedVideoUrl(videoId: string, filename: string): string {
    const blobName = `${videoId}/${filename}`;
    return this.cdnEndpoint
      ? `${this.cdnEndpoint}/${blobName}`
      : `https://${this.accountName}.blob.core.windows.net/${CONTAINER_ENCODED}/${blobName}`;
  }

  /**
   * Get HLS manifest URL
   */
  getHlsManifestUrl(videoId: string): string {
    return this.getEncodedVideoUrl(videoId, 'manifest.m3u8');
  }

  /**
   * Get MP4 fallback URL
   */
  getMp4Url(videoId: string): string {
    return this.getEncodedVideoUrl(videoId, 'video.mp4');
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(videoId: string): string {
    return `https://${this.accountName}.blob.core.windows.net/${CONTAINER_THUMBNAILS}/${videoId}/thumbnail.jpg`;
  }

  /**
   * Check if storage service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      await this.encodedContainer!.getProperties();
      return true;
    } catch (error) {
      logger.error({ error }, 'VideoStorageService not available');
      return false;
    }
  }

  /**
   * Check if a blob exists in the encoded videos container.
   * Uses a lightweight HEAD request (no data transfer).
   *
   * @param blobPath - Path within videos-encoded container (e.g., "videoId/master.m3u8")
   * @returns true if the blob exists
   */
  async encodedBlobExists(blobPath: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const blobClient = this.encodedContainer!.getBlobClient(blobPath);
      return await blobClient.exists();
    } catch (error) {
      logger.error({ error, blobPath }, 'Failed to check encoded blob existence');
      return false;
    }
  }

  // ========================================
  // Private Helpers
  // ========================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/x-matroska': 'mkv'
    };
    return mimeToExt[mimeType] || 'mp4';
  }
}

// Export singleton instance
export const videoStorageService = new VideoStorageService();
