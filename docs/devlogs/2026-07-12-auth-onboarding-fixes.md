# Account Creation, Onboarding & Login-Persistence Fixes
**Date:** 2026-07-12

## User Intent
Users kept failing to create accounts, and onboarding was broken. Reported symptoms: "the site isn't letting me click the sign up button after I did the hCaptcha" and "message: onboarding data not loaded." The ask was to audit the entire account creation + onboarding flow, ensure it integrates with the login persistence/token system, and fix what's broken.

## What Changed
- **Registration captcha (account-creation blocker):** `handleRegister()` now retrieves the hCaptcha token via `getHCaptchaToken()` — which honors the token captured by the widget's `data-callback` (`window.hCaptchaToken`) before falling back to `hcaptcha.getResponse()`. The old code used `getResponse()` alone, which returns an empty string on token expiry or unresolved widget id, hitting a hard "Please complete the captcha verification" dead-end even for users who had completed the challenge. The hard block was removed: when no token is retrievable, the flow falls through to the existing server-validated bot-protection proof (honeypot + timing + device fingerprint). The widget is reset on failed attempts so retries get a fresh single-use token.
- **Onboarding ("data not loaded"):** `OnboardingFlow.loadSteps()` now retries transient failures (network errors, 5xx, and the brief post-registration window before the auth cookie propagates) with exponential backoff and returns a success boolean. `show()` now fails gracefully — it fires `onboarding_closed`, shows a retry message, and releases the (otherwise undismissable) modal via new `_releaseModal()` instead of trapping the user. Added `_sleep()` helper.
- **Login persistence:** `unifiedAuthManager.verifySession()` was returning the `/auth/me` response envelope (`{success, data:{…user}}`) as the user object, so consumers checking `user.id` (e.g. `session.js`) treated valid sessions as invalid. Now reads the nested user (`response.data.data`) defensively.

## Technical Decisions
- **Soft captcha fallback (security tradeoff, user-approved):** the frontend no longer hard-requires a valid hCaptcha token to submit. hCaptcha token retrieval proved unreliable in the field (ad blockers, CSP/postMessage, ~2-min token expiry) and was blocking legitimate users. Server-side bot protection (honeypot + timing + device-fingerprint risk scoring in `backend/src/routes/auth.ts`) remains fully enforced — this simply extends the pre-existing ad-blocker fallback path to also cover "completed-but-token-not-retrievable."
- **Graceful onboarding failure over hard gate:** rather than trap users in an undismissable modal on load failure, the modal is released and re-triggers on the next page load. The backend still gates unverified users from protected routes via `requireAuth`, so this weakens nothing server-side.
- **Envelope fix made defensive:** `verifySession` reads `body?.data ?? body` so it works whether `/auth/me` returns the enveloped or a raw-user shape. Note the two frontend API-call conventions: `window.apiCall` (api-manager.js) returns `{ok,status,data:<rawBody>}`, while `window.apiClient.call` (modules/core/api/client.js) returns the raw body directly. The primary boot path (`app-initialization.js` → `/batch/initialize`) was already correct; only secondary `verifySession` consumers were affected.

## Files Modified
- `frontend/src/modules/core/auth/modal.js`
- `frontend/src/components/OnboardingFlow.js`
- `frontend/src/modules/core/auth/unified-manager.js`

## Verification
- Deployed to staging (Azure Static Web Apps CI/CD - Staging) and production (Azure Static Web Apps CI/CD) — both workflows succeeded.
- Confirmed all three changes are served live from `dev.unitedwerise.org` and `www.unitedwerise.org`; production backend health `healthy` (backend untouched).
- `node --check` on all three files; removed-import (`isCaptchaBlocked`) verified unused elsewhere; only `verifySession` consumer (`session.js`) reads a flat `user.id`, now satisfied.
- Caveat: true end-to-end confirmation requires a real user registering through a live hCaptcha challenge → onboarding; not reproducible headlessly.

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*
