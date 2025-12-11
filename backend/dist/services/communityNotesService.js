"use strict";
/**
 * Community Notes Service
 *
 * Manages community corrections similar to Twitter/X's Community Notes.
 * Features reputation-weighted voting, auto-display thresholds, and appeals.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityNotesService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
// Display threshold - notes must reach this weighted score to auto-display
const DEFAULT_DISPLAY_THRESHOLD = 0.7;
class CommunityNotesService {
    /**
     * Create a new community note
     */
    static async createNote(params) {
        try {
            // Get author's reputation for initial weighting
            const author = await prisma_1.prisma.user.findUnique({
                where: { id: params.authorId },
                select: { reputationScore: true }
            });
            const note = await prisma_1.prisma.communityNote.create({
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
            logger_1.logger.info({
                noteId: note.id,
                authorId: params.authorId,
                noteType: params.noteType
            }, 'Created community note');
            return note;
        }
        catch (error) {
            logger_1.logger.error({ error, params }, 'Failed to create community note');
            throw error;
        }
    }
    /**
     * Vote on a community note (reputation-weighted)
     */
    static async voteOnNote(noteId, voterId, isHelpful) {
        try {
            // Get voter's reputation
            const voter = await prisma_1.prisma.user.findUnique({
                where: { id: voterId },
                select: { reputationScore: true }
            });
            const voterReputation = voter?.reputationScore ?? 50;
            // Check for existing vote
            const existingVote = await prisma_1.prisma.communityNoteVote.findUnique({
                where: {
                    noteId_voterId: { noteId, voterId }
                }
            });
            if (existingVote) {
                // If same vote, no change
                if (existingVote.isHelpful === isHelpful) {
                    const note = await prisma_1.prisma.communityNote.findUnique({
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
                await prisma_1.prisma.communityNoteVote.delete({
                    where: { noteId_voterId: { noteId, voterId } }
                });
            }
            // Create/update vote
            await prisma_1.prisma.communityNoteVote.create({
                data: {
                    noteId,
                    voterId,
                    isHelpful,
                    voterReputation
                }
            });
            // Recalculate scores
            const note = await prisma_1.prisma.communityNote.findUnique({
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
                }
                else {
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
            await prisma_1.prisma.communityNote.update({
                where: { id: noteId },
                data: {
                    helpfulScore: newHelpfulScore,
                    notHelpfulScore: newNotHelpfulScore,
                    voteCount: note.votes.length,
                    isDisplayed: shouldDisplay
                }
            });
            logger_1.logger.info({
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
        }
        catch (error) {
            logger_1.logger.error({ error, noteId, voterId }, 'Failed to vote on note');
            throw error;
        }
    }
    /**
     * Appeal a displayed note (original poster)
     */
    static async appealNote(noteId, appealerId, reason) {
        try {
            const note = await prisma_1.prisma.communityNote.findUnique({
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
            await prisma_1.prisma.communityNote.update({
                where: { id: noteId },
                data: {
                    isAppealed: true
                }
            });
            logger_1.logger.info({ noteId, appealerId, reason }, 'Community note appealed');
            return { noteId, status: 'appealed' };
        }
        catch (error) {
            logger_1.logger.error({ error, noteId }, 'Failed to appeal note');
            throw error;
        }
    }
    /**
     * Resolve an appeal (admin only)
     */
    static async resolveAppeal(noteId, adminId, upheld, reason) {
        try {
            const note = await prisma_1.prisma.communityNote.findUnique({
                where: { id: noteId }
            });
            if (!note) {
                throw new Error(`Note ${noteId} not found`);
            }
            if (!note.isAppealed) {
                throw new Error('Note has no pending appeal');
            }
            await prisma_1.prisma.communityNote.update({
                where: { id: noteId },
                data: {
                    appealResolved: true,
                    appealOutcome: upheld ? 'upheld' : 'rejected',
                    // If appeal upheld, hide the note
                    isDisplayed: upheld ? false : note.isDisplayed
                }
            });
            logger_1.logger.info({
                noteId,
                adminId,
                upheld,
                reason
            }, 'Appeal resolved');
            return { noteId, outcome: upheld ? 'upheld' : 'rejected' };
        }
        catch (error) {
            logger_1.logger.error({ error, noteId }, 'Failed to resolve appeal');
            throw error;
        }
    }
    /**
     * Get notes for a post
     */
    static async getPostNotes(postId, includeHidden = false) {
        return prisma_1.prisma.communityNote.findMany({
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
    static async getFactNotes(factClaimId) {
        return prisma_1.prisma.communityNote.findMany({
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
        return prisma_1.prisma.communityNote.findMany({
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
    static async getUserNotes(authorId, limit = 20) {
        return prisma_1.prisma.communityNote.findMany({
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
    static async getUserVotes(voterId, limit = 50) {
        return prisma_1.prisma.communityNoteVote.findMany({
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
    static async getNote(noteId) {
        return prisma_1.prisma.communityNote.findUnique({
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
    static async calculateNoteEffectiveness(noteId) {
        const note = await prisma_1.prisma.communityNote.findUnique({
            where: { id: noteId },
            select: {
                helpfulScore: true,
                voteCount: true,
                isDisplayed: true
            }
        });
        if (!note)
            return 0;
        // Effectiveness = helpfulScore * sqrt(voteCount) * displayedBonus
        const displayBonus = note.isDisplayed ? 1.5 : 1.0;
        const voteWeight = Math.sqrt(Math.max(1, note.voteCount));
        return note.helpfulScore * voteWeight * displayBonus;
    }
}
exports.CommunityNotesService = CommunityNotesService;
//# sourceMappingURL=communityNotesService.js.map