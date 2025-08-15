# Domain Setup Guide for United We Rise

## Overview

This guide covers setting up a custom domain (unitedwerise.org) with Azure Static Web Apps and configuring email services through Google Workspace.

## Prerequisites

- Azure subscription with Static Web App deployed
- Domain registered (e.g., through Namecheap, GoDaddy, etc.)
- Google Workspace account

## Step 1: Configure DNS Records

### Required DNS Records in Domain Registrar

1. **ALIAS Record** (for apex domain):
   - Host: `@`
   - Type: `ALIAS` or `ANAME`
   - Value: `your-static-app.azurestaticapps.net`

2. **CNAME Record** (for www subdomain):
   - Host: `www`
   - Type: `CNAME`
   - Value: `your-static-app.azurestaticapps.net`

3. **TXT Record** (for Azure domain verification):
   - Host: `@`
   - Type: `TXT`
   - Value: `_verification-token` (obtained from Azure)

## Step 2: Azure Static Web App Configuration

### Add Custom Domain

```bash
# Add custom domain with TXT validation (required for apex domains)
az staticwebapp hostname set \
  --hostname unitedwerise.org \
  --name your-static-web-app \
  --resource-group your-resource-group \
  --validation-method dns-txt-token

# Get the validation token
az staticwebapp hostname show \
  -n your-static-web-app \
  -g your-resource-group \
  --hostname unitedwerise.org \
  --query "validationToken" \
  --output tsv
```

### Verify Domain Status

```bash
# Check validation status
az staticwebapp hostname show \
  -n your-static-web-app \
  -g your-resource-group \
  --hostname unitedwerise.org \
  --query "status" \
  --output tsv
```

Status will show:
- `Validating` - Azure is checking DNS records
- `Ready` - Domain is validated and SSL certificate is being provisioned
- `Active` - Domain is fully configured and live

## Step 3: Email Service Setup with Google Workspace

### Add Domain to Google Workspace

1. **Google Admin Console** → **Domains** → **Add a domain**
2. **Enter domain name**: `unitedwerise.org`
3. **Add verification TXT record** to DNS:
   - Host: `@`
   - Type: `TXT`
   - Value: `google-site-verification=your-verification-string`

### Configure MX Records

Add Google's MX records to your domain registrar:

```
Priority 1:  ASPMX.L.GOOGLE.COM
Priority 5:  ALT1.ASPMX.L.GOOGLE.COM
Priority 5:  ALT2.ASPMX.L.GOOGLE.COM
Priority 10: ALT3.ASPMX.L.GOOGLE.COM
Priority 10: ALT4.ASPMX.L.GOOGLE.COM
```

### Create Email Accounts

1. **Create noreply user**: noreply@unitedwerise.org
2. **Enable 2-Step Verification** for the account
3. **Generate App Password** for SMTP authentication

## Step 4: Configure Backend Email Service

### Add Environment Variables to Azure Container App

```bash
az containerapp update \
  --name your-backend-app \
  --resource-group your-resource-group \
  --set-env-vars \
    SMTP_HOST=smtp.gmail.com \
    SMTP_PORT=587 \
    SMTP_USER=noreply@unitedwerise.org \
    SMTP_PASS="your-16-char-app-password" \
    FROM_EMAIL=noreply@unitedwerise.org
```

## Step 5: Verification and Testing

### DNS Propagation Check

```bash
# Check ALIAS record
nslookup unitedwerise.org 8.8.8.8

# Check TXT records
nslookup -type=TXT unitedwerise.org 8.8.8.8

# Check MX records
nslookup -type=MX unitedwerise.org 8.8.8.8
```

### Test Email Service

1. Visit your domain: `https://unitedwerise.org`
2. Register a new account
3. Request email verification
4. Check email delivery

### Verify SSL Certificate

- Wait 5-15 minutes after domain validation for SSL certificate provisioning
- Test HTTPS access: `https://unitedwerise.org`
- Check certificate details in browser

## Troubleshooting

### Common Issues

1. **"This Connection is not private"**
   - SSL certificate is still being provisioned
   - Wait 5-15 minutes after domain validation
   - Try HTTP first: `http://unitedwerise.org`

2. **Azure domain validation stuck**
   - Verify TXT record is propagated: `nslookup -type=TXT unitedwerise.org 8.8.8.8`
   - Delete and re-add custom domain in Azure
   - Ensure no conflicting DNS records (A, AAAA, CNAME for same host)

3. **Email not sending**
   - Check Container App logs for SMTP errors
   - Verify app password is correct (16 characters)
   - Ensure 2FA is enabled on Google account

### DNS Propagation Times

- TXT records: 2-5 minutes
- ALIAS/CNAME records: 5-15 minutes
- MX records: 15-30 minutes
- Full global propagation: Up to 48 hours

## Final Configuration

After successful setup:

- ✅ `https://unitedwerise.org` - Production frontend
- ✅ `https://www.unitedwerise.org` - Redirects to main domain
- ✅ Email verification working from `noreply@unitedwerise.org`
- ✅ SSL certificate automatically managed by Azure
- ✅ Custom domain validated and active

## Maintenance

### Monitoring

- Monitor domain validation status monthly
- Check SSL certificate renewal (automatic)
- Verify email service functionality
- Test DNS resolution from multiple locations

### Updates

- Update documentation when adding new subdomains
- Keep Google Workspace MX records current
- Rotate app passwords annually for security