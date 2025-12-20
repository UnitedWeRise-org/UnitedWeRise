"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBlobService = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
class AzureBlobService {
    static blobServiceClient;
    static containerClient;
    static CONTAINER_NAME = 'photos';
    /**
     * Initialize Azure Blob Storage
     */
    static async initialize() {
        try {
            logger_1.logger.info('Initializing Azure Blob Storage');
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                logger_1.logger.error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
                throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable not set');
            }
            logger_1.logger.info('Creating BlobServiceClient');
            this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
            this.containerClient = this.blobServiceClient.getContainerClient(this.CONTAINER_NAME);
            // Create container if it doesn't exist
            logger_1.logger.info('Creating/verifying container exists');
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
            logger_1.logger.info('Setting container access policy to public blob access');
            await this.containerClient.setAccessPolicy('blob');
            logger_1.logger.info('Azure Blob Storage initialized successfully');
        }
        catch (error) {
            logger_1.logger.error({
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
    static async uploadFile(buffer, filename, mimeType, folder = 'photos') {
        try {
            const blobName = `${folder}/${(0, uuid_1.v4)()}-${filename}`;
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
        }
        catch (error) {
            logger_1.logger.error({ error, filename, mimeType }, 'Failed to upload file to Azure Blob Storage');
            throw error;
        }
    }
    /**
     * Delete a file from Azure Blob Storage
     */
    static async deleteFile(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.deleteIfExists();
        }
        catch (error) {
            logger_1.logger.error({ error, blobName }, 'Failed to delete file from Azure Blob Storage');
            throw error;
        }
    }
    /**
     * Get blob name from URL
     */
    static getBlobNameFromUrl(url) {
        const urlParts = url.split('/');
        return urlParts.slice(-2).join('/'); // Get folder/filename
    }
    /**
     * Check if blob storage is available
     */
    static async isAvailable() {
        try {
            await this.containerClient.getProperties();
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Azure Blob Storage not available');
            return false;
        }
    }
}
exports.AzureBlobService = AzureBlobService;
//# sourceMappingURL=azureBlobService.js.map