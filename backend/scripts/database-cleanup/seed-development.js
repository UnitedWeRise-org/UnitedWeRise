/**
 * Development Environment Seeding Script
 * Injects realistic test data for development and testing
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// Load test data templates
const testUsersPath = path.join(__dirname, '..', 'data', 'test-users.json');
const politicalContentPath = path.join(__dirname, '..', 'data', 'political-content.json');
const civicDataPath = path.join(__dirname, '..', 'data', 'civic-data.json');

class DevelopmentSeeder {
    constructor() {
        this.testUsers = null;
        this.politicalContent = null;
        this.civicData = null;
        this.createdUsers = [];
        this.createdPosts = [];
        this.createdElections = [];
        this.createdOffices = [];
        this.stats = {
            usersCreated: 0,
            postsCreated: 0,
            commentsCreated: 0,
            likesCreated: 0,
            followsCreated: 0,
            activitiesCreated: 0,
            electionsCreated: 0,
            officesCreated: 0,
            candidatesCreated: 0
        };
    }

    log(message, level = 'info') {
        const emoji = {
            info: '🔍',
            success: '✅',
            error: '❌',
            warn: '⚠️',
            action: '🔧'
        }[level] || '📝';

        console.log(`${emoji} ${message}`);
    }

    async loadTestData() {
        this.log('Loading test data templates...');

        try {
            this.testUsers = JSON.parse(await fs.readFile(testUsersPath, 'utf8'));
            this.politicalContent = JSON.parse(await fs.readFile(politicalContentPath, 'utf8'));
            this.civicData = JSON.parse(await fs.readFile(civicDataPath, 'utf8'));

            this.log(`Loaded ${this.testUsers.testUsers.length} user templates`);
            this.log(`Loaded ${Object.keys(this.politicalContent.posts).length} content categories`);
            this.log(`Loaded ${this.civicData.elections.length} election templates`);

            return true;
        } catch (error) {
            this.log(`Failed to load test data: ${error.message}`, 'error');
            return false;
        }
    }

    async checkEnvironment() {
        this.log('Checking deployment environment...');

        // In a real implementation, we'd check NODE_ENV
        // For now, we'll just warn about the shared database
        this.log('⚠️ WARNING: This will add test data to the database', 'warn');
        this.log('   Make sure you are targeting the correct environment', 'warn');

        return true;
    }

    async createTestUsers() {
        this.log('Creating test users...', 'action');

        try {
            // Using placeholder password for development - admin should reset
            const defaultPassword = 'DevTest2024!';

            for (const userTemplate of this.testUsers.testUsers) {
                try {
                    // Check if user already exists
                    const existingUser = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: userTemplate.email },
                                { username: userTemplate.username }
                            ]
                        }
                    });

                    if (existingUser) {
                        this.log(`User ${userTemplate.username} already exists, skipping...`);
                        this.createdUsers.push(existingUser);
                        continue;
                    }

                    const user = await prisma.user.create({
                        data: {
                            username: userTemplate.username,
                            email: userTemplate.email,
                            password: defaultPassword,
                            firstName: userTemplate.firstName,
                            lastName: userTemplate.lastName,
                            bio: userTemplate.bio,
                            location: userTemplate.location,
                            politicalProfileType: userTemplate.politicalProfileType,
                            verificationStatus: userTemplate.verificationStatus,
                            politicalParty: userTemplate.politicalParty,
                            interests: userTemplate.interests,
                            reputationScore: userTemplate.reputationScore,
                            office: userTemplate.office,
                            officialTitle: userTemplate.officialTitle,
                            campaignWebsite: userTemplate.campaignWebsite,
                            termStart: userTemplate.termStart ? new Date(userTemplate.termStart) : null,
                            termEnd: userTemplate.termEnd ? new Date(userTemplate.termEnd) : null,
                            emailVerified: true,
                            onboardingCompleted: true
                        }
                    });

                    this.createdUsers.push(user);
                    this.stats.usersCreated++;

                    this.log(`Created user: ${user.username} (${user.politicalProfileType})`);

                } catch (error) {
                    this.log(`Failed to create user ${userTemplate.username}: ${error.message}`, 'error');
                }
            }

            this.log(`Successfully created ${this.stats.usersCreated} users`, 'success');
            return true;

        } catch (error) {
            this.log(`Failed to create test users: ${error.message}`, 'error');
            return false;
        }
    }

    async createCivicData() {
        this.log('Creating elections and offices...', 'action');

        try {
            // Create elections
            for (const electionTemplate of this.civicData.elections) {
                try {
                    const existingElection = await prisma.election.findFirst({
                        where: {
                            name: electionTemplate.name,
                            date: new Date(electionTemplate.date)
                        }
                    });

                    if (!existingElection) {
                        const election = await prisma.election.create({
                            data: {
                                name: electionTemplate.name,
                                type: electionTemplate.type,
                                level: electionTemplate.level,
                                date: new Date(electionTemplate.date),
                                state: electionTemplate.state === 'ALL' ? null : electionTemplate.state,
                                description: electionTemplate.description
                            }
                        });

                        this.createdElections.push(election);
                        this.stats.electionsCreated++;
                        this.log(`Created election: ${election.name}`);
                    }
                } catch (error) {
                    this.log(`Failed to create election ${electionTemplate.name}: ${error.message}`, 'error');
                }
            }

            // Create offices
            for (const officeTemplate of this.civicData.offices) {
                try {
                    const existingOffice = await prisma.office.findFirst({
                        where: {
                            title: officeTemplate.title,
                            state: officeTemplate.state,
                            jurisdiction: officeTemplate.jurisdiction
                        }
                    });

                    if (!existingOffice) {
                        const office = await prisma.office.create({
                            data: {
                                title: officeTemplate.title,
                                level: officeTemplate.level,
                                state: officeTemplate.state,
                                jurisdiction: officeTemplate.jurisdiction,
                                district: officeTemplate.district,
                                termLength: officeTemplate.termLength,
                                description: officeTemplate.description
                            }
                        });

                        this.createdOffices.push(office);
                        this.stats.officesCreated++;
                        this.log(`Created office: ${office.title}`);
                    }
                } catch (error) {
                    this.log(`Failed to create office ${officeTemplate.title}: ${error.message}`, 'error');
                }
            }

            this.log(`Created ${this.stats.electionsCreated} elections and ${this.stats.officesCreated} offices`, 'success');
            return true;

        } catch (error) {
            this.log(`Failed to create civic data: ${error.message}`, 'error');
            return false;
        }
    }

    getRandomContent(category) {
        const posts = this.politicalContent.posts[category];
        if (!posts || posts.length === 0) return "Sample political content.";
        return posts[Math.floor(Math.random() * posts.length)];
    }

    getRandomComment() {
        const commentTypes = Object.keys(this.politicalContent.comments);
        const randomType = commentTypes[Math.floor(Math.random() * commentTypes.length)];
        const comments = this.politicalContent.comments[randomType];
        return comments[Math.floor(Math.random() * comments.length)];
    }

    async createPosts() {
        this.log('Creating diverse political posts...', 'action');

        try {
            const contentCategories = Object.keys(this.politicalContent.posts);
            const postsPerUser = 3; // Average posts per user

            for (const user of this.createdUsers) {
                try {
                    const userPostCount = Math.floor(Math.random() * (postsPerUser * 2 - 1)) + 1;

                    for (let i = 0; i < userPostCount; i++) {
                        // Choose content category based on user interests
                        const userInterests = user.interests || [];
                        let category;

                        if (userInterests.length > 0) {
                            // Try to match user interests to content categories
                            const matchingCategories = contentCategories.filter(cat => {
                                return userInterests.some(interest =>
                                    interest.toLowerCase().includes(cat.toLowerCase()) ||
                                    cat.toLowerCase().includes(interest.toLowerCase())
                                );
                            });

                            if (matchingCategories.length > 0) {
                                category = matchingCategories[Math.floor(Math.random() * matchingCategories.length)];
                            } else {
                                category = contentCategories[Math.floor(Math.random() * contentCategories.length)];
                            }
                        } else {
                            category = contentCategories[Math.floor(Math.random() * contentCategories.length)];
                        }

                        const content = this.getRandomContent(category);
                        const isPolitical = Math.random() > 0.3; // 70% political content

                        // Create post at random time in the past 30 days
                        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

                        const post = await prisma.post.create({
                            data: {
                                content,
                                authorId: user.id,
                                isPolitical,
                                tags: [category],
                                authorReputation: user.reputationScore || 70,
                                createdAt
                            }
                        });

                        this.createdPosts.push(post);
                        this.stats.postsCreated++;

                        // Track post creation activity
                        await prisma.userActivity.create({
                            data: {
                                userId: user.id,
                                activityType: 'POST_CREATED',
                                targetType: 'post',
                                targetId: post.id,
                                metadata: {
                                    content: content.substring(0, 100),
                                    contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
                                },
                                createdAt
                            }
                        });
                        this.stats.activitiesCreated++;
                    }

                    this.log(`Created ${userPostCount} posts for ${user.username}`);

                } catch (error) {
                    this.log(`Failed to create posts for user ${user.username}: ${error.message}`, 'error');
                }
            }

            this.log(`Successfully created ${this.stats.postsCreated} posts`, 'success');
            return true;

        } catch (error) {
            this.log(`Failed to create posts: ${error.message}`, 'error');
            return false;
        }
    }

    async createEngagement() {
        this.log('Creating comments and likes...', 'action');

        try {
            // Create comments
            for (const post of this.createdPosts) {
                try {
                    // Random number of comments per post (some posts get more engagement)
                    const commentCount = Math.random() > 0.5 ?
                        Math.floor(Math.random() * 3) : // 0-2 comments
                        Math.floor(Math.random() * 6) + 3; // 3-8 comments

                    for (let i = 0; i < commentCount; i++) {
                        // Pick random user to comment (not the post author)
                        const availableUsers = this.createdUsers.filter(u => u.id !== post.authorId);
                        if (availableUsers.length === 0) continue;

                        const commenter = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                        const commentContent = this.getRandomComment();

                        // Create comment at random time after post creation
                        const commentTime = new Date(
                            post.createdAt.getTime() +
                            Math.random() * (Date.now() - post.createdAt.getTime())
                        );

                        const comment = await prisma.comment.create({
                            data: {
                                content: commentContent,
                                userId: commenter.id,
                                postId: post.id,
                                createdAt: commentTime
                            }
                        });

                        // Update post comment count
                        await prisma.post.update({
                            where: { id: post.id },
                            data: { commentsCount: { increment: 1 } }
                        });

                        // Track comment activity
                        await prisma.userActivity.create({
                            data: {
                                userId: commenter.id,
                                activityType: 'COMMENT_CREATED',
                                targetType: 'comment',
                                targetId: comment.id,
                                metadata: {
                                    content: commentContent,
                                    contentPreview: commentContent.substring(0, 100) + (commentContent.length > 100 ? '...' : ''),
                                    postId: post.id,
                                    postTitle: post.content.substring(0, 100)
                                },
                                createdAt: commentTime
                            }
                        });

                        this.stats.commentsCreated++;
                        this.stats.activitiesCreated++;
                    }
                } catch (error) {
                    this.log(`Failed to create comments for post ${post.id}: ${error.message}`, 'error');
                }
            }

            // Create likes
            for (const post of this.createdPosts) {
                try {
                    // Use engagement ratios from political content data
                    const likeRatio = this.politicalContent.engagement_patterns.like_ratios[post.tags[0]] || 0.15;
                    const shouldHaveLikes = Math.random() < likeRatio;

                    if (shouldHaveLikes) {
                        const likeCount = Math.floor(Math.random() * Math.max(1, Math.floor(this.createdUsers.length * 0.3))) + 1;
                        const availableUsers = this.createdUsers.filter(u => u.id !== post.authorId);

                        // Randomly select users to like the post
                        const shuffled = [...availableUsers].sort(() => 0.5 - Math.random());
                        const usersToLike = shuffled.slice(0, Math.min(likeCount, availableUsers.length));

                        for (const user of usersToLike) {
                            try {
                                // Create like at random time after post creation
                                const likeTime = new Date(
                                    post.createdAt.getTime() +
                                    Math.random() * (Date.now() - post.createdAt.getTime())
                                );

                                await prisma.like.create({
                                    data: {
                                        userId: user.id,
                                        postId: post.id,
                                        createdAt: likeTime
                                    }
                                });

                                // Track like activity
                                await prisma.userActivity.create({
                                    data: {
                                        userId: user.id,
                                        activityType: 'LIKE_ADDED',
                                        targetType: 'post',
                                        targetId: post.id,
                                        metadata: {
                                            postTitle: post.content.substring(0, 100)
                                        },
                                        createdAt: likeTime
                                    }
                                });

                                this.stats.likesCreated++;
                                this.stats.activitiesCreated++;

                            } catch (error) {
                                // Ignore duplicate likes
                                if (!error.message.includes('unique constraint')) {
                                    this.log(`Failed to create like: ${error.message}`, 'error');
                                }
                            }
                        }

                        // Update post like count
                        const actualLikes = await prisma.like.count({
                            where: { postId: post.id }
                        });

                        await prisma.post.update({
                            where: { id: post.id },
                            data: { likesCount: actualLikes }
                        });
                    }
                } catch (error) {
                    this.log(`Failed to create likes for post ${post.id}: ${error.message}`, 'error');
                }
            }

            this.log(`Created ${this.stats.commentsCreated} comments and ${this.stats.likesCreated} likes`, 'success');
            return true;

        } catch (error) {
            this.log(`Failed to create engagement: ${error.message}`, 'error');
            return false;
        }
    }

    async createFollowRelationships() {
        this.log('Creating follow relationships...', 'action');

        try {
            // Create realistic follow patterns
            for (const user of this.createdUsers) {
                try {
                    // Each user follows 3-8 other users
                    const followCount = Math.floor(Math.random() * 6) + 3; // 3-8 follows
                    const availableUsers = this.createdUsers.filter(u => u.id !== user.id);

                    // Prefer following users with similar interests or political alignment
                    const similarUsers = availableUsers.filter(u => {
                        const userInterests = user.interests || [];
                        const otherInterests = u.interests || [];
                        const sharedInterests = userInterests.filter(interest =>
                            otherInterests.includes(interest)
                        );
                        return sharedInterests.length > 0 || u.politicalParty === user.politicalParty;
                    });

                    const usersToFollow = similarUsers.length >= followCount
                        ? similarUsers.sort(() => 0.5 - Math.random()).slice(0, followCount)
                        : [
                            ...similarUsers,
                            ...availableUsers.filter(u => !similarUsers.includes(u))
                                .sort(() => 0.5 - Math.random())
                                .slice(0, Math.min(followCount - similarUsers.length, availableUsers.length - similarUsers.length))
                        ];

                    for (const userToFollow of usersToFollow) {
                        try {
                            // Create follow at random time in the past
                            const followTime = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);

                            await prisma.follow.create({
                                data: {
                                    followerId: user.id,
                                    followingId: userToFollow.id,
                                    createdAt: followTime
                                }
                            });

                            // Track follow activity
                            await prisma.userActivity.create({
                                data: {
                                    userId: user.id,
                                    activityType: 'FOLLOW_ADDED',
                                    targetType: 'user',
                                    targetId: userToFollow.id,
                                    metadata: {
                                        targetUsername: userToFollow.username
                                    },
                                    createdAt: followTime
                                }
                            });

                            this.stats.followsCreated++;
                            this.stats.activitiesCreated++;

                        } catch (error) {
                            // Ignore duplicate follows
                            if (!error.message.includes('unique constraint')) {
                                this.log(`Failed to create follow: ${error.message}`, 'error');
                            }
                        }
                    }
                } catch (error) {
                    this.log(`Failed to create follows for user ${user.username}: ${error.message}`, 'error');
                }
            }

            // Update user follow counts
            for (const user of this.createdUsers) {
                const followingCount = await prisma.follow.count({
                    where: { followerId: user.id }
                });
                const followersCount = await prisma.follow.count({
                    where: { followingId: user.id }
                });

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        followingCount,
                        followersCount
                    }
                });
            }

            this.log(`Created ${this.stats.followsCreated} follow relationships`, 'success');
            return true;

        } catch (error) {
            this.log(`Failed to create follow relationships: ${error.message}`, 'error');
            return false;
        }
    }

    async run() {
        try {
            this.log('🚀 Starting Development Environment Seeding');

            // Load test data templates
            if (!await this.loadTestData()) {
                throw new Error('Failed to load test data templates');
            }

            // Check environment
            if (!await this.checkEnvironment()) {
                throw new Error('Environment check failed');
            }

            // Create test users
            if (!await this.createTestUsers()) {
                throw new Error('Failed to create test users');
            }

            // Create civic data (elections, offices)
            if (!await this.createCivicData()) {
                throw new Error('Failed to create civic data');
            }

            // Create posts
            if (!await this.createPosts()) {
                throw new Error('Failed to create posts');
            }

            // Create engagement (comments, likes)
            if (!await this.createEngagement()) {
                throw new Error('Failed to create engagement');
            }

            // Create follow relationships
            if (!await this.createFollowRelationships()) {
                throw new Error('Failed to create follow relationships');
            }

            // Summary
            this.log('📊 Seeding Summary:', 'success');
            Object.entries(this.stats).forEach(([key, value]) => {
                this.log(`   ${key}: ${value}`);
            });

            this.log('✨ Development environment seeding completed successfully!', 'success');
            return true;

        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'error');
            throw error;
        }
    }
}

// CLI functionality
if (require.main === module) {
    async function main() {
        const seeder = new DevelopmentSeeder();

        try {
            await seeder.run();
        } catch (error) {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        } finally {
            await prisma.$disconnect();
        }
    }

    // Show help
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('Development Environment Seeding Script');
        console.log('');
        console.log('Usage:');
        console.log('  node seed-development.js    # Seed development environment with test data');
        console.log('');
        console.log('Options:');
        console.log('  --help, -h    Show this help message');
        console.log('');
        console.log('This script creates:');
        console.log('  - 20+ diverse test users with different political profiles');
        console.log('  - 100+ realistic political posts across various topics');
        console.log('  - Comments and likes with realistic engagement patterns');
        console.log('  - Follow relationships based on shared interests');
        console.log('  - Complete activity tracking for all interactions');
        console.log('  - Elections, offices, and civic data for testing');
        process.exit(0);
    }

    main();
}

module.exports = { DevelopmentSeeder };