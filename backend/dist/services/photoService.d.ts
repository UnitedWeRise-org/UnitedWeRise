import { Photo, PhotoType, PhotoPurpose } from '@prisma/client';
import multer from 'multer';
interface PhotoUploadOptions {
    userId: string;
    photoType: PhotoType;
    purpose: PhotoPurpose;
    candidateId?: string;
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
    private static readonly ALLOWED_TYPES;
    private static readonly SIZE_PRESETS;
    /**
     * Initialize upload directories
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
    private static validateUserPermissions;
    private static shouldAutoApprove;
    private static updateProfileAvatar;
    /**
     * Get photo storage statistics
     */
    static getStorageStats(): Promise<{
        totalPhotos: number;
        totalSize: number;
        photosByType: Record<string, number>;
        pendingModeration: number;
    }>;
}
export {};
//# sourceMappingURL=photoService.d.ts.map