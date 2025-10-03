"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const storage_blob_1 = require("@azure/storage-blob");
class BadgeService {
    constructor() {
        this.containerName = 'photos'; // Using existing photos container
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (connectionString) {
            this.storageClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        }
    }
    // Upload badge image to Azure Storage
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
            blobHTTPHeaders: { blobContentType: file.mimetype }
        });
        return blockBlobClient.url;
    }
    // Create a new badge
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
    // Award badge to user
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
    // Check if user qualifies for a badge
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
        // This would call a custom API endpoint to check special criteria
        // For now, return false as placeholder
        return false;
    }
    // Run automatic badge qualification checks for all active users
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
                        console.error(`Error awarding badge ${badge.id} to user ${user.id}:`, error);
                    }
                }
            }
        }
        return badgesAwarded;
    }
    // Get user's badge collection
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
    // Update user's badge display preferences
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
    // Get all badges for admin management
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
    // Update badge details
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
    // Delete badge
    async deleteBadge(badgeId) {
        // Soft delete by deactivating
        await prisma_1.prisma.badge.update({
            where: { id: badgeId },
            data: { isActive: false }
        });
    }
}
exports.default = new BadgeService();
//# sourceMappingURL=badge.service.js.map