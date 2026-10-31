import { prisma } from '../lib/prisma';
import { createNotification } from '../routes/notifications';
import { logger } from './logger';

/**
 * Creates MENTION notifications for @username references in posts/comments.
 *
 * Reserved platform accounts (e.g. @RiseAI) are ignored. Notification
 * preferences are resolved per recipient and passed to `createNotification`
 * so the in-app `inAppNotifyMentions` toggle is honored without extra queries.
 *
 * @module services/mentionNotificationService
 */
export class MentionNotificationService {
  private static readonly USERNAME_REGEX = /(?<![\w.])@([a-zA-Z0-9_]{2,30})/g;
  private static readonly RESERVED = new Set(['riseai']);

  /**
   * Extract unique usernames mentioned in content.
   * @param content - Post/comment text
   * @returns Unique usernames (without @), max 10
   */
  static extractUsernames(content: string): string[] {
    if (!content) return [];
    const usernames = new Set<string>();
    for (const match of content.matchAll(this.USERNAME_REGEX)) {
      const username = match[1];
      if (!this.RESERVED.has(username.toLowerCase())) {
        usernames.add(username);
      }
      if (usernames.size >= 10) break;
    }
    return [...usernames];
  }

  /**
   * Notify users mentioned in a post or comment.
   *
   * @param params.senderId - Author who wrote the content
   * @param params.senderUsername - Author username for the message
   * @param params.content - Content to scan for @mentions
   * @param params.postId - Associated post id
   * @param params.commentId - Associated comment id (when a comment)
   * @param params.excludeUserIds - Users already notified by the caller (avoid duplicates)
   */
  static async notifyMentions(params: {
    senderId: string;
    senderUsername: string;
    content: string;
    postId?: string;
    commentId?: string;
    excludeUserIds?: string[];
  }): Promise<number> {
    const { senderId, senderUsername, content, postId, commentId, excludeUserIds = [] } = params;

    try {
      const usernames = this.extractUsernames(content);
      if (usernames.length === 0) return 0;

      const users = await prisma.user.findMany({
        where: {
          username: { in: usernames, mode: 'insensitive' },
          id: { notIn: [senderId, ...excludeUserIds] }
        },
        select: { id: true, notificationPreferences: true }
      });

      if (users.length === 0) return 0;

      const message = commentId
        ? `${senderUsername} mentioned you in a comment`
        : `${senderUsername} mentioned you in a post`;

      await Promise.allSettled(
        users.map((user) =>
          createNotification(
            'MENTION',
            senderId,
            user.id,
            message,
            postId,
            commentId,
            (user.notificationPreferences as Record<string, any> | null) || null
          )
        )
      );

      return users.length;
    } catch (error) {
      logger.error({ error, senderId, postId, commentId }, 'Mention notification error');
      return 0;
    }
  }
}

export default MentionNotificationService;
