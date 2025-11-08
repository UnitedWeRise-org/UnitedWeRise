# UnitedWeRise Development Reference
**Version 3.0 - Modularized with Protocol System**

> **Protection System**: Sections marked with 🔒 are PROTECTED and must not be modified without explicit user approval. See Global CLAUDE.md for priority hierarchy.

---

## 🔒 Environment-Branch Mapping (NEVER VIOLATE)

**THIS RULE IS ABSOLUTE AND INVIOLABLE:**

## Terminology

**Main** = main branch = production = www site/server
**Dev** = development branch = staging = dev site/server
- "Merge to main/dev" or "Deploy to main/dev" = initialize & use `.claude/protocols/deployment-procedures.md`

- **Development branch** === **Staging environment** (dev.unitedwerise.org / dev-api.unitedwerise.org)
  - Staging ONLY EVER runs development branch code
  - If staging is not running development code, it is WRONG and must be fixed immediately

- **Main branch** === **Production environment** (www.unitedwerise.org / api.unitedwerise.org)
  - Production ONLY EVER runs main branch code
  - If production is not running main code, it is WRONG and must be fixed immediately

**There are NO exceptions to this rule. ANY deviation means something is broken.**

If backend health endpoint or any monitoring shows a mismatch (e.g., staging showing "main" branch), this indicates:
1. A bug in the health endpoint reporting
2. An accidental deployment to wrong environment
3. An emergency that must be corrected immediately

**Always assume staging = development and production = main. Period.**

---

## Project-Specific Core Rules

### Admin Debugging
Use admin debug functions only: `adminDebugLog()`, `adminDebugError()`, `adminDebugWarn()`, `adminDebugTable()`, `adminDebugSensitive()`

### Branch Selection Protocol
If on `main` for hotfixes or at user direction, stay on main. Otherwise prompt to switch to `development`.

### 🔒 Database Migration Safety (ZERO TOLERANCE)

**CRITICAL:** See `docs/DEPLOYMENT-MIGRATION-POLICY.md` for complete policy.

**Core Rule:** Database migrations MUST be applied BEFORE code deployment. No exceptions.

**Automated in GitHub Actions:** Staging and production workflows run `prisma migrate deploy` before deploying container. Deployment ABORTS if migrations fail.

**NEVER** use `prisma db push` for production or permanent changes.

**Database URLs:** Production (unitedwerise-db), Staging (unitedwerise-db-dev)

### Inline Documentation Requirements

**PROJECT POLICY**: ALL code requires inline documentation. Code without docs is INCOMPLETE.

