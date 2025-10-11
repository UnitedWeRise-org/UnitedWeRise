# Database Schema Documentation Reference

You are assisting with database schema design, migrations, and model relationships for UnitedWeRise. This command provides quick access to all relevant schema documentation and migration protocols.

## REQUIRED READING ORDER

Before making any database changes, read in this order:

### 1. Database Migration Safety Protocol (CRITICAL)
**File:** `CLAUDE.md`
**Lines:** 463-746
**Read:** Entire DATABASE MIGRATION SAFETY PROTOCOL section
**Purpose:** Learn the REQUIRED migration workflow to avoid production disasters

**CRITICAL RULES:**
❌ **NEVER** use `npx prisma db push` for permanent changes
❌ **NEVER** edit schema.prisma without running `prisma migrate dev`
❌ **NEVER** run manual SQL in production without migration file

✅ **ALWAYS** use `npx prisma migrate dev --name "description"`
✅ **ALWAYS** commit migration files to git
✅ **ALWAYS** backup production database before migrating

**Historical Incident (October 3, 2025):**
Quest and Badge tables created via `db push` (bypassing migrations). Production deployment failed with 500 errors because tables didn't exist. Migration tracking was out of sync. Required emergency fix to mark migrations as "applied".

### 2. Complete Schema Documentation (WHAT)
**File:** `docs/DATABASE_SCHEMA.md`
**Read:** Relevant sections for your feature area
**Purpose:** Understand all 94 database models, relationships, and business logic

Schema organized by functional area:
1. **User & Authentication** - User, Session, OAuth
2. **User Profile & Social** - UserProfile, Following, ProfileView
3. **Content Creation** - Post, Comment, Photo
4. **Engagement** - Reaction, SavedPost, Share
5. **Civic Engagement** - Quest, Badge, UserQuestProgress, Petition
6. **Location & Geography** - H3Cell, LocationData
7. **Payments & Transactions** - Payment, Transaction, Refund
8. **Moderation** - ModerationLog, UserReport, ContentFlag
9. **Notifications** - Notification, NotificationPreference
10. **Analytics** - AnalyticsEvent, UserActivity

### 3. Actual Schema File (HOW)
**File:** `backend/prisma/schema.prisma`
**Purpose:** Current database schema definition (source of truth)

**Schema Statistics:**
- 94 total models
- ~2,500 lines of schema code
- PostgreSQL database
- Azure Postgres Flexible Server

## Database Models Quick Reference

### User & Authentication (Lines 50-250)
```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  role            UserRole  @default(USER)
  profilePhotoUrl String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())

  // Relations
  posts           Post[]
  comments        Comment[]
  reactions       Reaction[]
  quests          UserQuestProgress[]
  badges          UserBadge[]
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}
```

### Content Models (Lines 500-1000)
```prisma
model Post {
  id          String   @id @default(uuid())
  userId      String
  content     String
  visibility  Visibility @default(PUBLIC)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  comments    Comment[]
  reactions   Reaction[]
  savedBy     SavedPost[]

  @@index([userId])
  @@index([createdAt])
}

model Comment {
  id        String   @id @default(uuid())
  postId    String
  userId    String
  content   String
  createdAt DateTime @default(now())

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  reactions Reaction[]

  @@index([postId])
  @@index([userId])
}
```

### Quest & Badge System (Lines 2504-2598)
```prisma
model Quest {
  id           String    @id @default(uuid())
  title        String
  questType    QuestType
  targetValue  Int
  rewardXP     Int
  rewardBadges String[]
  isActive     Boolean   @default(true)

  progress     UserQuestProgress[]
}

model UserQuestProgress {
  id          String   @id @default(uuid())
  userId      String
  questId     String
  progress    Int      @default(0)
  isCompleted Boolean  @default(false)
  completedAt DateTime?

  user        User     @relation(fields: [userId], references: [id])
  quest       Quest    @relation(fields: [questId], references: [id])

  @@unique([userId, questId])
}

model Badge {
  id                    String    @id @default(uuid())
  name                  String    @unique
  tier                  BadgeTier
  qualificationCriteria Json
  isActive              Boolean   @default(true)

  holders               UserBadge[]
}

model UserBadge {
  id        String   @id @default(uuid())
  userId    String
  badgeId   String
  awardedAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  badge     Badge    @relation(fields: [badgeId], references: [id])

  @@unique([userId, badgeId])
}
```

