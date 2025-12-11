/**
 * Community Notes Service
 *
 * Manages community corrections similar to Twitter/X's Community Notes.
 * Features reputation-weighted voting, auto-display thresholds, and appeals.
 */

import { prisma } from '../lib/prisma';
import { logger } from './logger';

// Display threshold - notes must reach this weighted score to auto-display
const DEFAULT_DISPLAY_THRESHOLD = 0.7;

// Note types
type NoteType = 'correction' | 'context' | 'source' | 'clarification' | 'outdated';

interface CreateNoteParams {
  authorId: string;
  content: string;
  noteType: NoteType;
  postId?: string;
  factClaimId?: string;
  confidenceImpact?: number; // How much this note should affect fact/argument confidence
}

interface VoteResult {
  noteId: string;
  oldHelpfulScore: number;
  newHelpfulScore: number;
  shouldDisplay: boolean;
}

export class CommunityNotesService {
  /**
   * Create a new community note
   */
  static async createNote(params: CreateNoteParams) {
    try {
      // Get author's reputation for initial weighting
      const author = await prisma.user.findUnique({
        where: { id: params.authorId },
        select: { reputationScore: true }
      });

      const note = await prisma.communityNote.create({
        data: {
          authorId: params.authorId,
          content: params.content,
          noteType: params.noteType,
          postId: params.postId,
          factClaimId: params.factClaimId,
          confidenceImpact: params.confidenceImpact,
          displayThreshold: DEFAULT_DISPLAY_THRESHOLD
        }
      });

      logger.info({
        noteId: note.id,
        authorId: params.authorId,
        noteType: params.noteType
      }, 'Created community note');

      return note;
    } catch (error) {
      logger.error({ error, params }, 'Failed to create community note');
      throw error;
    }
  }

  /**
   * Vote on a community note (reputation-weighted)
   */
  static async voteOnNote(
    noteId: string,
    voterId: string,
    isHelpful: boolean
  ): Promise<VoteResult> {
    try {
      // Get voter's reputation
      const voter = await prisma.user.findUnique({
        where: { id: voterId },
        select: { reputationScore: true }
      });

      const voterReputation = voter?.reputationScore ?? 50;

      // Check for existing vote
      const existingVote = await prisma.communityNoteVote.findUnique({
        where: {
          noteId_voterId: { noteId, voterId }
        }
      });

      if (existingVote) {
        // If same vote, no change
        if (existingVote.isHelpful === isHelpful) {
          const note = await prisma.communityNote.findUnique({
            where: { id: noteId }
          });
          return {
            noteId,
            oldHelpfulScore: note?.helpfulScore ?? 0,
            newHelpfulScore: note?.helpfulScore ?? 0,
            shouldDisplay: note?.isDisplayed ?? false
          };
        }

        // Changing vote - remove old impact
        await prisma.communityNoteVote.delete({
          where: { noteId_voterId: { noteId, voterId } }
        });
      }

      // Create/update vote
      await prisma.communityNoteVote.create({
        data: {
          noteId,
          voterId,
          isHelpful,
          voterReputation
        }
      });

      // Recalculate scores
      const note = await prisma.communityNote.findUnique({
        where: { id: noteId },
        include: {
          votes: true
        }
      });

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      const oldHelpfulScore = note.helpfulScore;

      // Calculate weighted scores
      let helpfulWeight = 0;
      let notHelpfulWeight = 0;
      let totalWeight = 0;

      for (const vote of note.votes) {
        // Normalize reputation to 0-1 range (assuming 0-100 scale)
        const weight = Math.max(0.1, vote.voterReputation / 100);

        if (vote.isHelpful) {
          helpfulWeight += weight;
        } else {
          notHelpfulWeight += weight;
        }
        totalWeight += weight;
      }

      // Calculate helpful score (0-1)
      const newHelpfulScore = totalWeight > 0
        ? helpfulWeight / totalWeight
        : 0;

      const newNotHelpfulScore = totalWeight > 0
        ? notHelpfulWeight / totalWeight
        : 0;

      // Should it be displayed?
      const shouldDisplay = newHelpfulScore >= note.displayThreshold;

      // Update note
      await prisma.communityNote.update({
        where: { id: noteId },
        data: {
          helpfulScore: newHelpfulScore,
          notHelpfulScore: newNotHelpfulScore,
          voteCount: note.votes.length,
          isDisplayed: shouldDisplay
        }
      });

      logger.info({
        noteId,
        oldHelpfulScore,
        newHelpfulScore,
        shouldDisplay,
        voteCount: note.votes.length
      }, 'Updated community note vote');

      return {
        noteId,
        oldHelpfulScore,
        newHelpfulScore,
        shouldDisplay
      };
    } catch (error) {
      logger.error({ error, noteId, voterId }, 'Failed to vote on note');
      throw error;
    }
  }

