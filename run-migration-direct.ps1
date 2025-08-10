# Direct database migration script
# This connects to the Azure PostgreSQL database and runs migration

cd backend
npx prisma migrate deploy --schema=prisma/schema.prisma