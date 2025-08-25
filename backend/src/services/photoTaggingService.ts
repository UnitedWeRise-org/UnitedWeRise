import { PhotoTag, PhotoTagStatus, PhotoPrivacyRequest, PhotoPrivacyRequestType, PhotoPrivacyRequestStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

// Using singleton prisma from lib/prisma.ts

interface CreateTagOptions {
  photoId: string;
  taggedById: string;
  taggedId: string;
  x: number;
  y: number;
}

interface TagApprovalOptions {
  tagId: string;
  userId: string;
  approve: boolean;
}

interface PrivacyRequestOptions {
  photoId: string;
  userId: string;
  type: PhotoPrivacyRequestType;
  reason?: string;
}

export class PhotoTaggingService {
  
  /**
   * Create a new photo tag
   */
  static async createTag(options: CreateTagOptions): Promise<PhotoTag> {
    const { photoId, taggedById, taggedId, x, y } = options;

    // Validate photo exists and is active
    const photo = await prisma.photo.findUnique({
      where: { id: photoId, isActive: true },
      include: { user: true }
    });

    if (!photo) {
      throw new Error('Photo not found or inactive');
    }

    // Check if user being tagged allows tagging
    const taggedUser = await prisma.user.findUnique({
      where: { id: taggedId }
    });

    if (!taggedUser || !taggedUser.photoTaggingEnabled) {
      throw new Error('User has disabled photo tagging');
    }

    // Check if only friends can tag
    if (taggedUser.allowTagsByFriendsOnly) {
      const friendship = await prisma.friendship.findUnique({
        where: {
          requesterId_recipientId: {
            requesterId: taggedById,
            recipientId: taggedId
          }
        }
      });

      const reverseFriendship = await prisma.friendship.findUnique({
        where: {
          requesterId_recipientId: {
            requesterId: taggedId,
            recipientId: taggedById
          }
        }
      });

      const areFriends = friendship?.status === 'ACCEPTED' || reverseFriendship?.status === 'ACCEPTED';
      
      if (!areFriends && taggedById !== photo.userId) {
        throw new Error('User only allows tagging by friends');
      }
    }

    // Create the tag
    const tag = await prisma.photoTag.create({
      data: {
        photoId,
        taggedById,
        taggedId,
        x,
        y,
        status: taggedUser.requireTagApproval ? 'PENDING' : 'APPROVED'
      },
      include: {
        taggedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        tagged: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Create notification if tag requires approval
    if (taggedUser.requireTagApproval) {
      await prisma.notification.create({
        data: {
          type: 'PHOTO_TAG_REQUEST',
          senderId: taggedById,
          receiverId: taggedId,
          message: `${taggedUser.firstName || taggedUser.username} wants to tag you in a photo`,
          read: false
        }
      });
    }

    console.log(`🏷️ Photo tag created: ${taggedUser.username} tagged by ${photo.user.username}`);
    return tag;
  }

  /**
   * Approve or decline a photo tag
   */
  static async respondToTag(options: TagApprovalOptions): Promise<PhotoTag> {
    const { tagId, userId, approve } = options;

    const tag = await prisma.photoTag.findUnique({
      where: { id: tagId },
      include: {
        tagged: true,
        taggedBy: true,
        photo: true
      }
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    if (tag.taggedId !== userId) {
      throw new Error('Only the tagged user can respond to this tag');
    }

    if (tag.status !== 'PENDING') {
      throw new Error('Tag has already been responded to');
    }

    const updatedTag = await prisma.photoTag.update({
      where: { id: tagId },
      data: {
        status: approve ? 'APPROVED' : 'DECLINED'
      },
      include: {
        taggedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        tagged: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Notify the tagger of the response
    await prisma.notification.create({
      data: {
        type: approve ? 'PHOTO_TAG_APPROVED' : 'PHOTO_TAG_DECLINED',
        senderId: userId,
        receiverId: tag.taggedById,
        message: approve 
          ? `${tag.tagged.firstName || tag.tagged.username} approved your photo tag`
          : `${tag.tagged.firstName || tag.tagged.username} declined your photo tag`,
        read: false
      }
    });

    console.log(`🏷️ Photo tag ${approve ? 'approved' : 'declined'}: ${tag.id}`);
    return updatedTag;
  }

  /**
   * Remove a photo tag
   */
  static async removeTag(tagId: string, userId: string): Promise<void> {
    const tag = await prisma.photoTag.findUnique({
      where: { id: tagId },
      include: { photo: true }
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    // Allow removal by: tagged user, tag creator, or photo owner
    if (tag.taggedId !== userId && tag.taggedById !== userId && tag.photo.userId !== userId) {
      throw new Error('Permission denied');
    }

    await prisma.photoTag.update({
      where: { id: tagId },
      data: { status: 'REMOVED' }
    });

    console.log(`🗑️ Photo tag removed: ${tagId}`);
  }

  /**
   * Get tags for a photo
   */
  static async getPhotoTags(photoId: string): Promise<PhotoTag[]> {
    return await prisma.photoTag.findMany({
      where: {
        photoId,
        status: 'APPROVED'
      },
      include: {
        tagged: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get pending tag approvals for a user
   */
  static async getPendingTags(userId: string): Promise<PhotoTag[]> {
    return await prisma.photoTag.findMany({
      where: {
        taggedId: userId,
        status: 'PENDING'
      },
      include: {
        taggedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        photo: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            caption: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create a privacy request
   */
  static async createPrivacyRequest(options: PrivacyRequestOptions): Promise<PhotoPrivacyRequest> {
    const { photoId, userId, type, reason } = options;

    const photo = await prisma.photo.findUnique({
      where: { id: photoId, isActive: true }
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Check if user has an existing request for this photo
    const existingRequest = await prisma.photoPrivacyRequest.findUnique({
      where: {
        photoId_userId: {
          photoId,
          userId
        }
      }
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      throw new Error('You already have a pending privacy request for this photo');
    }

    const request = await prisma.photoPrivacyRequest.create({
      data: {
        photoId,
        userId,
        type,
        reason: reason || '',
        status: 'PENDING'
      },
      include: {
        photo: {
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
        },
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

    // Notify photo owner
    await prisma.notification.create({
      data: {
        type: 'PRIVACY_REQUEST',
        senderId: userId,
        receiverId: photo.userId,
        message: `${request.user.firstName || request.user.username} has requested ${type.toLowerCase().replace('_', ' ')} for your photo`,
        read: false
      }
    });

    console.log(`🔒 Privacy request created: ${type} for photo ${photoId}`);
    return request;
  }

  /**
   * Update user tagging preferences
   */
  static async updateTaggingPreferences(userId: string, preferences: {
    photoTaggingEnabled?: boolean;
    requireTagApproval?: boolean;
    allowTagsByFriendsOnly?: boolean;
  }): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: preferences
    });

    console.log(`⚙️ Updated tagging preferences for user ${userId}`);
  }

  /**
   * Search users for tagging (respects privacy settings)
   */
  static async searchUsersForTagging(query: string, searcherId: string): Promise<any[]> {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } }
            ]
          },
          { photoTaggingEnabled: true }, // Only users who allow tagging
          { id: { not: searcherId } } // Don't include searcher
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        allowTagsByFriendsOnly: true
      },
      take: 10
    });

    // Filter users who only allow friends to tag
    const filteredUsers = [];
    for (const user of users) {
      if (!user.allowTagsByFriendsOnly) {
        filteredUsers.push(user);
      } else {
        // Check if they're friends
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: searcherId, recipientId: user.id, status: 'ACCEPTED' },
              { requesterId: user.id, recipientId: searcherId, status: 'ACCEPTED' }
            ]
          }
        });

        if (friendship) {
          filteredUsers.push(user);
        }
      }
    }

    return filteredUsers;
  }
}