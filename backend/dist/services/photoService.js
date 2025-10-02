"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoService = void 0;
const prisma_1 = require("../lib/prisma");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const azureBlobService_1 = require("./azureBlobService");
const environment_1 = require("../utils/environment");
const imageContentModerationService_1 = require("./imageContentModerationService");
const moderation_1 = require("../types/moderation");
class PhotoService {
    /**
     * Initialize photo storage (Azure Blob Storage)
     */
    static async initializeDirectories() {
        try {
            // Initialize Azure Blob Storage
            await azureBlobService_1.AzureBlobService.initialize();
            // Still create local directories as fallback for development
            await promises_1.default.mkdir(this.UPLOAD_DIR, { recursive: true });
            await promises_1.default.mkdir(this.THUMBNAIL_DIR, { recursive: true });
            console.log('✅ Photo storage initialized (Azure Blob + local fallback)');
        }
        catch (error) {
            console.error('Failed to initialize photo storage:', error);
            throw error;
        }
    }
    /**
     * Configure multer for photo uploads
     */
    static getMulterConfig() {
        const storage = multer_1.default.memoryStorage(); // Store in memory for processing
        return (0, multer_1.default)({
            storage,
            limits: {
                fileSize: this.MAX_FILE_SIZE,
                files: 5 // Max 5 files per request
            },
            fileFilter: (req, file, cb) => {
                if (this.ALLOWED_TYPES.includes(file.mimetype)) {
                    cb(null, true);
                }
                else {
                    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
                }
            }
        });
    }
    /**
     * Upload and process photo
     */
    static async uploadPhoto(file, options) {
        try {
            console.log(`📸 Processing photo upload for user ${options.userId} (${options.photoType})`);
            // Validate user permissions
            await this.validateUserPermissions(options.userId, options.candidateId);
            // Check account storage limit
            await this.validateStorageLimit(options.userId, file.size);
            // Perform content moderation
            const moderationResult = await this.performContentModeration(file, options.photoType, options.userId);
            if (!moderationResult.approved) {
                throw new Error(moderationResult.reason || 'Content moderation failed');
            }
            // Generate unique filenames
            const fileExtension = path_1.default.extname(file.originalname);
            const baseFilename = `${(0, uuid_1.v4)()}-${options.photoType.toLowerCase()}`;
            const isGif = file.mimetype === 'image/gif';
            // Keep GIFs as GIFs, convert others to WebP for efficiency
            const filename = isGif ? `${baseFilename}.gif` : `${baseFilename}.webp`;
            const thumbnailFilename = `${baseFilename}-thumb.webp`; // Always WebP for thumbnails
            const filepath = path_1.default.join(this.UPLOAD_DIR, filename);
            const thumbnailPath = path_1.default.join(this.THUMBNAIL_DIR, thumbnailFilename);
            // Get size preset for photo type
            const preset = this.SIZE_PRESETS[options.photoType];
            const maxWidth = options.maxWidth || preset.width;
            const maxHeight = options.maxHeight || preset.height;
            let imageBuffer;
            let thumbnailBuffer;
            let metadata;
            if (isGif) {
                // For GIFs, resize but keep format and animation
                // SECURITY: Strip EXIF metadata for privacy
                const processedGif = (0, sharp_1.default)(file.buffer, { animated: true })
                    .rotate() // Auto-rotate based on EXIF orientation
                    .resize(maxWidth, maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .gif();
                imageBuffer = await processedGif.toBuffer();
                metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            }
            else {
                // For static images, convert to WebP
                // SECURITY: EXIF is automatically stripped when converting to WebP
                const processedImage = (0, sharp_1.default)(file.buffer)
                    .rotate() // Auto-rotate based on EXIF orientation
                    .resize(maxWidth, maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .webp({ quality: options.quality || 85 });
                imageBuffer = await processedImage.toBuffer();
                metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            }
            // Always create WebP thumbnail (EXIF automatically stripped)
            thumbnailBuffer = await (0, sharp_1.default)(file.buffer)
                .rotate() // Auto-rotate based on EXIF orientation
                .resize(preset.thumbnailWidth, preset.thumbnailHeight, {
                fit: 'cover'
            })
                .webp({ quality: 75 })
                .toBuffer();
            // Upload to Azure Blob Storage
            let photoUrl;
            let thumbnailUrl;
            try {
                // Upload main photo
                photoUrl = await azureBlobService_1.AzureBlobService.uploadFile(imageBuffer, filename, isGif ? 'image/gif' : 'image/webp', 'photos');
                // Upload thumbnail
                thumbnailUrl = await azureBlobService_1.AzureBlobService.uploadFile(thumbnailBuffer, thumbnailFilename, 'image/webp', 'thumbnails');
                console.log(`✅ Photos uploaded to Azure Blob Storage: ${photoUrl}`);
            }
            catch (blobError) {
                console.error('Azure Blob Storage upload failed, using local fallback:', blobError);
                // Fallback to local storage
                await promises_1.default.writeFile(filepath, imageBuffer);
                await promises_1.default.writeFile(thumbnailPath, thumbnailBuffer);
                photoUrl = `/uploads/photos/${filename}`;
                thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
            }
            // Save to database
            const photo = await prisma_1.prisma.photo.create({
                data: {
                    userId: options.userId,
                    candidateId: options.candidateId,
                    filename: file.originalname,
                    url: photoUrl,
                    thumbnailUrl: thumbnailUrl,
                    photoType: options.photoType,
                    purpose: options.purpose,
                    gallery: options.gallery || (options.photoType === 'GALLERY' ? 'My Photos' : null),
                    postId: options.postId,
                    caption: options.caption ? options.caption.substring(0, 200) : null, // Limit to 200 chars
                    originalSize: file.size,
                    compressedSize: imageBuffer.length,
                    width: metadata.width || 0,
                    height: metadata.height || 0,
                    mimeType: isGif ? 'image/gif' : 'image/webp',
                    isApproved: this.shouldAutoApprove(options.photoType, options.userId)
                }
            });
            // Update user/candidate avatar if this is an avatar photo
            if (options.photoType === 'AVATAR') {
                await this.updateProfileAvatar(options.userId, photo.url, options.candidateId);
            }
            console.log(`✅ Photo uploaded successfully: ${photo.id}`);
            return {
                id: photo.id,
                url: photo.url,
                thumbnailUrl: photo.thumbnailUrl,
                originalSize: photo.originalSize,
                compressedSize: photo.compressedSize,
                width: photo.width,
                height: photo.height
            };
        }
        catch (error) {
            console.error('Photo upload failed:', error);
            throw error;
        }
    }
    /**
     * Process and upload photo (backend-first architecture)
     * Receives file buffer from multer, processes BEFORE any blob upload
     */
    static async processAndUploadPhoto(options) {
        try {
            console.log('🔍 LAYER 7 | Photo Service | Starting processAndUploadPhoto:', {
                userId: options.userId,
                photoType: options.photoType,
                fileSize: options.fileSize,
                mimeType: options.mimeType
            });
            // STEP 1: Validate user permissions
            console.log('🔍 LAYER 7 | Photo Service | Validating user permissions');
            await this.validateUserPermissions(options.userId, options.candidateId);
            console.log('🔍 LAYER 7 | Photo Service | Permissions validated successfully');
            // STEP 2: Check account storage limit
            console.log('🔍 LAYER 7 | Photo Service | Checking storage limit');
            await this.validateStorageLimit(options.userId, options.fileSize);
            console.log('🔍 LAYER 7 | Photo Service | Storage limit check passed');
            // STEP 3: Validate image file (magic bytes check)
            console.log('🔍 LAYER 7 | Photo Service | Validating image file (magic bytes)');
            const fileValidation = await this.validateImageFile(options.fileBuffer, options.mimeType);
            if (!fileValidation.valid) {
                console.log('❌ LAYER 7 | Photo Service | File validation failed:', fileValidation.reason);
                throw new Error(fileValidation.reason || 'Invalid image file');
            }
            console.log('🔍 LAYER 7 | Photo Service | Image file validated successfully');
            // STEP 4: AI content moderation
            console.log('🔍 LAYER 7 | Photo Service | Starting AI content moderation');
            const moderationResult = await this.performContentModeration({
                buffer: options.fileBuffer,
                mimetype: options.mimeType,
                size: options.fileSize,
                originalname: options.filename
            }, options.photoType, options.userId);
            if (!moderationResult.approved) {
                console.log('❌ LAYER 7 | Photo Service | Content moderation rejected:', moderationResult.reason);
                throw new Error(moderationResult.reason || 'Content moderation failed');
            }
            console.log('🔍 LAYER 7 | Photo Service | Content moderation passed');
            // STEP 5: Strip EXIF metadata and process image
            console.log('🔍 LAYER 7 | Photo Service | Processing image with Sharp (EXIF stripping)');
            const fileExtension = path_1.default.extname(options.filename);
            const baseFilename = `${(0, uuid_1.v4)()}-${options.photoType.toLowerCase()}`;
            const isGif = options.mimeType === 'image/gif';
            const filename = isGif ? `${baseFilename}.gif` : `${baseFilename}.webp`;
            const thumbnailFilename = `${baseFilename}-thumb.webp`;
            const preset = this.SIZE_PRESETS[options.photoType];
            let imageBuffer;
            let metadata;
            if (isGif) {
                // For GIFs, resize but keep format and animation
                const processedGif = (0, sharp_1.default)(options.fileBuffer, { animated: true })
                    .rotate() // Auto-rotate based on EXIF, then strips EXIF
                    .resize(preset.width, preset.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .gif();
                imageBuffer = await processedGif.toBuffer();
                metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            }
            else {
                // For static images, convert to WebP (automatically strips EXIF)
                const processedImage = (0, sharp_1.default)(options.fileBuffer)
                    .rotate() // Auto-rotate based on EXIF
                    .resize(preset.width, preset.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .webp({ quality: 85 });
                imageBuffer = await processedImage.toBuffer();
                metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            }
            // STEP 6: Generate thumbnail
            const thumbnailBuffer = await (0, sharp_1.default)(options.fileBuffer)
                .rotate()
                .resize(preset.thumbnailWidth, preset.thumbnailHeight, {
                fit: 'cover'
            })
                .webp({ quality: 75 })
                .toBuffer();
            console.log('🔍 LAYER 7 | Photo Service | Sharp processing complete:', {
                originalSize: options.fileSize,
                processedSize: imageBuffer.length,
                thumbnailSize: thumbnailBuffer.length
            });
            // STEP 7: Upload sanitized image to blob ONCE
            console.log('🔍 LAYER 7 | Photo Service | Uploading to Azure Blob Storage');
            let photoUrl;
            let thumbnailUrl;
            // Upload main photo
            photoUrl = await azureBlobService_1.AzureBlobService.uploadFile(imageBuffer, filename, isGif ? 'image/gif' : 'image/webp', 'photos');
            // Upload thumbnail
            thumbnailUrl = await azureBlobService_1.AzureBlobService.uploadFile(thumbnailBuffer, thumbnailFilename, 'image/webp', 'thumbnails');
            console.log('🔍 LAYER 7 | Photo Service | Azure Blob upload complete:', {
                photoUrl,
                thumbnailUrl
            });
            // STEP 8: Create database record
            console.log('🔍 LAYER 7 | Photo Service | Creating database record');
            const photo = await prisma_1.prisma.photo.create({
                data: {
                    userId: options.userId,
                    candidateId: options.candidateId,
                    filename: options.filename,
                    url: photoUrl,
                    thumbnailUrl: thumbnailUrl,
                    photoType: options.photoType,
                    purpose: options.purpose,
                    gallery: options.gallery || (options.photoType === 'GALLERY' ? 'My Photos' : null),
                    caption: options.caption,
                    originalSize: options.fileSize,
                    compressedSize: imageBuffer.length,
                    width: metadata.width || 0,
                    height: metadata.height || 0,
                    mimeType: isGif ? 'image/gif' : 'image/webp',
                    isApproved: this.shouldAutoApprove(options.photoType, options.userId)
                }
            });
            // Update user/candidate avatar if this is an avatar photo
            if (options.photoType === 'AVATAR') {
                await this.updateProfileAvatar(options.userId, photo.url, options.candidateId);
            }
            console.log(`✅ Photo upload complete: ${photo.id}`);
            // STEP 9: Return photo record
            return {
                id: photo.id,
                url: photo.url,
                thumbnailUrl: photo.thumbnailUrl,
                width: photo.width,
                height: photo.height
            };
        }
        catch (error) {
            console.error('Photo processing failed:', error);
            throw error;
        }
    }
    /**
     * Upload multiple photos
     */
    static async uploadMultiplePhotos(files, options) {
        const results = [];
        const errors = [];
        for (const file of files) {
            try {
                const result = await this.uploadPhoto(file, options);
                results.push(result);
            }
            catch (error) {
                const errorMessage = `Failed to upload file ${file.originalname}: ${error instanceof Error ? error.message : String(error)}`;
                console.error(errorMessage, error);
                errors.push(errorMessage);
            }
        }
        // If we have errors but no successful uploads, throw error
        if (errors.length > 0 && results.length === 0) {
            throw new Error(`All file uploads failed: ${errors.join('; ')}`);
        }
        // If we have some errors but some successes, log warnings but continue
        if (errors.length > 0) {
            console.warn(`Some uploads failed (${errors.length} of ${files.length}):`, errors);
        }
        return results;
    }
    /**
     * Get user's photos
     */
    static async getUserPhotos(userId, photoType, purpose, candidateId) {
        const where = {
            userId,
            isActive: true,
            isApproved: true
        };
        if (photoType)
            where.photoType = photoType;
        if (purpose)
            where.purpose = purpose;
        if (candidateId)
            where.candidateId = candidateId;
        return await prisma_1.prisma.photo.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                candidate: candidateId ? {
                    select: {
                        id: true,
                        name: true,
                        party: true
                    }
                } : undefined
            }
        });
    }
    /**
     * Get candidate's campaign photos
     */
    static async getCandidatePhotos(candidateId) {
        return await prisma_1.prisma.photo.findMany({
            where: {
                candidateId,
                purpose: {
                    in: ['CAMPAIGN', 'BOTH']
                },
                isActive: true,
                isApproved: true
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
    }
    /**
     * Delete photo
     */
    static async deletePhoto(photoId, userId) {
        try {
            const photo = await prisma_1.prisma.photo.findUnique({
                where: { id: photoId }
            });
            if (!photo) {
                throw new Error('Photo not found');
            }
            // Check permissions
            if (photo.userId !== userId) {
                throw new Error('Permission denied: You can only delete your own photos');
            }
            // Mark as inactive instead of hard delete (for audit trail)
            await prisma_1.prisma.photo.update({
                where: { id: photoId },
                data: { isActive: false }
            });
            // Try to delete physical files (non-critical if fails)
            try {
                const fullPath = path_1.default.join(process.cwd(), photo.url);
                const thumbnailPath = path_1.default.join(process.cwd(), photo.thumbnailUrl || '');
                await promises_1.default.unlink(fullPath);
                if (photo.thumbnailUrl) {
                    await promises_1.default.unlink(thumbnailPath);
                }
            }
            catch (fileError) {
                console.warn('Failed to delete physical files:', fileError);
                // Continue - database record is updated
            }
            console.log(`🗑️  Photo deleted: ${photoId}`);
        }
        catch (error) {
            console.error('Photo deletion failed:', error);
            throw error;
        }
    }
    /**
     * Set photo purpose (personal vs campaign)
     */
    static async setPhotoPurpose(photoId, userId, purpose, candidateId) {
        try {
            const photo = await prisma_1.prisma.photo.findUnique({
                where: { id: photoId }
            });
            if (!photo || photo.userId !== userId) {
                throw new Error('Photo not found or permission denied');
            }
            // If setting to CAMPAIGN or BOTH, validate candidate relationship
            if ((purpose === 'CAMPAIGN' || purpose === 'BOTH') && candidateId) {
                const candidate = await prisma_1.prisma.candidate.findUnique({
                    where: { id: candidateId }
                });
                if (!candidate || candidate.userId !== userId) {
                    throw new Error('Invalid candidate relationship');
                }
            }
            await prisma_1.prisma.photo.update({
                where: { id: photoId },
                data: {
                    purpose,
                    candidateId: (purpose === 'CAMPAIGN' || purpose === 'BOTH') ? candidateId : null
                }
            });
            console.log(`🎯 Photo purpose updated: ${photoId} -> ${purpose}`);
        }
        catch (error) {
            console.error('Failed to set photo purpose:', error);
            throw error;
        }
    }
    /**
     * Flag photo for moderation
     */
    static async flagPhoto(photoId, flaggedBy, reason) {
        await prisma_1.prisma.photo.update({
            where: { id: photoId },
            data: {
                isApproved: false,
                flaggedBy,
                flagReason: reason,
                moderatedAt: new Date()
            }
        });
        console.log(`🚩 Photo flagged: ${photoId} by ${flaggedBy}`);
    }
    /**
     * Approve photo (moderator action)
     */
    static async approvePhoto(photoId, moderatorId) {
        await prisma_1.prisma.photo.update({
            where: { id: photoId },
            data: {
                isApproved: true,
                flaggedBy: null,
                flagReason: null,
                moderatedAt: new Date()
            }
        });
        console.log(`✅ Photo approved: ${photoId} by ${moderatorId}`);
    }
    /**
     * Get photos pending moderation
     */
    static async getPendingModeration() {
        return await prisma_1.prisma.photo.findMany({
            where: {
                OR: [
                    { isApproved: false, flaggedBy: { not: null } },
                    { isApproved: false, photoType: 'VERIFICATION' }
                ],
                isActive: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                candidate: {
                    select: {
                        id: true,
                        name: true,
                        party: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }
    /**
     * Validate storage limit (exposed for SAS token generation)
     */
    static async validateStorageLimit(userId, fileSize) {
        const userPhotos = await prisma_1.prisma.photo.findMany({
            where: {
                userId,
                isActive: true
            },
            select: {
                compressedSize: true
            }
        });
        const currentUsage = userPhotos.reduce((total, photo) => total + photo.compressedSize, 0);
        if (currentUsage + fileSize > this.MAX_ACCOUNT_STORAGE) {
            const usageMB = Math.round(currentUsage / 1024 / 1024);
            const limitMB = Math.round(this.MAX_ACCOUNT_STORAGE / 1024 / 1024);
            throw new Error(`Storage limit exceeded. Current usage: ${usageMB}MB, Limit: ${limitMB}MB. Please delete some photos to free up space.`);
        }
    }
    /**
     * Validate user permissions (exposed for SAS token generation)
     */
    static async validateUserPermissions(userId, candidateId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: { candidateProfile: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        if (candidateId) {
            const candidate = await prisma_1.prisma.candidate.findUnique({
                where: { id: candidateId }
            });
            if (!candidate || candidate.userId !== userId) {
                throw new Error('Invalid candidate permissions');
            }
        }
    }
    static shouldAutoApprove(photoType, userId) {
        // Verification photos need manual approval
        if (photoType === 'VERIFICATION') {
            return false;
        }
        // Campaign photos might need approval based on platform policy
        if (photoType === 'CAMPAIGN') {
            return false; // Require moderation for campaign materials
        }
        // Post media needs content screening in production only
        if (photoType === 'POST_MEDIA') {
            return !(0, environment_1.isProduction)(); // Auto-approve in staging/development, require moderation in production
        }
        // Personal gallery photos can be auto-approved for regular users
        // (they're not public until used as profile pic or in posts)
        return true;
    }
    /**
     * Azure OpenAI Vision-powered content moderation
     */
    static async performContentModeration(file, photoType, userId) {
        try {
            // Basic file validation first
            if (file.size > this.MAX_FILE_SIZE) {
                return { approved: false, reason: 'File too large' };
            }
            // GIF-specific size checks
            if (file.mimetype === 'image/gif') {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit for GIFs
                    return { approved: false, reason: 'GIF file too large (max 5MB for GIFs)' };
                }
            }
            // For development/staging, perform lighter moderation
            if (!(0, environment_1.isProduction)()) {
                // Still perform AI analysis but with more lenient settings
                const request = {
                    imageBuffer: file.buffer,
                    mimeType: file.mimetype,
                    photoType: photoType,
                    userId: userId || 'unknown',
                    config: {
                        strictMode: false,
                        allowNewsworthyContent: true,
                        allowMedicalContent: true
                    }
                };
                const moderationResult = await imageContentModerationService_1.imageContentModerationService.analyzeImage(request);
                console.log(`🔍 Content moderation (staging): ${photoType} - ${moderationResult.category} (${moderationResult.confidence})`);
                // In staging, only block if explicitly flagged as BLOCK
                return {
                    approved: moderationResult.category !== moderation_1.ModerationCategory.BLOCK,
                    reason: moderationResult.approved ? undefined : moderationResult.reason
                };
            }
            // Production content moderation with Azure Vision
            const request = {
                imageBuffer: file.buffer,
                mimeType: file.mimetype,
                photoType: photoType,
                userId: userId || 'unknown',
                config: {
                    strictMode: true,
                    isProduction: true
                }
            };
            const moderationResult = await imageContentModerationService_1.imageContentModerationService.analyzeImage(request);
            console.log(`🔍 Content moderation (production): ${photoType} - ${moderationResult.category} (${moderationResult.confidence})`);
            console.log(`📋 Content details: ${moderationResult.description}`);
            // Log detailed moderation results for audit trail
            if (!moderationResult.approved) {
                console.warn(`🚫 Content blocked:`, {
                    userId: userId,
                    photoType: photoType,
                    category: moderationResult.category,
                    contentType: moderationResult.contentType,
                    reason: moderationResult.reason,
                    confidence: moderationResult.confidence
                });
            }
            return {
                approved: moderationResult.approved,
                reason: moderationResult.approved ? undefined : moderationResult.reason
            };
        }
        catch (error) {
            console.error('Content moderation error:', error);
            // Fallback behavior on moderation service failure
            if ((0, environment_1.isProduction)()) {
                // In production, err on the side of caution
                return {
                    approved: false,
                    reason: 'Content moderation service temporarily unavailable. Please try again later.'
                };
            }
            else {
                // In staging/development, allow uploads to continue
                console.warn('Content moderation failed in development - allowing upload');
                return { approved: true };
            }
        }
    }
    static async updateProfileAvatar(userId, photoUrl, candidateId) {
        try {
            // Update user avatar
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: { avatar: photoUrl }
            });
            // If this is for a candidate and they don't have a separate campaign photo,
            // we might also use it as their campaign headshot
            if (candidateId) {
                const existingCampaignPhoto = await prisma_1.prisma.photo.findFirst({
                    where: {
                        candidateId,
                        photoType: 'CAMPAIGN',
                        isActive: true,
                        isApproved: true
                    }
                });
                // If no dedicated campaign photo exists, create one from the avatar
                if (!existingCampaignPhoto) {
                    console.log(`📸 Creating campaign photo from avatar for candidate ${candidateId}`);
                }
            }
        }
        catch (error) {
            console.error('Failed to update profile avatar:', error);
            // Non-critical error - don't fail the upload
        }
    }
    /**
     * Get user's photo galleries (organized by gallery name)
     */
    static async getUserGalleries(userId) {
        const userPhotos = await prisma_1.prisma.photo.findMany({
            where: {
                userId,
                isActive: true,
                // Temporarily remove isApproved filter to debug
                // isApproved: true,
                photoType: { not: 'POST_MEDIA' } // Exclude post media from galleries
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, username: true }
                }
            }
        });
        console.log(`📸 Found ${userPhotos.length} photos for user ${userId}`);
        // Get the backend URL for constructing absolute URLs
        const backendUrl = (0, environment_1.isProduction)()
            ? 'https://api.unitedwerise.org'
            : 'https://dev-api.unitedwerise.org';
        // Group photos by gallery and transform URLs
        const galleryMap = new Map();
        let totalSize = 0;
        userPhotos.forEach(photo => {
            const galleryName = photo.gallery || 'My Photos';
            // Debug logging
            if (userPhotos.indexOf(photo) === 0) {
                console.log('📸 Sample photo URL from DB:', photo.url);
                console.log('📸 Sample thumbnail URL from DB:', photo.thumbnailUrl);
            }
            // Transform relative URLs to absolute URLs
            const transformedPhoto = {
                ...photo,
                url: photo.url.startsWith('http') ? photo.url : `${backendUrl}${photo.url}`,
                thumbnailUrl: photo.thumbnailUrl
                    ? (photo.thumbnailUrl.startsWith('http') ? photo.thumbnailUrl : `${backendUrl}${photo.thumbnailUrl}`)
                    : null
            };
            if (userPhotos.indexOf(photo) === 0) {
                console.log('📸 Transformed photo URL:', transformedPhoto.url);
                console.log('📸 Transformed thumbnail URL:', transformedPhoto.thumbnailUrl);
            }
            if (!galleryMap.has(galleryName)) {
                galleryMap.set(galleryName, []);
            }
            galleryMap.get(galleryName).push(transformedPhoto);
            totalSize += photo.compressedSize;
        });
        // Convert to array format
        const galleries = Array.from(galleryMap.entries()).map(([name, photos]) => ({
            name,
            photos,
            totalSize: photos.reduce((sum, p) => sum + p.compressedSize, 0),
            photoCount: photos.length
        }));
        return {
            galleries,
            totalStorageUsed: totalSize,
            storageLimit: this.MAX_ACCOUNT_STORAGE
        };
    }
    /**
     * Move photo to different gallery
     */
    static async movePhotoToGallery(photoId, userId, newGallery) {
        const photo = await prisma_1.prisma.photo.findUnique({
            where: { id: photoId }
        });
        if (!photo || photo.userId !== userId) {
            throw new Error('Photo not found or permission denied');
        }
        await prisma_1.prisma.photo.update({
            where: { id: photoId },
            data: { gallery: newGallery.trim() || 'My Photos' }
        });
        console.log(`📁 Photo moved to gallery: ${photoId} → ${newGallery}`);
    }
    /**
     * Set user's profile picture
     */
    static async setAsProfilePicture(photoId, userId) {
        const photo = await prisma_1.prisma.photo.findUnique({
            where: { id: photoId }
        });
        if (!photo || photo.userId !== userId) {
            throw new Error('Photo not found or permission denied');
        }
        if (photo.photoType !== 'GALLERY' && photo.photoType !== 'AVATAR') {
            throw new Error('Only gallery photos can be set as profile pictures');
        }
        // Update user's avatar
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { avatar: photo.url }
        });
        console.log(`👤 Profile picture updated: ${userId} → ${photo.url}`);
    }
    /**
     * Get photo storage statistics
     */
    static async getStorageStats() {
        const [totalCount, sizeAgg, typeCount, pendingCount] = await Promise.all([
            prisma_1.prisma.photo.count({ where: { isActive: true } }),
            prisma_1.prisma.photo.aggregate({
                where: { isActive: true },
                _sum: { compressedSize: true }
            }),
            prisma_1.prisma.photo.groupBy({
                by: ['photoType'],
                where: { isActive: true },
                _count: { _all: true }
            }),
            prisma_1.prisma.photo.count({
                where: {
                    isActive: true,
                    isApproved: false
                }
            })
        ]);
        const photosByType = {};
        typeCount.forEach(item => {
            photosByType[item.photoType] = item._count._all;
        });
        return {
            totalPhotos: totalCount,
            totalSize: sizeAgg._sum.compressedSize || 0,
            photosByType,
            pendingModeration: pendingCount
        };
    }
    /**
     * Create photo record from direct blob upload
     * Used after client uploads directly to Azure Blob Storage with SAS token
     */
    static async createPhotoRecordFromBlob(options) {
        try {
            console.log(`📸 Creating photo record from blob: ${options.blobName}`);
            // Download blob for security validation and processing (using authenticated connection)
            const blobBuffer = await this.downloadBlobBuffer(options.blobName);
            // SECURITY: Validate file is actually an image (magic bytes check)
            const fileValidation = await this.validateImageFile(blobBuffer, options.mimeType);
            if (!fileValidation.valid) {
                console.error(`🚫 File validation failed: ${fileValidation.reason}`);
                await this.cleanupFailedBlob(options.blobName);
                throw new Error(fileValidation.reason || 'Invalid image file');
            }
            // SECURITY: AI Content Moderation (CRITICAL - protects against illegal content)
            console.log(`🔍 Performing AI content moderation on ${options.blobName}...`);
            const moderationResult = await this.performContentModeration({ buffer: blobBuffer, mimetype: options.mimeType, size: options.fileSize, originalname: options.blobName }, options.photoType, options.userId);
            if (!moderationResult.approved) {
                console.error(`🚫 Content moderation failed: ${moderationResult.reason}`);
                await this.cleanupFailedBlob(options.blobName);
                throw new Error(moderationResult.reason || 'Content moderation failed');
            }
            console.log(`✅ Content moderation passed for ${options.blobName}`);
            // SECURITY: Strip EXIF metadata for privacy (GPS coordinates, camera serial numbers, etc.)
            console.log(`🔒 Stripping EXIF metadata from ${options.blobName}...`);
            const sanitizedBuffer = await (0, sharp_1.default)(blobBuffer)
                .rotate() // Auto-rotate based on EXIF orientation, then strip
                .withMetadata({
                exif: {}, // Remove all EXIF data
                icc: undefined, // Remove color profile if present
            })
                .toBuffer();
            // Get image metadata after sanitization
            const metadata = await (0, sharp_1.default)(sanitizedBuffer).metadata();
            // Generate thumbnail from sanitized image
            const preset = this.SIZE_PRESETS[options.photoType];
            const thumbnailBuffer = await (0, sharp_1.default)(sanitizedBuffer)
                .resize(preset.thumbnailWidth, preset.thumbnailHeight, {
                fit: 'cover'
            })
                .webp({ quality: 75 })
                .toBuffer();
            // Re-upload sanitized image to Azure (overwrites original at SAME path)
            console.log(`🔒 Re-uploading sanitized image to ${options.blobName}...`);
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('Azure Storage connection string not configured');
            }
            const { BlobServiceClient } = await Promise.resolve().then(() => __importStar(require('@azure/storage-blob')));
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient('photos');
            const sanitizedBlobClient = containerClient.getBlockBlobClient(options.blobName); // SAME path as original
            // Upload sanitized version - automatically overwrites original blob at same path
            await sanitizedBlobClient.uploadData(sanitizedBuffer, {
                blobHTTPHeaders: {
                    blobContentType: options.mimeType,
                    blobCacheControl: 'public, max-age=31536000'
                }
            });
            console.log(`✅ Sanitized image uploaded, original overwritten at: ${options.blobName}`);
            // Upload thumbnail to Azure Blob Storage
            const thumbnailFilename = options.blobName.replace(/\.[^.]+$/, '-thumb.webp');
            const thumbnailUrl = await azureBlobService_1.AzureBlobService.uploadFile(thumbnailBuffer, thumbnailFilename.split('/').pop() || thumbnailFilename, 'image/webp', 'thumbnails');
            // Create database record
            const photo = await prisma_1.prisma.photo.create({
                data: {
                    userId: options.userId,
                    candidateId: options.candidateId,
                    filename: options.blobName,
                    url: options.blobUrl,
                    thumbnailUrl: thumbnailUrl,
                    photoType: options.photoType,
                    purpose: options.purpose,
                    gallery: options.gallery || (options.photoType === 'GALLERY' ? 'My Photos' : null),
                    caption: options.caption ? options.caption.substring(0, 200) : null,
                    originalSize: options.fileSize,
                    compressedSize: sanitizedBuffer.length, // Size after sanitization
                    width: metadata.width || 0,
                    height: metadata.height || 0,
                    mimeType: options.mimeType,
                    isApproved: this.shouldAutoApprove(options.photoType, options.userId)
                }
            });
            // Update user/candidate avatar if this is an avatar photo
            if (options.photoType === 'AVATAR') {
                await this.updateProfileAvatar(options.userId, photo.url, options.candidateId);
            }
            console.log(`✅ Photo record created from blob with full security validation: ${photo.id}`);
            return photo;
        }
        catch (error) {
            console.error('Failed to create photo record from blob:', error);
            throw error;
        }
    }
    /**
     * Download blob buffer for processing using authenticated connection
     * Uses Azure SDK with connection string for authenticated access
     */
    static async downloadBlobBuffer(blobName) {
        try {
            console.log(`📥 Downloading blob: ${blobName}`);
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('Azure Storage connection string not configured');
            }
            // Use Azure SDK with connection string for authenticated download
            const { BlobServiceClient } = await Promise.resolve().then(() => __importStar(require('@azure/storage-blob')));
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient('photos');
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            console.log(`📥 Blob URL: ${blockBlobClient.url}`);
            // Download blob data
            const downloadResponse = await blockBlobClient.download();
            if (!downloadResponse.readableStreamBody) {
                throw new Error('No data stream in download response');
            }
            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
                chunks.push(Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            console.log(`✅ Downloaded blob: ${blobName} (${buffer.length} bytes)`);
            return buffer;
        }
        catch (error) {
            console.error(`❌ Blob download failed:`, {
                blobName,
                error: error.message,
                code: error.code,
                statusCode: error.statusCode,
                details: error.details
            });
            throw error;
        }
    }
    /**
     * Validate image file using magic bytes (file signature)
     * Prevents upload of malware disguised as images
     */
    static async validateImageFile(buffer, declaredMimeType) {
        try {
            // Check magic bytes (file signature)
            const magicBytes = buffer.slice(0, 12);
            // JPEG: FF D8 FF
            if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
                if (!declaredMimeType.includes('jpeg') && !declaredMimeType.includes('jpg')) {
                    return { valid: false, reason: 'File is JPEG but declared as ' + declaredMimeType };
                }
                return { valid: true };
            }
            // PNG: 89 50 4E 47 0D 0A 1A 0A
            if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 &&
                magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
                if (!declaredMimeType.includes('png')) {
                    return { valid: false, reason: 'File is PNG but declared as ' + declaredMimeType };
                }
                return { valid: true };
            }
            // GIF: 47 49 46 38 (GIF8)
            if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 &&
                magicBytes[2] === 0x46 && magicBytes[3] === 0x38) {
                if (!declaredMimeType.includes('gif')) {
                    return { valid: false, reason: 'File is GIF but declared as ' + declaredMimeType };
                }
                return { valid: true };
            }
            // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
            if (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 &&
                magicBytes[2] === 0x46 && magicBytes[3] === 0x46 &&
                magicBytes[8] === 0x57 && magicBytes[9] === 0x45 &&
                magicBytes[10] === 0x42 && magicBytes[11] === 0x50) {
                if (!declaredMimeType.includes('webp')) {
                    return { valid: false, reason: 'File is WebP but declared as ' + declaredMimeType };
                }
                return { valid: true };
            }
            // If none of the magic bytes match, file is not a valid image
            return {
                valid: false,
                reason: 'File is not a valid image (magic bytes check failed)'
            };
        }
        catch (error) {
            console.error('File validation error:', error);
            return { valid: false, reason: 'File validation failed' };
        }
    }
    /**
     * Cleanup blob from Azure Storage if upload validation fails
     */
    static async cleanupFailedBlob(blobName) {
        try {
            console.log(`🗑️ Cleaning up failed upload: ${blobName}`);
            const { SASTokenService } = await Promise.resolve().then(() => __importStar(require('./sasTokenService')));
            await SASTokenService.cleanupFailedUpload(blobName);
        }
        catch (error) {
            console.error('Failed to cleanup blob (non-critical):', error);
            // Non-critical - don't throw
        }
    }
}
exports.PhotoService = PhotoService;
PhotoService.UPLOAD_DIR = './uploads/photos';
PhotoService.THUMBNAIL_DIR = './uploads/thumbnails';
PhotoService.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
PhotoService.MAX_ACCOUNT_STORAGE = 100 * 1024 * 1024; // 100MB per account
PhotoService.ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Default sizing for different photo types
PhotoService.SIZE_PRESETS = {
    AVATAR: { width: 400, height: 400, thumbnailWidth: 150, thumbnailHeight: 150 },
    COVER: { width: 1200, height: 400, thumbnailWidth: 400, thumbnailHeight: 133 },
    CAMPAIGN: { width: 800, height: 1000, thumbnailWidth: 200, thumbnailHeight: 250 },
    VERIFICATION: { width: 1024, height: 1024, thumbnailWidth: 256, thumbnailHeight: 256 },
    EVENT: { width: 1200, height: 800, thumbnailWidth: 300, thumbnailHeight: 200 },
    GALLERY: { width: 1024, height: 1024, thumbnailWidth: 256, thumbnailHeight: 256 },
    POST_MEDIA: { width: 800, height: 800, thumbnailWidth: 200, thumbnailHeight: 200 }
};
//# sourceMappingURL=photoService.js.map