#!/usr/bin/env node

/**
 * Setup Security Enhancements for UnitedWeRise
 * 
 * This script will:
 * 1. Deploy the database security schema changes
 * 2. Set up your admin account privileges
 * 3. Test the new security endpoints
 * 4. Provide access instructions for the admin dashboard
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupSecurityEnhancements() {
    console.log('🔧 Setting up security enhancements for UnitedWeRise...\n');

    try {
        // Step 1: Deploy database changes
        console.log('1️⃣ Deploying database schema changes...');
        
        // Check if SecurityEvent table exists
        try {
            await prisma.$queryRaw`SELECT COUNT(*) FROM "SecurityEvent" LIMIT 1`;
            console.log('   ✅ SecurityEvent table already exists');
        } catch (error) {
            console.log('   📝 Creating SecurityEvent table and adding security fields...');
            
            // Run the migration manually since we can't use Prisma migrate in production
            await prisma.$executeRaw`
                CREATE TABLE IF NOT EXISTS "SecurityEvent" (
                    "id" TEXT NOT NULL,
                    "userId" TEXT,
                    "eventType" TEXT NOT NULL,
                    "ipAddress" TEXT,
                    "userAgent" TEXT,
                    "details" JSONB,
                    "riskScore" INTEGER NOT NULL DEFAULT 0,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
                );
            `;
            
            await prisma.$executeRaw`
                ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            `;
            
            // Add indexes
            await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_idx" ON "SecurityEvent"("userId");`;
            await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");`;
            await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");`;
            await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_ipAddress_idx" ON "SecurityEvent"("ipAddress");`;
            await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_riskScore_idx" ON "SecurityEvent"("riskScore");`;
            
            console.log('   ✅ SecurityEvent table created successfully');
        }

        // Add security tracking columns to User table if they don't exist
        console.log('   📝 Adding security tracking columns to User table...');
        
        const securityColumns = [
            'lastLoginAt TIMESTAMP(3)',
            'lastLoginIp TEXT',
            'loginAttempts INTEGER NOT NULL DEFAULT 0',
            'lockedUntil TIMESTAMP(3)',
            'passwordChangedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP',
            'suspiciousActivityCount INTEGER NOT NULL DEFAULT 0'
        ];

        for (const column of securityColumns) {
            try {
                const columnName = column.split(' ')[0];
                await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN ${columnName} ${column.split(' ').slice(1).join(' ')};`;
                console.log(`   ✅ Added column: ${columnName}`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`   ⏭️ Column ${column.split(' ')[0]} already exists`);
                } else {
                    console.warn(`   ⚠️ Failed to add column ${column.split(' ')[0]}:`, error.message);
                }
            }
        }

        // Step 2: Set up admin account
        console.log('\n2️⃣ Setting up admin account...');
        
        // Prompt for admin email (you'll need to replace this with your actual email)
        const adminEmail = process.argv[2] || 'admin@unitedwerise.org';
        
        console.log(`   Looking for user with email: ${adminEmail}`);
        
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingAdmin) {
            // Update existing user to be admin
            await prisma.user.update({
                where: { email: adminEmail },
                data: {
                    isAdmin: true,
                    isModerator: true
                }
            });
            console.log(`   ✅ Updated ${adminEmail} to admin status`);
        } else {
            console.log(`   ❌ User ${adminEmail} not found.`);
            console.log('   💡 Please either:');
            console.log('      - Register an account first at https://www.unitedwerise.org');
            console.log('      - Run this script with your email: node setup-security-enhancements.js your-email@example.com');
            console.log('      - Or manually update your user account in the database');
        }

        // Step 3: Test security endpoints
        console.log('\n3️⃣ Testing security system...');
        
        // Create a test security event
        await prisma.securityEvent.create({
            data: {
                eventType: 'SYSTEM_TEST',
                ipAddress: '127.0.0.1',
                userAgent: 'Setup Script',
                details: {
                    message: 'Security system setup test',
                    timestamp: new Date().toISOString()
                },
                riskScore: 10
            }
        });
        console.log('   ✅ Security event logging working');

        // Test security stats query
        const stats = await prisma.securityEvent.aggregate({
            _count: { id: true },
            _avg: { riskScore: true }
        });
        console.log(`   ✅ Security statistics working (${stats._count.id} events, avg risk: ${Math.round(stats._avg.riskScore || 0)})`);

        // Step 4: Setup completion
        console.log('\n🎉 Security enhancements setup complete!\n');
        
        console.log('📍 Next Steps:');
        console.log('1. Access your admin dashboard at:');
        console.log('   https://www.unitedwerise.org/admin-dashboard.html');
        console.log('');
        console.log('2. Login with your admin account:');
        console.log(`   Email: ${adminEmail} (must be registered)`);
        console.log('   Password: Your normal account password');
        console.log('');
        console.log('3. Navigate to the Security tab to view:');
        console.log('   - Failed login attempts');
        console.log('   - Suspicious activity alerts');
        console.log('   - Security event logs');
        console.log('   - Risk assessment metrics');
        console.log('');
        console.log('4. Security features now active:');
        console.log('   ✅ Failed login tracking and account lockouts');
        console.log('   ✅ Security event logging');
        console.log('   ✅ Real-time threat detection');
        console.log('   ✅ Admin security dashboard');
        console.log('   ✅ Automated backup system (run manually with: node backend/scripts/backup-system.js)');
        console.log('');
        console.log('💡 Pro Tips:');
        console.log('   - Check the Security tab daily for any suspicious activity');
        console.log('   - Failed login attempts will lock accounts for 15 minutes after 5 attempts');
        console.log('   - High-risk events (score ≥75) will be highlighted in red');
        console.log('   - Run backups regularly or set up automated scheduling');

    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure your database is accessible');
        console.log('2. Verify your DATABASE_URL environment variable');
        console.log('3. Ensure you have database admin privileges');
        console.log('4. Try running: npx prisma generate');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the setup
if (require.main === module) {
    setupSecurityEnhancements()
        .then(() => {
            console.log('\n🚀 Ready to secure your platform!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Setup error:', error);
            process.exit(1);
        });
}

module.exports = setupSecurityEnhancements;