# Deployment & Database Migration Policy

**Version:** 1.0
**Date:** 2025-10-22
**Status:** MANDATORY - Zero Tolerance for Violations

---

## Core Principle

**Every code deployment MUST be preceded by database migrations being applied.**

This is not optional. This is not negotiable. Database schema mismatches cause production incidents.

---

## The Problem (Historical Context)

### Incidents Caused by Missing Migrations

1. **October 22, 2025** - Visitor Analytics 500 Error
   - 4 pending migrations not applied to production
   - `AnalyticsConfig` table missing → 500 errors
   - Visitor analytics completely broken
   - Required emergency manual migration

2. **October 3, 2025** - Photo Quest Badge System Failure
   - Quest/Badge tables missing in production
   - Features deployed without schema
   - Manual intervention required

3. **Multiple other incidents** throughout development

### Root Cause

Deployment workflows automated code deployment but **NOT database migrations**, creating a systematic gap where:
- ✅ Code changes → Automatically deployed
- ❌ Schema changes → Forgotten/skipped
- 💥 Result → Production incidents

---

## The Solution (Automated Migration Pipeline)

### New Workflow Order

```
1. Build Docker Image (new code ready)
2. Apply Database Migrations (schema updated) ← CRITICAL STEP
3. Deploy Container (new code runs on correct schema)
4. Verify Deployment (health checks pass)
```

**Key Insight:** Migrations run BEFORE deployment means:
- Schema is ready when new code starts
- Migration failures abort deployment (old code keeps running)
- Zero-downtime, safe deployment process

### Implementation

Both `backend-staging-autodeploy.yml` and `backend-production-autodeploy.yml` now include:

```yaml
- name: Setup Node.js for Database Migrations
  uses: actions/setup-node@v4
  with:
    node-version: '20'

- name: Install Prisma CLI
  run: |
    cd backend
    npm install prisma@latest --no-save

- name: Run Database Migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_PRODUCTION }}  # or STAGING
  run: |
    cd backend

    echo "📊 Checking migration status..."
    npx prisma migrate status || true

    echo "🔄 Applying pending migrations..."
    npx prisma migrate deploy

    echo "✅ Verifying migrations applied..."
    npx prisma migrate status

    if npx prisma migrate status | grep -q "Database schema is up to date"; then
      echo "✅ All migrations successfully applied!"
    else
      echo "❌ Migration verification failed!"
      exit 1  # ABORT DEPLOYMENT
    fi
```

---

## Required GitHub Secrets

These secrets MUST be configured in the repository:

### Staging
- **Secret Name:** `DATABASE_URL_STAGING`
- **Value:** `postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db-dev.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require`

### Production
- **Secret Name:** `DATABASE_URL_PRODUCTION`
- **Value:** `postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require`

### How to Add Secrets

1. Go to GitHub repository settings
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Add both `DATABASE_URL_STAGING` and `DATABASE_URL_PRODUCTION`

---

## Migration Safety Guarantees

### 1. Fail-Fast Behavior
If migrations fail, deployment is ABORTED:
- Old container continues running
- No downtime for users
- Clear error message in GitHub Actions
- Manual intervention required to fix

### 2. Forward-Only Philosophy
Prisma migrations are designed to be forward-only:
- Migrations cannot be "rolled back" automatically
- If deployment fails post-migration, fix forward (not back)
- This matches industry best practice

### 3. Verification Built-In
Every migration step includes verification:
- `prisma migrate status` BEFORE (shows pending)
- `prisma migrate deploy` (applies changes)
- `prisma migrate status` AFTER (confirms applied)
- Exit code 1 if verification fails

---

## Policy Enforcement

### MUST Requirements

1. **GitHub Actions Workflows:**
   - MUST include migration step
   - MUST run BEFORE container deployment
   - MUST verify migrations applied successfully
   - MUST abort deployment on failure

2. **Manual Deployments:**
   - MUST run `prisma migrate deploy` before deploying code
   - MUST verify with `prisma migrate status`
   - MUST never skip "because it's just a small change"

3. **Emergency Hotfixes:**
   - Still MUST follow migration-first principle
   - No exceptions for urgency
   - Schema mismatches cause MORE incidents

### MUST NOT Violations

1. **Never skip migrations because:**
   - "There are no schema changes" (verify, don't assume)
   - "It's just a frontend change" (backend might have pending migrations from another PR)
   - "We're in a hurry" (creates MORE urgency when things break)
   - "I'll do it later" (you won't, and production will break)

2. **Never use `db push` for production:**
   - Bypasses migration system
   - Loses migration history
   - Cannot be verified in CI/CD
   - Causes drift between environments

---

## Verification Checklist

Before merging ANY pull request that touches backend code:

- [ ] Run `npx prisma migrate status` locally
- [ ] Verify all migrations have been created
- [ ] Check that migrations follow naming convention: `YYYYMMDD_description`
- [ ] Confirm GitHub secrets exist: `DATABASE_URL_STAGING` and `DATABASE_URL_PRODUCTION`
- [ ] Verify GitHub Actions workflow includes migration steps
- [ ] Review migration SQL for safety (no DROP TABLE without backups)

---

## Troubleshooting

### Workflow Fails: "Migration already applied"

This is actually GOOD - it means the schema is up to date. No action needed.

### Workflow Fails: "Table already exists"

Schema drift detected. Fix:
```bash
cd backend
DATABASE_URL="<production-url>" npx prisma migrate resolve --applied <migration-name>
```

### Workflow Fails: "Migration failed: syntax error"

Migration SQL has errors. Fix:
1. Review migration file
2. Fix SQL syntax
3. Create new migration with fix
4. Push to trigger deployment again

### Manual Migration Needed

Only in emergencies:
```bash
cd backend
DATABASE_URL="<production-url>" npx prisma migrate deploy
DATABASE_URL="<production-url>" npx prisma migrate status  # Verify
```

---

## Consequences of Violations

### Immediate
- Production 500 errors
- Feature outages
- Emergency manual interventions
- User-facing incidents

### Long-term
- Schema drift between environments
- Untestable database state
- Increased technical debt
- Loss of deployment confidence

---

## Document Maintenance

This policy MUST be updated when:
- Deployment workflows change
- New environments are added
- Migration tooling changes (e.g., switching from Prisma)

**Last Updated:** 2025-10-22 by Claude Code (Automated Migration Implementation)
