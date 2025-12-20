"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const storage_blob_1 = require("@azure/storage-blob");
const logger_1 = require("./logger");
class BadgeService {
    storageClient;
    containerName = 'photos'; // Using existing photos container
    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (connectionString) {
            this.storageClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        }
    }
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
    async uploadBadgeImage(file, badgeName) {
        if (!this.storageClient) {
            throw new Error('Azure Storage not configured');
        }
        const timestamp = Date.now();
        const safeName = badgeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const filename = `badges/${timestamp}-${safeName}.${file.originalname.split('.').pop()}`;
        const containerClient = this.storageClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(filename);
        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: {
                blobContentType: file.mimetype,
                blobContentDisposition: 'inline', // Badge images safe to display
                blobCacheControl: 'public, max-age=31536000' // 1 year cache
            }
        });
        return blockBlobClient.url;
    }
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
    async createBadge(data) {
        let imageUrl = data.imageUrl;
        // Upload image if provided
        if (data.imageFile) {
            imageUrl = await this.uploadBadgeImage(data.imageFile, data.name);
        }
        if (!imageUrl) {
            throw new Error('Badge image is required');
        }
        return await prisma_1.prisma.badge.create({
            data: {
                name: data.name,
                description: data.description,
                imageUrl,
                qualificationCriteria: data.qualificationCriteria,
                isAutoAwarded: data.isAutoAwarded ?? true,
                maxAwards: data.maxAwards,
                displayOrder: data.displayOrder ?? 0,
                createdBy: data.createdBy
            }
        });
    }
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
    async awardBadge(userId, badgeId, awardedBy, reason) {
        // Check if user already has this badge
        const existing = await prisma_1.prisma.userBadge.findUnique({
            where: {
                userId_badgeId: {
                    userId,
                    badgeId
                }
            }
        });
        if (existing) {
            throw new Error('User already has this badge');
        }
        // Check if badge has max awards limit
        const badge = await prisma_1.prisma.badge.findUnique({
            where: { id: badgeId },
            include: {
                _count: {
                    select: { userBadges: true }
                }
            }
        });
        if (!badge) {
            throw new Error('Badge not found');
        }
        if (badge.maxAwards && badge._count.userBadges >= badge.maxAwards) {
            throw new Error('Badge award limit reached');
        }
        // Award the badge
        const userBadge = await prisma_1.prisma.userBadge.create({
            data: {
                userId,
                badgeId,
                awardedBy,
                awardReason: reason
            },
            include: {
                badge: true
            }
        });
        // Create notification for user
        await prisma_1.prisma.notification.create({
            data: {
                type: 'REACTION', // Using existing type, may want to add BADGE_EARNED later
                senderId: awardedBy || 'system',
                receiverId: userId,
                message: `You earned the "${badge.name}" badge!`
            }
        });
        return userBadge;
    }
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
    async checkUserQualifications(userId, badgeId) {
        const badge = await prisma_1.prisma.badge.findUnique({
            where: { id: badgeId }
        });
        if (!badge) {
            throw new Error('Badge not found');
        }
        const criteria = badge.qualificationCriteria;
        switch (criteria.type) {
            case 'QUEST_COMPLETION':
                return await this.checkQuestCriteria(userId, criteria.requirements);
            case 'USER_ACTIVITY':
                return await this.checkActivityCriteria(userId, criteria.requirements);
            case 'CIVIC_ACTION':
                return await this.checkCivicCriteria(userId, criteria.requirements);
            case 'SOCIAL_METRIC':
                return await this.checkSocialCriteria(userId, criteria.requirements);
            case 'CUSTOM_ENDPOINT':
                return await this.checkCustomEndpoint(userId, criteria.requirements);
            default:
                return false;
        }
    }
    async checkQuestCriteria(userId, requirements) {
        if (requirements.questCompletionCount) {
            const completedQuests = await prisma_1.prisma.userQuestProgress.count({
                where: {
                    userId,
                    completed: true
                }
            });
            if (completedQuests < requirements.questCompletionCount) {
                return false;
            }
        }
        if (requirements.streakDays) {
            const streak = await prisma_1.prisma.userQuestStreak.findUnique({
                where: { userId }
            });
            if (!streak || streak.currentDailyStreak < requirements.streakDays) {
                return false;
            }
        }
        return true;
    }
    async checkActivityCriteria(userId, requirements) {
        const whereClause = { userId };
        if (requirements.activityTypes) {
            whereClause.activityType = { in: requirements.activityTypes };
        }
        if (requirements.timeframe && requirements.timeframe !== 'all_time') {
            const days = parseInt(requirements.timeframe.replace('d', ''));
            const since = new Date();
            since.setDate(since.getDate() - days);
            whereClause.createdAt = { gte: since };
        }
        const activityCount = await prisma_1.prisma.userActivity.count({
            where: whereClause
        });
        return activityCount >= (requirements.activityCount || 0);
    }
    async checkCivicCriteria(userId, requirements) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: {
                        petitionSignatures: true,
                        eventRSVPs: true,
                        posts: true
                    }
                }
            }
        });
        if (!user)
            return false;
        if (requirements.petitionsSigned && user._count.petitionSignatures < requirements.petitionsSigned) {
            return false;
        }
        if (requirements.eventsAttended && user._count.eventRSVPs < requirements.eventsAttended) {
            return false;
        }
        if (requirements.postsCreated && user._count.posts < requirements.postsCreated) {
            return false;
        }
        return true;
    }
    async checkSocialCriteria(userId, requirements) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                reputationScore: true,
                followersCount: true,
                _count: {
                    select: {
                        receivedFriendRequests: { where: { status: 'ACCEPTED' } },
                        sentFriendRequests: { where: { status: 'ACCEPTED' } }
                    }
                }
            }
        });
        if (!user)
            return false;
        if (requirements.reputationScore && (user.reputationScore || 0) < requirements.reputationScore) {
            return false;
        }
        if (requirements.followersCount && user.followersCount < requirements.followersCount) {
            return false;
        }
        if (requirements.friendsCount) {
            const friendsCount = user._count.receivedFriendRequests + user._count.sentFriendRequests;
            if (friendsCount < requirements.friendsCount) {
                return false;
            }
        }
        return true;
    }
    async checkCustomEndpoint(userId, requirements) {
        // Support user property checking
        if (requirements.userProperty) {
            // Whitelist of allowed user properties for safety
            const allowedProperties = [
                'isAdmin',
                'isSuperAdmin',
                'verificationStatus',
                'isEmailVerified',
                'isPhoneVerified',
                'accountType'
            ];
            // Validate property is in whitelist
            if (!allowedProperties.includes(requirements.userProperty)) {
                logger_1.logger.error({ userProperty: requirements.userProperty }, 'Invalid user property in badge criteria');
                return false;
            }
            try {
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { [requirements.userProperty]: true }
                });
                if (!user)
                    return false;
                const actualValue = user[requirements.userProperty];
                return actualValue === requirements.expectedValue;
            }
            catch (error) {
                logger_1.logger.error({ error, userProperty: requirements.userProperty }, 'Error checking user property');
                return false;
            }
        }
        // Support external HTTP endpoint (future enhancement)
        if (requirements.customEndpoint) {
            // TODO: Implement HTTP call to external endpoint
            // For now, return false
            return false;
        }
        return false;
    }
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
    async runBadgeQualificationChecks() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsers = await prisma_1.prisma.user.findMany({
            where: {
                lastSeenAt: { gte: thirtyDaysAgo }
            },
            select: { id: true }
        });
        const activeBadges = await prisma_1.prisma.badge.findMany({
            where: {
                isActive: true,
                isAutoAwarded: true
            }
        });
        let badgesAwarded = 0;
        for (const user of activeUsers) {
            for (const badge of activeBadges) {
                const alreadyHas = await prisma_1.prisma.userBadge.findUnique({
                    where: {
                        userId_badgeId: {
                            userId: user.id,
                            badgeId: badge.id
                        }
                    }
                });
                if (!alreadyHas && await this.checkUserQualifications(user.id, badge.id)) {
                    try {
                        await this.awardBadge(user.id, badge.id, undefined, 'Automatically awarded for meeting criteria');
                        badgesAwarded++;
                    }
                    catch (error) {
                        logger_1.logger.error({ error, badgeId: badge.id, userId: user.id }, 'Error awarding badge to user');
                    }
                }
            }
        }
        return badgesAwarded;
    }
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
    async getUserBadges(userId) {
        const userBadges = await prisma_1.prisma.userBadge.findMany({
            where: { userId },
            include: {
                badge: true
            },
            orderBy: [
                { isDisplayed: 'desc' },
                { displayOrder: 'asc' },
                { earnedAt: 'desc' }
            ]
        });
        const displayedBadges = userBadges.filter(ub => ub.isDisplayed);
        const allBadges = userBadges;
        return {
            displayedBadges,
            allBadges,
            totalBadges: allBadges.length,
            recentlyEarned: allBadges.slice(0, 5)
        };
    }
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
    async updateBadgeDisplay(userId, badgeId, isDisplayed, displayOrder) {
        return await prisma_1.prisma.userBadge.update({
            where: {
                userId_badgeId: {
                    userId,
                    badgeId
                }
            },
            data: {
                isDisplayed,
                displayOrder
            },
            include: {
                badge: true
            }
        });
    }
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
    async getAllBadges() {
        return await prisma_1.prisma.badge.findMany({
            include: {
                _count: {
                    select: { userBadges: true }
                }
            },
            orderBy: [
                { isActive: 'desc' },
                { displayOrder: 'asc' },
                { createdAt: 'desc' }
            ]
        });
    }
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
    async updateBadge(badgeId, updates) {
        const data = {};
        if (updates.name !== undefined)
            data.name = updates.name;
        if (updates.description !== undefined)
            data.description = updates.description;
        if (updates.qualificationCriteria !== undefined) {
            data.qualificationCriteria = updates.qualificationCriteria;
        }
        if (updates.isAutoAwarded !== undefined)
            data.isAutoAwarded = updates.isAutoAwarded;
        if (updates.maxAwards !== undefined)
            data.maxAwards = updates.maxAwards;
        if (updates.displayOrder !== undefined)
            data.displayOrder = updates.displayOrder;
        if (updates.imageFile) {
            data.imageUrl = await this.uploadBadgeImage(updates.imageFile, updates.name || 'badge');
        }
        return await prisma_1.prisma.badge.update({
            where: { id: badgeId },
            data
        });
    }
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
    async deleteBadge(badgeId) {
        // Soft delete by deactivating
        await prisma_1.prisma.badge.update({
            where: { id: badgeId },
            data: { isActive: false }
        });
    }
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
    async generateClaimCodes(params) {
        // Verify badge exists
        const badge = await prisma_1.prisma.badge.findUnique({
            where: { id: params.badgeId }
        });
        if (!badge) {
            throw new Error('Badge not found');
        }
        const codes = [];
        if (params.type === 'SHARED') {
            // Generate one readable shared code
            const code = this.generateReadableCode(badge.name);
            const claimCode = await prisma_1.prisma.badgeClaimCode.create({
                data: {
                    code,
                    badgeId: params.badgeId,
                    type: params.type,
                    maxClaims: params.maxClaims,
                    expiresAt: params.expiresAt,
                    createdBy: params.createdBy
                }
            });
            codes.push(claimCode);
        }
        else if (params.type === 'INDIVIDUAL') {
            // Generate multiple unique codes
            if (!params.count || params.count < 1) {
                throw new Error('Count is required for INDIVIDUAL codes');
            }
            for (let i = 0; i < params.count; i++) {
                const code = this.generateUniqueCode();
                const claimCode = await prisma_1.prisma.badgeClaimCode.create({
                    data: {
                        code,
                        badgeId: params.badgeId,
                        type: params.type,
                        maxClaims: 1, // Individual codes are always single-use
                        expiresAt: params.expiresAt,
                        createdBy: params.createdBy
                    }
                });
                codes.push(claimCode);
            }
        }
        return codes;
    }
    /**
     * Generates a readable shared code based on badge name
     *
     * @param badgeName - Name of badge to base code on
     * @returns String in format "BADGENAME2025"
     * @private
     */
    generateReadableCode(badgeName) {
        const sanitized = badgeName.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const year = new Date().getFullYear();
        return `${sanitized}${year}`;
    }
    /**
     * Generates a unique random code in format "XXXX-XXXX-XXXX"
     *
     * @returns String unique code
     * @private
     */
    generateUniqueCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars
        const segments = 3;
        const segmentLength = 4;
        const code = [];
        for (let i = 0; i < segments; i++) {
            let segment = '';
            for (let j = 0; j < segmentLength; j++) {
                segment += chars[Math.floor(Math.random() * chars.length)];
            }
            code.push(segment);
        }
        return code.join('-');
    }
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
    async claimBadgeWithCode(params) {
        // Find claim code
        const claimCode = await prisma_1.prisma.badgeClaimCode.findUnique({
            where: { code: params.code },
            include: { badge: true }
        });
        if (!claimCode) {
            throw new Error('Invalid claim code');
        }
        if (!claimCode.isActive) {
            throw new Error('This claim code has been deactivated');
        }
        if (claimCode.expiresAt && new Date() > claimCode.expiresAt) {
            throw new Error('This claim code has expired');
        }
        // Check if user already claimed this code
        const existingClaim = await prisma_1.prisma.badgeClaim.findUnique({
            where: {
                claimCodeId_userId: {
                    claimCodeId: claimCode.id,
                    userId: params.userId
                }
            }
        });
        if (existingClaim) {
            throw new Error('You have already claimed this code');
        }
        // Check max claims limit
        if (claimCode.maxClaims !== null && claimCode.claimsUsed >= claimCode.maxClaims) {
            throw new Error('This claim code has reached its maximum usage limit');
        }
        // Award badge (will throw if user already has badge from another source)
        let userBadge;
        try {
            userBadge = await this.awardBadge(params.userId, claimCode.badgeId, undefined, `Claimed with code: ${params.code}`);
        }
        catch (error) {
            if (error.message === 'User already has this badge') {
                // User has badge from another source, still record the claim
                userBadge = await prisma_1.prisma.userBadge.findUnique({
                    where: {
                        userId_badgeId: {
                            userId: params.userId,
                            badgeId: claimCode.badgeId
                        }
                    },
                    include: { badge: true }
                });
            }
            else {
                throw error;
            }
        }
        // Create claim record
        const claimRecord = await prisma_1.prisma.badgeClaim.create({
            data: {
                claimCodeId: claimCode.id,
                userId: params.userId
            }
        });
        // Increment claims used count
        await prisma_1.prisma.badgeClaimCode.update({
            where: { id: claimCode.id },
            data: { claimsUsed: { increment: 1 } }
        });
        return {
            success: true,
            userBadge,
            claimRecord
        };
    }
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
    async awardBadgeBulk(params) {
        const badge = await prisma_1.prisma.badge.findUnique({
            where: { id: params.badgeId }
        });
        if (!badge) {
            throw new Error('Badge not found');
        }
        const details = [];
        let awarded = 0;
        let failed = 0;
        for (const email of params.emails) {
            try {
                // Find user by email (case-insensitive)
                const user = await prisma_1.prisma.user.findFirst({
                    where: {
                        email: {
                            equals: email,
                            mode: 'insensitive'
                        }
                    }
                });
                if (!user) {
                    details.push({ email, status: 'failed', error: 'User not found' });
                    failed++;
                    continue;
                }
                // Award badge
                await this.awardBadge(user.id, params.badgeId, params.awardedBy, params.reason);
                details.push({ email, status: 'awarded' });
                awarded++;
            }
            catch (error) {
                details.push({
                    email,
                    status: 'failed',
                    error: error.message || 'Unknown error'
                });
                failed++;
            }
        }
        return { awarded, failed, details };
    }
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
    async getClaimCodesByBadge(params) {
        return await prisma_1.prisma.badgeClaimCode.findMany({
            where: { badgeId: params.badgeId },
            include: {
                badge: true,
                _count: {
                    select: { claims: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
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
    async deactivateClaimCode(params) {
        await prisma_1.prisma.badgeClaimCode.update({
            where: { id: params.claimCodeId },
            data: { isActive: false }
        });
    }
}
exports.default = new BadgeService();
//# sourceMappingURL=badge.service.js.map