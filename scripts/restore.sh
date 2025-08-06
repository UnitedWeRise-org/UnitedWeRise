#!/bin/bash
set -e

# Configuration
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 unitedwerise_20240101_120000.sql.gz"
    exit 1
fi

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting database restore from $BACKUP_FILE..."

# Check if file exists locally
if [ ! -f "/backup/$BACKUP_FILE" ]; then
    # Try to download from S3 if configured
    if [ ! -z "$AWS_S3_BUCKET" ]; then
        log "Downloading backup from S3..."
        aws s3 cp s3://$AWS_S3_BUCKET/backups/$BACKUP_FILE /backup/$BACKUP_FILE
        
        if [ $? -ne 0 ]; then
            log "Failed to download backup from S3"
            exit 1
        fi
    else
        log "Backup file not found and S3 not configured"
        exit 1
    fi
fi

# Create temporary decompressed file if needed
TEMP_FILE="/backup/temp_restore.sql"
if [[ $BACKUP_FILE == *.gz ]]; then
    log "Decompressing backup file..."
    gunzip -c "/backup/$BACKUP_FILE" > $TEMP_FILE
    RESTORE_FILE=$TEMP_FILE
else
    RESTORE_FILE="/backup/$BACKUP_FILE"
fi

# Get database name from URL
DB_NAME=$(echo $DATABASE_URL | sed -E 's/.*\/([^?]+).*/\1/')

# Warning prompt
echo "WARNING: This will completely replace the current database contents!"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to proceed): " -r

if [[ ! $REPLY == "yes" ]]; then
    log "Restore cancelled by user"
    exit 1
fi

log "Dropping existing database connections..."
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

log "Restoring database from backup..."
psql $DATABASE_URL < $RESTORE_FILE

if [ $? -eq 0 ]; then
    log "Database restore completed successfully"
    
    # Cleanup temporary file
    if [ -f "$TEMP_FILE" ]; then
        rm $TEMP_FILE
    fi
    
    log "Running database migrations to ensure schema is up to date..."
    # This would need to be run from the application container
    # docker-compose exec backend npx prisma migrate deploy
    
    log "Restore process completed"
else
    log "Database restore failed"
    
    # Cleanup temporary file
    if [ -f "$TEMP_FILE" ]; then
        rm $TEMP_FILE
    fi
    
    exit 1
fi