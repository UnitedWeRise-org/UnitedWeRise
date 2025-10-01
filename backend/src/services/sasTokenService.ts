import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { PhotoType } from '@prisma/client';

interface SASTokenRequest {
  userId: string;
  photoType: PhotoType;
  filename: string;
  mimeType: string;
  fileSize: number;
}

interface SASTokenResponse {
  blobName: string;
  sasUrl: string;
  expiresAt: Date;
  uploadId: string;
}

export class SASTokenService {
  private static readonly CONTAINER_NAME = 'photos';
  private static readonly SAS_EXPIRY_MINUTES = 15;

  /**
   * Generate a SAS token for direct blob upload
   * Security: Token is blob-specific and time-limited with write-only permissions
   */
  static async generateUploadToken(request: SASTokenRequest): Promise<SASTokenResponse> {
    try {
      console.log(`🔐 Generating SAS token for user ${request.userId} - ${request.photoType}`);

      // Validate Azure Storage credentials
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

      if (!accountName || !accountKey) {
        throw new Error('Azure Storage credentials not configured');
      }

      // Generate unique blob name with folder structure
      const fileExtension = this.getExtensionFromMimeType(request.mimeType);
      const uploadId = uuidv4();
      const timestamp = Date.now();
      const folder = this.getFolderForPhotoType(request.photoType);
      const blobName = `${folder}/${uploadId}-${timestamp}${fileExtension}`;

      // Create shared key credential
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

      // Set SAS token expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.SAS_EXPIRY_MINUTES);

      // Define SAS permissions (Create + Write only, no Read/Delete)
      const permissions = BlobSASPermissions.parse('cw'); // create, write

      // Use BlockBlobClient to generate SAS URL (handles signature correctly)
      const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
      );
      const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Generate SAS URL with create+write permissions
      // Use stable API version 2021-12-02 (newer versions may have signature issues)
      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: permissions,
        startsOn: new Date(),
        expiresOn: expiresAt,
        protocol: SASProtocol.Https,
        version: '2021-12-02',
      });

      console.log(`✅ SAS token generated: ${blobName} (expires: ${expiresAt.toISOString()})`);

      return {
        blobName,
        sasUrl,
        expiresAt,
        uploadId
      };

    } catch (error) {
      console.error('Failed to generate SAS token:', error);
      throw error;
    }
  }

  /**
   * Verify blob exists in Azure Storage
   */
  static async verifyBlobExists(blobName: string): Promise<boolean> {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        throw new Error('Azure Storage connection string not configured');
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Check if blob exists
      const exists = await blockBlobClient.exists();

      if (exists) {
        // Get blob properties to verify it's complete
        const properties = await blockBlobClient.getProperties();
        console.log(`✅ Blob verified: ${blobName} (${properties.contentLength} bytes)`);
      }

      return exists;

    } catch (error) {
      console.error('Failed to verify blob existence:', error);
      return false;
    }
  }

  /**
   * Get blob metadata without downloading
   */
  static async getBlobMetadata(blobName: string): Promise<{
    size: number;
    contentType: string;
    url: string;
  } | null> {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        throw new Error('Azure Storage connection string not configured');
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const properties = await blockBlobClient.getProperties();

      return {
        size: properties.contentLength || 0,
        contentType: properties.contentType || 'application/octet-stream',
        url: blockBlobClient.url
      };

    } catch (error) {
      console.error('Failed to get blob metadata:', error);
      return null;
    }
  }

  /**
   * Delete blob if upload fails
   */
  static async cleanupFailedUpload(blobName: string): Promise<void> {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        return; // Fail silently on cleanup
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.deleteIfExists();
      console.log(`🗑️  Cleaned up failed upload: ${blobName}`);

    } catch (error) {
      console.error('Failed to cleanup blob:', error);
      // Non-critical error
    }
  }

  // Helper methods

  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    return mimeMap[mimeType] || '.jpg';
  }

  private static getFolderForPhotoType(photoType: PhotoType): string {
    const folderMap: Record<PhotoType, string> = {
      AVATAR: 'avatars',
      COVER: 'covers',
      CAMPAIGN: 'campaign',
      VERIFICATION: 'verification',
      EVENT: 'events',
      GALLERY: 'gallery',
      POST_MEDIA: 'posts'
    };
    return folderMap[photoType] || 'photos';
  }
}
