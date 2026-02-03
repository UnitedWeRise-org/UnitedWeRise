/**
 * Coconut.co Webhook Handler
 *
 * Handles encoding job completion events from Coconut.co.
 * Supports two-phase encoding:
 * - Phase 1 (720p): Sets video to READY, triggers moderation, kicks off Phase 2
 * - Phase 2 (720p+360p): Updates manifest with both tiers
 *
 * Security: Webhook URL includes a secret token in the path for validation,
 * since Coconut does not sign webhook payloads.
 *
 * Endpoint: POST /webhooks/coconut/:secret
 *
 * @module routes/webhooks/coconut
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=coconut.d.ts.map