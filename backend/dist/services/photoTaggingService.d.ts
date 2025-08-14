import { PhotoTag, PhotoPrivacyRequest, PhotoPrivacyRequestType } from '@prisma/client';
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
export declare class PhotoTaggingService {
    /**
     * Create a new photo tag
     */
    static createTag(options: CreateTagOptions): Promise<PhotoTag>;
    /**
     * Approve or decline a photo tag
     */
    static respondToTag(options: TagApprovalOptions): Promise<PhotoTag>;
    /**
     * Remove a photo tag
     */
    static removeTag(tagId: string, userId: string): Promise<void>;
    /**
     * Get tags for a photo
     */
    static getPhotoTags(photoId: string): Promise<PhotoTag[]>;
    /**
     * Get pending tag approvals for a user
     */
    static getPendingTags(userId: string): Promise<PhotoTag[]>;
    /**
     * Create a privacy request
     */
    static createPrivacyRequest(options: PrivacyRequestOptions): Promise<PhotoPrivacyRequest>;
    /**
     * Update user tagging preferences
     */
    static updateTaggingPreferences(userId: string, preferences: {
        photoTaggingEnabled?: boolean;
        requireTagApproval?: boolean;
        allowTagsByFriendsOnly?: boolean;
    }): Promise<void>;
    /**
     * Search users for tagging (respects privacy settings)
     */
    static searchUsersForTagging(query: string, searcherId: string): Promise<any[]>;
}
export {};
//# sourceMappingURL=photoTaggingService.d.ts.map