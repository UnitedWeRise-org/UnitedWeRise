# Phase 0: Safety Net - Pre-Nuclear Removal

## Status: In Progress

## Step 1: Export User Avatar/Background URLs

```bash
# Run this to export all user profile images
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

(async () => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { avatar: { not: null } },
        { backgroundImage: { not: null } }
      ]
    },
    select: {
      id: true,
      email: true,
      avatar: true,
      backgroundImage: true
    }
  });

  fs.writeFileSync(
    'user-images-export-' + new Date().toISOString().split('T')[0] + '.json',
    JSON.stringify(users, null, 2)
  );

  console.log('Exported', users.length, 'users with avatars/backgrounds');
  await prisma.\$disconnect();
})();
"
```

## Step 2: Export Candidate Photos

```bash
# Run this to export candidate photo URLs
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

(async () => {
  const candidates = await prisma.candidate.findMany({
    where: {
      externalPhotoUrl: { not: null }
    },
    select: {
      id: true,
      name: true,
      externalPhotoUrl: true
    }
  });

  fs.writeFileSync(
    'candidate-photos-export-' + new Date().toISOString().split('T')[0] + '.json',
    JSON.stringify(candidates, null, 2)
  );

  console.log('Exported', candidates.length, 'candidates with photos');
  await prisma.\$disconnect();
})();
"
```

## Step 3: Count Photo Table Records (What We're Deleting)

```bash
# See how much data we're about to delete
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const counts = {
    photos: await prisma.photo.count(),
    photoTags: await prisma.photoTag.count(),
    privacyRequests: await prisma.photoPrivacyRequest.count(),
    moderationResults: await prisma.imageModerationResult.count(),
    moderationReviews: await prisma.imageModerationReview.count()
  };

  console.log('Records to be deleted:');
  console.log(JSON.stringify(counts, null, 2));

  await prisma.\$disconnect();
})();
"
```

## Step 4: Full Database Backup

```bash
# Create full database backup (CRITICAL - run this!)
BACKUP_FILE="backup-before-photo-removal-$(date +%Y%m%d-%H%M%S).sql"

# For development database
pg_dump $DATABASE_URL > $BACKUP_FILE

echo "Backup created: $BACKUP_FILE"
echo "File size: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
```

## Step 5: Git Commit Tag

```bash
# Tag current commit for instant rollback
git add -A
git commit -m "checkpoint: Before nuclear photo upload removal" || echo "Nothing to commit"
git tag -a nuclear-removal-point -m "Rollback point before photo system removal - $(date)"
git push origin main --tags

echo "Tagged commit: nuclear-removal-point"
echo "Rollback command: git reset --hard nuclear-removal-point"
```

## Step 6: Azure Blob Inventory

```bash
# Document current blob storage state
az storage blob list \
  --account-name uwrstorage2425 \
  --container-name photos \
  --output json > blob-inventory-before-removal-$(date +%Y%m%d).json

echo "Blob inventory saved"
echo "Total blobs: $(jq '. | length' blob-inventory-before-removal-*.json)"
```

## Verification Checklist

Before proceeding to Phase 1 (Nuclear Removal), verify:

- [ ] User images exported (user-images-export-*.json exists)
- [ ] Candidate photos exported (candidate-photos-export-*.json exists)
- [ ] Photo counts documented (know what's being deleted)
- [ ] Database backup created (backup-before-photo-removal-*.sql exists and > 0 bytes)
- [ ] Git tagged (nuclear-removal-point exists)
- [ ] Blob inventory created (blob-inventory-before-removal-*.json exists)

## Rollback Procedure (If Needed)

```bash
# 1. Restore database
psql $DATABASE_URL < backup-before-photo-removal-YYYYMMDD-HHMMSS.sql

# 2. Revert code
git reset --hard nuclear-removal-point
git push origin main --force

# 3. Redeploy
git push origin main
```

## Next Step

Once all checkboxes above are verified, proceed to Phase 1: Nuclear Removal
