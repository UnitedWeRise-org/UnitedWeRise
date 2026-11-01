import { prisma } from '../lib/prisma';
import { createNotification } from '../routes/notifications';
import { logger } from './logger';
import { ActivityTracker } from './activityTracker';
import { reputationService } from './reputationService';

/**
 * Reaction quality (content vote) and feeling (event/issue sentiment).
 *
 * Both axes are independent and optional. Counts are denormalized on Post and
 * Comment. Legacy aggregate columns are maintained for compatibility:
 * - likesCount = LOVE + LIKE
 * - dislikesCount = DISLIKE
 * - agreesCount = VERY_POSITIVE + POSITIVE
 * - disagreesCount = NEGATIVE + VERY_NEGATIVE
 *
 * @module services/reactionService
 */

export type ReactionQuality = 'LOVE' | 'LIKE' | 'MEH' | 'DISLIKE';
export type ReactionFeeling =
  | 'VERY_POSITIVE'
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'NEGATIVE'
  | 'VERY_NEGATIVE';

const QUALITY_VALUES: ReactionQuality[] = ['LOVE', 'LIKE', 'MEH', 'DISLIKE'];
const FEELING_VALUES: ReactionFeeling[] = [
  'VERY_POSITIVE',
  'POSITIVE',
  'NEUTRAL',
  'NEGATIVE',
  'VERY_NEGATIVE'
];

const QUALITY_COUNT_FIELD: Record<ReactionQuality, string> = {
  LOVE: 'loveCount',
  LIKE: 'likeCount',
  MEH: 'mehCount',
  DISLIKE: 'dislikeCount'
};

const FEELING_COUNT_FIELD: Record<ReactionFeeling, string> = {
  VERY_POSITIVE: 'veryPositiveCount',
  POSITIVE: 'positiveCount',
  NEUTRAL: 'neutralFeelingCount',
  NEGATIVE: 'negativeCount',
  VERY_NEGATIVE: 'veryNegativeCount'
};

const QUALITY_LEGACY_FIELD: Partial<Record<ReactionQuality, string>> = {
  LOVE: 'likesCount',
  LIKE: 'likesCount',
  DISLIKE: 'dislikesCount'
};

const FEELING_LEGACY_FIELD: Partial<Record<ReactionFeeling, string>> = {
  VERY_POSITIVE: 'agreesCount',
  POSITIVE: 'agreesCount',
  NEGATIVE: 'disagreesCount',
  VERY_NEGATIVE: 'disagreesCount'
};

const COUNT_FIELDS = [
  'loveCount',
  'likeCount',
  'mehCount',
  'dislikeCount',
  'veryPositiveCount',
  'positiveCount',
  'neutralFeelingCount',
  'negativeCount',
  'veryNegativeCount',
  'likesCount',
  'dislikesCount',
  'agreesCount',
  'disagreesCount'
] as const;

export interface ParsedReactionInput {
  qualityProvided: boolean;
  feelingProvided: boolean;
  quality: ReactionQuality | null;
  feeling: ReactionFeeling | null;
}

/**
 * Parse new-style `{ quality, feeling }` input and legacy
 * `{ reactionType, reactionValue }` input.
 *
 * @param body - Request body
 * @returns Normalized reaction input
 * @throws Error when a value is invalid
 */
export function parseReactionInput(body: any): ParsedReactionInput {
  const hasQuality = Object.prototype.hasOwnProperty.call(body, 'quality');
  const hasFeeling = Object.prototype.hasOwnProperty.call(body, 'feeling');

  if (!hasQuality && !hasFeeling && body.reactionType) {
    const legacyType = body.reactionType;
    const legacyValue = body.reactionValue;
    if (!['sentiment', 'stance'].includes(legacyType)) {
      throw new Error('Invalid reaction type');
    }

    if (legacyType === 'sentiment') {
      const mapped =
        legacyValue === null || legacyValue === undefined
          ? null
          : legacyValue === 'LIKE'
            ? 'LIKE'
            : legacyValue === 'DISLIKE'
              ? 'DISLIKE'
              : null;
      if (legacyValue && !mapped) throw new Error('Invalid sentiment value');
      return {
        qualityProvided: true,
        feelingProvided: false,
        quality: mapped,
        feeling: null
      };
    }

    const mapped =
      legacyValue === null || legacyValue === undefined
        ? null
        : legacyValue === 'AGREE'
          ? 'POSITIVE'
          : legacyValue === 'DISAGREE'
            ? 'NEGATIVE'
            : null;
    if (legacyValue && !mapped) throw new Error('Invalid stance value');
    return {
      qualityProvided: false,
      feelingProvided: true,
      quality: null,
      feeling: mapped
    };
  }

  const quality = hasQuality ? body.quality : undefined;
  const feeling = hasFeeling ? body.feeling : undefined;

  if (quality !== undefined && quality !== null && !QUALITY_VALUES.includes(quality)) {
    throw new Error('Invalid quality value');
  }
  if (feeling !== undefined && feeling !== null && !FEELING_VALUES.includes(feeling)) {
    throw new Error('Invalid feeling value');
  }
  if (!hasQuality && !hasFeeling) {
    throw new Error('At least one of quality or feeling is required');
  }

  return {
    qualityProvided: hasQuality,
    feelingProvided: hasFeeling,
    quality: hasQuality ? quality ?? null : null,
    feeling: hasFeeling ? feeling ?? null : null
  };
}

