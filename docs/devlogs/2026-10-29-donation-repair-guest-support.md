# 2026-10-29 — Donation System Repair + Guest Donation Support

## Summary

Reinstated a working end-to-end Stripe donation pipeline and added guest (no-login) donations.

## Root causes fixed

1. **Stripe webhook blocked by CSRF** — `POST /api/payments/webhook` returned 403 `CSRF_TOKEN_MISSING` (global CSRF only exempted the `/webhooks/` prefix). Every completed payment stayed `PENDING` — no receipts, no campaign increments, no registration advancement; also broke verification-credit webhooks. Broken since 2025-10-16 (`877574b`).
   - Fix: added `/api/payments/webhook` to the CSRF exemption (`csrf.ts`, plus defense-in-depth in `server.ts`).
2. **Raw body consumed before signature verification** — the global `express.json()` parsed the webhook stream before the route's `express.raw()`, leaving an empty buffer for `constructEvent`. Fix: the global body parser now skips `/api/payments/webhook`.
3. **Recurring donations always 400** — frontend sent `donationType: "MONTHLY"/"YEARLY"` but the enum only allows `RECURRING` + `recurringInterval`. Fix: frontend maps Monthly/Yearly → `RECURRING` + interval.
4. **`automatic_tax` on Payment Links** — 500s unless Stripe Tax is configured; removed (donations aren't sales-taxed), removing the Stripe Tax prerequisite.
5. **QUARTERLY mapped to monthly** — now uses `interval_count: 3`.

## Guest donations

- `POST /api/payments/donation` switched from `requireAuth` to `optionalAuth`; guests must provide `email` (validated) + optional `name`.
- CSRF-exempt for the donation endpoint (same pattern as petition signing — no funds move until the donor completes Stripe checkout; logged-in users still authenticated via `optionalAuth`).
- `StripeService.createDonation` accepts `userId` OR `guestEmail/guestName`; guests get an on-the-fly Stripe customer (`createGuestCustomer`), no `StripeCustomer` DB row. Payment Links use `customer_creation: 'always'` so Stripe emails receipts (and subscription-management links for recurring).
- Schema: `Payment.userId` nullable + `guestEmail`/`guestName` (migration `20261029170000_add_guest_donation_support`).
- Frontend: removed the "please log in" gate; guests see email/name fields in the donation modal.

## Infrastructure (staging)

- Discovered staging Stripe keys were invalid placeholders (`sk_test_…f123`, `pk_test_…456789`) — replaced with real test-mode keys for account `acct_1Rv6pdI45l290VNE`.
- Created test webhook endpoint `we_1UVwqVI45l290VNE3qrcEVJh` → `https://dev-api.unitedwerise.org/api/payments/webhook` (8 events); set `STRIPE_WEBHOOK_SECRET` on staging.
- Deleted orphan test endpoint `we_1RxWB9…` that pointed at the prod ACA URL.
- Fixed staging `FRONTEND_URL`/`SUCCESS_URL`/`CANCEL_URL` (were a dead `*.azurestaticapps.net` host).
- Prod live webhook (`we_1Ryitt…`) unchanged; optional later: canonicalize URL to `api.unitedwerise.org`.

## Verification

- Backend `npm run build` clean; frontend files `node --check` clean.
- Webhook route no longer CSRF-blocks (returns signature-level errors, proving raw body + bypass). Full payment completion verified pending staging deploy + a test-mode donation.

## Files

- `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261029170000_add_guest_donation_support/migration.sql`
- `backend/src/middleware/csrf.ts`, `backend/src/server.ts`
- `backend/src/services/stripeService.ts`, `backend/src/routes/payments.ts`
- `frontend/src/js/donation-system.js`, `frontend/src/config/stripe.js`
- `frontend/src/modules/admin/controllers/PaymentsController.js`
- `STRIPE-PAYMENT-SYSTEM-DOCUMENTATION.md`, `MASTER_DOCUMENTATION.md`