import { Photo, PhotoType, PhotoPurpose } from '@prisma/client';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { AzureBlobService } from './azureBlobService';

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
      const moderationResult = await this.performContentModeration(file, options.photoType);
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
        const processedGif = sharp(file.buffer, { animated: true })
          .resize(maxWidth, maxHeight, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .gif();
        
        imageBuffer = await processedGif.toBuffer();
        metadata = await sharp(imageBuffer).metadata();
      } else {
        // For static images, convert to WebP
        const processedImage = sharp(file.buffer)
          .resize(maxWidth, maxHeight, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .webp({ quality: options.quality || 85 });

        imageBuffer = await processedImage.toBuffer();
        metadata = await sharp(imageBuffer).metadata();
      }

      // Always create WebP thumbnail
      thumbnailBuffer = await sharp(file.buffer)
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

    for (const file of files) {
      try {
        const result = await this.uploadPhoto(file, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${file.originalname}:`, error);
        // Continue with other files
      }
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

  // Private helper methods

  private static async validateStorageLimit(userId: string, fileSize: number): Promise<void> {
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

  private static async validateUserPermissions(userId: string, candidateId?: string): Promise<void> {
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
  private static async performContentModeration(
    file: Express.Multer.File,
    photoType: PhotoType
  ): Promise<{ approved: boolean; reason?: string }> {
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
    const backendUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.unitedwerise.org'
      : process.env.NODE_ENV === 'staging' || process.env.STAGING_ENVIRONMENT === 'true'
      ? 'https://dev-api.unitedwerise.org'
      : `http://localhost:${process.env.PORT || 3001}`;

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
}