-- Debug TOTP issues for specific user

-- Check if user exists and has correct fields
SELECT 
    id,
    username,
    email,
    "isAdmin",
    "totpEnabled",
    "totpSecret" IS NOT NULL as has_totp_secret,
    "totpSetupAt",
    "totpLastUsedAt",
    array_length("totpBackupCodes", 1) as backup_codes_count
FROM "User" 
WHERE email = 'jeffreybenson2028@gmail.com';

-- Check if there are any data type issues
SELECT 
    pg_typeof("totpEnabled") as totp_enabled_type,
    pg_typeof("totpSecret") as totp_secret_type,
    pg_typeof("totpBackupCodes") as totp_backup_codes_type
FROM "User" 
WHERE email = 'jeffreybenson2028@gmail.com'
LIMIT 1;