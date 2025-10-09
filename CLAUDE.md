# UnitedWeRise Development Reference

## Terminology

Main = main branch = production = www site/server
Dev = development branch = staging = dev site/server

---

## Tier 1: Project-Specific Core Rules

**Modular architecture:**
All web development uses ES6 modules. No inline scripts in HTML files.
- No `<script>` blocks in index.html
- No inline event handlers (onclick, etc.)
- Create modules in appropriate directories
- Use addEventListener for events
- Export/import through main.js dependency chain

**Admin-only debugging:**
Use admin debug functions: `adminDebugLog()`, `adminDebugError()`, `adminDebugWarn()`, `adminDebugTable()`, `adminDebugSensitive()`

**Branch workflow:**
You work on whatever branch is currently active. Never ask about or suggest branch changes. User has exclusive control over branches.

Current workflow:
- development branch → staging environment (dev.unitedwerise.org)
- main branch → production environment (www.unitedwerise.org)

**CRITICAL: Database isolation**
Always verify which database before migrations:
```bash
echo $DATABASE_URL | grep -o '@[^.]*'
# Must show @unitedwerise-db-dev for safe development
```
- Production: unitedwerise-db.postgres.database.azure.com
- Development: unitedwerise-db-dev.postgres.database.azure.com

---

## Environment Configuration

**Production:**
- Backend: https://api.unitedwerise.org
- Frontend: https://www.unitedwerise.org
- Admin: https://www.unitedwerise.org/admin-dashboard.html

**Staging (admin-only):**
- Backend: https://dev-api.unitedwerise.org
- Frontend: https://dev.unitedwerise.org
- Admin: https://dev.unitedwerise.org/admin-dashboard.html

**Azure Resources:**
- Registry: uwracr2425
- Resource Group: unitedwerise-rg
- Production Backend: unitedwerise-backend
- Staging Backend: unitedwerise-backend-staging

**Key Variables:**
```
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
GOOGLE_CLIENT_ID=496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com
```

---

## Tier 2: Deployment Procedures

<details>
<summary><b>Pre-deployment validation</b></summary>

```bash
git status
cd backend && npm run build
cd backend && npx prisma validate && npx prisma generate
git log origin/<current-branch>..HEAD
```
</details>

<details>
<summary><b>Deploy to staging</b></summary>

```bash
# From whatever branch is currently active
git pull origin <current-branch>
git add . && git commit -m "feat: description"
git push origin <current-branch>

# If on development branch, changes auto-deploy to staging
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```
</details>

<details>
<summary><b>Backend Docker deployment to staging</b></summary>

```bash
# Requires being on development branch
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-dev-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend

sleep 180
az acr task list-runs --registry uwracr2425 --output table | head -3

DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "stg-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars \
    NODE_ENV=staging \
    STAGING_ENVIRONMENT=true \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single

sleep 30
curl -s "https://dev-api.unitedwerise.org/health" | grep releaseSha
```
</details>

<details>
<summary><b>Production deployment</b></summary>

**Only execute when user explicitly approves production deployment.**

Full production deployment procedure → See `.claude/guides/production-deployment.md`

Quick reference:
```bash
git checkout main && git pull origin main
git merge development && git push origin main

# Build, deploy, verify
# Follow production-deployment.md for complete steps
```
</details>

<details>
<summary><b>Database schema changes</b></summary>

```bash
cd backend

# CRITICAL: Verify development database
echo $DATABASE_URL | grep -o '@[^.]*'

npx prisma migrate dev --name "description"
npx prisma generate
npm run build

git add . && git commit -m "schema: description"
git push origin <current-branch>
```

Full database migration protocol → See `.claude/guides/database-migration-protocol.md`
</details>

<details>
<summary><b>Deployment failure diagnosis</b></summary>

When deployments get stuck or deployed code doesn't match local code → See `.claude/guides/deployment-failure-diagnosis.md` for 8-step diagnostic workflow.

Quick check:
```bash
# Verify local commits pushed
git log origin/<current-branch>..HEAD  # Should be empty

# Check deployment status
gh run list --branch <current-branch> --limit 5

# Verify deployed SHA matches local
curl -s "https://dev-api.unitedwerise.org/health" | grep releaseSha
git rev-parse --short HEAD
```
</details>

---

## AI Documentation Reference Protocol

**CRITICAL FOR CLAUDE CODE:** Before implementing features, Claude MUST read relevant documentation files. This section defines when to automatically reference which documentation.

### Feature Implementation Triggers

When user mentions these keywords, Claude must read the specified documentation BEFORE implementing:

**Quest, Badge, Streak, Gamification, Civic Engagement:**
→ REQUIRED READING:
1. `docs/CIVIC_ENGAGEMENT.md` (sections 1-3: philosophy & design rationale)
2. `docs/API_QUESTS_BADGES.md` (complete API endpoint documentation)
3. `backend/src/routes/quests.ts` (current quest implementation)
4. `backend/src/routes/badges.ts` (current badge implementation)
5. `backend/prisma/schema.prisma` (lines 2504-2598: Quest/Badge models)

**Photo, Gallery, Image Upload, Content Moderation:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (sections 2-3: photo system)
2. `backend/src/routes/galleries.ts` (gallery endpoints)
3. `backend/src/routes/photos.ts` (photo upload & moderation)
4. `backend/prisma/schema.prisma` (Photo, PhotoGallery models)

