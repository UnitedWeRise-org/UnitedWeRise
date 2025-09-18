/**
 * Production Database Cleanup Script
 * Safely removes test users and test content while preserving admin accounts
 */

const { PrismaClient } = require('@prisma/client');
const { DatabaseBackup } = require('./backup-restore');
const readline = require('readline');

const prisma = new PrismaClient();

class ProductionCleanup {
    constructor(dryRun = true) {
        this.dryRun = dryRun;
        this.backup = new DatabaseBackup();
        this.adminUserIds = [];
        this.protectedUserIds = [];
        this.protectedUsernames = ['project2029', 'unitedwerise', 'userjb', 'ijefe', 'ambenso1'];
        this.testUserIds = [];
        this.adminPostIds = [];
        this.testPostIds = [];
        this.stats = {
            usersToDelete: 0,
            postsToDelete: 0,
            commentsToDelete: 0,
            likesToDelete: 0,
            photosToDelete: 0,
            activitiesToDelete: 0,
            notificationsToDelete: 0,
            followsToDelete: 0
        };
    }

    log(message, level = 'info') {
        const prefix = this.dryRun ? '[DRY RUN] ' : '[LIVE] ';
        const emoji = {
            info: '🔍',
            warn: '⚠️',
            success: '✅',
            error: '❌',
            action: '🔧'
        }[level] || '📝';

        console.log(`${prefix}${emoji} ${message}`);
    }

