# Run database migration for United We Rise
Write-Host "Running database migration for United We Rise..." -ForegroundColor Green

# Database connection details
$DB_HOST = "unitedwerise-db.postgres.database.azure.com"
$DB_NAME = "postgres"
$DB_USER = "uwradmin"
$DB_PASSWORD = "UWR-Secure2024!"

# Set database URL for Prisma
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?schema=public&sslmode=require"
$env:DATABASE_URL = $DATABASE_URL

Write-Host "Database URL configured" -ForegroundColor Cyan
Write-Host "Running Prisma migration..." -ForegroundColor Yellow

# Change to backend directory
cd backend

try {
    # Generate Prisma client
    Write-Host "Generating Prisma client..." -ForegroundColor Cyan
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        # Run migration
        Write-Host "Running database migration..." -ForegroundColor Cyan
        npx prisma migrate deploy
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ DATABASE MIGRATION SUCCESSFUL!" -ForegroundColor Green
            Write-Host "✅ Schema deployed to Azure PostgreSQL" -ForegroundColor Green
            
            # Test the connection
            Write-Host "`nTesting database connection..." -ForegroundColor Cyan
            npx prisma db pull --print
            
            Write-Host "`n🚀 Backend is now fully operational!" -ForegroundColor Green
            Write-Host "🔗 Backend URL: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io" -ForegroundColor White
            Write-Host "❤️  Health Check: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" -ForegroundColor White
            
        } else {
            Write-Host "Migration failed!" -ForegroundColor Red
            Write-Host "Checking connection..." -ForegroundColor Yellow
            npx prisma db pull --print
        }
    } else {
        Write-Host "Prisma generate failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

cd ..
Write-Host "`nMigration process complete!" -ForegroundColor Cyan