### Photo & Gallery (Lines 1800-1950)
```prisma
model Photo {
  id                String   @id @default(uuid())
  userId            String
  blobUrl           String
  thumbnailUrl      String?
  moderationStatus  String   @default("pending")
  uploadedAt        DateTime @default(now())

  user              User          @relation(fields: [userId], references: [id])
  galleries         PhotoGallery[]
}

model PhotoGallery {
  id      String   @id @default(uuid())
  userId  String
  photoId String
  addedAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id])
  photo   Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)

  @@unique([userId, photoId])
}
```

## Common Schema Tasks

### Adding a New Model
**Workflow:**
```bash
# 1. Edit schema.prisma - add new model
model NewFeature {
  id        String   @id @default(uuid())
  userId    String
  data      String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
}

# 2. Create migration
cd backend
npx prisma migrate dev --name "add_new_feature_model"

# 3. Review generated SQL
cat prisma/migrations/YYYYMMDD_add_new_feature_model/migration.sql

# 4. Generate Prisma Client
npx prisma generate

# 5. Test TypeScript compilation
npm run build

# 6. Commit migration files
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: Add NewFeature model"
git push origin development
```

### Adding a Field to Existing Model
**Workflow:**
```bash
# 1. Edit schema.prisma - add field to model
model User {
  // ... existing fields
  newField String?  // Optional to avoid data migration issues
}

# 2. Create migration with descriptive name
npx prisma migrate dev --name "add_user_new_field"

# 3. For required fields with existing data:
# Option A: Provide default value
newField String @default("default_value")

# Option B: Make nullable, backfill data, then make required
# Step 1: Add as nullable
newField String?
# Run migration
# Step 2: Backfill data via script
# Step 3: Make required in another migration
newField String

# 4. Always commit migrations
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: Add User.newField"
```

### Creating a Relation Between Models
**Workflow:**
```bash
# 1. Edit schema.prisma - add relation fields to BOTH models

# Model A (has foreign key)
model Post {
  // ... existing fields
  categoryId String?
  category   Category? @relation(fields: [categoryId], references: [id])

  @@index([categoryId])  // Index foreign keys for performance
}

# Model B (referenced)
model Category {
  id    String @id @default(uuid())
  name  String @unique
  posts Post[]  // Reverse relation
}

# 2. Create migration
npx prisma migrate dev --name "add_post_category_relation"

# 3. Review SQL - check for foreign key constraints
cat prisma/migrations/.../migration.sql

# Example SQL:
# ALTER TABLE "Post" ADD COLUMN "categoryId" TEXT;
# CREATE INDEX "Post_categoryId_idx" ON "Post"("categoryId");
# ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey"
#   FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL;
```

### Changing an Enum
**Workflow:**
```bash
# 1. Edit schema.prisma - add enum value

# Before:
enum UserRole {
  USER
  ADMIN
}

# After:
enum UserRole {
  USER
  ADMIN
  MODERATOR  // New value
}

# 2. Create migration
npx prisma migrate dev --name "add_moderator_role"

# 3. Generated SQL adds enum value:
# ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

# 4. IMPORTANT: You cannot remove enum values easily in PostgreSQL
# To remove: create new enum, migrate data, drop old enum
```

## Migration Best Practices

### 1. Descriptive Migration Names
✅ **GOOD:**
- `add_quest_badge_tables`
- `add_user_profile_bio_field`
- `fix_photo_cascade_delete`
- `add_notification_preferences`

❌ **BAD:**
- `update` (too vague)
- `changes` (not descriptive)
- `fix` (what fix?)
- `migration` (obviously)

### 2. Atomic Migrations
✅ **GOOD:** One logical change per migration
- Migration 1: Add Quest model
- Migration 2: Add Badge model
- Migration 3: Add relation between Quest and Badge

❌ **BAD:** Bundled unrelated changes
- Migration 1: Add Quest, Badge, Photo, User fields, fix typo, add index

### 3. Index Strategy
**Always index:**
- Foreign keys (userId, postId, etc.)
- Frequently filtered fields (createdAt, status)
- Unique fields (email, username)

**Example:**
```prisma
model Post {
  userId    String
  createdAt DateTime @default(now())
  status    String   @default("active")

  @@index([userId])           // Foreign key
  @@index([createdAt])        // Sorted queries
  @@index([status, userId])   // Composite for filtered user posts
}
```

