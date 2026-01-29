# UnitedWeRise Development Reference
**Version 4.0 - Phase-Based Protocol System**

---

## 🔒 Environment-Branch Mapping (NEVER VIOLATE)

**THIS RULE IS ABSOLUTE AND INVIOLABLE:**

## Terminology

**Main** = main branch = production = www site/server
**Dev** = development branch = staging = dev site/server
- "Merge to main/dev" or "Deploy to main/dev" = initialize & use `.claude/protocols/deployment_protocol.md`

- **Development branch** === **Staging environment** (dev.unitedwerise.org / dev-api.unitedwerise.org)
  - Staging ONLY EVER runs development branch code
  - If staging is not running development code, it is WRONG and must be fixed immediately

- **Main branch** === **Production environment** (www.unitedwerise.org / api.unitedwerise.org)
  - Production ONLY EVER runs main branch code
  - If production is not running main code, it is WRONG and must be fixed immediately

**There are NO exceptions to this rule. ANY deviation means something is broken.**

If backend health endpoint shows a mismatch (e.g., staging showing "main" branch), this indicates:
1. A bug in the health endpoint reporting
2. An accidental deployment to wrong environment
3. An emergency that must be corrected immediately

**Always assume staging = development and production = main. Period.**

**A change is not testable by the user until it is committed and deployed.**

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

**For templates and requirements**: See `.claude/protocols/document_protocol.md`

### DevLog Generation

**Trigger:** Significant work sessions (complexity 9+ OR explicit design discussion)

**Process:**
1. **Plan phase**: Flag "DevLog summary needed: Yes" and capture user intent
2. **Document phase**: Generate `docs/devlogs/YYYY-MM-DD-topic.md` from plan notes
3. **Deploy phase**: Devlog committed with feature code

### User Settings Pattern Guidelines

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Dedicated Boolean column** | Simple on/off toggles queried frequently | `photoTaggingEnabled` |
| **JSON field** | Grouped settings, UI preferences | `notificationPreferences` |
| **Relation table** | Need metadata, analytics, many-to-many | `MOTDDismissal` |

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
- `requireAuth` - Basic authentication (all environments)
- `requireStagingAuth` - Environment-aware (staging=admin-only, production=regular users)
- `requireAuth + requireAdmin` - Always admin-only (all environments)

**For implementation details**: See `.claude/protocols/auth_protocol.md`

---

## 📚 Project Protocol Reference

### Project-Specific Protocols:

**Deployment Operations** (🔒 PROTECTED)
- **Keywords**: deploy, push to production, merge to main, staging deployment
- **Protocol**: `.claude/protocols/deployment_protocol.md`

**Deployment Problems/Issues**
- **Keywords**: deployment stuck, wrong SHA, changes not visible
- **Protocol**: `.claude/protocols/deployment_troubleshooting_protocol.md`

**Authentication & Authorization**
- **Keywords**: admin endpoint, auth middleware, `requireAuth`, `requireStagingAuth`
- **Protocol**: `.claude/protocols/auth_protocol.md`

---

## 🔒 Investigation-Action-Verification Protocol

**Never assume, always verify. Changes aren't done until tested.**

### Investigation Phase
- Read actual implementation, never guess/assume
- **Integrations**: Read BOTH sides of interface
- **System features**: Read specs/docs before using
- **Infrastructure**: Check limits/constraints before setting values

### Verification Phase
1. `git diff` - verify changes saved to files
2. Deploy to staging
3. Test EXACT symptom user reported
4. Only claim "fixed" when symptom is GONE

### Quick Reference - Common Gotchas
- **API paths**: Check backend route registration in `backend/src/server.ts`
- **HttpOnly cookies**: Backend sets them, browser sends automatically. Verify auth by calling `/auth/me`, not by checking cookies.
- **Azure timeout**: Container Apps idle = 5 min (refresh intervals must be < 5 min)

---

## AI Documentation Reference Protocol

**CRITICAL**: Before implementing features, Claude MUST read relevant documentation files.

### Feature Implementation Triggers

**Quest, Badge, Streak, Gamification, Civic Engagement:**
→ REQUIRED READING:
1. `docs/CIVIC_ENGAGEMENT.md` (sections 1-3)
2. `docs/API_QUESTS_BADGES.md`
3. `backend/src/routes/quests.ts`
4. `backend/src/routes/badges.ts`
5. `backend/prisma/schema.prisma` (Quest/Badge models)

**Photo, Gallery, Image Upload, Content Moderation:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (sections 2-3)
2. `backend/src/routes/galleries.ts`
3. `backend/src/routes/photos/index.ts`
4. `backend/prisma/schema.prisma` (Photo model)

**Saved Posts, Bookmarks:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (section 1)
2. `backend/src/routes/posts.ts` (saved post endpoints)
3. `backend/prisma/schema.prisma` (SavedPost model)

**Database Schema, Models, Relations, Migration:**
→ REQUIRED READING:
1. `docs/DATABASE_SCHEMA.md`
2. `backend/prisma/schema.prisma`
3. Database migration safety protocol (this file)

**Feed, Posts, Comments, Reactions:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (sections 11-13)
2. `backend/src/routes/posts.ts`
3. `backend/prisma/schema.prisma` (Post, Comment, Reaction)

**API Endpoints, REST API, Backend Routes:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 4)
2. Relevant route file in `backend/src/routes/`
3. `backend/src/middleware/`

**Authentication, Login, JWT, OAuth:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 7)
2. `backend/src/routes/auth.ts`
3. `backend/src/middleware/auth.ts`
4. `frontend/src/handlers/auth-handlers.js`

**Frontend Components, UI, JavaScript Modules:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 8)
2. `frontend/src/js/main.js`
3. Relevant component file in `frontend/src/js/components/`

---

## Active Feature Plans

| Feature | Plan | Phase | Status |
|---------|------|-------|--------|
| Organizations | `.claude/plans/organizations-endorsements-plan.md` | 3 (Frontend) | COMPLETE (3a-3i) |

**Index Maintenance** (standing permission granted):
- **Add entry**: When creating a new multi-phase feature plan
- **Update status**: When completing a phase or sub-phase
- **Remove entry**: When feature is 100% complete AND plan archived

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

---

## Protected Documentation

ALWAYS consult when conducting research:
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
- Inline code elimination history
- Staging architecture rationale
- API response structure quirks
- JWT authentication architecture
- Admin debug logging system
- Database isolation strategy

---

## External Guides

- **Common Code Patterns**: `.claude/guides/common-patterns.md`
- **Multi-Agent Workflows**: `.claude/guides/multi-agent-patterns.md`
- **Architecture Notes**: `.claude/guides/architecture-notes.md`
