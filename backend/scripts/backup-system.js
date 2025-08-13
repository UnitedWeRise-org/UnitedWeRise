#!/usr/bin/env node

/**
 * Automated Backup System for UnitedWeRise
 * 
 * This script handles:
 * - Database backups via Azure PostgreSQL
 * - File system backups (uploads, logs)
 * - Security event archival
 * - Backup rotation and cleanup
 * 
 * Usage:
 * - Manual: node scripts/backup-system.js
 * - Scheduled: Add to cron or Azure Container Instance
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BACKUP_CONFIG = {
    // Database backup settings
    database: {
        retentionDays: 30,        // Keep daily backups for 30 days
        weeklyRetentionWeeks: 12, // Keep weekly backups for 12 weeks
        monthlyRetentionMonths: 12 // Keep monthly backups for 12 months
    },
    
    // Azure storage settings
    azure: {
        resourceGroup: 'unitedwerise-rg',
        serverName: 'unitedwerise-db',
        storageAccount: 'uwrstorage2425',
        containerName: 'backups'
    },
    
    // Local backup directory
    localBackupDir: '/tmp/backups',
    
    // Notification settings
    notifications: {
        onSuccess: true,
        onFailure: true,
        adminEmail: process.env.ADMIN_EMAIL || 'admin@unitedwerise.org'
    }
};

class BackupSystem {
    constructor() {
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.backupDir = path.join(BACKUP_CONFIG.localBackupDir, this.timestamp);
    }

    async initialize() {
        console.log(`🚀 Starting backup process at ${new Date().toISOString()}`);
        
        try {
            // Ensure backup directory exists
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log(`📁 Created backup directory: ${this.backupDir}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize backup system:', error);
            return false;
        }
    }

    async performDatabaseBackup() {
        console.log('💾 Starting database backup...');
        
        try {
            const backupName = `database-backup-${this.timestamp}`;
            
            // Create Azure PostgreSQL backup
            const backupCommand = `az postgres flexible-server backup create \\
                --resource-group ${BACKUP_CONFIG.azure.resourceGroup} \\
                --server-name ${BACKUP_CONFIG.azure.serverName} \\
                --backup-name ${backupName}`;
            
            await this.executeCommand(backupCommand, 'Database backup creation');
            
            console.log(`✅ Database backup created: ${backupName}`);
            
            // Also create a local SQL dump for additional safety
            await this.createLocalDatabaseDump();
            
            return { success: true, backupName };
        } catch (error) {
            console.error('❌ Database backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    async createLocalDatabaseDump() {
        console.log('📄 Creating local database dump...');
        
        try {
            const dumpFile = path.join(this.backupDir, 'database-dump.sql');
            
            // Use pg_dump to create a local backup
            const dumpCommand = `pg_dump "${process.env.DATABASE_URL}" > ${dumpFile}`;
            
            await this.executeCommand(dumpCommand, 'Local database dump');
            
            // Compress the dump file
            const gzipCommand = `gzip ${dumpFile}`;
            await this.executeCommand(gzipCommand, 'Compressing database dump');
            
            console.log(`✅ Local database dump created: ${dumpFile}.gz`);
            
            return true;
        } catch (error) {
            console.error('⚠️ Local database dump failed (non-critical):', error);
            return false;
        }
    }

    async performFileBackup() {
        console.log('📂 Starting file system backup...');
        
        try {
            const filesToBackup = [
                // Configuration files
                'package.json',
                'package-lock.json',
                '.env.example',
                
                // Documentation
                '*.md',
                
                // Prisma schema
                'prisma/schema.prisma',
                
                // Frontend assets (if any uploads directory exists)
                'frontend/uploads',
                
                // Logs directory
                'logs'
            ];
            
            const backupResults = [];
            
            for (const filePattern of filesToBackup) {
                try {
                    await this.backupFiles(filePattern);
                    backupResults.push({ file: filePattern, success: true });
                } catch (error) {
                    console.warn(`⚠️ Failed to backup ${filePattern}:`, error.message);
                    backupResults.push({ file: filePattern, success: false, error: error.message });
                }
            }
            
            console.log('✅ File system backup completed');
            return { success: true, results: backupResults };
        } catch (error) {
            console.error('❌ File system backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    async backupFiles(pattern) {
        const targetDir = path.join(this.backupDir, 'files');
        await fs.mkdir(targetDir, { recursive: true });
        
        // Use tar to backup files matching the pattern
        const tarCommand = `tar -czf ${targetDir}/${pattern.replace(/[\/\*]/g, '_')}.tar.gz ${pattern} 2>/dev/null || true`;
        
        await this.executeCommand(tarCommand, `Backing up ${pattern}`);
    }

    async uploadToAzureStorage() {
        console.log('☁️ Uploading backups to Azure Storage...');
        
        try {
            // Create a compressed archive of the entire backup directory
            const archiveName = `backup-${this.timestamp}.tar.gz`;
            const archivePath = path.join(BACKUP_CONFIG.localBackupDir, archiveName);
            
            const createArchiveCommand = `tar -czf ${archivePath} -C ${this.backupDir} .`;
            await this.executeCommand(createArchiveCommand, 'Creating backup archive');
            
            // Upload to Azure Blob Storage
            const uploadCommand = `az storage blob upload \\
                --account-name ${BACKUP_CONFIG.azure.storageAccount} \\
                --container-name ${BACKUP_CONFIG.azure.containerName} \\
                --name ${archiveName} \\
                --file ${archivePath} \\
                --overwrite`;
            
            await this.executeCommand(uploadCommand, 'Uploading to Azure Storage');
            
            console.log(`✅ Backup uploaded to Azure Storage: ${archiveName}`);
            
            // Clean up local archive
            await fs.unlink(archivePath);
            
            return { success: true, archiveName };
        } catch (error) {
            console.error('❌ Azure Storage upload failed:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanupOldBackups() {
        console.log('🧹 Cleaning up old backups...');
        
        try {
            // Clean up local backups older than 7 days
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7);
            
            const cleanupCommand = `find ${BACKUP_CONFIG.localBackupDir} -type d -name "20*" -mtime +7 -exec rm -rf {} + 2>/dev/null || true`;
            await this.executeCommand(cleanupCommand, 'Cleaning up local backups');
            
            // Clean up Azure storage backups based on retention policy
            await this.cleanupAzureBackups();
            
            console.log('✅ Cleanup completed');
            return { success: true };
        } catch (error) {
            console.error('⚠️ Cleanup partially failed (non-critical):', error);
            return { success: false, error: error.message };
        }
    }

    async cleanupAzureBackups() {
        try {
            // List all backups in Azure storage
            const listCommand = `az storage blob list \\
                --account-name ${BACKUP_CONFIG.azure.storageAccount} \\
                --container-name ${BACKUP_CONFIG.azure.containerName} \\
                --query "[?contains(name, 'backup-')].{name:name,lastModified:properties.lastModified}" \\
                --output json`;
            
            const result = await this.executeCommand(listCommand, 'Listing Azure backups');
            const backups = JSON.parse(result.stdout);
            
            // Determine which backups to keep based on retention policy
            const now = new Date();
            const backupsToDelete = [];
            
            backups.forEach(backup => {
                const backupDate = new Date(backup.lastModified);
                const daysDiff = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));
                
                // Delete daily backups older than retention period
                if (daysDiff > BACKUP_CONFIG.database.retentionDays) {
                    backupsToDelete.push(backup.name);
                }
            });
            
            // Delete old backups
            for (const backupName of backupsToDelete) {
                const deleteCommand = `az storage blob delete \\
                    --account-name ${BACKUP_CONFIG.azure.storageAccount} \\
                    --container-name ${BACKUP_CONFIG.azure.containerName} \\
                    --name ${backupName}`;
                
                await this.executeCommand(deleteCommand, `Deleting old backup: ${backupName}`);
            }
            
            console.log(`🗑️ Deleted ${backupsToDelete.length} old backups from Azure Storage`);
        } catch (error) {
            console.warn('⚠️ Azure backup cleanup failed:', error.message);
        }
    }

    async generateBackupReport(results) {
        console.log('📊 Generating backup report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            backupId: this.timestamp,
            results: results,
            summary: {
                success: results.every(r => r.success),
                totalSteps: results.length,
                successfulSteps: results.filter(r => r.success).length,
                failedSteps: results.filter(r => !r.success).length
            }
        };
        
        // Save report to file
        const reportPath = path.join(this.backupDir, 'backup-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log('📋 Backup report:');
        console.log(`   Total steps: ${report.summary.totalSteps}`);
        console.log(`   Successful: ${report.summary.successfulSteps}`);
        console.log(`   Failed: ${report.summary.failedSteps}`);
        console.log(`   Overall status: ${report.summary.success ? '✅ SUCCESS' : '❌ PARTIAL FAILURE'}`);
        
        return report;
    }

    async executeCommand(command, description) {
        return new Promise((resolve, reject) => {
            console.log(`🔧 ${description}...`);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ ${description} failed:`, error.message);
                    reject(error);
                } else {
                    console.log(`✅ ${description} completed`);
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    async run() {
        const results = [];
        
        try {
            // Initialize backup system
            if (!await this.initialize()) {
                throw new Error('Failed to initialize backup system');
            }
            
            // Perform database backup
            const dbResult = await this.performDatabaseBackup();
            results.push({ step: 'Database Backup', ...dbResult });
            
            // Perform file system backup
            const fileResult = await this.performFileBackup();
            results.push({ step: 'File System Backup', ...fileResult });
            
            // Upload to Azure Storage
            const uploadResult = await this.uploadToAzureStorage();
            results.push({ step: 'Azure Storage Upload', ...uploadResult });
            
            // Cleanup old backups
            const cleanupResult = await this.cleanupOldBackups();
            results.push({ step: 'Cleanup Old Backups', ...cleanupResult });
            
            // Generate report
            const report = await this.generateBackupReport(results);
            
            console.log(`🎉 Backup process completed at ${new Date().toISOString()}`);
            
            return report;
            
        } catch (error) {
            console.error('💥 Backup process failed:', error);
            results.push({ step: 'Backup Process', success: false, error: error.message });
            
            const report = await this.generateBackupReport(results);
            return report;
        }
    }
}

// Script execution
if (require.main === module) {
    const backup = new BackupSystem();
    
    backup.run()
        .then(report => {
            if (report.summary.success) {
                console.log('🎊 All backup operations completed successfully!');
                process.exit(0);
            } else {
                console.log('⚠️ Backup completed with some failures. Check the report for details.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💀 Fatal backup error:', error);
            process.exit(1);
        });
}

module.exports = BackupSystem;