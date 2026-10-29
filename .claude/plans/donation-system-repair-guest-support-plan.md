# Donation System Repair + Guest (No-Login) Donation Support

**Status**: Draft — awaiting approval
**Date**: 2026-10-29
**Risk**: Critical (payment + auth + schema change)
**Branch**: development (work and stage here first; production only after explicit command)

---

## What was found (audit summary)

| # | Issue | Verified? | Impact |
|---|-------|-----------|--------|
| 1 | Stripe webhook `POST /api/payments/webhook` blocked by CSRF (403 `CSRF_TOKEN_MISSING`) — global CSRF only exempts `/webhooks/` prefix + an exact list that omits this path. Broken since 2025-10-16 (`877574b`). | Confirmed live on staging | Every completed payment stays `PENDING`; no receipts, no campaign increments, no registration advancement; also breaks verification-credit purchases (same webhook). |
| 2 | Latent webhook bug: global `express.json` at `server.ts:222` consumes the raw stream before the route's `express.raw()` (`payments.ts:627`), so signature verification would fail on an empty buffer even if CSRF were fixed. | Code analysis | Webhook can never succeed (combined with #1). |
| 3 | Recurring donations always 400: frontend sends `donationType: 'MONTHLY'|'YEARLY'`, backend enum allows only `['ONE_TIME','RECURRING','CAMPAIGN_SPECIFIC','GENERAL_SUPPORT','MEMORIAL','HONOR']`. | Code analysis + user repro (prod, monthly/yearly → "Failed to create donation") | Recurring donations impossible. |
| 4 | Recurring `QUARTERLY` maps to `month` with no `interval_count` (`stripeService.ts:698`). | Code analysis | Quarterly → charged monthly. |
| 5 | Donations require login (`requireAuth` on `POST /api/payments/donation`) + Stripe customer tied to `userId`. | Code analysis | Feature request: allow guests. |

Both deployed backends healthy (`staging` = development/1079243, `prod` = main). Branch mapping correct.

---

## Implementation Strategy

### Approach

Two workstreams, sequenced in tandem (they share the `Payment` model, the same endpoint, and the same Stripe flow):

- **Phase 1 — Repair** (small, must land first so the existing logged-in flow works end-to-end).
- **Phase 2 — Guest donations** (DB migration + backend auth change + frontend rework).

Guest design choice: keep the **Payment Links** flow (currently "most adblocker-resistant" per code docs) for both guests and members. For guests we do NOT link to a user account; we create the Stripe customer on the fly, collect email/name in the modal, and set `customer_creation: 'always'` on the payment link so Stripe emails the receipt (and, for recurring, the subscription-management link) to the payer. Logged-in users keep their existing linked-customer behavior so stripeCustomer mapping and future features stay consistent.

`optionalAuth` (`backend/src/middleware/auth.ts:254`, already used by `petitionSigning.ts`/`users.ts`) is the established pattern to use for the endpoint.

**Guest recurring — allowed (user decision).** Payment Links with a recurring price create a Stripe subscription tied to the Stripe customer + email entered at checkout; the payer manages/cancels via Stripe's hosted links. Note: our DB subscription lifecycle sync (`handleSubscriptionUpdate/Cancelled`) is log-only today — this is the *same* limitation members already have, so it is not a regression; optionally we later add `invoice.payment_succeeded` handling to mark recurring `Payment` rows completed. Flagging it explicitly so it's an accepted gap.

**Webhook deployment architecture — user decision: both envs work.** Stripe test and live modes deliver events only to endpoints of the same mode. Register TWO endpoints:
- Test endpoint → `https://dev-api.unitedwerise.org/api/payments/webhook` (secret `whsec_test_...`)
- Live endpoint → `https://api.unitedwerise.org/api/payments/webhook` (secret `whsec_live_...`)

Each webhook secret lives in the matching Azure env; both environments then receive payments end-to-end. Staging runs Stripe **test mode** (test keys + test cards), prod runs **live mode**. This is a Stripe-dashboard + Azure-env configuration task, not code — verify current Azure keys first (see "Config verification" below).

### Phase 0 — Config verification (read-only; needs your Stripe/Azure awareness)
1. Check deployed env vars via `az containerapp show` for `unitedwerise-backend` (prod) and `unitedwerise-backend-staging` (staging): confirm `STRIPE_SECRET_KEY` (sk_test_ vs sk_live_), `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`, `SUCCESS_URL`.
2. In the Stripe dashboard, confirm which webhook endpoints exist and their signing secrets (test vs live).
3. Gap → fix env vars / register endpoints (requires Stripe dashboard action; I can draft the exact `az containerapp update` commands).
4. Frontend: ensure `frontend/src/config/stripe.js` development block uses a real `pk_test_...` key (currently a placeholder) so staging payments work.

### Phase 1 — Repair (code only, no migration)

1. **CSRF exemption for the Stripe webhook**
   - `backend/src/middleware/csrf.ts` → add `'/api/payments/webhook'` to `exemptedPathsExact`.
   - `backend/src/server.ts` → also skip in the global CSRF wrapper (mirror the `/webhooks/` exemption) as defense-in-depth. Root cause fix is in csrf.ts.
2. **Preserve raw body for the webhook route**
   - `backend/src/server.ts` global content-type middleware (line ~211) → skip body parsing when `req.path === '/api/payments/webhook'`, so the route's `express.raw({ type: 'application/json' })` receives the unparsed buffer Stripe signed. (Keep `express.json` for everything else.)
3. **Recurring enum fix (frontend)**
   - `frontend/src/js/donation-system.js` → map one-time → `ONE_TIME`; monthly → `RECURRING` + `recurringInterval: 'MONTHLY'`; yearly → `RECURRING` + `recurringInterval: 'YEARLY'`. Stop sending `MONTHLY`/`YEARLY` as `donationType`.