    async confirmAction(message) {
        if (this.dryRun) return true;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(`${message} (type 'yes' to confirm): `, (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'yes');
            });
        });
    }

    async identifyProtectedUsers() {
        this.log('Identifying protected users...');

        try {
            // First get admin users
            const adminUsers = await prisma.user.findMany({
                where: {
                    isAdmin: true
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true
                }
            });

            this.adminUserIds = adminUsers.map(user => user.id);

            // Then get specifically protected usernames
            const protectedUsers = await prisma.user.findMany({
                where: {
                    username: {
                        in: this.protectedUsernames,
                        mode: 'insensitive'
                    }
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true,
                    isAdmin: true
                }
            });

            // Combine all protected user IDs (admins + specified users)
            this.protectedUserIds = [...new Set([
                ...this.adminUserIds,
                ...protectedUsers.map(user => user.id)
            ])];

            this.log('👑 Protected Users (will NOT be deleted):');
            const allProtected = [...new Set([...adminUsers, ...protectedUsers.filter(u => !adminUsers.find(a => a.id === u.id))])];
            allProtected.forEach(user => {
                const isAdmin = this.adminUserIds.includes(user.id);
                this.log(`   ${user.username} (${user.email}) - ${isAdmin ? 'ADMIN' : 'PROTECTED'} - Created: ${user.createdAt.toISOString().split('T')[0]}`);
            });

            if (this.protectedUserIds.length === 0) {
                throw new Error('No protected users found! This is dangerous - stopping cleanup.');
            }

            this.log(`Total protected users: ${this.protectedUserIds.length}`);
            return allProtected;
        } catch (error) {
            this.log(`Failed to identify admin users: ${error.message}`, 'error');
            throw error;
        }
    }

    async identifyTestUsers() {
        this.log('Identifying test users for removal...');

        try {
            // Primary focus: users with "test" in their email
            const testUsers = await prisma.user.findMany({
                where: {
                    AND: [
                        {
                            email: {
                                contains: 'test',
                                mode: 'insensitive'
                            }
                        },
                        {
                            id: { notIn: this.protectedUserIds } // Exclude all protected users
                        },
                        {
                            username: {
                                notIn: this.protectedUsernames,
                                mode: 'insensitive'
                            } // Triple protection
                        }
                    ]
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true,
                    _count: {
                        select: {
                            posts: true,
                            comments: true,
                            likes: true
                        }
                    }
                }
            });

            // Focus on users with "test" in email only
            const incompleteUsers = [];

            // Combine and deduplicate
            const allTestUsers = [...testUsers, ...incompleteUsers];
            const uniqueTestUsers = allTestUsers.filter((user, index, self) =>
                index === self.findIndex(u => u.id === user.id)
            );

            this.testUserIds = uniqueTestUsers.map(user => user.id);

            this.log('🧪 Test Users Identified for Removal:');
            uniqueTestUsers.forEach(user => {
                const activity = testUsers.find(u => u.id === user.id)?._count;
                this.log(`   ${user.username} (${user.email}) - Created: ${user.createdAt.toISOString().split('T')[0]}${activity ? ` - Posts: ${activity.posts}, Comments: ${activity.comments}, Likes: ${activity.likes}` : ''}`);
            });

            this.stats.usersToDelete = uniqueTestUsers.length;
            return uniqueTestUsers;

        } catch (error) {
            this.log(`Failed to identify test users: ${error.message}`, 'error');
            throw error;
        }
    }

    async identifyAdminPosts() {
        this.log('Identifying admin posts for content cleanup...');

        try {
            const adminPosts = await prisma.post.findMany({
                where: {
                    authorId: { in: this.adminUserIds }
                },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    author: {
                        select: { username: true }
                    },
                    _count: {
                        select: {
                            comments: true,
                            likes: true
                        }
                    }
                }
            });

            this.adminPostIds = adminPosts.map(post => post.id);

            this.log('📝 Admin Posts for Content Cleanup:');
            adminPosts.forEach(post => {
                const preview = post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');
                this.log(`   @${post.author.username}: "${preview}" - ${post._count.comments} comments, ${post._count.likes} likes`);
            });

            this.stats.postsToDelete += adminPosts.length;
            return adminPosts;

        } catch (error) {
            this.log(`Failed to identify admin posts: ${error.message}`, 'error');
            throw error;
        }
    }

    async identifyTestPosts() {
        this.log('Identifying test user posts...');

        try {
            const testPosts = await prisma.post.findMany({
                where: {
                    authorId: { in: this.testUserIds }
                },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    author: {
                        select: { username: true }
                    }
                }
            });

            this.testPostIds = testPosts.map(post => post.id);

            this.log(`📝 Test User Posts: ${testPosts.length} posts from test users`);

            return testPosts;

        } catch (error) {
            this.log(`Failed to identify test posts: ${error.message}`, 'error');
            throw error;
        }
    }

    async calculateDeletionStats() {
        this.log('Calculating deletion statistics...');

        try {
            const allPostIds = [...this.adminPostIds, ...this.testPostIds];

            // Count comments to delete
            this.stats.commentsToDelete = await prisma.comment.count({
                where: {
                    OR: [
                        { postId: { in: allPostIds } },
                        { userId: { in: this.testUserIds } }
                    ]
                }
            });

            // Count likes to delete
            this.stats.likesToDelete = await prisma.like.count({
                where: {
                    OR: [
                        { postId: { in: allPostIds } },
                        { userId: { in: this.testUserIds } }
                    ]
                }
            });

            // Count photos to delete
            this.stats.photosToDelete = await prisma.photo.count({
                where: {
                    OR: [
                        { postId: { in: allPostIds } },
                        { userId: { in: this.testUserIds } }
                    ]
                }
            });

            // Count activities to delete
            this.stats.activitiesToDelete = await prisma.userActivity.count({
                where: {
                    OR: [
                        { targetId: { in: allPostIds } },
                        { userId: { in: this.testUserIds } }
                    ]
                }
            });

            // Count notifications to delete
            this.stats.notificationsToDelete = await prisma.notification.count({
                where: {
                    OR: [
                        { postId: { in: allPostIds } },
                        { senderId: { in: this.testUserIds } },
                        { receiverId: { in: this.testUserIds } }
                    ]
                }
            });

            // Count follows to delete
            this.stats.followsToDelete = await prisma.follow.count({
                where: {
                    OR: [
                        { followerId: { in: this.testUserIds } },
                        { followingId: { in: this.testUserIds } }
                    ]
                }
            });

            this.log('📊 Deletion Statistics:');
            Object.entries(this.stats).forEach(([key, value]) => {
                this.log(`   ${key}: ${value}`);
            });

        } catch (error) {
            this.log(`Failed to calculate stats: ${error.message}`, 'error');
            throw error;
        }
    }

    async performCleanup() {
        if (!this.dryRun && !process.argv.includes('--force')) {
            const confirmed = await this.confirmAction('⚠️  This will PERMANENTLY delete data from production database. Are you absolutely sure?');
            if (!confirmed) {
                this.log('Cleanup cancelled by user', 'warn');
                return false;
            }
        }

        this.log('Starting cleanup process...', 'action');

        try {
            const allPostIds = [...this.adminPostIds, ...this.testPostIds];

            // Delete in proper order to handle foreign key constraints

            // 1. Delete user activities
            if (this.stats.activitiesToDelete > 0) {
                this.log(`Deleting ${this.stats.activitiesToDelete} user activities...`, 'action');
                if (!this.dryRun) {
                    await prisma.userActivity.deleteMany({
                        where: {
                            OR: [
                                { targetId: { in: allPostIds } },
                                { userId: { in: this.testUserIds } }
                            ]
                        }
                    });
                }
            }

            // 2. Delete notifications
            if (this.stats.notificationsToDelete > 0) {
                this.log(`Deleting ${this.stats.notificationsToDelete} notifications...`, 'action');
                if (!this.dryRun) {
                    await prisma.notification.deleteMany({
                        where: {
                            OR: [
                                { postId: { in: allPostIds } },
                                { senderId: { in: this.testUserIds } },
                                { receiverId: { in: this.testUserIds } }
                            ]
                        }
                    });
                }
            }

            // 3. Delete likes
            if (this.stats.likesToDelete > 0) {
                this.log(`Deleting ${this.stats.likesToDelete} likes...`, 'action');
                if (!this.dryRun) {
                    await prisma.like.deleteMany({
                        where: {
                            OR: [
                                { postId: { in: allPostIds } },
                                { userId: { in: this.testUserIds } }
                            ]
                        }
                    });
                }
            }

            // 4. Delete comments
            if (this.stats.commentsToDelete > 0) {
                this.log(`Deleting ${this.stats.commentsToDelete} comments...`, 'action');
                if (!this.dryRun) {
                    await prisma.comment.deleteMany({
                        where: {
                            OR: [
                                { postId: { in: allPostIds } },
                                { userId: { in: this.testUserIds } }
                            ]
                        }
                    });
                }
            }

            // 5. Delete photos
            if (this.stats.photosToDelete > 0) {
                this.log(`Deleting ${this.stats.photosToDelete} photos...`, 'action');
                if (!this.dryRun) {
                    await prisma.photo.deleteMany({
                        where: {
                            OR: [
                                { postId: { in: allPostIds } },
                                { userId: { in: this.testUserIds } }
                            ]
                        }
                    });
                }
            }

            // 6. Delete posts
            if (allPostIds.length > 0) {
                this.log(`Deleting ${allPostIds.length} posts...`, 'action');
                if (!this.dryRun) {
                    await prisma.post.deleteMany({
                        where: {
                            id: { in: allPostIds }
                        }
                    });
                }
            }

            // 7. Delete follows
            if (this.stats.followsToDelete > 0) {
                this.log(`Deleting ${this.stats.followsToDelete} follow relationships...`, 'action');
                if (!this.dryRun) {
                    await prisma.follow.deleteMany({
                        where: {
                            OR: [
                                { followerId: { in: this.testUserIds } },
                                { followingId: { in: this.testUserIds } }
                            ]
                        }
                    });
                }
            }

            // 8. Finally, delete test users (this will cascade to remaining related data)
            if (this.testUserIds.length > 0) {
                this.log(`Deleting ${this.testUserIds.length} test users...`, 'action');
                if (!this.dryRun) {
                    await prisma.user.deleteMany({
                        where: {
                            id: { in: this.testUserIds }
                        }
                    });
                }
            }

            this.log('Cleanup completed successfully!', 'success');
            return true;

        } catch (error) {
            this.log(`Cleanup failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async run() {
        try {
            this.log('🚀 Starting Production Database Cleanup');
            this.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MODE (changes will be permanent)'}`);

            // Step 1: Identify admin users (protected)
            await this.identifyProtectedUsers();

            // Step 2: Identify test users (to be deleted)
            await this.identifyTestUsers();

            // Step 3: Identify admin posts (content cleanup)
            await this.identifyAdminPosts();

            // Step 4: Identify test posts
            await this.identifyTestPosts();

            // Step 5: Calculate deletion statistics
            await this.calculateDeletionStats();

            // Step 6: Show summary and get confirmation
            this.log('🎯 Cleanup Summary:');
            this.log(`   Admin users protected: ${this.adminUserIds.length}`);
            this.log(`   Test users to delete: ${this.stats.usersToDelete}`);
            this.log(`   Total posts to delete: ${this.stats.postsToDelete}`);
            this.log(`   Total comments to delete: ${this.stats.commentsToDelete}`);
            this.log(`   Total records affected: ${Object.values(this.stats).reduce((a, b) => a + b, 0)}`);

            if (!this.dryRun) {
                // Skip confirmation if --force flag is used
                if (!process.argv.includes('--force')) {
                    const finalConfirm = await this.confirmAction('🚨 FINAL CONFIRMATION: Proceed with permanent deletion?');
                    if (!finalConfirm) {
                        this.log('Cleanup cancelled', 'warn');
                        return false;
                    }
                }
            }

            // Step 7: Perform cleanup
            await this.performCleanup();

            if (!this.dryRun) {
                this.log('✨ Production database cleanup completed successfully!', 'success');
            } else {
                this.log('✨ Dry run completed. Use --live flag to execute actual cleanup.', 'success');
            }

            return true;

        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'error');
            throw error;
        }
    }
}

// CLI functionality
if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--live');
    const createBackup = !args.includes('--no-backup');

    async function main() {
        const cleanup = new ProductionCleanup(dryRun);

        try {
            // Create backup before cleanup (unless disabled)
            if (createBackup && !dryRun) {
                console.log('🔄 Creating backup before cleanup...');
                await cleanup.backup.createBackup('pre-cleanup');
            }

            await cleanup.run();

        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            process.exit(1);
        } finally {
            await prisma.$disconnect();
        }
    }

    // Show help
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Production Database Cleanup Script');
        console.log('');
        console.log('Usage:');
        console.log('  node cleanup-production.js           # Dry run (preview only)');
        console.log('  node cleanup-production.js --live    # Execute actual cleanup');
        console.log('  node cleanup-production.js --live --no-backup  # Skip backup creation');
        console.log('');
        console.log('Options:');
        console.log('  --live        Execute actual cleanup (default is dry run)');
        console.log('  --no-backup   Skip automatic backup creation');
        console.log('  --help, -h    Show this help message');
        process.exit(0);
    }

    main();
}

module.exports = { ProductionCleanup };