**Required:** Backend (Swagger + JSDoc), Prisma (/// comments), Frontend (JSDoc).

**Process:** READ implementation → FIND similar documented code → VERIFY match → CHECK consistency.

**For templates and requirements**: See `.claude/protocols/documentation-requirements.md`

---

## Environment Configuration

### Production
- Backend: https://api.unitedwerise.org
- Frontend: https://www.unitedwerise.org
- Admin: https://admin.unitedwerise.org

### Staging (Admin-Only)
- Backend: https://dev-api.unitedwerise.org
- Frontend: https://dev.unitedwerise.org
- Admin: https://dev-admin.unitedwerise.org

### Azure Resources
- Registry: uwracr2425
- Resource Group: unitedwerise-rg
- Production Backend: unitedwerise-backend
- Staging Backend: unitedwerise-backend-staging

### Key Variables
```
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
GOOGLE_CLIENT_ID=496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com
```

---

## Environment-Aware Authentication

Backend implements environment-aware auth: Production allows regular users, Staging/Dev requires admin-only.

**Middleware patterns:**
- `requireAuth` - Basic authentication (all environments allow authenticated users)
- `requireStagingAuth` - Environment-aware (staging=admin-only, production=regular users)
- `requireAuth + requireAdmin` - Always admin-only (all environments)

**Usage:** Admin features use `requireStagingAuth`, security-critical use `requireAdmin`, user features use `requireAuth`.

**For implementation details and testing**: See `.claude/protocols/environment-auth-guide.md`

---

## 📚 Protocol Reference System

**Before starting ANY tasks**: Check if relevant protocol exists.

### Protocol Check Workflow:
1. **Identify keywords/situation** from list below
2. **Read protocol's "When to Use" section** (lightweight check)
3. **If relevant, load and follow complete protocol**

### Protocol Index:

**Deployment Operations**
- **Keywords**: deploy, push to production, merge to main, staging deployment
- **Protocol**: `.claude/protocols/deployment-procedures.md` (🔒 PROTECTED)
- **Use when**: Deploying to staging or production environments

**Deployment Problems/Issues**
- **Keywords**: deployment stuck, wrong SHA, changes not visible, health check fails
- **Protocol**: `.claude/protocols/deployment-troubleshooting.md`
- **Use when**: Deployment completed but something is wrong

**Authentication & Authorization**
- **Keywords**: admin endpoint, auth middleware, `requireAuth`, `requireStagingAuth`, environment-aware auth
- **Protocol**: `.claude/protocols/environment-auth-guide.md`
- **Use when**: Implementing admin features or auth-protected endpoints

**Code Documentation**
- **Keywords**: Swagger, JSDoc, endpoint documentation, Prisma comments, API docs, CHANGELOG, MASTER_DOCUMENTATION updates
- **Protocol**: `.claude/protocols/documentation-requirements.md`
- **Use when**: Documenting new endpoints, services, schema changes, or any code changes requiring documentation

**Verification & Quality Control**
- **Keywords**: verify deployment, test after changes, post-deployment checks
- **Protocol**: `.claude/protocols/verification-checklists.md`
- **Use when**: After any deployment or code change

---

**When uncertain if protocol applies**: Check it anyway. Reading "When to Use" section is lightweight.

**Global protocols**: See Global CLAUDE.md Protocol Reference System for additional protocols (ES6 modularization, decision frameworks, etc.)

---

## 🔒 Investigation-Action-Verification Protocol

**Never assume, always verify. Changes aren't done until tested.**

### Investigation Phase
Before any code changes:
- Read actual implementation, never guess/assume
- **Integrations** (API, auth, webhooks): Read BOTH sides of interface
- **System features**: Read specs/docs before using
- **Infrastructure**: Check limits/constraints before setting values

### Verification Phase
After code changes:
1. `git diff` - verify changes saved to files
2. Deploy to staging
3. Test EXACT symptom user reported (not just "it compiles")
4. Only claim "fixed" when symptom is GONE

**If symptom persists → wrong diagnosis, return to Investigation**

### Quick Reference - Common Gotchas
- **API paths**: Check backend route registration in `backend/src/server.ts` before changing endpoint paths
- **HttpOnly cookies**: Backend sets them, browser sends automatically. Never check `document.cookie` for auth tokens (security hides them from JS). Verify auth by calling `/auth/me`, not by checking cookies.
- **Azure timeout**: Container Apps idle = 5 min (refresh intervals must be < 5 min)
- **Auth verification**: Call `/auth/me` endpoint, don't check cookies directly

---

## AI Documentation Reference Protocol

**CRITICAL**: Before implementing features, Claude MUST read relevant documentation files.

### Feature Implementation Triggers

When user mentions these keywords, read specified documentation BEFORE implementing:

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
3. `backend/src/routes/photos/index.ts` (photo upload & moderation)
4. `backend/prisma/schema.prisma` (Photo model)

**Saved Posts, Bookmarks, Save for Later:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (section 1: saved posts)
2. `backend/src/routes/posts.ts` (lines 1958-2164: saved post endpoints)
3. `backend/prisma/schema.prisma` (SavedPost model)

**Database Schema, Models, Relations, Migration:**
→ REQUIRED READING:
1. `docs/DATABASE_SCHEMA.md` (find relevant model group)
2. `backend/prisma/schema.prisma` (actual schema definition)
3. Database migration safety protocol (this file, above)

**Feed, Posts, Comments, Reactions:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (sections 11-13: Feed System)
2. `backend/src/routes/posts.ts` (post endpoints - includes comment endpoints)
3. `backend/prisma/schema.prisma` (Post, Comment, Reaction models)

**API Endpoints, REST API, Backend Routes:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 4: API Reference)
2. Relevant route file in `backend/src/routes/`
3. `backend/src/middleware/` (authentication, validation)

**Authentication, Login, JWT, OAuth, Google Sign-In:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 7: Authentication)
2. `backend/src/routes/auth.ts` (auth endpoints)
3. `backend/src/middleware/auth.ts` (auth logic)
4. `frontend/src/handlers/auth-handlers.js` (frontend auth)

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

---

## Project Architecture

### Frontend
- Entry point: `frontend/src/js/main.js`
- ES6 modules with import/export
- Environment detection: `frontend/src/utils/environment.js`
- API config: `frontend/src/config/api.js`
- Load order: Core → Config → Integration → Components → App

### Backend
- TypeScript with Prisma ORM
- Express API server
- JWT + OAuth (Google) authentication
- Azure Blob Storage for files
- Azure OpenAI for AI features

### Environment Detection
- Frontend: Based on `window.location.hostname`
  - `dev.unitedwerise.org` → development
  - `www.unitedwerise.org` → production
- Backend: Based on `NODE_ENV`
  - `NODE_ENV=staging` → staging behavior
  - `NODE_ENV=production` → production behavior

---

## Multi-Agent Coordination

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

---

## Protected Documentation

ALWAYS consult when conducting research (Never archive or mark obsolete):
- MASTER_DOCUMENTATION.md
- CHANGELOG.md
- README.md
- SYSTEM-ARCHITECTURE-DESIGN.md
- INCIDENT_RESPONSE.md
- PERFORMANCE_BASELINE.md
- PRODUCTION-ENV-TEMPLATE.md

---

## Common Commands

### Daily Workflow
```bash
git pull origin <current-branch>
git add . && git commit -m "feat: changes"
git push origin development
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
cd backend && npm run build
bash scripts/check-database-safety.sh
```

### Emergency Procedures
```bash
# Backend restart
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix emergency-$(date +%m%d-%H%M)

# Database restore
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "2025-MM-DDTHH:MM:00Z"
```

---

## Architecture Context

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
- **Architecture Notes**: `.claude/guides/architecture-notes.md`
