#!/bin/bash
set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backup"
DB_NAME=$(echo $DATABASE_URL | sed -E 's/.*\/([^?]+).*/\1/')
BACKUP_FILE="${BACKUP_DIR}/unitedwerise_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup
log "Starting database backup..."

# Perform database dump
pg_dump $DATABASE_URL > $BACKUP_FILE

if [ $? -eq 0 ]; then
    log "Database dump successful"
    
    # Compress backup
    gzip $BACKUP_FILE
    log "Backup compressed: $COMPRESSED_FILE"
    
    # Upload to S3 if configured
    if [ ! -z "$AWS_S3_BUCKET" ]; then
        log "Uploading to S3..."
        aws s3 cp $COMPRESSED_FILE s3://$AWS_S3_BUCKET/backups/
        
        if [ $? -eq 0 ]; then
            log "S3 upload successful"
            # Remove local compressed file after successful upload
            rm $COMPRESSED_FILE
        else
            log "S3 upload failed"
            exit 1
        fi
    else
        log "S3 not configured, keeping local backup"
    fi
    
    # Create success marker
    touch /backup/last_backup_success
    
    # Cleanup old backups (keep last 30 days locally)
    find $BACKUP_DIR -name "unitedwerise_*.sql.gz" -mtime +${BACKUP_RETENTION_DAYS:-30} -delete
    
    # Cleanup old S3 backups if configured
    if [ ! -z "$AWS_S3_BUCKET" ]; then
        CUTOFF_DATE=$(date -d "${BACKUP_RETENTION_DAYS:-30} days ago" +%Y-%m-%d)
        aws s3 ls s3://$AWS_S3_BUCKET/backups/ | while read -r line; do
            createDate=$(echo $line | awk '{print $1}')
            if [[ $createDate < $CUTOFF_DATE ]]; then
                fileName=$(echo $line | awk '{print $4}')
                aws s3 rm s3://$AWS_S3_BUCKET/backups/$fileName
                log "Deleted old backup: $fileName"
            fi
        done
    fi
    
    log "Backup completed successfully"
    
else
    log "Database dump failed"
    rm -f /backup/last_backup_success
    exit 1
fi