import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export class AzureBlobService {
  private static blobServiceClient: BlobServiceClient;
  private static containerClient: ContainerClient;
  private static readonly CONTAINER_NAME = 'photos';

  /**
   * Initialize Azure Blob Storage
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Azure Blob Storage');
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        logger.error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
        throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable not set');
      }

      logger.info('Creating BlobServiceClient');
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(this.CONTAINER_NAME);

      // Create container if it doesn't exist
      logger.info('Creating/verifying container exists');

      // ⚠️ SECURITY DESIGN DECISION: Public blob access
      // Current implementation: Photos are publicly accessible via URL
      // Rationale: Simplifies sharing and reduces server load for public content
      //
      // FUTURE ENHANCEMENT: Implement private storage with SAS tokens for:
      // - Private photos (user-controlled privacy settings)
      // - Deleted content (prevent access after deletion)
      // - Access control based on user permissions
      //
      // To implement private storage:
      // 1. Change access to 'private'
      // 2. Generate SAS tokens in uploadFile() with expiration
      // 3. Update frontend to request signed URLs from backend
      // 4. Implement per-photo access control based on post visibility
      //
      // See: https://learn.microsoft.com/en-us/azure/storage/blobs/sas-service-create
      await this.containerClient.createIfNotExists({
        access: 'blob' // Allow public read access to blobs
      });

      // Ensure public blob access is set (in case container existed with different policy)
      logger.info('Setting container access policy to public blob access');
      await this.containerClient.setAccessPolicy('blob');

      logger.info('Azure Blob Storage initialized successfully');
    } catch (error) {
      logger.error({
        error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error)
      }, 'FAILED TO INITIALIZE AZURE BLOB STORAGE');
      throw error;
    }
  }

  /**
   * Upload a file to Azure Blob Storage
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folder: string = 'photos'
  ): Promise<string> {
    try {
      const blobName = `${folder}/${uuidv4()}-${filename}`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
          blobCacheControl: 'public, max-age=31536000', // Cache for 1 year
          blobContentDisposition: 'inline' // Photos safe to display
        }
      });

      // Return the public URL
      return blockBlobClient.url;
    } catch (error) {
      logger.error({ error, filename, mimeType }, 'Failed to upload file to Azure Blob Storage');
      throw error;
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   */
  static async deleteFile(blobName: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      logger.error({ error, blobName }, 'Failed to delete file from Azure Blob Storage');
      throw error;
    }
  }

  /**
   * Get blob name from URL
   */
  static getBlobNameFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(-2).join('/'); // Get folder/filename
  }

  /**
   * Check if blob storage is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await this.containerClient.getProperties();
      return true;
    } catch (error) {
      logger.error({ error }, 'Azure Blob Storage not available');
      return false;
    }
  }
}