# UnitedWeRise Development Reference
**Version 5.0 — follows the global archetype (`~/.claude/CLAUDE.md`)**

Project invariants + a Skill-Triggers map. Deep procedures live in skills (lazy-loaded).

---

## 🔒 Environment / Branch Mapping (NEVER VIOLATE)

**This rule is absolute and inviolable:**

- **`development` branch === Staging** — dev.unitedwerise.org / dev-api.unitedwerise.org / dev-admin.unitedwerise.org. Staging ONLY EVER runs development-branch code.
- **`main` branch === Production** — www.unitedwerise.org / api.unitedwerise.org / admin.unitedwerise.org. Production ONLY EVER runs main-branch code.

There are NO exceptions. If a health endpoint shows a mismatch (e.g. staging on "main"), that is a bug or an accidental deploy and must be corrected immediately. Always assume staging=development and production=main.

**A change is not testable by the user until it is committed AND deployed.**

---

## Environments & Azure

| | Backend | Frontend | Admin | Database |
|---|---|---|---|---|
| **Production** | api.unitedwerise.org | www.unitedwerise.org | admin.unitedwerise.org | unitedwerise-db |
| **Staging** | dev-api.unitedwerise.org | dev.unitedwerise.org | dev-admin.unitedwerise.org | unitedwerise-db-dev |

- **Registry:** uwracr2425 · **Resource Group:** unitedwerise-rg
- **Backends:** unitedwerise-backend (prod), unitedwerise-backend-staging
- **Key vars:** `AZURE_OPENAI_ENDPOINT`, `AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425`, `GOOGLE_CLIENT_ID=496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com`

---

## Stack & Architecture

- **Frontend:** ES6 modules (import/export). Entry `frontend/src/js/main.js`. Env detection `frontend/src/utils/environment.js` (by `window.location.hostname`). API config `frontend/src/config/api.js`. Load order: Core → Config → Integration → Components → App.
- **Backend:** TypeScript + Prisma + Express. JWT + Google OAuth. Azure Blob Storage, Azure OpenAI. Env by `NODE_ENV` (`staging` / `production`).

---

## 🔒 Database Migration Safety (ZERO TOLERANCE)

Migrations MUST be applied BEFORE code deployment (automated in GitHub Actions; deploy aborts if migrations fail). **Never** use `prisma db push` for production/permanent changes. DBs: production `unitedwerise-db`, staging `unitedwerise-db-dev`. Full procedure → skill `/deployment`. See `docs/DEPLOYMENT-MIGRATION-POLICY.md`.

## Auth Model

Environment-aware: **production allows regular users; staging/dev is admin-only.** Middleware: `requireAuth` (all envs), `requireStagingAuth` (staging=admin-only, prod=regular), `requireAuth + requireAdmin` (always admin-only). Full patterns → skill `/auth-work`.

---

## 🔒 Investigation-Action-Verification

**Never assume, always verify. Changes aren't done until tested.**
- Read actual implementation; for integrations read BOTH sides; check limits before setting values.
- Verify: `git diff` (saved) → deploy to staging → test the EXACT symptom reported → claim "fixed" only when the symptom is GONE.
- **Gotchas:** API paths — check `backend/src/server.ts` route registration. HttpOnly cookies — backend sets them, browser sends automatically; verify auth via `/auth/me`, not by reading cookies. Azure Container Apps idle timeout = 5 min (refresh intervals must be < 5 min).

---

## Project Skill-Triggers Map

When a trigger matches, invoke the skill (it self-gates and bails if not applicable). The global workflow (`/audit-checklist` → `/plan` → `/test-matrix` → `/documentation-templates`) and its hook also apply.

| When you… | Invoke |
|---|---|
| deploy / merge to main or development | `/deployment` |
| touch auth, login, JWT, OAuth, middleware | `/auth-work` |
| convert inline/legacy JS to ES6 modules | `/es6-migration` |
| debug CSS / layout / positioning / z-index | `/css-debugging` |
| work on quests, badges, streaks, gamification | `/quest-badge-docs` |
| work on photos, galleries, image upload, moderation | `/photo-docs` |
| work on DB schema, models, relations | `/schema-docs` |
| build or change API endpoints | `/api-patterns` |

*(A `UserPromptSubmit` hook injects an auth reminder on auth keywords. Add hooks for `/deployment` if the trigger must fire without fail.)*

---

## Project Conventions

- **Admin debugging only:** `adminDebugLog()`, `adminDebugError()`, `adminDebugWarn()`, `adminDebugTable()`, `adminDebugSensitive()` — never raw `console.log`.
- **Inline docs required** (Backend Swagger + JSDoc, Prisma `///`, Frontend JSDoc) → `/documentation-templates`.
- **DevLog** for significant sessions → `docs/devlogs/YYYY-MM-DD-topic.md` (committed with the feature).
- **User settings:** dedicated boolean column (simple toggles) · JSON field (grouped prefs) · relation table (needs metadata/analytics).
- **Branch selection:** stay on `main` for hotfixes at user direction; otherwise work on `development`.

## Active Feature Plans

| Feature | Plan | Status |
|---|---|---|
| Organizations | `.claude/plans/organizations-endorsements-plan.md` | COMPLETE (3a–3i) |

## Key References

`docs/MASTER_DOCUMENTATION.md`, `CHANGELOG.md`, `docs/DATABASE_SCHEMA.md`, `SYSTEM-ARCHITECTURE-DESIGN.md`, `INCIDENT_RESPONSE.md`. Architecture/pattern reference skills: `/architecture-notes`, `/common-patterns`, `/multi-agent-patterns`, `/sri-maintenance`.

## Common Commands

```bash
# Daily
git add . && git commit -m "feat: ..." && git push origin development
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
cd backend && npm run build

# Emergency backend restart
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg \
  --revision-suffix emergency-$(date +%m%d-%H%M)
```