function buildCountDeltas(
  oldQuality: ReactionQuality | null,
  oldFeeling: ReactionFeeling | null,
  newQuality: ReactionQuality | null,
  newFeeling: ReactionFeeling | null
): Record<string, number> {
  const deltas: Record<string, number> = {};

  const decrement = (field: string | undefined) => {
    if (!field) return;
    deltas[field] = (deltas[field] || 0) - 1;
  };
  const increment = (field: string | undefined) => {
    if (!field) return;
    deltas[field] = (deltas[field] || 0) + 1;
  };

  if (oldQuality) {
    decrement(QUALITY_COUNT_FIELD[oldQuality]);
    decrement(QUALITY_LEGACY_FIELD[oldQuality]);
  }
  if (newQuality) {
    increment(QUALITY_COUNT_FIELD[newQuality]);
    increment(QUALITY_LEGACY_FIELD[newQuality]);
  }
  if (oldFeeling) {
    decrement(FEELING_COUNT_FIELD[oldFeeling]);
    decrement(FEELING_LEGACY_FIELD[oldFeeling]);
  }
  if (newFeeling) {
    increment(FEELING_COUNT_FIELD[newFeeling]);
    increment(FEELING_LEGACY_FIELD[newFeeling]);
  }

  for (const key of Object.keys(deltas)) {
    if (deltas[key] === 0) delete deltas[key];
  }
  return deltas;
}

function toPrismaCountUpdate(deltas: Record<string, number>): Record<string, any> {
  const data: Record<string, any> = {};
  for (const field of COUNT_FIELDS) {
    const delta = deltas[field];
    if (!delta) continue;
    data[field] = delta > 0 ? { increment: delta } : { decrement: -delta };
  }
  return data;
}

function isPositiveQuality(quality: ReactionQuality | null): boolean {
  return quality === 'LOVE' || quality === 'LIKE';
}

async function buildNotification(
  targetType: 'post' | 'comment',
  userId: string,
  username: string,
  authorId: string,
  quality: ReactionQuality,
  postId?: string,
  commentId?: string
): Promise<void> {
  if (authorId === userId) return;
  if (!isPositiveQuality(quality)) return;

  const noun = targetType === 'post' ? 'post' : 'comment';
  const message =
    quality === 'LOVE'
      ? `${username} loved your ${noun}`
      : `${username} liked your ${noun}`;

  try {
    await createNotification(
      'LIKE',
      userId,
      authorId,
      message,
      postId,
      commentId
    );
  } catch (error) {
    logger.warn({ error, targetType, userId, authorId }, 'Failed to create reaction notification');
  }
}

