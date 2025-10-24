import { Badge, UserBadge } from '@prisma/client';
interface BadgeQualificationCriteria {
    type: 'QUEST_COMPLETION' | 'USER_ACTIVITY' | 'CIVIC_ACTION' | 'SOCIAL_METRIC' | 'CUSTOM_ENDPOINT';
    requirements: {
        questTypes?: string[];
        questCompletionCount?: number;
        streakDays?: number;
        activityTypes?: string[];
        activityCount?: number;
        timeframe?: string;
        petitionsSigned?: number;
        eventsAttended?: number;
        postsCreated?: number;
        reputationScore?: number;
        followersCount?: number;
        friendsCount?: number;
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
declare class BadgeService {
    private storageClient;
    private containerName;
    constructor();
    /**
     * Uploads badge image to Azure Blob Storage
     *
     * @param file - Multer file object from multipart upload
     * @param badgeName - Badge name used to generate safe filename
     * @returns Promise<string> URL of uploaded image
     * @throws {Error} When Azure Storage is not configured
     *
     * @example
     * const imageUrl = await badgeService.uploadBadgeImage(req.file, 'Civic Champion');
     * // Returns: 'https://storage.azure.com/photos/badges/1234567890-civic-champion.png'
     */
    uploadBadgeImage(file: Express.Multer.File, badgeName: string): Promise<string>;
    /**
     * Creates a new badge with image upload
     *
     * @param data - Badge creation data including name, description, image, qualification criteria, etc.
     * @param data.imageFile - Optional Multer file for badge image (will be uploaded to Azure)
     * @param data.imageUrl - Optional direct URL if image already uploaded
     * @param data.qualificationCriteria - JSON object defining how badge is earned
     * @param data.isAutoAwarded - Whether badge is awarded automatically (default: true)
     * @param data.maxAwards - Optional limit on total awards
     * @returns Promise<Badge> The created badge
     * @throws {Error} When badge image is missing or Azure upload fails
     *
     * @example
     * const badge = await badgeService.createBadge({
     *   name: 'Civic Champion',
     *   description: 'Awarded for completing 10 civic quests',
     *   imageFile: req.file,
     *   qualificationCriteria: {
     *     type: 'QUEST_COMPLETION',
     *     requirements: { questCompletionCount: 10 }
     *   },
     *   isAutoAwarded: true,
     *   createdBy: 'admin_123'
     * });
     */
    createBadge(data: BadgeCreateInput): Promise<Badge>;
    /**
     * Awards a badge to a user
     *
     * Checks if user already has badge and if badge has reached max awards limit.
     * Creates notification for user when badge is awarded.
     *
     * @param userId - ID of user receiving the badge
     * @param badgeId - ID of badge to award
     * @param awardedBy - Optional ID of admin who awarded it (undefined for automatic awards)
     * @param reason - Optional reason for awarding (shown to user)
     * @returns Promise<UserBadge> The created UserBadge record with badge data included
     * @throws {Error} When user already has badge, badge not found, or award limit reached
     *
     * @example
     * // Automatic award
     * const userBadge = await badgeService.awardBadge('user_123', 'badge_456', undefined, 'Completed 10 quests');
     *
     * @example
     * // Manual admin award
     * const userBadge = await badgeService.awardBadge('user_123', 'badge_456', 'admin_789', 'Special recognition');
     */
    awardBadge(userId: string, badgeId: string, awardedBy?: string, reason?: string): Promise<UserBadge>;
    /**
     * Checks if a user qualifies for a badge based on criteria
     *
     * Routes to appropriate criteria checker based on badge qualification type:
     * - QUEST_COMPLETION: Check quest completion count and streaks
     * - USER_ACTIVITY: Check activity counts within timeframe
     * - CIVIC_ACTION: Check petitions signed, events attended, posts created
     * - SOCIAL_METRIC: Check reputation score, followers, friends count
     * - CUSTOM_ENDPOINT: Placeholder for custom qualification logic
     *
     * @param userId - ID of user to check
     * @param badgeId - ID of badge to check qualification for
     * @returns Promise<boolean> True if user meets all qualification criteria
     * @throws {Error} When badge is not found
     *
     * @example
     * const qualifies = await badgeService.checkUserQualifications('user_123', 'badge_456');
     * if (qualifies) {
     *   await badgeService.awardBadge('user_123', 'badge_456');
     * }
     */
    checkUserQualifications(userId: string, badgeId: string): Promise<boolean>;
    private checkQuestCriteria;
    private checkActivityCriteria;
    private checkCivicCriteria;
    private checkSocialCriteria;
    private checkCustomEndpoint;
    /**
     * Runs automatic badge qualification checks for all active users
     *
     * Checks all active users (seen within last 30 days) against all active auto-awarded badges.
     * Awards badges to users who meet qualification criteria and don't already have the badge.
     * Skips users who already have each badge to avoid duplicates.
     *
     * This is typically called by scheduled task (e.g., daily cron job).
     *
     * @returns Promise<number> Count of badges awarded during this run
     *
     * @example
     * const count = await badgeService.runBadgeQualificationChecks();
     * console.log(`${count} badges awarded`); // "15 badges awarded"
     */
    runBadgeQualificationChecks(): Promise<number>;
    /**
     * Retrieves a user's badge collection
     *
     * Returns all badges earned by the user organized by display status.
     *
     * @param userId - ID of user whose badges to retrieve
     * @returns Promise<Object> Object containing:
     *   - displayedBadges: Badges user chose to display publicly
     *   - allBadges: All badges earned by user
     *   - totalBadges: Total count of badges earned
     *   - recentlyEarned: Last 5 badges earned (most recent first)
     *
     * @example
     * const badges = await badgeService.getUserBadges('user_123');
     * console.log(badges.totalBadges); // 12
     * console.log(badges.displayedBadges.length); // 3
     */
    getUserBadges(userId: string): Promise<any>;
    /**
     * Updates user's badge display preferences
     *
     * Controls whether a badge appears on user's profile and its display order.
     *
     * @param userId - ID of user updating preferences
     * @param badgeId - ID of badge to update
     * @param isDisplayed - Whether badge should be displayed on profile
     * @param displayOrder - Optional sort order for displayed badges
     * @returns Promise<UserBadge> Updated UserBadge record with badge data
     * @throws {Error} When user doesn't have this badge
     *
     * @example
     * const updated = await badgeService.updateBadgeDisplay('user_123', 'badge_456', true, 1);
     * console.log(updated.isDisplayed); // true
     * console.log(updated.displayOrder); // 1
     */
    updateBadgeDisplay(userId: string, badgeId: string, isDisplayed: boolean, displayOrder?: number): Promise<UserBadge>;
    /**
     * Retrieves all badges in the system (admin function)
     *
     * Returns all badges including inactive ones with award count data.
     * Sorted by active status, display order, and creation date.
     *
     * @returns Promise<Badge[]> Array of all badges with _count.userBadges included
     *
     * @example
     * const allBadges = await badgeService.getAllBadges();
     * console.log(allBadges[0]._count.userBadges); // 42 times awarded
     * console.log(allBadges[0].isActive); // true/false
     */
    getAllBadges(): Promise<Badge[]>;
    /**
     * Updates an existing badge's properties (admin function)
     *
     * Only provided fields will be updated - all fields are optional.
     * Can upload new image which replaces existing image.
     *
     * @param badgeId - The unique identifier of the badge to update
     * @param updates - Partial badge data with fields to update
     * @returns Promise<Badge> The updated badge
     * @throws {Error} When badge is not found or image upload fails
     *
     * @example
     * const updated = await badgeService.updateBadge('badge_123', {
     *   description: 'Updated description',
     *   isAutoAwarded: false
     * });
     */
    updateBadge(badgeId: string, updates: Partial<BadgeCreateInput>): Promise<Badge>;
    /**
     * Deletes a badge by deactivating it (admin function)
     *
     * Soft delete - badge remains in database but becomes inactive.
     * Users who already have the badge keep it, but it won't be awarded to new users.
     *
     * @param badgeId - The unique identifier of the badge to delete
     * @returns Promise<void>
     * @throws {Error} When badge is not found
     *
     * @example
     * await badgeService.deleteBadge('badge_123');
     * // Badge is now inactive but still exists in database
     */
    deleteBadge(badgeId: string): Promise<void>;
    /**
     * Generates claim codes for a badge
     *
     * Creates claim codes that users can redeem to receive a badge.
     * Supports two types:
     * - SHARED: One readable code (e.g., "KICKSTARTER2025") that multiple users can claim
     * - INDIVIDUAL: Multiple unique codes (e.g., "XJ3K-9PL2-QW8R") for one-time use
     *
     * @param params - Code generation parameters
     * @param params.badgeId - ID of badge these codes will award
     * @param params.type - Code type: 'SHARED' or 'INDIVIDUAL'
     * @param params.count - Number of codes to generate (required for INDIVIDUAL, ignored for SHARED)
     * @param params.maxClaims - Maximum number of claims allowed per code (null = unlimited)
     * @param params.expiresAt - Optional expiration date for codes
     * @param params.createdBy - Admin user ID who created these codes
     * @returns Promise<BadgeClaimCode[]> Array of created claim code records
     * @throws {Error} When badge not found or count not provided for INDIVIDUAL type
     *
     * @example
     * // Shared code for convention attendees
     * const codes = await badgeService.generateClaimCodes({
     *   badgeId: 'badge_123',
     *   type: 'SHARED',
     *   maxClaims: null, // unlimited
     *   createdBy: 'admin_456'
     * });
     * console.log(codes[0].code); // "KICKSTARTER2025"
     *
     * @example
     * // Individual codes for 100 backers
     * const codes = await badgeService.generateClaimCodes({
     *   badgeId: 'badge_123',
     *   type: 'INDIVIDUAL',
     *   count: 100,
     *   expiresAt: new Date('2025-12-31'),
     *   createdBy: 'admin_456'
     * });
     * console.log(codes[0].code); // "XJ3K-9PL2-QW8R"
     */
    generateClaimCodes(params: {
        badgeId: string;
        type: 'SHARED' | 'INDIVIDUAL';
        count?: number;
        maxClaims?: number | null;
        expiresAt?: Date | null;
        createdBy: string;
    }): Promise<any[]>;
    /**
     * Generates a readable shared code based on badge name
     *
     * @param badgeName - Name of badge to base code on
     * @returns String in format "BADGENAME2025"
     * @private
     */
    private generateReadableCode;
    /**
     * Generates a unique random code in format "XXXX-XXXX-XXXX"
     *
     * @returns String unique code
     * @private
     */
    private generateUniqueCode;
    /**
     * Claims a badge using a claim code
     *
     * Validates the code and awards the badge to the user.
     * Checks:
     * - Code exists and is active
     * - Code has not expired
     * - User hasn't already claimed this code
     * - Max claims limit not reached (for SHARED codes)
     *
     * @param params - Claim parameters
     * @param params.userId - ID of user claiming the badge
     * @param params.code - Claim code to redeem
     * @returns Promise<Object> Object containing:
     *   - success: true
     *   - userBadge: The awarded UserBadge record
     *   - claimRecord: The BadgeClaim record
     * @throws {Error} When code invalid, expired, already claimed, or limit reached
     *
     * @example
     * const result = await badgeService.claimBadgeWithCode({
     *   userId: 'user_123',
     *   code: 'KICKSTARTER2025'
     * });
     * console.log(result.userBadge.badge.name); // "Kickstarter Backer"
     */
    claimBadgeWithCode(params: {
        userId: string;
        code: string;
    }): Promise<{
        success: boolean;
        userBadge: any;
        claimRecord: any;
    }>;
    /**
     * Awards a badge to multiple users by email address
     *
     * Looks up users by email (case-insensitive) and awards badge to each.
     * Continues processing all emails even if some fail.
     *
     * @param params - Bulk award parameters
     * @param params.badgeId - ID of badge to award
     * @param params.emails - Array of user email addresses
     * @param params.awardedBy - Admin user ID awarding the badges
     * @param params.reason - Optional reason for award (shown to users)
     * @returns Promise<Object> Object containing:
     *   - awarded: Number of successful awards
     *   - failed: Number of failed awards
     *   - details: Array of {email, status, error?} for each email
     *
     * @example
     * const result = await badgeService.awardBadgeBulk({
     *   badgeId: 'badge_123',
     *   emails: ['user1@example.com', 'user2@example.com'],
     *   awardedBy: 'admin_456',
     *   reason: 'Early supporter'
     * });
     * console.log(result.awarded); // 2
     * console.log(result.failed); // 0
     */
    awardBadgeBulk(params: {
        badgeId: string;
        emails: string[];
        awardedBy: string;
        reason?: string;
    }): Promise<{
        awarded: number;
        failed: number;
        details: Array<{
            email: string;
            status: string;
            error?: string;
        }>;
    }>;
    /**
     * Retrieves all claim codes for a badge
     *
     * Returns claim codes with usage statistics.
     *
     * @param params - Query parameters
     * @param params.badgeId - ID of badge to get codes for
     * @returns Promise<BadgeClaimCode[]> Array of claim codes with usage data
     *
     * @example
     * const codes = await badgeService.getClaimCodesByBadge({ badgeId: 'badge_123' });
     * console.log(codes[0].claimsUsed); // 42
     * console.log(codes[0].maxClaims); // 100
     */
    getClaimCodesByBadge(params: {
        badgeId: string;
    }): Promise<any[]>;
    /**
     * Deactivates a claim code
     *
     * Sets isActive to false, preventing further claims.
     * Existing claims remain valid.
     *
     * @param params - Deactivation parameters
     * @param params.claimCodeId - ID of claim code to deactivate
     * @returns Promise<void>
     * @throws {Error} When claim code not found
     *
     * @example
     * await badgeService.deactivateClaimCode({ claimCodeId: 'code_123' });
     */
    deactivateClaimCode(params: {
        claimCodeId: string;
    }): Promise<void>;
}
declare const _default: BadgeService;
export default _default;
//# sourceMappingURL=badge.service.d.ts.map