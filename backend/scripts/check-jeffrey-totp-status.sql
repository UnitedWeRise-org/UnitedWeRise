-- Check Jeffrey's current TOTP and admin status
SELECT 
    id,
    email,
    "firstName",
    "lastName",
    "isAdmin",
    "isModerator",
    "totpEnabled",
    "totpSecret" IS NOT NULL as has_secret,
    "totpSetupAt",
    "totpLastUsedAt",
    array_length("totpBackupCodes", 1) as backup_codes_count,
    "updatedAt"
FROM "User"
WHERE email = 'jeffreybenson2028@gmail.com';

-- Check if there were any recent updates to this user
SELECT 
    id,
    email,
    "isAdmin",
    "totpEnabled",
    "updatedAt"
FROM "User"
WHERE email = 'jeffreybenson2028@gmail.com'
ORDER BY "updatedAt" DESC;

-- Check all admin users and their TOTP status
SELECT 
    id,
    email,
    "isAdmin",
    "totpEnabled",
    "totpSecret" IS NOT NULL as has_secret
FROM "User"
WHERE "isAdmin" = true;