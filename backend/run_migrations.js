const { execSync } = require('child_process');

// Set DATABASE_URL for this process
process.env.DATABASE_URL = 'postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require';

try {
  console.log('Running Prisma migrate deploy...');
  const output = execSync('npx prisma migrate deploy', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
  console.log('✅ Migrations completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
