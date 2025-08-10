# Run migration against production database directly

Write-Host "Running Prisma migration against production database..."

# Set environment variable for production database
$env:DATABASE_URL = "postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require"

# Change to backend directory and run migration
cd backend
npx prisma migrate deploy --schema=./prisma/schema.prisma

Write-Host "Migration completed."