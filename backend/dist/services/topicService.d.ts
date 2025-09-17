import { Post } from '@prisma/client';
interface TopicCluster {
    centroid: number[];
    posts: Array<Post & {
        similarity: number;
    }>;
    title: string;
    description?: string;
    category?: string;
    argumentsFor: string[];
    argumentsAgainst: string[];
}
interface TopicAnalysis {
    topics: TopicCluster[];
    uncategorizedPosts: Post[];
}
export declare class TopicService {
    private static readonly MIN_POSTS_PER_TOPIC;
    private static readonly SIMILARITY_THRESHOLD;
    private static readonly MAX_TOPICS_PER_ANALYSIS;
    /**
     * Analyze recent posts and generate topic clusters
     */
    static generateTopicClusters(timeframe?: number, // hours
    maxPosts?: number): Promise<TopicAnalysis>;
    /**
     * Save topic analysis results to database
     */
    static saveTopicsToDB(analysis: TopicAnalysis): Promise<number>;
    /**
     * Get trending topics
     */
    static getTrendingTopics(limit?: number): Promise<({
        posts: ({
            post: {
                author: {
                    id: string;
                    username: string;
                    firstName: string;
                    lastName: string;
                    avatar: string;
                };
            } & {
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                content: string;
                isDeleted: boolean;
                deletedAt: Date | null;
                editCount: number;
                lastEditedAt: Date | null;
                originalContent: string | null;
                imageUrl: string | null;
                extendedContent: string | null;
                authorId: string;
                isPolitical: boolean;
                tags: string[];
                likesCount: number;
                commentsCount: number;
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
            };
        } & {
            id: string;
            createdAt: Date;
            postId: string;
            topicId: string;
            relevanceScore: number;
        })[];
        subTopics: {
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            title: string;
            summary: string | null;
            participantCount: number;
            parentTopicId: string;
            commentCount: number;
        }[];
    } & {
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        state: string | null;
        district: string | null;
        isActive: boolean;
        title: string;
        description: string | null;
        category: string | null;
        argumentsFor: string[];
        argumentsAgainst: string[];
        neutralSummary: string | null;
        complexityScore: number;
        evidenceQuality: number;
        controversyScore: number;
        postCount: number;
        participantCount: number;
        viewCount: number;
        trendingScore: number;
        lastActivityAt: Date;
    })[]>;
    /**
     * Get topic details with posts and comments
     */
    static getTopicDetails(topicId: string): Promise<{
        posts: ({
            post: {
                comments: ({
                    user: {
                        id: string;
                        username: string;
                        firstName: string;
                        lastName: string;
                    };
                } & {
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
                })[];
                likes: {
                    id: string;
                    createdAt: Date;
                    userId: string;
                    postId: string;
                }[];
                author: {
                    id: string;
                    username: string;
                    firstName: string;
                    lastName: string;
                    avatar: string;
                    verified: boolean;
                };
            } & {
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                content: string;
                isDeleted: boolean;
                deletedAt: Date | null;
                editCount: number;
                lastEditedAt: Date | null;
                originalContent: string | null;
                imageUrl: string | null;
                extendedContent: string | null;
                authorId: string;
                isPolitical: boolean;
                tags: string[];
                likesCount: number;
                commentsCount: number;
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
            };
        } & {
            id: string;
            createdAt: Date;
            postId: string;
            topicId: string;
            relevanceScore: number;
        })[];
        topicComments: ({
            replies: ({
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
                content: string;
                parentId: string | null;
                authorId: string;
                topicId: string | null;
                subTopicId: string | null;
                sentiment: number | null;
                hostilityScore: number;
                argumentStrength: number;
                evidenceLevel: number;
                topicRelevance: number;
                isHidden: boolean;
                hideReason: string | null;
            })[];
            author: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
                avatar: string;
            };
        } & {
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            content: string;
            parentId: string | null;
            authorId: string;
            topicId: string | null;
            subTopicId: string | null;
            sentiment: number | null;
            hostilityScore: number;
            argumentStrength: number;
            evidenceLevel: number;
            topicRelevance: number;
            isHidden: boolean;
            hideReason: string | null;
        })[];
        subTopics: ({
            comments: ({
                replies: ({
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
                    content: string;
                    parentId: string | null;
                    authorId: string;
                    topicId: string | null;
                    subTopicId: string | null;
                    sentiment: number | null;
                    hostilityScore: number;
                    argumentStrength: number;
                    evidenceLevel: number;
                    topicRelevance: number;
                    isHidden: boolean;
                    hideReason: string | null;
                })[];
                author: {
                    id: string;
                    username: string;
                    firstName: string;
                    lastName: string;
                    avatar: string;
                };
            } & {
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                content: string;
                parentId: string | null;
                authorId: string;
                topicId: string | null;
                subTopicId: string | null;
                sentiment: number | null;
                hostilityScore: number;
                argumentStrength: number;
                evidenceLevel: number;
                topicRelevance: number;
                isHidden: boolean;
                hideReason: string | null;
            })[];
        } & {
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            title: string;
            summary: string | null;
            participantCount: number;
            parentTopicId: string;
            commentCount: number;
        })[];
    } & {
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        state: string | null;
        district: string | null;
        isActive: boolean;
        title: string;
        description: string | null;
        category: string | null;
        argumentsFor: string[];
        argumentsAgainst: string[];
        neutralSummary: string | null;
        complexityScore: number;
        evidenceQuality: number;
        controversyScore: number;
        postCount: number;
        participantCount: number;
        viewCount: number;
        trendingScore: number;
        lastActivityAt: Date;
    }>;
    /**
     * Add comment to topic or sub-topic
     */
    static addTopicComment(userId: string, content: string, topicId?: string, subTopicId?: string, parentId?: string): Promise<{
        author: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string;
        };
    } & {
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        content: string;
        parentId: string | null;
        authorId: string;
        topicId: string | null;
        subTopicId: string | null;
        sentiment: number | null;
        hostilityScore: number;
        argumentStrength: number;
        evidenceLevel: number;
        topicRelevance: number;
        isHidden: boolean;
        hideReason: string | null;
    }>;
    /**
     * Update topic trending scores based on recent activity
     */
    static updateTrendingScores(): Promise<void>;
    private static performClustering;
    private static calculateCentroid;
    private static generateTopicSummary;
    private static calculateTrendingScore;
    private static calculateComplexityScore;
    private static calculateEvidenceQuality;
    private static isPositiveArgument;
    private static isNegativeArgument;
    private static extractKeyPoint;
}
export {};
//# sourceMappingURL=topicService.d.ts.map