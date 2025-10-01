"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SASTokenService = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const uuid_1 = require("uuid");
class SASTokenService {
    /**
     * Generate a SAS token for direct blob upload
     * Security: Token is blob-specific and time-limited with write-only permissions
     */
    static async generateUploadToken(request) {
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
            const uploadId = (0, uuid_1.v4)();
            const timestamp = Date.now();
            const folder = this.getFolderForPhotoType(request.photoType);
            const blobName = `${folder}/${uploadId}-${timestamp}${fileExtension}`;
            // Create shared key credential
            const sharedKeyCredential = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
            // Set SAS token expiration
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + this.SAS_EXPIRY_MINUTES);
            // Define SAS permissions (Create + Write only, no Read/Delete)
            const permissions = storage_blob_1.BlobSASPermissions.parse('cw'); // create, write
            // Generate SAS token with explicit version and contentType
            // CRITICAL: contentType MUST be in signature for Azure to accept Content-Type header
            const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)({
                containerName: this.CONTAINER_NAME,
                blobName: blobName,
                permissions: permissions,
                startsOn: new Date(),
                expiresOn: expiresAt,
                protocol: storage_blob_1.SASProtocol.Https,
                version: '2023-11-03', // Explicit API version
                contentType: request.mimeType, // Include in signature
            }, sharedKeyCredential).toString();
            // Construct full SAS URL
            const sasUrl = `https://${accountName}.blob.core.windows.net/${this.CONTAINER_NAME}/${blobName}?${sasToken}`;
            console.log(`✅ SAS token generated: ${blobName} (expires: ${expiresAt.toISOString()})`);
            return {
                blobName,
                sasUrl,
                expiresAt,
                uploadId
            };
        }
        catch (error) {
            console.error('Failed to generate SAS token:', error);
            throw error;
        }
    }
    /**
     * Verify blob exists in Azure Storage
     */
    static async verifyBlobExists(blobName) {
        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('Azure Storage connection string not configured');
            }
            const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
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
        }
        catch (error) {
            console.error('Failed to verify blob existence:', error);
            return false;
        }
    }
    /**
     * Get blob metadata without downloading
     */
    static async getBlobMetadata(blobName) {
        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('Azure Storage connection string not configured');
            }
            const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const properties = await blockBlobClient.getProperties();
            return {
                size: properties.contentLength || 0,
                contentType: properties.contentType || 'application/octet-stream',
                url: blockBlobClient.url
            };
        }
        catch (error) {
            console.error('Failed to get blob metadata:', error);
            return null;
        }
    }
    /**
     * Delete blob if upload fails
     */
    static async cleanupFailedUpload(blobName) {
        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                return; // Fail silently on cleanup
            }
            const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.deleteIfExists();
            console.log(`🗑️  Cleaned up failed upload: ${blobName}`);
        }
        catch (error) {
            console.error('Failed to cleanup blob:', error);
            // Non-critical error
        }
    }
    // Helper methods
    static getExtensionFromMimeType(mimeType) {
        const mimeMap = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif'
        };
        return mimeMap[mimeType] || '.jpg';
    }
    static getFolderForPhotoType(photoType) {
        const folderMap = {
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
exports.SASTokenService = SASTokenService;
SASTokenService.CONTAINER_NAME = 'photos';
SASTokenService.SAS_EXPIRY_MINUTES = 15;
//# sourceMappingURL=sasTokenService.js.map