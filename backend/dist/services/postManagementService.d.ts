/**
 * Post Management Service
 * Modular service for handling post editing, deletion, and history management
 * Designed for easy algorithm adjustments and extensibility
 */
export interface EditHistoryEntry {
    version: number;
    content: string;
    editedAt: Date;
    editReason?: string;
    editedBy: string;
}
export interface PostEditOptions {
    content: string;
    editReason?: string;
    extendedContent?: string;
}
export interface PostDeleteOptions {
    deleteReason?: string;
    preserveComments?: boolean;
}
export interface ModularConfig {
    maxEditHistoryVersions: number;
    enableSoftDelete: boolean;
    requireEditReasons: boolean;
    archiveCommentsOnDelete: boolean;
}
export declare class PostManagementService {
    private static config;
    /**
     * Update configuration for modular behavior
     */
    static updateConfig(newConfig: Partial<ModularConfig>): void;
    /**
     * Get current configuration
     */
    static getConfig(): ModularConfig;
    /**
     * Edit a post with full history tracking
     */
    static editPost(postId: string, userId: string, options: PostEditOptions): Promise<{
        post: {
            author: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            h3Index: string | null;
            content: string;
            isDeleted: boolean;
            deletedAt: Date | null;
            editCount: number;
            lastEditedAt: Date | null;
            originalContent: string | null;
            likesCount: number;
            dislikesCount: number;
            agreesCount: number;
            disagreesCount: number;
            imageUrl: string | null;
            extendedContent: string | null;
            authorId: string;
            isPolitical: boolean;
            tags: string[];
            commentsCount: number;
            sharesCount: number;
            viewsCount: number;
            containsFeedback: boolean | null;
            feedbackCategory: string | null;
            feedbackConfidence: number | null;
            feedbackPriority: string | null;
            feedbackStatus: string | null;
            feedbackSummary: string | null;
            feedbackType: string | null;
            authorReputation: number | null;
            deletedReason: string | null;
            searchable: boolean;
            feedVisible: boolean;
            editHistory: import("@prisma/client/runtime/library").JsonValue | null;
            latitude: number | null;
            longitude: number | null;
            originalH3Index: string | null;
            privacyDisplaced: boolean;
        };
        previousContent: string;
        editReason: string;
        version: number;
    }>;
    /**
     * Delete a post with archival
     */
    static deletePost(postId: string, userId: string, options?: PostDeleteOptions): Promise<{
        deletedPost: any;
        archive: {
            originalContent: string;
            content: string;
            extendedContent: string;
            editHistory: import("@prisma/client/runtime/library").JsonValue;
            deletedAt: Date;
            deleteReason: string;
            engagement: {
                likesCount: number;
                commentsCount: number;
            };
            comments: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                content: string;
                postId: string;
                parentId: string | null;
                depth: number;
                isDeleted: boolean;
                deletedAt: Date | null;
                showUsername: boolean;
                editCount: number;
                lastEditedAt: Date | null;
                originalContent: string | null;
                likesCount: number;
                dislikesCount: number;
                agreesCount: number;
                disagreesCount: number;
            }[];
        };
        deleteReason: string;
        softDelete: boolean;
    }>;
    /**
     * Get post edit history
     */
    static getPostHistory(postId: string, userId: string): Promise<{
        postId: string;
        originalContent: string;
        currentContent: string;
        editCount: number;
        lastEditedAt: Date;
        createdAt: Date;
        history: {
            isOriginal: boolean;
            isCurrent: boolean;
            version: number;
            content: string;
            editedAt: Date;
            editReason?: string;
            editedBy: string;
        }[];
    }>;
    /**
     * Get archived post content for deleted posts
     */
    static getArchivedPost(postId: string, userId: string): Promise<{
        postId: string;
        deletedAt: Date;
        deleteReason: string;
        archive: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Check if user can edit post (modular permission system)
     */
    static canEditPost(postId: string, userId: string): Promise<boolean>;
    /**
     * Check if user can delete post (modular permission system)
     */
    static canDeletePost(postId: string, userId: string): Promise<boolean>;
}
export default PostManagementService;
//# sourceMappingURL=postManagementService.d.ts.map