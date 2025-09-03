# TOTP 2FA Setup Guide for United We Rise

## Overview
Two-Factor Authentication (TOTP) is now implemented for both regular users and admin access with different security levels:

- **Admin Access**: Requires fresh TOTP verification for every admin action (existing behavior)
- **Regular Login**: Uses 24-hour session tokens with auto-extension (new behavior)

## How TOTP Session Persistence Works

### 24-Hour Session Model
1. **Initial Login**: User enters email + password + TOTP code
2. **Session Token**: System generates 24-hour session token stored locally
3. **Daily Logins**: Uses session token instead of requiring new TOTP
4. **Auto-Extension**: Each login extends session by another 24 hours
5. **Logout**: Clears session token, next login requires new TOTP

### Benefits
- **Security**: Still requires TOTP but not excessively restrictive
- **User Experience**: Daily users don't need authenticator app every time
- **Flexibility**: Session expires if user doesn't login for 24+ hours

## API Endpoints

### User TOTP Management

#### POST `/api/totp/setup`
Setup TOTP for user account (requires auth):
```json
// Response
{
  "success": true,
  "data": {
    "secret": "base32_secret",
    "qrCode": "data:image/png;base64...",
    "backupCodes": []
  }
}
```

#### POST `/api/totp/verify-setup`
Verify TOTP setup (requires auth):
```json
// Request
{ "token": "123456" }

// Response
{
  "success": true,
  "data": {
    "message": "TOTP successfully enabled",
    "backupCodes": ["ABCD1234", "EFGH5678", ...]
  }
}
```

#### POST `/api/totp/verify`
Verify TOTP for session (requires auth):
```json
// Request
{ "token": "123456", "backupCode": "ABCD1234" }

// Response
{
  "success": true,
  "data": {
    "verified": true,
    "verificationToken": "session_token",
    "usedBackupCode": false,
    "remainingBackupCodes": 8
  }
}
```

#### GET `/api/totp/status`
Check TOTP status (requires auth):
```json
// Response
{
  "success": true,
  "data": {
    "enabled": true,
    "setupAt": "2025-01-01T00:00:00.000Z", 
    "backupCodesRemaining": 7
  }
}
```

#### POST `/api/totp/disable`
Disable TOTP (requires auth + password):
```json
// Request
{ "password": "user_password" }

// Response
{
  "success": true,
  "data": { "message": "TOTP successfully disabled" }
}
```

#### POST `/api/totp/regenerate-backup-codes`
Generate new backup codes (requires TOTP verification):
```json
// Request
{ "token": "123456" }

// Response
{
  "success": true,
  "data": {
    "backupCodes": ["NEW11111", "NEW22222", ...]
  }
}
```

## Updated Login Flow

### Regular Login with TOTP Enabled

#### 1. Initial Login Request
```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "userpassword",
  "totpSessionToken": "stored_session_token" // Optional
}
```

#### 2. Response Scenarios

**A. No TOTP Required**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "jwt_token"
}
```

**B. TOTP Required (First Time or Expired Session)**
```json
{
  "requiresTOTP": true,
  "message": "Two-factor authentication required",
  "userId": "temp_user_id"
}
```

**C. Valid Session Token (Extended)**
```json
{
  "message": "Login successful", 
  "user": { ... },
  "token": "jwt_token",
  "totpSessionToken": "new_24h_token"
}
```

#### 3. TOTP Verification (If Required)
```javascript
POST /api/auth/login  
{
  "email": "user@example.com",
  "password": "userpassword", 
  "totpToken": "123456"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "jwt_token",
  "totpSessionToken": "24h_session_token"
}
```

## Frontend Integration

### Login Form Updates
- Added hidden TOTP input field that appears when required
- Login button changes to "Verify & Login" when TOTP needed
- Automatic session token management in localStorage
- Clear session tokens on logout

### JavaScript Functions
- `handleLogin()`: Updated to handle TOTP flow and session tokens
- `clearAuthForm()`: Resets TOTP field visibility
- `logout()`: Clears all auth tokens including TOTP session

### User Experience Flow
1. User enters email/password and clicks Login
2. If TOTP enabled, form shows TOTP field and updates button text
3. User enters 6-digit code and clicks "Verify & Login"
4. On success, receives 24-hour session token stored locally
5. Future logins within 24 hours skip TOTP verification
6. Session auto-extends on each login for another 24 hours

## Security Considerations

### Session Token Security
- Session tokens use TOTP algorithm with 24-hour step size
- Stored in localStorage (cleared on logout)
- Not transmitted as cookies to prevent CSRF
- Auto-expire after 24 hours of inactivity

### Backup Codes
- 8 backup codes generated on TOTP setup
- Single-use codes removed after usage
- Can regenerate new set with TOTP verification
- Useful for account recovery if device lost

### Admin vs Regular User TOTP
- **Admin**: Fresh TOTP verification for every admin action (high security)
- **Regular**: 24-hour sessions with auto-extension (user-friendly)
- Both use same underlying TOTP secret and backup codes

## Database Schema

The existing User model supports TOTP:
```prisma
model User {
  totpEnabled      Boolean    @default(false)
  totpSecret       String?    // Base32 encoded secret
  totpBackupCodes  String[]   @default([])
  totpLastUsedAt   DateTime?  // For session tracking
  totpSetupAt      DateTime?  // When TOTP was enabled
  // ... other fields
}
```

OAuth providers stored separately:
```prisma  
model UserOAuthProvider {
  userId       String
  provider     OAuthProvider  // GOOGLE | MICROSOFT | APPLE
  providerId   String         // Provider's user ID
  email        String?
  name         String?
  picture      String?
  accessToken  String?        // Encrypted
  refreshToken String?        // Encrypted  
  expiresAt    DateTime?
  // ... other fields
}
```

## Testing TOTP Implementation

### Test Account Creation
1. Register new account with email/password
2. Login to account
3. Go to Settings → Security
4. Enable Two-Factor Authentication
5. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
6. Verify setup with 6-digit code
7. Save backup codes safely

### Test Login Flow
1. Logout from account
2. Login with email/password → should prompt for TOTP
3. Enter 6-digit code → should login and store session token
4. Logout and login again within 24 hours → should skip TOTP
5. Wait 24+ hours or clear localStorage → should require TOTP again

### Test Session Extension
1. Login with TOTP (gets 24-hour token)
2. After 12 hours, login again → should extend session without TOTP
3. Check localStorage for updated totpSessionToken
4. Session should remain valid for another 24 hours

## Error Scenarios

- **Invalid TOTP**: "Invalid TOTP token" - retry with fresh code
- **Expired Session**: After 24+ hours, requires fresh TOTP
- **OAuth-Only Account**: Password login shows message to use social login
- **Missing Client IDs**: OAuth buttons show configuration errors gracefully
- **Account Locked**: Multiple failed attempts trigger temporary lockout