export class ReactionService {
  /**
   * Apply a reaction to a post.
   */
  static async reactToPost(params: {
    userId: string;
    username: string;
    postId: string;
    input: ParsedReactionInput;
  }) {
    const { userId, username, postId, input } = params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, content: true }
    });
    if (!post) {
      const error: any = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    const [existingReaction, existingLike] = await Promise.all([
      prisma.reaction.findUnique({ where: { userId_postId: { userId, postId } } }),
      prisma.like.findUnique({ where: { userId_postId: { userId, postId } } })
    ]);

    const oldQuality = (existingReaction?.quality as ReactionQuality | null) ||
      (existingLike ? 'LIKE' : null);
    const oldFeeling = (existingReaction?.feeling as ReactionFeeling | null) || null;

    const newQuality = input.qualityProvided
      ? input.quality
      : oldQuality;
    const newFeeling = input.feelingProvided
      ? input.feeling
      : oldFeeling;

    const deltas = buildCountDeltas(oldQuality, oldFeeling, newQuality, newFeeling);
    const countUpdate = toPrismaCountUpdate(deltas);

    const ops: any[] = [];
    const hasAnyReaction = newQuality !== null || newFeeling !== null;

    if (!hasAnyReaction) {
      if (existingReaction) {
        ops.push(prisma.reaction.delete({ where: { userId_postId: { userId, postId } } }));
      }
    } else if (existingReaction) {
      ops.push(
        prisma.reaction.update({
          where: { userId_postId: { userId, postId } },
          data: { quality: newQuality, feeling: newFeeling }
        })
      );
    } else {
      ops.push(
        prisma.reaction.create({
          data: { userId, postId, quality: newQuality, feeling: newFeeling }
        })
      );
    }

    if (Object.keys(countUpdate).length > 0) {
      ops.push(prisma.post.update({ where: { id: postId }, data: countUpdate }));
    }

    const shouldHaveLike = isPositiveQuality(newQuality);
    if (shouldHaveLike && !existingLike) {
      ops.push(prisma.like.create({ data: { userId, postId } }));
    } else if (!shouldHaveLike && existingLike) {
      ops.push(prisma.like.delete({ where: { userId_postId: { userId, postId } } }));
    }

    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }

    const positiveThisTime = input.qualityProvided && isPositiveQuality(newQuality);
    const wasPositive = isPositiveQuality(oldQuality);
    if (positiveThisTime && !wasPositive) {
      await buildNotification('post', userId, username, post.authorId, newQuality!, postId);
    }

    const qualityChanged = oldQuality !== newQuality;
    const previousPositive = isPositiveQuality(oldQuality);
    const nowPositive = isPositiveQuality(newQuality);

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        loveCount: true,
        likeCount: true,
        mehCount: true,
        dislikeCount: true,
        veryPositiveCount: true,
        positiveCount: true,
        neutralFeelingCount: true,
        negativeCount: true,
        veryNegativeCount: true,
        likesCount: true,
        dislikesCount: true,
        agreesCount: true,
        disagreesCount: true
      }
    });

    if (qualityChanged && previousPositive !== nowPositive) {
      try {
        if (nowPositive) {
          await ActivityTracker.trackLikeAdded(userId, postId, post.content);
          if ((updated as any)?.likesCount >= 5) {
            void reputationService.awardReputation(post.authorId, 'quality_post', postId);
          }
        } else {
          await ActivityTracker.trackLikeRemoved(userId, postId, post.content);
        }
      } catch (error) {
        logger.warn({ error, postId, userId }, 'Failed to track like activity');
      }
    }

    return {
      quality: newQuality,
      feeling: newFeeling,
      counts: updated,
      notificationCreated: positiveThisTime && !wasPositive && post.authorId !== userId
    };
  }

  /**
   * Apply a reaction to a comment.
   */
  static async reactToComment(params: {
    userId: string;
    username: string;
    commentId: string;
    input: ParsedReactionInput;
  }) {
    const { userId, username, commentId, input } = params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, content: true, postId: true }
    });
    if (!comment) {
      const error: any = new Error('Comment not found');
      error.status = 404;
      throw error;
    }

    const existingReaction = await prisma.reaction.findUnique({
      where: { userId_commentId: { userId, commentId } }
    });

    const oldQuality = (existingReaction?.quality as ReactionQuality | null) || null;
    const oldFeeling = (existingReaction?.feeling as ReactionFeeling | null) || null;

    const newQuality = input.qualityProvided ? input.quality : oldQuality;
    const newFeeling = input.feelingProvided ? input.feeling : oldFeeling;

    const deltas = buildCountDeltas(oldQuality, oldFeeling, newQuality, newFeeling);
    const countUpdate = toPrismaCountUpdate(deltas);

    const ops: any[] = [];
    const hasAnyReaction = newQuality !== null || newFeeling !== null;

    if (!hasAnyReaction) {
      if (existingReaction) {
        ops.push(
          prisma.reaction.delete({ where: { userId_commentId: { userId, commentId } } })
        );
      }
    } else if (existingReaction) {
      ops.push(
        prisma.reaction.update({
          where: { userId_commentId: { userId, commentId } },
          data: { quality: newQuality, feeling: newFeeling }
        })
      );
    } else {
      ops.push(
        prisma.reaction.create({
          data: { userId, commentId, quality: newQuality, feeling: newFeeling }
        })
      );
    }

    if (Object.keys(countUpdate).length > 0) {
      ops.push(prisma.comment.update({ where: { id: commentId }, data: countUpdate }));
    }

    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }

    const positiveThisTime = input.qualityProvided && isPositiveQuality(newQuality);
    const wasPositive = isPositiveQuality(oldQuality);
    if (positiveThisTime && !wasPositive) {
      await buildNotification(
        'comment',
        userId,
        username,
        comment.userId,
        newQuality!,
        comment.postId,
        commentId
      );
    }

    const updated = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        loveCount: true,
        likeCount: true,
        mehCount: true,
        dislikeCount: true,
        veryPositiveCount: true,
        positiveCount: true,
        neutralFeelingCount: true,
        negativeCount: true,
        veryNegativeCount: true,
        likesCount: true,
        dislikesCount: true,
        agreesCount: true,
        disagreesCount: true
      }
    });

    return {
      quality: newQuality,
      feeling: newFeeling,
      counts: updated,
      notificationCreated: positiveThisTime && !wasPositive && comment.userId !== userId
    };
  }
}

export default ReactionService;
