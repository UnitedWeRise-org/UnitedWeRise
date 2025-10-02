import { Photo, PhotoType, PhotoPurpose } from '@prisma/client';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { AzureBlobService } from './azureBlobService';
import { isProduction } from '../utils/environment';
import { imageContentModerationService } from './imageContentModerationService';
import { ModerationCategory, VisionAnalysisRequest } from '../types/moderation';

// Using singleton prisma from lib/prisma.ts

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

export class PhotoService {
  private static readonly UPLOAD_DIR = './uploads/photos';
  private static readonly THUMBNAIL_DIR = './uploads/thumbnails';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_ACCOUNT_STORAGE = 100 * 1024 * 1024; // 100MB per account
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  // Default sizing for different photo types
  private static readonly SIZE_PRESETS = {
    AVATAR: { width: 400, height: 400, thumbnailWidth: 150, thumbnailHeight: 150 },
    COVER: { width: 1200, height: 400, thumbnailWidth: 400, thumbnailHeight: 133 },
    CAMPAIGN: { width: 800, height: 1000, thumbnailWidth: 200, thumbnailHeight: 250 },
    VERIFICATION: { width: 1024, height: 1024, thumbnailWidth: 256, thumbnailHeight: 256 },
    EVENT: { width: 1200, height: 800, thumbnailWidth: 300, thumbnailHeight: 200 },
    GALLERY: { width: 1024, height: 1024, thumbnailWidth: 256, thumbnailHeight: 256 },
    POST_MEDIA: { width: 800, height: 800, thumbnailWidth: 200, thumbnailHeight: 200 }
  };

  /**
   * Initialize photo storage (Azure Blob Storage)
   */
  static async initializeDirectories(): Promise<void> {
    try {
      // Initialize Azure Blob Storage
      await AzureBlobService.initialize();
      
      // Still create local directories as fallback for development
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
      await fs.mkdir(this.THUMBNAIL_DIR, { recursive: true });
      
      console.log('✅ Photo storage initialized (Azure Blob + local fallback)');
    } catch (error) {
      console.error('Failed to initialize photo storage:', error);
      throw error;
    }
  }

  /**
   * Configure multer for photo uploads
   */
  static getMulterConfig(): multer.Multer {
    const storage = multer.memoryStorage(); // Store in memory for processing

    return multer({
      storage,
      limits: {
        fileSize: this.MAX_FILE_SIZE,
        files: 5 // Max 5 files per request
      },
      fileFilter: (req, file, cb) => {
        if (this.ALLOWED_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
      }
    });
  }

  /**
   * Upload and process photo
   */
  static async uploadPhoto(
    file: Express.Multer.File,
    options: PhotoUploadOptions
  ): Promise<PhotoProcessingResult> {
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
      const fileExtension = path.extname(file.originalname);
      const baseFilename = `${uuidv4()}-${options.photoType.toLowerCase()}`;
      const isGif = file.mimetype === 'image/gif';
      
      // Keep GIFs as GIFs, convert others to WebP for efficiency
      const filename = isGif ? `${baseFilename}.gif` : `${baseFilename}.webp`;
      const thumbnailFilename = `${baseFilename}-thumb.webp`; // Always WebP for thumbnails

      const filepath = path.join(this.UPLOAD_DIR, filename);
      const thumbnailPath = path.join(this.THUMBNAIL_DIR, thumbnailFilename);

      // Get size preset for photo type
      const preset = this.SIZE_PRESETS[options.photoType];
      const maxWidth = options.maxWidth || preset.width;
      const maxHeight = options.maxHeight || preset.height;

      let imageBuffer: Buffer;
      let thumbnailBuffer: Buffer;
      let metadata: sharp.Metadata;

      if (isGif) {
        // For GIFs, resize but keep format and animation
        // SECURITY: Strip EXIF metadata for privacy
        const processedGif = sharp(file.buffer, { animated: true })
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .gif();

        imageBuffer = await processedGif.toBuffer();
        metadata = await sharp(imageBuffer).metadata();
      } else {
        // For static images, convert to WebP
        // SECURITY: EXIF is automatically stripped when converting to WebP
        const processedImage = sharp(file.buffer)
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: options.quality || 85 });

        imageBuffer = await processedImage.toBuffer();
        metadata = await sharp(imageBuffer).metadata();
      }

