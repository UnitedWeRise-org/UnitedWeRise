import { Photo, PhotoType, PhotoPurpose } from '@prisma/client';
import multer from 'multer';
interface PhotoUploadOptions {
    userId: string;
    photoType: PhotoType;
    purpose: PhotoPurpose;
    candidateId?: string;
    gallery?: string;
    postId?: string;
    caption?: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}
interface PhotoProcessingResult {
    id: string;
    url: string;
    thumbnailUrl: string;
    originalSize: number;
    compressedSize: number;
    width: number;
    height: number;
}
export declare class PhotoService {
    private static readonly UPLOAD_DIR;
    private static readonly THUMBNAIL_DIR;
    private static readonly MAX_FILE_SIZE;
    private static readonly MAX_ACCOUNT_STORAGE;
    private static readonly ALLOWED_TYPES;
    private static readonly SIZE_PRESETS;
    /**
     * Initialize photo storage (Azure Blob Storage)
     */
    static initializeDirectories(): Promise<void>;
    /**
     * Configure multer for photo uploads
     */
    static getMulterConfig(): multer.Multer;
    /**
     * Upload and process photo
     */
    static uploadPhoto(file: Express.Multer.File, options: PhotoUploadOptions): Promise<PhotoProcessingResult>;
    /**
     * Upload multiple photos
     */
    static uploadMultiplePhotos(files: Express.Multer.File[], options: PhotoUploadOptions): Promise<PhotoProcessingResult[]>;
    /**
     * Get user's photos
     */
    static getUserPhotos(userId: string, photoType?: PhotoType, purpose?: PhotoPurpose, candidateId?: string): Promise<Photo[]>;
    /**
     * Get candidate's campaign photos
     */
    static getCandidatePhotos(candidateId: string): Promise<Photo[]>;
    /**
     * Delete photo
     */
    static deletePhoto(photoId: string, userId: string): Promise<void>;
    /**
     * Set photo purpose (personal vs campaign)
     */
    static setPhotoPurpose(photoId: string, userId: string, purpose: PhotoPurpose, candidateId?: string): Promise<void>;
    /**
     * Flag photo for moderation
     */
    static flagPhoto(photoId: string, flaggedBy: string, reason: string): Promise<void>;
    /**
     * Approve photo (moderator action)
     */
    static approvePhoto(photoId: string, moderatorId: string): Promise<void>;
    /**
     * Get photos pending moderation
     */
    static getPendingModeration(): Promise<Photo[]>;
    /**
     * Validate storage limit (exposed for SAS token generation)
     */
    static validateStorageLimit(userId: string, fileSize: number): Promise<void>;
    /**
     * Validate user permissions (exposed for SAS token generation)
     */
    static validateUserPermissions(userId: string, candidateId?: string): Promise<void>;
    private static shouldAutoApprove;
    /**
     * Azure OpenAI Vision-powered content moderation
     */
    private static performContentModeration;
    private static updateProfileAvatar;
    /**
     * Get user's photo galleries (organized by gallery name)
     */
    static getUserGalleries(userId: string): Promise<{
        galleries: Array<{
            name: string;
            photos: any[];
            totalSize: number;
            photoCount: number;
        }>;
        totalStorageUsed: number;
        storageLimit: number;
    }>;
    /**
     * Move photo to different gallery
     */
    static movePhotoToGallery(photoId: string, userId: string, newGallery: string): Promise<void>;
    /**
     * Set user's profile picture
     */
    static setAsProfilePicture(photoId: string, userId: string): Promise<void>;
    /**
     * Get photo storage statistics
     */
    static getStorageStats(): Promise<{
        totalPhotos: number;
        totalSize: number;
        photosByType: Record<string, number>;
        pendingModeration: number;
    }>;
    /**
     * Create photo record from direct blob upload
     * Used after client uploads directly to Azure Blob Storage with SAS token
     */
    static createPhotoRecordFromBlob(options: {
        userId: string;
        blobName: string;
        blobUrl: string;
        photoType: PhotoType;
        purpose: PhotoPurpose;
        candidateId?: string;
        gallery?: string;
        caption?: string;
        fileSize: number;
        mimeType: string;
    }): Promise<Photo>;
    /**
     * Download blob buffer for processing using authenticated connection
     * Uses Azure SDK with connection string to bypass public access requirements
     * Includes retry logic for Azure eventual consistency
     */
    private static downloadBlobBuffer;
    /**
     * Validate image file using magic bytes (file signature)
     * Prevents upload of malware disguised as images
     */
    private static validateImageFile;
    /**
     * Cleanup blob from Azure Storage if upload validation fails
     */
    private static cleanupFailedBlob;
}
export {};
//# sourceMappingURL=photoService.d.ts.map