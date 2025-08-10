# Google Workspace SMTP Authentication Fix

## Current Issue
- **Account**: `noreply@unitedwerise.org` (Google Workspace account)
- **Error**: 535-5.7.8 Username and Password not accepted
- **App Password**: `azqm yfuo rfxf pqtz` (not working)

## Option 1: Verify App Password Setup (Recommended First)

### Step 1: Sign in as noreply@unitedwerise.org
1. Go to https://accounts.google.com
2. Sign in with `noreply@unitedwerise.org` (not your admin account)
3. Use the password for this specific account

### Step 2: Check 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Ensure "2-Step Verification" is ON for this account
3. If not, enable it first

### Step 3: Generate New App Password
1. While signed in as `noreply@unitedwerise.org`
2. Go to https://myaccount.google.com/apppasswords
3. You might need to re-enter your password
4. Select "Mail" and "Other (Custom name)"
5. Name it "SMTP Azure"
6. Copy the new 16-character password
7. Update both local .env and Azure with new password

## Option 2: Use Google Workspace SMTP Relay (Better for Organizations)

### Admin Console Setup
1. Sign in to https://admin.google.com as admin
2. Go to Apps > Google Workspace > Gmail
3. Click "Routing"
4. Scroll to "SMTP relay service"
5. Click "Add another" or "Edit"
6. Configure:
   - **Allowed senders**: Only addresses in my domains
   - **Authentication**: Only accept mail from the specified IP addresses
   - Add Azure Container App outbound IPs (check Azure portal)
   - OR check "Require SMTP Authentication"
   - **Encryption**: Require TLS encryption

### Then Update Code to Use:
```env
SMTP_HOST="smtp-relay.gmail.com"
SMTP_PORT=587
SMTP_USER="noreply@unitedwerise.org"
SMTP_PASS="[regular password or app password]"
```

## Option 3: Check Google Workspace Policies

### As Admin, Check:
1. Go to https://admin.google.com
2. Security > Access and data control > Less secure apps
3. Ensure it's set to "Allow users to manage their access"
4. Then each user can enable it in their settings

### For the noreply account:
1. Sign in as `noreply@unitedwerise.org`
2. Go to https://myaccount.google.com/lesssecureapps
3. Turn ON "Allow less secure apps" (temporary for testing)

## Option 4: Use Service Account (Most Secure)

### Create Service Account
1. Go to Google Cloud Console
2. Create a service account
3. Enable Gmail API
4. Use OAuth2 instead of SMTP

This requires code changes but is most secure.

## Quick Debugging Steps

### 1. Test with Personal Gmail First
If you have a personal Gmail account, test with it:
```env
SMTP_USER="yourpersonal@gmail.com"
SMTP_PASS="your-app-password"
```
This confirms if the issue is Google Workspace specific.

### 2. Check Account Access
1. Sign in as `noreply@unitedwerise.org`
2. Check https://myaccount.google.com/security
3. Look for "Recent security activity"
4. See if SMTP attempts are being blocked

### 3. Try Google's SMTP Test
```bash
openssl s_client -starttls smtp -connect smtp.gmail.com:587
# Then after connection:
EHLO localhost
AUTH LOGIN
# Enter base64 encoded username and password
```

## Current Status
- ✅ Google Workspace domain configured (MX records point to Google)
- ✅ SMTP code implemented and working
- ❌ Authentication failing with current App Password
- ❓ App Password might be from wrong account or policies blocking

## Next Steps
1. **Verify** you generated App Password while signed in as `noreply@unitedwerise.org`
2. **Try** regenerating the App Password
3. **Consider** using SMTP relay service instead
4. **Alternative**: Switch to SendGrid or similar service

---
*Last Updated: August 9, 2025*