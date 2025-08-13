const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
    console.log('Finding users and setting admin privileges...\n');
    
    try {
        // List all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                isModerator: true
            }
        });
        
        console.log('Current users in database:');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} (${user.username}) - Admin: ${user.isAdmin ? '✅' : '❌'}`);
        });
        
        // Make the first user (likely you) an admin
        if (users.length > 0) {
            const firstUser = users[0];
            
            if (!firstUser.isAdmin) {
                await prisma.user.update({
                    where: { id: firstUser.id },
                    data: {
                        isAdmin: true,
                        isModerator: true
                    }
                });
                
                console.log(`\n✅ Made ${firstUser.email} an admin!`);
            } else {
                console.log(`\n✅ ${firstUser.email} is already an admin!`);
            }
            
            console.log('\n📍 Access your admin dashboard at:');
            console.log('   https://www.unitedwerise.org/admin-dashboard.html');
            console.log(`   Email: ${firstUser.email}`);
            console.log('   Password: Your normal account password');
        } else {
            console.log('\n❌ No users found. Please register an account first.');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

makeAdmin();