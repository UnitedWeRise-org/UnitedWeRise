/**
 * Layer 5: Photo Upload with Database Persistence
 *
 * Purpose: Store photo metadata in database for retrieval and management
 * Features: Authentication + File Validation + EXIF Stripping + AI Moderation + Database
 * Layers:
 *   - Layer 0: Basic file transport ✅
 *   - Layer 1: Authentication ✅
 *   - Layer 2: File validation ✅
 *   - Layer 3: EXIF stripping and WebP conversion ✅
 *   - Layer 4: AI content moderation ✅
 *   - Layer 5: Database persistence ✅
 * Logging: Every step logs with requestId for tracing
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=index.d.ts.map