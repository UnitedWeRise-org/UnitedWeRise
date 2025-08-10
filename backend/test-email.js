#!/usr/bin/env node

/**
 * Email Service Test Script for United We Rise
 * This script tests the email configuration and sends a test email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔧 Testing Email Configuration for United We Rise\n');
console.log('='.repeat(60));

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('-------------------------------');

const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
const envVars = {};
let missingVars = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    if (varName.includes('PASS') || varName.includes('KEY')) {
      envVars[varName] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
    } else {
      envVars[varName] = value;
    }
    console.log(`✅ ${varName}: ${envVars[varName]}`);
  } else {
    missingVars.push(varName);
    console.log(`❌ ${varName}: NOT SET`);
  }
});

// Also check for SMTP_FROM (old variable name)
if (process.env.SMTP_FROM) {
  console.log(`⚠️  SMTP_FROM is set but should use FROM_EMAIL instead`);
}

console.log('\n' + '='.repeat(60));

if (missingVars.length > 0) {
  console.log('\n❌ Missing required environment variables:', missingVars.join(', '));
  console.log('\nPlease set these variables in your .env file or environment');
  process.exit(1);
}

// Create transporter
console.log('\n📧 Creating Email Transporter...');
console.log('-------------------------------');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  },
  debug: true, // Enable debug output
  logger: true // Enable logging
});

// Test connection
async function testConnection() {
  console.log('\n🔌 Testing SMTP Connection...');
  console.log('-------------------------------');
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    console.log('   Server is ready to send emails');
    return true;
  } catch (error) {
    console.log('❌ SMTP connection failed!');
    console.log('   Error:', error.message);
    
    // Provide specific troubleshooting tips
    if (error.message.includes('EAUTH')) {
      console.log('\n💡 Authentication Error - Possible causes:');
      console.log('   1. Incorrect email or password');
      console.log('   2. Need to use App Password instead of regular password');
      console.log('   3. 2-factor authentication is enabled (use App Password)');
      console.log('   4. Less secure app access needs to be enabled');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection Refused - Possible causes:');
      console.log('   1. Wrong SMTP host or port');
      console.log('   2. Firewall blocking the connection');
      console.log('   3. SMTP service is down');
    } else if (error.message.includes('self signed certificate')) {
      console.log('\n💡 Certificate Error - Try setting:');
      console.log('   NODE_TLS_REJECT_UNAUTHORIZED=0 (for testing only!)');
    }
    
    return false;
  }
}

// Send test email
async function sendTestEmail() {
  console.log('\n📤 Sending Test Email...');
  console.log('-------------------------------');
  
  // Get test recipient
  const testRecipient = process.argv[2] || process.env.SMTP_USER;
  console.log(`   To: ${testRecipient}`);
  console.log(`   From: ${process.env.FROM_EMAIL || process.env.SMTP_USER}`);
  
  const mailOptions = {
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: testRecipient,
    subject: '🧪 Test Email from United We Rise',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
          <h1 style="margin: 0;">🇺🇸 United We Rise</h1>
          <p style="margin: 10px 0 0 0;">Email Configuration Test</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; margin-top: 20px; border-radius: 10px;">
          <h2 style="color: #4b5c09;">✅ Email Service is Working!</h2>
          
          <p>This test email confirms that your SMTP configuration is correct and emails can be sent successfully.</p>
          
          <h3>Configuration Details:</h3>
          <ul>
            <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
            <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
            <li><strong>From Address:</strong> ${process.env.FROM_EMAIL || process.env.SMTP_USER}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated test email from the United We Rise platform.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `United We Rise - Email Test\n\nThis test email confirms that your SMTP configuration is working correctly.\n\nConfiguration:\n- SMTP Host: ${process.env.SMTP_HOST}\n- SMTP Port: ${process.env.SMTP_PORT}\n- From: ${process.env.FROM_EMAIL || process.env.SMTP_USER}\n- Timestamp: ${new Date().toISOString()}`
  };
  
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Response:', result.response);
    return true;
  } catch (error) {
    console.log('❌ Failed to send test email!');
    console.log('   Error:', error.message);
    
    // Log full error for debugging
    if (process.env.DEBUG) {
      console.log('\nFull error details:');
      console.log(error);
    }
    
    return false;
  }
}

// Main execution
async function main() {
  console.log('\n🚀 Starting Email Service Test...\n');
  
  // Test connection first
  const connectionOk = await testConnection();
  
  if (!connectionOk) {
    console.log('\n⚠️  Fix the connection issues above and try again.');
    process.exit(1);
  }
  
  // Send test email
  const emailSent = await sendTestEmail();
  
  console.log('\n' + '='.repeat(60));
  
  if (emailSent) {
    console.log('\n🎉 SUCCESS! Email service is fully configured and working.');
    console.log('\nYou should receive the test email shortly.');
    console.log('Check your inbox (and spam folder) for:', process.argv[2] || process.env.SMTP_USER);
  } else {
    console.log('\n⚠️  Email service connection works but sending failed.');
    console.log('Check the error messages above for details.');
  }
  
  process.exit(emailSent ? 0 : 1);
}

// Run the test
main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});