**Saved Posts, Bookmarks, Save for Later:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (section 1: saved posts)
2. `backend/src/routes/posts.ts` (lines 1958-2164: saved post endpoints)
3. `backend/prisma/schema.prisma` (SavedPost model)

**Database Schema, Models, Relations, Migration:**
→ REQUIRED READING:
1. `docs/DATABASE_SCHEMA.md` (find relevant model group)
2. `backend/prisma/schema.prisma` (actual schema definition)
3. `.claude/guides/database-migration-protocol.md` (migration workflow)

**Feed, Posts, Comments, Reactions:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (sections 11-13: Feed System)
2. `backend/src/routes/posts.ts` (post endpoints)
3. `backend/src/routes/comments.ts` (comment endpoints)
4. `backend/prisma/schema.prisma` (Post, Comment, Reaction models)

**API Endpoints, REST API, Backend Routes:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 4: API Reference)
2. Relevant route file in `backend/src/routes/`
3. `backend/src/middleware/` (authentication, validation)

**Authentication, Login, JWT, OAuth, Google Sign-In:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 7: Authentication)
2. `backend/src/routes/auth.ts` (auth endpoints)
3. `backend/src/middleware/authMiddleware.ts` (auth logic)
4. `frontend/src/js/auth.js` (frontend auth)

**Frontend Components, UI, JavaScript Modules:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 8: Frontend Architecture)
2. `frontend/src/js/main.js` (module load order)
3. Relevant component file in `frontend/src/js/components/`

### Implementation Workflow

1. **User mentions feature** → Identify trigger keywords above
2. **Read documentation** → Follow REQUIRED READING list for that feature
3. **Find existing patterns** → Search codebase for similar implementations
4. **Implement feature** → Follow established patterns and architecture
5. **Update documentation** → If adding new endpoints or changing behavior

### Why This Matters

Without this protocol, Claude tends to:
- Grep codebase for patterns (misses design rationale)
- Implement based on code inference (misses system philosophy)
- Create inconsistent solutions (doesn't follow established patterns)

With this protocol, Claude will:
- Understand WHY systems work the way they do
- Follow established architectural patterns
- Create consistent, maintainable implementations
- Reduce technical debt and rework

---

## Tier 3: Reference Material

### Project Architecture

**Frontend:**
- Entry point: `frontend/src/js/main.js`
- ES6 modules with import/export
- Environment detection: `frontend/src/utils/environment.js`
- API config: `frontend/src/config/api.js`
- Load order: Core → Config → Integration → Components → App

**Backend:**
- TypeScript with Prisma ORM
- Express API server
- JWT + OAuth (Google) authentication
- Azure Blob Storage for files
- Azure OpenAI for AI features

**Environment detection:**
- Frontend: Based on `window.location.hostname`
  - `dev.unitedwerise.org` → development
  - `www.unitedwerise.org` → production
- Backend: Based on `NODE_ENV`
  - `NODE_ENV=staging` → staging behavior
  - `NODE_ENV=production` → production behavior

### Multi-Agent Coordination

See `.claude/guides/multi-agent-patterns.md` for detailed workflows.

**Coordination files:**
```
.claude/scratchpads/DEVELOPMENT-LOG.md
.claude/scratchpads/API-CHANGES.md
.claude/scratchpads/FRONTEND-PROGRESS.md
.claude/scratchpads/TESTING-STATUS.md
.claude/scratchpads/REVIEW-LOG.md
```

**Use multi-agent for:**
- Features spanning frontend + backend + database
- Emergency response with parallel debugging
- Performance optimization with benchmarking
- Security-sensitive authentication changes

### Protected Documentation

Never archive or mark obsolete:
- MASTER_DOCUMENTATION.md
- CHANGELOG.md
- README.md
- SYSTEM-ARCHITECTURE-DESIGN.md
- INCIDENT_RESPONSE.md
- PERFORMANCE_BASELINE.md
- PRODUCTION-ENV-TEMPLATE.md

### Common Commands

**Daily workflow:**
```bash
# Update current branch
git pull origin <current-branch>

# Deploy to staging (from development branch)
git add . && git commit -m "feat: changes"
git push origin development

# Check deployment
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime

# TypeScript check
cd backend && npm run build

# Database safety check
bash scripts/check-database-safety.sh
cd backend && node test-db-isolation.js
```

**Emergency procedures:**
```bash
# Backend restart
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix emergency-$(date +%m%d-%H%M)

# Rollback
git revert HEAD && git push origin <current-branch>

# Database restore
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "2025-MM-DDTHH:MM:00Z"
```

---

## Tier 4: Architecture Context

See `.claude/guides/architecture-notes.md` for:
- Inline code elimination history (September 2025)
- Staging architecture rationale
- API response structure quirks
- Branch control rationale
- JWT authentication architecture
- Admin debug logging system
- Database isolation strategy
- Frontend build process

---

## External Guides

- **Common Code Patterns**: `.claude/guides/common-patterns.md`
- **Multi-Agent Workflows**: `.claude/guides/multi-agent-patterns.md`
- **Database Migrations**: `.claude/guides/database-migration-protocol.md`
- **Deployment Diagnosis**: `.claude/guides/deployment-failure-diagnosis.md`
- **Production Deployment**: `.claude/guides/production-deployment.md`
- **Architecture Notes**: `.claude/guides/architecture-notes.md`
