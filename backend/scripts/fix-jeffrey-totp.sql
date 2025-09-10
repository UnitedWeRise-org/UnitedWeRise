-- Check Jeffrey's current TOTP status
SELECT 
    id,
    email,
    "isAdmin",
    "totpEnabled",
    "totpSecret" IS NOT NULL as has_secret,
    "totpSetupAt",
    array_length("totpBackupCodes", 1) as backup_codes_count
FROM "User"
WHERE email = 'jeffreybenson2028@gmail.com';

-- If TOTP was accidentally disabled but secret still exists, re-enable it
UPDATE "User"
SET "totpEnabled" = true
WHERE email = 'jeffreybenson2028@gmail.com'
  AND "totpSecret" IS NOT NULL
  AND "totpEnabled" = false;

-- Verify the fix
SELECT 
    id,
    email,
    "isAdmin",
    "totpEnabled",
    "totpSecret" IS NOT NULL as has_secret,
    "totpSetupAt"
FROM "User"
WHERE email = 'jeffreybenson2028@gmail.com';