  /**
   * Appeal a displayed note (original poster)
   */
  static async appealNote(noteId: string, appealerId: string, reason: string) {
    try {
      const note = await prisma.communityNote.findUnique({
        where: { id: noteId },
        include: {
          post: {
            select: { authorId: true }
          }
        }
      });

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      // Only original post author can appeal
      if (note.post?.authorId !== appealerId) {
        throw new Error('Only the original poster can appeal a note');
      }

      // Can only appeal displayed notes
      if (!note.isDisplayed) {
        throw new Error('Can only appeal displayed notes');
      }

      // Can only appeal once
      if (note.isAppealed) {
        throw new Error('Note has already been appealed');
      }

      await prisma.communityNote.update({
        where: { id: noteId },
        data: {
          isAppealed: true
        }
      });

      logger.info({ noteId, appealerId, reason }, 'Community note appealed');

      return { noteId, status: 'appealed' };
    } catch (error) {
      logger.error({ error, noteId }, 'Failed to appeal note');
      throw error;
    }
  }

  /**
   * Resolve an appeal (admin only)
   */
  static async resolveAppeal(
    noteId: string,
    adminId: string,
    upheld: boolean,
    reason: string
  ) {
    try {
      const note = await prisma.communityNote.findUnique({
        where: { id: noteId }
      });

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      if (!note.isAppealed) {
        throw new Error('Note has no pending appeal');
      }

      await prisma.communityNote.update({
        where: { id: noteId },
        data: {
          appealResolved: true,
          appealOutcome: upheld ? 'upheld' : 'rejected',
          // If appeal upheld, hide the note
          isDisplayed: upheld ? false : note.isDisplayed
        }
      });

      logger.info({
        noteId,
        adminId,
        upheld,
        reason
      }, 'Appeal resolved');

      return { noteId, outcome: upheld ? 'upheld' : 'rejected' };
    } catch (error) {
      logger.error({ error, noteId }, 'Failed to resolve appeal');
      throw error;
    }
  }

  /**
   * Get notes for a post
   */
  static async getPostNotes(postId: string, includeHidden: boolean = false) {
    return prisma.communityNote.findMany({
      where: {
        postId,
        ...(includeHidden ? {} : { isDisplayed: true })
      },
      orderBy: [
        { isDisplayed: 'desc' },
        { helpfulScore: 'desc' }
      ],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            reputationScore: true
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    });
  }

  /**
   * Get notes for a fact claim
   */
  static async getFactNotes(factClaimId: string) {
    return prisma.communityNote.findMany({
      where: { factClaimId },
      orderBy: { helpfulScore: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            reputationScore: true
          }
        }
      }
    });
  }

  /**
   * Get pending appeals for admin review
   */
  static async getPendingAppeals() {
    return prisma.communityNote.findMany({
      where: {
        isAppealed: true,
        appealResolved: false
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        post: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get user's authored notes
   */
  static async getUserNotes(authorId: string, limit: number = 20) {
    return prisma.communityNote.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        post: {
          select: {
            id: true,
            content: true
          }
        }
      }
    });
  }

  /**
   * Get user's vote history
   */
  static async getUserVotes(voterId: string, limit: number = 50) {
    return prisma.communityNoteVote.findMany({
      where: { voterId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        note: {
          select: {
            id: true,
            content: true,
            noteType: true,
            isDisplayed: true
          }
        }
      }
    });
  }

  /**
   * Get note by ID
   */
  static async getNote(noteId: string) {
    return prisma.communityNote.findUnique({
      where: { id: noteId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            reputationScore: true
          }
        },
        post: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        },
        factClaim: true,
        votes: {
          select: {
            id: true,
            isHelpful: true,
            voterReputation: true,
            createdAt: true
          }
        }
      }
    });
  }

  /**
   * Calculate note effectiveness (for reputation impact)
   */
  static async calculateNoteEffectiveness(noteId: string): Promise<number> {
    const note = await prisma.communityNote.findUnique({
      where: { id: noteId },
      select: {
        helpfulScore: true,
        voteCount: true,
        isDisplayed: true
      }
    });

    if (!note) return 0;

    // Effectiveness = helpfulScore * sqrt(voteCount) * displayedBonus
    const displayBonus = note.isDisplayed ? 1.5 : 1.0;
    const voteWeight = Math.sqrt(Math.max(1, note.voteCount));

    return note.helpfulScore * voteWeight * displayBonus;
  }
}