4. **QUARTERLY fix (backend)**
   - `backend/src/services/stripeService.ts` → pass `interval_count: 3` when interval is quarterly, instead of silently mapping to monthly.
5. **Verification** — after deploy to staging, send a real webhook lookalike? (can't forge Stripe signatures). Instead verify: webhook route returns `400 Missing stripe signature` (proves CSRF no longer 403s and raw body reaches handler). Then trigger a real $1 test donation on staging using Stripe test key and confirm `checkout.session.completed` updates the DB.

### Phase 2 — Guest donations

1. **Data layer** (Prisma migration — HIGH risk, migration-first)
   - `Payment.userId` → `String?` (nullable FK).
   - Add `guestEmail String?`, `guestName String?` to `Payment`.
   - `StripeCustomer.userId` stays required (guests get no DB row; Stripe-side customer only).
   - Generate migration; it MUST be committed and applied before code deploy (CI already enforces migration-first, deploy aborts on failure).
   - Backfill/keep behavior for existing rows (all existing rows have userId, so `DROP NOT NULL` is lossless).
2. **Backend** (`backend/src/routes/payments.ts`, `stripeService.ts`)
   - Switch `POST /api/payments/donation` from `requireAuth` → `optionalAuth`.
   - Body validation: if no authenticated user, require valid `email` (express-validator `.optional()` logic: `email` required when no user). Accept optional `name`.
   - `StripeService.createDonation`: accept `userId` OR `guestEmail`. When guest: create Stripe customer with `{ email, name }` (no `StripeCustomer` DB row), set `customer_creation: 'always'` on the payment link, store `guestEmail/guestName` on the Payment.
   - Receipt generation (`generateReceipt`, `handleCheckoutComplete`) already keys off `stripeChargeId`/metadata, no guest changes needed.
   - Update Swagger/JSDoc for auth + guest params.
3. **Frontend** (`frontend/src/js/donation-system.js`)
   - Remove the `alert('Please log in...')` gate in `openDonationModal`; if `!window.currentUser`, show an inline email (required) + name (optional) field in the modal.
   - Send `email`/`name` with the request for guests; logged-in users send nothing extra.
   - Recurring mapping from Phase 1 shared for both.
4. **Optional — data reconciliation** (existing stuck `PENDING` payments)
   - Add a one-off admin/ops script using the Stripe Search API to find completed Checkout Sessions/PaymentIntents whose metadata `paymentId` is still `PENDING`, and mark them `COMPLETED` + generate receipts. Run as a script, not in a request path. (Ask before running on prod data.)
5. **Documentation**
   - Update `STRIPE-PAYMENT-SYSTEM-DOCUMENTATION.md` (bearer→cookie auth already outdated; add guest flow; fix webhook URL/env notes).
   - Update `MASTER_DOCUMENTATION.md` auth note + endpoint summary for `/api/payments/donation`.
   - Devlog `docs/devlogs/YYYY-MM-DD-donation-repair-guest-support.md` + CHANGELOG entry.

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|-----------|
| Payment flow broken (webhook/CSRF) | Critical | Smallest targeted change; verify with real $1 staging test; webhook route returns explicit error codes to test. |
| Schema change (nullable userId) | High | Migration-first enforced by CI; lossless `DROP NOT NULL`; commit before deploy. |
| Guest abuse / fraud | High | Express-validator email validation; Stripe Radar unchanged; same amount limits; no saved payment methods for guests. |
| Security (auth weakening) | High | Only the donation endpoint becomes optional-auth; `optionalAuth` is an established pattern; webhook stays signature-only. |
| Recurring invoicing change | Medium | Covered by Phase 1 flat fix; verify staging subscription creation. |
| Breaking admin/payment queries | Medium | `userId` nullable — grep queries that assume non-null (`payments.ts` history is userId-scoped; admin list fine). |

---

## Testing Plan

- **Unit/build**: `cd backend && npm run build` + `npm run typecheck` (if configured); frontend lint if present.
- **Integration (staging, test-mode Stripe)**:
  - Post to `/api/payments/webhook` without signature → expect `400 Missing stripe signature` (proves CSRF bypass + raw body arrival).
  - Full $1 donation logged-in → Stripe test card → confirm `payment.status = COMPLETED`, receipt, campaign increment.
  - Recurring monthly + yearly → no 400; subscription created.
  - Guest donation logged-out → email required; completes; Stripe receipt to guest email.
- **Manual**: prod symptom regressions — one-time, monthly, yearly, guest.
- Verify webhook event log via `PaymentWebhook` rows.

## Rollback

- Phase 1: revert the 4 small changes (plain `git revert`/commit; no migration).
- Phase 2: migrate back (nullable→required) is NOT safe if guest rows exist → instead keep schema and disable guest flow (revert code), leaving guest EU data intact; reconcile script is read/update only and reversible via backup snapshot first.

## Deployment sequence

User decision: **staging first** (both webhook environments can work — see Approach). Order:

1. Implement Phases 1–2 on branch `development`; commit (migration included).
2. Staging auto-deploys. Apply test-mode env config + Stripe test webhook endpoint (Phase 0).
3. Verify on staging: webhook probe + full logged-in/guest/recurring test-card flows.
4. Explicit user command → deploy to production (merge to `main`), apply/extend live webhook endpoint + env vars.
5. Reconciliation script only on explicit user command.

## Approval gate

Needs your explicit approval to: touch payment/auth code, run the Prisma migration, change the API contract (optional-auth), deploy to staging, and later deploy to production. I will not execute until you approve; I will not run the reconciliation script or production deploy without a separate explicit command.