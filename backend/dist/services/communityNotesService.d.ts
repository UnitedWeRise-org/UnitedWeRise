/**
 * Community Notes Service
 *
 * Manages community corrections similar to Twitter/X's Community Notes.
 * Features reputation-weighted voting, auto-display thresholds, and appeals.
 */
type NoteType = 'correction' | 'context' | 'source' | 'clarification' | 'outdated';
interface CreateNoteParams {
    authorId: string;
    content: string;
    noteType: NoteType;
    postId?: string;
    factClaimId?: string;
    confidenceImpact?: number;
}
interface VoteResult {
    noteId: string;
    oldHelpfulScore: number;
    newHelpfulScore: number;
    shouldDisplay: boolean;
}
export declare class CommunityNotesService {
    /**
     * Create a new community note
     */
    static createNote(params: CreateNoteParams): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        postId: string | null;
        authorId: string;
        isDisplayed: boolean;
        factClaimId: string | null;
        noteType: string;
        helpfulScore: number;
        notHelpfulScore: number;
        voteCount: number;
        displayThreshold: number;
        isAppealed: boolean;
        appealResolved: boolean;
        appealOutcome: string | null;
        confidenceImpact: number | null;
    }>;
    /**
     * Vote on a community note (reputation-weighted)
     */
    static voteOnNote(noteId: string, voterId: string, isHelpful: boolean): Promise<VoteResult>;
    /**
     * Appeal a displayed note (original poster)
     */
    static appealNote(noteId: string, appealerId: string, reason: string): Promise<{
        noteId: string;
        status: string;
    }>;
    /**
     * Resolve an appeal (admin only)
     */
    static resolveAppeal(noteId: string, adminId: string, upheld: boolean, reason: string): Promise<{
        noteId: string;
        outcome: string;
    }>;
    /**
     * Get notes for a post
     */
    static getPostNotes(postId: string, includeHidden?: boolean): Promise<({
        _count: {
            votes: number;
        };
        author: {
            id: string;
            username: string;
            displayName: string;
            reputationScore: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        postId: string | null;
        authorId: string;
        isDisplayed: boolean;
        factClaimId: string | null;
        noteType: string;
        helpfulScore: number;
        notHelpfulScore: number;
        voteCount: number;
        displayThreshold: number;
        isAppealed: boolean;
        appealResolved: boolean;
        appealOutcome: string | null;
        confidenceImpact: number | null;
    })[]>;
    /**
     * Get notes for a fact claim
     */
    static getFactNotes(factClaimId: string): Promise<({
        author: {
            id: string;
            username: string;
            displayName: string;
            reputationScore: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        postId: string | null;
        authorId: string;
        isDisplayed: boolean;
        factClaimId: string | null;
        noteType: string;
        helpfulScore: number;
        notHelpfulScore: number;
        voteCount: number;
        displayThreshold: number;
        isAppealed: boolean;
        appealResolved: boolean;
        appealOutcome: string | null;
        confidenceImpact: number | null;
    })[]>;
    /**
     * Get pending appeals for admin review
     */
    static getPendingAppeals(): Promise<({
        post: {
            id: string;
            content: string;
            author: {
                id: string;
                username: string;
                displayName: string;
            };
        };
        author: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        postId: string | null;
        authorId: string;
        isDisplayed: boolean;
        factClaimId: string | null;
        noteType: string;
        helpfulScore: number;
        notHelpfulScore: number;
        voteCount: number;
        displayThreshold: number;
        isAppealed: boolean;
        appealResolved: boolean;
        appealOutcome: string | null;
        confidenceImpact: number | null;
    })[]>;
    /**
     * Get user's authored notes
     */
    static getUserNotes(authorId: string, limit?: number): Promise<({
        post: {
            id: string;
            content: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        postId: string | null;
        authorId: string;
        isDisplayed: boolean;
        factClaimId: string | null;
        noteType: string;
        helpfulScore: number;
        notHelpfulScore: number;
        voteCount: number;
        displayThreshold: number;
        isAppealed: boolean;
        appealResolved: boolean;
        appealOutcome: string | null;
        confidenceImpact: number | null;
    })[]>;
    /**
     * Get user's vote history
     */
    static getUserVotes(voterId: string, limit?: number): Promise<({
        note: {
            id: string;
            content: string;
            isDisplayed: boolean;
            noteType: string;
        };
    } & {
        id: string;
        createdAt: Date;
        noteId: string;
        voterId: string;
        isHelpful: boolean;
        voterReputation: number;
    })[]>;
    /**
     * Get note by ID
     */
    static getNote(noteId: string): Promise<{
        post: {
            id: string;
            content: string;
            author: {
                id: string;
                username: string;
                displayName: string;
            };
        };
        factClaim: {
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            confidence: number;
            sourcePostId: string | null;
            sourceUserId: string | null;
            confidenceHistory: import("@prisma/client/runtime/client").JsonValue;
            citationCount: number;
            claim: string;
            challengeCount: number;
        };
        author: {
            id: string;
            username: string;
            displayName: string;
            reputationScore: number;
        };
        votes: {
            id: string;
            createdAt: Date;
            isHelpful: boolean;
            voterReputation: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        postId: string | null;
        authorId: string;
        isDisplayed: boolean;
        factClaimId: string | null;
        noteType: string;
        helpfulScore: number;
        notHelpfulScore: number;
        voteCount: number;
        displayThreshold: number;
        isAppealed: boolean;
        appealResolved: boolean;
        appealOutcome: string | null;
        confidenceImpact: number | null;
    }>;
    /**
     * Calculate note effectiveness (for reputation impact)
     */
    static calculateNoteEffectiveness(noteId: string): Promise<number>;
}
export {};
//# sourceMappingURL=communityNotesService.d.ts.map