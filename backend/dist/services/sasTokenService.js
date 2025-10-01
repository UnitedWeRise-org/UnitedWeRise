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
            // Use connection string approach - this is the official method
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
            if (!connectionString || !accountName) {
                throw new Error('Azure Storage credentials not configured');
            }
            // Generate unique blob name with folder structure
            const fileExtension = this.getExtensionFromMimeType(request.mimeType);
            const uploadId = (0, uuid_1.v4)();
            const timestamp = Date.now();
            const folder = this.getFolderForPhotoType(request.photoType);
            const blobName = `${folder}/${uploadId}-${timestamp}${fileExtension}`;
            // Set SAS token expiration
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + this.SAS_EXPIRY_MINUTES);
            // Use BlobServiceClient with connection string - this is the OFFICIAL SDK method
            const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            // Define SAS permissions
            const permissions = storage_blob_1.BlobSASPermissions.parse('cw'); // create, write only
            // Generate SAS URL using SDK (this handles ALL signature details correctly)
            const sasUrl = await blockBlobClient.generateSasUrl({
                permissions: permissions,
                startsOn: new Date(),
                expiresOn: expiresAt,
                protocol: storage_blob_1.SASProtocol.Https,
            });
            // DIAGNOSTIC: Parse and log SAS URL structure
            const url = new URL(sasUrl);
            const params = new URLSearchParams(url.search);
            console.log(`✅ SAS token generated: ${blobName} (expires: ${expiresAt.toISOString()})`);
            console.log(`🔍 SAS URL DIAGNOSTIC:`);
            console.log(`   Base URL: ${url.origin}${url.pathname}`);
            console.log(`   Query Parameters:`);
            params.forEach((value, key) => {
                if (key === 'sig') {
                    console.log(`     ${key}: [REDACTED]`);
                }
                else {
                    console.log(`     ${key}: ${value}`);
                }
            });
            console.log(`   Full URL (sig redacted): ${sasUrl.replace(/sig=[^&]+/, 'sig=[REDACTED]')}`);
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
     * Retries up to 3 times with delays to account for Azure's eventual consistency
     */
    static async verifyBlobExists(blobName) {
        const maxRetries = 5;
        const retryDelayMs = 2000; // 2 seconds
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
                if (!connectionString) {
                    console.error('❌ Azure Storage connection string not configured');
                    throw new Error('Azure Storage connection string not configured');
                }
                console.log(`🔍 Verifying blob exists (attempt ${attempt}/${maxRetries}): ${blobName}`);
                const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
                const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                // Check if blob exists
                const exists = await blockBlobClient.exists();
                if (exists) {
                    // Get blob properties to verify it's complete
                    const properties = await blockBlobClient.getProperties();
                    console.log(`✅ Blob verified: ${blobName} (${properties.contentLength} bytes)`);
                    return true;
                }
                console.log(`⚠️ Blob not found on attempt ${attempt}/${maxRetries}`);
                // If not last attempt, wait before retrying
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
            }
            catch (error) {
                console.error(`❌ Error verifying blob (attempt ${attempt}/${maxRetries}):`, {
                    error: error.message,
                    code: error.code,
                    statusCode: error.statusCode,
                    blobName
                });
                // If not last attempt, wait before retrying
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
            }
        }
        console.error(`❌ Blob verification failed after ${maxRetries} attempts: ${blobName}`);
        return false;
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
            POST_MEDIA: 'posts' // Fixed: was 'photos' which duplicated container name
        };
        return folderMap[photoType] || 'photos';
    }
}
exports.SASTokenService = SASTokenService;
SASTokenService.CONTAINER_NAME = 'photos';
SASTokenService.SAS_EXPIRY_MINUTES = 15;
//# sourceMappingURL=sasTokenService.js.map