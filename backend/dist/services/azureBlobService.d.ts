export declare class AzureBlobService {
    private static blobServiceClient;
    private static containerClient;
    private static readonly CONTAINER_NAME;
    /**
     * Initialize Azure Blob Storage
     */
    static initialize(): Promise<void>;
    /**
     * Upload a file to Azure Blob Storage
     */
    static uploadFile(buffer: Buffer, filename: string, mimeType: string, folder?: string): Promise<string>;
    /**
     * Delete a file from Azure Blob Storage
     */
    static deleteFile(blobName: string): Promise<void>;
    /**
     * Get blob name from URL
     */
    static getBlobNameFromUrl(url: string): string;
    /**
     * Check if blob storage is available
     */
    static isAvailable(): Promise<boolean>;
}
//# sourceMappingURL=azureBlobService.d.ts.map