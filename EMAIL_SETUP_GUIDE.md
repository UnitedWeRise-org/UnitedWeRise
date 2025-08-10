# Email Service Setup Guide

## Current Issue
The email verification system is fully implemented but emails are not being sent due to Gmail SMTP authentication failure.

## Error Details
```
535-5.7.8 Username and Password not accepted
```

## Gmail SMTP Configuration Required

### Step 1: Gmail Account Setup
You need a Gmail account for `noreply@unitedwerise.org` or use an existing Gmail account.

### Step 2: Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to Security
3. Enable 2-Step Verification (required for App Passwords)

### Step 3: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter name: "United We Rise SMTP"
5. Click "Generate"
6. **Copy the 16-character password** (spaces don't matter)

### Step 4: Update Environment Variables

#### Local Development (.env)
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-gmail-account@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"  # The 16-character App Password
SMTP_FROM="United We Rise <your-gmail-account@gmail.com>"
```

#### Azure Container App
Update the environment variables:
```bash
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars \
    SMTP_USER="your-gmail-account@gmail.com" \
    SMTP_PASS="xxxx xxxx xxxx xxxx" \
    SMTP_FROM="United We Rise <your-gmail-account@gmail.com>"
```

## Alternative Email Services

### Option 1: SendGrid (Recommended for Production)
```env
# SendGrid Configuration
SENDGRID_API_KEY="your-sendgrid-api-key"
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

### Option 2: Azure Communication Services
```env
# Azure Email Service
AZURE_COMMUNICATION_CONNECTION_STRING="your-connection-string"
```

### Option 3: AWS SES
```env
# AWS SES Configuration
AWS_SES_REGION="us-east-1"
AWS_SES_ACCESS_KEY="your-access-key"
AWS_SES_SECRET_KEY="your-secret-key"
```

## Testing Email Service

### 1. Test SMTP Connection
```bash
cd backend
node test-smtp-connection.js
```

### 2. Test Registration Flow
1. Open the test file: `test-email-verification.html`
2. Complete the hCaptcha
3. Register a new user
4. Check if verification email is sent

### 3. Check Azure Logs
```bash
az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --tail 50 | grep -i email
```

## Current Status

### ✅ Implemented
- Email service code (`backend/src/services/emailService.ts`)
- Email templates (verification, welcome, password reset)
- Verification endpoints (`/api/verification/email/send`, `/api/verification/email/verify`)
- SMTP configuration in Azure

### ❌ Issues
- Gmail authentication failing (need proper App Password)
- No fallback email service configured

### 🔧 Next Steps
1. **Option A**: Fix Gmail authentication with proper App Password
2. **Option B**: Switch to SendGrid or another email service
3. **Option C**: Use a different Gmail account with proper setup

## Email Templates Available

1. **Email Verification** - Sent when user registers
2. **Welcome Email** - Sent after email verification
3. **Password Reset** - Sent when user requests password reset
4. **Account Warning** - Moderation action
5. **Account Suspension** - Moderation action
6. **Report Update** - When user's report is resolved

## Security Notes

- Never commit actual SMTP passwords to Git
- Use App Passwords, not regular passwords
- Consider using managed email services for production
- Implement rate limiting on email endpoints
- Add email send logs for auditing

---

*Last Updated: August 9, 2025*
*Issue: Gmail SMTP authentication needs App Password*