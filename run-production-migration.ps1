# Run migration against production database directly
# SECURITY: Database URL must be set from environment variable

Write-Host "Running Prisma migration against production database..."

# Validate required environment variable
if (-not $env:PROD_DATABASE_URL) {
    Write-Host "ERROR: PROD_DATABASE_URL environment variable not set." -ForegroundColor Red
    Write-Host "Please set it before running this script:" -ForegroundColor Yellow
    Write-Host '  $env:PROD_DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"' -ForegroundColor Gray
    exit 1
}

# Set DATABASE_URL from environment variable
$env:DATABASE_URL = $env:PROD_DATABASE_URL

# Change to backend directory and run migration
cd backend
npx prisma migrate deploy --schema=./prisma/schema.prisma

Write-Host "Migration completed."