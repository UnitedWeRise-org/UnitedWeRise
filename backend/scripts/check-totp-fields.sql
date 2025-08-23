-- Check TOTP fields and user setup for debugging 500 error

-- Check if TOTP fields exist in User table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name LIKE '%totp%'
ORDER BY column_name;

-- Check current user's TOTP status
SELECT 
    id,
    username,
    email,
    "totpEnabled",
    "totpSecret" IS NOT NULL as has_secret,
    array_length("totpBackupCodes", 1) as backup_codes_count,
    "totpSetupAt",
    "totpLastUsedAt"
FROM "User" 
WHERE email = 'jeffreybenson2028@gmail.com'
LIMIT 1;

-- Check if there are any TOTP enabled users
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN "totpEnabled" = true THEN 1 END) as totp_enabled_users
FROM "User";