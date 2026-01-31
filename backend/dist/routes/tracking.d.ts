/**
 * Lightweight Page View Tracking Route
 *
 * Receives page view beacons from the frontend page-tracker module.
 * This endpoint is intentionally lightweight and unauthenticated since
 * it receives beacons from all visitors (anonymous and logged-in).
 *
 * Privacy: Raw IPs are never stored. The visitorAnalytics service
 * hashes IPs with a daily-rotating salt before persistence.
 *
 * @swagger
 * tags:
 *   - name: Tracking
 *     description: Page view tracking endpoints
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=tracking.d.ts.map