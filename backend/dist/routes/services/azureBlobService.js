"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBlobService = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const uuid_1 = require("uuid");
class AzureBlobService {
    /**
     * Initialize Azure Blob Storage
     */
    static async initialize() {
        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable not set');
            }
            this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
            this.containerClient = this.blobServiceClient.getContainerClient(this.CONTAINER_NAME);
            // Create container if it doesn't exist
            await this.containerClient.createIfNotExists({
                access: 'blob' // Allow public read access to blobs
            });
            console.log('✅ Azure Blob Storage initialized');
        }
        catch (error) {
            console.error('Failed to initialize Azure Blob Storage:', error);
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
                    blobCacheControl: 'public, max-age=31536000' // Cache for 1 year
                }
            });
            // Return the public URL
            return blockBlobClient.url;
        }
        catch (error) {
            console.error('Failed to upload file to Azure Blob Storage:', error);
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
            console.error('Failed to delete file from Azure Blob Storage:', error);
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
            console.error('Azure Blob Storage not available:', error);
            return false;
        }
    }
}
exports.AzureBlobService = AzureBlobService;
AzureBlobService.CONTAINER_NAME = 'photos';
