# OAuth Setup Guide for United We Rise

## Overview
United We Rise supports OAuth authentication with the top 3 most popular providers:
1. **Google** - Most widely used OAuth provider
2. **Microsoft** - Popular for business/corporate accounts  
3. **Apple** - iOS/macOS users preference

## Environment Variables Required

Add these environment variables to your `.env` file:

```env
# OAuth Client IDs
GOOGLE_CLIENT_ID=your_google_client_id_here
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here  
APPLE_CLIENT_ID=your_apple_client_id_here

# OAuth Encryption Key for secure token storage
OAUTH_ENCRYPTION_KEY=your_32_byte_encryption_key_here
```

## Provider Setup Instructions

### 1. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized origins:
   - `https://www.unitedwerise.org`
   - `http://localhost:3000` (for development)
7. Add authorized redirect URIs:
   - `https://www.unitedwerise.org`
   - `http://localhost:3000` (for development)
8. Copy the Client ID and add to `GOOGLE_CLIENT_ID` environment variable

### 2. Microsoft OAuth Setup
1. Go to [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Click "New registration"
3. Set name: "United We Rise"
4. Set supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Set redirect URI type to "Single-page application (SPA)" with URL:
   - `https://www.unitedwerise.org`
   - `http://localhost:3000` (for development)
6. After creation, go to "Overview" and copy the "Application (client) ID"
7. Add to `MICROSOFT_CLIENT_ID` environment variable

### 3. Apple OAuth Setup  
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" → "+" → "Services IDs"
4. Create a new Service ID
5. Configure Sign In with Apple:
   - Primary App ID: Create an App ID first if needed
   - Domains and Subdomains: `unitedwerise.org`
   - Return URLs: `https://www.unitedwerise.org/apple-callback`
6. Copy the Service ID and add to `APPLE_CLIENT_ID` environment variable

### 4. Generate Encryption Key
Generate a secure 32-byte encryption key for OAuth token storage:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add the output to `OAUTH_ENCRYPTION_KEY` environment variable.

## Features Implemented

### Backend Features (✅ Complete)
- OAuth login/registration flow for all 3 providers
- Account linking - users can link multiple OAuth providers
- Account unlinking with safety checks (prevents removing last auth method)
- Secure token storage with AES-256-CBC encryption
- User profile merging from OAuth data
- Configuration endpoint `/api/oauth/config` for frontend

### Frontend Features (✅ Complete)
- Dynamic OAuth configuration loading from backend
- Google Sign-In with Google Identity Services
- Microsoft authentication with MSAL.js
- Apple Sign In with Apple JS SDK
- Graceful fallbacks when providers aren't configured
- User-friendly error messaging

### API Endpoints

#### GET `/api/oauth/config`
Returns OAuth provider configuration:
```json
{
  "google": { "clientId": "...", "enabled": true },
  "microsoft": { "clientId": "...", "enabled": false },
  "apple": { "clientId": "...", "enabled": true }
}
```

#### POST `/api/oauth/{provider}`
Authenticate with OAuth provider (google/microsoft/apple):
```json
// Request
{ "idToken": "...", "accessToken": "..." }

// Response  
{
  "message": "Login successful",
  "user": { ... },
  "token": "jwt_token",
  "isNewUser": false
}
```

#### POST `/api/oauth/link/{provider}`
Link OAuth provider to existing account (requires auth):
```json
// Request
{ "idToken": "..." }

// Response
{ "message": "google account linked successfully" }
```

#### DELETE `/api/oauth/unlink/{provider}`  
Unlink OAuth provider (requires auth):
```json
// Response
{ "message": "google account unlinked successfully" }
```

#### GET `/api/oauth/linked`
Get linked OAuth providers (requires auth):
```json
// Response
{
  "providers": [
    {
      "provider": "GOOGLE",
      "email": "user@gmail.com", 
      "name": "John Doe",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## Testing

### Test OAuth Without Client IDs
The system gracefully handles missing client IDs:
- Backend returns placeholder values and `enabled: false`
- Frontend shows user-friendly error messages
- No crashes or broken functionality

### Test Account Scenarios
1. **New OAuth User**: Creates account with OAuth-only login
2. **Existing Email**: Links OAuth to existing password account  
3. **Returning OAuth User**: Logs in with linked OAuth provider
4. **Multiple Providers**: User can link multiple providers to one account

## Security Features
- OAuth tokens encrypted before database storage
- Account linking prevents duplicate accounts
- Cannot unlink last authentication method without password
- Secure token verification with provider APIs
- Rate limiting on all OAuth endpoints