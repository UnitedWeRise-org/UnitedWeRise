# Database Migration Safety Protocol

**Last Updated**: 2025-10-09
**Purpose**: Critical workflow for database schema changes to prevent production incidents

---

## ⚠️ CRITICAL RULE

**NEVER USE `prisma db push` FOR PRODUCTION OR PERMANENT CHANGES**

---

## Historical Context: October 3, 2025 Incident

**What happened:**
Quest and Badge tables were created in development using `npx prisma db push`, which bypassed the migration system. When code was deployed to production, the backend expected tables that didn't exist, causing 500 errors across all quest/badge endpoints.

**Root cause:**
Using `db push` creates tables without generating migration files. Production database had no way to know these tables should exist. The migration tracking table (`_prisma_migrations`) was out of sync with the actual database schema.

**Resolution:**
Tables already existed in production (from manual creation), but migration tracking didn't know about them. Fixed by marking migrations as "applied" in the tracking table.

**Lesson learned:**
Always use `prisma migrate dev` for permanent schema changes. Migration files must be committed to git.

---

## Forbidden Commands

❌ **NEVER** use these in production or for permanent schema changes:

```bash
npx prisma db push           # Bypasses migration system, breaks tracking
npx prisma db push --force   # Even worse - accepts data loss
```

❌ **NEVER** run manual SQL directly in production (unless emergency):

```sql
CREATE TABLE ...  -- Creates untracked schema changes
ALTER TABLE ...   -- Modifies schema without migration record
```

❌ **NEVER** edit schema.prisma without creating a migration:

```prisma
model NewTable { ... }  // Must run `prisma migrate dev` after this
```

---

## Required Workflow

### Step 1: Development - Create Schema Changes

```bash
# 1. Edit backend/prisma/schema.prisma
# Add/modify models as needed

# 2. Create migration (REQUIRED)
cd backend
npx prisma migrate dev --name "descriptive_name"

# Example migration names:
# - "add_quest_badge_tables"
# - "add_user_profile_fields"
# - "fix_post_photo_relation"

# 3. Review generated SQL
ls -la prisma/migrations/
cat prisma/migrations/YYYYMMDD_descriptive_name/migration.sql

# 4. Test migration on development database
# Migration was auto-applied by migrate dev
# Verify tables created correctly

# 5. Generate Prisma Client with new types
npx prisma generate

# 6. Verify TypeScript compiles with new schema
npm run build
```

### Step 2: Commit - Save Migration to Git

```bash
# Migration files MUST be committed
git add backend/prisma/migrations/
git add backend/prisma/schema.prisma
git commit -m "feat: Add migration for quest and badge tables"
git push origin development
```

### Step 3: Staging - Auto-Apply via Deployment

```bash
# Staging deployment auto-applies pending migrations
# Monitor deployment: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# Verify migration applied
curl https://dev-api.unitedwerise.org/health
# Should show database:connected

# Test new endpoints
curl https://dev-api.unitedwerise.org/api/quests/daily
# Should return data or auth error (not 500)
```

### Step 4: Production - Manual Migration Application

```bash
# IMPORTANT: Merge to main FIRST
git checkout main
git merge development
git push origin main

# THEN apply migrations to production database
cd backend

# Safety check: Verify current state
DATABASE_URL="<production-url>" npx prisma migrate status

# Apply pending migrations
DATABASE_URL="<production-url>" npx prisma migrate deploy

# Verify application succeeded
DATABASE_URL="<production-url>" npx prisma migrate status
# Should show: "Database schema is up to date!"

# Verify production backend
curl https://api.unitedwerise.org/health
# Should show: database:connected
```

---

## Safety Checks (Run Before Migrating Production)

```bash
# 1. Backup production database FIRST
az postgres flexible-server backup create \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db \
  --backup-name "pre-migration-$(date +%Y%m%d-%H%M%S)"

# 2. Check migration status
DATABASE_URL="<production-url>" npx prisma migrate status

# 3. Validate schema syntax
cd backend && npx prisma validate

# 4. Verify Prisma Client generated
npx prisma generate

# 5. Test migrations on development database first
# (should already be done via migrate dev)
```

---

## Troubleshooting Migration Issues

### Issue: "Migration already applied" error

**Symptom**: Prisma says migration was applied but tables don't exist
**Cause**: Migration tracking out of sync with actual database

**Solution**:

```bash
# Check what tables actually exist
DATABASE_URL="<db-url>" node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT tablename FROM pg_tables WHERE schemaname = 'public'\`
  .then(tables => console.log(tables.map(t => t.tablename)))
  .finally(() => prisma.\$disconnect());
"

# If tables exist: Mark migration as applied
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>

# If tables missing: Run migration manually
DATABASE_URL="<db-url>" npx prisma migrate deploy
```

### Issue: "Column/Table already exists" error

**Symptom**: Migration fails because schema change already exists
**Cause**: Schema change made outside migration system (db push or manual SQL)

**Solution**:

```bash
# Option A: Mark migration as applied (if change is correct)
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>

# Option B: Fix migration SQL (if change is incomplete)
# Edit migration.sql to use CREATE TABLE IF NOT EXISTS
# Then deploy again
```

### Issue: Development and production schemas differ

**Symptom**: Production has tables that dev doesn't (or vice versa)
**Cause**: Someone used db push on one environment

**Solution**:

```bash
# Generate migration from current schema
cd backend
npx prisma migrate dev --name "sync_schemas"

# This creates migration with differences
# Review SQL carefully before applying to production

# Apply to production ONLY after testing on staging
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

---

## Emergency Rollback Procedures

### Rollback Last Migration

```bash
# Mark migration as rolled back (doesn't undo SQL)
DATABASE_URL="<db-url>" npx prisma migrate resolve --rolled-back <migration-name>

# Manually undo changes if needed
# Write reverse SQL and apply carefully
```

### Restore from Backup

```bash
# List available backups
az postgres flexible-server backup list \
  --resource-group unitedwerise-rg \
  --server-name unitedwerise-db

# Restore to new server (safer than in-place)
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "YYYY-MM-DDTHH:MM:00Z"

# Update DATABASE_URL to point to restored server
# Test thoroughly before switching production traffic
```

---

## Daily Development Workflow

```bash
# ✅ CORRECT: Use migrations for all schema changes
cd backend
# 1. Edit schema.prisma
# 2. Run migrate dev
npx prisma migrate dev --name "add_user_settings"
# 3. Commit migration files
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: Add user settings migration"
git push origin development

# ❌ WRONG: Don't use db push for permanent changes
npx prisma db push  # NO! Only for rapid prototyping, never commit result
```

---

## When `db push` IS Acceptable

**ONLY use `db push` for:**
- Rapid prototyping in local development (throwaway work)
- Experimenting with schema designs before committing
- Personal test databases that won't be deployed

**Rules when using `db push`:**
1. Never commit schema.prisma changes without a migration
2. Always create proper migration before pushing to git
3. Never use on staging or production databases
4. Never share schema changes made via db push with team

---

## Migration Best Practices

1. **Descriptive Migration Names**: Use clear, specific names
   - ✅ `add_quest_progress_tracking`
   - ✅ `fix_photo_post_foreign_key`
   - ❌ `update` (too vague)
   - ❌ `changes` (not descriptive)

2. **Review Migration SQL**: Always check generated SQL before committing
   ```bash
   cat prisma/migrations/<migration-name>/migration.sql
   ```

3. **Test Migrations**: Verify migration works on development database first
   ```bash
   npx prisma migrate dev  # Auto-applies to dev DB
   ```

4. **Atomic Migrations**: Keep each migration focused on one logical change
   - ✅ One migration per feature
   - ❌ Don't bundle unrelated schema changes

5. **Backup Before Production**: Always backup production DB before migrating
   ```bash
   az postgres flexible-server backup create \
     --resource-group unitedwerise-rg \
     --name unitedwerise-db \
     --backup-name "pre-migration-$(date +%Y%m%d-%H%M%S)"
   ```

---

## Database Environment URLs

**Note**: Database credentials are stored in environment variables and Azure Key Vault. Never hardcode credentials in files.

**Development Database**: `unitedwerise-db-dev.postgres.database.azure.com`
**Production Database**: `unitedwerise-db.postgres.database.azure.com`

To verify which database you're connected to:
```bash
echo $DATABASE_URL | grep -o '@[^.]*'
# Must show @unitedwerise-db-dev for safe development
```

---

## Related Documentation

- **Database Schema**: `docs/DATABASE_SCHEMA.md`
- **Prisma Schema**: `backend/prisma/schema.prisma`
- **Project CLAUDE.md**: Database isolation section
