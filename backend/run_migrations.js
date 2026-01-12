const { execSync } = require('child_process');
require('dotenv').config();

// Validate required environment variable
const databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: Required environment variable not set.');
  console.error('Please set PROD_DATABASE_URL or DATABASE_URL in your environment.');
  process.exit(1);
}

// Set DATABASE_URL for child process
process.env.DATABASE_URL = databaseUrl;

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