### 4. Cascading Deletes
**Use `onDelete` strategically:**

```prisma
// Cascade: Delete comments when post deleted
model Comment {
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
}

// Set NULL: Keep post when user deleted (preserve content)
model Post {
  user User @relation(fields: [userId], references: [id], onDelete: SetNull)
}

// Restrict: Prevent deletion if references exist
model Payment {
  user User @relation(fields: [userId], references: [id], onDelete: Restrict)
}
```

## Troubleshooting Schema Issues

### Issue: Migration Already Applied But Tables Don't Exist
**Symptom:** Prisma says migration applied but query fails
**Cause:** Migration tracking out of sync with actual database
**Solution:**
```bash
# Check what tables actually exist
DATABASE_URL="<url>" npx prisma db execute --stdin <<< "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

# If tables missing: Deploy migration manually
DATABASE_URL="<url>" npx prisma migrate deploy

# If tables exist: Mark as applied
DATABASE_URL="<url>" npx prisma migrate resolve --applied <migration-name>
```

### Issue: Column/Table Already Exists
**Symptom:** Migration fails saying object already exists
**Cause:** Manual SQL or `db push` created schema outside migration system
**Solution:**
```bash
# Option A: Mark migration as applied (if schema correct)
DATABASE_URL="<url>" npx prisma migrate resolve --applied <migration-name>

# Option B: Edit migration SQL to use IF NOT EXISTS
# Edit: prisma/migrations/.../migration.sql
CREATE TABLE IF NOT EXISTS "NewTable" (...);
ALTER TABLE "OldTable" ADD COLUMN IF NOT EXISTS "newColumn" TEXT;

# Then deploy
DATABASE_URL="<url>" npx prisma migrate deploy
```

### Issue: Type Mismatch After Migration
**Symptom:** TypeScript errors like "Type 'string | null' is not assignable"
**Cause:** Prisma Client not regenerated after migration
**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate

# Check types in node_modules/.prisma/client/index.d.ts
# Rebuild TypeScript
npm run build
```

## Production Migration Checklist

**Before migrating production:**
- [ ] Backup production database
- [ ] Test migration on development database
- [ ] Test migration on staging database
- [ ] Verify no pending migrations in production
- [ ] Validate schema syntax (`npx prisma validate`)
- [ ] Check for data loss warnings in migration SQL
- [ ] Schedule downtime if needed (for large tables)
- [ ] Notify team of deployment

**Migration commands:**
```bash
# 1. Backup production
az postgres flexible-server backup create \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db \
  --backup-name "pre-migration-$(date +%Y%m%d-%H%M%S)"

# 2. Check migration status
DATABASE_URL="<production-url>" npx prisma migrate status

# 3. Deploy pending migrations
DATABASE_URL="<production-url>" npx prisma migrate deploy

# 4. Verify success
DATABASE_URL="<production-url>" npx prisma migrate status
# Should show: "Database schema is up to date!"
```

## Related Documentation

- **Migration Protocol:** CLAUDE.md lines 463-746 (DATABASE MIGRATION SAFETY PROTOCOL)
- **Complete Schema:** docs/DATABASE_SCHEMA.md (all 94 models documented)
- **API Endpoints:** docs/MASTER_DOCUMENTATION.md section 4 (API uses these models)
- **Prisma Docs:** https://www.prisma.io/docs (official Prisma documentation)

## Quick Commands

**View current schema:**
```bash
cat backend/prisma/schema.prisma
```

**Check migration status:**
```bash
cd backend
npx prisma migrate status
```

**Generate Prisma Client:**
```bash
cd backend
npx prisma generate
```

**View migration history:**
```bash
ls -la backend/prisma/migrations/
```

**Validate schema:**
```bash
cd backend
npx prisma validate
```

## Next Steps

After reading schema documentation, typical workflow:
1. Identify which models are affected by your feature
2. Read their full definitions in schema.prisma
3. Understand relations and constraints
4. Plan migration (additive changes are safer)
5. Follow migration protocol in CLAUDE.md
6. Test on development first, then staging, then production

---

**Last Updated:** October 2025
**Total Models:** 94
**Database:** PostgreSQL (Azure Postgres Flexible Server)
