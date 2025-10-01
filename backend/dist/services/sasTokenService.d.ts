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
export declare class SASTokenService {
    private static readonly CONTAINER_NAME;
    private static readonly SAS_EXPIRY_MINUTES;
    /**
     * Generate a SAS token for direct blob upload
     * Security: Token is blob-specific and time-limited with write-only permissions
     */
    static generateUploadToken(request: SASTokenRequest): Promise<SASTokenResponse>;
    /**
     * Verify blob exists in Azure Storage
     * Retries up to 3 times with delays to account for Azure's eventual consistency
     */
    static verifyBlobExists(blobName: string): Promise<boolean>;
    /**
     * Get blob metadata without downloading
     */
    static getBlobMetadata(blobName: string): Promise<{
        size: number;
        contentType: string;
        url: string;
    } | null>;
    /**
     * Delete blob if upload fails
     */
    static cleanupFailedUpload(blobName: string): Promise<void>;
    private static getExtensionFromMimeType;
    private static getFolderForPhotoType;
}
export {};
//# sourceMappingURL=sasTokenService.d.ts.map