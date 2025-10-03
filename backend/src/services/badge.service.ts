import { Badge, UserBadge, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';

interface BadgeQualificationCriteria {
  type: 'QUEST_COMPLETION' | 'USER_ACTIVITY' | 'CIVIC_ACTION' | 'SOCIAL_METRIC' | 'CUSTOM_ENDPOINT';
  requirements: {
    // Quest-based
    questTypes?: string[];
    questCompletionCount?: number;
    streakDays?: number;

    // Activity-based
    activityTypes?: string[];
    activityCount?: number;
    timeframe?: string; // '7d', '30d', 'all_time'

    // Civic actions
    petitionsSigned?: number;
    eventsAttended?: number;
    postsCreated?: number;

    // Social metrics
    reputationScore?: number;
    followersCount?: number;
    friendsCount?: number;

    // Custom endpoint check
    customEndpoint?: string;
    customParams?: any;
  };
}

interface BadgeCreateInput {
  name: string;
  description: string;
  imageFile?: Express.Multer.File;
  imageUrl?: string;
  qualificationCriteria: BadgeQualificationCriteria;
  isAutoAwarded?: boolean;
  maxAwards?: number;
  displayOrder?: number;
  createdBy?: string;
}

class BadgeService {
  private storageClient: BlobServiceClient;
  private containerName = 'photos'; // Using existing photos container

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      this.storageClient = BlobServiceClient.fromConnectionString(connectionString);
    }
  }

  // Upload badge image to Azure Storage
  async uploadBadgeImage(file: Express.Multer.File, badgeName: string): Promise<string> {
    if (!this.storageClient) {
      throw new Error('Azure Storage not configured');
    }

    const timestamp = Date.now();
    const safeName = badgeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `badges/${timestamp}-${safeName}.${file.originalname.split('.').pop()}`;

    const containerClient = this.storageClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype }
    });

    return blockBlobClient.url;
  }

  // Create a new badge
  async createBadge(data: BadgeCreateInput): Promise<Badge> {
    let imageUrl = data.imageUrl;

    // Upload image if provided
    if (data.imageFile) {
      imageUrl = await this.uploadBadgeImage(data.imageFile, data.name);
    }

    if (!imageUrl) {
      throw new Error('Badge image is required');
    }

    return await prisma.badge.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl,
        qualificationCriteria: data.qualificationCriteria as unknown as Prisma.InputJsonValue,
        isAutoAwarded: data.isAutoAwarded ?? true,
        maxAwards: data.maxAwards,
        displayOrder: data.displayOrder ?? 0,
        createdBy: data.createdBy
      }
    });
  }

  // Award badge to user
  async awardBadge(userId: string, badgeId: string, awardedBy?: string, reason?: string): Promise<UserBadge> {
    // Check if user already has this badge
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      }
    });

    if (existing) {
      throw new Error('User already has this badge');
    }

    // Check if badge has max awards limit
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        _count: {
          select: { userBadges: true }
        }
      }
    });

    if (!badge) {
      throw new Error('Badge not found');
    }

    if (badge.maxAwards && badge._count.userBadges >= badge.maxAwards) {
      throw new Error('Badge award limit reached');
    }

    // Award the badge
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        awardedBy,
        awardReason: reason
      },
      include: {
        badge: true
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        type: 'REACTION', // Using existing type, may want to add BADGE_EARNED later
        senderId: awardedBy || 'system',
        receiverId: userId,
        message: `You earned the "${badge.name}" badge!`
      }
    });

    return userBadge;
  }

  // Check if user qualifies for a badge
  async checkUserQualifications(userId: string, badgeId: string): Promise<boolean> {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId }
    });

    if (!badge) {
      throw new Error('Badge not found');
    }

    const criteria = badge.qualificationCriteria as unknown as BadgeQualificationCriteria;

    switch (criteria.type) {
      case 'QUEST_COMPLETION':
        return await this.checkQuestCriteria(userId, criteria.requirements);

      case 'USER_ACTIVITY':
        return await this.checkActivityCriteria(userId, criteria.requirements);

      case 'CIVIC_ACTION':
        return await this.checkCivicCriteria(userId, criteria.requirements);

      case 'SOCIAL_METRIC':
        return await this.checkSocialCriteria(userId, criteria.requirements);

      case 'CUSTOM_ENDPOINT':
        return await this.checkCustomEndpoint(userId, criteria.requirements);

      default:
        return false;
    }
  }

  private async checkQuestCriteria(userId: string, requirements: any): Promise<boolean> {
    if (requirements.questCompletionCount) {
      const completedQuests = await prisma.userQuestProgress.count({
        where: {
          userId,
          completed: true
        }
      });

      if (completedQuests < requirements.questCompletionCount) {
        return false;
      }
    }

    if (requirements.streakDays) {
      const streak = await prisma.userQuestStreak.findUnique({
        where: { userId }
      });

      if (!streak || streak.currentDailyStreak < requirements.streakDays) {
        return false;
      }
    }

    return true;
  }

  private async checkActivityCriteria(userId: string, requirements: any): Promise<boolean> {
    const whereClause: any = { userId };

    if (requirements.activityTypes) {
      whereClause.activityType = { in: requirements.activityTypes };
    }

    if (requirements.timeframe && requirements.timeframe !== 'all_time') {
      const days = parseInt(requirements.timeframe.replace('d', ''));
      const since = new Date();
      since.setDate(since.getDate() - days);
      whereClause.createdAt = { gte: since };
    }

    const activityCount = await prisma.userActivity.count({
      where: whereClause
    });

    return activityCount >= (requirements.activityCount || 0);
  }

  private async checkCivicCriteria(userId: string, requirements: any): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            petitionSignatures: true,
            eventRSVPs: true,
            posts: true
          }
        }
      }
    });

    if (!user) return false;

    if (requirements.petitionsSigned && user._count.petitionSignatures < requirements.petitionsSigned) {
      return false;
    }

    if (requirements.eventsAttended && user._count.eventRSVPs < requirements.eventsAttended) {
      return false;
    }

    if (requirements.postsCreated && user._count.posts < requirements.postsCreated) {
      return false;
    }

    return true;
  }

  private async checkSocialCriteria(userId: string, requirements: any): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        reputationScore: true,
        followersCount: true,
        _count: {
          select: {
            receivedFriendRequests: { where: { status: 'ACCEPTED' } },
            sentFriendRequests: { where: { status: 'ACCEPTED' } }
          }
        }
      }
    });

    if (!user) return false;

    if (requirements.reputationScore && (user.reputationScore || 0) < requirements.reputationScore) {
      return false;
    }

    if (requirements.followersCount && user.followersCount < requirements.followersCount) {
      return false;
    }

    if (requirements.friendsCount) {
      const friendsCount = user._count.receivedFriendRequests + user._count.sentFriendRequests;
      if (friendsCount < requirements.friendsCount) {
        return false;
      }
    }

    return true;
  }

  private async checkCustomEndpoint(userId: string, requirements: any): Promise<boolean> {
    // This would call a custom API endpoint to check special criteria
    // For now, return false as placeholder
    return false;
  }

  // Run automatic badge qualification checks for all active users
  async runBadgeQualificationChecks(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await prisma.user.findMany({
      where: {
        lastSeenAt: { gte: thirtyDaysAgo }
      },
      select: { id: true }
    });

    const activeBadges = await prisma.badge.findMany({
      where: {
        isActive: true,
        isAutoAwarded: true
      }
    });

    let badgesAwarded = 0;

    for (const user of activeUsers) {
      for (const badge of activeBadges) {
        const alreadyHas = await prisma.userBadge.findUnique({
          where: {
            userId_badgeId: {
              userId: user.id,
              badgeId: badge.id
            }
          }
        });

        if (!alreadyHas && await this.checkUserQualifications(user.id, badge.id)) {
          try {
            await this.awardBadge(user.id, badge.id, undefined, 'Automatically awarded for meeting criteria');
            badgesAwarded++;
          } catch (error) {
            console.error(`Error awarding badge ${badge.id} to user ${user.id}:`, error);
          }
        }
      }
    }

    return badgesAwarded;
  }

  // Get user's badge collection
  async getUserBadges(userId: string): Promise<any> {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true
      },
      orderBy: [
        { isDisplayed: 'desc' },
        { displayOrder: 'asc' },
        { earnedAt: 'desc' }
      ]
    });

    const displayedBadges = userBadges.filter(ub => ub.isDisplayed);
    const allBadges = userBadges;

    return {
      displayedBadges,
      allBadges,
      totalBadges: allBadges.length,
      recentlyEarned: allBadges.slice(0, 5)
    };
  }

  // Update user's badge display preferences
  async updateBadgeDisplay(userId: string, badgeId: string, isDisplayed: boolean, displayOrder?: number): Promise<UserBadge> {
    return await prisma.userBadge.update({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      },
      data: {
        isDisplayed,
        displayOrder
      },
      include: {
        badge: true
      }
    });
  }

  // Get all badges for admin management
  async getAllBadges(): Promise<Badge[]> {
    return await prisma.badge.findMany({
      include: {
        _count: {
          select: { userBadges: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // Update badge details
  async updateBadge(badgeId: string, updates: Partial<BadgeCreateInput>): Promise<Badge> {
    const data: any = {};

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.qualificationCriteria !== undefined) {
      data.qualificationCriteria = updates.qualificationCriteria as unknown as Prisma.InputJsonValue;
    }
    if (updates.isAutoAwarded !== undefined) data.isAutoAwarded = updates.isAutoAwarded;
    if (updates.maxAwards !== undefined) data.maxAwards = updates.maxAwards;
    if (updates.displayOrder !== undefined) data.displayOrder = updates.displayOrder;

    if (updates.imageFile) {
      data.imageUrl = await this.uploadBadgeImage(updates.imageFile, updates.name || 'badge');
    }

    return await prisma.badge.update({
      where: { id: badgeId },
      data
    });
  }

  // Delete badge
  async deleteBadge(badgeId: string): Promise<void> {
    // Soft delete by deactivating
    await prisma.badge.update({
      where: { id: badgeId },
      data: { isActive: false }
    });
  }
}

export default new BadgeService();