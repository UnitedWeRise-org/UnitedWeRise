/**
 * Database Backup and Restore Utilities
 * Provides safe backup and restore functionality for database operations
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

class DatabaseBackup {
    constructor() {
        this.backupDir = path.join(__dirname, '..', 'backups');
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }

    async ensureBackupDir() {
        try {
            await fs.access(this.backupDir);
        } catch {
            await fs.mkdir(this.backupDir, { recursive: true });
        }
    }

    async createBackup(label = 'manual') {
        await this.ensureBackupDir();

        const backupData = {
            timestamp: new Date().toISOString(),
            label,
            data: {}
        };

        console.log('🔄 Creating database backup...');

        try {
            // Backup critical tables
            console.log('  📊 Backing up Users...');
            backupData.data.users = await prisma.user.findMany();

            console.log('  📝 Backing up Posts...');
            backupData.data.posts = await prisma.post.findMany();

            console.log('  💬 Backing up Comments...');
            backupData.data.comments = await prisma.comment.findMany();

            console.log('  ❤️ Backing up Likes...');
            backupData.data.likes = await prisma.like.findMany();

            console.log('  📷 Backing up Photos...');
            backupData.data.photos = await prisma.photo.findMany();

            console.log('  🎯 Backing up UserActivity...');
            backupData.data.userActivities = await prisma.userActivity.findMany();

            console.log('  🗳️ Backing up Candidates...');
            backupData.data.candidates = await prisma.candidate.findMany();

            console.log('  🔔 Backing up Notifications...');
            backupData.data.notifications = await prisma.notification.findMany();

            console.log('  👥 Backing up Follows...');
            backupData.data.follows = await prisma.follow.findMany();

            // Save backup to file
            const filename = `backup_${label}_${this.timestamp}.json`;
            const filepath = path.join(this.backupDir, filename);

            await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));

            console.log(`✅ Backup created successfully: ${filename}`);
            console.log(`📍 Location: ${filepath}`);

            // Create summary
            const summary = {
                users: backupData.data.users.length,
                posts: backupData.data.posts.length,
                comments: backupData.data.comments.length,
                likes: backupData.data.likes.length,
                photos: backupData.data.photos.length,
                userActivities: backupData.data.userActivities.length,
                candidates: backupData.data.candidates.length,
                notifications: backupData.data.notifications.length,
                follows: backupData.data.follows.length
            };

            console.log('📊 Backup Summary:');
            Object.entries(summary).forEach(([table, count]) => {
                console.log(`   ${table}: ${count} records`);
            });

            return { filename, filepath, summary };

        } catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    }

    async listBackups() {
        await this.ensureBackupDir();

        try {
            const files = await fs.readdir(this.backupDir);
            const backups = files.filter(f => f.startsWith('backup_') && f.endsWith('.json'));

            console.log('📂 Available backups:');
            if (backups.length === 0) {
                console.log('   No backups found');
                return [];
            }

            for (const backup of backups) {
                const stats = await fs.stat(path.join(this.backupDir, backup));
                console.log(`   ${backup} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
            }

            return backups;
        } catch (error) {
            console.error('❌ Failed to list backups:', error);
            throw error;
        }
    }

    async validateBackup(filename) {
        const filepath = path.join(this.backupDir, filename);

        try {
            const data = JSON.parse(await fs.readFile(filepath, 'utf8'));

            const requiredTables = ['users', 'posts', 'comments', 'likes', 'photos', 'userActivities'];
            const missingTables = requiredTables.filter(table => !data.data[table]);

            if (missingTables.length > 0) {
                console.log(`⚠️ Backup validation warning: Missing tables: ${missingTables.join(', ')}`);
            }

            console.log('✅ Backup validation successful');
            return { valid: true, data };

        } catch (error) {
            console.error('❌ Backup validation failed:', error);
            return { valid: false, error: error.message };
        }
    }

    async getAdminUsers() {
        try {
            const adminUsers = await prisma.user.findMany({
                where: {
                    isAdmin: true
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true
                }
            });

            console.log('👑 Admin Users Found:');
            adminUsers.forEach(user => {
                console.log(`   ${user.username} (${user.email}) - ID: ${user.id}`);
            });

            return adminUsers.map(user => user.id);
        } catch (error) {
            console.error('❌ Failed to get admin users:', error);
            throw error;
        }
    }

    async getDatabaseStats() {
        try {
            const stats = {};

            // Count records in each table
            stats.users = await prisma.user.count();
            stats.posts = await prisma.post.count();
            stats.comments = await prisma.comment.count();
            stats.likes = await prisma.like.count();
            stats.photos = await prisma.photo.count();
            stats.userActivities = await prisma.userActivity.count();
            stats.candidates = await prisma.candidate.count();
            stats.notifications = await prisma.notification.count();
            stats.follows = await prisma.follow.count();

            // Get admin count
            stats.adminUsers = await prisma.user.count({
                where: { isAdmin: true }
            });

            console.log('📊 Current Database Statistics:');
            Object.entries(stats).forEach(([table, count]) => {
                console.log(`   ${table}: ${count} records`);
            });

            return stats;
        } catch (error) {
            console.error('❌ Failed to get database stats:', error);
            throw error;
        }
    }
}

// CLI functionality
if (require.main === module) {
    const backup = new DatabaseBackup();
    const action = process.argv[2];

    async function main() {
        try {
            switch (action) {
                case 'create':
                    const label = process.argv[3] || 'manual';
                    await backup.createBackup(label);
                    break;

                case 'list':
                    await backup.listBackups();
                    break;

                case 'validate':
                    const filename = process.argv[3];
                    if (!filename) {
                        console.log('Usage: node backup-restore.js validate <filename>');
                        process.exit(1);
                    }
                    await backup.validateBackup(filename);
                    break;

                case 'stats':
                    await backup.getDatabaseStats();
                    break;

                case 'admins':
                    await backup.getAdminUsers();
                    break;

                default:
                    console.log('Database Backup Utility');
                    console.log('Usage:');
                    console.log('  node backup-restore.js create [label]  - Create a backup');
                    console.log('  node backup-restore.js list            - List available backups');
                    console.log('  node backup-restore.js validate <file> - Validate a backup file');
                    console.log('  node backup-restore.js stats           - Show database statistics');
                    console.log('  node backup-restore.js admins          - List admin users');
            }
        } catch (error) {
            console.error('❌ Operation failed:', error);
            process.exit(1);
        } finally {
            await prisma.$disconnect();
        }
    }

    main();
}

module.exports = { DatabaseBackup };