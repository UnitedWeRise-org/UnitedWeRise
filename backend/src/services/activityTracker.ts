/**
 * Activity Tracker Service
 * Automatically tracks user activities for accountability and activity logs
 */

import { prisma } from '../lib/prisma';
import { ActivityType } from '@prisma/client';
import questService from './quest.service';

interface ActivityMetadata {
  title?: string;
  content?: string;
  contentPreview?: string;
  targetUsername?: string;
  previousContent?: string;
  editReason?: string;
  [key: string]: any;
}

export class ActivityTracker {
  /**
   * Track a user activity
   */
  static async track(
    userId: string,
    activityType: ActivityType,
    targetType: string,
    targetId: string,
    metadata: ActivityMetadata = {}
  ) {
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          activityType,
          targetType,
          targetId,
          metadata: metadata as any,
        },
      });

      console.log(`📊 Activity tracked: ${activityType} by user ${userId}`);

      // Update quest progress based on activity type
      try {
        await questService.updateQuestProgress(userId, activityType, metadata);
      } catch (questError) {
        console.error('Failed to update quest progress:', questError);
        // Don't throw - quest tracking shouldn't break main functionality
      }
    } catch (error) {
      console.error('Failed to track activity:', error);
      // Don't throw - activity tracking shouldn't break main functionality
    }
  }

  /**
   * Track post creation
   */
  static async trackPostCreated(userId: string, postId: string, content: string) {
    const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');

    await this.track(userId, ActivityType.POST_CREATED, 'post', postId, {
      content,
      contentPreview,
    });
  }

  /**
   * Track post editing
   */
  static async trackPostEdited(
    userId: string,
    postId: string,
    newContent: string,
    previousContent: string,
    editReason?: string
  ) {
    const contentPreview = newContent.substring(0, 100) + (newContent.length > 100 ? '...' : '');

    await this.track(userId, ActivityType.POST_EDITED, 'post', postId, {
      content: newContent,
      contentPreview,
      previousContent: previousContent.substring(0, 200),
      editReason,
    });
  }

  /**
   * Track post deletion
   */
  static async trackPostDeleted(
    userId: string,
    postId: string,
    content: string,
    deletedReason?: string
  ) {
    const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');

    await this.track(userId, ActivityType.POST_DELETED, 'post', postId, {
      contentPreview,
      deletedReason,
      originalContent: content.substring(0, 500), // Store more for accountability
    });
  }

  /**
   * Track comment creation
   */
  static async trackCommentCreated(
    userId: string,
    commentId: string,
    content: string,
    postId: string,
    postTitle?: string
  ) {
    const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');

    await this.track(userId, ActivityType.COMMENT_CREATED, 'comment', commentId, {
      content,
      contentPreview,
      postId,
      postTitle: postTitle?.substring(0, 100),
    });
  }

  /**
   * Track comment editing
   */
  static async trackCommentEdited(
    userId: string,
    commentId: string,
    newContent: string,
    previousContent: string,
    postId: string
  ) {
    const contentPreview = newContent.substring(0, 100) + (newContent.length > 100 ? '...' : '');

    await this.track(userId, ActivityType.COMMENT_EDITED, 'comment', commentId, {
      content: newContent,
      contentPreview,
      previousContent: previousContent.substring(0, 200),
      postId,
    });
  }

  /**
   * Track comment deletion
   */
  static async trackCommentDeleted(
    userId: string,
    commentId: string,
    content: string,
    postId: string,
    deletedReason?: string
  ) {
    const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');

    await this.track(userId, ActivityType.COMMENT_DELETED, 'comment', commentId, {
      contentPreview,
      deletedReason,
      originalContent: content.substring(0, 500),
      postId,
    });
  }

  /**
   * Track like addition
   */
  static async trackLikeAdded(userId: string, postId: string, postTitle?: string) {
    await this.track(userId, ActivityType.LIKE_ADDED, 'post', postId, {
      postTitle: postTitle?.substring(0, 100),
    });
  }

  /**
   * Track like removal
   */
  static async trackLikeRemoved(userId: string, postId: string, postTitle?: string) {
    await this.track(userId, ActivityType.LIKE_REMOVED, 'post', postId, {
      postTitle: postTitle?.substring(0, 100),
    });
  }

  /**
   * Track follow
   */
  static async trackFollowAdded(userId: string, targetUserId: string, targetUsername: string) {
    await this.track(userId, ActivityType.FOLLOW_ADDED, 'user', targetUserId, {
      targetUsername,
    });
  }

  /**
   * Track unfollow
   */
  static async trackFollowRemoved(userId: string, targetUserId: string, targetUsername: string) {
    await this.track(userId, ActivityType.FOLLOW_REMOVED, 'user', targetUserId, {
      targetUsername,
    });
  }

  /**
   * Track enhanced reaction changes (sentiment/stance)
   */
  static async trackReactionChanged(
    userId: string,
    postId: string,
    postTitle: string,
    reactionType: 'sentiment' | 'stance',
    oldValue: string | null,
    newValue: string | null
  ) {
    const metadata = {
      postTitle: postTitle?.substring(0, 100),
      reactionType,
      oldValue,
      newValue,
      change: oldValue && newValue ? 'modified' : newValue ? 'added' : 'removed'
    };

    await this.track(userId, ActivityType.REACTION_CHANGED, 'post', postId, metadata);
  }

  /**
   * Track post share
   */
  static async trackShareAdded(
    userId: string,
    postId: string,
    postTitle: string,
    shareType: 'SIMPLE' | 'QUOTE',
    quoteContent?: string
  ) {
    const metadata = {
      postTitle: postTitle?.substring(0, 100),
      shareType,
      hasQuote: shareType === 'QUOTE',
      quoteContent: quoteContent?.substring(0, 100)
    };

    await this.track(userId, ActivityType.SHARE_ADDED, 'post', postId, metadata);
  }

  /**
   * Track post share removal (unshare)
   */
  static async trackShareRemoved(
    userId: string,
    postId: string,
    postTitle: string,
    shareType: 'SIMPLE' | 'QUOTE'
  ) {
    const metadata = {
      postTitle: postTitle?.substring(0, 100),
      shareType
    };

    await this.track(userId, ActivityType.SHARE_REMOVED, 'post', postId, metadata);
  }

  /**
   * Get user activity log with filtering
   */
  static async getUserActivity(
    userId: string,
    options: {
      types?: ActivityType[];
      search?: string;
      offset?: number;
      limit?: number;
      includeTarget?: boolean;
    } = {}
  ) {
    const {
      types,
      search,
      offset = 0,
      limit = 20,
      includeTarget = false,
    } = options;

    const whereClause: any = {
      userId,
    };

    if (types && types.length > 0) {
      whereClause.activityType = {
        in: types,
      };
    }

    if (search) {
      whereClause.OR = [
        {
          metadata: {
            path: ['contentPreview'],
            string_contains: search,
          },
        },
        {
          metadata: {
            path: ['targetUsername'],
            string_contains: search,
          },
        },
        {
          metadata: {
            path: ['postTitle'],
            string_contains: search,
          },
        },
      ];
    }

    const activities = await prisma.userActivity.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
      include: includeTarget ? {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      } : undefined,
    });

    return activities;
  }

  /**
   * Get activity counts by type for a user
   */
  static async getActivityCounts(userId: string, timeframe?: { start: Date; end: Date }) {
    const whereClause: any = {
      userId,
    };

    if (timeframe) {
      whereClause.createdAt = {
        gte: timeframe.start,
        lte: timeframe.end,
      };
    }

    const counts = await prisma.userActivity.groupBy({
      by: ['activityType'],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    return counts.reduce((acc, item) => {
      acc[item.activityType] = item._count.id;
      return acc;
    }, {} as Record<ActivityType, number>);
  }
}

export default ActivityTracker;