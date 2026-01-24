/**
 * Azure Media Services Webhook Handler
 *
 * Handles job completion events from Azure Media Services encoding pipeline.
 * Updates video records with encoding status and streaming URLs.
 *
 * Event Grid subscription should point to:
 * POST /webhooks/media-services
 *
 * @module routes/webhooks/mediaServices
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=mediaServices.d.ts.map