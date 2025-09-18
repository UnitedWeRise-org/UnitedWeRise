/**
 * Database Integrity Verification Script
 * Validates database state after cleanup operations
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class DatabaseIntegrityVerifier {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.stats = {};
    }

    log(message, level = 'info') {
        const emoji = {
            info: '🔍',
            warn: '⚠️',
            success: '✅',
            error: '❌',
            check: '🔎'
        }[level] || '📝';

        console.log(`${emoji} ${message}`);
    }

    addError(message) {
        this.errors.push(message);
        this.log(message, 'error');
    }

    addWarning(message) {
        this.warnings.push(message);
        this.log(message, 'warn');
    }

    async checkAdminUsers() {
        this.log('Checking admin users...', 'check');

        try {
            const adminUsers = await prisma.user.findMany({
                where: { isAdmin: true },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    createdAt: true
                }
            });

            this.stats.adminUsers = adminUsers.length;

            if (adminUsers.length === 0) {
                this.addError('No admin users found! Database may be corrupted.');
                return false;
            }

            this.log(`Found ${adminUsers.length} admin users:`, 'success');
            adminUsers.forEach(user => {
                this.log(`   ${user.username} (${user.email})`);
            });

            return true;
        } catch (error) {
            this.addError(`Failed to check admin users: ${error.message}`);
            return false;
        }
    }

    async checkForeignKeyIntegrity() {
        this.log('Checking foreign key integrity...', 'check');

        try {
            // Check orphaned posts (posts without valid authors)
            const orphanedPosts = await prisma.post.findMany({
                where: {
                    author: null
                },
                select: { id: true }
            });

            if (orphanedPosts.length > 0) {
                this.addError(`Found ${orphanedPosts.length} orphaned posts without valid authors`);
            }

            // Check orphaned comments (comments without valid posts or users)
            const orphanedComments = await prisma.comment.count({
                where: {
                    OR: [
                        { post: null },
                        { user: null }
                    ]
                }
            });

            if (orphanedComments > 0) {
                this.addError(`Found ${orphanedComments} orphaned comments`);
            }

            // Check orphaned likes
            const orphanedLikes = await prisma.like.count({
                where: {
                    OR: [
                        { post: null },
                        { user: null }
                    ]
                }
            });

            if (orphanedLikes > 0) {
                this.addError(`Found ${orphanedLikes} orphaned likes`);
            }

            // Check orphaned photos
            const orphanedPhotos = await prisma.photo.count({
                where: {
                    user: null
                }
            });

            if (orphanedPhotos > 0) {
                this.addError(`Found ${orphanedPhotos} orphaned photos`);
            }

            // Check orphaned activities
            const orphanedActivities = await prisma.userActivity.count({
                where: {
                    user: null
                }
            });

            if (orphanedActivities > 0) {
                this.addError(`Found ${orphanedActivities} orphaned user activities`);
            }

            if (this.errors.length === 0) {
                this.log('Foreign key integrity check passed', 'success');
                return true;
            } else {
                return false;
            }

        } catch (error) {
            this.addError(`Failed to check foreign key integrity: ${error.message}`);
            return false;
        }
    }

    async checkTestUserRemoval() {
        this.log('Checking test user removal...', 'check');

        try {
            // Check for remaining test users
            const testUserPatterns = [
                { email: { contains: 'test' } },
                { email: { contains: 'dummy' } },
                { email: { contains: 'example' } },
                { email: { contains: 'demo' } },
                { username: { contains: 'test' } },
                { username: { contains: 'dummy' } },
                { username: { contains: 'demo' } },
                { firstName: { contains: 'Test' } },
                { firstName: { contains: 'Dummy' } }
            ];

            const remainingTestUsers = await prisma.user.findMany({
                where: {
                    AND: [
                        { OR: testUserPatterns },
                        { isAdmin: false }
                    ]
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true
                }
            });

            if (remainingTestUsers.length > 0) {
                this.addWarning(`Found ${remainingTestUsers.length} potential test users that weren't removed:`);
                remainingTestUsers.forEach(user => {
                    this.log(`   ${user.username} (${user.email})`);
                });
            } else {
                this.log('Test user removal appears complete', 'success');
            }

            return remainingTestUsers.length === 0;

        } catch (error) {
            this.addError(`Failed to check test user removal: ${error.message}`);
            return false;
        }
    }

    async checkCounterIntegrity() {
        this.log('Checking counter integrity...', 'check');

        try {
            // Check posts with incorrect like counts
            const postsWithIncorrectLikes = await prisma.$queryRaw`
                SELECT p.id, p."likesCount", COUNT(l.id)::int as actual_likes
                FROM "Post" p
                LEFT JOIN "Like" l ON l."postId" = p.id
                GROUP BY p.id, p."likesCount"
                HAVING p."likesCount" != COUNT(l.id)
            `;

            if (postsWithIncorrectLikes.length > 0) {
                this.addWarning(`Found ${postsWithIncorrectLikes.length} posts with incorrect like counts`);
            }

            // Check posts with incorrect comment counts
            const postsWithIncorrectComments = await prisma.$queryRaw`
                SELECT p.id, p."commentsCount", COUNT(c.id)::int as actual_comments
                FROM "Post" p
                LEFT JOIN "Comment" c ON c."postId" = p.id
                GROUP BY p.id, p."commentsCount"
                HAVING p."commentsCount" != COUNT(c.id)
            `;

            if (postsWithIncorrectComments.length > 0) {
                this.addWarning(`Found ${postsWithIncorrectComments.length} posts with incorrect comment counts`);
            }

            // Check users with incorrect follower counts
            const usersWithIncorrectFollowers = await prisma.$queryRaw`
                SELECT u.id, u.username, u."followersCount", COUNT(f.id)::int as actual_followers
                FROM "User" u
                LEFT JOIN "Follow" f ON f."followingId" = u.id
                GROUP BY u.id, u.username, u."followersCount"
                HAVING u."followersCount" != COUNT(f.id)
            `;

            if (usersWithIncorrectFollowers.length > 0) {
                this.addWarning(`Found ${usersWithIncorrectFollowers.length} users with incorrect follower counts`);
            }

            // Check users with incorrect following counts
            const usersWithIncorrectFollowing = await prisma.$queryRaw`
                SELECT u.id, u.username, u."followingCount", COUNT(f.id)::int as actual_following
                FROM "User" u
                LEFT JOIN "Follow" f ON f."followerId" = u.id
                GROUP BY u.id, u.username, u."followingCount"
                HAVING u."followingCount" != COUNT(f.id)
            `;

            if (usersWithIncorrectFollowing.length > 0) {
                this.addWarning(`Found ${usersWithIncorrectFollowing.length} users with incorrect following counts`);
            }

            const totalCounterIssues = postsWithIncorrectLikes.length +
                                     postsWithIncorrectComments.length +
                                     usersWithIncorrectFollowers.length +
                                     usersWithIncorrectFollowing.length;

            if (totalCounterIssues === 0) {
                this.log('Counter integrity check passed', 'success');
                return true;
            } else {
                this.addWarning(`Found ${totalCounterIssues} counter integrity issues (can be fixed)`);
                return false;
            }

        } catch (error) {
            this.addError(`Failed to check counter integrity: ${error.message}`);
            return false;
        }
    }

    async checkDatabaseStats() {
        this.log('Gathering database statistics...', 'check');

        try {
            this.stats.users = await prisma.user.count();
            this.stats.posts = await prisma.post.count();
            this.stats.comments = await prisma.comment.count();
            this.stats.likes = await prisma.like.count();
            this.stats.photos = await prisma.photo.count();
            this.stats.userActivities = await prisma.userActivity.count();
            this.stats.candidates = await prisma.candidate.count();
            this.stats.notifications = await prisma.notification.count();
            this.stats.follows = await prisma.follow.count();

            // Check for suspiciously low counts
            if (this.stats.users < 1) {
                this.addError('No users found in database!');
            } else if (this.stats.users < 3) {
                this.addWarning(`Very low user count: ${this.stats.users}`);
            }

            this.log('📊 Current Database Statistics:', 'success');
            Object.entries(this.stats).forEach(([table, count]) => {
                this.log(`   ${table}: ${count} records`);
            });

            return true;

        } catch (error) {
            this.addError(`Failed to gather database stats: ${error.message}`);
            return false;
        }
    }

    async checkDuplicateData() {
        this.log('Checking for duplicate data...', 'check');

        try {
            // Check for duplicate usernames
            const duplicateUsernames = await prisma.$queryRaw`
                SELECT username, COUNT(*) as count
                FROM "User"
                GROUP BY username
                HAVING COUNT(*) > 1
            `;

            if (duplicateUsernames.length > 0) {
                this.addError(`Found ${duplicateUsernames.length} duplicate usernames`);
            }

            // Check for duplicate emails
            const duplicateEmails = await prisma.$queryRaw`
                SELECT email, COUNT(*) as count
                FROM "User"
                GROUP BY email
                HAVING COUNT(*) > 1
            `;

            if (duplicateEmails.length > 0) {
                this.addError(`Found ${duplicateEmails.length} duplicate emails`);
            }

            // Check for duplicate likes (same user liking same post multiple times)
            const duplicateLikes = await prisma.$queryRaw`
                SELECT "userId", "postId", COUNT(*) as count
                FROM "Like"
                GROUP BY "userId", "postId"
                HAVING COUNT(*) > 1
            `;

            if (duplicateLikes.length > 0) {
                this.addError(`Found ${duplicateLikes.length} duplicate likes`);
            }

            if (duplicateUsernames.length === 0 && duplicateEmails.length === 0 && duplicateLikes.length === 0) {
                this.log('Duplicate data check passed', 'success');
                return true;
            } else {
                return false;
            }

        } catch (error) {
            this.addError(`Failed to check for duplicates: ${error.message}`);
            return false;
        }
    }

    async fixCounterIntegrity() {
        this.log('Fixing counter integrity issues...', 'check');

        try {
            // Fix post like counts
            await prisma.$executeRaw`
                UPDATE "Post"
                SET "likesCount" = subquery.actual_likes
                FROM (
                    SELECT p.id, COUNT(l.id) as actual_likes
                    FROM "Post" p
                    LEFT JOIN "Like" l ON l."postId" = p.id
                    GROUP BY p.id
                ) subquery
                WHERE "Post".id = subquery.id
                AND "Post"."likesCount" != subquery.actual_likes
            `;

            // Fix post comment counts
            await prisma.$executeRaw`
                UPDATE "Post"
                SET "commentsCount" = subquery.actual_comments
                FROM (
                    SELECT p.id, COUNT(c.id) as actual_comments
                    FROM "Post" p
                    LEFT JOIN "Comment" c ON c."postId" = p.id
                    GROUP BY p.id
                ) subquery
                WHERE "Post".id = subquery.id
                AND "Post"."commentsCount" != subquery.actual_comments
            `;

            // Fix user follower counts
            await prisma.$executeRaw`
                UPDATE "User"
                SET "followersCount" = subquery.actual_followers
                FROM (
                    SELECT u.id, COUNT(f.id) as actual_followers
                    FROM "User" u
                    LEFT JOIN "Follow" f ON f."followingId" = u.id
                    GROUP BY u.id
                ) subquery
                WHERE "User".id = subquery.id
                AND "User"."followersCount" != subquery.actual_followers
            `;

            // Fix user following counts
            await prisma.$executeRaw`
                UPDATE "User"
                SET "followingCount" = subquery.actual_following
                FROM (
                    SELECT u.id, COUNT(f.id) as actual_following
                    FROM "User" u
                    LEFT JOIN "Follow" f ON f."followerId" = u.id
                    GROUP BY u.id
                ) subquery
                WHERE "User".id = subquery.id
                AND "User"."followingCount" != subquery.actual_following
            `;

            this.log('Counter integrity issues fixed', 'success');
            return true;

        } catch (error) {
            this.addError(`Failed to fix counter integrity: ${error.message}`);
            return false;
        }
    }

    async run(fixIssues = false) {
        try {
            this.log('🚀 Starting Database Integrity Verification');

            const results = {
                adminUsers: await this.checkAdminUsers(),
                foreignKeys: await this.checkForeignKeyIntegrity(),
                testUsers: await this.checkTestUserRemoval(),
                counters: await this.checkCounterIntegrity(),
                stats: await this.checkDatabaseStats(),
                duplicates: await this.checkDuplicateData()
            };

            // Fix counter issues if requested and if they exist
            if (fixIssues && !results.counters) {
                this.log('Attempting to fix counter integrity issues...', 'check');
                await this.fixCounterIntegrity();
                results.counters = await this.checkCounterIntegrity();
            }

            // Summary
            this.log('📋 Verification Summary:');
            const passed = Object.values(results).filter(Boolean).length;
            const total = Object.keys(results).length;

            this.log(`   Checks passed: ${passed}/${total}`);
            this.log(`   Errors found: ${this.errors.length}`);
            this.log(`   Warnings found: ${this.warnings.length}`);

            if (this.errors.length === 0 && this.warnings.length === 0) {
                this.log('✨ Database integrity verification passed!', 'success');
                return { success: true, stats: this.stats };
            } else if (this.errors.length === 0) {
                this.log('⚠️ Database integrity verification passed with warnings', 'warn');
                return { success: true, warnings: this.warnings, stats: this.stats };
            } else {
                this.log('❌ Database integrity verification failed', 'error');
                return { success: false, errors: this.errors, warnings: this.warnings, stats: this.stats };
            }

        } catch (error) {
            this.log(`Fatal error during verification: ${error.message}`, 'error');
            return { success: false, errors: [error.message] };
        }
    }
}

// CLI functionality
if (require.main === module) {
    const args = process.argv.slice(2);
    const fixIssues = args.includes('--fix');

    async function main() {
        const verifier = new DatabaseIntegrityVerifier();

        try {
            const result = await verifier.run(fixIssues);

            if (!result.success) {
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        } finally {
            await prisma.$disconnect();
        }
    }

    // Show help
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Database Integrity Verification Script');
        console.log('');
        console.log('Usage:');
        console.log('  node verify-integrity.js        # Run verification only');
        console.log('  node verify-integrity.js --fix  # Run verification and fix counter issues');
        console.log('');
        console.log('Options:');
        console.log('  --fix         Automatically fix counter integrity issues');
        console.log('  --help, -h    Show this help message');
        process.exit(0);
    }

    main();
}

module.exports = { DatabaseIntegrityVerifier };