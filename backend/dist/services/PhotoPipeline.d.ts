/**
 * PhotoPipeline Service
 *
 * Reusable photo processing pipeline supporting multiple photo types (avatar, post, gallery, etc.)
 *
 * Architecture:
 * - Stage 1: File validation (size, type, dimensions, signatures)
 * - Stage 2: Image processing (EXIF stripping, WebP conversion, optimization)
 * - Stage 3: AI content moderation (Azure OpenAI Vision)
 * - Stage 4: Azure Blob Storage upload
 * - Stage 5: Database persistence
 *
 * Features:
 * - Structured logging with requestId tracing
 * - Type-safe interfaces
 * - Comprehensive error handling
 * - Extensible for different photo types
 */
export interface PhotoFile {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname?: string;
}
export interface PhotoProcessingOptions {
    userId: string;
    requestId: string;
    file: PhotoFile;
    photoType?: string;
    gallery?: string;
    caption?: string;
}
export interface PhotoProcessingResult {
    photoId: string;
    url: string;
    blobName: string;
    requestId: string;
    originalSize: number;
    processedSize: number;
    sizeReduction: string;
    dimensions: {
        width: number;
        height: number;
    } | null;
    mimeType: string;
    originalMimeType: string;
    moderation: {
        decision: string;
        approved: boolean;
        reason?: string;
        contentType?: string;
        confidence?: number;
        processingTime?: number;
    };
    exifStripped: boolean;
}
interface ValidationResult {
    valid: boolean;
    error?: string;
    dimensions?: {
        width: number;
        height: number;
    };
}
interface ProcessedImage {
    buffer: Buffer;
    mimeType: string;
    extension: string;
    originalSize: number;
}
interface ModerationResult {
    category: string;
    approved: boolean;
    reason?: string;
    description?: string;
    contentType?: string;
    confidence?: number;
    processingTime?: number;
}
export declare class PhotoPipeline {
    private log;
    private validateFileSignature;
    private getImageDimensions;
    validateFile(file: PhotoFile, requestId: string): Promise<ValidationResult>;
    processImage(buffer: Buffer, mimeType: string, requestId: string): Promise<ProcessedImage>;
    moderateContent(buffer: Buffer, mimeType: string, userId: string, requestId: string, photoType?: string): Promise<ModerationResult>;
    uploadToBlob(buffer: Buffer, blobName: string, mimeType: string, requestId: string): Promise<string>;
    persistToDatabase(userId: string, url: string, blobName: string, mimeType: string, originalMimeType: string, originalSize: number, processedSize: number, dimensions: {
        width: number;
        height: number;
    } | null, moderationResult: ModerationResult, photoType: string, gallery: string | undefined, caption: string | undefined, requestId: string): Promise<any>;
    process(options: PhotoProcessingOptions): Promise<PhotoProcessingResult>;
}
export declare const photoPipeline: PhotoPipeline;
export {};
//# sourceMappingURL=PhotoPipeline.d.ts.map