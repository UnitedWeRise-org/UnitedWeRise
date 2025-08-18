"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoService = void 0;
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const azureBlobService_1 = require("./azureBlobService");
const prisma = new client_1.PrismaClient();
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
            const moderationResult = await this.performContentModeration(file, options.photoType);
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
                const processedGif = (0, sharp_1.default)(file.buffer, { animated: true })
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
                const processedImage = (0, sharp_1.default)(file.buffer)
                    .resize(maxWidth, maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .webp({ quality: options.quality || 85 });
                imageBuffer = await processedImage.toBuffer();
                metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            }
            // Always create WebP thumbnail
            thumbnailBuffer = await (0, sharp_1.default)(file.buffer)
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
            const photo = await prisma.photo.create({
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
     * Upload multiple photos
     */
    static async uploadMultiplePhotos(files, options) {
        const results = [];
        for (const file of files) {
            try {
                const result = await this.uploadPhoto(file, options);
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to upload file ${file.originalname}:`, error);
                // Continue with other files
            }
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
        return await prisma.photo.findMany({
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
        return await prisma.photo.findMany({
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
            const photo = await prisma.photo.findUnique({
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
            await prisma.photo.update({
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
            const photo = await prisma.photo.findUnique({
                where: { id: photoId }
            });
            if (!photo || photo.userId !== userId) {
                throw new Error('Photo not found or permission denied');
            }
            // If setting to CAMPAIGN or BOTH, validate candidate relationship
            if ((purpose === 'CAMPAIGN' || purpose === 'BOTH') && candidateId) {
                const candidate = await prisma.candidate.findUnique({
                    where: { id: candidateId }
                });
                if (!candidate || candidate.userId !== userId) {
                    throw new Error('Invalid candidate relationship');
                }
            }
            await prisma.photo.update({
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
        await prisma.photo.update({
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
        await prisma.photo.update({
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
        return await prisma.photo.findMany({
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
    // Private helper methods
    static async validateStorageLimit(userId, fileSize) {
        const userPhotos = await prisma.photo.findMany({
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
    static async validateUserPermissions(userId, candidateId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { candidateProfile: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        if (candidateId) {
            const candidate = await prisma.candidate.findUnique({
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
        // Post media needs content screening
        if (photoType === 'POST_MEDIA') {
            return false; // Require moderation for public post content
        }
        // Personal gallery photos can be auto-approved for regular users
        // (they're not public until used as profile pic or in posts)
        return true;
    }
    /**
     * Basic content moderation checks (can be enhanced with AI services)
     */
    static async performContentModeration(file, photoType) {
        // For now, implement basic file-based checks
        // TODO: Integrate with Azure Content Moderator or similar service
        // Check file properties for obvious issues
        if (file.size > this.MAX_FILE_SIZE) {
            return { approved: false, reason: 'File too large' };
        }
        // GIF-specific checks (can be CPU intensive, so basic for now)
        if (file.mimetype === 'image/gif') {
            // Basic size check for GIFs (they can be very large)
            if (file.size > 5 * 1024 * 1024) { // 5MB limit for GIFs
                return { approved: false, reason: 'GIF file too large (max 5MB for GIFs)' };
            }
        }
        // For public content (POST_MEDIA), require manual review
        if (photoType === 'POST_MEDIA') {
            return { approved: false, reason: 'Post media requires moderation review' };
        }
        // Auto-approve personal photos
        return { approved: true };
    }
    static async updateProfileAvatar(userId, photoUrl, candidateId) {
        try {
            // Update user avatar
            await prisma.user.update({
                where: { id: userId },
                data: { avatar: photoUrl }
            });
            // If this is for a candidate and they don't have a separate campaign photo,
            // we might also use it as their campaign headshot
            if (candidateId) {
                const existingCampaignPhoto = await prisma.photo.findFirst({
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
        const userPhotos = await prisma.photo.findMany({
            where: {
                userId,
                isActive: true,
                isApproved: true,
                photoType: { not: 'POST_MEDIA' } // Exclude post media from galleries
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, username: true }
                }
            }
        });
        // Group photos by gallery
        const galleryMap = new Map();
        let totalSize = 0;
        userPhotos.forEach(photo => {
            const galleryName = photo.gallery || 'My Photos';
            if (!galleryMap.has(galleryName)) {
                galleryMap.set(galleryName, []);
            }
            galleryMap.get(galleryName).push(photo);
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
        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        });
        if (!photo || photo.userId !== userId) {
            throw new Error('Photo not found or permission denied');
        }
        await prisma.photo.update({
            where: { id: photoId },
            data: { gallery: newGallery.trim() || 'My Photos' }
        });
        console.log(`📁 Photo moved to gallery: ${photoId} → ${newGallery}`);
    }
    /**
     * Set user's profile picture
     */
    static async setAsProfilePicture(photoId, userId) {
        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        });
        if (!photo || photo.userId !== userId) {
            throw new Error('Photo not found or permission denied');
        }
        if (photo.photoType !== 'GALLERY' && photo.photoType !== 'AVATAR') {
            throw new Error('Only gallery photos can be set as profile pictures');
        }
        // Update user's avatar
        await prisma.user.update({
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
            prisma.photo.count({ where: { isActive: true } }),
            prisma.photo.aggregate({
                where: { isActive: true },
                _sum: { compressedSize: true }
            }),
            prisma.photo.groupBy({
                by: ['photoType'],
                where: { isActive: true },
                _count: { _all: true }
            }),
            prisma.photo.count({
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