      // Always create WebP thumbnail (EXIF automatically stripped)
      thumbnailBuffer = await sharp(file.buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(preset.thumbnailWidth, preset.thumbnailHeight, {
          fit: 'cover'
        })
        .webp({ quality: 75 })
        .toBuffer();

      // Upload to Azure Blob Storage
      let photoUrl: string;
      let thumbnailUrl: string;

      try {
        // Upload main photo
        photoUrl = await AzureBlobService.uploadFile(
          imageBuffer,
          filename,
          isGif ? 'image/gif' : 'image/webp',
          'photos'
        );

        // Upload thumbnail
        thumbnailUrl = await AzureBlobService.uploadFile(
          thumbnailBuffer,
          thumbnailFilename,
          'image/webp',
          'thumbnails'
        );

        console.log(`✅ Photos uploaded to Azure Blob Storage: ${photoUrl}`);
      } catch (blobError) {
        console.error('Azure Blob Storage upload failed, using local fallback:', blobError);
        
        // Fallback to local storage
        await fs.writeFile(filepath, imageBuffer);
        await fs.writeFile(thumbnailPath, thumbnailBuffer);
        
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
        thumbnailUrl: photo.thumbnailUrl!,
        originalSize: photo.originalSize,
        compressedSize: photo.compressedSize,
        width: photo.width,
        height: photo.height
      };

    } catch (error) {
      console.error('Photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload multiple photos
   */
  static async uploadMultiplePhotos(
    files: Express.Multer.File[],
    options: PhotoUploadOptions
  ): Promise<PhotoProcessingResult[]> {
    const results: PhotoProcessingResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadPhoto(file, options);
        results.push(result);
      } catch (error) {
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
  static async getUserPhotos(
    userId: string,
    photoType?: PhotoType,
    purpose?: PhotoPurpose,
    candidateId?: string
  ): Promise<Photo[]> {
    const where: any = {
      userId,
      isActive: true,
      isApproved: true
    };

    if (photoType) where.photoType = photoType;
    if (purpose) where.purpose = purpose;
    if (candidateId) where.candidateId = candidateId;

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
  static async getCandidatePhotos(candidateId: string): Promise<Photo[]> {
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
  static async deletePhoto(photoId: string, userId: string): Promise<void> {
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
        const fullPath = path.join(process.cwd(), photo.url);
        const thumbnailPath = path.join(process.cwd(), photo.thumbnailUrl || '');
        
        await fs.unlink(fullPath);
        if (photo.thumbnailUrl) {
          await fs.unlink(thumbnailPath);
        }
      } catch (fileError) {
        console.warn('Failed to delete physical files:', fileError);
        // Continue - database record is updated
      }

      console.log(`🗑️  Photo deleted: ${photoId}`);

    } catch (error) {
      console.error('Photo deletion failed:', error);
      throw error;
    }
  }

  /**
   * Set photo purpose (personal vs campaign)
   */
  static async setPhotoPurpose(
    photoId: string,
    userId: string,
    purpose: PhotoPurpose,
    candidateId?: string
  ): Promise<void> {
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

    } catch (error) {
      console.error('Failed to set photo purpose:', error);
      throw error;
    }
  }

  /**
   * Flag photo for moderation
   */
  static async flagPhoto(
    photoId: string,
    flaggedBy: string,
    reason: string
  ): Promise<void> {
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
  static async approvePhoto(photoId: string, moderatorId: string): Promise<void> {
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
  static async getPendingModeration(): Promise<Photo[]> {
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

  /**
   * Validate storage limit (exposed for SAS token generation)
   */
  static async validateStorageLimit(userId: string, fileSize: number): Promise<void> {
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

  /**
   * Validate user permissions (exposed for SAS token generation)
   */
  static async validateUserPermissions(userId: string, candidateId?: string): Promise<void> {
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

  private static shouldAutoApprove(photoType: PhotoType, userId: string): boolean {
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
      return !isProduction(); // Auto-approve in staging/development, require moderation in production
    }

    // Personal gallery photos can be auto-approved for regular users
    // (they're not public until used as profile pic or in posts)
    return true;
  }

  /**
   * Azure OpenAI Vision-powered content moderation
   */
  private static async performContentModeration(
    file: Express.Multer.File,
    photoType: PhotoType,
    userId?: string
  ): Promise<{ approved: boolean; reason?: string }> {
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
      if (!isProduction()) {
        // Still perform AI analysis but with more lenient settings
        const request: VisionAnalysisRequest = {
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

        const moderationResult = await imageContentModerationService.analyzeImage(request);

        console.log(`🔍 Content moderation (staging): ${photoType} - ${moderationResult.category} (${moderationResult.confidence})`);

        // In staging, only block if explicitly flagged as BLOCK
        return {
          approved: moderationResult.category !== ModerationCategory.BLOCK,
          reason: moderationResult.approved ? undefined : moderationResult.reason
        };
      }

      // Production content moderation with Azure Vision
      const request: VisionAnalysisRequest = {
        imageBuffer: file.buffer,
        mimeType: file.mimetype,
        photoType: photoType,
        userId: userId || 'unknown',
        config: {
          strictMode: true,
          isProduction: true
        }
      };

      const moderationResult = await imageContentModerationService.analyzeImage(request);

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

    } catch (error) {
      console.error('Content moderation error:', error);

      // Fallback behavior on moderation service failure
      if (isProduction()) {
        // In production, err on the side of caution
        return {
          approved: false,
          reason: 'Content moderation service temporarily unavailable. Please try again later.'
        };
      } else {
        // In staging/development, allow uploads to continue
        console.warn('Content moderation failed in development - allowing upload');
        return { approved: true };
      }
    }
  }

  private static async updateProfileAvatar(
    userId: string,
    photoUrl: string,
    candidateId?: string
  ): Promise<void> {
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

    } catch (error) {
      console.error('Failed to update profile avatar:', error);
      // Non-critical error - don't fail the upload
    }
  }

  /**
   * Get user's photo galleries (organized by gallery name)
   */
  static async getUserGalleries(userId: string): Promise<{
    galleries: Array<{
      name: string;
      photos: any[];
      totalSize: number;
      photoCount: number;
    }>;
    totalStorageUsed: number;
    storageLimit: number;
  }> {
    const userPhotos = await prisma.photo.findMany({
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
    const backendUrl = isProduction()
      ? 'https://api.unitedwerise.org'
      : 'https://dev-api.unitedwerise.org';

    // Group photos by gallery and transform URLs
    const galleryMap = new Map<string, any[]>();
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
      galleryMap.get(galleryName)!.push(transformedPhoto);
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
  static async movePhotoToGallery(
    photoId: string,
    userId: string,
    newGallery: string
  ): Promise<void> {
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
  static async setAsProfilePicture(
    photoId: string,
    userId: string
  ): Promise<void> {
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
  static async getStorageStats(): Promise<{
    totalPhotos: number;
    totalSize: number;
    photosByType: Record<string, number>;
    pendingModeration: number;
  }> {
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

    const photosByType: Record<string, number> = {};
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
  static async createPhotoRecordFromBlob(options: {
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
  }): Promise<Photo> {
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
      const moderationResult = await this.performContentModeration(
        { buffer: blobBuffer, mimetype: options.mimeType, size: options.fileSize, originalname: options.blobName } as any,
        options.photoType,
        options.userId
      );

      if (!moderationResult.approved) {
        console.error(`🚫 Content moderation failed: ${moderationResult.reason}`);
        await this.cleanupFailedBlob(options.blobName);
        throw new Error(moderationResult.reason || 'Content moderation failed');
      }
      console.log(`✅ Content moderation passed for ${options.blobName}`);

      // SECURITY: Strip EXIF metadata for privacy (GPS coordinates, camera serial numbers, etc.)
      console.log(`🔒 Stripping EXIF metadata from ${options.blobName}...`);
      const sanitizedBuffer = await sharp(blobBuffer)
        .rotate() // Auto-rotate based on EXIF orientation, then strip
        .withMetadata({
          exif: {}, // Remove all EXIF data
          icc: undefined, // Remove color profile if present
        })
        .toBuffer();

      // Get image metadata after sanitization
      const metadata = await sharp(sanitizedBuffer).metadata();

      // Generate thumbnail from sanitized image
      const preset = this.SIZE_PRESETS[options.photoType];
      const thumbnailBuffer = await sharp(sanitizedBuffer)
        .resize(preset.thumbnailWidth, preset.thumbnailHeight, {
          fit: 'cover'
        })
        .webp({ quality: 75 })
        .toBuffer();

      // Re-upload sanitized image to Azure (overwrites original)
      console.log(`🔒 Re-uploading sanitized image to ${options.blobName}...`);
      await AzureBlobService.uploadFile(
        sanitizedBuffer,
        options.blobName.split('/').pop() || options.blobName,
        options.mimeType,
        options.blobName.split('/')[0] // Use the folder from blobName
      );

      // Upload thumbnail to Azure Blob Storage
      const thumbnailFilename = options.blobName.replace(/\.[^.]+$/, '-thumb.webp');
      const thumbnailUrl = await AzureBlobService.uploadFile(
        thumbnailBuffer,
        thumbnailFilename.split('/').pop() || thumbnailFilename,
        'image/webp',
        'thumbnails'
      );

      // Create database record
      const photo = await prisma.photo.create({
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

    } catch (error) {
      console.error('Failed to create photo record from blob:', error);
      throw error;
    }
  }

  /**
   * Download blob buffer for processing using authenticated connection
   * Uses Azure SDK with connection string to bypass public access requirements
   * Includes retry logic for Azure eventual consistency
   */
  private static async downloadBlobBuffer(blobName: string): Promise<Buffer> {
    const maxRetries = 5;
    const retryDelayMs = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Downloading blob (attempt ${attempt}/${maxRetries}): ${blobName}`);

        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
          throw new Error('Azure Storage connection string not configured');
        }

        // Use Azure SDK with connection string for authenticated download
        const { BlobServiceClient } = await import('@azure/storage-blob');
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient('photos');
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Check if blob exists first (helps with clearer error messages)
        const exists = await blockBlobClient.exists();
        if (!exists) {
          console.log(`⏳ Blob not yet available (attempt ${attempt}/${maxRetries}), waiting...`);

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            continue;
          } else {
            throw new Error(`Blob does not exist after ${maxRetries} attempts: ${blobName}`);
          }
        }

        // Download blob data
        const downloadResponse = await blockBlobClient.download();

        if (!downloadResponse.readableStreamBody) {
          throw new Error('No data stream in download response');
        }

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        console.log(`✅ Downloaded blob: ${blobName} (${buffer.length} bytes) on attempt ${attempt}`);
        return buffer;

      } catch (error: any) {
        console.error(`❌ Blob download attempt ${attempt}/${maxRetries} failed:`, {
          error: error.message,
          code: error.code,
          blobName
        });

        // If not last attempt and it's a "not found" error, retry
        if (attempt < maxRetries && (
          error.code === 'BlobNotFound' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('not found')
        )) {
          console.log(`⏳ Retrying in ${retryDelayMs}ms due to Azure eventual consistency...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }

        // For other errors or last attempt, throw
        throw error;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error(`Failed to download blob after ${maxRetries} attempts: ${blobName}`);
  }

  /**
   * Validate image file using magic bytes (file signature)
   * Prevents upload of malware disguised as images
   */
  private static async validateImageFile(
    buffer: Buffer,
    declaredMimeType: string
  ): Promise<{ valid: boolean; reason?: string }> {
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

    } catch (error) {
      console.error('File validation error:', error);
      return { valid: false, reason: 'File validation failed' };
    }
  }

  /**
   * Cleanup blob from Azure Storage if upload validation fails
   */
  private static async cleanupFailedBlob(blobName: string): Promise<void> {
    try {
      console.log(`🗑️ Cleaning up failed upload: ${blobName}`);
      const { SASTokenService } = await import('./sasTokenService');
      await SASTokenService.cleanupFailedUpload(blobName);
    } catch (error) {
      console.error('Failed to cleanup blob (non-critical):', error);
      // Non-critical - don't throw
    }
  }
}