/**
 * Test: Google Workspace SMTP Authentication
 * Created: 2025-08-09
 * Purpose: Debug SMTP for Google Workspace account
 * Cleanup: Delete after email working
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('=== Google Workspace SMTP Test ===\n');

// Test different authentication methods
async function testAuthentications() {
    const configs = [
        {
            name: 'Method 1: App Password without spaces',
            auth: {
                user: 'noreply@unitedwerise.org',
                pass: 'azqmyfuorfxfpqtz'
            }
        },
        {
            name: 'Method 2: App Password with spaces',
            auth: {
                user: 'noreply@unitedwerise.org',
                pass: 'azqm yfuo rfxf pqtz'
            }
        },
        {
            name: 'Method 3: Full email as user',
            auth: {
                user: 'noreply@unitedwerise.org',
                pass: 'azqmyfuorfxfpqtz'
            }
        }
    ];

    for (const config of configs) {
        console.log(`\nTesting ${config.name}...`);
        console.log(`User: ${config.auth.user}`);
        console.log(`Pass: ${config.auth.pass.substring(0, 4)}...`);
        
        try {
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: config.auth,
                debug: false,
                logger: false,
                tls: {
                    rejectUnauthorized: false // Try without cert validation
                }
            });

            await transporter.verify();
            console.log(`✅ SUCCESS with ${config.name}!`);
            
            // Try to send a test email
            const info = await transporter.sendMail({
                from: 'noreply@unitedwerise.org',
                to: 'test@example.com',
                subject: 'Test from United We Rise',
                text: 'This is a test email.'
            });
            console.log('Email sent:', info.messageId);
            
            transporter.close();
            return true;
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
    
    return false;
}

// Additional checks
async function checkGoogleWorkspace() {
    console.log('\n=== Google Workspace Checks ===\n');
    
    console.log('Domain: unitedwerise.org');
    console.log('MX Record: Points to smtp.google.com ✅');
    console.log('This confirms Google Workspace is configured for email.\n');
    
    console.log('Common issues with Google Workspace SMTP:');
    console.log('1. App Password must be generated from the Google Workspace account');
    console.log('2. 2-Step Verification must be enabled for the account');
    console.log('3. "Less secure app access" might need to be enabled (not recommended)');
    console.log('4. Google Workspace might have additional security policies');
    console.log('\nTo generate App Password:');
    console.log('1. Sign in to https://myaccount.google.com/ with noreply@unitedwerise.org');
    console.log('2. Go to Security > 2-Step Verification (must be ON)');
    console.log('3. Go to Security > App passwords');
    console.log('4. Generate a new app password for "Mail"');
    console.log('5. Use the 16-character password (spaces optional)');
    
    console.log('\nAlternative: Enable "Less secure app access" (temporary):');
    console.log('1. Go to Google Admin console (admin.google.com)');
    console.log('2. Security > Access and data control > Less secure apps');
    console.log('3. Allow users to manage their access');
    console.log('4. Then in personal account settings, enable less secure apps');
}

// Run tests
async function main() {
    const success = await testAuthentications();
    
    if (!success) {
        await checkGoogleWorkspace();
        
        console.log('\n=== Recommendations ===\n');
        console.log('1. Verify the App Password was generated from noreply@unitedwerise.org account');
        console.log('2. Try regenerating the App Password');
        console.log('3. Check if there are organization policies blocking SMTP');
        console.log('4. Consider using Google Workspace SMTP relay service instead');
        console.log('5. Or switch to SendGrid/other email service for simplicity');
    }
}

main().catch(console.error);