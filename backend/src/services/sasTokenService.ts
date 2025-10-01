import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol
} from '@azure/storage-blob';
import { createHmac } from 'crypto';
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

      // Manual SAS token generation to match Azure's exact expectations
      const version = '2021-12-02';
      const resource = 'b'; // blob
      const permissions = 'cw'; // create, write
      const startsOn = new Date();

      // Format times in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)
      const startTime = startsOn.toISOString().split('.')[0] + 'Z';
      const expiryTime = expiresAt.toISOString().split('.')[0] + 'Z';

      // Canonicalized resource: /blob/<account>/<container>/<blob>
      const canonicalizedResource = `/blob/${accountName}/${this.CONTAINER_NAME}/${blobName}`;

      // String to sign for Blob SAS (version 2021-12-02)
      const stringToSign = [
        permissions,                  // signed permissions
        startTime,                    // signed start
        expiryTime,                   // signed expiry
        canonicalizedResource,        // canonicalized resource
        '',                           // signed identifier
        '',                           // signed IP
        'https',                      // signed protocol
        version,                      // signed version
        resource,                     // signed resource
        '',                           // signed timestamp (snapshot time)
        '',                           // signed encryption scope
        '',                           // rscc (cache-control)
        '',                           // rscd (content-disposition)
        '',                           // rsce (content-encoding)
        '',                           // rscl (content-language)
        ''                            // rsct (content-type)
      ].join('\n');

      console.log('🔐 String to sign:', stringToSign.split('\n').map((line, i) => `  ${i}: "${line}"`).join('\n'));

      // Generate signature: HMAC-SHA256 of stringToSign with account key
      const signature = createHmac('sha256', Buffer.from(accountKey, 'base64'))
        .update(stringToSign, 'utf8')
        .digest('base64');

      // Build SAS query string
      const sasToken = [
        `sv=${encodeURIComponent(version)}`,
        `spr=https`,
        `st=${encodeURIComponent(startTime)}`,
        `se=${encodeURIComponent(expiryTime)}`,
        `sr=${resource}`,
        `sp=${permissions}`,
        `sig=${encodeURIComponent(signature)}`
      ].join('&');

      // Construct full SAS URL
      const sasUrl = `https://${accountName}.blob.core.windows.net/${this.CONTAINER_NAME}/${blobName}?${sasToken}`;

      console.log(`✅ SAS token generated: ${blobName} (expires: ${expiryTime})`);

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
